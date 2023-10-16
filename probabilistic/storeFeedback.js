"use strict";

const express = require("express");
// const catalyst = require('zcatalyst-sdk-node');
//const catalyst = require("zoho-catalyst-sdk");
const storeAudioFileinGCS = require("./common/storeAudioFileinGCS.js");
const convertSpeechToText = require("./common/convertSpeechToText.js");
const sendResponseToGlific = require("./common/sendResponseToGlific.js");
const SessionFeedback = require("./models/SessionFeedback.js")

// const app = express();
// app.use(express.json());
const app = express.Router();

app.post("/feedback/store", async (req, res) => {
  //let catalystApp = catalyst.initialize(req, { type: catalyst.type.applogic });

  const requestBody = req.body;
  const executionID = Math.random().toString(36).slice(2)
        
  //Prepare text to prepend with logs
  const params = ["Store Feedback",req.url,executionID,""]
  const prependToLog = params.join(" | ")
  
  console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")
    
  const responseJSON = {
    OperationStatus: "SUCCESS",
  };

  //Validate Request
  const requiredFields = [
    "Mobile",
    "SessionID",
    "Rating",
    "FeedbackType",
    "GPTRating",
    "GPTFeedbackType",
  ];
  const validationResult = requiredFields.map(
    (field) => typeof requestBody[field] === "undefined"
  );
  if (validationResult.some((result) => result)) {
    (responseJSON["OperationStatus"] = "REQ_ERR"),
      (responseJSON["StatusDescription"] =
        "Mandatory paramaters missing :" + requiredFields.join(" or "));
    console.info((new Date()).toString()+"|"+prependToLog,"End of Execution:", responseJSON);
    res.status("200").json(responseJSON);
  } else {
    var feedbackRecord = {
      Mobile: requestBody["Mobile"].toString().slice(-10),
      SessionID: requestBody["SessionID"],
      Rating: parseInt(requestBody["Rating"]),
      FeedbackType: requestBody["FeedbackType"].includes("@result")
        ? null
        : requestBody["FeedbackType"],
      Feedback:
        requestBody["FeedbackType"] == "Text" ? requestBody["Feedback"] : null,
      FeedbackURL:
        requestBody["FeedbackType"] == "Audio" ? requestBody["Feedback"] : null,
      GPTRating: parseInt(requestBody["GPTRating"]),
      GPTFeedbackType: requestBody["GPTFeedbackType"].includes("@result")
        ? null
        : requestBody["GPTFeedbackType"],
      GPTFeedback:
        requestBody["GPTFeedbackType"] == "Text"
          ? requestBody["GPTFeedback"]
          : null,
      GPTFeedbackURL:
        requestBody["GPTFeedbackType"] == "Audio"
          ? requestBody["GPTFeedback"]
          : null,
    };

    if (feedbackRecord["FeedbackType"] == "Audio") {
      try {
        //Store Audio file in GCS
        const gcsResponse = JSON.parse(
          await storeAudioFileinGCS({
            contentType: "URL",
            fileData: feedbackRecord["FeedbackURL"],
            fileName:
              feedbackRecord["Mobile"] +
              "-" +
              feedbackRecord["SessionID"].toString().replace(/ /g, "_"),
          })
        );
        if (gcsResponse["OperationStatus"] == "SUCCESS") {
          feedbackRecord["FeedbackURL"] = gcsResponse["PublicURL"];
          console.info((new Date()).toString()+"|"+prependToLog,
            "Stored the audio feedback file in GCS : ",
            feedbackRecord["FeedbackURL"]
          );
        } else console.info((new Date()).toString()+"|"+prependToLog,"Couldn't stored the audio feedback file in GCS");

        //Convert Speech to text
        const transcription = JSON.parse(
          await convertSpeechToText({
            responseAVURL: feedbackRecord["FeedbackURL"],
          })
        );
        if (transcription["OperationStatus"] == "SUCCESS") {
          feedbackRecord["Feedback"] = transcription["AudioTranscript"];
          console.info((new Date()).toString()+"|"+prependToLog,
            "Converted the audio feedback to text : ",
            feedbackRecord["Feedback"]
          );
        } else console.info((new Date()).toString()+"|"+prependToLog,"Couldn't convert the audio feedback to text");
      } catch (e) {
        console.info((new Date()).toString()+"|"+prependToLog,"Error in converting the audio feedback to text:", e);
      }
    }

    if (feedbackRecord["GPTFeedbackType"] == "Audio") {
      try {
        //Store Audio file in GCS
        const gcsResponse = JSON.parse(
          await storeAudioFileinGCS({
            contentType: "URL",
            fileData: feedbackRecord["GPTFeedbackURL"],
            fileName:
              feedbackRecord["Mobile"] +
              "-" +
              feedbackRecord["SessionID"].toString().replace(/ /g, "_"),
            fileType: "Audio",
          })
        );
        if (gcsResponse["OperationStatus"] == "SUCCESS") {
          feedbackRecord["GPTFeedbackURL"] = gcsResponse["PublicURL"];
          console.info((new Date()).toString()+"|"+prependToLog,
            "Stored the audio gpt feedback file in GCS : ",
            feedbackRecord["GPTFeedbackURL"]
          );
        } else
          console.info((new Date()).toString()+"|"+prependToLog,"Couldn't stored the audio gpt feedback file in GCS");

        //Convert Speech to text
        const transcription = JSON.parse(
          await convertSpeechToText({
            responseAVURL: feedbackRecord["GPTFeedbackURL"],
          })
        );
        if (transcription["OperationStatus"] == "SUCCESS") {
          feedbackRecord["GPTFeedback"] = transcription["AudioTranscript"];
          console.info((new Date()).toString()+"|"+prependToLog,
            "Converted the audio gpt feedback to text : ",
            feedbackRecord["GPTFeedback"]
          );
        } else console.info((new Date()).toString()+"|"+prependToLog,"Couldn't convert the audio gpt feedback to text");
      } catch (e) {
        console.info((new Date()).toString()+"|"+prependToLog,"Error in converting the audio gpt feedback to text:", e);
      }
    }

    //Get table meta object without details.
    // //let table = catalystApp.datastore().table("SessionFeedback");

    //Use Table Meta Object to insert the row which returns a promise
    // let insertPromise = table.insertRow(feedbackRecord);
    // insertPromise
    SessionFeedback.create(feedbackRecord)
      .then((row) => {
        console.info((new Date()).toString()+"|"+prependToLog,"End of Execution. Inserted Row : " + JSON.stringify(row));
        res.status(200).json(responseJSON);
        sendResponseToGlific({
          flowID: requestBody["flowId"],
          contactID: requestBody["contact"]["id"],
          resultJSON: JSON.stringify({
            feedbackresult: responseJSON,
          }),
        });
      })
      .catch((err) => {
        console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error.")
        console.error((new Date()).toString()+"|"+prependToLog,"End of Execution with Error: ",err);
        res.status(500).send(err);
      });
  }
});

module.exports = app;

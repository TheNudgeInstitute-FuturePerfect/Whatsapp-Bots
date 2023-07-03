"use strict";

const express = require("express");
// const catalyst = require('zcatalyst-sdk-node');
const catalyst = require("zoho-catalyst-sdk");

// const app = express();
// app.use(express.json());
const app = express.Router();

app.post("/translate", async (req, res) => {
  const startTimeStamp = new Date();

  let catalystApp = catalyst.initialize(req, { type: catalyst.type.applogic });
  const requestBody = req.body;

  let responseObject = {
    OperationStatus: "SUCCESS",
  };

  let sessionID = requestBody["SessionID"];
  if (typeof sessionID === "undefined") {
    responseObject["OperationStatus"] = "REQ_ERR";
    responseObject["StatusDescription"] =
      "Missing required parameter - SessionID";
    console.log("End of Execution: ", responseObject);
    res.status(200).json(responseObject);
  } else {
    var text = requestBody["Text"];
    if (typeof text === "undefined") {
      responseObject["OperationStatus"] = "REQ_ERR";
      responseObject["StatusDescription"] = "Missing required parameter - Text";
      console.log("End of Execution: ", responseObject);
      res.status(200).json(responseObject);
    } else {
      let source = requestBody["SourceLanguage"];
      if (typeof source === "undefined") {
        responseObject["OperationStatus"] = "REQ_ERR";
        responseObject["StatusDescription"] =
          "Missing required parameter - SourceLanguage";
        console.log("End of Execution: ", responseObject);
        res.status(200).json(responseObject);
      } else {
        const allConfig = require("./translateMsg-config.json");
        const originalSource = requestBody["SourceLanguage"];
        source = allConfig["languageCode"][source.toLowerCase()];
        let target = requestBody["TargetLanguage"];
        if (typeof target === "undefined") {
          responseObject["OperationStatus"] = "REQ_ERR";
          responseObject["StatusDescription"] =
            "Missing required parameter - TargetLanguage";
          console.log("End of Execution: ", responseObject);
          res.status(200).json(responseObject);
        } else {
          target = allConfig["languageCode"][target.toLowerCase()];
          const originalTarget = requestBody["TargetLanguage"];
          let messageType = requestBody["MessageType"];
          if (typeof messageType === "undefined") {
            responseObject["OperationStatus"] = "REQ_ERR";
            responseObject["StatusDescription"] =
              "Missing required parameter - MessageType";
            console.log("End of Execution: ", responseObject);
            res.status(200).json(responseObject);
          } else {
            if (!Array.isArray(text)) text = [text];

            const projectId = allConfig["projectID"];
            const location = allConfig["location"];

            var translationSystemPrompt = null;
            try {
              const systemPrompt = await catalystApp
                .zcql()
                .executeZCQLQuery(
                  "Select SystemPromptsROWID from Sessions where SessionID = '" +
                    sessionID +
                    "'"
                );
              translationSystemPrompt =
                systemPrompt[0]["Sessions"]["SystemPromptsROWID"];
            } catch (e) {
              const systemPrompt = await catalystApp
                .zcql()
                .executeZCQLQuery(
                  "Select ROWID from SystemPrompts where IsActive = true and Name = 'Translation'"
                );
              translationSystemPrompt =
                systemPrompt[0]["SystemPrompts"]["ROWID"];
            }

            const insertData = {
              Message: text.join(". "),
              SessionID: sessionID + " - Translation",
              MessageType: "SystemMessage",
              SystemPromptsROWID: translationSystemPrompt,
              Mobile: requestBody["Mobile"].toString().slice(-10),
              IsActive: false,
            };

            let table = catalystApp.datastore().table("Sessions");
            table
              .insertRow(insertData)
              .then(async (insertResponse) => {
                try {
                  // Imports the Google Cloud Translation library
                  const {
                    TranslationServiceClient,
                  } = require("@google-cloud/translate");

                  // Instantiates a client
                  const translationClient = new TranslationServiceClient(
                    allConfig["options"]
                  );

                  //Detect Language
                  let request = {
                    parent: `projects/${projectId}/locations/${location}`,
                    content: text,
                  };

                  // Run request
                  let [response] = await translationClient.detectLanguage(
                    request
                  );

                  var detectedLanguage = null;
                  var maxConfidence = 0;
                  console.log("Detected Languages:");
                  for (const language of response.languages) {
                    console.log(`Language Code: ${language.languageCode}`);
                    console.log(`Confidence: ${language.confidence}`);
                    if (language.confidence > maxConfidence) {
                      maxConfidence = language.confidence;
                      detectedLanguage = language.languageCode;
                    }
                  }

                  //Translate
                  request = {
                    parent: `projects/${projectId}/locations/${location}`,
                    contents: text,
                    mimeType: allConfig["mimeTypes"][messageType.toLowerCase()],
                    sourceLanguageCode:
                      detectedLanguage == null ? source : detectedLanguage,
                    targetLanguageCode: target,
                  };

                  // Run request
                  let [translations] = await translationClient.translateText(
                    request
                  );

                  console.log("ReTranslation: ", translations);

                  if (translations.translations[0].translatedText == text) {
                    request = {
                      parent: `projects/${projectId}/locations/${location}`,
                      contents: text,
                      mimeType:
                        allConfig["mimeTypes"][messageType.toLowerCase()],
                      sourceLanguageCode: target, //detectedLanguage == null ? source : detectedLanguage,
                      targetLanguageCode: detectedLanguage,
                    };
                    [translations] = await translationClient.translateText(
                      request
                    );
                    console.log("Transliteration: ", translations);
                    const newText =
                      translations.translations.length == 1
                        ? translations.translations[0].translatedText
                        : translations.translations.map(
                            (data) => data.translatedText
                          );
                    request = {
                      parent: `projects/${projectId}/locations/${location}`,
                      contents: [newText],
                      mimeType:
                        allConfig["mimeTypes"][messageType.toLowerCase()],
                      sourceLanguageCode:
                        detectedLanguage == null ? source : detectedLanguage,
                      targetLanguageCode: target,
                    };
                    [translations] = await translationClient.translateText(
                      request
                    );
                    console.log("ReTranslation: ", translations);
                  }

                  responseObject["Translation"] =
                    translations.translations.length == 1
                      ? translations.translations[0].translatedText
                      : translations.translations.map(
                          (data) => data.translatedText
                        );
                  responseObject["DetectedLanguage"] =
                    typeof allConfig["codesLanguage"][detectedLanguage] ===
                    "undefined"
                      ? detectedLanguage
                      : allConfig["codesLanguage"][detectedLanguage];

                  //if(originalSource != responseObject['DetectedLanguage']){
                  /*if((source != detectedLanguage) && (!detectedLanguage.startsWith(source))){
									responseObject['OperationStatus'] = "LANG_MSMTCH"
									responseObject['StatusDescription'] = "Source language provided and source langage detected do not match"
								}*/

                  res.status(200).json(responseObject);

                  const updateData = {
                    ROWID: insertResponse["ROWID"],
                    Reply: {
                      sourceLanguage: originalSource,
                      targetLanguage: originalTarget,
                      apiResponse: translations,
                    },
                    IsActive: false,
                  };

                  table
                    .updateRow(updateData)
                    .then((updateResponse) => {
                      console.log("End of Execution: ", responseObject);
                      const endTimeStamp = new Date();
                      const executionSeconds =
                        (endTimeStamp - startTimeStamp) / 1000;
                      if (
                        executionSeconds > 2 &&
                        typeof requestBody["FlowID"] !== "undefined" &&
                        typeof requestBody["contact"]["id"] !== "undefined"
                      ) {
                        let sendResponseToGlific = require("./common/sendResponseToGlific.js");
                        sendResponseToGlific({
                          flowID: requestBody["FlowID"],
                          contactID: requestBody["contact"]["id"],
                          resultJSON: JSON.stringify({
                            translation: responseObject,
                          }),
                        })
                          .then((glificResponse) => {})
                          .catch((err) =>
                            console.log("Error returned from Glific: ", err)
                          );
                      }
                    })
                    .catch((err) => console.log("End of Execution: ", err));
                } catch (e) {
                  console.log("End of Execution: ", e);
                  res.status(500).send(e);
                }
              })
              .catch((e) => {
                console.log("End of Execution: ", e);
                res.status(500).send(e);
              });
          }
        }
      }
    }
  }
});

app.post("/checkwordlang", async (req, res) => {
  const startTimeStamp = new Date();

  let catalystApp = catalyst.initialize(req, { type: catalyst.type.applogic });
  const requestBody = req.body;

  let responseObject = {
    OperationStatus: "SUCCESS",
  };

  let sessionID = requestBody["SessionID"];
  if (typeof sessionID === "undefined") {
    responseObject["OperationStatus"] = "REQ_ERR";
    responseObject["StatusDescription"] =
      "Missing required parameter - SessionID";
    console.log("End of Execution: ", responseObject);
    res.status(200).json(responseObject);
  } else {
    var text = requestBody["Text"];
    if (typeof text === "undefined") {
      responseObject["OperationStatus"] = "REQ_ERR";
      responseObject["StatusDescription"] = "Missing required parameter - Text";
      console.log("End of Execution: ", responseObject);
      res.status(200).json(responseObject);
    } else {
      let source = requestBody["SourceLanguage"];
      if (typeof source === "undefined") {
        responseObject["OperationStatus"] = "REQ_ERR";
        responseObject["StatusDescription"] =
          "Missing required parameter - SourceLanguage";
        console.log("End of Execution: ", responseObject);
        res.status(200).json(responseObject);
      } else {
        const allConfig = require("./translateMsg-config.json");
        const originalSource = requestBody["SourceLanguage"];
        source = allConfig["languageCode"][source.toLowerCase()];
        let target = requestBody["TargetLanguage"];
        if (typeof target === "undefined") {
          responseObject["OperationStatus"] = "REQ_ERR";
          responseObject["StatusDescription"] =
            "Missing required parameter - TargetLanguage";
          console.log("End of Execution: ", responseObject);
          res.status(200).json(responseObject);
        } else {
          target = allConfig["languageCode"][target.toLowerCase()];
          const originalTarget = requestBody["TargetLanguage"];
          let messageType = requestBody["MessageType"];
          if (typeof messageType === "undefined") {
            responseObject["OperationStatus"] = "REQ_ERR";
            responseObject["StatusDescription"] =
              "Missing required parameter - MessageType";
            console.log("End of Execution: ", responseObject);
            res.status(200).json(responseObject);
          } else {
            text = text.split(" ");
            //res.status(200).json(text)

            const projectId = allConfig["projectID"];
            const location = allConfig["location"];

            // Imports the Google Cloud Translation library
            const {
              TranslationServiceClient,
            } = require("@google-cloud/translate");

            // Instantiates a client
            const translationClient = new TranslationServiceClient(
              allConfig["options"]
            );

            //Detect Language
            let request = null;

            let allResponse = [];
            let response = null;

            for (const word of text) {
              request = {
                parent: `projects/${projectId}/locations/${location}`,
                content: [word],
              };
              // Run request
              [response] = await translationClient.detectLanguage(request);
              allResponse.push(response);
            }

            res.status(200).json(allResponse);
          }
        }
      }
    }
  }
});

app.post("/translateattempts", async (req, res) => {
  const startTimeStamp = new Date();

  let catalystApp = catalyst.initialize(req, { type: catalyst.type.applogic });
  const requestBody = req.body;

  let responseObject = {
    OperationStatus: "SUCCESS",
  };

  let sessionID = requestBody["SessionID"];
  if (typeof sessionID === "undefined") {
    responseObject["OperationStatus"] = "REQ_ERR";
    responseObject["StatusDescription"] =
      "Missing required parameter - SessionID";
    console.log("End of Execution: ", responseObject);
    res.status(200).json(responseObject);
  } else {
    let zcql = catalystApp.zcql();
    zcql
      .executeZCQLQuery(
        "Select count(ROWID) from Sessions where Reply is not null and SessionID = '" +
          sessionID +
          " - Translation'"
      )
      .then((translated) => {
        if (
          typeof translated !== "undefined" &&
          translated != null &&
          parseInt(translated[0]["Sessions"]["ROWID"]) >=
            parseInt(process.env.MaxTranslations)
        ) {
          responseObject["OperationStatus"] = "MAX_ATTMPT_RCHD";
          responseObject["StatusDescription"] =
            "Maximum Number of Translations Reached";
          console.log("End of Execution: ", responseObject);
          res.status(200).json(responseObject);
        } else {
          responseObject["PendingTranslations"] =
            process.env.MaxTranslations - translated[0]["Sessions"]["ROWID"];
          console.log("End of Execution: ", responseObject);
          res.status(200).json(responseObject);
        }
        const endTimeStamp = new Date();
        const executionSeconds = (endTimeStamp - startTimeStamp) / 1000;
        if (
          executionSeconds > 2 &&
          typeof requestBody["FlowID"] !== "undefined" &&
          typeof requestBody["contact"]["id"] !== "undefined"
        ) {
          let sendResponseToGlific = require("./common/sendResponseToGlific.js");
          sendResponseToGlific({
            flowID: requestBody["FlowID"],
            contactID: requestBody["contact"]["id"],
            resultJSON: JSON.stringify({
              attempts: responseObject,
            }),
          })
            .then((glificResponse) => {})
            .catch((err) => console.log("Error returned from Glific: ", err));
        }
      })
      .catch((err) => {
        console.log("End of Execution: ", err);
        res.status(500).send(err);
      });
  }
});

app.all("/", (req, res) => {
  res.status(403).send("No such resource.");
});

module.exports = app;

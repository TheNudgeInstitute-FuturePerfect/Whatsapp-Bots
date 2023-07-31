"use strict";

const express = require("express");
// const catalyst = require('zcatalyst-sdk-node');
const catalyst = require("zoho-catalyst-sdk");
const sendResponseToGlific = require("./common/sendResponseToGlific.js");

// const app = express();
// app.use(express.json());
const app = express.Router();

const unique = (value, index, self) => {
  return self.indexOf(value) === index;
};

app.post("/topiclist", (req, res) => {
  const requestBody = req.body;
  const nextStartIndex = requestBody["NextStartIndex"] - 1;
  var responseJSON = {
    OperationStatus: "SUCCESS",
  };

  //Get table meta object without details.
  let getAssessmentContribution = require("./common/getAssessmentContribution.js");

  getAssessmentContribution({ isactive: true, type: "Topic Prompt" })
    .then((promptsResult) => {
      const allPrompts = JSON.parse(promptsResult);
      if (allPrompts["OperationStatus"] == "SUCCESS") {
        var promptNames = allPrompts["Prompts"].map((data) => data.Name);
        promptNames = promptNames.filter(unique);
        for (var i = nextStartIndex; i < promptNames.length; i++) {
          responseJSON["Topic" + (i - nextStartIndex + 1)] = promptNames[i];
        }
        if (promptNames.length > nextStartIndex) {
          responseJSON["TotalTopics"] = promptNames.length - nextStartIndex;
          responseJSON["MaxTopics"] = promptNames.length;
        } else {
          responseJSON["OperationStatus"] = "NO_MR_TPCS";
          responseJSON["StatusDescription"] = "No more topics";
        }
        console.log("End of execution - ", responseJSON);
        res.status(200).json(responseJSON);
        sendResponseToGlific({
          flowID: requestBody["FlowID"],
          contactID: requestBody["contact"]["id"],
          resultJSON: JSON.stringify({
            topics: responseJSON,
          }),
        })
          .then(() => {})
          .catch((err) => console.log("Glific Response - ", err));
      } else {
        responseJSON["OperationStatus"] = "APP_ERR";
        responseJSON["StatusDescription"] = "Application Error";
        console.log("End of execution with application error - ", allPrompts);
        res.status(200).json(responseJSON);
      }
    })
    .catch((err) => {
      console.log("End of execution with technical error - ", err);
      res.status(500).send(err);
    });
});

app.post("/allocatetopic", (req, res) => {
  /*
	Request: {
		Topic:
		Mobile:
	}
	Response: {
		TopicID:
		SupportingText:
		SupportingTextFlag: True/False
		SupportingImageURL:
		SupportingImageFlag: True/False
		SupportingAVURL:
		SupportingAVURLFlag: True/False
	}
	*/

  let catalystApp = catalyst.initialize(req, { type: catalyst.type.applogic });

  const requestBody = req.body;
  var responseObject = {
    OperationStatus: "SUCCESS",
  };
  const topic = requestBody["Topic"];
  var mobile = requestBody["Mobile"];
  var persona = requestBody["Persona"];
  if (typeof persona === "undefined") persona = null;
  else if (persona.startsWith("@result")) persona = null;
  //Validate request
  mobile = mobile.toString().slice(-10);

  //Get the SystemPrompt details for the topics
  let query =
    "select distinct SystemPrompts.ROWID, SystemPrompts.Sequence, SystemPrompts.SupportingText, SystemPrompts.SupportingImageURL, SystemPrompts.SupportingAVURL, SystemPrompts.ObjectiveMessage, SystemPrompts.IsPaid, SystemPrompts.ShowLearningContent from SystemPrompts where SystemPrompts.Name = '" +
    topic +
    "' and SystemPrompts.IsActive = true";
  if (persona != null)
    query = query + " and Persona = '" + persona.replace(/'/g, "''") + "'";
  let zcql = catalystApp.zcql();
  zcql
    .executeZCQLQuery(query)
    .then((systemPrompts) => {
      if (!(systemPrompts != null && systemPrompts.length > 0)) {
        responseObject["OperationStatus"] = "NO_DATA";
        responseObject["StatusDescription"] =
          "No system prompts active for " + topic;
        console.log("End of execution:", responseObject);
        res.status(200).json(responseObject);
      } else {

        const checkLockStatusForUser = (isPaid, mobile, systemPromptROWID) => {
          return new Promise((resolve, reject)=>{
            if(isPaid!=true){
              console.info("Topic selected is free")
              resolve("Unlocked")
            }
            else{
              console.info("Topic selected is paid. Checking status for the user")
              let query = "Select ROWID from UserPaidTopicMapper "
                          +"left join Users on Users.ROWID = UserPaidTopicMapper.UserROWID "
                          +"where IsActive = true and Users.Mobile="+mobile+" and UserPaidTopicMapper.SystemPromptROWID="+systemPromptROWID
              console.debug("Checking status of Topic for the user:",query)
              zcql.executeZCQLQuery(query)
              .then((unlockedCourses)=>{
                if(!Array.isArray(unlockedCourses)&&(unlockedCourses.length>0)){
                  console.log("Error in query for getting unlock status")
                  reject(unlockedCourses)
                }
                else{
                  if(unlockedCourses.length==0){
                    console.info("User has not unlocked the topic")
                    resolve("Locked")
                  }
                  else{
                    console.info("User has unlocked the topic")
                    resolve("Unlocked")
                  }
                }

              })
              .catch((error)=>{
                console.log("Error in query for getting unlock status")
                reject(error)
              })

            }
          })

        }

        checkLockStatusForUser(systemPrompts[0]["SystemPrompts"]["IsPaid"],mobile,systemPrompts[0]["SystemPrompts"]["ROWID"])
        .then((lockStatus)=>{
          if(lockStatus!='Unlocked'){
            responseObject["OperationStatus"] = "TPC_LOCKED";
            responseObject["StatusDescription"] = "User has not unlocked the topic"
            responseObject["TopicID"] = systemPrompts[0]["SystemPrompts"]["ROWID"];
            console.log("End of execution:", responseObject);
            res.status(200).json(responseObject);
          }
          else{
            if (persona != null) {
              //Prepare the data to be returned
              responseObject["TopicID"] =
                systemPrompts[0]["SystemPrompts"]["ROWID"];
              responseObject["SupportingText"] =
                systemPrompts[0]["SystemPrompts"]["SupportingText"];
              responseObject["SupportingTextFlag"] =
                responseObject["SupportingText"] != null;
              responseObject["SupportingImageURL"] =
                systemPrompts[0]["SystemPrompts"]["SupportingImageURL"];
              responseObject["SupportingImageURLFlag"] =
                responseObject["SupportingImageURL"] != null;
              responseObject["SupportingAVURL"] =
                systemPrompts[0]["SystemPrompts"]["SupportingAVURL"];
              responseObject["SupportingAVURLFlag"] =
                responseObject["SupportingAVURL"] != null;
              responseObject["SupportingFlag"] = 
                responseObject["SupportingTextFlag"] ||
                responseObject["SupportingImageURLFlag"] ||
                responseObject["SupportingAVURLFlag"];
              responseObject["ObjectiveMessage"] =
                systemPrompts[0]["SystemPrompts"]["ObjectiveMessage"];
              responseObject["ObjectiveMessageFlag"] =
                responseObject["ObjectiveMessage"] != null;
              responseObject["ShowLearningContent"] = systemPrompts[0]["SystemPrompts"]["ShowLearningContent"] == true

              console.log("End of execution:", responseObject);
              res.status(200).json(responseObject);
            } 
            else {
              //Prepare an object array of systemPrompt counts
              var sessionCounts = systemPrompts.map((record) => {
                return {
                  id: record["SystemPrompts"]["ROWID"],
                  sequence: record["SystemPrompts"]["Sequence"],
                  count: 0,
                };
              });

              //Sort the array in ascending order of sequence
              sessionCounts = sessionCounts.sort((i, j) => {
                if (i.sequence < j.sequence) return -1;
                else if (i.sequence > j.sequence) return 1;
                else return 0;
              });

              //Prepare a list of SystemPrompt ROWIDs
              const systemPromptROWIDs = systemPrompts.map(
                (record) => record.SystemPrompts.ROWID
              );

              //Get the list of all prompts of the that has been practised by user
              query =
                "select DISTINCT Sessions.SessionID, Sessions.SystemPromptsROWID " +
                "from Sessions " +
                "where Sessions.Mobile = " +
                mobile +
                " and SystemPromptsROWID in (" +
                systemPromptROWIDs.join(",") +
                ") " +
                "order by CREATEDTIME desc";
              zcql
                .executeZCQLQuery(query)
                .then((sessions) => {
                  var index = 0;

                  //If there is no session data for the given topic, return the active prompt with lowest sequence number
                  if (!(sessions != null && sessions.length > 0)) {
                    index = 0; //Return the data of 1st elemet of sessionCount array which is sorted in ascending order of sequence
                  } else {
                    //Calculate the session count for each SystemPrompt for the user
                    for (var i = 0; i < sessions.length; i++) {
                      for (var j = 0; j < sessionCounts.length; i++) {
                        if (
                          sessionCounts[j]["id"] ==
                          sessions[i]["Sessions"]["SystemPromptsROWID"]
                        ) {
                          sessionCounts[j]["count"] = sessionCounts[j]["count"] + 1;
                          break;
                        }
                      }
                    }

                    //Get the index of prompt to be displayed
                    for (var i = 0; i < sessionCounts.length; i++) {
                      if (i == 0) continue;
                      if (
                        sessionCounts[i]["sequence"] >
                        sessionCounts[i - 1]["sequence"]
                      ) {
                        //If number of sessions completed for current prompt is less than that of last one, return this prompt
                        if (
                          sessionCounts[i]["count"] < sessionCounts[i - 1]["count"]
                        ) {
                          index = i;
                          break;
                        }
                        //If number of sessions completed for current prompt is more than that of last one, return last prompt
                        else if (
                          sessionCounts[i]["count"] > sessionCounts[i - 1]["count"]
                        ) {
                          index = i - 1;
                          break;
                        }
                        //Else probe next prompt data object
                      }
                    }
                  }
                  index = index % sessionCounts.length;

                  //Prepare the data to be returned
                  responseObject["TopicID"] = sessionCounts[index]["id"];
                  const systemPrompt = systemPrompts.filter(
                    (data) => data.SystemPrompts.ROWID == responseObject["TopicID"]
                  );
                  responseObject["SupportingText"] =
                    systemPrompt[0]["SystemPrompts"]["SupportingText"];
                  responseObject["SupportingTextFlag"] =
                    responseObject["SupportingText"] != null;
                  responseObject["SupportingImageURL"] =
                    systemPrompt[0]["SystemPrompts"]["SupportingImageURL"];
                  responseObject["SupportingImageURLFlag"] =
                    responseObject["SupportingImageURL"] != null;
                  responseObject["SupportingAVURL"] =
                    systemPrompt[0]["SystemPrompts"]["SupportingAVURL"];
                  responseObject["SupportingAVURLFlag"] =
                    responseObject["SupportingAVURL"] != null;
                  responseObject["SupportingFlag"] =
                    responseObject["SupportingTextFlag"] ||
                    responseObject["SupportingImageURLFlag"] ||
                    responseObject["SupportingAVURLFlag"];
                  responseObject["ShowLearningContent"] = systemPrompts[0]["SystemPrompts"]["ShowLearningContent"] == true

                  console.log("End of execution:", responseObject);
                  res.status(200).json(responseObject);
                })
                .catch((err) => {
                  responseObject["OperationStatus"] = "ZCQL_ERR";
                  responseObject["StatusDescription"] = "Application Error";
                  console.log(
                    "End of execution due to error:",
                    responseObject,
                    "\nError:",
                    err
                  );
                  res.status(200).json(responseObject);
                });
            }
          }
        })
        .catch((err) => {
          responseObject["OperationStatus"] = "APP_ERR";
          responseObject["StatusDescription"] = "Application Error";
          console.log(
            "End of execution due to error:",
            responseObject,
            "\nError:",
            err
          );
          res.status(200).json(responseObject);
        });
      }
    })
    .catch((err) => {
      responseObject["OperationStatus"] = "ZCQL_ERR";
      responseObject["StatusDescription"] = "Application Error";
      console.log(
        "End of execution due to error:",
        responseObject,
        "\nError:",
        err
      );
      res.status(200).json(responseObject);
    });
});

app.post("/topicpersonas", (req, res) => {
  const requestBody = req.body;
  const nextStartIndex = requestBody["NextStartIndex"] - 1;
  const topic = requestBody["Topic"];
  var responseJSON = {
    OperationStatus: "SUCCESS",
  };

  //Get table meta object without details.
  let getAssessmentContribution = require("./common/getAssessmentContribution.js");

  getAssessmentContribution({ isactive: true, prompt: topic })
    .then((promptsResult) => {
      var allPrompts = JSON.parse(promptsResult);
      if (allPrompts["OperationStatus"] == "SUCCESS") {
        allPrompts = allPrompts["Prompts"].filter(
          (data) => data.Persona != null
        );
        if (
          typeof allPrompts !== "undefined" &&
          allPrompts != null &&
          allPrompts.length > 0
        ) {
          for (var i = nextStartIndex; i < allPrompts.length; i++) {
            responseJSON["Persona" + (i - nextStartIndex + 1)] =
              allPrompts[i]["Persona"] + (allPrompts[i]["IsPaid"]==true? " 🔐" : "");
          }
          if (allPrompts.length > nextStartIndex) {
            responseJSON["TotalPersonas"] = allPrompts.length - nextStartIndex;
            responseJSON["MaxPersonas"] = allPrompts.length;
          } else {
            responseJSON["OperationStatus"] = "NO_MR_TPCS";
            responseJSON["StatusDescription"] = "No more topics";
          }
        } else {
          responseJSON["OperationStatus"] = "NO_TPC_PRSNA";
          responseJSON["StatusDescription"] = "No persona for the topic";
        }

        console.log("End of execution - ", responseJSON);
        res.status(200).json(responseJSON);
        sendResponseToGlific({
          flowID: requestBody["FlowID"],
          contactID: requestBody["contact"]["id"],
          resultJSON: JSON.stringify({
            personas: responseJSON,
          }),
        })
          .then(() => {})
          .catch((err) => console.log("Glific Response - ", err));
      } else {
        responseJSON["OperationStatus"] = allPrompts["OperationStatus"];
        responseJSON["StatusDescription"] = allPrompts["StatusDescription"];
        console.log("End of execution with application error - ", allPrompts);
        res.status(200).json(responseJSON);
      }
    })
    .catch((err) => {
      console.log("End of execution with technical error - ", err);
      res.status(500).send(err);
    });
});

module.exports = app;

"use strict";

const express = require("express");
// const catalyst = require('zcatalyst-sdk-node');
const catalyst = require("zoho-catalyst-sdk");
const sendResponseToGlific = require("./common/sendResponseToGlific.js");
let userTopicSubscriptionMapper = require("./models/userTopicSubscriptionMapper.js")
let getConfigurationParam = require("./common/getConfigurationParam.js");

// const app = express();
// app.use(express.json());
const app = express.Router();

const unique = (value, index, self) => {
  return self.indexOf(value) === index;
};

app.post("/topiclist", (req, res) => {
  const requestBody = req.body;

  const executionID = Math.random().toString(36).slice(2)
    
  //Prepare text to prepend with logs
  const params = ["getTopics",req.url,executionID,""]
  const prependToLog = params.join(" | ")
  
  console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")
    
  const module = (typeof requestBody["Module"] === 'undefined') ? null : requestBody["Module"]
  console.info((new Date()).toString()+"|"+prependToLog,"Module="+module)

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
        var promptNames = allPrompts["Prompts"].filter(data=>data.Module==module).map((data) => data.Name);
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
        console.info((new Date()).toString()+"|"+prependToLog,"End of execution - ", responseJSON);
        res.status(200).json(responseJSON);
        sendResponseToGlific({
          flowID: requestBody["FlowID"],
          contactID: requestBody["contact"]["id"],
          resultJSON: JSON.stringify({
            topics: responseJSON,
          }),
        })
          .then(() => {})
          .catch((err) => console.error((new Date()).toString()+"|"+prependToLog,"Glific Response - ", err));
      } else {
        responseJSON["OperationStatus"] = "APP_ERR";
        responseJSON["StatusDescription"] = "Application Error";
        console.info((new Date()).toString()+"|"+prependToLog,"End of execution with application error - ", allPrompts);
        res.status(200).json(responseJSON);
      }
    })
    .catch((err) => {
      console.info((new Date()).toString()+"|"+prependToLog,"End of execution with technical error - ", err);
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

  const executionID = Math.random().toString(36).slice(2)
    
  //Prepare text to prepend with logs
  const params = ["getTopics",req.url,executionID,""]
  const prependToLog = params.join(" | ")
  
  console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")
  
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
    query = query + " and Persona = '" + persona.replace(/'/g, "''").replace(" 🔐","") + "'";
  let zcql = catalystApp.zcql();
  zcql
    .executeZCQLQuery(query)
    .then((systemPrompts) => {
      if (!(systemPrompts != null && systemPrompts.length > 0)) {
        responseObject["OperationStatus"] = "NO_DATA";
        responseObject["StatusDescription"] =
          "No system prompts active for " + topic;
        console.info((new Date()).toString()+"|"+prependToLog,"End of execution:", responseObject);
        res.status(200).json(responseObject);
      } else {

        const checkLockStatusForUser = (isPaid, mobile, systemPromptROWID) => {
          return new Promise((resolve, reject)=>{
            if(isPaid!=true){            
              getConfigurationParam({
                id: systemPromptROWID,
                param: ["maxsessions"],
              })
              .then((topicConfigResult)=>{
                const topicConfig = JSON.parse(topicConfigResult);
                if (topicConfig.OperationStatus != "SUCCESS")
                  reject(topicConfig)
                else{
                  if(topicConfig.Values==null){
                    console.info((new Date()).toString()+"|"+prependToLog,"No maxsessions configured for the topic")
                    resolve('Unlocked')
                  }
                  else if(typeof topicConfig.Values['maxsessions'] !== 'undefined'){
                    zcql.executeZCQLQuery("select distinct SessionID from Sessions where SystemPromptsROWID='"+systemPromptROWID+"'")
                    .then((sessions)=>{
                      if(!Array.isArray(sessions)){
                        console.info((new Date()).toString()+"|"+prependToLog,"Failed to get session count for the user ")
                        reject(sessions)
                      }
                      else{
                        if(sessions.length > topicConfig.Values['maxsessions']){
                          console.info((new Date()).toString()+"|"+prependToLog,"maxsessions reached for the topic. Send Sign-Up notification")
                          resolve('MaxSessionsReached')
                        }
                        else{
                          console.info((new Date()).toString()+"|"+prependToLog,"maxsessions not reached for the topic.")
                          resolve('Unlocked')
                        }
                      }
                    })
                    .catch(error=>{
                      console.info((new Date()).toString()+"|"+prependToLog,"Error in getting total count of sessions.")
                      reject(error)
                    })
                  }
                  else if(typeof topicConfig.Values['maxsessions'] === 'undefined'){
                    console.info((new Date()).toString()+"|"+prependToLog,"No maxsessions configured for the topic")
                    resolve('Unlocked')
                  }
                }
              })
              .catch(error=>{
                console.info((new Date()).toString()+"|"+prependToLog,"Error in getting maxsessions.")
                reject(error)
              })
            }
            else{
              console.info((new Date()).toString()+"|"+prependToLog,"Topic selected is paid. Checking status for the user")
              let query = "Select ROWID from Users where IsActive = true and Users.Mobile="+mobile
              console.debug("Checking status of Topic for the user:",query)
              zcql.executeZCQLQuery(query)
              .then(async (user)=>{
                if(!Array.isArray(user)){
                  console.info((new Date()).toString()+"|"+prependToLog,"Error in query for getting user info")
                  reject(user)
                }
                else{
                  const unlockedCourses = await userTopicSubscriptionMapper.find({
                    UserROWID:user[0]['Users']['ROWID'],
                    SystemPromptROWIDs:systemPrompts[0]["SystemPrompts"]["ROWID"],
                    IsUnlocked: true
                  })
                  if(unlockedCourses.length==0){
                    console.info((new Date()).toString()+"|"+prependToLog,"User has not unlocked the topic")
                    resolve("Locked")
                  }
                  else{
                    console.info((new Date()).toString()+"|"+prependToLog,"User has unlocked the topic")
                    resolve("Unlocked")
                  }
                }

              })
              .catch((error)=>{
                console.info((new Date()).toString()+"|"+prependToLog,"Error in query for getting unlock status")
                reject(error)
              })

            }
          })

        }

        checkLockStatusForUser(systemPrompts[0]["SystemPrompts"]["IsPaid"],mobile,systemPrompts[0]["SystemPrompts"]["ROWID"])
        .then((lockStatus)=>{
          if(lockStatus=='Locked'){
            responseObject["OperationStatus"] = "TPC_LOCKED";
            responseObject["StatusDescription"] = "User has not unlocked the topic"
            responseObject["TopicID"] = systemPrompts[0]["SystemPrompts"]["ROWID"];
            console.info((new Date()).toString()+"|"+prependToLog,"End of execution:", responseObject);
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
              
              //---- 2023-08-04 | GLOW 5.3 | ravi.bhushan@dhwaniris.com | Begin----
              responseObject["LearningObjective"] =
                systemPrompts[0]["SystemPrompts"]["LearningObjective"];
              responseObject["LearningObjectiveFlag"] =
                responseObject["LearningObjective"] != null;
              
              if(lockStatus=='MaxSessionsReached'){
                responseObject["OperationStatus"] = "MAX_SSN_RCHD";
                responseObject["StatusDescription"] = "User has completed max sessions"
              }
              //---- 2023-08-04 | GLOW 5.3 | ravi.bhushan@dhwaniris.com | End----

              console.info((new Date()).toString()+"|"+prependToLog,"End of execution:", responseObject);
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
                  
                  //---- 2023-08-04 | GLOW 5.3 | ravi.bhushan@dhwaniris.com | Begin----
                  responseObject["LearningObjective"] = systemPrompts[0]["SystemPrompts"]["LearningObjective"];
                  responseObject["LearningObjectiveFlag"] = responseObject["LearningObjective"] != null;
                  //---- 2023-08-04 | GLOW 5.3 | ravi.bhushan@dhwaniris.com | End----

                  console.info((new Date()).toString()+"|"+prependToLog,"End of execution:", responseObject);
                  res.status(200).json(responseObject);
                })
                .catch((err) => {
                  responseObject["OperationStatus"] = "ZCQL_ERR";
                  responseObject["StatusDescription"] = "Application Error";
                  console.info((new Date()).toString()+"|"+prependToLog,
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
          console.info((new Date()).toString()+"|"+prependToLog,
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
      console.info((new Date()).toString()+"|"+prependToLog,
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
  
  const executionID = Math.random().toString(36).slice(2)
    
  //Prepare text to prepend with logs
  const params = ["getTopics",req.url,executionID,""]
  const prependToLog = params.join(" | ")
  
  console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")
  
  const nextStartIndex = requestBody["NextStartIndex"] - 1;
  const topic = requestBody["Topic"];
  var responseJSON = {
    OperationStatus: "SUCCESS",
  };

  //Get table meta object without details.
  let getAssessmentContribution = require("./common/getAssessmentContribution.js");
  
  getAssessmentContribution({ isactive: true, prompt: topic })
    .then(async (promptsResult) => {
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
          let catalystApp = catalyst.initialize(req, { type: catalyst.type.applogic });
          let zcql = catalystApp.zcql()
          for (var i = nextStartIndex; i < allPrompts.length; i++) {
            if(allPrompts[i]["IsPaid"]!=true)
              responseJSON["Persona" + (i - nextStartIndex + 1)] = allPrompts[i]["Persona"]
            else{
              try{
                const user = await zcql.executeZCQLQuery("Select ROWID from Users where Mobile = '"+requestBody["Mobile"].slice(-10)+"'")
                if(!Array.isArray(user))
                  throw new Error(user)
                console.info((new Date()).toString()+"|"+prependToLog,"Fetched User's ID")
                const userSubscriptions = await userTopicSubscriptionMapper.find({
                  UserROWID:user[0]['Users']['ROWID'],
                  SystemPromptROWIDs:allPrompts[i]["ROWID"],
                  IsUnlocked: true
                })
                console.info((new Date()).toString()+"|"+prependToLog,"Fetched Topic Subscription Status of User")
                responseJSON["Persona" + (i - nextStartIndex + 1)] = allPrompts[i]["Persona"]+ (userSubscriptions.length==0? " 🔐" : "");
              }
              catch(error){
                console.info((new Date()).toString()+"|"+prependToLog,"Encountered error in searching Users Table:",error)
                responseJSON["Persona" + (i - nextStartIndex + 1)] = allPrompts[i]["Persona"]+ " 🔐";
              }
            }
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

        console.info((new Date()).toString()+"|"+prependToLog,"End of execution - ", responseJSON);
        res.status(200).json(responseJSON);
        sendResponseToGlific({
          flowID: requestBody["FlowID"],
          contactID: requestBody["contact"]["id"],
          resultJSON: JSON.stringify({
            personas: responseJSON,
          }),
        })
          .then(() => {})
          .catch((err) => console.error((new Date()).toString()+"|"+prependToLog,"Glific Response - ", err));
      } else {
        responseJSON["OperationStatus"] = allPrompts["OperationStatus"];
        responseJSON["StatusDescription"] = allPrompts["StatusDescription"];
        console.info((new Date()).toString()+"|"+prependToLog,"End of execution with application error - ", allPrompts);
        res.status(200).json(responseJSON);
      }
    })
    .catch((err) => {
      console.info((new Date()).toString()+"|"+prependToLog,"End of execution with technical error - ", err);
      res.status(500).send(err);
    });
});

app.post("/unlocktopic", (req, res) => {
  
  let catalystApp = catalyst.initialize(req, { type: catalyst.type.applogic });

  const executionID = Math.random().toString(36).slice(2)
    
  //Prepare text to prepend with logs
  const params = ["getTopics",req.url,executionID,""]
  const prependToLog = params.join(" | ")
  
  console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")
  
  const requestBody = req.body;
  var responseObject = {
    OperationStatus: "SUCCESS",
  };
  const topicID = requestBody["TopicID"];
  const transactionID = requestBody["TransactionID"];
  var mobile = requestBody["Mobile"];
  var isUnlocked = requestBody["IsUnlocked"];
  
  mobile = mobile.toString().slice(-10);

  //Get the SystemPrompt details for the topics
  let query =
    "select Users.ROWID, UserPaidTopicMapper.ROWID, UserPaidTopicMapper.SystemPromptROWID, UserPaidTopicMapper.IsActive, UserPaidTopicMapper.TransactionID, UserPaidTopicMapper.PaymentStatus  from Users left join UserPaidTopicMapper on Users.ROWID = UserPaidTopicMapper.UserROWID where Users.IsActive = true and Users.Mobile="+mobile;
  let zcql = catalystApp.zcql();
  zcql
    .executeZCQLQuery(query)
    .then((paymentStatus) => {
      if ((!Array.isArray(paymentStatus)) && (paymentStatus.length > 0)) {
        responseObject["OperationStatus"] = "APP_ERR";
        responseObject["StatusDescription"] = paymentStatus;
        console.info((new Date()).toString()+"|"+prependToLog,"End of execution:", responseObject);
        res.status(200).json(responseObject);
      }
      else if (Array.isArray(paymentStatus) && (paymentStatus.length ==0)) {
        responseObject["OperationStatus"] = "NO_DATA";
        responseObject["StatusDescription"] = "No user record found";
        console.info((new Date()).toString()+"|"+prependToLog,"End of execution:", responseObject);
        res.status(200).json(responseObject);
      }
      else{
        const getCurrentPaymentRecords = paymentStatus.filter(data=>data.UserPaidTopicMapper.TransactionID == transactionID)
        var record = {}
        if(getCurrentPaymentRecords.length==0){
          console.info((new Date()).toString()+"|"+prependToLog,"New Record")
          record = {
            UserROWID: paymentStatus[0]['Users']['ROWID'],
            SystemPromptROWID: topicID,
            TransactionID: transactionID,
            IsActive: isActive,
            PaymentStatus: status
          }
        }
        else{
          console.info((new Date()).toString()+"|"+prependToLog,"Current Record to be Updated: "+ getCurrentPaymentRecords[0]['UserPaidTopicMapper']['ROWID'])
          record = {
            ROWID: getCurrentPaymentRecords[0]['UserPaidTopicMapper']['ROWID'],
            IsActive: isActive,
            PaymentStatus: status
          }

        }
        let table = catalystApp.datastore().table("UserPaidTopicMapper")
        if(getCurrentPaymentRecords.length==0){
          table.insertRow(record)
          .then((row)=>{
            if(typeof row['ROWID'] === 'undefined'){
              responseObject['OperationStatus'] = 'APP_ERR'
              responseObject['StatusDescription'] = row
              console.info((new Date()).toString()+"|"+prependToLog,"End of execution:", responseObject);
              res.status(200).json(responseObject);
            }
            else{
              responseObject['OperationStatus'] = 'SUCCESS'
              console.info((new Date()).toString()+"|"+prependToLog,"End of execution:", responseObject);
              res.status(200).json(responseObject);
            }
          })
          .catch((err) => {
            responseObject["OperationStatus"] = "APP_ERR";
            responseObject["StatusDescription"] = err;
            console.info((new Date()).toString()+"|"+prependToLog,"End of execution due to error:", responseObject, "\nError:",err);
            res.status(200).json(responseObject);
          });
        }
        else{
          table.updateRow(record)
          .then((row)=>{
            if(typeof row['ROWID'] === 'undefined'){
              responseObject['OperationStatus'] = 'APP_ERR'
              responseObject['StatusDescription'] = row
              console.info((new Date()).toString()+"|"+prependToLog,"End of execution:", responseObject);
              res.status(200).json(responseObject);
            }
            else{
              responseObject['OperationStatus'] = 'SUCCESS'
              console.info((new Date()).toString()+"|"+prependToLog,"End of execution:", responseObject);
              res.status(200).json(responseObject);
            }
          })
          .catch((err) => {
            responseObject["OperationStatus"] = "APP_ERR";
            responseObject["StatusDescription"] = err;
            console.info((new Date()).toString()+"|"+prependToLog,"End of execution due to error:", responseObject, "\nError:",err);
            res.status(200).json(responseObject);
          });

        }
      }
    })
    .catch((err) => {
      responseObject["OperationStatus"] = "APP_ERR";
      responseObject["StatusDescription"] = "Application Error";
      console.info((new Date()).toString()+"|"+prependToLog,
        "End of execution due to error:",
        responseObject,
        "\nError:",
        err
      );
      res.status(200).json(responseObject);
    });
});


module.exports = app;

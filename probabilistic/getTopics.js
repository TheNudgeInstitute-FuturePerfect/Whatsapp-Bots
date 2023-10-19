"use strict";

const express = require("express");
// const catalyst = require('zcatalyst-sdk-node');
//const catalyst = require("zoho-catalyst-sdk");
const sendResponseToGlific = require("./common/sendResponseToGlific.js");
let userTopicSubscriptionMapper = require("./models/userTopicSubscriptionMapper.js")
const SystemPrompts = require("./models/SystemPrompts.js");
let getConfigurationParam = require("./common/getConfigurationParam.js");
const Razorpay = require("razorpay")
var instance = new Razorpay({
    key_id: process.env.RPayKeyID,
    key_secret: process.env.RPayKeySecret
});
const Session = require("./models/Sessions.js");
const User = require("./models/Users.js");
const UserPaidTopicMapper = require("./models/UserPaidTopicMapper.js");

// const app = express();
// app.use(express.json());
const app = express.Router();

const unique = (value, index, self) => {
  return self.indexOf(value) === index;
};

app.post("/modulelist", (req, res) => {
  const requestBody = req.body;

  const executionID = Math.random().toString(36).slice(2)
    
  //Prepare text to prepend with logs
  const params = ["getTopics",req.url,executionID,""]
  const prependToLog = params.join(" | ")
  
  console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")
    
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
        var promptNames = allPrompts["Prompts"].filter(data=>data.Module!=null).map((data) => data.Module);
        promptNames = promptNames.filter(unique);
        var i = nextStartIndex
        for (; i < promptNames.length; i++) {
          responseJSON["Module" + (i - nextStartIndex + 1)] = promptNames[i];
        }
        const npModulePromptNames = allPrompts["Prompts"].filter(data=>data.Module==null);
        let addToTotal = 1
        if(npModulePromptNames.length>0){
          responseJSON["Module" + (i - nextStartIndex + 1)] = "Other Topics";
          i++;
          addToTotal++
        }
        responseJSON["Module" + (i - nextStartIndex + 1)] = "My Performance";

        if (promptNames.length+2 > nextStartIndex) {
          responseJSON["TotalModules"] = promptNames.length+addToTotal - nextStartIndex;
          responseJSON["MaxModules"] = promptNames.length+addToTotal;
        } else {
          responseJSON["OperationStatus"] = "NO_MR_MODS";
          responseJSON["StatusDescription"] = "No more Modules";
        }
        console.info((new Date()).toString()+"|"+prependToLog,"End of execution - ", responseJSON);
        res.status(200).json(responseJSON);
        sendResponseToGlific({
          flowID: requestBody["FlowID"],
          contactID: requestBody["contact"]["id"],
          resultJSON: JSON.stringify({
            modules: responseJSON,
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


app.post("/topiclist", (req, res) => {
  const requestBody = req.body;

  const executionID = Math.random().toString(36).slice(2)
    
  //Prepare text to prepend with logs
  const params = ["getTopics",req.url,executionID,""]
  const prependToLog = params.join(" | ")
  
  console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")
    
  const module = (typeof requestBody["Module"] === 'undefined') ? null : ((requestBody["Module"] == 'Start Practice')||(requestBody["Module"].startsWith("@contact"))||(requestBody["Module"].startsWith("@result"))) ? null : requestBody["Module"]
  console.info((new Date()).toString()+"|"+prependToLog,"Module="+module)

  const nextStartIndex = requestBody["NextStartIndex"] - 1;
  var responseJSON = {
    OperationStatus: "SUCCESS",
  };

  //Get table meta object without details.
  let getAssessmentContribution = require("./common/getAssessmentContribution.js");

  
  getAssessmentContribution({ isactive: true, type: "Topic Prompt" })
    .then((promptsResult) => {
      //console.log(promptsResult,"promptsResult+++++++++++++++++");
      const allPrompts = JSON.parse(promptsResult);
     
      if (allPrompts["OperationStatus"] == "SUCCESS") {
        console.log(allPrompts["Prompts"],"promptsResult+++++++++++++++++");
        var promptNames = allPrompts["Prompts"].filter(data=>module == 'All' ? true : (data.Module==module)).map((data) => data.Name);
        //console.log(promptNames,"promptsResult+++++++++++++++++");
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

  ////let catalystApp = catalyst.initialize(req, { type: catalyst.type.applogic });

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
  // let query =
  //   "select distinct SystemPrompts.ROWID, SystemPrompts.Sequence, SystemPrompts.SupportingText, SystemPrompts.SupportingImageURL, SystemPrompts.SupportingAVURL, SystemPrompts.ObjectiveMessage, SystemPrompts.IsPaid, SystemPrompts.ShowLearningContent, SystemPrompts.LearningObjective, SystemPrompts.Game from SystemPrompts where SystemPrompts.Name = '" +
  //   topic +
  //   "' and SystemPrompts.IsActive = true";
  let filterParams = {
        Name: topic,
        IsActive: true
  };
  if (persona != null)
    // query = query + " and Persona = '" + persona.replace(/'/g, "''").replace(" 🔐","") + "'";
    filterParams = {
        Name: topic,
        IsActive: true,
        Persona : persona.replace(/'/g, "''").replace(" 🔐","")
      }
  // let zcql = catalystApp.zcql();
  // zcql
  //   .executeZCQLQuery(query)
  SystemPrompts.find(filterParams)
    .then((systemPrompts) => {
      console.info((new Date()).toString()+"|"+prependToLog,"Fetched System Prompt")//,systemPrompts);
      if (!(systemPrompts != null && systemPrompts.length > 0)) {
        responseObject["OperationStatus"] = "NO_DATA";
        responseObject["StatusDescription"] =
          "No system prompts active for " + topic;
        console.info((new Date()).toString()+"|"+prependToLog,"End of execution:", responseObject);
        res.status(200).json(responseObject);
      } else {

        const checkTopicSubscriptionStatus = (mobile, systemPromptROWID) =>{
          return new Promise((resolve, reject)=>{
            // let query = "Select ROWID from Users where IsActive = true and Users.Mobile="+mobile
            // console.debug("Checking status of Topic for the user:",query)
            // zcql.executeZCQLQuery(query)  
            User.findOne({ Mobile: parseInt(mobile), IsActive: { $ne: false } })
            .then(async (user)=>{
              if(user==null){
                console.info((new Date()).toString()+"|"+prependToLog,"Error in query for getting user info")
                reject("Error in query for getting user info")
              }
              else{
                //Get the topic subscriptions initiated by the user
                const unlockCourseAttemptsFilter = {
                  UserROWID:user['_id'],
                  SystemPromptROWID:systemPromptROWID
                }
                console.info((new Date()).toString()+"|"+prependToLog,'Fetching Topic Subscription Status of User for '+JSON.stringify(unlockCourseAttemptsFilter))
                const unlockCourseAttempts = await userTopicSubscriptionMapper.find(unlockCourseAttemptsFilter)
                console.info((new Date()).toString()+"|"+prependToLog,'Total Topic Subscription Status Records of User: '+unlockCourseAttempts.length)
                //If there is no subscription initiated, return topic to be Locked
                if(unlockCourseAttempts.length==0){
                  console.info((new Date()).toString()+"|"+prependToLog,"User has not attempted to unlock the topic")
                  resolve("Locked")
                }
                //Otherwise,
                else{
                  //check if any of the record has status isUnlocked = true
                  const unlockedCourses = unlockCourseAttempts.filter(data=>data.IsUnlocked==true)
                  console.info((new Date()).toString()+"|"+prependToLog,'Total Topic Subscription Status = Paid for User: '+JSON.stringify(unlockedCourses))
                  //if any such record found, return that topic is unlocked
                  if(unlockedCourses.length>0){
                    console.info((new Date()).toString()+"|"+prependToLog,"User has unlocked the topic")
                    resolve("Unlocked")
                  }
                  //Otherwise
                  else{
                    //Verify payment status of all pending records for the topic
                    console.info((new Date()).toString()+"|"+prependToLog,"Verifying Payment Status")
                    var paymentSuccessfull = false
                    for(var i=0; i<unlockCourseAttempts.length; i++){
                      const paymentID = unlockCourseAttempts[i].PaymentID
                      console.info((new Date()).toString()+"|"+prependToLog,"Verifying Payment Status of "+paymentID)
                      try{
                        //Call Razor Pay API to verify payment link
                        const paymentStatus =  await instance.paymentLink.fetch(paymentID)
                        //If payment status = captured or paid,
                        if((paymentStatus['status']=='captured') || (paymentStatus['status']=='paid')){
                          const filter = {
                            PaymentID: paymentID
                          }
                          let paymentTracker = unlockCourseAttempts[i]['PaymentTracker']
                          paymentTracker.push(paymentStatus)
                          const updateData = {
                            IsUnlocked: true,
                            PaymentTracker: paymentTracker
                          }
                          //Update the isUnlocked flag to true for the records matching the payent id
                          const updatedRow = await userTopicSubscriptionMapper.updateMany(filter,updateData)
                          console.info((new Date()).toString()+"|"+prependToLog,"Payment Successful for "+paymentID+" | Matched Records: "+updatedRow.matchedCount+" | Modified Records: "+updatedRow.modifiedCount+" | Acknowledged Records: "+updatedRow.acknowledged)
                          paymentSuccessfull = true
                          //exit from loop
                          break;
                        }
                      }
                      catch(err){
                        console.info((new Date()).toString()+"|"+prependToLog,"Failed to get Payment Status of "+paymentID+" due to ",err)
                      }
                    }
                    if(paymentSuccessfull==false){
                      console.info((new Date()).toString()+"|"+prependToLog,"User has not unlocked the topic")
                      resolve("Locked")
                    }
                    else{
                      console.info((new Date()).toString()+"|"+prependToLog,"User paid for the topic")
                      resolve("Unlocked")
                    }
                  }
                }
              }

            })
            .catch((error)=>{
              console.info((new Date()).toString()+"|"+prependToLog,"Error in query for getting unlock status")
              reject(error)
            })
          })
        }

        const checkLockStatusForUser = (isPaid, mobile, systemPromptROWID) => {
          return new Promise((resolve, reject)=>{
            if(isPaid!=true){            
              getConfigurationParam({
                id: systemPromptROWID,
                param: ["maxsessions"],
              })
              .then((topicConfigResult)=>{
                const topicConfig = JSON.parse(topicConfigResult);
                if ((topicConfig.OperationStatus != "SUCCESS")&&(topicConfig.OperationStatus != "NO_PARAM_CFG"))
                  reject(topicConfig)
                else{
                  if(topicConfig.Values==null){
                    console.info((new Date()).toString()+"|"+prependToLog,"No maxsessions configured for the topic")
                    resolve('Unlocked')
                  }
                  else if(typeof topicConfig.Values['maxsessions'] !== 'undefined'){
                    // zcql.executeZCQLQuery("select distinct SessionID from Sessions where SystemPromptsROWID='"+systemPromptROWID+"'")
                    Session.distinct('SessionID', { SystemPromptsROWID: systemPromptROWID })
                    .then((sessions)=>{
                      if(!Array.isArray(sessions)){
                        console.info((new Date()).toString()+"|"+prependToLog,"Failed to get session count for the user ")
                        reject(sessions)
                      }
                      else{
                        if(sessions.length > topicConfig.Values['maxsessions']){
                          console.info((new Date()).toString()+"|"+prependToLog,"maxsessions "+topicConfig.Values['maxsessions']+" reached for the topic as sessions atttempted by user is "+sessions.length+". Checking Unsubscription Status")
                          checkTopicSubscriptionStatus(mobile, systemPromptROWID)
                          .then((subscriptionstatus)=>{
                            if(subscriptionstatus=="Unlocked"){
                              console.info((new Date()).toString()+"|"+prependToLog,"User has already paid for the topic.")
                              resolve('Unlocked')
                            }
                            else{
                              console.info((new Date()).toString()+"|"+prependToLog,"User has not paid for the topic. Send Sign-Up notification")
                              resolve('MaxSessionsReached')  
                            }
                          })
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
              checkTopicSubscriptionStatus(mobile, systemPromptROWID)
              .then((subscriptionstatus)=>{
                if(subscriptionstatus=="Unlocked"){
                  console.info((new Date()).toString()+"|"+prependToLog,"User has already paid for the topic.")
                  resolve('Unlocked')
                }
                else{
                  console.info((new Date()).toString()+"|"+prependToLog,"User has not paid for the topic. Send Sign-Up notification")
                  resolve('Locked')  
                }
              })
            }
          })

        }

        checkLockStatusForUser(systemPrompts[0]["IsPaid"],mobile,systemPrompts[0]["id"])
        .then((lockStatus)=>{
          if(lockStatus=='Locked'){
            responseObject["OperationStatus"] = "TPC_LOCKED";
            responseObject["StatusDescription"] = "User has not unlocked the topic"
            responseObject["TopicID"] = systemPrompts[0]["_id"];
            console.info((new Date()).toString()+"|"+prependToLog,"End of execution:", responseObject);
            res.status(200).json(responseObject);
          }
          else{
            if (persona != null) {
              //Prepare the data to be returned
              responseObject["TopicID"] =
                systemPrompts[0]["_id"];
              responseObject["SupportingText"] =
                systemPrompts[0]["SupportingText"];
              responseObject["SupportingTextFlag"] =
                responseObject["SupportingText"] != null;
              responseObject["SupportingImageURL"] =
                systemPrompts[0]["SupportingImageURL"];
              responseObject["SupportingImageURLFlag"] =
                responseObject["SupportingImageURL"] != null;
              responseObject["SupportingAVURL"] =
                systemPrompts[0]["SupportingAVURL"];
              responseObject["SupportingAVURLFlag"] =
                responseObject["SupportingAVURL"] != null;
              responseObject["SupportingFlag"] = 
                responseObject["SupportingTextFlag"] ||
                responseObject["SupportingImageURLFlag"] ||
                responseObject["SupportingAVURLFlag"];
              responseObject["ObjectiveMessage"] =
                systemPrompts[0]["ObjectiveMessage"];
              responseObject["ObjectiveMessageFlag"] =
                responseObject["ObjectiveMessage"] != null;
              responseObject["ShowLearningContent"] = systemPrompts[0]["ShowLearningContent"] == true
              
              //---- 2023-08-04 | GLOW 5.3 | ravi.bhushan@dhwaniris.com | Begin----
              responseObject["LearningObjective"] =
                systemPrompts[0]["LearningObjective"];
              responseObject["LearningObjectiveFlag"] =
                responseObject["LearningObjective"] != null;
              responseObject["Game"] =
                systemPrompts[0]["Game"];
              responseObject["GameFlag"] =
                responseObject["Game"] != null;
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
                  id: record["_id"],
                  sequence: record["Sequence"],
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
                (record) => record._id
              );

              //Get the list of all prompts of the that has been practised by user
              // query =
              //   "select DISTINCT Sessions.SessionID, Sessions.SystemPromptsROWID " +
              //   "from Sessions " +
              //   "where Sessions.Mobile = " +
              //   mobile +
              //   " and SystemPromptsROWID in (" +
              //   systemPromptROWIDs.join(",") +
              //   ") " +
              //   "order by CREATEDTIME desc";
              // zcql
              //   .executeZCQLQuery(query)
              Session.aggregate([
                {
                  Mobile: mobile,
                  SystemPromptsROWID: { $in: systemPromptROWIDs }
                },
                {
                  $group:
                    /**
                     * _id: The id of the group.
                     * fieldN: The first field name.
                     */
                    {
                      _id: "SessionID",
                      SystemPromptsROWID: {
                        $first: "$SystemPromptsROWID",
                      },
                    },
                },
                {
                  $project:
                    /**
                     * specifications: The fields to
                     *   include or exclude.
                     */
                    {
                      _id: 0,
                      SessionID: "$_id",
                      SystemPromptsROWID: 1,
                    },
                }
              ])
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
                          sessions[i]["SystemPromptsROWID"]
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
                    (data) => data._id == responseObject["TopicID"]
                  );
                  responseObject["SupportingText"] =
                    systemPrompt[0]["SupportingText"];
                  responseObject["SupportingTextFlag"] =
                    responseObject["SupportingText"] != null;
                  responseObject["SupportingImageURL"] =
                    systemPrompt[0]["SupportingImageURL"];
                  responseObject["SupportingImageURLFlag"] =
                    responseObject["SupportingImageURL"] != null;
                  responseObject["SupportingAVURL"] =
                    systemPrompt[0]["SupportingAVURL"];
                  responseObject["SupportingAVURLFlag"] =
                    responseObject["SupportingAVURL"] != null;
                  responseObject["SupportingFlag"] =
                    responseObject["SupportingTextFlag"] ||
                    responseObject["SupportingImageURLFlag"] ||
                    responseObject["SupportingAVURLFlag"];
                  responseObject["ShowLearningContent"] = systemPrompts[0]["ShowLearningContent"] == true
                  
                  //---- 2023-08-04 | GLOW 5.3 | ravi.bhushan@dhwaniris.com | Begin----
                  responseObject["LearningObjective"] = systemPrompts[0]["LearningObjective"];
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
        ).sort((a, b) => {//Sort the Persona by Sequence
          if (a["Sequence"] < b["Sequence"]) {
            return -1;
          }
          if (a["Sequence"] > b["Sequence"]) {
            return 1;
          }
          // a must be equal to b
          return 0;
        });
        if (
          typeof allPrompts !== "undefined" &&
          allPrompts != null &&
          allPrompts.length > 0
        ) {
          //let catalystApp = catalyst.initialize(req, { type: catalyst.type.applogic });
          //let zcql = catalystApp.zcql()
          for (var i = nextStartIndex; i < allPrompts.length; i++) {
            if(allPrompts[i]["IsPaid"]!=true)
              responseJSON["Persona" + (i - nextStartIndex + 1)] = allPrompts[i]["Persona"]
            else{
              try{
                // const user = await zcql.executeZCQLQuery("Select ROWID from Users where Mobile = '"+requestBody["Mobile"].slice(-10)+"'")
                const user = await User.findOne({ Mobile: requestBody["Mobile"].slice(-10)});
                if(user==null)
                  throw new Error("No Data")
                console.info((new Date()).toString()+"|"+prependToLog,"Fetched User's ID")
                //Get all the subscription attempts by the user for the topic
                const unlockCourseAttemptsFilter = {
                  UserROWID:user['_id'],
                  SystemPromptROWID:allPrompts[i]["_id"]
                }
                console.info((new Date()).toString()+"|"+prependToLog,"Fetching Topic Subscription Status of User for "+JSON.stringify(unlockCourseAttemptsFilter))
                const unlockCourseAttempts = await userTopicSubscriptionMapper.find(unlockCourseAttemptsFilter)

                console.info((new Date()).toString()+"|"+prependToLog,"Total Records for Topic Subscription Status of User: "+unlockCourseAttempts.length)
                console.debug((new Date()).toString()+"|"+prependToLog,"Fetched Topic Subscription Status of User: "+JSON.stringify(unlockCourseAttempts))
                var paymentSuccessfull = false
                //If there is no subscription attempt, show topic as locked
                //Otherwise, if there is any subscription attempt
                if(unlockCourseAttempts.length>0){
                  //Filter any record whose IsUnlocked flag = true
                  const userSubscriptions = unlockCourseAttempts.filter(data=>data.IsUnlocked==true)
                  console.debug((new Date()).toString()+"|"+prependToLog,"Total Records for Topic Subscription Status = Paid for User: "+JSON.stringify(userSubscriptions))
                  //If any record found with IsUnlocked flag = true, show topic as unlocked
                  if(userSubscriptions.length>0){
                    console.info((new Date()).toString()+"|"+prependToLog,"User has unlocked the topic")
                    paymentSuccessfull = true
                  }
                  //otherwise
                  else{
                    //Verify payment status of all the records
                    console.info((new Date()).toString()+"|"+prependToLog,"Verifying Payment Status")
                    //Call Razor Pay API to verify payment link
                    for(var j=0; j<unlockCourseAttempts.length; j++){
                      const paymentID = unlockCourseAttempts[j].PaymentID
                      console.info((new Date()).toString()+"|"+prependToLog,"Verifying Payment Status of "+paymentID)
                      try{
                        const paymentStatus =  await instance.paymentLink.fetch(paymentID)
                        //If any payment id has status as paid or captured,
                        if((paymentStatus['status']=='captured') || (paymentStatus['status']=='paid')){
                          const filter = {
                            PaymentID: paymentID
                          }
                          let paymentTracker = unlockCourseAttempts[j]['PaymentTracker']
                          paymentTracker.push(paymentStatus)
                          const updateData = {
                            IsUnlocked: true,
                            PaymentTracker: paymentTracker
                          }
                          //Update IsUnlocked = true for all the records with matching payment id
                          const updatedRow = await userTopicSubscriptionMapper.updateMany(filter,updateData)
                          console.info((new Date()).toString()+"|"+prependToLog,"Payment Successful for "+paymentID+" | Matched Records: "+updatedRow.matchedCount+" | Modified Records: "+updatedRow.modifiedCount+" | Acknowledged Records: "+updatedRow.acknowledged)
                          //show topic as unlocked
                          paymentSuccessfull = true
                          //Exit loop
                          break;
                        }
                      }
                      catch(err){
                        console.info((new Date()).toString()+"|"+prependToLog,"Failed to get Payment Status of "+paymentID+" due to ",err)
                      }
                      console.info((new Date()).toString()+"|"+prependToLog,"Payment Status: "+paymentSuccessfull)
                    }
                  }
                }
                responseJSON["Persona" + (i - nextStartIndex + 1)] = allPrompts[i]["Persona"]+ (paymentSuccessfull==false? " 🔐" : "");
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

/*app.post("/unlocktopic", (req, res) => {
  
  //let catalystApp = catalyst.initialize(req, { type: catalyst.type.applogic });

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
  // let query =
  //   "select Users.ROWID, UserPaidTopicMapper.ROWID, UserPaidTopicMapper.SystemPromptROWID, UserPaidTopicMapper.IsActive, UserPaidTopicMapper.TransactionID, UserPaidTopicMapper.PaymentStatus  from Users left join UserPaidTopicMapper on Users.ROWID = UserPaidTopicMapper.UserROWID where Users.IsActive = true and Users.Mobile="+mobile;
  // let zcql = catalystApp.zcql();
  // zcql
  //   .executeZCQLQuery(query)
  User.aggregate([
    {
      $match: {
        Mobile: mobile,
        IsActive: true
      }
    },
    {
      $lookup: {
        from: "userpaidtopicmapper", 
        localField: '_id',
        foreignField: 'UserROWID',
        as: 'UserPaidTopicMapper'
      }
    },
    {
      $project: {
        _id: 1,
        //'Users.ROWID': 1,
        'UserPaidTopicMapper.ROWID': 1,
        'UserPaidTopicMapper.SystemPromptROWID': 1,
        'UserPaidTopicMapper.IsActive': 1,
        'UserPaidTopicMapper.TransactionID': 1,
        'UserPaidTopicMapper.PaymentStatus': 1
      }
    }
  ])
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
            UserROWID: paymentStatus[0]['_id'],
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
        //let table = catalystApp.datastore().table("UserPaidTopicMapper")
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
});*/


module.exports = app;

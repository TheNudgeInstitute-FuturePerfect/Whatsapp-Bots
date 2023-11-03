"use strict";

const express = require("express");
// const catalyst = require('zcatalyst-sdk-node');
//const catalyst = require("zoho-catalyst-sdk");
const sendResponseToGlific = require("./common/sendResponseToGlific.js");
const SessionEvents = require("./models/SessionEvents.js");
const Session = require("./models/Sessions.js");
const SystemPrompt = require("./models/SystemPrompts.js");
const User = require("./models/Users.js");
const UserAssessmentLog = require("./models/UserAssessmentLogs.js");
const mongoose = require('mongoose');
const GameAttempts = require("./models/GameAttempts.js");
const ObjectId = mongoose.Types.ObjectId;

// const app = express();
// app.use(express.json());
const app = express.Router();

//Filter unique elements in an array
const unique = (value, index, self) => {
  return self.indexOf(value) === index;
};

const getYYYYMMDDDate = (date) => {
	return date.getFullYear()+"-"+('0'+(date.getMonth()+1)).slice(-2)+"-"+('0'+date.getDate()).slice(-2)
}

app.post("/totalsessions", (req, res) => {
    let startTimeStamp = new Date();
    //let catalystApp = catalyst.initialize(req, { type: catalyst.type.applogic });
    //let zcql = catalystApp.zcql()
    const requestBody = req.body;
 
    const executionID = Math.random().toString(36).slice(2)
    
    const params = ["getUserSessionCount","totalsessions",executionID,""]
    const prependToLog = params.join(" | ")
    
    console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")
    const mobile = requestBody["Mobile"].slice(-10)
    const systemPromptROWID = requestBody["TopicID"] ? ((requestBody["TopicID"].startsWith("@result")||requestBody["TopicID"].startsWith("@contact")) ? null : requestBody["TopicID"]):null
    const game = requestBody["Game"] ? ((requestBody["Game"].startsWith("@result")||requestBody["Game"].startsWith("@contact")) ? null : requestBody["Game"]):null
        
    // let query = "Select {} from Sessions left join SystemPrompts on SystemPrompts.ROWID = Sessions.SystemPromptsROWID where Sessions.Mobile = "+mobile
    // const sessionQuery = getAllRows("distinct SystemPrompts.Module, SystemPrompts.Name, SystemPrompts.Persona, Sessions.SystemPromptsROWID, Sessions.SessionID, Sessions.IsActive, Sessions.CREATEDTIME",query,zcql,prependToLog)
    const sessionQuery = Session.aggregate([
      {
        $match:{ 
          Mobile: mobile.toString()
        }
      },
      {
        $lookup:{
          from:'systemprompts',
          localField:'SystemPromptsROWID',
          foreignField:'_id',
          as:'SystemPrompts'
        }
      },
      {
        $unwind:{
          path:'$SystemPrompts',
          preserveNullAndEmptyArrays:true
        }
      }
    ])
    // const learningQuery = "Select {} from UserAssessmentLogs left join Users on Users.ROWID = UserAssessmentLogs.UserROWID where Users.Mobile = "+mobile
    // const userAssessmentQuery = getAllRows("distinct ROWID, IsAssessmentComplete",learningQuery,zcql,prependToLog)
    const userAssessmentQuery = UserAssessmentLog.aggregate([
      {
        $lookup: {
          from: "users", // Name of the collection to join with
          localField: 'UserROWID',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: {
          path:'$user',
          preserveNullAndEmptyArrays:true
        }
      },
      {
        $match: {
          'user.Mobile': parseInt(mobile)
        }
      }/*,
      {
        $project: {
          _id: 0,
          'UserAssessmentLogs._id': 1,
          'UserAssessmentLogs.IsAssessmentComplete': 1
        }
      }*/
    ]);
    const axios = require("axios");
    const gameQuery = axios.get(process.env.WordleReportURL+mobile)
    const learningStartQuery = {Event:'Learn Session Start',Mobile:mobile} //"Select {} from SessionEvents where Event = 'Learn Session Start' and Mobile = "+mobile
    const runLearningStartQuery = SessionEvents.find(learningStartQuery)//getAllRows("distinct ROWID",learningStartQuery,zcql,prependToLog)
    const systemPromptQuery = systemPromptROWID == null ? {} : {_id:systemPromptROWID} //"Select {} from SystemPrompts where ROWID = "+systemPromptROWID
    const runSystemPromptQuery = SystemPrompt.find(systemPromptQuery) //getAllRows("Module, Name, Persona",systemPromptQuery,zcql,prependToLog)
    const otherGameQuery = GameAttempts.find({Mobile: parseInt(mobile)})

    Promise.all([sessionQuery,userAssessmentQuery,gameQuery,runLearningStartQuery, runSystemPromptQuery,otherGameQuery])
    .then(async ([userSessions,userAssessmentLogs,wordleAttempts,learningStart,systemPromptQueryResult,gameAttempts])=>{
        //userSessions = await Session.find({ _id: { $in: userSessions } });
        if(!Array.isArray(userSessions))
          throw new Error(userSessions)
        else if(!Array.isArray(userAssessmentLogs))
          throw new Error(userAssessmentLogs)
        else if(!Array.isArray(learningStart))
          throw new Error(learningStart)
        else if(!Array.isArray(systemPromptQueryResult))
          throw new Error(systemPromptQueryResult)
        else{
          const sessions = userSessions.filter(
            (data) =>
              !(
                data.SessionID.endsWith("Hint") ||
                data.SessionID.endsWith("Translation") ||
                data.SessionID.endsWith("ObjectiveFeedback") ||
                data.SessionID.startsWith("Onboarding") ||
                data.SessionID.endsWith("Onboarding") ||
                data.SessionID.startsWith("onboarding") ||
                data.SessionID.endsWith("onboarding")
              )
          );
          console.info((new Date()).toString()+"|"+prependToLog,"Fetched Conversation Data. Total Records: ",sessions.length)
          console.info((new Date()).toString()+"|"+prependToLog,"Fetched Learning Data. Total Records: ",userAssessmentLogs.length)
          const wordleAttemptsReport = wordleAttempts.data
          console.info((new Date()).toString()+"|"+prependToLog,"Fetched Game Data. Total Records: ",wordleAttemptsReport.length)        
          var responseObject = {
                "OperationStatus":"SUCCESS"
          }
          if((sessions.length==0)&&(userAssessmentLogs.length==0)&&(wordleAttemptsReport.length==0)&&(learningStart.length==0)&&(gameAttempts.length==0)){
              responseObject['OperationStatus'] = "SUCCESS"//"NO_SESSION_RECORD"
              responseObject['StatusDescription'] = "No Session Data"
              responseObject['TotalConvesationSessions'] = 0
              responseObject['TotalConvesationSessionsCompleted'] = 0
              responseObject['TotalLearningSessions'] = 0
              responseObject['TotalLearningSessionsStarted'] = 0
              responseObject['TotalLearningSessionsCompleted'] = 0
              responseObject['TotalGameSessions'] = 0
              responseObject['TotalGameSessionsCompleted'] = 0
              responseObject['Persona'] = systemPromptQueryResult[0]['Persona']
              responseObject['TotalPersonaSessionsStarted'] = 0
              responseObject['TotalPersonaSessionsCompleted'] = 0
              responseObject['TotalDaysPersonaPracticed'] = 0
              const topic = systemPromptQueryResult[0]['Name']
              const module = systemPromptQueryResult[0]['Module']
              responseObject['Topic'] = topic
              responseObject['Module'] = module
              responseObject['TotalTopicSessionsStarted'] = 0
              responseObject['TotalTopicSessionsCompleted'] = 0
              responseObject['TotalDaysTopicPracticed'] = 0
              responseObject['TotalModuleSessionsStarted'] = 0
              responseObject['TotalModuleSessionsCompleted'] = 0
              responseObject['TotalDaysModulePracticed'] = 0
          }
          else{
              //All Conversations Started
              responseObject['TotalConvesationSessions']=sessions.map(data=>data.SessionID).filter(unique).length
              //All Conversations Completed
              responseObject['TotalConvesationSessionsCompleted']=responseObject['TotalConvesationSessions'] - sessions.filter(data=>data.IsActive==true).map(data=>data.SessionID).filter(unique).length
              //All Quiz Sesssions Completed
              responseObject['TotalLearningSessions']=userAssessmentLogs.length
              //All Learning Sesssions Complered
              responseObject['TotalLearningSessionsStarted'] = learningStart.length
              //All Learning/Quiz Sesssions Completed
              responseObject['TotalLearningSessionsCompleted']=userAssessmentLogs.filter(data=>data.IsAssessmentComplete==true).length
              //All Game Sessions Started
              responseObject['TotalGameSessions']=wordleAttemptsReport.length + gameAttempts.length
              //All Game Sessions Completed
              responseObject['TotalGameSessionsCompleted']=wordleAttemptsReport.filter(data=>data.CompletedWordle=="Yes").length + gameAttempts.filter(data=>data.SessionComplete =='Yes').length
              //Getting Persona, Topic and Module Started and Completed
              if((systemPromptROWID != null)&&(sessions.length>0)){
                let personaSessions = sessions.filter(data=>data.SystemPromptsROWID==systemPromptROWID)
                if(personaSessions.length==0){
                  responseObject['Persona'] = systemPromptQueryResult.length>0 ? systemPromptQueryResult[0]['Persona'] : null
                  responseObject['TotalPersonaSessionsStarted'] = 0
                  responseObject['TotalPersonaSessionsCompleted'] = 0
                  responseObject['TotalDaysPersonaPracticed'] = 0
                  
                }
                else{
                  responseObject['Persona'] = personaSessions[0]['SystemPrompts']['Persona']
                  responseObject['TotalPersonaSessionsStarted'] = personaSessions.map(data=>data.SessionID).filter(unique).length
                  responseObject['TotalPersonaSessionsCompleted'] = responseObject['TotalPersonaSessionsStarted'] - personaSessions.filter(data=>data.IsActive==true).map(data=>data.SessionID).filter(unique).length
                  responseObject['TotalDaysPersonaPracticed'] = personaSessions.map(data=>getYYYYMMDDDate(data.CREATEDTIME)).filter(unique).length
                }
                const topic = systemPromptQueryResult.length > 0 ? systemPromptQueryResult[0]['Name'] : null
                const module = systemPromptQueryResult.length > 0 ? systemPromptQueryResult[0]['Module'] : null
                personaSessions = sessions.filter(data=>data.SystemPrompts.Name==topic)
                responseObject['Topic'] = topic
                responseObject['Module'] = module
                if(personaSessions.length>0){
                  responseObject['TotalTopicSessionsStarted'] = personaSessions.map(data=>data.SessionID).filter(unique).length
                  responseObject['TotalTopicSessionsCompleted'] = responseObject['TotalTopicSessionsStarted'] - personaSessions.filter(data=>data.IsActive==true).map(data=>data.SessionID).filter(unique).length
                  responseObject['TotalDaysTopicPracticed'] = personaSessions.map(data=>getYYYYMMDDDate(data.CREATEDTIME)).filter(unique).length
                }
                else{
                  responseObject['TotalTopicSessionsStarted'] = 0
                  responseObject['TotalTopicSessionsCompleted'] = 0
                  responseObject['TotalDaysTopicPracticed'] = 0
                }
                personaSessions = sessions.filter(data=>data.SystemPrompts.Module==module)
                if(personaSessions.length>0){
                  responseObject['TotalModuleSessionsStarted'] = personaSessions.map(data=>data.SessionID).filter(unique).length
                  responseObject['TotalModuleSessionsCompleted'] = responseObject['TotalModuleSessionsStarted'] - personaSessions.filter(data=>data.IsActive==true).map(data=>data.SessionID).filter(unique).length
                  responseObject['TotalDaysModulePracticed'] = personaSessions.map(data=>getYYYYMMDDDate(data.CREATEDTIME)).filter(unique).length
                }
                else{
                  responseObject['TotalModuleSessionsStarted'] = 0
                  responseObject['TotalModuleSessionsCompleted'] = 0
                  responseObject['TotalDaysModulePracticed'] = 0
                }
              }
          }
          console.info((new Date()).toString()+"|"+prependToLog,"End of Execution")
          console.debug((new Date()).toString()+"|"+prependToLog,"End of Execution. Response:",responseObject)
          res.status(200).json(responseObject)  
          //Send Reponse to Glific
          let endTimeStamp = new Date();
          let executionDuration = (endTimeStamp - startTimeStamp) / 1000;
          if (executionDuration > 5) {
            if((typeof requestBody["FlowID"] !== 'undefined')&&(typeof requestBody["contact"] !== 'undefined'))
              sendResponseToGlific({
                flowID: requestBody["FlowID"],
                contactID: requestBody["contact"]["id"],
                resultJSON: JSON.stringify({
                  practicesessions: responseObject,
                }),
              })
              .then((glificResponse) => {})
              .catch((err) => console.info((new Date()).toString()+"|"+prependToLog,"Error returned from Glific: ", err));
          }      
        }
    })
    .catch((error)=>{
        console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error")
        console.error((new Date()).toString()+"|"+prependToLog,"Error: ",error)
        res.status(500).send(error)
    })
})

module.exports = app;
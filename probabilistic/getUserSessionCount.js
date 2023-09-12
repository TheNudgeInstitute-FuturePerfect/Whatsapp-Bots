"use strict";

const express = require("express");
// const catalyst = require('zcatalyst-sdk-node');
const catalyst = require("zoho-catalyst-sdk");
const sendResponseToGlific = require("./common/sendResponseToGlific.js");
// const app = express();
// app.use(express.json());
const app = express.Router();

//Filter unique elements in an array
const unique = (value, index, self) => {
  return self.indexOf(value) === index;
};

const getAllRows = (fields,query,zcql,prependToLog,dataLimit) => {
	return new Promise(async (resolve) => {			
		var jsonReport = []
		const dataQuery = query.replace("{}",fields)
		const lmt = dataLimit ? dataLimit : 300
		var i = 1
		while(true){
			query = dataQuery+" LIMIT "+i+", "+lmt
			console.info((new Date()).toString()+"|"+prependToLog,'Fetching records from '+i+" to "+(i+300-1)+
						'\nQuery: '+query)
			const queryResult = await zcql.executeZCQLQuery(query)
			console.info((new Date()).toString()+"|"+prependToLog,queryResult.length)
			if((queryResult.length == 0)||(!Array.isArray(queryResult))){
				if(!Array.isArray(queryResult))
					console.info((new Date()).toString()+"|"+prependToLog,"Error in query - ",queryResult)
				break;
			}
			jsonReport = jsonReport.concat(queryResult)					
			i=i+300
		}
		resolve(jsonReport)
	})
}

app.post("/totalsessions", (req, res) => {
    let startTimeStamp = new Date();
    let catalystApp = catalyst.initialize(req, { type: catalyst.type.applogic });
    let zcql = catalystApp.zcql()
    const requestBody = req.body;
 
    const executionID = Math.random().toString(36).slice(2)
    
    const params = ["getUserSessionCount","totalsessions",executionID,""]
    const prependToLog = params.join(" | ")
    
    console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")
    const mobile = requestBody["Mobile"].slice(-10)
    const systemPromptROWID = requestBody["TopicID"] ? ((requestBody["TopicID"].startsWith("@result")||requestBody["TopicID"].startsWith("@contact")) ? null : requestBody["TopicID"]):null
    const game = requestBody["Game"] ? ((requestBody["Game"].startsWith("@result")||requestBody["Game"].startsWith("@contact")) ? null : requestBody["Game"]):null
        
    let query = "Select {} from Sessions left join SystemPrompts on SystemPrompts.ROWID = Sessions.SystemPromptsROWID where Sessions.Mobile = "+mobile
    const sessionQuery = getAllRows("distinct SystemPrompts.Module, SystemPrompts.Name, SystemPrompts.Persona, Sessions.SystemPromptsROWID, Sessions.SessionID, Sessions.IsActive, Sessions.CREATEDTIME",query,zcql,prependToLog)
    const learningQuery = "Select {} from UserAssessmentLogs left join Users on Users.ROWID = UserAssessmentLogs.UserROWID where Users.Mobile = "+mobile
    const userAssessmentQuery = getAllRows("distinct ROWID, IsAssessmentComplete",learningQuery,zcql,prependToLog)
    const axios = require("axios");
    const gameQuery = axios.get(process.env.WordleReportURL+mobile)
    const learningStartQuery = "Select {} from SessionEvents where Event = 'Learn Session Start' and Mobile = "+mobile
    const runLearningStartQuery = getAllRows("distinct ROWID",learningStartQuery,zcql,prependToLog)
    const systemPromptQuery = "Select {} from SystemPrompts where ROWID = "+systemPromptROWID
    const runSystemPromptQuery = getAllRows("Module, Name, Persona",systemPromptQuery,zcql,prependToLog)
    

    Promise.all([sessionQuery,userAssessmentQuery,gameQuery,runLearningStartQuery, runSystemPromptQuery])
    .then(([userSessions,userAssessmentLogs,wordleAttempts,learningStart,systemPromptQueryResult])=>{
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
                data.Sessions.SessionID.endsWith("Hint") ||
                data.Sessions.SessionID.endsWith("Translation") ||
                data.Sessions.SessionID.endsWith("ObjectiveFeedback") ||
                data.Sessions.SessionID.startsWith("Onboarding") ||
                data.Sessions.SessionID.endsWith("Onboarding") ||
                data.Sessions.SessionID.startsWith("onboarding") ||
                data.Sessions.SessionID.endsWith("onboarding")
              )
          );
          console.info((new Date()).toString()+"|"+prependToLog,"Fetched Conversation Data. Total Records: ",sessions.length)
          console.info((new Date()).toString()+"|"+prependToLog,"Fetched Learning Data. Total Records: ",userAssessmentLogs.length)
          const wordleAttemptsReport = wordleAttempts.data
          console.info((new Date()).toString()+"|"+prependToLog,"Fetched Game Data. Total Records: ",wordleAttemptsReport.length)        
          var responseObject = {
                "OperationStatus":"SUCCESS"
          }
          if((sessions.length==0)&&(userAssessmentLogs.length==0)&&(wordleAttemptsReport.length==0)&&(learningStart.length==0)){
              responseObject['OperationStatus'] = "NO_SESSION_RECORD"
              responseObject['StatusDescription'] = "No Session Data"
          }
          else{
              //All Conversations Started
              responseObject['TotalConvesationSessions']=sessions.map(data=>data.Sessions.SessionID).filter(unique).length
              //All Conversations Completed
              responseObject['TotalConvesationSessionsCompleted']=responseObject['TotalConvesationSessions'] - sessions.filter(data=>data.Sessions.IsActive==true).map(data=>data.Sessions.SessionID).filter(unique).length
              //All Quiz Sesssions Completed
              responseObject['TotalLearningSessions']=userAssessmentLogs.length
              //All Learning Sesssions Complered
              responseObject['TotalLearningSessionsStarted'] = learningStart.length
              //All Learning/Quiz Sesssions Completed
              responseObject['TotalLearningSessionsCompleted']=userAssessmentLogs.filter(data=>data.UserAssessmentLogs.IsAssessmentComplete==true).length
              //All Game Sessions Started
              responseObject['TotalGameSessions']=wordleAttemptsReport.length
              //All Game Sessions Completed
              responseObject['TotalGameSessionsCompleted']=wordleAttemptsReport.filter(data=>data.CompletedWordle=="Yes").length
              //Getting Persona, Topic and Module Started and Completed
              if((systemPromptROWID != null)&&(sessions.length>0)){
                let personaSessions = sessions.filter(data=>data.Sessions.SystemPromptsROWID==systemPromptROWID)
                if(personaSessions.length==0){
                  responseObject['Persona'] = systemPromptQueryResult[0]['SystemPrompts']['Persona']
                  responseObject['TotalPersonaSessionsStarted'] = 0
                  responseObject['TotalPersonaSessionsCompleted'] = 0
                  responseObject['TotalDaysPersonaPracticed'] = 0
                  
                }
                else{
                  responseObject['Persona'] = personaSessions[0]['SystemPrompts']['Persona']
                  responseObject['TotalPersonaSessionsStarted'] = personaSessions.map(data=>data.Sessions.SessionID).filter(unique).length
                  responseObject['TotalPersonaSessionsCompleted'] = responseObject['TotalPersonaSessionsStarted'] - personaSessions.filter(data=>data.Sessions.IsActive==true).map(data=>data.Sessions.SessionID).filter(unique).length
                  responseObject['TotalDaysPersonaPracticed'] = personaSessions.map(data=>data.Sessions.CREATEDTIME.toString().slice(0,10)).filter(unique).length
                }
                const topic = systemPromptQueryResult[0]['SystemPrompts']['Name']
                const module = systemPromptQueryResult[0]['SystemPrompts']['Module']
                personaSessions = sessions.filter(data=>data.SystemPrompts.Name==topic)
                responseObject['Topic'] = topic
                responseObject['Module'] = module
                if(personaSessions.length>0){
                  responseObject['TotalTopicSessionsStarted'] = personaSessions.map(data=>data.Sessions.SessionID).filter(unique).length
                  responseObject['TotalTopicSessionsCompleted'] = responseObject['TotalTopicSessionsStarted'] - personaSessions.filter(data=>data.Sessions.IsActive==true).map(data=>data.Sessions.SessionID).filter(unique).length
                  responseObject['TotalDaysTopicPracticed'] = personaSessions.map(data=>data.Sessions.CREATEDTIME.toString().slice(0,10)).filter(unique).length
                }
                else{
                  responseObject['TotalTopicSessionsStarted'] = 0
                  responseObject['TotalTopicSessionsCompleted'] = 0
                  responseObject['TotalDaysTopicPracticed'] = 0
                }
                personaSessions = sessions.filter(data=>data.SystemPrompts.Module==module)
                if(personaSessions.length>0){
                  responseObject['TotalModuleSessionsStarted'] = personaSessions.map(data=>data.Sessions.SessionID).filter(unique).length
                  responseObject['TotalModuleSessionsCompleted'] = responseObject['TotalModuleSessionsStarted'] - personaSessions.filter(data=>data.Sessions.IsActive==true).map(data=>data.Sessions.SessionID).filter(unique).length
                  responseObject['TotalDaysModulePracticed'] = personaSessions.map(data=>data.Sessions.CREATEDTIME.toString().slice(0,10)).filter(unique).length
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
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
    
    let query = "Select {} from UserSessionAttemptReport where Mobile = "+mobile
    const sessionQuery = getAllRows("distinct SessionID, IsActive",query,zcql,prependToLog)
    const learningQuery = "Select {} from UserAssessmentLogs left join Users on Users.ROWID = UserAssessmentLogs.UserROWID where Users.Mobile = "+mobile
    const userAssessmentQuery = getAllRows("distinct ROWID, IsAssessmentComplete",learningQuery,zcql,prependToLog)
    const axios = require("axios");
    const gameQuery = axios.get(process.env.WordleReportURL+mobile)

    Promise.all([sessionQuery,userAssessmentQuery,gameQuery])
    .then(([userSessions,userAssessmentLogs,wordleAttempts])=>{
        if(!Array.isArray(userSessions))
          throw new Error(userSessions)
        else if(!Array.isArray(userAssessmentLogs))
          throw new Error(userAssessmentLogs)
        else{
          const sessions = userSessions.filter(
            (data) =>
              !(
                data.UserSessionAttemptReport.SessionID.endsWith("Hint") ||
                data.UserSessionAttemptReport.SessionID.endsWith("Translation") ||
                data.UserSessionAttemptReport.SessionID.endsWith("ObjectiveFeedback") ||
                data.UserSessionAttemptReport.SessionID.startsWith("Onboarding") ||
                data.UserSessionAttemptReport.SessionID.endsWith("Onboarding") ||
                data.UserSessionAttemptReport.SessionID.startsWith("onboarding") ||
                data.UserSessionAttemptReport.SessionID.endsWith("onboarding")
              )
          );
          console.info((new Date()).toString()+"|"+prependToLog,"Fetched Conversation Data. Total Records: ",sessions.length)
          console.info((new Date()).toString()+"|"+prependToLog,"Fetched Learning Data. Total Records: ",userAssessmentLogs.length)
          const wordleAttemptsReport = wordleAttempts.data
          console.info((new Date()).toString()+"|"+prependToLog,"Fetched Game Data. Total Records: ",wordleAttemptsReport.length)        
          var responseObject = {
                "OperationStatus":"SUCCESS"
          }
          if((sessions.length==0)&&(userAssessmentLogs.length==0)&&(wordleAttemptsReport.length==0)){
              responseObject['OperationStatus'] = "NO_SESSION_RECORD"
              responseObject['StatusDescription'] = "No Session Data"
          }
          else{
              const uniqueSession = sessions.map(data=>data.UserSessionAttemptReport.SessionID).filter(unique)
              responseObject['TotalConvesationSessions']=uniqueSession.length
              responseObject['TotalConvesationSessionsCompleted']=sessions.filter(data=>data.UserSessionAttemptReport.IsActive==false).map(data=>data.UserSessionAttemptReport.SessionID).filter(unique).length
              responseObject['TotalLearningSessions']=userAssessmentLogs.length
              responseObject['TotalLearningSessionsCompleted']=userAssessmentLogs.filter(data=>data.UserAssessmentLogs.IsAssessmentComplete==true).length
              responseObject['TotalGameSessions']=wordleAttemptsReport.length
              responseObject['TotalGameSessionsCompleted']=wordleAttemptsReport.filter(data=>data.CompletedWordle=="Yes").length
          }
          console.info((new Date()).toString()+"|"+prependToLog,"End of Execution")
          console.debug((new Date()).toString()+"|"+prependToLog,"End of Execution. Response:",responseObject)
          res.status(200).json(responseObject)  
          //Send Reponse to Glific
          let endTimeStamp = new Date();
          let executionDuration = (endTimeStamp - startTimeStamp) / 1000;
          if (executionDuration > 5) {
            sendResponseToGlific({
              flowID: requestBody["FlowID"],
              contactID: requestBody["contact"]["id"],
              resultJSON: JSON.stringify({
                practices: responseObject,
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
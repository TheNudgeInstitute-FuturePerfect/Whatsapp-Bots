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

app.post("/pendingpractices", (req, res) => {
  let catalystApp = catalyst.initialize(req, { type: catalyst.type.applogic });
  let startTimeStamp = new Date();

  const executionID = Math.random().toString(36).slice(2)
    
  const params = ["getPendingPractices",req.url,executionID,""]
  const prependToLog = params.join(" | ")
  
  console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")

  const requestBody = req.body;

  var mobile = requestBody["Mobile"];
  if (typeof mobile === "undefined") {
    const response = {
      OperationStatus: "REQ_ERR",
      StatusDescription: "Missing required parameter - Mobile",
    };
    console.info((new Date()).toString()+"|"+prependToLog,"End of Execution : ", response);
    res.status(200).json(response);
  } 
  else {
    var responseObject = {
      OperationStatus: "SUCCESS",
    };
    mobile = mobile.slice(-10);
    let zcql = catalystApp.zcql();
    zcql
      .executeZCQLQuery(
        "Select distinct ROWID, RegisteredTime from Users where IsActive=true and Mobile = '" +
          mobile +
          "'"
      )
      .then((users) => {
        if (users.length == 0) {
          responseObject["OperationStatus"] = "USR_NT_FND";
          responseObject["StatusDescription"] =
            "User could not be found or is inactive";
          console.info((new Date()).toString()+"|"+prependToLog,"End of Execution: ", responseObject);
          res.status(200).json(responseObject);
        } 
        else {
          const today = new Date();

          let query = "Select {} from Sessions where Mobile = "+mobile+" group by Sessions.SessionID, Sessions.IsActive"
          const sessionQuery = getAllRows("Sessions.SessionID, Sessions.IsActive, max(Sessions.CREATEDTIME)",query,zcql,prependToLog)
          const learningQuery = "Select {} from UserAssessmentLogs left join Users on Users.ROWID = UserAssessmentLogs.UserROWID where UserAssessmentLogs.IsAssessmentComplete = true and Users.Mobile = "+mobile
          const userAssessmentQuery = getAllRows("distinct ROWID, MODIFIEDTIME",learningQuery,zcql,prependToLog)
          const axios = require("axios");
          const gameQuery = axios.get(process.env.WordleReportURL+mobile)
          const userReportQuery = getAllRows("LastActiveDate, DeadlineDate","select {} from UsersReport where Mobile = "+mobile,zcql,prependToLog)
          const learningStartQuery = "Select {} from SessionEvents where Event = 'Learn Session Start' and Mobile = "+mobile
          const runLearningStartQuery = getAllRows("distinct ROWID",learningStartQuery,zcql,prependToLog)
    
          
          Promise.all([sessionQuery,userAssessmentQuery,gameQuery,userReportQuery,runLearningStartQuery])
          .then(([userSessions,userAssessmentLogs,wordleAttempts,userReport,learningStart])=>{
              if(!Array.isArray(userSessions))
                throw new Error(userSessions)
              else if(!Array.isArray(userAssessmentLogs))
                throw new Error(userAssessmentLogs)
              else if(!Array.isArray(userReport))
                throw new Error(userReport)
              else if(!Array.isArray(learningStart))
                throw new Error(learningStart)
              else{
                const wordleAttemptsReport = wordleAttempts.data
                const openSessions = userSessions.filter(data=>data.Sessions.IsActive==true).map(data=>data.Sessions.SessionID)
                const sessions = userSessions.filter(data=>openSessions.includes(data.Sessions.SessionID)==false).filter(
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
                let practiceDates = sessions.map(data=>data.Sessions.CREATEDTIME)
                responseObject["ConversationCompletionDays"] = practiceDates.map(data=>data.toString().slice(0,10)).filter(unique).length
                responseObject["ConversationAttemptDays"] = userSessions.map(data=>data.Sessions.CREATEDTIME.toString().slice(0,10)).filter(unique).length
                console.info((new Date()).toString()+"|"+prependToLog,"Fetched Conversation TimeStamps:",practiceDates)
                responseObject["LearningAttemptDays"] = learningStart.map(data=>data.SessionEvents.CREATEDTIME.toString().slice(0,10)).filter(unique).length
                responseObject["LearningCompletionDays"] = userAssessmentLogs.map(data=>data.UserAssessmentLogs.MODIFIEDTIME.toString().slice(0,10)).filter(unique).length
                practiceDates =  practiceDates.concat(userAssessmentLogs.map(data=>data.UserAssessmentLogs.MODIFIEDTIME))
                console.info((new Date()).toString()+"|"+prependToLog,"Fetched Learning TimeStamps:",practiceDates)
                responseObject["GameCompletionDays"] = wordleAttemptsReport.filter(data=>data.CompletedWordle=="Yes").map(data=>data.SessionEndTime.toString().slice(0,10)).filter(unique).length
                responseObject["GameAttemptDays"] = wordleAttemptsReport.map(data=>data.SessionEndTime.toString().slice(0,10)).filter(unique).length
                practiceDates =  practiceDates.concat(wordleAttemptsReport.filter(data=>data.CompletedWordle=="Yes").map(data=>data.SessionEndTime))
                console.info((new Date()).toString()+"|"+prependToLog,"Fetched Game TimeStamps:",practiceDates)

                if(userReport.length > 0)
                  responseObject["DeadlineDate"] = userReport[0]['UsersReport']['DeadlineDate'].toString().slice(0,10)
                else{
                  let regDate = new Date(users[0]['Users']['RegisteredTime'])
                  regDate.setDate(regDate.getDate()+parseInt(process.env.Period))
                  responseObject["DeadlineDate"] = regDate.getFullYear()+"-"+('0'+(regDate.getMonth()+1)).slice(-2)+"-"+('0'+regDate.getDate()).slice(-2)
                }      
                if (practiceDates == null) {
                  responseObject["StatusDescription"] = "User has not started any conversation";
                  responseObject["PendingPracticeCount"] = process.env.MinDays;
                  responseObject["PendingPracticeDays"] = process.env.Period;
                  console.info((new Date()).toString()+"|"+prependToLog,"End of Execution: ", responseObject);
                  res.status(200).json(responseObject);
                } 
                else if (practiceDates.length == 0) {
                  responseObject["StatusDescription"] = "User has not started any conversation";
                  responseObject["PendingPracticeCount"] = process.env.MinDays;
                  responseObject["PendingPracticeDays"] = process.env.Period;
                  console.info((new Date()).toString()+"|"+prependToLog,"End of Execution: ", responseObject);
                  res.status(200).json(responseObject);
                } 
                else {
                  let startingDate = new Date(responseObject["DeadlineDate"]+" 00:00:00")//new Date(userReport.length > 0?userReport[0]['UsersReport']['DeadlineDate'].toString().slice(0,10):users[0]['Users']['RegisteredTime'])
                  startingDate.setDate(startingDate.getDate()-parseInt(process.env.Period))
                  const daysSinceStart = Math.floor((today - startingDate)/1000/60/60/24)
                  
                  //Get all practice dates on and after starting date
                  var uniqueDates = practiceDates.filter(data=>(new Date(data))>=startingDate).map((data) =>data.toString().slice(0, 10)).filter(unique).sort();
                  responseObject["CompletedPracticeCount"] = uniqueDates.length;
                  responseObject["CompletedPracticePeriod"] = daysSinceStart;
                  responseObject["PendingPracticeCount"] = Math.max(0,process.env.MinDays - uniqueDates.length);
                  responseObject["PendingPracticeDays"] = Math.max(0,process.env.Period - daysSinceStart);
                  
                  if (daysSinceStart >= process.env.Period) {
                    responseObject["OperationStatus"] = "SSN_ABV_PERIOD";
                    responseObject["StatusDescription"] =
                      "User registered " + daysSinceStart + " days ago";
                    console.info((new Date()).toString()+"|"+prependToLog,"End of Execution: ", responseObject);
                    res.status(200).json(responseObject);
                  } 
                  else {
                    if (uniqueDates.length >= process.env.MinDays) {
                      responseObject["OperationStatus"] = "MIN_SSN_RCHD";
                      responseObject["StatusDescription"] =
                        "User has completed the required days of practice";
                      console.info((new Date()).toString()+"|"+prependToLog,
                        "End of Execution: ",
                        responseObject,
                        "\nTotal Days Practices = ",
                        uniqueDates.length
                      );
                      res.status(200).json(responseObject);
                    } 
                    else {
                      console.info((new Date()).toString()+"|"+prependToLog,"End of Execution: ", responseObject);
                      res.status(200).json(responseObject);
                    }
                    let endTimeStamp = new Date();
                    let executionDuration = (endTimeStamp - startTimeStamp) / 1000;
                    if (executionDuration > 3) {
                      if((typeof requestBody["FlowID"] !== 'undefined')&&(typeof requestBody["contact"] !== 'undefined'))
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
                }
              }
            })
            .catch((err) => {
              responseObject["OperationStatus"] = "ZCQL_ERR";
              responseObject["StatusDescription"] =
                "Error in executing Sessions query";
              console.info((new Date()).toString()+"|"+prependToLog,
                "End of Execution: ",
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
        responseObject["StatusDescription"] = "Error in Users executing query";
        console.info((new Date()).toString()+"|"+prependToLog,"End of Execution: ", responseObject, "\nError:", err);
        res.status(200).json(responseObject);
      });
  }
});

app.all("/", (req, res) => {
  res.status(403).send("Resource not found.");
});

module.exports = app;

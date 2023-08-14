"use strict";

const express = require("express");
// const catalyst = require('zcatalyst-sdk-node');
const catalyst = require("zoho-catalyst-sdk");
const emojiRegex = require("emoji-regex");
const sendResponseToGlific = require("./common/sendResponseToGlific.js");
// const app = express();
// app.use(express.json());
const app = express.Router();

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
//Filter unique elements in an array
const unique = (value, index, self) => {
  return self.indexOf(value) === index;
};

app.post("/getperformancereport", (req, res) => {
  let catalystApp = catalyst.initialize(req, { type: catalyst.type.applogic });

  const executionID = Math.random().toString(36).slice(2)
    
  //Prepare text to prepend with logs
  const params = ["StudentCRUD",req.url,executionID,""]
  const prependToLog = params.join(" | ")
  
  console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")
  
  const requestBody = req.body;
  const sessionId = requestBody["sessionId"];
  console.info((new Date()).toString()+"|"+prependToLog,"requestBody['SessionID']" + requestBody["sessionId"]);
  console.info((new Date()).toString()+"|"+prependToLog,"sessionId" + sessionId);
  var responseObject = {
    OperationStatus: "SUCCESS",
  };
  if (typeof requestBody["SessionROWID"] === "undefined") {
    responseObject["OperationStatus"] = "REQ_ERR";
    responseObject["StatusDescription"] =
      "Missing mandatory field - SessionROWID";
    console.info((new Date()).toString()+"|"+prependToLog,"End of Execution: ", responseObject);
    res.status("200").json(responseObject);
  } else {
    const timer = (sleepTime) => {
      return new Promise(async (resolve, reject) => {
        console.info((new Date()).toString()+"|"+prependToLog,"Wait for " + sleepTime);
        setTimeout(resolve, sleepTime);
      });
    };

    //Get table meta object without details.
    let zcql = catalystApp.zcql();
    //zcql.executeZCQLQuery("Select PerformanceReportURL from Sessions where ROWID = "+requestBody['SessionROWID'])
    let query =
      "Select ROWID, Message from Sessions where MessageType = 'UserMessage' and SessionID = '" +
      sessionId +
      "' order by CREATEDTIME DESC";
    console.info((new Date()).toString()+"|"+prependToLog,query);
    zcql
      .executeZCQLQuery(query)
      .then((row) => {
        console.info((new Date()).toString()+"|"+prependToLog,row);
        if (row == null) {
          responseObject["OperationStatus"] = "NO_DATA";
          responseObject["StatusDescription"] =
            "No record found with ID " + requestBody["SessionROWID"];
          console.info((new Date()).toString()+"|"+prependToLog,"End of Execution: ", responseObject);
          res.status("200").json(responseObject);
        } else if (row.length == 0) {
          responseObject["OperationStatus"] = "NO_DATA";
          responseObject["StatusDescription"] =
            "No record found with ID " + requestBody["SessionROWID"];
          console.info((new Date()).toString()+"|"+prependToLog,"End of Execution: ", responseObject);
          res.status("200").json(responseObject);
        } else {
          /*else if(row[0]['Sessions']['PerformanceReportURL'] == null){
			 	responseObject['OperationStatus'] = 'NO_RPRT'
			 	responseObject['StatusDescription'] = 'No performance report found for ID '+ requestBody['SessionROWID']
			 	console.info((new Date()).toString()+"|"+prependToLog,"End of Execution: ",responseObject)
			 	res.status("200").json(responseObject)
			}*/
          console.info((new Date()).toString()+"|"+prependToLog,"in condition " + row.length);
          const allMessages = row
            .map((message) => decodeURIComponent(message.Sessions.Message))
            .join(" ");
          const emojiRegEx = emojiRegex();
          const allWords = allMessages.replace(emojiRegEx, "").split(" ");
          const totalWords = allWords.length; // - 7 if auto generated msg - I want to talk about topic name
          console.info((new Date()).toString()+"|"+prependToLog,totalWords);
          responseObject["wordcount"] = totalWords;
          responseObject["PerformanceReportType"] = "Text";

          let writeTextOnImage = require("./common/writeTextOnImage.js");
          writeTextOnImage({
            sessionROWID: row[0]["Sessions"]["ROWID"],
            textmap: JSON.stringify([
              {
                text: requestBody["topic"],
                x: 402,
                y: 507,
              },
              {
                text: totalWords,
                x: 455,
                y: 766,
              },
            ]),
            filename: "probabilisticbot/" + row[0]["Sessions"]["ROWID"],
            templateurl: process.env.PerfReportTemplate,
          })
            .then(async (perfReport) => {
              const performanceReport = JSON.parse(perfReport);
              if (performanceReport["OperationStatus"] == "SUCCESS") {
                responseObject["PerformanceReportType"] = "Image";
                responseObject["PerformanceReport"] =
                  performanceReport["PublicURL"];
              }
              await timer(5000);
              console.info((new Date()).toString()+"|"+prependToLog,"End of Execution: ", responseObject);
              res.status("200").json(responseObject);
              sendResponseToGlific({
                flowID: requestBody["FlowID"],
                contactID: requestBody["contact"]["id"],
                resultJSON: JSON.stringify({
                  perfreport: responseObject,
                }),
              })
                .then((glificResponse) => {})
                .catch((err) =>
                  console.info((new Date()).toString()+"|"+prependToLog,"Error returned from Glific: ", err)
                );
            })
            .catch((err) => {
              console.info((new Date()).toString()+"|"+prependToLog,err);
              res.status(500).send(err);
            });
        }
      })
      .catch((err) => {
        console.info((new Date()).toString()+"|"+prependToLog,err);
        res.status(500).send(err);
      });
  }
});

app.post("/getoverallperformancereport", (req, res) => {
  let catalystApp = catalyst.initialize(req, { type: catalyst.type.applogic });

  const executionID = Math.random().toString(36).slice(2)
    
  //Prepare text to prepend with logs
  const params = ["StudentCRUD",req.url,executionID,""]
  const prependToLog = params.join(" | ")
  
  console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")
  
  const requestBody = req.body;

  let mobile = requestBody["Mobile"];

  var responseObject = {
    OperationStatus: "SUCCESS",
  };
  if (typeof mobile === "undefined") {
    responseObject["OperationStatus"] = "REQ_ERR";
    responseObject["StatusDescription"] = "Missing mandatory field - Mobile";
    console.info((new Date()).toString()+"|"+prependToLog,"End of Execution: ", responseObject);
    res.status("200").json(responseObject);
  } else {
    mobile = mobile.toString().slice(-10);
    let zcql = catalystApp.zcql();
    let query =
      "Select {} " +
      "from Sessions " +
      "left join SystemPrompts on Sessions.SystemPromptsROWID = SystemPrompts.ROWID " +
      "where Mobile = " +
      mobile +
      " and SystemPrompts.Type = 'Topic Prompt' and Sessions.MessageType = 'UserMessage' ";
    ("order by Sessions.CREATEDTIME desc");
    zcql
      .executeZCQLQuery(query.replace("{}", "count(ROWID)"))
      .then((maxRowsResult) => {
        let maxRows = parseInt(maxRowsResult[0].Sessions.ROWID);
        console.info((new Date()).toString()+"|"+prependToLog,"Total Session Records: " + maxRows);
        if (maxRows > 0) {
          const recordsToFetch = 300;
          const startingRow = 1;
          const getAllRows = (fields) => {
            return new Promise(async (resolve) => {
              var jsonReport = [];
              const dataQuery = query.replace("{}", fields);
              for (var i = startingRow; i <= maxRows; i = i + recordsToFetch) {
                query = dataQuery + " LIMIT " + i + ", " + recordsToFetch;
                console.info((new Date()).toString()+"|"+prependToLog,
                  "Fetching records from " +
                    i +
                    " to " +
                    (i + recordsToFetch - 1) +
                    "\nQuery: " +
                    query
                );
                const queryResult = await zcql.executeZCQLQuery(query);
                jsonReport = jsonReport.concat(queryResult);
              }
              resolve(jsonReport);
            });
          };
          getAllRows(
            "Sessions.SessionID, Sessions.CREATEDTIME, Sessions.SystemPromptsROWID, SystemPrompts.Name, Sessions.Message, Sessions.MessageType"
          )
            .then((sessions) => {
              var report = [];
              //Filter unique elements in an array
              const unique = (value, index, self) => {
                return self.indexOf(value) === index;
              };
              const emojiRegEx = emojiRegex();
              const userSessionsWC = sessions.map((data) => {
                var temp = data;
                var msg = decodeURIComponent(
                  data["Sessions"]["Message"]
                ).replace(emojiRegEx, "");
                temp["Sessions"]["TotalWords"] =
                  data["Sessions"]["MessageType"] == "UserMessage"
                    ? msg.split(" ").length
                    : 0;
                return temp;
              });
              const userSessionsTopics = sessions.map(
                (data) => data.SystemPrompts.Name
              );
              const uniqueTopics = userSessionsTopics.filter(unique);
              var totalSessions = 0;
              for (var j = 0; j < uniqueTopics.length; j++) {
                var userReport = {};
                userReport["Topic"] = uniqueTopics[j];
                const topicSessionsData = sessions.filter(
                  (data) => data.SystemPrompts.Name == userReport["Topic"]
                );
                const topicSessions = topicSessionsData.map(
                  (data) => data.Sessions.SessionID
                );
                const uniqueTopicSessions = topicSessions.filter(unique);
                userReport["TotalAttempts"] =
                  uniqueTopicSessions.length.toString();
                totalSessions =
                  totalSessions + parseInt(userReport["TotalAttempts"]);
                var topicWC = uniqueTopicSessions.map((data) => {
                  const sessionWCs = topicSessionsData.map((record) =>
                    record.Sessions.SessionID == data
                      ? record.Sessions.TotalWords
                      : 0
                  );
                  return sessionWCs.reduce((a, b) => a + b, 0);
                });
                console.info((new Date()).toString()+"|"+prependToLog,"topicWC", topicWC);
                userReport["MinWordCount"] = Math.min(...topicWC).toString();
                userReport["MaxWordCount"] = Math.max(...topicWC).toString();
                userReport["TotalWordCount"] = topicWC.reduce(
                  (a, b) => a + b,
                  0
                );
                userReport["AvgWordCount"] =
                  userReport["TotalWordCount"] / topicWC.length;
                const sessionDates = topicSessionsData.map(
                  (data) => data.Sessions.CREATEDTIME
                );
                const uniqueDates = sessionDates.filter(unique);
                const lastActiveDate = uniqueDates.sort().pop();
                const latestSessionData = topicSessionsData.filter(
                  (data) => data.Sessions.CREATEDTIME == lastActiveDate
                );
                const latestSessionID =
                  latestSessionData[0]["Sessions"]["SessionID"];
                console.info((new Date()).toString()+"|"+prependToLog,"Latest Session ID: ", latestSessionID);
                const latestSessionIDWCs = topicSessionsData.map((data) =>
                  data.Sessions.SessionID == latestSessionID
                    ? data.Sessions.TotalWords
                    : 0
                );
                console.info((new Date()).toString()+"|"+prependToLog,"latestSessionIDWCs:", latestSessionIDWCs);
                userReport["LastAttemptWordCount"] = latestSessionIDWCs
                  .reduce((a, b) => a + b, 0)
                  .toString();
                report.push(userReport);
              }
              responseObject["TopicWiseReport"] = report.sort((a, b) => {
                if (a.AvgWordCount < b.AvgWordCount) {
                  return 1;
                }
                if (a.AvgWordCount > b.AvgWordCount) {
                  return -1;
                }
                return 0;
              });
              responseObject["TotalSessions"] = totalSessions;
              responseObject["TotalTopics"] = uniqueTopics.length;
              res.status(200).json(responseObject);
            })
            .catch((err) => {
              console.info((new Date()).toString()+"|"+prependToLog,err);
              res.status(500).send(err);
            });
        } else {
          responseObject["OperationStatus"] = "NO_DATA";
          responseObject["StatusDescription"] = "No Session Record found";
          console.info((new Date()).toString()+"|"+prependToLog,"End of Execution: ", responseObject);
          res.status("200").json(responseObject);
        }
      })
      .catch((err) => {
        console.info((new Date()).toString()+"|"+prependToLog,err);
        res.status(500).send(err);
      });
  }
});

app.post("/goalachievementcalendar", (req, res) => {
  let catalystApp = catalyst.initialize(req, { type: catalyst.type.applogic });

  const executionID = Math.random().toString(36).slice(2)
    
  //Prepare text to prepend with logs
  const params = ["StudentCRUD",req.url,executionID,""]
  const prependToLog = params.join(" | ")
  
  console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")
  
  const requestBody = req.body;

  let mobile = requestBody["Mobile"];

  var responseObject = {
    OperationStatus: "SUCCESS",
  };
  if (typeof mobile === "undefined") {
    responseObject["OperationStatus"] = "REQ_ERR";
    responseObject["StatusDescription"] = "Missing mandatory field - Mobile";
    console.info((new Date()).toString()+"|"+prependToLog,"End of Execution: ", responseObject);
    res.status("200").json(responseObject);
  } else {
    mobile = mobile.toString().slice(-10);
    
    let zcql = catalystApp.zcql();
    //get the user's goal 
    let query = "Select {} from Users where Mobile = "+mobile
    getAllRows("ROWID, RegisteredTime, GoalInMinutes",query,zcql,prependToLog)
    .then((users)=>{
      if(!Array.isArray(users))
        throw new Error(users)
      else{
      
        const goal = users[0]['Users']['GoalInMinutes']
        console.info((new Date()).toString()+"|"+prependToLog,"User's Goal:",goal)

        if(goal == null){
          responseObject['OperationStatus']="NO_GOAL"
          responseObject['StatusDescription']="No goal set by user"
          res.status(200).json(responseObject);
        }
        else{
          //Get the session data for the current month
          //Get the month date range
          const currentTimeStamp = new Date();
          const monthStart = currentTimeStamp.getFullYear()+"-"+('0'+(currentTimeStamp.getMonth()+1)).slice(-2)+"-01 00:00:00"
          let nextMonthTimeStamp = new Date();
          //Shift to next month
          nextMonthTimeStamp.setMonth(nextMonthTimeStamp.getMonth()+1)
          const nextMonthStartDate = nextMonthTimeStamp.getFullYear()+"-"+('0'+(nextMonthTimeStamp.getMonth()+1)).slice(-2)+"-01 00:00:00"

          const sessionQuery =
            "Select {} " +
            "from Sessions " +
            "where Mobile = " +mobile+
            " and Sessions.CREATEDTIME>='"+monthStart+"' and Sessions.CREATEDTIME<'"+nextMonthStartDate+"' "+
            "group by Sessions.SessionID, Sessions.IsActive";
          const runSessionQuery = getAllRows("Sessions.SessionID, Sessions.IsActive, max(Sessions.CREATEDTIME)",sessionQuery,zcql,prependToLog)
          const assessmentQuery = "Select {} " +
            "from UserAssessmentLogs " +
            "where UserAssessmentLogs.UserROWID = '" +users[0]['Users']['ROWID']+"'"+
            " and UserAssessmentLogs.IsAssessmentComplete = true"
          const runAssessmentQuery = getAllRows("UserAssessmentLogs.ROWID, UserAssessmentLogs.MODIFIEDTIME",assessmentQuery,zcql,prependToLog)
          const axios = require("axios");
          const runGameAttemptQuery = axios.get(process.env.WordleReportURL+mobile)          
          
          Promise.all([runSessionQuery,runAssessmentQuery,runGameAttemptQuery])
          .then(([allsessions,userassessment,wordleAttempts]) => {
            if(!Array.isArray(allsessions))
              throw new Error(allsessions) 
            else if(!Array.isArray(userassessment))
              throw new Error(userassessment)
            else{
              const openSessions = allsessions.filter(data=>data.Sessions.IsActive==true).map(data=>data.Sessions.SessionID)
              const sessions = allsessions.filter(data=>openSessions.includes(data.Sessions.SessionID)==false).filter(
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
              console.info((new Date()).toString()+"|"+prependToLog,"Fetched Conversation TimeStamps:",practiceDates)                
              practiceDates =  practiceDates.concat(userassessment.map(data=>data.UserAssessmentLogs.MODIFIEDTIME))
              console.info((new Date()).toString()+"|"+prependToLog,"Fetched Learning TimeStamps:",practiceDates)
              practiceDates = practiceDates.concat(wordleAttempts.data.map(data=>data.SessionEndTime))
              console.info((new Date()).toString()+"|"+prependToLog,"Fetched Wordle TimeStamps:",practiceDates)

              practiceDates.sort()
                
              //For each day in current month
              //const dayMapper = [ '🅼',  '🆃',  '🆆',  '🆃',  '🅵',  '🆂',  '🆂']
              let report = [] //[dayMapper.join("  ")]
              let dateOfMonth = new Date(practiceDates[0].toString().slice(0,10))
              let reportRecord = ['🔲','🔲','🔲','🔲','🔲','🔲','🔲']
              const toDay = currentTimeStamp.getFullYear()+"-"+('0'+(currentTimeStamp.getMonth()+1)).slice(-2)+"-"+('0'+currentTimeStamp.getDate()).slice(-2)
              const dateToday = new Date(toDay+" 00:00:00")
              let calendarEndDate = new Date()
              calendarEndDate.setDate(calendarEndDate.getDate()+((7-calendarEndDate.getDay())%7))
              while(true){
                
                const dayOfWeek = (dateOfMonth.getDay()+6)%7
                
                const day = dateOfMonth.getFullYear()+"-"+('0'+(dateOfMonth.getMonth()+1)).slice(-2)+"-"+('0'+dateOfMonth.getDate()).slice(-2)

                //Get all the Session data created on the date
                const dateSessions = practiceDates.filter(data=>(data>=(day+" 00:00:00"))&&(data<=(day+" 23:59:59")))

                //If no session data found, add emoji and continue
                if(dateSessions.length==0){
                  if((dateOfMonth>=(new Date(users[0]['Users']['RegisteredTime'].toString().slice(0,10))))&&(dateOfMonth<=currentTimeStamp))
                    reportRecord[dayOfWeek]="🟧"
                }
                else{
                    reportRecord[dayOfWeek]="✅" 
                }
                if(dateOfMonth.getDate() == dateToday.getDate()){
                  //Get total sessions completed today
                  const todaysSessionCount = sessions.filter(data=>data.Sessions.CREATEDTIME.toString().slice(0,10)==toDay).map(data=>data.Sessions.SessionID).filter(unique).length
                  //Whether more than one conversation session has been completed
                  //responseObject['MultipleConversationToday']=todaysSessionCount>1
                  //Get total assessments completed today
                  const todaysAssessmentCount = userassessment.filter(data=>data.UserAssessmentLogs.MODIFIEDTIME.toString().slice(0,10)==toDay).map(data=>data.UserAssessmentLogs.ROWID).filter(unique).length
                  //Whether more than one assessment has been completed
                  //responseObject['MultipleLearningToday']=todaysAssessmentCount>1
                  //Get total games completed today
                  const todaysGameCount = wordleAttempts.data.filter(data=>data.SessionEndTime.toString().slice(0,10)==toDay).map(data=>data.WordleROWID).filter(unique).length
                  //Whether more than one conversation session has been completed
                  //responseObject['MultipleGameToday']=todaysGameCount>1
                  responseObject['MultipleAttempts'] = (todaysSessionCount+todaysAssessmentCount+todaysGameCount)>1
                }

                //get next date of month for processing
                dateOfMonth.setDate(dateOfMonth.getDate()+1)
                //if it's next month start date or calendar end date, push the data to report and exit
                if((dateOfMonth>=(new Date(nextMonthStartDate)))||(dateOfMonth>calendarEndDate)){
                  report.push(reportRecord.join(""))
                  break
                }

                //If it's last day of week, push the data to report
                if(dayOfWeek==6){
                  report.push(reportRecord.join(""))
                  //Reset variable for next week's data
                  reportRecord = ['🔲','🔲','🔲','🔲','🔲','🔲','🔲']
                }
              }
              responseObject['Report']=report.join("\n")
              console.info((new Date()).toString()+"|"+prependToLog,"End of Execution:",responseObject)
              res.status(200).json(responseObject);
            }
          })
          .catch((err) => {
            console.info((new Date()).toString()+"|"+prependToLog,"End of Execution:",err);
            console.error((new Date()).toString()+"|"+prependToLog,err);
            res.status(500).send(err);
          });
        }
      }
    })
    .catch((err) => {
      console.info((new Date()).toString()+"|"+prependToLog,"End of Execution:",err);
      console.error((new Date()).toString()+"|"+prependToLog,err);
      res.status(500).send(err);
    });
  }
});

app.post("/dailygoalprogress", (req, res) => {
  let catalystApp = catalyst.initialize(req, { type: catalyst.type.applogic });

  const executionID = Math.random().toString(36).slice(2)
    
  //Prepare text to prepend with logs
  const params = ["StudentCRUD",req.url,executionID,""]
  const prependToLog = params.join(" | ")
  
  console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")
  
  const requestBody = req.body;

  let mobile = requestBody["Mobile"];

  var responseObject = {
    OperationStatus: "SUCCESS",
  };
  if (typeof mobile === "undefined") {
    responseObject["OperationStatus"] = "REQ_ERR";
    responseObject["StatusDescription"] = "Missing mandatory field - Mobile";
    console.info((new Date()).toString()+"|"+prependToLog,"End of Execution: ", responseObject);
    res.status("200").json(responseObject);
  } else {
    mobile = mobile.toString().slice(-10);
    
    let zcql = catalystApp.zcql();
    //get the user's goal 
    let query = "Select {} from Users where Mobile = "+mobile
    getAllRows("ROWID, GoalInMinutes",query,zcql,prependToLog)
    .then((users)=>{
      if(!Array.isArray(users))
        throw new Error(users)
      else{
      
        const goal = users[0]['Users']['GoalInMinutes']

        console.info((new Date()).toString()+"|"+prependToLog,"Goal of User :",goal)

        if(goal == null){
          responseObject['OperationStatus']="NO_GOAL"
          responseObject['StatusDescription']="No goal set by user"
          console.info((new Date()).toString()+"|"+prependToLog,"End of Execution: ", responseObject);
          res.status(200).json(responseObject);
        }
        else{
          //Get the session data for the current month
          //Get the month date range
          const currentTimeStamp = new Date();
          const toDay = currentTimeStamp.getFullYear()+"-"+('0'+(currentTimeStamp.getMonth()+1)).slice(-2)+"-"+('0'+currentTimeStamp.getDate()).slice(-2)
          
          query =
            "Select {} " +
            "from Sessions " +
            "where Mobile = " +mobile+
            " and Sessions.CREATEDTIME>='"+toDay+" 00:00:00' and Sessions.CREATEDTIME<='"+toDay+" 23:59:59'"+
            " and Sessions.MessageType = 'UserMessage' "+
            "order by Sessions.CREATEDTIME ASC";
          const runSessionQuery = getAllRows("Sessions.SessionID, Sessions.CREATEDTIME",query,zcql,prependToLog)
          const assessmentQuery = "Select {} " +
              "from UserAssessment " +
              "left join UserAssessmentLogs on UserAssessment.UserAssessmentLogROWID = UserAssessmentLogs.ROWID " +
              "where UserAssessmentLogs.UserROWID = '" +users[0]['Users']['ROWID']+"' "+
              " and UserAssessment.CREATEDTIME>='"+toDay+" 00:00:00' and UserAssessment.CREATEDTIME<='"+toDay+" 23:59:59'"+
              " order by UserAssessment.CREATEDTIME ASC";
          const runAssessmentQuery = getAllRows("UserAssessment.CREATEDTIME",assessmentQuery,zcql,prependToLog)
          const gameAttemptQuery = "Select {} " +
                  "from WordleAttempts " +
                  "where WordleAttempts.UserROWID = '" +users[0]['Users']['ROWID']+"' "+
                  " and WordleAttempts.CREATEDTIME>='"+toDay+" 00:00:00' and WordleAttempts.CREATEDTIME<='"+toDay+" 23:59:59'"+
                  " order by WordleAttempts.CREATEDTIME ASC";
          const runGameAttemptQuery = getAllRows("WordleAttempts.CREATEDTIME",gameAttemptQuery,zcql,prependToLog)

          Promise.all([runSessionQuery,runAssessmentQuery,runGameAttemptQuery])
          .then(([allsessions,userassessment,wordleAttempts]) => {
            if(!Array.isArray(allsessions))
              throw new Error(allsessions)
            else if(!Array.isArray(userassessment))
              throw new Error(userassessment)
            if(!Array.isArray(wordleAttempts))
              throw new Error(wordleAttempts)
            else{
              const sessions = allsessions.filter(
                (data) =>
                  !(
                    //data.Sessions.SessionID.endsWith("Hint") ||
                    //data.Sessions.SessionID.endsWith("Translation") ||
                    data.Sessions.SessionID.endsWith("ObjectiveFeedback") ||
                    data.Sessions.SessionID.startsWith("Onboarding") ||
                    data.Sessions.SessionID.endsWith("Onboarding") ||
                    data.Sessions.SessionID.startsWith("onboarding") ||
                    data.Sessions.SessionID.endsWith("onboarding")
                  )
              );
              let practiceDates = sessions.map(data=>data.Sessions.CREATEDTIME)
              console.info((new Date()).toString()+"|"+prependToLog,"Got Conversation Data:",practiceDates)
              practiceDates = practiceDates.concat(userassessment.map(data=>data.UserAssessment.CREATEDTIME))
              console.info((new Date()).toString()+"|"+prependToLog,"Got Learning Data:",practiceDates)
              practiceDates = practiceDates.concat(wordleAttempts.map(data=>data.WordleAttempts.CREATEDTIME))
              console.info((new Date()).toString()+"|"+prependToLog,"Got Wordle Data:",practiceDates)

              practiceDates.sort()
                              
              const dateSessionDurations = practiceDates.map((data,i)=>{
                if(i<(practiceDates.length-1)){
                  const duration = (new Date(practiceDates[i+1]) - new Date(data))/1000/60
                  if(duration>10)
                    return 0
                  else 
                    return duration
                }
                else
                  return 0
              })
              const totalDuration=dateSessionDurations.length == 0 ? 0 : Math.round(dateSessionDurations.reduce((a,b)=>a=a+b))
              console.info((new Date()).toString()+"|"+prependToLog,"Total Duration:",totalDuration)
              const pctCompletion = totalDuration/goal
              console.info((new Date()).toString()+"|"+prependToLog,"Percentage Completion:",pctCompletion)
              responseObject['OperationStatus']=totalDuration>=goal ? "GOAL_RCHD" : "GOAL_NT_RCHD"
              responseObject['Report'] = "➡️"
              for(var i=1; i<=5;i++){
                if(pctCompletion >= (i/5))
                  responseObject['Report'] += "🌕"
                else
                  responseObject['Report'] += "🌑"
              }
              responseObject['PendingDuration'] = Math.max(0,Math.round(goal-totalDuration))
              responseObject['CompletedDuration'] = totalDuration
              console.info((new Date()).toString()+"|"+prependToLog,"End of Execution: ", responseObject);
              res.status(200).json(responseObject);
            }
          })
          .catch((err) => {
            console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error:",err);
            console.error((new Date()).toString()+"|"+prependToLog,err);
            res.status(500).send(err);
          });
        }
      }
    })
    .catch((err) => {
      console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error:",err);
      console.error((new Date()).toString()+"|"+prependToLog,err);
      res.status(500).send(err);
    });
  }
});

app.all("/", (req, res) => {
  res.status(200).send("I am Live and Ready.");
});

module.exports = app;

"use strict";

const express = require("express");
// const catalyst = require('zcatalyst-sdk-node');
//const catalyst = require("zoho-catalyst-sdk");
const emojiRegex = require("emoji-regex");
const sendResponseToGlific = require("./common/sendResponseToGlific.js");
const Sessions = require("./models/Sessions.js");
const SystemPrompts = require("./models/SystemPrompts.js");
const User = require("./models/Users.js");
const UserAssessment = require("./models/UserAssessment.js");
const UserAssessmentLog = require("./models/UserAssessmentLogs.js");
const WordleAttempt = require("./models/WordleAttempts.js");
const userFlowQuestionLogs = require("./models/userFlowQuestionLogs.js");
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


app.post("/getperformancereport", (req, res) => {
  //let catalystApp = catalyst.initialize(req, { type: catalyst.type.applogic });

  const executionID = Math.random().toString(36).slice(2)
    
  //Prepare text to prepend with logs
  const params = ["getPerformanceReport",req.url,executionID,""]
  const prependToLog = params.join(" | ")
  
  console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")
  
  const requestBody = req.body;
  const sessionId = requestBody["sessionId"];
  console.info((new Date()).toString()+"|"+prependToLog,"requestBody['SessionID']" + requestBody["sessionId"]);
  console.info((new Date()).toString()+"|"+prependToLog,"sessionId" + sessionId);
  var responseObject = {
    OperationStatus: "SUCCESS",
  };
  if(1==2){ // (typeof requestBody["SessionROWID"] === "undefined") {
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
    // let zcql = catalystApp.zcql();
    // //zcql.executeZCQLQuery("Select PerformanceReportURL from Sessions where ROWID = "+requestBody['SessionROWID'])
    // let query =
    //   "Select ROWID, Message from Sessions where MessageType = 'UserMessage' and SessionID = '" +
    //   sessionId +
    //   "' order by CREATEDTIME DESC";
    // console.info((new Date()).toString()+"|"+prependToLog,query);
    // zcql
    //   .executeZCQLQuery(query)
    Sessions.find({
      MessageType: 'UserMessage',
      SessionID: sessionId
    })
      .then((row) => {
        console.info((new Date()).toString()+"|"+prependToLog,row);
        if (row == null) {
          responseObject["OperationStatus"] = "NO_DATA";
          responseObject["StatusDescription"] =
            "No record found with ID " + sessionId//requestBody["SessionROWID"];
          console.info((new Date()).toString()+"|"+prependToLog,"End of Execution: ", responseObject);
          res.status("200").json(responseObject);
        } else if (row.length == 0) {
          responseObject["OperationStatus"] = "NO_DATA";
          responseObject["StatusDescription"] =
            "No record found with ID " + sessionId //requestBody["SessionROWID"];
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
            .map((message) => decodeURIComponent(message.Message))
            .join(" ");
          const emojiRegEx = emojiRegex();
          const allWords = allMessages.replace(emojiRegEx, "").split(" ");
          const totalWords = allWords.length; // - 7 if auto generated msg - I want to talk about topic name
          console.info((new Date()).toString()+"|"+prependToLog,totalWords);
          responseObject["wordcount"] = totalWords;
          responseObject["PerformanceReportType"] = "Text";

          let writeTextOnImage = require("./common/writeTextOnImage.js");
          writeTextOnImage({
            sessionROWID: row[0]["_id"],
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
            filename: "probabilisticbot/" + row[0]["_id"],
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
  //let catalystApp = catalyst.initialize(req, { type: catalyst.type.applogic });

  const executionID = Math.random().toString(36).slice(2)
    
  //Prepare text to prepend with logs
  const params = ["getPerformanceReport",req.url,executionID,""]
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
    //let zcql = catalystApp.zcql();
    // let query =
    //   "Select {} " +
    //   "from Sessions " +
    //   "left join SystemPrompts on Sessions.SystemPromptsROWID = SystemPrompts.ROWID " +
    //   "where Mobile = " +
    //   mobile +
    //   " and SystemPrompts.Type = 'Topic Prompt' and Sessions.MessageType = 'UserMessage' ";
    // ("order by Sessions.CREATEDTIME desc");
    // zcql
    //   .executeZCQLQuery(query.replace("{}", "count(ROWID)"))
    Sessions.aggregate([
      {
        $match: {
          Mobile: mobile.toString(),
          MessageType: 'UserMessage'
        }
      },
      {
        $lookup: {
          from: "systemprompts", // Name of the collection to join with
          localField: 'SystemPromptsROWID',
          foreignField: '_id',
          as: 'SystemPrompts'
        }
      },
      {
        $unwind: {
          path:'$SystemPrompts',
          preserveNullAndEmptyArrays:true
        }
      },
      {
        $match: {
          'SystemPrompts.Type': 'Topic Prompt'
        }
      }
    ])
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
          data["Message"]
        ).replace(emojiRegEx, "");
        temp["TotalWords"] =
          data["MessageType"] == "UserMessage"
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
          (data) => data.SessionID
        );
        const uniqueTopicSessions = topicSessions.filter(unique);
        userReport["TotalAttempts"] =
          uniqueTopicSessions.length.toString();
        totalSessions =
          totalSessions + parseInt(userReport["TotalAttempts"]);
        var topicWC = uniqueTopicSessions.map((data) => {
          const sessionWCs = topicSessionsData.map((record) =>
            record.SessionID == data
              ? record.TotalWords
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
          (data) => data.CREATEDTIME
        );
        const uniqueDates = sessionDates.filter(unique);
        const lastActiveDate = uniqueDates.sort().pop();
        const latestSessionData = topicSessionsData.filter(
          (data) => data.CREATEDTIME == lastActiveDate
        );
        const latestSessionID =
          latestSessionData[0]["SessionID"];
        console.info((new Date()).toString()+"|"+prependToLog,"Latest Session ID: ", latestSessionID);
        const latestSessionIDWCs = topicSessionsData.map((data) =>
          data.SessionID == latestSessionID
            ? data.TotalWords
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
  }
});

app.post("/goalachievementcalendar", (req, res) => {
 // //let catalystApp = catalyst.initialize(req, { type: catalyst.type.applogic });

  const startTimeStamp = new Date();

  const executionID = Math.random().toString(36).slice(2)
    
  //Prepare text to prepend with logs
  const params = ["getPerformanceReport",req.url,executionID,""]
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
    
   // let zcql = catalystApp.zcql();
    //get the user's goal 
    // let query = "Select {} from Users where Mobile = "+mobile
    // getAllRows("ROWID, RegisteredTime, GoalInMinutes",query,zcql,prependToLog)
    User.findOne({ Mobile: mobile }, '_id RegisteredTime GoalInMinutes')
    .then((users)=>{
      if(!users)
        throw new Error(users)
      else{
      
        const goal = users['GoalInMinutes']
        console.info((new Date()).toString()+"|"+prependToLog,"User's Goal:",goal)

        if(goal == null){
          responseObject['OperationStatus']="NO_GOAL"
          responseObject['StatusDescription']="No goal set by user"
          res.status(200).json(responseObject);
        }
        else{
          console.info((new Date()).toString()+"|"+prependToLog,"User Onboarded/Registered on:",users['RegisteredTime'])
          //Get the session data for the current month
          //Get the month date range
          const currentTimeStamp = new Date();
          const monthStart = currentTimeStamp.getFullYear()+"-"+('0'+(currentTimeStamp.getMonth()+1)).slice(-2)+"-01 00:00:00"
          let nextMonthTimeStamp = new Date();
          //Shift to next month
          nextMonthTimeStamp.setMonth(nextMonthTimeStamp.getMonth()+1)
          const nextMonthStartDate = nextMonthTimeStamp.getFullYear()+"-"+('0'+(nextMonthTimeStamp.getMonth()+1)).slice(-2)+"-01 00:00:00"

          // const sessionQuery =
          //   "Select {} " +
          //   "from Sessions " +
          //   "where Mobile = " +mobile+
          //   " and Sessions.CREATEDTIME>='"+monthStart+"' and Sessions.CREATEDTIME<'"+nextMonthStartDate+"' "+
          //   "group by Sessions.SessionID, Sessions.IsActive";
          // const runSessionQuery = getAllRows("Sessions.SessionID, Sessions.IsActive, max(Sessions.CREATEDTIME)",sessionQuery,zcql,prependToLog)
          const runSessionQuery = Sessions.aggregate([
            {
              $match: {
                Mobile: mobile.toString(),
                CREATEDTIME: {
                  $gte: new Date(monthStart),
                  $gte: users['RegisteredTime'],
                  $lt: new Date(nextMonthStartDate)
                }
              }
            },
            {
              $group: {
                _id: '$SessionID',
                IsActive: { $first: '$IsActive' },
                CREATEDTIME: { $max: '$CREATEDTIME' }
              }
            },
            {
              $project: {
                _id: 0,
                SessionID: '$_id',
                IsActive: 1,
                CREATEDTIME: 1
              }
            }
          ]);
          // const assessmentQuery = "Select {} " +
          //   "from UserAssessmentLogs " +
          //   "where UserAssessmentLogs.UserROWID = '" +users[0]['Users']['ROWID']+"'"+
          //   " and UserAssessmentLogs.IsAssessmentComplete = true"
          // const runAssessmentQuery = getAllRows("UserAssessmentLogs.ROWID, UserAssessmentLogs.MODIFIEDTIME",assessmentQuery,zcql,prependToLog)
          
          const runAssessmentQuery = UserAssessmentLog.find({
            UserROWID: users['_id'],
            IsAssessmentComplete: true,
            MODIFIEDTIME: {
              $gte: new Date(monthStart),
              $gte: users['RegisteredTime'],
              $lt: new Date(nextMonthStartDate)
            }
          }, '_id MODIFIEDTIME')
          const axios = require("axios");
          const runGameAttemptQuery = axios.get(process.env.WordleReportURL+mobile)          
          const runFlowQuestionAnswerQuery = userFlowQuestionLogs.find({
            Mobile:parseInt(mobile),
            updatedAt:{
              "$gte":monthStart,
              $gte: users['RegisteredTime'],
              "$lt":nextMonthStartDate
            }
          })
          
          Promise.all([runSessionQuery,runAssessmentQuery,runGameAttemptQuery,runFlowQuestionAnswerQuery])
          .then(([allsessions,userassessment,wordleAttempts,userFlowQuestionLog]) => {
            if(!Array.isArray(allsessions))
              throw new Error(allsessions) 
            else if(!Array.isArray(userassessment))
              throw new Error(userassessment)
            else{
              const openSessions = allsessions.filter(data=>data.IsActive==true).map(data=>data.SessionID)
              const sessions = allsessions.filter(data=>openSessions.includes(data.SessionID)==false).filter(
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
              let practiceDates = sessions.map(data=>data.CREATEDTIME)
              console.info((new Date()).toString()+"|"+prependToLog,"Fetched Conversation TimeStamps:",practiceDates)                
              practiceDates =  practiceDates.concat(userassessment.map(data=>data.MODIFIEDTIME))
              console.info((new Date()).toString()+"|"+prependToLog,"Fetched Learning TimeStamps:",practiceDates)
              practiceDates = practiceDates.concat(wordleAttempts.data.filter(data=>(data.SessionEndTime>=monthStart)&&(data.SessionEndTime<nextMonthStartDate)).map(data=>data.SessionEndTime))
              console.info((new Date()).toString()+"|"+prependToLog,"Fetched Wordle TimeStamps:",practiceDates)
              for(var i=0; i<userFlowQuestionLog.length; i++){
                const record = userFlowQuestionLog[i]
                const qaDates = record.QuestionAnswers.map(data=>
                  data.CreatedTime/*.getFullYear()+"-"+
                  ('0'+(data.CreatedTime.getMonth()+1)).slice(-2)+"-"+
                  ('0'+data.CreatedTime.getDate()).slice(-2)+" "+
                  ('0'+data.CreatedTime.getHours()).slice(-2)+":"+
                  ('0'+data.CreatedTime.getMinutes()).slice(-2)+":"+
                  ('0'+data.CreatedTime.getSeconds()).slice(-2)*/)
                practiceDates = practiceDates.concat(qaDates.filter(data=>(data>=monthStart)&&(data<nextMonthStartDate)))
              }
              console.info((new Date()).toString()+"|"+prependToLog,"Fetched Flow QuestionAnswer TimeStamps:",practiceDates)

              practiceDates = practiceDates.map(record=>new Date(record))
              practiceDates.sort((date1, date2) => date1 - date2)
              console.info((new Date()).toString()+"|"+prependToLog,"Final TimeStamps:",practiceDates)
                
              //For each day in current month
              //const dayMapper = [ '🅼',  '🆃',  '🆆',  '🆃',  '🅵',  '🆂',  '🆂']
              let report = [] //[dayMapper.join("  ")]
              let reportRecord = ['🔲','🔲','🔲','🔲','🔲','🔲','🔲']
              const toDay = currentTimeStamp.getFullYear()+"-"+('0'+(currentTimeStamp.getMonth()+1)).slice(-2)+"-"+('0'+currentTimeStamp.getDate()).slice(-2)
              const dateToday = new Date(toDay+" 00:00:00")
              if(practiceDates.length==0){practiceDates=[new Date(toDay)]}
              let dateOfMonth = new Date(getYYYYMMDDDate(practiceDates[0]))//.toString().slice(0,10))
              let calendarEndDate = new Date()
              calendarEndDate.setDate(calendarEndDate.getDate()+((7-calendarEndDate.getDay())%7))
              while(true){
                
                const dayOfWeek = (dateOfMonth.getDay()+6)%7
                
                const day = dateOfMonth.getFullYear()+"-"+('0'+(dateOfMonth.getMonth()+1)).slice(-2)+"-"+('0'+dateOfMonth.getDate()).slice(-2)

                //Get all the Session data created on the date
                const dateSessions = practiceDates.filter(data=>(data>=(new Date(day+" 00:00:00")))&&(data<=(new Date(day+" 23:59:59"))))

                //If no session data found, add emoji and continue
                if(dateSessions.length==0){
                  if((dateOfMonth>=(new Date(getYYYYMMDDDate(users['RegisteredTime']))))&&(dateOfMonth<=currentTimeStamp))
                    reportRecord[dayOfWeek]="🟧"
                }
                else{
                    reportRecord[dayOfWeek]="✅" 
                }
                if(dateOfMonth.getDate() == dateToday.getDate()){
                  //Get total sessions completed today
                  const todaysSessionCount = sessions.filter(data=>getYYYYMMDDDate(data.CREATEDTIME)==toDay).map(data=>data.SessionID).filter(unique).length
                  //Whether more than one conversation session has been completed
                  //responseObject['MultipleConversationToday']=todaysSessionCount>1
                  //Get total assessments completed today
                  const todaysAssessmentCount = userassessment.filter(data=>getYYYYMMDDDate(data.MODIFIEDTIME)==toDay).map(data=>data._id).filter(unique).length
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
              //Send Reponse to Glific
              let endTimeStamp = new Date();
              let executionDuration = (endTimeStamp - startTimeStamp) / 1000;
              if (executionDuration > 5) {
                  sendResponseToGlific({
                      executionID: executionID,
                      flowID: requestBody["FlowID"],
                      contactID: requestBody["contact"]["id"],
                      resultJSON: JSON.stringify({
                        goalachievement: responseObject,
                      }),
                  })
                  .then((glificResponse) => {})
                  .catch((error) => console.info((new Date()).toString()+"|"+prependToLog,"Error returned from Glific: ", error));
              }
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
  // //let catalystApp = catalyst.initialize(req, { type: catalyst.type.applogic });

  const startTimeStamp = new Date();

  const executionID = Math.random().toString(36).slice(2)
    
  //Prepare text to prepend with logs
  const params = ["getPerformanceReport",req.url,executionID,""]
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
    
    // let zcql = catalystApp.zcql();
    //get the user's goal 
    // let query = "Select {} from Users where Mobile = "+mobile
    // getAllRows("ROWID, GoalInMinutes",query,zcql,prependToLog)
    User.findOne({ Mobile: mobile }, '_id GoalInMinutes')
    .then((users)=>{
      console.info((new Date()).toString()+"|"+prependToLog,"+++++++++",users)
      if(!users)
        throw new Error(users)
      else{
      
        const goal = users['GoalInMinutes']

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
          
          // query =
          //   "Select {} " +
          //   "from Sessions " +
          //   "where Mobile = " +mobile+
          //   " and Sessions.CREATEDTIME>='"+toDay+" 00:00:00' and Sessions.CREATEDTIME<='"+toDay+" 23:59:59'"+
          //   " and Sessions.MessageType = 'UserMessage' "+
          //   "order by Sessions.CREATEDTIME ASC";
          // const runSessionQuery = getAllRows("Sessions.SessionID, Sessions.CREATEDTIME",query,zcql,prependToLog)
          const fromDate = new Date(toDay + ' 00:00:00');
          const toDate = new Date(toDay + ' 23:59:59');
          const runSessionQuery = Sessions.find({
                            Mobile: mobile.toString(),
                            CREATEDTIME: {
                              $gte: fromDate,
                              $lte: toDate
                            },
                            MessageType: 'UserMessage'
                          })
                          .select('SessionID CREATEDTIME')
                          .sort({ CREATEDTIME: 'asc' })
          // const assessmentQuery = "Select {} " +
          //     "from UserAssessment " +
          //     "left join UserAssessmentLogs on UserAssessment.UserAssessmentLogROWID = UserAssessmentLogs.ROWID " +
          //     "where UserAssessmentLogs.UserROWID = '" +users[0]['Users']['ROWID']+"' "+
          //     " and UserAssessment.CREATEDTIME>='"+toDay+" 00:00:00' and UserAssessment.CREATEDTIME<='"+toDay+" 23:59:59'"+
          //     " order by UserAssessment.CREATEDTIME ASC";
          // const runAssessmentQuery = getAllRows("UserAssessment.UserAssessmentLogROWID, UserAssessment.CREATEDTIME",assessmentQuery,zcql,prependToLog)
         
          const runAssessmentQuery = UserAssessment.aggregate([
            {
              $lookup: {
                from: "userassessmentlogs", // Name of the collection to join with
                localField: 'UserAssessmentLogROWID',
                foreignField: '_id',
                as: 'UserAssessmentLogs'
              }
            },
            {
              $unwind: {
                path:'$UserAssessmentLogs',
                preserveNullAndEmptyArrays: true
              }
            },
            {
              $match: {
                'UserAssessmentLogs.UserROWID': users['_id'],
                CREATEDTIME: {
                  $gte: fromDate,
                  $lte: toDate
                }
              }
            },
            {
              $project: {
                _id: 0,
                UserAssessmentLogROWID: 1,
                CREATEDTIME: 1
              }
            },
            {
              $sort: { CREATEDTIME: 1 }
            }
          ])
          // const gameAttemptQuery = "Select {} " +
          //         "from WordleAttempts " +
          //         "where WordleAttempts.UserROWID = '" +users[0]['Users']['ROWID']+"' "+
          //         " and WordleAttempts.CREATEDTIME>='"+toDay+" 00:00:00' and WordleAttempts.CREATEDTIME<='"+toDay+" 23:59:59'"+
          //         " order by WordleAttempts.CREATEDTIME ASC";
          // const runGameAttemptQuery = getAllRows("WordleAttempts.WordleROWID, WordleAttempts.CREATEDTIME",gameAttemptQuery,zcql,prependToLog)
          const runGameAttemptQuery = WordleAttempt.find({
            UserROWID: users['_id'],
            CREATEDTIME: {
              $gte: fromDate,
              $lte: toDate
            }
          }, 'WordleROWID CREATEDTIME')
          .sort({ CREATEDTIME: 'asc' });
          const runFlowQuestionAnswerQuery = userFlowQuestionLogs.find({
            Mobile:parseInt(mobile),
            updatedAt:{
              "$gte":toDay+" 00:00:00",
              "$lte":toDay+" 23:59:59"
            }
          })

          Promise.all([runSessionQuery,runAssessmentQuery,runGameAttemptQuery,runFlowQuestionAnswerQuery])
          .then(([allsessions,userassessment,wordleAttempts,userFlowQuestionLog]) => {
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
                    data.SessionID.endsWith("ObjectiveFeedback") ||
                    data.SessionID.startsWith("Onboarding") ||
                    data.SessionID.endsWith("Onboarding") ||
                    data.SessionID.startsWith("onboarding") ||
                    data.SessionID.endsWith("onboarding") ||
                    //Exclude Serious Mode and Voice Challenge Sessions
                    data.SessionID.endsWith("Serious Mode") ||
                    data.SessionID.endsWith("Voice Challenge")
                  )
              );
              let dateSessionDurations = []
              let practiceDates = []
              const sessionIDs = sessions.map(data=>data.SessionID.toString()).filter(unique)
              for(var i=0; i<sessionIDs.length;i++){
                practiceDates = sessions.filter(data=>data.SessionID==sessionIDs[i]).map(data=>data.CREATEDTIME)
                practiceDates.sort()
                dateSessionDurations = dateSessionDurations.concat(practiceDates.map((data,i)=>{
                  if(i<(practiceDates.length-1)){
                    const duration = (new Date(practiceDates[i+1]) - new Date(data))/1000/60
                    if(duration>10)
                      return 0
                    else 
                      return duration
                  }
                  else
                    return 0
                }))
              }
              console.info((new Date()).toString()+"|"+prependToLog,"Got Conversation Data:",practiceDates)
              const userassessmentLogIDs = userassessment.map(data=>data.UserAssessmentLogROWID.toString()).filter(unique)
              for(var i=0; i<userassessmentLogIDs.length;i++){
                practiceDates=userassessment.filter(data=>data.UserAssessmentLogROWID == userassessmentLogIDs[i]).map(data=>data.CREATEDTIME)
                practiceDates.sort()
                dateSessionDurations = dateSessionDurations.concat(practiceDates.map((data,i)=>{
                  if(i<(practiceDates.length-1)){
                    const duration = (new Date(practiceDates[i+1]) - new Date(data))/1000/60
                    if(duration>10)
                      return 0
                    else 
                      return duration
                  }
                  else
                    return 0
                }))
              }
              console.info((new Date()).toString()+"|"+prependToLog,"Got Learning Data:",practiceDates)
              const wordleIDs = wordleAttempts.map(data=>data.WordleROWID.toString()).filter(unique)
              for(var i=0; i<wordleIDs.length;i++){
                practiceDates=wordleAttempts.filter(data=>data.WordleROWID==wordleIDs[i]).map(data=>data.CREATEDTIME)
                practiceDates.sort()
                dateSessionDurations = dateSessionDurations.concat(practiceDates.map((data,i)=>{
                  if(i<(practiceDates.length-1)){
                    const duration = (new Date(practiceDates[i+1]) - new Date(data))/1000/60
                    if(duration>10)
                      return 0
                    else 
                      return duration
                  }
                  else
                    return 0
                }))
              }
              console.info((new Date()).toString()+"|"+prependToLog,"Got Wordle Data:",practiceDates)
              
              for(var i=0; i<userFlowQuestionLog.length; i++){
                const record = userFlowQuestionLog[i]
                const qaDates = record.QuestionAnswers.map(data=>
                  data.CreatedTime.getFullYear()+"-"+
                  ('0'+(data.CreatedTime.getMonth()+1)).slice(-2)+"-"+
                  ('0'+data.CreatedTime.getDate()).slice(-2)+" "+
                  ('0'+data.CreatedTime.getHours()).slice(-2)+":"+
                  ('0'+data.CreatedTime.getMinutes()).slice(-2)+":"+
                  ('0'+data.CreatedTime.getSeconds()).slice(-2)
                )
                practiceDates = qaDates.filter(data=>(data>=(toDay+" 00:00:00"))&&(data<=(toDay+" 23:59:59")))
                //Get the Session Data associated withe User Flow Question Log
                const logSessionData = sessions.filter(data=>data.SessionID==(record.SessionID+" -"+(record.Category.split("-"))[1]))
                //Merge in practice Dates as actual interaction ends when the request is sent to GPT
                practiceDates = practiceDates.concat(logSessionData.map(data=>data.CREATEDTIME))
                practiceDates.sort()
                dateSessionDurations = dateSessionDurations.concat(practiceDates.map((data,i)=>{
                  if(i<(practiceDates.length-1)){
                    const duration = (new Date(practiceDates[i+1]) - new Date(data))/1000/60
                    if(duration>10)
                      return 0
                    else 
                      return duration
                  }
                  else
                    return 0
                }))
              }
              console.info((new Date()).toString()+"|"+prependToLog,"Got Flow QuestionAnswer Data:",practiceDates)
                              
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
              //Send Reponse to Glific
              let endTimeStamp = new Date();
              let executionDuration = (endTimeStamp - startTimeStamp) / 1000;
              if (executionDuration > 5) {
                  sendResponseToGlific({
                      executionID: executionID,
                      flowID: requestBody["FlowID"],
                      contactID: requestBody["contact"]["id"],
                      resultJSON: JSON.stringify({
                        dailygoalprogress: responseObject,
                      }),
                  })
                  .then((glificResponse) => {})
                  .catch((error) => console.info((new Date()).toString()+"|"+prependToLog,"Error returned from Glific: ", error));
              }
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

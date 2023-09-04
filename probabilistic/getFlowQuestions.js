"use strict";

const express = require("express");
// const catalyst = require('zcatalyst-sdk-node');
const catalyst = require("zoho-catalyst-sdk");
const sendResponseToGlific = require("./common/sendResponseToGlific.js");
const flowQuestions = require("./models/flowQuestions.js");
const userFlowQuestionLogs = require("./models/userFlowQuestionLogs.js");
// const app = express();
// app.use(express.json());
const bodyParser = require('body-parser')
const math = require("mathjs")

const app = express.Router();

//Filter unique elements in an array
const unique = (value, index, self) => {
  return self.indexOf(value) === index;
};

//Check key in object
const checkKey = (ki,obj) => {
  const tokens = ki == null ? [] : Array.isArray(ki) ? ki : ki.split(",")
  const missingTokens = []
  for(var i = 0; i < tokens.length; i++){
    if(typeof obj[tokens[i]] === 'undefined')
      missingTokens.push(tokens[i])
  }
  return missingTokens
}

const sendResponse = (prependToLog,responseJSON,startTimeStamp,requestBody,res) => {
    console.info((new Date()).toString()+"|"+prependToLog,"End of Execution. Response:",responseJSON)
    res.status(200).json(responseJSON)
    //Send Reponse to Glific
    let endTimeStamp = new Date();
    let executionDuration = (endTimeStamp - startTimeStamp) / 1000;
    if (executionDuration > 5) {
        if((typeof requestBody["FlowID"] !== 'undefined')&&(typeof requestBody["contact"] !== 'undefined'))
            sendResponseToGlific({
                flowID: requestBody["FlowID"],
                contactID: requestBody["contact"]["id"],
                resultJSON: JSON.stringify({
                    randomquestions: responseJSON,
                }),
            })
            .then((glificResponse) => {})
            .catch((err) => console.log("Error returned from Glific: ", err));
    }
    return true
}

app.post("/updateflowquestion", (req, res) => {
    
    let startTimeStamp = new Date();
    
    const requestBody = req.body;
 
    const executionID = req.body.SessionID ? req.body.SessionID : Math.random().toString(36).slice(2)
    
    //Prepare text to prepend with logs
    const params = ["getFlowQuestions",req.url, requestBody.UserFlowQuestionLogID,executionID,""]
    const prependToLog = params.join(" | ")
    
    console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")
    
    //Initialize Response Object
    var responseJSON = {
        "OperationStatus":"SUCCESS"
    }
    
    const missingParams = checkKey(["UserFlowQuestionLogID", "QuestionIdentifier"],requestBody)
    
    if(missingParams.length>0){
        responseJSON['OperationStatus'] = "REQ_ERR"
        responseJSON['StatusDescription'] = "Missing field - "+missingParams.join(",")
        sendResponse(prependToLog,responseJSON,startTimeStamp,requestBody,res)
    }
    else {

        console.debug((new Date()).toString()+"|"+prependToLog,"Getting Questions Asked in Session: "+requestBody['UserFlowQuestionLogID']);

        const updateRecord = userFlowQuestionLogs.findByIdAndUpdate(requestBody['UserFlowQuestionLogID'],{
            $push:{
                QuestionAnswers:{
                    QuestionID:requestBody["QuestionIdentifier"]
                }
            }
        })

        updateRecord
        .then((updatedRecord) => {
            if(updatedRecord == null){
                console.info((new Date()).toString()+"|"+prependToLog,"No log record for ID :"+requestBody["UserFlowQuestionLogID"])
                responseJSON['OperationStatus']='FAILED_TO_CLOSE_SESSION'
                responseJSON['StatusDescription']="Log ID "+requestBody["UserFlowQuestionLogID"]+" not found"
                sendResponse(prependToLog,responseJSON,startTimeStamp,requestBody,res)
            }
            else{
                console.info((new Date()).toString()+"|"+prependToLog,"Updated Log with ID :"+requestBody["UserFlowQuestionLogID"])
                sendResponse(prependToLog,responseJSON,startTimeStamp,requestBody,res)
            }
        })
        .catch((err) => {
            console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error in Updating Questions in User's Log");
            console.error((new Date()).toString()+"|"+prependToLog,"End of Execution with Error: ",err);
            res.status(500).send(err);
        });
    }
});

app.post("/closesession", (req, res) => {
    
    let startTimeStamp = new Date();
    
    const requestBody = req.body;
 
    const executionID = req.body.SessionID ? req.body.SessionID : Math.random().toString(36).slice(2)
    
    //Prepare text to prepend with logs
    const params = ["getFlowQuestions",req.url, requestBody.UserFlowQuestionLogID,executionID,""]
    const prependToLog = params.join(" | ")
    
    console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")
    
    //Initialize Response Object
    var responseJSON = {
        "OperationStatus":"SUCCESS"
    }
    
    const missingParams = checkKey(["UserFlowQuestionLogID", "CompletionReason"],requestBody)
    
    if(missingParams.length>0){
        responseJSON['OperationStatus'] = "REQ_ERR"
        responseJSON['StatusDescription'] = "Missing field - "+missingParams.join(",")
        sendResponse(prependToLog,responseJSON,startTimeStamp,requestBody,res)
    }
    else {

        console.info((new Date()).toString()+"|"+prependToLog,"Closing Session: "+requestBody["UserFlowQuestionLogID"]);

        const updateRecord = userFlowQuestionLogs.findByIdAndUpdate(requestBody["UserFlowQuestionLogID"],{
                IsComplete:true, 
                CompletionReason: requestBody['CompletionReason']
            }
        )
        //Execute Query
		updateRecord
        .then((updatedRecord) => {
            if(updatedRecord == null){
                console.info((new Date()).toString()+"|"+prependToLog,"No log record for ID :"+requestBody["UserFlowQuestionLogID"])
                responseJSON['OperationStatus']='FAILED_TO_CLOSE_SESSION'
                responseJSON['StatusDescription']="Log ID "+requestBody["UserFlowQuestionLogID"]+" not found"
                sendResponse(prependToLog,responseJSON,startTimeStamp,requestBody,res)
            }
            else{
                console.info((new Date()).toString()+"|"+prependToLog,"Closed Log with ID :"+requestBody["UserFlowQuestionLogID"])
                sendResponse(prependToLog,responseJSON,startTimeStamp,requestBody,res)
            }
        }).catch((err) => {
            console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error in Closing User's Flow Question Log");
            console.error((new Date()).toString()+"|"+prependToLog,"End of Execution with Error: ",err);
            res.status(500).send(err);
        });
    }
});

app.post("/", (req, res) => {
    
    let startTimeStamp = new Date();
    let catalystApp = catalyst.initialize(req, { type: catalyst.type.applogic });
    
    const requestBody = req.body;
 
    const executionID = req.body.SessionID ? req.body.SessionID : Math.random().toString(36).slice(2)
    
    //Prepare text to prepend with logs
    const params = ["getFlowQuestions",req.url,executionID,""]
    const prependToLog = params.join(" | ")
    
    console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")
    
    //Initialize Response Object
    var responseJSON = {
        "OperationStatus":"SUCCESS"
    }
    
    const missingParams = checkKey(["Mobile", "Category", "TopicID", "SessionID"],requestBody)
    
    if(missingParams.length>0){
        responseJSON['OperationStatus'] = "REQ_ERR"
        responseJSON['StatusDescription'] = "Missing field - "+missingParams.join(",")
        sendResponse(prependToLog,responseJSON,startTimeStamp,requestBody,res)
    }
    else {

        responseJSON['TopicID']=requestBody.TopicID
        responseJSON['Category']=requestBody.Category

        //Get the User's mobile number
	    const mobile = requestBody['Mobile'].toString().slice(-10)
		
		//Question Number
		var qNo = 0;	
		let zcql = catalystApp.zcql();

		//Fetch the User ID from mobile number
		let query = "SELECT ROWID FROM Users where Mobile='"+mobile+"' and IsActive != false";
		console.debug((new Date()).toString()+"|"+prependToLog,"Get User Details: "+query);
		
        //Execute Query
		zcql.executeZCQLQuery(query)
        .then((user) => {
            if(!Array.isArray(user) && (user!=null)){
                responseJSON['OperationStatus']='FAILED_TO_GET_USER'
                responseJSON['StatusDescription']=user
                sendResponse(prependToLog,responseJSON,startTimeStamp,requestBody,res)
            }
            else{
			    //If there is no record, then the mobile number does not exist in system. Return error
                if(user.length == 0){
                    responseJSON['OperationStatus']='USER_NOT_FOUND';
                    sendResponse(prependToLog,responseJSON,startTimeStamp,requestBody,res)
                }
                //If there are more than one records active for a mobile number, return error that there are more than one student.
                else if(user.length > 1){
                    responseJSON['OperationStatus']='DUPLICATE_USERS_FOUND'
                    sendResponse(prependToLog,responseJSON,startTimeStamp,requestBody,res)
                }
                else{
                    console.debug((new Date()).toString()+"|"+prependToLog,"User: ",user)
                    
                    console.debug((new Date()).toString()+"|"+prependToLog,"Get Flow Logs for the given category and sesson id");
                    const flowQuestionLogsQuery = userFlowQuestionLogs.find({
                        SessionID : requestBody["SessionID"],
                        Category : requestBody["Category"],
                        Mobile : mobile
                    })
                    console.debug((new Date()).toString()+"|"+prependToLog,"Get Questions for the given category");
                    const questionQuery = flowQuestions.find({
                        Category : requestBody["Category"],
                        IsActive : true
                    }).sort({AskingOrder:'asc'})

                    console.info((new Date()).toString()+"|"+prependToLog,"Getting the user's practice data");
                    const axios = require("axios");
                    const pendingPracticesQuery = axios.post(
                        process.env.PendingPracticesURL,
                        {
                        Mobile: mobile,
                        },
                        {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                        }
                    );
                    const userSessionsQuery = axios.post(
                        process.env.UserSessionsURL,
                        {
                        Mobile: mobile,
                        TopicID:requestBody["TopicID"],
                        },
                        {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                        }
                    );
                            
                    Promise.all([flowQuestionLogsQuery,questionQuery,pendingPracticesQuery,userSessionsQuery])
                    .then(async ([topicAttempts,questionBank,pendingPractices,userSessions]) => {
                        if(questionBank.length == 0){
                            responseJSON['OperationStatus']='QUESTION_NOT_CONFIGURED';
                            sendResponse(prependToLog,responseJSON,startTimeStamp,requestBody,res)
                        }
                        else if (["SUCCESS","SSN_ABV_PERIOD","MIN_SSN_RCHD"].includes(pendingPractices.data.OperationStatus)==false){
                            console.info((new Date()).toString()+"|"+prependToLog,"Failed to get pending practices")
                            responseJSON['OperationStatus']='PRCTC_DATA_ERR'
                            sendResponse(prependToLog,responseJSON,startTimeStamp,requestBody,res)
                        }
                        else if(userSessions.data.OperationStatus != 'SUCCESS'){
                            console.info((new Date()).toString()+"|"+prependToLog,"Failed to get user session counts")
                            responseJSON['OperationStatus']='SSN_CNT_ERR'
                            sendResponse(prependToLog,responseJSON,startTimeStamp,requestBody,res)
                        }
                        else{
                            console.info((new Date()).toString()+"|"+prependToLog,"Fetched user's practice data");
                            let userSessionData = {                                            
                                OverallPracticeDays : pendingPractices.data.CompletedPracticeCount,
                                TotalDaysConversationPracticed : pendingPractices.data.ConversationAttemptDays,
                                TotalDaysConversationCompleted : pendingPractices.data.ConversationCompletionDays,
                                TotalDaysLearningPracticed : pendingPractices.data.LearningAttemptDays,
                                TotalDaysLearningCompleted : pendingPractices.data.LearningCompletionDays,
                                TotalDaysGameCompleted : pendingPractices.data.GameCompletionDays,
                                TotalDaysGamePracticed : pendingPractices.data.GameAttemptDays,
                                TotalConversationSessionsStarted : userSessions.data.TotalConvesationSessions,
                                TotalConvesationSessionsCompleted : userSessions.data.TotalConvesationSessionsCompleted,
                                TotalLearningSessions : userSessions.data.TotalLearningSessions,
                                TotalLearningSessionsStarted : userSessions.data.TotalLearningSessionsStarted,
                                TotalLearningSessionsCompleted : userSessions.data.TotalLearningSessionsCompleted,
                                TotalGameSessionsStarted : userSessions.data.TotalGameSessions,
                                TotalGameSessionsCompleted : userSessions.data.TotalGameSessionsCompleted,
                                Persona : userSessions.data.Persona ? userSessions.data.Persona : null,
                                TotalPersonaSessionsStartd : userSessions.data.TotalPersonaSessionsStartd ? userSessions.data.TotalPersonaSessionsStartd : userSessions.data.TotalPersonaSessionsStartd,
                                TotalPersonaSessionsCompleted : userSessions.data.TotalPersonaSessionsCompleted ? userSessions.data.TotalPersonaSessionsCompleted : userSessions.data.TotalPersonaSessionsCompleted,
                                TotalDaysPersonaPracticed : userSessions.data.TotalDaysPersonaPracticed ? userSessions.data.TotalDaysPersonaPracticed : null,
                                Topic : userSessions.data.Topic ? userSessions.data.Topic : null,
                                TotalTopicSessionsStartd : userSessions.data.TotalTopicSessionsStartd ? userSessions.data.TotalTopicSessionsStartd : null,
                                TotalTopicSessionsCompleted : userSessions.data.TotalTopicSessionsCompleted ? userSessions.data.TotalTopicSessionsCompleted : null,
                                TotalDaysTopicPracticed : userSessions.data.TotalDaysTopicPracticed ? userSessions.data.TotalDaysTopicPracticed : null,
                                Module : userSessions.data.Module ? userSessions.data.Module : null,
                                TotalModuleSessionsStartd : userSessions.data.TotalModuleSessionsStartd ? userSessions.data.TotalModuleSessionsStartd : null,
                                TotalModuleSessionsCompleted : userSessions.data.TotalModuleSessionsStartd ? userSessions.data.TotalModuleSessionsStartd : null,
                                TotalDaysModulePracticed : userSessions.data.TotalDaysModulePracticed ? userSessions.data.TotalDaysModulePracticed : null
                            }
                            console.info((new Date()).toString()+"|"+prependToLog,"Total Logs for Category/SessionID: "+topicAttempts.length);
                            const completedAttempts = Array.isArray(topicAttempts) ? topicAttempts.filter(attempt=>attempt.IsComplete==true) : []
                            console.info((new Date()).toString()+"|"+prependToLog,"Total Complete Attempts for Category/SessionID: "+completedAttempts.length);
                            let pendingUserAssessmentLogs = Array.isArray(topicAttempts) ? topicAttempts.filter(attempt=>attempt.IsComplete==false) : []
                            console.info((new Date()).toString()+"|"+prependToLog,"Total Incomplete Attempts for Category/SessionID: "+pendingUserAssessmentLogs.length);
                                            
                            var questionRecord = []
                            responseJSON["UserFlowQuestionLogID"] = null
                            var previousResponsesResult = null

                            //If no active flow log, then initiate a new one
                            if(pendingUserAssessmentLogs.length == 0){

                                console.info((new Date()).toString()+"|"+prependToLog,"No pending Flow Question for User for the given category");
                                            
                                //Get 1st question to be asked
                                questionRecord = questionBank.filter(record=>record.AskingOrder==1) 
                                //If all the questions are to be asked randomly, select 1
                                if(questionRecord.length==0){
                                    const randomIndex = Math.floor(Math.random()*(questionBank.length-1))
                                    questionRecord.push(questionBank[randomIndex])
                                    console.info((new Date()).toString()+"|"+prependToLog,"No Asking Order = 1. All questions to be asked randonly. Selected Question id = "+questionRecord[0]['id']);
                                }

                                //Create New Assessment Log
                                let newUserAssessmentLogData = {
                                    Mobile: mobile,
                                    SystemPromptROWID: requestBody['TopicID'],
                                    IsComplete: false,
                                    CompletionReason: null,
                                    NextQuestionID: questionRecord[0]['id'], //If answer of 1st question could not be saved, ask the 1st question again
                                    SessionID: requestBody['SessionID'],
                                    Category: requestBody['Category'],
                                    QuestionAnswers: []
                                }
                                pendingUserAssessmentLogs = [await userFlowQuestionLogs.create(newUserAssessmentLogData)]
                                responseJSON["UserFlowQuestionLogID"] = pendingUserAssessmentLogs[0]['id']
                                responseJSON['OperationStatus']='NEW_ASSESSMENT'
                                responseJSON['QuestionNumber']=1
                                console.info((new Date()).toString()+"|"+prependToLog,'Created New User Flow Question Log:'+responseJSON["UserFlowQuestionLogID"])
                            }
                            if(pendingUserAssessmentLogs[0]['NextQuestionID']==null){
                                console.info((new Date()).toString()+"|"+prependToLog,"Reached End of Flow. No next question.")
                                responseJSON['OperationStatus']='END_OF_ASSESSMENT'
                                responseJSON["UserFlowQuestionLogID"] = pendingUserAssessmentLogs[0]['id']
                            }
                            else{
                                //There is an active flow log
                                responseJSON["UserFlowQuestionLogID"] = pendingUserAssessmentLogs[0]['id']
                                console.info((new Date()).toString()+"|"+prependToLog,"Flow log pending for User:"+responseJSON["UserFlowQuestionLogID"]);
                                const previousResponsesResult = pendingUserAssessmentLogs[0]['QuestionAnswers']
                                responseJSON['OperationStatus'] = responseJSON['OperationStatus'] == 'NEW_ASSESSMENT' ? 'NEW_ASSESSMENT' : 'CONTINUED_ASSESSMENT'
                                responseJSON['QuestionNumber']=pendingUserAssessmentLogs[0]['QuestionAnswers'].map(data=>data.QuestionID).filter(unique).length+1
                                    
                                const triggerElements = ['Module','Topic','Persona','Conversation','Learning','Game']

                                //Get the data of next question to be asked
                                const nextQuestionRecord = questionBank.filter(record=>record.id==pendingUserAssessmentLogs[0]['NextQuestionID'])
                                let match = []
                                //Check if trigger condition is satisfied
                                let triggers = nextQuestionRecord[0]['Triggers']
                                if(triggers!=null)
                                    for(var j = 0; j<triggers.length; j++){
                                        const trigger = triggers[j]
                                        for(var k = 0; k<triggerElements.length; k++){
                                            const triggerElement = triggerElements[k]
                                            if(typeof trigger[triggerElement] !== 'undefined'){
                                                if(typeof trigger[triggerElement]['Name'] !== 'undefined')
                                                    match.push(trigger[triggerElement]['Name'] == userSessionData[triggerElement])
                                                if(typeof trigger[triggerElement]['TotalStarted'] !== 'undefined')
                                                    match.push(trigger[triggerElement]['TotalStarted'] == userSessionData['Total'+triggerElement+'SessionsStartd'])
                                                if(typeof trigger[triggerElement]['TotalFinished'] !== 'undefined')
                                                    match.push(trigger[triggerElement]['TotalFinished'] == userSessionData['Total'+triggerElement+'SessionsCompleted'])
                                                if(typeof trigger[triggerElement]['TotalPracticeDays'] !== 'undefined')
                                                    match.push(trigger[triggerElement]['TotalPracticeDays'] == userSessionData['TotalDays'+triggerElement+'Practiced'])
                                            }
                                        }
                                        if(typeof trigger['OverallPracticeDays'] !== 'undefined')
                                            match.push(trigger['OverallPracticeDays'] == userSessionData['OverallPracticeDays'])

                                    }
                                //if match is empty, then there is no trigger return the nextQuestionRecord
                                //If all conditions satisfied
                                if(!match.some(record=>record==false)){
                                    questionRecord = nextQuestionRecord
                                }
                                else{
                                    //search next questions in sequence to be asked
                                    const sequenceQuestions = questionBank.filter(data=>data.AskingOrder!=-1)

                                    for(var i = 0; i<sequenceQuestions.length; i++){
                                        //If the question is not in the list of answered questions
                                        const alreadyAsked = previousResponsesResult.filter(data=>data.QuestionID == sequenceQuestions[i].id)
                                        if(alreadyAsked.length==0){
                                            let match = []
                                            triggers = sequenceQuestions[i]['Triggers']
                                            if(triggers!=null)
                                                for(var j = 0; j<triggers.length; j++){
                                                    const trigger = triggers[j]
                                                    for(var k = 0; k<triggerElements.length; k++){
                                                        const triggerElement = triggerElements[k]
                                                        if(typeof trigger[triggerElement] !== 'undefined'){
                                                            if(typeof trigger[triggerElement]['Name']!=='undefined')
                                                                match.push(trigger[triggerElement]['Name'] == userSessionData[triggerElement])
                                                            if(typeof trigger[triggerElement]['TotalStarted'] !== 'undefined')
                                                                match.push(trigger[triggerElement]['TotalStarted'] == userSessionData['Total'+triggerElement+'SessionsStarted'])
                                                            if(typeof trigger[triggerElement]['TotalFinished'] !== 'undefined')
                                                                match.push(trigger[triggerElement]['TotalFinished'] == userSessionData['Total'+triggerElement+'SessionsCompleted'])
                                                            if(typeof trigger[triggerElement]['TotalPracticeDays'] !== 'undefined')
                                                                match.push(trigger[triggerElement]['TotalPracticeDays'] == userSessionData['TotalDays'+triggerElement+'Practiced'])
                                                        }
                                                    }
                                                    if(typeof trigger['OverallPracticeDays'] !== 'undefined')
                                                        match.push(trigger['OverallPracticeDays'] == userSessionData['OverallPracticeDays'])

                                                }
                                            //if match is empty, then there is no trigger
                                            //If all conditions satisfied
                                            if(!match.some(record=>record==false)){
                                                //Check if the question has already been asked
                                                const alreadyAskedQuestion = previousResponsesResult.filter(data=>data.QuestionID==sequenceQuestions[i]['id'])
                                                //If the question has not been asked, return the current question
                                                if(alreadyAskedQuestion.length==0){
                                                    questionRecord = [sequenceQuestions[i]]
                                                    break
                                                }
                                            }
                                        }
                                    }
                                    //If no question in sequence has matching trigger condition, search random questions
                                    if(questionRecord.length==0){
                                        const randomQuestions = questionBank.filter(data=>data.AskingOrder==-1)
                                        var probed = []
                                        while(true){                            
                                            //If all questions probed, break
                                            if(probed.length>=randomQuestions.length)
                                                break
                                            
                                            //Generate a random index                
                                            var i = Math.floor(Math.random() * randomQuestions.length)
                                            
                                            //If index already probed, skip
                                            if(probed.includes(i))
                                                continue
                                            
                                            //If the question is not in the list of answered questions
                                            const alreadyAsked = previousResponsesResult.filter(data=>data.QuestionID == randomQuestions[i].id)
                                            if(alreadyAsked.length==0){
                                                let match = []
                                                triggers = randomQuestions[i]['Triggers']
                                                if(triggers!=null)
                                                    for(var j = 0; j<triggers.length; j++){
                                                        const trigger = triggers[j]
                                                        for(var k = 0; k<triggerElements.length; k++){
                                                            const triggerElement = triggerElements[k]
                                                            if(typeof trigger[triggerElement] !== 'undefined'){
                                                                if(typeof trigger[triggerElement]['Name']!=='undefined')
                                                                    match.push(trigger[triggerElement]['Name'] == userSessionData[triggerElement])
                                                                if(typeof trigger[triggerElement]['TotalStarted'] !== 'undefined')
                                                                    match.push(trigger[triggerElement]['TotalStarted'] == userSessionData['Total'+triggerElement+'SessionsStartd'])
                                                                if(typeof trigger[triggerElement]['TotalFinished'] !== 'undefined')
                                                                    match.push(trigger[triggerElement]['TotalFinished'] == userSessionData['Total'+triggerElement+'SessionsCompleted'])
                                                                if(typeof trigger[triggerElement]['TotalPracticeDays'] !== 'undefined')
                                                                    match.push(trigger[triggerElement]['TotalPracticeDays'] == userSessionData['TotalDays'+triggerElement+'Practiced'])
                                                            }
                                                        }
                                                        if(typeof trigger['OverallPracticeDays'] !== 'undefined')
                                                            match.push(trigger['OverallPracticeDays'] == userSessionData['OverallPracticeDays'])
    
                                                    }
                                                //if match is empty, then there is no trigger
                                                //If all conditions satisfied
                                                if(!match.some(record=>record==false)){
                                                    //Check if the question has already been asked
                                                    const alreadyAskedQuestion = previousResponsesResult.filter(data=>data.QuestionID==randomQuestions[i]['id'])
                                                    //If the question has not been asked, return the current question
                                                    if(alreadyAskedQuestion.length==0){
                                                        questionRecord = [randomQuestions[i]]
                                                        break
                                                    }
                                                }
                                            }
                                            probed.push(i)
                                        }                                      
                                    }
                                    if(questionRecord.length==0){
                                        console.info((new Date()).toString()+"|"+prependToLog,"No question matching trigger condition.")
                                        responseJSON['OperationStatus']='END_OF_ASSESSMENT'
                                        responseJSON["UserFlowQuestionLogID"] = pendingUserAssessmentLogs[0]['id']
                                    }
                                }
                            }
                                        
                            if(responseJSON["UserFlowQuestionLogID"]==null){ //User Assessment Log not active and no new log could be created. Return Error 
                                responseJSON['OperationStatus']='FAILED_TO_CREATE_ASSESSMENT';
                                sendResponse(prependToLog,responseJSON,startTimeStamp,requestBody,res)
                            }
                            else if(['CONTINUED_ASSESSMENT','NEW_ASSESSMENT'].includes(responseJSON['OperationStatus'])){
                                responseJSON['QuestionIdentifier']=questionRecord[0].id;
                                responseJSON['Question']=decodeURI(questionRecord[0].Question);
                                responseJSON['QuestionType']=questionRecord[0].QuestionType;
                                responseJSON['QuestionAVURL']=questionRecord[0].avURL;
                                responseJSON['QuestionImageURL']=questionRecord[0].ImageURL;
                                responseJSON['ResponseFormat']=questionRecord[0].ResponseFormat;
                                responseJSON['QuestionTags']=questionRecord[0].Tags;
                                if((responseJSON['ResponseFormat']=='Button')||(responseJSON['ResponseFormat']=='List')){
                                    //Button texts are in an Options cell in Question Bank, sepearetd by newline
                                    const buttonOptionsArray = questionRecord[0].Options
                                    responseJSON['QuestionOptionsCount']=buttonOptionsArray.length
                                    for(let j=0; j<buttonOptionsArray.length; j++)
                                    {
                                        responseJSON['QuestionOption'+(j+1)] = buttonOptionsArray.length > 3 ? buttonOptionsArray[j].toString().substr(0,23) : buttonOptionsArray[j].toString().substr(0,20)
                                    }
                                }                
                                if(questionRecord[0].ResponseTimeOut!=null)
                                    responseJSON['QuestionTimeOut']=questionRecord[0].ResponseTimeOut

                                //If it's a continued assessment
                                if(responseJSON['OperationStatus']=='CONTINUED_ASSESSMENT'){
                                    if(responseJSON['Question'].indexOf('{{') > -1)
                                    {
                                        console.info((new Date()).toString()+"|"+prependToLog,'Substituting tokens in question '+responseJSON['Question'])

                                        //Get the token to be substituted
                                        const nextQuestionSubstitutionToken = ((responseJSON['Question'].split("{{"))[1].split('}}'))[0]

                                        console.info((new Date()).toString()+"|"+prependToLog,'Substitutions Tokens = ',nextQuestionSubstitutionToken)
                                        
                                        if(nextQuestionSubstitutionToken.includes("Q"))//Its a question 
                                        {
                                            console.info((new Date()).toString()+"|"+prependToLog,"Question Response to be substituded = ",nextQuestionSubstitutionToken)
                                            var rhsTokens = nextQuestionSubstitutionToken.split("Q")
                                            rhsTokens = rhsTokens.filter(token=>token.toString().trim().length>0)
                                            const expressionTokens = rhsTokens.map(data=>{
                                                const askingOrder = data.replace(/[%*^+() -]/g,"")
                                                if(askingOrder.length==0)
                                                    return data
                                                else{
                                                    const questionRecord = questionBank.filter(record=>record.AskingOrder == askingOrder)
                                                    var answers = previousResponsesResult.filter(record=>record.UserAssessment.QuestionROWID == questionRecord[0]['id'])
                                                    try{
                                                        return data.replace(askingOrder,answers[0]['UserAssessment']['ResponseText'])
                                                    }
                                                    catch(e){
                                                        return data.replace(askingOrder,0)
                                                    }
                                                }
                                            })
                                            console.info((new Date()).toString()+"|"+prependToLog,"Substituted Expression = ",expressionTokens.join(""))
                                            const expressionValue = math.evaluate(expressionTokens.join(""))
                                            console.info((new Date()).toString()+"|"+prependToLog,"Value to be Substituted = ",expressionValue)
                                            //Substitute the latest value in question
                                            responseJSON['Question'] = responseJSON['Question'].replace("{{"+nextQuestionSubstitutionToken+"}}",expressionValue)
                                            console.info((new Date()).toString()+"|"+prependToLog,'Sending question '+questionRecord[0].id+" for Assessment "+responseJSON["UserFlowQuestionLogID"])
                                            sendResponse(prependToLog,responseJSON,startTimeStamp,requestBody,res)
                                        }
                                        else{
                                            console.info((new Date()).toString()+"|"+prependToLog,'Sending question '+questionRecord[0].id+" for Assessment "+responseJSON["UserFlowQuestionLogID"])
                                            sendResponse(prependToLog,responseJSON,startTimeStamp,requestBody,res)
                                        }
                                    }
                                    else{
                                        console.info((new Date()).toString()+"|"+prependToLog,'Sending question '+questionRecord[0].id+" for Assessment "+responseJSON["UserFlowQuestionLogID"])
                                        sendResponse(prependToLog,responseJSON,startTimeStamp,requestBody,res)
                                    }
                                }
                                else{
                                    console.info((new Date()).toString()+"|"+prependToLog,'Sending question '+questionRecord[0].id+" for Assessment "+responseJSON["UserFlowQuestionLogID"])
                                    sendResponse(prependToLog,responseJSON,startTimeStamp,requestBody,res)
                                }
                            }
                            else
                            {
                                sendResponse(prependToLog,responseJSON,startTimeStamp,requestBody,res)
                            }
                        }
                    }).catch((err) => {
                        console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error in Getting Questions");
                        console.error((new Date()).toString()+"|"+prependToLog,"End of Execution with Error: ",err);
                        res.status(500).send(err);
                    });		
                }
            }
        }).catch((err) => {
            console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error in Getting User Data");
            console.error((new Date()).toString()+"|"+prependToLog,"End of Execution with Error: ",err);
            res.status(500).send(err);
        });
    }
});


module.exports = app;
"use strict";

const express = require("express");
// const catalyst = require('zcatalyst-sdk-node');
const catalyst = require("zoho-catalyst-sdk");
const sendResponseToGlific = require("./common/sendResponseToGlific.js");
const Configurations = require("./models/Configurations");
const User = require("./models/Users.js");
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

app.post("/updateassessmentquestion", (req, res) => {
    
    let startTimeStamp = new Date();
    let catalystApp = catalyst.initialize(req, { type: catalyst.type.applogic });
    
    const requestBody = req.body;
 
    const executionID = Math.random().toString(36).slice(2)
    
    //Prepare text to prepend with logs
    const params = ["getRandomQuestions",req.url, requestBody.UserAssessmentLogID,executionID,""]
    const prependToLog = params.join(" | ")
    
    console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")
    
    //Initialize Response Object
    var responseJSON = {
        "OperationStatus":"SUCCESS"
    }
    
    const missingParams = checkKey(["UserAssessmentLogID", "QuestionIdentifier"],requestBody)
    
    if(missingParams.length>0){
        responseJSON['OperationStatus'] = "REQ_ERR"
        responseJSON['StatusDescription'] = "Missing field - "+missingParams.join(",")
        sendResponse(prependToLog,responseJSON,startTimeStamp,requestBody,res)
    }
    else {

        let zcql = catalystApp.zcql();

		//Fetch the User ID from mobile number
		let query = "Select QuestionsAsked from UserAssessmentLogs where ROWID = '"+requestBody['UserAssessmentLogID']+"'"
        console.debug((new Date()).toString()+"|"+prependToLog,"Getting Questions Asked in Session: "+query);

        zcql.executeZCQLQuery(query)
        .then((logs)=>{
            if(!Array.isArray(logs) && (logs!=null)){
                responseJSON['OperationStatus']='FAILED_TO_GET_SESSION'
                responseJSON['StatusDescription']=logs
                sendResponse(prependToLog,responseJSON,startTimeStamp,requestBody,res)
            }
            else{
                if(logs.length==0){
                    responseJSON['OperationStatus']='NO_RCRD'
                    responseJSON['StatusDescription']="No records for the UserAssessmentLogsID"
                    sendResponse(prependToLog,responseJSON,startTimeStamp,requestBody,res)
                }
                else{
                    const questionID = requestBody["QuestionIdentifier"]
                    var questionsAsked = logs[0].UserAssessmentLogs.QuestionsAsked
                    console.log('List of questions asked = ',questionsAsked)
                    questionsAsked = questionsAsked + (questionsAsked.length == 0 ? '' : ',') + questionID
                    console.info((new Date()).toString()+"|"+prependToLog,'List of questions updated = ',questionsAsked)
                    query = "UPDATE UserAssessmentLogs set QuestionsAsked = '"+questionsAsked+"' where ROWID='"+requestBody['AssessmentCompletionReason']+"'"
                    console.info((new Date()).toString()+"|"+prependToLog,"Updating current questions asked : "+query);
                    zcql.executeZCQLQuery(query)
                    .then((row)=>{
                        sendResponse(prependToLog,responseJSON,startTimeStamp,requestBody,res)
                    })
                    .catch((err) => {
                        console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error in Updating Question in User's Assessment");
                        console.error((new Date()).toString()+"|"+prependToLog,"End of Execution with Error: ",err);
                        res.status(500).send(err);
                    });
                }
            }
        })
        .catch((err) => {
            console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error in Getting Questions Asked in User's Assessment");
            console.error((new Date()).toString()+"|"+prependToLog,"End of Execution with Error: ",err);
            res.status(500).send(err);
        });
    }
});

app.post("/closeassessment", (req, res) => {
    
    let startTimeStamp = new Date();
    let catalystApp = catalyst.initialize(req, { type: catalyst.type.applogic });
    
    const requestBody = req.body;
 
    const executionID = Math.random().toString(36).slice(2)
    
    //Prepare text to prepend with logs
    const params = ["getRandomQuestions",req.url, requestBody.UserAssessmentLogID,executionID,""]
    const prependToLog = params.join(" | ")
    
    console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")
    
    //Initialize Response Object
    var responseJSON = {
        "OperationStatus":"SUCCESS"
    }
    
    const missingParams = checkKey(["UserAssessmentLogID", "AssessmentCompletionReason"],requestBody)
    
    if(missingParams.length>0){
        responseJSON['OperationStatus'] = "REQ_ERR"
        responseJSON['StatusDescription'] = "Missing field - "+missingParams.join(",")
        sendResponse(prependToLog,responseJSON,startTimeStamp,requestBody,res)
    }
    else {

        let zcql = catalystApp.zcql();

		//Fetch the User ID from mobile number
		let query = "Update UserAssessmentLogs set IsAssessmentComplete=true, AssessmentCompletionReason = '"+requestBody['AssessmentCompletionReason']+"' where ROWID='"+requestBody["UserAssessmentLogID"]+"' and IsAssessmentComplete != true";
		console.debug((new Date()).toString()+"|"+prependToLog,"Closing Session: "+query);
		
        //Execute Query
		zcql.executeZCQLQuery(query)
        .then((user) => {
            if(!Array.isArray(user) && (user!=null)){
                responseJSON['OperationStatus']='FAILED_TO_CLOSE_SESSION'
                responseJSON['StatusDescription']=user
                sendResponse(prependToLog,responseJSON,startTimeStamp,requestBody,res)
            }
            else{
			    //If there is no record, then the mobile number does not exist in system. Return error
                if(user.length == 0){
                    responseJSON['OperationStatus']='NO_ACTIVE_ASSESSMENT';
                    sendResponse(prependToLog,responseJSON,startTimeStamp,requestBody,res)
                }
                //If there are more than one records active for a mobile number, return error that there are more than one student.
                else{
                    responseJSON['OperationStatus']='NO_ACTIVE_ASSESSMENT';
                    sendResponse(prependToLog,responseJSON,startTimeStamp,requestBody,res)
                }
            }
        }).catch((err) => {
            console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error in Closing User's Assessment");
            console.error((new Date()).toString()+"|"+prependToLog,"End of Execution with Error: ",err);
            res.status(500).send(err);
        });
    }
});

app.post("/", async (req, res) => {
    
    let startTimeStamp = new Date();
    let catalystApp = catalyst.initialize(req, { type: catalyst.type.applogic });
    
    const requestBody = req.body;
 
    const executionID = Math.random().toString(36).slice(2)
    
    //Prepare text to prepend with logs
    const params = ["getRandomQuestions",req.url, requestBody.TopicID,executionID,""]
    const prependToLog = params.join(" | ")
    
    console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")
    
    //Initialize Response Object
    var responseJSON = {
        "OperationStatus":"SUCCESS"
    }
    
    const missingParams = checkKey(["Mobile", "TopicID", "SessionID"],requestBody)
    
    if(missingParams.length>0){
        responseJSON['OperationStatus'] = "REQ_ERR"
        responseJSON['StatusDescription'] = "Missing field - "+missingParams.join(",")
        sendResponse(prependToLog,responseJSON,startTimeStamp,requestBody,res)
    }
    else {

        responseJSON['TopicID']=requestBody.TopicID

        //Get the User's mobile number
	    const mobile = requestBody['Mobile'].toString().slice(-10)
		
		//Question Number
		var qNo = 0;	
		let zcql = catalystApp.zcql();

		//Fetch the User ID from mobile number
		// let query = "SELECT ROWID FROM Users where Mobile='"+mobile+"' and IsActive != false";
		// console.debug((new Date()).toString()+"|"+prependToLog,"Get User Details: "+query);
		
        // //Execute Query
		// zcql.executeZCQLQuery(query)
        User.findOne({ Mobile: mobile, IsActive: { $ne: false } }, 'ROWID')
        .then(async (user) => {
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
                    const userROWID = (user[0].Users)["ROWID"]
                    
                    await Configurations.find({"Name" : { $in : ["MaxCFUAttempts", "MaxCFUQuestions"]},SystemPromptROWID:requestBody["TopicID"]})
                    .then((rows) => {
                        if(!Array.isArray(topicConfiguration) && (topicConfiguration!=null)){
                            responseJSON['OperationStatus']='FAILED_TO_GET_TOPIC_CFG'
                            responseJSON['StatusDescription']=topicConfiguration
                            sendResponse(prependToLog,responseJSON,startTimeStamp,requestBody,res)
                        }
                        else{ 
                            const maxAttempts = topicConfiguration.length == 0 ? -1 : topicConfiguration.some(record=>record.Configurations.Name == 'MaxCFUAttempts') ? (topicConfiguration.filter(record=>record.Configurations.Name == 'MaxCFUAttempts'))[0]['Configurations']['Value']:-1
                            const maxQuestions = topicConfiguration.length == 0 ? -1 : topicConfiguration.some(record=>record.Configurations.Name == 'MaxCFUQuestions') ? (topicConfiguration.filter(record=>record.Configurations.Name == 'MaxCFUQuestions'))[0]['Configurations']['Value']:-1

                            console.info((new Date()).toString()+"|"+prependToLog,"MaxAttempts="+maxAttempts+" | MaxQuestions="+maxQuestions)

                            query = "Select ROWID, NextQuestionROWID, IsAssessmentComplete from UserAssessmentLogs where SystemPromptROWID = '"+requestBody["TopicID"]+"' and UserROWID = '"+userROWID+"'"
                            console.debug((new Date()).toString()+"|"+prependToLog,"Get Total Attempts for SystemPrompt/Topic: "+query);
                            zcql.executeZCQLQuery(query)
                            .then((topicAttempts) => {
                                if(!Array.isArray(topicAttempts) && (topicAttempts!=null)){
                                    responseJSON['OperationStatus']='FAILED_TO_GET_ATTMPTS'
                                    responseJSON['StatusDescription']=topicAttempts
                                    sendResponse(prependToLog,responseJSON,startTimeStamp,requestBody,res)
                                }
                                else{
                                    console.info((new Date()).toString()+"|"+prependToLog,"Total Attempts for SystemPrompt/Topic: "+topicAttempts.length);
                                    const completedAttempts = Array.isArray(topicAttempts) ? topicAttempts.filter(attempt=>attempt.UserAssessmentLogs.IsAssessmentComplete==true) : []
                                    console.info((new Date()).toString()+"|"+prependToLog,"Total Complete Attempts for SystemPrompt/Topic: "+completedAttempts.length);
                                    if((maxAttempts!=-1)&&(completedAttempts.length>=maxAttempts)){
                                        responseJSON['OperationStatus']='MAX_ATTMPTS_RCHD';
                                        responseJSON['StatusDescription']='Maximum '+maxAttempts+" completed by User";
                                        console.info((new Date()).toString()+"|"+prependToLog,"End of Execution")
                                        sendResponse(prependToLog,responseJSON,startTimeStamp,requestBody,res)
                                    }
                                    else{
                                        query = "SELECT QuestionBank.ResponseTimeOut, QuestionBank.ROWID, QuestionBank.Question, "
                                                +"QuestionBank.QuestionType, QuestionBank.avURL, QuestionBank.ResponseFormat, QuestionBank.Tags, "
                                                +"QuestionBank.ImageURL, QuestionBank.Options, QuestionBank.AskingOrder "
                                                +"FROM QuestionBank "
                                                +"where SystemPromptROWID='"+requestBody["TopicID"]+"'"
                                        console.debug((new Date()).toString()+"|"+prependToLog,"Get SystemPrompt/Topic and Question Details: "+query);
                                        zcql.executeZCQLQuery(query)
                                        .then(async (questionBank) => {
                                            if(!Array.isArray(questionBank) && (questionBank!=null)){
                                                responseJSON['OperationStatus']='FAILED_TO_GET_QUEST'
                                                responseJSON['StatusDescription']=questionBank
                                                sendResponse(prependToLog,responseJSON,startTimeStamp,requestBody,res)
                                            }
                                            else if(questionBank.length == 0){
                                                responseJSON['OperationStatus']='QUESTION_NOT_CONFIGURED';
                                                sendResponse(prependToLog,responseJSON,startTimeStamp,requestBody,res)
                                            }
                                            else{
                                                const pendingUserAssessmentLogs = Array.isArray(topicAttempts) ? topicAttempts.filter(attempt=>attempt.UserAssessmentLogs.IsAssessmentComplete==false) : []
                                                console.info((new Date()).toString()+"|"+prependToLog,"Total Incomplete Attempts for SystemPrompt/Topic: "+pendingUserAssessmentLogs.length);
                                                    
                                                var questionRecord = []
                                                responseJSON["UserAssessmentLogID"] = null
                                                var previousResponsesResult = null

                                                //If no active assessment, then initiate a new assessment
                                                if(pendingUserAssessmentLogs.length == 0){

                                                    console.info((new Date()).toString()+"|"+prependToLog,"No pending Assessment for User");
                                                    
                                                    //Get 1st question to be asked
                                                    questionRecord = questionBank.filter(record=>record.QuestionBank.AskingOrder==1) 
                                                    //If all the questions are to be asked randomly, select 1
                                                    if(questionRecord.length==0){
                                                        const randomIndex = Math.floor(Math.random()*(questionBank.length-1))
                                                        questionRecord.push(questionBank[randomIndex])
                                                        console.info((new Date()).toString()+"|"+prependToLog,"No Asking Order = 1. All questions to be asked randonly. Selected Question ROWID = "+questionRecord[0]['QuestionBank']['ROWID']);
                                                    }

                                                    let newUserAssessmentLogData = {
                                                        UserROWID: userROWID,
                                                        SystemPromptROWID: requestBody['TopicID'],
                                                        IsAssessmentComplete: false,
                                                        AssessmentCompletionReason: null,
                                                        NextQuestionROWID: questionRecord[0]['QuestionBank']['ROWID'], //If answer of 1st question could not be saved, ask the 1st question again
                                                        SessionID: requestBody['SessionID']
                                                    }
                                                    try{
                                                        let table = catalystApp.datastore().table('UserAssessmentLogs')
                                                        const inserted = await table.insertRow(newUserAssessmentLogData)
                                                        if(typeof inserted['ROWID']==='undefined')
                                                            console.info((new Date()).toString()+"|"+prependToLog,'Status of New User Assessment Log Creation =',inserted)
                                                        else{
                                                            responseJSON["UserAssessmentLogID"] = inserted['ROWID']
                                                            responseJSON['OperationStatus']='NEW_ASSESSMENT'
                                                            responseJSON['QuestionNumber']=1

                                                            console.info((new Date()).toString()+"|"+prependToLog,'Created New User Assessment Log:'+responseJSON["UserAssessmentLogID"])
                                                        }
                                                    }
                                                    catch(error){
                                                        console.error((new Date()).toString()+"|"+prependToLog,'Could not create New User Assessment Log. Error',error)
                                                    }
                                                }
                                                else if(pendingUserAssessmentLogs[0]['UserAssessmentLogs']['NextQuestionROWID']==null){
                                                    console.info((new Date()).toString()+"|"+prependToLog,"Reached End of Assessment. No next question.")
                                                    responseJSON['OperationStatus']='END_OF_ASSESSMENT'
                                                    responseJSON["UserAssessmentLogID"] = pendingUserAssessmentLogs[0]['UserAssessmentLogs']['ROWID']
                                                }
                                                else{
                                                    //Assing the log id
                                                    responseJSON["UserAssessmentLogID"] = pendingUserAssessmentLogs[0]['UserAssessmentLogs']['ROWID']
                                                    
                                                    console.info((new Date()).toString()+"|"+prependToLog,"Assessment pending for User:"+responseJSON["UserAssessmentLogID"]);

                                                    try{

                                                        query = "Select distinct QuestionROWID, ResponseText from UserAssessment where ((ErrorInResponse is null) or (ErrorInResponse='')) and UserAssessmentLogROWID = '"+responseJSON["UserAssessmentLogID"]+"'"
                                                        previousResponsesResult = await zcql.executeZCQLQuery(query)
                                                        if(!Array.isArray(previousResponsesResult)){
                                                            console.info((new Date()).toString()+"|"+prependToLog,'Failed to get the responses for the assessment =',responses)
                                                            responseJSON['OperationStatus']='FAILED_TO_GET_PREV_ANS'
                                                        }
                                                        else{
                                                            const previousQuestions = previousResponsesResult.map(data=>data.UserAssessment.QuestionROWID).filter(unique)
                                                            if((maxQuestions!=-1)&&(previousResponsesResult.length >= maxQuestions)){
                                                                console.info((new Date()).toString()+"|"+prependToLog,"Max "+maxQuestions+" already answered by User")
                                                                responseJSON['OperationStatus']='END_OF_ASSESSMENT'
                                                            }
                                                            else{
                                                                //Get the data of next question to be asked
                                                                questionRecord = questionBank.filter(record=>record.QuestionBank.ROWID==pendingUserAssessmentLogs[0]['UserAssessmentLogs']['NextQuestionROWID'])
                                                                responseJSON['OperationStatus']='CONTINUED_ASSESSMENT'
                                                                responseJSON['QuestionNumber']=previousQuestions.length+1
                                                            }
                                                        }
                                                    }
                                                    catch(error){
                                                        console.error((new Date()).toString()+"|"+prependToLog,'Could not create New User Assessment Log. Error',error)
                                                    }
                                                }
                                                
                                                if(responseJSON["UserAssessmentLogID"]==null){ //User Assessment Log not active and no new log could be created. Return Error 
                                                    responseJSON['OperationStatus']='FAILED_TO_CREATE_ASSESSMENT';
                                                    sendResponse(prependToLog,responseJSON,startTimeStamp,requestBody,res)
                                                }
                                                else if(['CONTINUED_ASSESSMENT','NEW_ASSESSMENT'].includes(responseJSON['OperationStatus'])){
                                                    responseJSON['QuestionIdentifier']=questionRecord[0].QuestionBank.ROWID;
                                                    responseJSON['Question']=decodeURI(questionRecord[0].QuestionBank.Question);
                                                    responseJSON['QuestionType']=questionRecord[0].QuestionBank.QuestionType;
                                                    responseJSON['QuestionAVURL']=questionRecord[0].QuestionBank.avURL;
                                                    responseJSON['QuestionImageURL']=questionRecord[0].QuestionBank.ImageURL;
                                                    responseJSON['ResponseFormat']=questionRecord[0].QuestionBank.ResponseFormat;
                                                    responseJSON['QuestionTags']=questionRecord[0].QuestionBank.Tags;
                                                    if((responseJSON['ResponseFormat']=='Button')||(responseJSON['ResponseFormat']=='List')){
                                                        //Button texts are in an Options cell in Question Bank, sepearetd by newline
                                                        const buttonOptionsArray = (decodeURI(questionRecord[0].QuestionBank.Options)).toString().split("\n")
                                                        responseJSON['QuestionOptionsCount']=buttonOptionsArray.length
                                                        for(let j=0; j<buttonOptionsArray.length; j++)
                                                        {
                                                            responseJSON['QuestionOption'+(j+1)] = buttonOptionsArray.length > 3 ? buttonOptionsArray[j].toString().substr(0,23) : buttonOptionsArray[j].toString().substr(0,20)
                                                        }
                                                    }                
                                                    if(questionRecord[0].QuestionBank.ResponseTimeOut!=null)
                                                        responseJSON['QuestionTimeOut']=questionRecord[0].QuestionBank.ResponseTimeOut

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
                                                                        const questionRecord = questionBank.filter(record=>record.QuestionBank.AskingOrder == askingOrder)
                                                                        var answers = previousResponsesResult.filter(record=>record.UserAssessment.QuestionROWID == questionRecord[0]['QuestionBank']['ROWID'])
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
                                                                console.info((new Date()).toString()+"|"+prependToLog,'Sending question '+questionRecord[0].QuestionBank.ROWID+" for Assessment "+responseJSON["UserAssessmentLogID"])
                                                                sendResponse(prependToLog,responseJSON,startTimeStamp,requestBody,res)
                                                            }
                                                            else{
                                                                console.info((new Date()).toString()+"|"+prependToLog,'Sending question '+questionRecord[0].QuestionBank.ROWID+" for Assessment "+responseJSON["UserAssessmentLogID"])
                                                                sendResponse(prependToLog,responseJSON,startTimeStamp,requestBody,res)
                                                            }
                                                        }
                                                        else{
                                                            console.info((new Date()).toString()+"|"+prependToLog,'Sending question '+questionRecord[0].QuestionBank.ROWID+" for Assessment "+responseJSON["UserAssessmentLogID"])
                                                            sendResponse(prependToLog,responseJSON,startTimeStamp,requestBody,res)
                                                        }
                                                    }
                                                    else{
                                                        console.info((new Date()).toString()+"|"+prependToLog,'Sending question '+questionRecord[0].QuestionBank.ROWID+" for Assessment "+responseJSON["UserAssessmentLogID"])
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
                                console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error in Getting Topic Attempts");
                                console.error((new Date()).toString()+"|"+prependToLog,"End of Execution with Error: ",err);
                                res.status(500).send(err);
                            });
                        }	
                    })
                    .catch((err) =>{
                        console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error in Getting Configurations for Topic");
                        console.error((new Date()).toString()+"|"+prependToLog,"End of Execution with Error: ",err);
                        res.status(500).send(err);
                    });
                    // query = "Select Name, Value from Configurations where Name in ('MaxCFUAttempts','MaxCFUQuestions') and SystemPromptROWID = '"+requestBody["TopicID"]+"'"
                    // console.debug((new Date()).toString()+"|"+prependToLog,"Get SystemPrompt/Topic Configurations: "+query);
                    // zcql.executeZCQLQuery(query)
                    // .then((topicConfiguration) => {
                    //     if(!Array.isArray(topicConfiguration) && (topicConfiguration!=null)){
                    //         responseJSON['OperationStatus']='FAILED_TO_GET_TOPIC_CFG'
                    //         responseJSON['StatusDescription']=topicConfiguration
                    //         sendResponse(prependToLog,responseJSON,startTimeStamp,requestBody,res)
                    //     }
                    //     else{ 
                    //         const maxAttempts = topicConfiguration.length == 0 ? -1 : topicConfiguration.some(record=>record.Configurations.Name == 'MaxCFUAttempts') ? (topicConfiguration.filter(record=>record.Configurations.Name == 'MaxCFUAttempts'))[0]['Configurations']['Value']:-1
                    //         const maxQuestions = topicConfiguration.length == 0 ? -1 : topicConfiguration.some(record=>record.Configurations.Name == 'MaxCFUQuestions') ? (topicConfiguration.filter(record=>record.Configurations.Name == 'MaxCFUQuestions'))[0]['Configurations']['Value']:-1

                    //         console.info((new Date()).toString()+"|"+prependToLog,"MaxAttempts="+maxAttempts+" | MaxQuestions="+maxQuestions)

                    //         query = "Select ROWID, NextQuestionROWID, IsAssessmentComplete from UserAssessmentLogs where SystemPromptROWID = '"+requestBody["TopicID"]+"' and UserROWID = '"+userROWID+"'"
                    //         console.debug((new Date()).toString()+"|"+prependToLog,"Get Total Attempts for SystemPrompt/Topic: "+query);
                    //         zcql.executeZCQLQuery(query)
                    //         .then((topicAttempts) => {
                    //             if(!Array.isArray(topicAttempts) && (topicAttempts!=null)){
                    //                 responseJSON['OperationStatus']='FAILED_TO_GET_ATTMPTS'
                    //                 responseJSON['StatusDescription']=topicAttempts
                    //                 sendResponse(prependToLog,responseJSON,startTimeStamp,requestBody,res)
                    //             }
                    //             else{
                    //                 console.info((new Date()).toString()+"|"+prependToLog,"Total Attempts for SystemPrompt/Topic: "+topicAttempts.length);
                    //                 const completedAttempts = Array.isArray(topicAttempts) ? topicAttempts.filter(attempt=>attempt.UserAssessmentLogs.IsAssessmentComplete==true) : []
                    //                 console.info((new Date()).toString()+"|"+prependToLog,"Total Complete Attempts for SystemPrompt/Topic: "+completedAttempts.length);
                    //                 if((maxAttempts!=-1)&&(completedAttempts.length>=maxAttempts)){
                    //                     responseJSON['OperationStatus']='MAX_ATTMPTS_RCHD';
                    //                     responseJSON['StatusDescription']='Maximum '+maxAttempts+" completed by User";
                    //                     console.info((new Date()).toString()+"|"+prependToLog,"End of Execution")
                    //                     sendResponse(prependToLog,responseJSON,startTimeStamp,requestBody,res)
                    //                 }
                    //                 else{
                    //                     query = "SELECT QuestionBank.ResponseTimeOut, QuestionBank.ROWID, QuestionBank.Question, "
                    //                             +"QuestionBank.QuestionType, QuestionBank.avURL, QuestionBank.ResponseFormat, QuestionBank.Tags, "
                    //                             +"QuestionBank.ImageURL, QuestionBank.Options, QuestionBank.AskingOrder "
                    //                             +"FROM QuestionBank "
                    //                             +"where SystemPromptROWID='"+requestBody["TopicID"]+"'"
                    //                     console.debug((new Date()).toString()+"|"+prependToLog,"Get SystemPrompt/Topic and Question Details: "+query);
                    //                     zcql.executeZCQLQuery(query)
                    //                     .then(async (questionBank) => {
                    //                         if(!Array.isArray(questionBank) && (questionBank!=null)){
                    //                             responseJSON['OperationStatus']='FAILED_TO_GET_QUEST'
                    //                             responseJSON['StatusDescription']=questionBank
                    //                             sendResponse(prependToLog,responseJSON,startTimeStamp,requestBody,res)
                    //                         }
                    //                         else if(questionBank.length == 0){
                    //                             responseJSON['OperationStatus']='QUESTION_NOT_CONFIGURED';
                    //                             sendResponse(prependToLog,responseJSON,startTimeStamp,requestBody,res)
                    //                         }
                    //                         else{
                    //                             const pendingUserAssessmentLogs = Array.isArray(topicAttempts) ? topicAttempts.filter(attempt=>attempt.UserAssessmentLogs.IsAssessmentComplete==false) : []
                    //                             console.info((new Date()).toString()+"|"+prependToLog,"Total Incomplete Attempts for SystemPrompt/Topic: "+pendingUserAssessmentLogs.length);
                                                    
                    //                             var questionRecord = []
                    //                             responseJSON["UserAssessmentLogID"] = null
                    //                             var previousResponsesResult = null

                    //                             //If no active assessment, then initiate a new assessment
                    //                             if(pendingUserAssessmentLogs.length == 0){

                    //                                 console.info((new Date()).toString()+"|"+prependToLog,"No pending Assessment for User");
                                                    
                    //                                 //Get 1st question to be asked
                    //                                 questionRecord = questionBank.filter(record=>record.QuestionBank.AskingOrder==1) 
                    //                                 //If all the questions are to be asked randomly, select 1
                    //                                 if(questionRecord.length==0){
                    //                                     const randomIndex = Math.floor(Math.random()*(questionBank.length-1))
                    //                                     questionRecord.push(questionBank[randomIndex])
                    //                                     console.info((new Date()).toString()+"|"+prependToLog,"No Asking Order = 1. All questions to be asked randonly. Selected Question ROWID = "+questionRecord[0]['QuestionBank']['ROWID']);
                    //                                 }

                    //                                 let newUserAssessmentLogData = {
                    //                                     UserROWID: userROWID,
                    //                                     SystemPromptROWID: requestBody['TopicID'],
                    //                                     IsAssessmentComplete: false,
                    //                                     AssessmentCompletionReason: null,
                    //                                     NextQuestionROWID: questionRecord[0]['QuestionBank']['ROWID'], //If answer of 1st question could not be saved, ask the 1st question again
                    //                                     SessionID: requestBody['SessionID']
                    //                                 }
                    //                                 try{
                    //                                     let table = catalystApp.datastore().table('UserAssessmentLogs')
                    //                                     const inserted = await table.insertRow(newUserAssessmentLogData)
                    //                                     if(typeof inserted['ROWID']==='undefined')
                    //                                         console.info((new Date()).toString()+"|"+prependToLog,'Status of New User Assessment Log Creation =',inserted)
                    //                                     else{
                    //                                         responseJSON["UserAssessmentLogID"] = inserted['ROWID']
                    //                                         responseJSON['OperationStatus']='NEW_ASSESSMENT'
                    //                                         responseJSON['QuestionNumber']=1

                    //                                         console.info((new Date()).toString()+"|"+prependToLog,'Created New User Assessment Log:'+responseJSON["UserAssessmentLogID"])
                    //                                     }
                    //                                 }
                    //                                 catch(error){
                    //                                     console.error((new Date()).toString()+"|"+prependToLog,'Could not create New User Assessment Log. Error',error)
                    //                                 }
                    //                             }
                    //                             else if(pendingUserAssessmentLogs[0]['UserAssessmentLogs']['NextQuestionROWID']==null){
                    //                                 console.info((new Date()).toString()+"|"+prependToLog,"Reached End of Assessment. No next question.")
                    //                                 responseJSON['OperationStatus']='END_OF_ASSESSMENT'
                    //                                 responseJSON["UserAssessmentLogID"] = pendingUserAssessmentLogs[0]['UserAssessmentLogs']['ROWID']
                    //                             }
                    //                             else{
                    //                                 //Assing the log id
                    //                                 responseJSON["UserAssessmentLogID"] = pendingUserAssessmentLogs[0]['UserAssessmentLogs']['ROWID']
                                                    
                    //                                 console.info((new Date()).toString()+"|"+prependToLog,"Assessment pending for User:"+responseJSON["UserAssessmentLogID"]);

                    //                                 try{

                    //                                     query = "Select distinct QuestionROWID, ResponseText from UserAssessment where ((ErrorInResponse is null) or (ErrorInResponse='')) and UserAssessmentLogROWID = '"+responseJSON["UserAssessmentLogID"]+"'"
                    //                                     previousResponsesResult = await zcql.executeZCQLQuery(query)
                    //                                     if(!Array.isArray(previousResponsesResult)){
                    //                                         console.info((new Date()).toString()+"|"+prependToLog,'Failed to get the responses for the assessment =',responses)
                    //                                         responseJSON['OperationStatus']='FAILED_TO_GET_PREV_ANS'
                    //                                     }
                    //                                     else{
                    //                                         const previousQuestions = previousResponsesResult.map(data=>data.UserAssessment.QuestionROWID).filter(unique)
                    //                                         if((maxQuestions!=-1)&&(previousResponsesResult.length >= maxQuestions)){
                    //                                             console.info((new Date()).toString()+"|"+prependToLog,"Max "+maxQuestions+" already answered by User")
                    //                                             responseJSON['OperationStatus']='END_OF_ASSESSMENT'
                    //                                         }
                    //                                         else{
                    //                                             //Get the data of next question to be asked
                    //                                             questionRecord = questionBank.filter(record=>record.QuestionBank.ROWID==pendingUserAssessmentLogs[0]['UserAssessmentLogs']['NextQuestionROWID'])
                    //                                             responseJSON['OperationStatus']='CONTINUED_ASSESSMENT'
                    //                                             responseJSON['QuestionNumber']=previousQuestions.length+1
                    //                                         }
                    //                                     }
                    //                                 }
                    //                                 catch(error){
                    //                                     console.error((new Date()).toString()+"|"+prependToLog,'Could not create New User Assessment Log. Error',error)
                    //                                 }
                    //                             }
                                                
                    //                             if(responseJSON["UserAssessmentLogID"]==null){ //User Assessment Log not active and no new log could be created. Return Error 
                    //                                 responseJSON['OperationStatus']='FAILED_TO_CREATE_ASSESSMENT';
                    //                                 sendResponse(prependToLog,responseJSON,startTimeStamp,requestBody,res)
                    //                             }
                    //                             else if(['CONTINUED_ASSESSMENT','NEW_ASSESSMENT'].includes(responseJSON['OperationStatus'])){
                    //                                 responseJSON['QuestionIdentifier']=questionRecord[0].QuestionBank.ROWID;
                    //                                 responseJSON['Question']=decodeURI(questionRecord[0].QuestionBank.Question);
                    //                                 responseJSON['QuestionType']=questionRecord[0].QuestionBank.QuestionType;
                    //                                 responseJSON['QuestionAVURL']=questionRecord[0].QuestionBank.avURL;
                    //                                 responseJSON['QuestionImageURL']=questionRecord[0].QuestionBank.ImageURL;
                    //                                 responseJSON['ResponseFormat']=questionRecord[0].QuestionBank.ResponseFormat;
                    //                                 responseJSON['QuestionTags']=questionRecord[0].QuestionBank.Tags;
                    //                                 if((responseJSON['ResponseFormat']=='Button')||(responseJSON['ResponseFormat']=='List')){
                    //                                     //Button texts are in an Options cell in Question Bank, sepearetd by newline
                    //                                     const buttonOptionsArray = (decodeURI(questionRecord[0].QuestionBank.Options)).toString().split("\n")
                    //                                     responseJSON['QuestionOptionsCount']=buttonOptionsArray.length
                    //                                     for(let j=0; j<buttonOptionsArray.length; j++)
                    //                                     {
                    //                                         responseJSON['QuestionOption'+(j+1)] = buttonOptionsArray.length > 3 ? buttonOptionsArray[j].toString().substr(0,23) : buttonOptionsArray[j].toString().substr(0,20)
                    //                                     }
                    //                                 }                
                    //                                 if(questionRecord[0].QuestionBank.ResponseTimeOut!=null)
                    //                                     responseJSON['QuestionTimeOut']=questionRecord[0].QuestionBank.ResponseTimeOut

                    //                                 //If it's a continued assessment
                    //                                 if(responseJSON['OperationStatus']=='CONTINUED_ASSESSMENT'){
                    //                                     if(responseJSON['Question'].indexOf('{{') > -1)
                    //                                     {
                    //                                         console.info((new Date()).toString()+"|"+prependToLog,'Substituting tokens in question '+responseJSON['Question'])

                    //                                         //Get the token to be substituted
                    //                                         const nextQuestionSubstitutionToken = ((responseJSON['Question'].split("{{"))[1].split('}}'))[0]

                    //                                         console.info((new Date()).toString()+"|"+prependToLog,'Substitutions Tokens = ',nextQuestionSubstitutionToken)
                                                            
                    //                                         if(nextQuestionSubstitutionToken.includes("Q"))//Its a question 
                    //                                         {
                    //                                             console.info((new Date()).toString()+"|"+prependToLog,"Question Response to be substituded = ",nextQuestionSubstitutionToken)
                    //                                             var rhsTokens = nextQuestionSubstitutionToken.split("Q")
                    //                                             rhsTokens = rhsTokens.filter(token=>token.toString().trim().length>0)
                    //                                             const expressionTokens = rhsTokens.map(data=>{
                    //                                                 const askingOrder = data.replace(/[%*^+() -]/g,"")
                    //                                                 if(askingOrder.length==0)
                    //                                                     return data
                    //                                                 else{
                    //                                                     const questionRecord = questionBank.filter(record=>record.QuestionBank.AskingOrder == askingOrder)
                    //                                                     var answers = previousResponsesResult.filter(record=>record.UserAssessment.QuestionROWID == questionRecord[0]['QuestionBank']['ROWID'])
                    //                                                     try{
                    //                                                         return data.replace(askingOrder,answers[0]['UserAssessment']['ResponseText'])
                    //                                                     }
                    //                                                     catch(e){
                    //                                                         return data.replace(askingOrder,0)
                    //                                                     }
                    //                                                 }
                    //                                             })
                    //                                             console.info((new Date()).toString()+"|"+prependToLog,"Substituted Expression = ",expressionTokens.join(""))
                    //                                             const expressionValue = math.evaluate(expressionTokens.join(""))
                    //                                             console.info((new Date()).toString()+"|"+prependToLog,"Value to be Substituted = ",expressionValue)
                    //                                             //Substitute the latest value in question
                    //                                             responseJSON['Question'] = responseJSON['Question'].replace("{{"+nextQuestionSubstitutionToken+"}}",expressionValue)
                    //                                             console.info((new Date()).toString()+"|"+prependToLog,'Sending question '+questionRecord[0].QuestionBank.ROWID+" for Assessment "+responseJSON["UserAssessmentLogID"])
                    //                                             sendResponse(prependToLog,responseJSON,startTimeStamp,requestBody,res)
                    //                                         }
                    //                                         else{
                    //                                             console.info((new Date()).toString()+"|"+prependToLog,'Sending question '+questionRecord[0].QuestionBank.ROWID+" for Assessment "+responseJSON["UserAssessmentLogID"])
                    //                                             sendResponse(prependToLog,responseJSON,startTimeStamp,requestBody,res)
                    //                                         }
                    //                                     }
                    //                                     else{
                    //                                         console.info((new Date()).toString()+"|"+prependToLog,'Sending question '+questionRecord[0].QuestionBank.ROWID+" for Assessment "+responseJSON["UserAssessmentLogID"])
                    //                                         sendResponse(prependToLog,responseJSON,startTimeStamp,requestBody,res)
                    //                                     }
                    //                                 }
                    //                                 else{
                    //                                     console.info((new Date()).toString()+"|"+prependToLog,'Sending question '+questionRecord[0].QuestionBank.ROWID+" for Assessment "+responseJSON["UserAssessmentLogID"])
                    //                                     sendResponse(prependToLog,responseJSON,startTimeStamp,requestBody,res)
                    //                                 }
                    //                             }
                    //                             else
                    //                             {
                    //                                 sendResponse(prependToLog,responseJSON,startTimeStamp,requestBody,res)
                    //                             }
                    //                         }
                    //                     }).catch((err) => {
                    //                         console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error in Getting Questions");
                    //                         console.error((new Date()).toString()+"|"+prependToLog,"End of Execution with Error: ",err);
                    //                         res.status(500).send(err);
                    //                     });		
                    //                 }
                    //             }
                    //         }).catch((err) => {
                    //             console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error in Getting Topic Attempts");
                    //             console.error((new Date()).toString()+"|"+prependToLog,"End of Execution with Error: ",err);
                    //             res.status(500).send(err);
                    //         });
                    //     }	
                    // }).catch((err) => {
                    //     console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error in Getting Configurations for Topic");
                    //     console.error((new Date()).toString()+"|"+prependToLog,"End of Execution with Error: ",err);
                    //     res.status(500).send(err);
                    // });                     
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
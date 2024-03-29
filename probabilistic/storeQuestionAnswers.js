"use strict";

const express = require("express");
// const catalyst = require('zcatalyst-sdk-node');
//const catalyst = require("zoho-catalyst-sdk");
const storeAudioFileinGCS = require("./common/storeAudioFileinGCS.js");
const convertSpeechToText = require("./common/convertSpeechToText.js");
const sendResponseToGlific = require("./common/sendResponseToGlific.js");
const UserAssessmentLog = require("./models/UserAssessmentLogs.js");
const UserAssessment = require("./models/UserAssessment.js");
const Question = require("./models/questionBank.js");
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
// const app = express();
// app.use(express.json());
const bodyParser = require('body-parser')
const math = require("mathjs");
const convertTextToSpeech = require("./common/convertTextToSpeech.js");

const app = express.Router();

//Filter unique elements in an array
const unique = (value, index, self) => {
  return self.indexOf(value) === index;
};

const intRegEx = /^-?[0-9]+$/
const floatRegEx = /^[-+]?[0-9]+\.[0-9]+$/

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


const sendResponse = (prependToLog,responseJSON,startTimeStamp,requestBody, res) => {
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
                storedanswer: responseJSON,
            }),
        })
        .then((glificResponse) => {})
        .catch((error) => console.info((new Date()).toString()+"|"+prependToLog,"Error returned from Glific: ", error));
    }
    return true
}

app.post("/", (req, res) => {
    
    let startTimeStamp = new Date();
   // //let catalystApp = catalyst.initialize(req, { type: catalyst.type.applogic });
    
    let requestBody = req.body;
 
    //Prepare text to prepend with logs
    const params = ["storeQuestionAnswers",requestBody["UserAssessmentLogID"],""]
    const prependToLog = params.join(" | ")
    
    console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")
    
    //Initialize Response Object
    var responseJSON = {
        "OperationStatus":"SUCCESS"
    }

    const missingParams = checkKey(["Mobile", "UserAssessmentLogID", "QuestionIdentifier","Attempt", "ResponseFormat"],requestBody)

    if(missingParams.length>0){
        responseJSON['OperationStatus'] = "REQ_ERR"
        responseJSON['StatusDescription'] = "Missing field - "+missingParams.join(",")
        sendResponse(prependToLog,responseJSON,startTimeStamp,requestBody, res)
    }
    else {

        const contactName = requestBody["contact"] ? requestBody["contact"]["name"] : ""
	    const wrongAnswers = parseInt(requestBody["Attempt"])
        requestBody['UserAssessmentLogID'] = new ObjectId(requestBody['UserAssessmentLogID']);
        requestBody['QuestionIdentifier'] = new ObjectId(requestBody['QuestionIdentifier']);

       // let zcql = catalystApp.zcql()


        // let query = "SELECT UserAssessmentLogs.UserROWID, UserAssessmentLogs.SystemPromptROWID, UserAssessmentLogs.QuestionsAsked, "
        //             +"UserAssessment.QuestionROWID, UserAssessment.ErrorInResponse, UserAssessment.ResponseText "
        //             +"FROM UserAssessmentLogs "
        //             +"left join UserAssessment on UserAssessmentLogs.ROWID = UserAssessment.UserAssessmentLogROWID "
        //             +"where IsAssessmentComplete = false and ROWID='"+requestBody["UserAssessmentLogID"]+"'"

        // console.debug((new Date()).toString()+"|"+prependToLog,"Get Assessment Details: "+query);

        // zcql.executeZCQLQuery(query)\
      
        UserAssessmentLog.aggregate([
            {
              $match: {
                IsAssessmentComplete: false,
                _id: new ObjectId(requestBody['UserAssessmentLogID']),
              },
            },
            {
              $lookup: {
                from: 'UserAssessments',
                localField: '_id',
                foreignField: 'UserAssessmentLogROWID',
                as: 'UserAssessment',
              },
            },
            {
              $unwind: {
                'path': '$UserAssessment', 
                'preserveNullAndEmptyArrays': true
              }
            },
            {
              $project: {
                UserROWID: '$UserROWID',
                SystemPromptROWID: '$SystemPromptROWID',
                QuestionsAsked: '$QuestionsAsked',
                QuestionROWID: '$UserAssessment.QuestionROWID',
                ErrorInResponse: '$UserAssessment.ErrorInResponse',
                ResponseText: '$UserAssessment.ResponseText',
              },
            },
          ])
          
        .then((userAssessmentLog)=>{
            console.info((new Date()).toString()+"|"+prependToLog,"userAssessmentLog",requestBody['UserAssessmentLogID'],userAssessmentLog);
            if(Object.keys(userAssessmentLog).length === 0){
                responseJSON['OperationStatus']='FAILED_TO_GET_ASSMNTLOG'
                responseJSON['StatusDescription']=userAssessmentLog
                sendResponse(prependToLog,responseJSON,startTimeStamp,requestBody, res)
            }
            else{
                let questionsAsked = userAssessmentLog[0]['QuestionsAsked'] == null ? []:userAssessmentLog[0]['QuestionsAsked'].split(",")
                const userROWID = userAssessmentLog[0]['UserROWID']
                const topicID = userAssessmentLog[0]['SystemPromptROWID']
                console.info((new Date()).toString()+"|"+prependToLog,"Total Assessment Records: "+userAssessmentLog.length," | Questions Asked: ",questionsAsked," | User ID: "+userROWID," | SystemPrompt ID: "+topicID);
                var previousResponses = userAssessmentLog.filter(data=>((data.ErrorInResponse == '') || (data.ErrorInResponse == null))&&(data.QuestionROWID!=null))
                if(previousResponses.length==0)
                    console.info((new Date()).toString()+"|"+prependToLog,"Either it's first question or no correct response could be captured at all")
                
                // query = "Select ROWID, AskingOrder, SkipLogic, ResponseValidations, ResponseFormat, Question, "
                //         +"Answers, Options, Feedback, IsEvaluative "
                //         +"from QuestionBank where SystemPromptROWID='"+topicID+"' order by AskingOrder asc"
                // console.debug((new Date()).toString()+"|"+prependToLog,"Fetching questions configured for SystemPromptROWID = "+topicID+" : "+query);
                // zcql.executeZCQLQuery(query)
                Question.find({ SystemPromptROWID: topicID })
                .sort({ AskingOrder: 1 })
                .select('ROWID AskingOrder SkipLogic ResponseValidations ResponseFormat Question Answers Options Feedback IsEvaluative')
                 .then((questionBank)=>{
                    if(!Array.isArray(questionBank) && (questionBank!=null)){
                        responseJSON['OperationStatus']='FAILED_TO_GET_QUEST'
                        responseJSON['StatusDescription']=questionBank
                        sendResponse(prependToLog,responseJSON,startTimeStamp,requestBody, res)
                    }
                    else{
                        console.info((new Date()).toString()+"|"+prependToLog,"Fetched questions configured for SystemPromptROWID = "+topicID);
                        //Get the current question fields
                        const currentQuestion = questionBank.filter(record=>record.id == requestBody['QuestionIdentifier'])
                        const currentQuestionAskingOrder = currentQuestion[0]['AskingOrder']                                                
                        const skipLogic = JSON.parse((currentQuestion[0])['SkipLogic'])
                        const validations = JSON.parse((currentQuestion[0])['ResponseValidations'])
                        const responseFormat = (currentQuestion[0])['ResponseFormat']
                        const question = decodeURI((currentQuestion[0])['Question'])
                        const answers = (currentQuestion[0])['Answers']==null?'':decodeURI((currentQuestion[0])['Answers'])
                        const buttonOptions = (currentQuestion[0])['Options']==null?'':decodeURI((currentQuestion[0])['Options'])
                        const responseAudioURL = (typeof requestBody['ResponseAVURL']==='undefined') ? "":requestBody['ResponseAVURL']
                        const responseText = (typeof requestBody['ResponseText']==='undefined') ? "":requestBody['ResponseText']
                        const typeOfResponse = responseAudioURL.length != 0 ? 'Audio':(responseText.length != 0 ? (requestBody['ResponseFormat'] == "None" ? "Text" : requestBody['ResponseFormat']) : null)
                        var feedback = (((currentQuestion[0])['Feedback']==null) || ((currentQuestion[0])['Feedback'].length==0)) ?'None':((currentQuestion[0])['Feedback'].length>0 ? JSON.parse((currentQuestion[0])['Feedback']):null)
                        
                        
                        console.debug((new Date()).toString()+"|"+prependToLog,"Feedback:",feedback)
                            
                        var errorFeedback, successFeedback, errorAVURL, successAVURL
                        try{
                            errorFeedback = feedback==null?'None':('onError' in feedback ? decodeURI(feedback['onError']):'None')
                            errorFeedback = (errorFeedback.length>0)&&(errorFeedback!="null")?errorFeedback:'None'
                            errorAVURL = feedback==null?'None':(('onErrorAVURL' in feedback) ? (feedback['onErrorAVURL']==null ? 'None':decodeURI(feedback['onErrorAVURL'])):'None')
                            successFeedback = feedback==null?'None':('onSuccess' in feedback ? decodeURI(feedback['onSuccess']):'None')
                            successFeedback = (successFeedback.length>0)&&(successFeedback!="null")?successFeedback:'None'
                            successAVURL = feedback==null?'None':(('onSuccessAVURL' in feedback) ? (feedback['onSuccessAVURL']==null ? 'None':decodeURI(feedback['onSuccessAVURL'])):'None')
                        }catch(e){
                            feedback = JSON.parse(feedback)
                            errorFeedback = feedback==null?'None':('onError' in feedback ? decodeURI(feedback['onError']):'None')
                            errorFeedback = (errorFeedback.length>0)&&(errorFeedback!="null")?errorFeedback:'None'
                            errorAVURL = feedback==null?'None':(('onErrorAVURL' in feedback) ? (feedback['onErrorAVURL']==null ? 'None':decodeURI(feedback['onErrorAVURL'])):'None')
                            successFeedback = feedback==null?'None':('onSuccess' in feedback ? decodeURI(feedback['onSuccess']):'None')
                            successFeedback = (successFeedback.length>0)&&(successFeedback!="null")?successFeedback:'None'
                            successAVURL = feedback==null?'None':(('onSuccessAVURL' in feedback) ? (feedback['onSuccessAVURL']==null ? 'None':decodeURI(feedback['onSuccessAVURL'])):'None')
                        }
    					const isEvaluative = currentQuestion[0]['IsEvaluative']
		    			
                        const validateResponse = (validations,data,typeOfResponse,studentAssessmentLogID,questionsAsked,studentID,previousResponses,questionsInOrder) => {
                            return new Promise((resolve, reject)=>{
                                console.info((new Date()).toString()+"|"+prependToLog,"Validations: ",validations)
                    
                                //Parse the data for audio response valdation to JSON    
                                if(typeOfResponse == 'Audio'){
                                    if(data['status']=='Error'){
                                        responseJSON['ResponseValidationFailure']=data["errorDescription"]
                                        reject(responseJSON['OperationStatus']); 
                                        return
                                    }
                                }
                                else if(typeOfResponse == 'Integer'){
                                    data = {'text':parseInt(data)}
                                }
                                else if(typeOfResponse == 'Float'){
                                    data = {'text':parseFloat(data)}
                                }
                                else
                                    data = {'text':data.toString()}
                    
                                var isError = false
                                for(var i = 0 ; i<validations.length; i++)
                                {
                                    console.info((new Date()).toString()+"|"+prependToLog,"Applying Validation "+(i+1),validations[i].responseType == typeOfResponse)
                    
                                    if(validations[i].responseType == typeOfResponse)
                                    {
                                        const operation = validations[i].operation
                                        var lhsField = data[validations[i].operandLHS]
                                        var rhsField = validations[i].operandRHS
                                        console.info((new Date()).toString()+"|"+prependToLog,"Validation "+(i+1), ' | Operation=',operation," | LHS=",lhsField," | RHS=",rhsField)
                                        if(rhsField.includes("Q"))//Its a question on right hand side
                                        {
                                            console.info((new Date()).toString()+"|"+prependToLog,"Question Response to be substituded in RHS Expression = ",rhsField)
                                            var rhsTokens = rhsField.split("Q")
                                            rhsTokens = rhsTokens.filter(token=>token.toString().trim().length>0)
                                            const expressionTokens = rhsTokens.map(data=>{
                                                const askingOrder = data.replace(/[%*^+() -]/g,"")
                                                if(askingOrder.length==0)
                                                    return data
                                                else{
                                                    const questionRecord = questionsInOrder.filter(record=>record.AskingOrder == askingOrder)
                                                    var answers = previousResponses.filter(record=>record.UserAssessment.QuestionROWID == questionRecord[0]['QuestionBank']['QuestionROWID'])
                                                    try{
                                                        return data.replace(askingOrder,answers[0]['UserAssessment']['ResponseText'])
                                                    }
                                                    catch(e){
                                                        return data.replace(askingOrder,0)
                                                    }
                                                }
                                            })
                                            console.info((new Date()).toString()+"|"+prependToLog,"Substituted RHS Expression = ",expressionTokens.join(""))
                                            rhsField = math.evaluate(expressionTokens.join(""))
                                            console.info((new Date()).toString()+"|"+prependToLog,"RHS Value = ",rhsField)
                                        }
                                        if(operation == "word_count")
                                        {
                                            const tokens = lhsField.split(' ')
                                            if(tokens.length < rhsField)
                                            {
                                                isError = true;
                                                console.info((new Date()).toString()+"|"+prependToLog,'Error in Response Validation: Too few words in responseS \n Validation: '+validations[i])
                                            }
                                        }
                                        else if(operation == "max_word_count")
                                        {
                                            const tokens = lhsField.split(' ')
                                            if(tokens.length > rhsField)
                                            {
                                                isError = true;
                                                console.info((new Date()).toString()+"|"+prependToLog,'Error in Response Validation: Too many words in responseS \n Validation: '+validations[i])
                                            }
                                        }
                                        else if(operation == "<")
                                        {
                                            if(lhsField >= rhsField)
                                            {
                                                isError = true;
                                                console.info((new Date()).toString()+"|"+prependToLog,'Error in Response Validation: '+validations[i].operandLHS+' is not less than '+validations[i].operandRHS)
                                            }
                                        }
                                        else if(operation == "<=")
                                        {
                                            if(lhsField > rhsField)
                                            {
                                                isError = true;
                                                console.info((new Date()).toString()+"|"+prependToLog,'Error in Response Validation: '+validations[i].operandLHS+' is not less than or equal to '+validations[i].operandRHS)
                                            }
                                        }
                                        else if(operation == ">")
                                        {
                                            if(lhsField <= rhsField)
                                            {
                                                isError = true;
                                                console.info((new Date()).toString()+"|"+prependToLog,'Error in Response Validation: '+validations[i].operandLHS+' is not more than '+validations[i].operandRHS)
                                            }
                                        }
                                        else if(operation == ">=")
                                        {
                                            if(lhsField < rhsField)
                                            {
                                                isError = true;
                                                console.info((new Date()).toString()+"|"+prependToLog,'Error in Response Validation: '+validations[i].operandLHS+' is not more than or equal to '+validations[i].operandRHS)
                                            }
                                        }
                                        else if(operation == "=")
                                        {
                                            if(lhsField != rhsField)
                                            {
                                                isError = true;
                                                console.info((new Date()).toString()+"|"+prependToLog,'Error in Response Validation: '+validations[i].operandLHS+' is not equal to '+validations[i].operandRHS)
                                            }
                                        }
                                        else if(operation == "==")
                                        {
                                            if(lhsField != rhsField)
                                            {
                                                isError = true;
                                                console.info((new Date()).toString()+"|"+prependToLog,'Error in Response Validation: '+validations[i].operandLHS+' is not equal to '+validations[i].operandRHS)
                                            }
                                        }
                                        if(isError)
                                        {
                                            responseJSON['ResponseValidationFailure']=validations[i].errorMessage
                                            break;
                                        }
                                    }
                                }
                                if((isError==true)||(wrongAnswers<2)){
                                    reject(responseJSON['OperationStatus']); 
                                    return
                                }
                                else {
                                    console.info((new Date()).toString()+"|"+prependToLog,'Response passed validtion checks'); 
                                    responseJSON['OperationStatus'] = 'NO_VLDTION_RQRD';
                                    resolve(responseJSON['OperationStatus']); 
                                    return
                                }
                            })
                        }
                    

                        const validationResult = () => {
                            return new Promise((resolve,reject)=>{
                                if(responseFormat != typeOfResponse)
                                {
                                    responseJSON['OperationStatus'] = 'RESPONSE_FORMAT_ERR'
                                    console.info((new Date()).toString()+"|"+prependToLog,'Response has been sent as '+typeOfResponse+" whereas it was expected in "+responseFormat)
                                    reject(responseJSON['OperationStatus'])
                                    return
                                }
                                else if(((responseFormat=='Button')||(responseFormat=='List'))&&(buttonOptions.includes(responseText) == false)){
                                        responseJSON['OperationStatus'] = 'NT_BTN_OPTN_ERR'
                                        console.info((new Date()).toString()+"|"+prependToLog,'Response ',responseText,' sent is not present in the button options ',buttonOptions)
                                        reject(responseJSON['OperationStatus'])
                                        return
                                }
                                else if((responseFormat == "Integer")&&(!intRegEx.test(responseText)))
                                {
                                    responseJSON['OperationStatus'] = 'RESPONSE_FORMAT_ERR'
                                    console.info((new Date()).toString()+"|"+prependToLog,'Response is not an integer')
                                    reject(responseJSON['OperationStatus'])
                                    return
                                }
                                else if((responseFormat == "Float")&&(!(floatRegEx.test(responseText) || intRegEx.test(responseText))))
                                {
                                    responseJSON['OperationStatus'] = 'RESPONSE_FORMAT_ERR'
                                    console.info((new Date()).toString()+"|"+prependToLog,'Response is not an decimal number')
                                    reject(responseJSON['OperationStatus'])
                                    return
                                }
                                else if(currentQuestion == 'NO_RECORD')
                                {
                                    responseJSON['OperationStatus'] = 'NO_VLDTION_RQRD'
                                    console.info((new Date()).toString()+"|"+prependToLog,'No validation criteria to be applied')
                                    resolve(responseJSON['OperationStatus'])
                                    return
                                }
                                else if(validations==null)
                                {
                                    responseJSON['OperationStatus'] = 'NO_VLDTION_RQRD'
                                    console.info((new Date()).toString()+"|"+prependToLog,'No validation criteria to be applied')
                                    resolve(responseJSON['OperationStatus'])
                                    return	
                                }
                                else if(typeOfResponse == 'Audio'){
                                    //Analyse audio to get the validation parameters
                                    console.info((new Date()).toString()+"|"+prependToLog,'Getting the audio file for analysis');
                                    //var musicMetadata = import("music-metadata")

                                    var httpGet = require("https")

                                    responseJSON['OperationStatus']='REST_API_CALL_ERR'
                                    httpGet.get(responseAudioURL,(stream) =>{
                                        responseJSON['OperationStatus']='RESP_CRITERIA_ERR';
                                        const musicMetadata = require("music-metadata")
                                        musicMetadata.parseStream(stream)
                                        .then(x => {
                                            var audioData = {}
                                            audioData['original_duration'] = x['format']['duration']
                                            validateResponse(validations,audioData,typeOfResponse,requestBody["UserAssessmentLogID"],questionsAsked,userROWID,previousResponses,questionBank)
                                            .then(validationResult => {
                                                responseJSON['OperationStatus'] = 'NO_VLDTION_RQRD'; 
                                                resolve(validationResult); 
                                                return
                                            })
                                            .catch(error => {reject(error); return})	   										
                                        })
                                        .catch(error => {reject(error); return})
                                    })	
                                }
                                else
                                {
                                    responseJSON['OperationStatus']='RESP_CRITERIA_ERR'
                                    validateResponse(validations,responseText,typeOfResponse,requestBody["UserAssessmentLogID"],questionsAsked,userROWID,previousResponses,questionBank)
                                        .then(validationResult => {
                                            responseJSON['OperationStatus'] = 'NO_VLDTION_RQRD'; 
                                            resolve(validationResult); 
                                            return
                                        })
                                        .catch(error => {reject(error); return})
                                }
                            })
                        }

                        //Check Skip Logic
                        const getNextQuestionROWID = (skipLogic,responseText, isCorrectAnswer, currentQuestionAskingOrder, questionBank, previousResponses,currentQuestionROWID) => {
                            return new Promise((resolve, reject)=>{
                                const currentAskingOrder = parseInt(currentQuestionAskingOrder)
                                var nextAskingOrder = null
                                if((isCorrectAnswer == false)&&(wrongAnswers<1)){
                                    console.info((new Date()).toString()+"|"+prependToLog,"Not a correct answer. Same question to be asked")
                                    resolve(currentQuestionROWID)
                                }
                                else{
                                    if(skipLogic == "End"){
                                        console.info((new Date()).toString()+"|"+prependToLog,"End of questionnaire as skipLogic = End")
                                        resolve(null)
                                    }
                                    else{
                                        const remainingQuestions = questionBank.filter(record=>!questionsAsked.includes(record.id))
                                        const sequentialQuestions = remainingQuestions.filter(record=>record.AskingOrder>0)
                                        if(sequentialQuestions.length==0){//Only random questions remaining
                                            if(remainingQuestions.length>0){//There are questions to be asked
                                                const randomIndex = Math.floor(Math.random()*(remainingQuestions.length-1))
                                                nextAskingOrder = [remainingQuestions[randomIndex]]
                                                console.info((new Date()).toString()+"|"+prependToLog,"Remianing questions to be asked randonly. Selected Question _id = ",nextAskingOrder);
                                            }
                                            else{
                                                console.info((new Date()).toString()+"|"+prependToLog,"No next question in sequence")
                                                resolve(null)
                                            }      
                                        }
                                        else{//Sequential question to be asked
                                            nextAskingOrder = remainingQuestions.filter(record=>record.AskingOrder==(currentAskingOrder+1))
                                            console.info((new Date()).toString()+"|"+prependToLog,"Next question in sequence to be asked. Selected Question _id = ",nextAskingOrder);
                                        }

                                        if(!((nextAskingOrder!=null)&&(nextAskingOrder.length>0))){
                                            console.info((new Date()).toString()+"|"+prependToLog,"No next question in sequence")
                                            resolve(null)
                                        }
                                        else if(skipLogic == null){
                                            console.info((new Date()).toString()+"|"+prependToLog,"No skip logic. Next question to be asked")
                                            resolve(nextAskingOrder[0]._id)
                                        }
                                        else{
                                            var isConditionFulfilled = false
                                            if(typeof skipLogic['conditional']!=='undefined'){
                                                const conditions = skipLogic['conditional']
                                                for(var i=0; i<conditions.length;i++){
                                                    const conditionTokens = conditions[i].split(":")
                                                    var expression = (isNaN(parseInt(responseText)) && isNaN(parseFloat(responseText))) ? conditionTokens[0].replace('{Q'+currentAskingOrder+'}','"'+responseText+'"') : conditionTokens[0].replace('{Q'+currentAskingOrder+'}',responseText)
                                                    var expressionValue = null
                                                    var expressionTokens = []

                                                    if(expression.includes("Q"))//Its a question in expression
                                                    {
                                                        console.log(i,". Question Response to be substituded in Skip Logic Expression = ",expression)
                                                        var expTokens = expression.split("{Q")
                                                        expTokens = expTokens.filter(token=>token.toString().trim().length>0)
                                                        expressionTokens = expTokens.map(userAssessmentLog=>{
                                                            const dataTokens = userAssessmentLog.split("}")
                                                            const askingOrder = dataTokens[0].replace(/[%*^+=<>!() -]/g,"")
                                                            if(askingOrder.length==0)
                                                                return userAssessmentLog
                                                            else{
                                                                const questionRecord = questionBank.filter(record=>record.AskingOrder == askingOrder)
                                                                var answers = previousResponses.filter(record=>record.UserAssessment.QuestionROWID == questionRecord[0]['QuestionBank']['QuestionROWID'])
                                                                try{
                                                                    return userAssessmentLog.replace(askingOrder+'}',answers[0]['UserAssessment']['ResponseText'])
                                                                }
                                                                catch(e){
                                                                    return userAssessmentLog.replace(askingOrder+'}',0)
                                                                }
                                                            }
                                                        })
                                                        console.log(i,". Substituted Skip Logic Expression = ",expressionTokens.join(""))
                                                    }
                                                    const temp = eval(expressionTokens.join(""))
                                                    expressionValue = math.evaluate(temp)
                                                    
                                                    console.log(i,". Skip Logic Expression Value = ",expressionValue)
                                                    if(expressionValue){
                                                        if(conditionTokens[1]=='End'){
                                                            console.log(i,". End of questionnaire as skipLogic = End")
                                                            isConditionFulfilled = true
                                                            resolve(null)
                                                        }
                                                        else{
                                                            console.log(i,". Skip logic expression applied. Q"+conditionTokens[1]+" to be asked")
                                                            nextAskingOrder = questionBank.filter(record=>record.AskingOrder==parseInt(conditionTokens[1]))
                                                            isConditionFulfilled = true
                                                            resolve(nextAskingOrder[0]._id)
                                                        }
                                                    }
                                                    else
                                                        console.log(i,". Skip logic condition not satisfied")
                                                }
                                            }
                                            if(!isConditionFulfilled){
                                                if(typeof skipLogic[responseText] === 'undefined'){
                                                    console.info((new Date()).toString()+"|"+prependToLog,"No question to skip on value :",responseText, ". Next question to be asked")
                                                    resolve(nextAskingOrder[0]._id)
                                                }
                                                else{
                                                    console.info((new Date()).toString()+"|"+prependToLog,"Skip logic applied. Q"+skipLogic[responseText]+" to be asked")
                                                    nextAskingOrder = questionBank.filter(record=>record.AskingOrder==parseInt(skipLogic[responseText]))
                                                    resolve(nextAskingOrder[0]._id)
                                                }
                                            }
                                        }
                                    }
                                }
                            })
                        }

                        if(responseFormat=='None') //If it is just an instruction type question i.e. no response expected
                        {
                            getNextQuestionROWID(skipLogic,responseText,true,currentQuestionAskingOrder,questionBank,previousResponses,requestBody['QuestionIdentifier'])
                            .then((nextQuestionId) => {
                                let updateData = {
                                    //_id:requestBody["UserAssessmentLogID"],
                                    QuestionsAsked:questionsAsked.push(requestBody["QuestionIdentifier"]),
                                    NextQuestionROWID:nextQuestionId,
                                    SessionID:requestBody["SessionID"]
                                }
                                //let table = catalystApp.datastore().table("UserAssessmentLogs")
                                UserAssessmentLog.findByIdAndUpdate(requestBody["UserAssessmentLogID"],updateData)
                                .then((updated)=>{
                                    if(typeof updated['_id'] === 'undefined'){
                                        responseJSON['OperationStatus'] = 'CONTINUED_ASSESSMENT'
                                        responseJSON['StatusDescription'] = "Failed to update instruction question asked in User's Assessment Logs: "+updated
                                        sendResponse(prependToLog,responseJSON,startTimeStamp,requestBody, res)
                                    }
                                    else{
                                        responseJSON['Feedback'] = "None"
                                        responseJSON['OperationStatus'] = "CONTINUED_ASSESSMENT"
                                        sendResponse(prependToLog,responseJSON,startTimeStamp,requestBody, res)
                                    }
                                })
                                .catch((error)=>{
                                    responseJSON['Feedback'] = 'None';
                                    responseJSON['OperationStatus'] = "CONTINUED_ASSESSMENT"
                                    responseJSON['StatusDescription'] = "Could not update Instruction Question asked in User's Assessmet Log. Same question will be asked. Error: "+error
                                    sendResponse(prependToLog,responseJSON,startTimeStamp,requestBody, res)
                                })
                            })
                            .catch((error)=> {
                                responseJSON['Feedback'] = 'None';
                                responseJSON['OperationStatus'] = "CONTINUED_ASSESSMENT"
                                responseJSON['StatusDescription'] = 'Could not get the next question to be asked. Same question will be asked. Error: '+error
                                sendResponse(prependToLog,responseJSON,startTimeStamp,requestBody, res)
                            })
                        }
                        else{
                            let userAssessmentRecord = {
                                UserAssessmentLogROWID: requestBody['UserAssessmentLogID'],
                                QuestionROWID: requestBody["QuestionIdentifier"],
                                ResponseText: requestBody["ResponseText"],
                                ResponseAVURL: null,
                                IsCorrectResponse: null,
                                ConfidenceInterval: null
                            }
                                            
                            validationResult() //Apply validation check on response
                            .then((validationResultResponse)=> {
                                responseJSON['OperationStatus']= 'AUD_PRCSNG_ERR'
                                
                                const storeAudioFile = (typeOfResponse,responseAVURL,fileName) => {
                                    return new Promise(async (resolve, reject)=>{
                                        if(typeOfResponse!='Audio')
                                            resolve(null)
                                        else{
                                            console.info((new Date()).toString()+"|"+prependToLog,'Storing Response Audio in GCS')
                                            const storeAudioFileinGCSRequest = {
                                                contentType: "URL",
                                                fileData: responseAVURL,
                                                fileName: fileName,
                                                fileType: "Audio",
                                            }
                                            try{
                                                //Store Audio file in GCS
                                                const gcsResponse = JSON.parse(await storeAudioFileinGCS(storeAudioFileinGCSRequest));
                                                if (gcsResponse["OperationStatus"] == "SUCCESS") {
                                                    resolve(gcsResponse["PublicURL"])
                                                } else{
                                                    console.info((new Date()).toString()+"|"+prependToLog,"Couldn't store the audio gpt feedback file in GCS");
                                                    reject(gcsResponse)
                                                }
                                            }
                                            catch(error){
                                                console.info((new Date()).toString()+"|"+prependToLog,"Exception in storeAudioFileinGCS call");
                                                reject(error)
                                            }                                        
                                        }
                                    })
                                }

                                const convertSpchToTxt = (typeOfResponse,ressponseAVURL) =>{
                                    return new Promise(async (resolve, reject)=>{
                                        if(typeOfResponse!='Audio')
                                            resolve(null)
                                        else{
                                            //Convert Speech to text
                                            try{
                                                const transcription = JSON.parse(await convertSpeechToText({ responseAVURL: ressponseAVURL }))
                                                if (transcription["OperationStatus"] == "SUCCESS") {
                                                    var audioTranscript = transcription["AudioTranscript"];
                                                    var confidence = transcription["Confidence"];
                                                    console.info((new Date()).toString()+"|"+prependToLog,'Transcription: ', audioTranscript);
                                                    if(((audioTranscript == '.')||(audioTranscript.length==0))&&(wrongAnswers<2))
                                                    {
                                                        responseJSON['OperationStatus']='EMPTY_AUDIO'
                                                        reject(responseJSON['OperationStatus'])
                                                    }
                                                    else
                                                        resolve([audioTranscript,confidence])
                                                } 
                                                else{
                                                    console.info((new Date()).toString()+"|"+prependToLog,"Couldn't convert the audio to text");
                                                    reject(transcription)
                                                }
                                            }
                                            catch(error){
                                                console.info((new Date()).toString()+"|"+prependToLog,"Exception in converting Speech to text");
                                                reject(error)
                                            }
                                        }
                                    })
                                }

                                const convertTxtToSpch = (text,languageCode,fileName) => {
                                    return new Promise(async (resolve, reject)=>{
                                        console.info((new Date()).toString()+"|"+prependToLog,"Converting Text to Speech:"+text)
                                        try{
                                            //Convert Speech to text
                                            const ttsResult = JSON.parse(await convertTextToSpeech({text: text, languageCode:languageCode, fileName:fileName}));
                                            if (ttsResult["OperationStatus"] == "SUCCESS") {
                                                const publicURL = ttsResult["PublicURL"];
                                                console.info((new Date()).toString()+"|"+prependToLog,'Converted Audio File of Text: ', publicURL);
                                                resolve(publicURL)
                                            }
                                            else{
                                                console.info((new Date()).toString()+"|"+prependToLog,"Couldn't convert the text to speech");
                                                reject(ttsResult)
                                            }
                                        }
                                        catch(error){
                                            console.info((new Date()).toString()+"|"+prependToLog,"Exception in Text to Speech Conversion");
                                            reject(error)
                                        }
                                    })
                                }
                                

                                //Promise.all([
                                storeAudioFile(typeOfResponse,requestBody["ResponseAVURL"],'U'+userROWID
                                +'-UAL'+requestBody["UserAssessmentLogID"]+'-Q'+requestBody['QuestionIdentifier'])
                                .then((storedAudioPath)=>{
                                    userAssessmentRecord['ResponseAVURL'] =  storedAudioPath
                                    convertSpchToTxt(typeOfResponse,requestBody["ResponseAVURL"])
                                    .then((audioTranscript) => {
                                        userAssessmentRecord['ResponseText'] = typeOfResponse != 'Audio' ? requestBody["ResponseText"] : audioTranscript==null?null:audioTranscript[0]
                                        userAssessmentRecord['ConfidenceInterval'] = audioTranscript==null?null:audioTranscript[1]

                                        const checkanswer = (ans,correctAnswer) =>{
                                            return new Promise((resolve,reject)=>{
                                                console.info((new Date()).toString()+"|"+prependToLog,"matching '"+ans+"' in '"+correctAnswer+"'")
                                                if(correctAnswer.length==0)
                                                    resolve(true)
                                                //console.log(correctAnswer)
                                                ans = ans.toString().toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"").replace("?","").replace(/ /g,"")
                                                var correctAnswers = correctAnswer.trim().toLowerCase()															
                                                correctAnswers = (correctAnswers.includes("/")?correctAnswers.split("/"):
                                                                    (correctAnswers.includes("\n")?correctAnswers.split('\n'):[correctAnswers]))
                                                var matched=false
                                                
                                                for(var i=0;i<correctAnswers.length;i++){
                                                    const left = correctAnswers[i].replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"").replace("?","").replace(/ /g,"")
                                                    console.info((new Date()).toString()+"|"+prependToLog,"matching '"+ans+"' in '"+left+"'") 
                                                    if(left==ans){
                                                        matched = true
                                                        break;
                                                    }
                                                }
                                                if(matched==true)
                                                    resolve(true)
                                                else
                                                    resolve(false)
                                                //if(correctAnswer.toLowerCase().includes(ans.toString().toLowerCase()))
                                                //	resolve(true)
                                                //else
                                                //	resolve(false)
                                            })
                                        };
                                        responseJSON['OperationStatus']= 'CHK_ANS_ERR' //Error while checking whether answer is correct or not
                                        checkanswer((typeOfResponse=='Audio'?audioTranscript[0]:requestBody["ResponseText"]),answers)
                                        .then(isCorrectAnswer=>{

                                            userAssessmentRecord["IsCorrectResponse"] = isCorrectAnswer
                                            console.info((new Date()).toString()+"|"+prependToLog,'Is answer correct: '+userAssessmentRecord["IsCorrectResponse"])
                                            
                                            responseJSON["OperationStatus"] = 'GET_NXT_QUEST_ERR' //Error in getting next question
                                            
                                            getNextQuestionROWID(skipLogic,responseText,isCorrectAnswer,currentQuestionAskingOrder,questionBank,previousResponses,requestBody['QuestionIdentifier'])
                                            .then((nextQuestionId) => {
                                                UserAssessment.create(userAssessmentRecord)
                                                .then((storeResponseResult)=>{
                                                    if(typeof storeResponseResult['_id']==='undefined'){
                                                        responseJSON['OperationStatus'] = 'STR_ANS_ERR'
                                                        responseJSON['StatusDescription'] = "Failed to store the response of User: "+storeResponseResult
                                                        sendResponse(prependToLog,responseJSON,startTimeStamp,requestBody, res)
                                                    }
                                                    else{     
                                                        questionsAsked.push(requestBody["QuestionIdentifier"])                        
                                                        let updateData = {
                                                            //_id:requestBody["UserAssessmentLogID"],
                                                            QuestionsAsked:questionsAsked.join(","),
                                                            NextQuestionROWID:nextQuestionId,
                                                            SessionID:requestBody["SessionID"]
                                                        }
                                                        //let table = catalystApp.datastore().table("UserAssessmentLogs")
                                                        UserAssessmentLog.findByIdAndUpdate(requestBody["UserAssessmentLogID"],updateData)
                                                        .then(async(updated)=>{
                                                            if(typeof updated['_id']==='undefined'){
                                                                responseJSON['OperationStatus'] = 'CONTINUED_ASSESSMENT'
                                                                responseJSON['StatusDescription'] = "Failed to update question asked in User's Assessment Logs: "+updated
                                                                sendResponse(prependToLog,responseJSON,startTimeStamp,requestBody, res)
                                                            }
                                                            else{
                                                                console.info((new Date()).toString()+"|"+prependToLog,"Updated Question asked in User Assessmet Log")
                                                                responseJSON['QuestionResponseID'] = storeResponseResult['_id'];//Response element to be sent
                                                                var alwaysSucccessFeedback = successFeedback.replace("@contacts.name",contactName)
                                                                // const correctAnswers=(await zcql.executeZCQLQuery("select distinct QuestionROWID from UserAssessment where StudentAssessmentLogID = '"+requestBody["UserAssessmentLogID"]+"' and IsCorrectResponse=true")).length
                                                                // const totalQuestions=(await zcql.executeZCQLQuery("select distinct QuestionROWID from UserAssessment where StudentAssessmentLogID = '"+requestBody["UserAssessmentLogID"]+"'")).length
                                                                const correctAnswers=(await UserAssessment.distinct('QuestionROWID', {
                                                                    StudentAssessmentLogID: requestBody["UserAssessmentLogID"],
                                                                    IsCorrectResponse: true
                                                                  })).length
                                                                const totalQuestions=(await UserAssessment.distinct('QuestionROWID', {
                                                                    StudentAssessmentLogID: requestBody["UserAssessmentLogID"]
                                                                  })).length
                                                                
                                                                const correctAnswerTokens = ["@correctAnswers","@correctanswers","@correctanswer"]
                                                                for(var i=0;i<correctAnswerTokens.length;i++){
                                                                    if(alwaysSucccessFeedback.includes(correctAnswerTokens[i])){											
                                                                        alwaysSucccessFeedback = alwaysSucccessFeedback.replace(correctAnswerTokens[i],correctAnswers)
                                                                    }
                                                                }
                                                                const totalQuestionTokens = ["@totalQuestions","@totalQuestion","@totalquestions","@totalQuestions","totalQuestions","totalquestions","totalQuestion",,"totalQuestion"]
                                                                for(var i=0;i<totalQuestionTokens.length;i++){
                                                                    if(alwaysSucccessFeedback.includes(totalQuestionTokens[i])){											
                                                                        alwaysSucccessFeedback = alwaysSucccessFeedback.replace(totalQuestionTokens[i],totalQuestions)
                                                                    }
                                                                }

                                                                if(successFeedback.includes("@totalQuestions") & successFeedback.includes("@correctAnswers") & successFeedback.includes("Yayyy")){												
                                                                    if((correctAnswers/totalQuestions)<0.6){
                                                                        alwaysSucccessFeedback = alwaysSucccessFeedback.replace("Yayyy","Great Effort")
                                                                    }
                                                                }
                                                                responseJSON['OperationStatus'] = nextQuestionId == null ? "END_OF_ASSESSMENT" : "CONTINUED_ASSESSMENT"
                                                                if(isCorrectAnswer==true){
                                                                    responseJSON['Feedback'] = alwaysSucccessFeedback
                                                                    if(successAVURL!='None'){
                                                                        responseJSON['FeedbackURLFlag'] = true
                                                                        responseJSON['FeedbackURL'] = successAVURL
                                                                    }
                                                                }
                                                                else{
                                                                    responseJSON['OperationStatus'] = 'INCRCT_ANS' //Incorrect Answer
                                                                    if(isEvaluative==true){
                                                                        /*if(wrongAnswers>1){
                                                                            const randomExclamations = process.env.RandomExclamations.toString().split("|")
                                                                            const index = Math.floor(Math.random() * randomExclamations.length)
                                                                            var answersArray = Array.isArray(answers) ? answers : (answers.includes("/")?answers.split("/"):
                                                                                    (answers.includes("\n")?answers.split('\n'):[answers]))
                        
                                                                            //errorFeedback.toLowerCase().split("You just finished")
                                                                            responseJSON['Feedback'] = randomExclamations[index]+(((typeOfResponse=='Audio') ? " the correct answer is: ": ((randomExclamations[index]=="Let's learn what")||(randomExclamations[index]=="Good try but") ? " the correct answer is: _*"+answersArray[0].toString().trim() + "*_" : ". The correct answer is _*"+answersArray[0].toString().trim()+"*_")))		
                                                                        }
                                                                        else{*/
                                                                            responseJSON['Feedback'] = errorFeedback.replace("@contacts.name",contactName)
                                                                            if(errorAVURL != 'None'){
                                                                                responseJSON['FeedbackURLFlag'] = true
                                                                                responseJSON['FeedbackURL'] = errorAVURL
                                                                            }
                                                                        //}
                                                                    }
                                                                    else{
                                                                        responseJSON['Feedback'] = alwaysSucccessFeedback
                                                                        if(successAVURL!='None'){
                                                                            responseJSON['FeedbackURLFlag'] = true
                                                                            responseJSON['FeedbackURL'] = successAVURL
                                                                        }
                                                                    }
                                                                }
                                                                if(typeOfResponse=='Audio'){
                                                                    //Convert feedback text to speech
                                                                    responseJSON['AudioTranscript'] =  "Your answer is: *"+audioTranscript[0]+".*"
                                                                    if((wrongAnswers>=1)&&(isCorrectAnswer!=true)){
                                                                        var answersArray = Array.isArray(answers) ? answers : (answers.includes("/")?answers.split("/"):
                                                                                (answers.includes("\n")?answers.split('\n'):[answers]))
                                                                        const textToConvert = answersArray[0].toString().trim().replace(/\*/g,"").replace(/_/g,"")
                                                                        responseJSON['FeedbackURL'] = await convertTxtToSpch(textToConvert,"en-IN",storeResponseResult)
                                                                        responseJSON['FeedbackURLFlag'] = true
                                                                    }
                                                                }
                                                                sendResponse(prependToLog,responseJSON,startTimeStamp,requestBody, res)
                                                            }
                                                        })
                                                        .catch((error)=>{
                                                            responseJSON['Feedback'] = 'None';
                                                            responseJSON['OperationStatus'] = "CONTINUED_ASSESSMENT"
                                                            responseJSON['StatusDescription'] = "Could not update Question asked in User's Assessmet Log. Same question will be asked. Error: "+error
                                                            console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error in Getting Questions");
                                                            console.error((new Date()).toString()+"|"+prependToLog,"End of Execution with Error: ",error)
                                                            sendResponse(prependToLog,responseJSON,startTimeStamp,requestBody, res)
                                                        })
                                                    }
                                                }).catch(error=> {
                                                    responseJSON['OperationStatus'] = "CONTINUED_ASSESSMENT"
                                                    console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error in Getting Questions");
                                                    console.error((new Date()).toString()+"|"+prependToLog,"End of Execution with Error: ",error)
                                                    sendResponse(prependToLog,responseJSON,startTimeStamp,requestBody, res)
                                                })
                                            }).catch(error=> {
                                                userAssessmentRecord["ErrorInResponse"] = responseJSON["OperationStatus"]
                                                userAssessmentRecord["ErrorDescription"] = error
                                                UserAssessment.create(userAssessmentRecord).then()
                                                console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error in Getting Next Question");
                                                console.error((new Date()).toString()+"|"+prependToLog,"End of Execution with Error: ",error)
                                                res.status(500).send(error);
                                            })
                                        }).catch(error=> {
                                            userAssessmentRecord["ErrorInResponse"] = responseJSON["OperationStatus"]
                                            userAssessmentRecord["ErrorDescription"] = error
                                            UserAssessment.create(userAssessmentRecord).then()
                                            console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error in Getting Questions");
                                            console.error((new Date()).toString()+"|"+prependToLog,"End of Execution with Error: ",error)
                                            sendResponse(prependToLog,responseJSON,startTimeStamp,requestBody, res)
                                        })
                                    })
                                    .catch(error=> {
                                        userAssessmentRecord["ErrorInResponse"] = responseJSON["OperationStatus"]
                                        userAssessmentRecord["ErrorDescription"] = error
                                        UserAssessment.create(userAssessmentRecord).then()
                                        console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error in Converting Speech to Text");
                                        console.error((new Date()).toString()+"|"+prependToLog,"End of Execution with Error: ",error)
                                        sendResponse(prependToLog,responseJSON,startTimeStamp,requestBody, res)
                                    })
                                })
                                .catch(error=> {
                                    userAssessmentRecord["ErrorInResponse"] = responseJSON["OperationStatus"]
                                    userAssessmentRecord["ErrorDescription"] = error
                                    UserAssessment.create(userAssessmentRecord).then()
                                    console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error in Storing Audio Response in GCS");
                                    console.error((new Date()).toString()+"|"+prependToLog,"End of Execution with Error: ",error)
                                    sendResponse(prependToLog,responseJSON,startTimeStamp,requestBody, res)
                                })
                            })
                            .catch((error)=> {
                                userAssessmentRecord["ErrorInResponse"] = responseJSON["OperationStatus"]
                                userAssessmentRecord["ErrorDescription"] = error
                                UserAssessment.create(userAssessmentRecord).then()
                                console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error in Getting Questions");
                                console.error((new Date()).toString()+"|"+prependToLog,"End of Execution with Error: ",error)
                                sendResponse(prependToLog,responseJSON,startTimeStamp,requestBody, res)
                            })
                        }
                    }
                })
                .catch(error=> {
                    console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error in Getting Questions");
                    console.error((new Date()).toString()+"|"+prependToLog,"End of Execution with Error: ",error)
                    res.status(500).send(error);
                })
                
            }
        })
        .catch(error=> {
            console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error in Getting User Data");
            console.error((new Date()).toString()+"|"+prependToLog,"End of Execution with Error: ",error);
            res.status(500).send(error);
        })
    }

});

module.exports = app;
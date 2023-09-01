"use strict"

const express = require("express");
// const catalyst = require('zcatalyst-sdk-node');
const flowQuestions = require("./models/flowQuestions.js");


// const app = express();
// app.use(express.json());
const app = express.Router();

const allowedResponseTypes = ['Text','Button','Audio','None','List','Integer','Float']

//Filter unique elements in an array
const unique = (value, index, self) => {
return self.indexOf(value) === index;
};

const validateRequest = (data,method) => {

    const dataArray = Array.isArray(data) ? data :[data]
    
    return dataArray.map((row,index) => {
		
        var error = []
        //If Category is missing
        if(method=='POST'){
            if(typeof row['category']==='undefined')
                error.push('category is missing')
            else if(row['category'] == null)
                error.push('category is missing')
            else if(row['category'].length == 0)
                error.push('category is missing')
            
        
            //If question's text part is missing
            if(typeof row['question']==='undefined')
                error.push('question text is missing')
            else if(row['question'] == null)
                error.push('question text is missing')
            else if(row['question'].length == 0)
                error.push('question text is missing')

            //If response format is missing
            if(typeof row['responseType']==='undefined')
                error.push('responseType is missing')
            else if(row['responseType'] == null)
                error.push('responseType is missing')
            else if(row['responseType'].length == 0)
                error.push('responseType is missing')
        }
        
        //If audio URL is present and is not having right extension
        if(typeof row['audioURL'] !== 'undefined')
            if(row['audioURL']!=null)
                if(!(['3gpp','mp3','mp4','ogg'].includes((row['audioURL'].split("."))[row['audioURL'].split(".").length-1])))
                    error.push('Audio/Video URL is not valid'+(row['audioURL'].split("."))[row['audioURL'].split(".").length-1])
        
        //If image URL is present and is not having right extension
        if(typeof row['imageURL'] !== 'undefined')
            if(row['imageURL']!=null)
                if(!(['jpeg','jpg','png','webp'].includes((row['imageURL'].split("."))[row['imageURL'].split(".").length-1])))
                    error.push('Image/Sticker URL is not valid')
        
        //If Success Message URL is present and is not having right extension
        if(typeof row['successAVURL'] !== 'undefined')
            if(row['successAVURL']!=null)
                if(!(['3gpp','mp3','mp4','ogg','jpeg','jpg','png','webp'].includes((row['successAVURL'].split("."))[1])))
                    error.push('Audio/Video/Image/Sticker URL to be sent on Success is not valid')

        //If Error Message URL is present and is not having right extension
        if(typeof row['errorAVURL'] !== 'undefined')
            if(row['errorAVURL']!=null)
                if(!(['3gpp','mp3','mp4','ogg','jpeg','jpg','png','webp'].includes((row['errorAVURL'].split("."))[1])))
                    error.push('Audio/Video/Image/Sticker URL to be sent on Error is not valid')

        //If response format is present
        if(typeof row['responseType'] !== 'undefined')
            if(!(allowedResponseTypes.includes(row['responseType'])))
                error.push('responseType can only be : '+allowedResponseTypes.join(","))
            else if((row['responseType'] == 'Button')||(row['responseType'] == 'List'))//If responseType is button
                if(typeof row['options'] === 'undefined')//button options are missing
                    error.push('Options missing for button')
        
        if(typeof row['options'] !== 'undefined'){
            if((row['responseType'] == 'Button')||(row['responseType'] == 'List'))
                if((row['options']!=null)&&(Array.isArray(row['options']) == false))//but options are missing
                    error.push('Options should be a list')
                else if(row['options'].length == 0 )//but options are missing
                    error.push('Options missing for button')
                else{
                    if(typeof row['responseType'] === 'undefined')
                        error.push('responseType missing.')
                    else
                        if(row['responseType'] == 'Button'){
                            if(row['options'].length > 3 )//but more than 3 options proided
                                error.push('More than three options provided for Button')
                            if(row['options'].some(option=>option.length>20))
                                error.push('One of the options is exceeding 20 character size limit')
                        }
                        else if(row['responseType'] == 'List'){
                            if(row['options'].length > 10 )//but more than 3 options proided
                                error.push('More than 10 options provided for List')
                            if(row['options'].some(option=>option.length>20))
                                error.push('One of the options is exceeding 20 character size limit')
                        }
                        else
                            error.push('responseType can only be one of the following : Button/List')
                }
        }
        
        if(typeof row['answers'] !== 'undefined')//button options are missing
            if((row['answers']!=null) && (Array.isArray(row['answers']) == false))//but options are missing
                error.push('answers should be a list')
        
        if(typeof row['tags'] !== 'undefined')
            if((row['tags']!=null) && (Array.isArray(row['tags']) == false))
                error.push('tags should be a list')
        
        if(typeof row['questionTimeOut'] !== 'undefined')//Question Timeout exists 
            if(row['questionTimeOut']!=null)
                if(isNaN(row['questionTimeOut']) == true) //but its a string or negative number
                    error.push('questionTimeOut should be a number >= 0')
                if(row['questionTimeOut']<0)
                    error.push('questionTimeOut should be a number >= 0')				
        
        if((typeof row['isEvaluative']!=='undefined') && !([true,false].includes(row['isEvaluative'])))
            error.push('isEvaluative can only be boolean')
        
        if((typeof row['isActive']!=='undefined') && !([true,false].includes(row['isActive'])))
            error.push('isActive can only be boolean')
        
        if(typeof row['constraints'] !== 'undefined'){
            if(typeof row['responseType']==='undefined')
                error.push('responseType is required with constraints')
            if(typeof row['constraintMessage']==='undefined')
                error.push('constraintMessage is required with constraints')
        }

        return error.join('.')
    })
}

app.post("/", async (req, res) => {
    
    const requestBody = req.body;
 
    const executionID = Math.random().toString(36).slice(2)
    
    //Prepare text to prepend with logs
    const params = ["FlowQuestionsCRUD",req.method,executionID,""]
    const prependToLog = params.join(" | ")
    
    console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")
    
    //Initialize Response Object
    var responseObject = {
        "OperationStatus":"SUCCESS"
    }

    const areElementsOK = validateRequest(requestBody,req.method)

    if(areElementsOK.some(record=>record.length>0))
		res.status(422).send(areElementsOK)
	else{
        const insertData = requestBody.map((row, rowIndex) => {
			

			console.debug((new Date()).toString()+"|"+prependToLog,`Row being processed=${JSON.stringify(row)}`)
            console.info((new Date()).toString()+"|"+prependToLog,"Parsing Row Index "+rowIndex)
			
			const responseTypePresent = (typeof row['responseType'] === 'undefined') ? false : row['responseType']==null ? false : row['responseType'].length > 0 ? true:false
			const optionsPresent = (typeof row['options'] === 'undefined') ? false : row['options']==null ? false : row['options'].length > 0 ? true:false
			const audioURLPresent = (typeof row['audioURL'] === 'undefined') ? false : row['audioURL']==null ? false : row['audioURL'].length > 0 ? true:false
			const imageURLPresent = (typeof row['imageURL'] === 'undefined') ? false : row['imageURL']==null ? false : row['imageURL'].length > 0 ? true:false

			
			//Build ResponseValidation
			const constraints = (typeof row['constraints'] === 'undefined') ? null : row['constraints']
			var responsevalidation = []
			if(constraints!=null){
				const constraintMsg = (typeof row['constraintMessage'] === 'undefined') ? null : row['constraintMessage']
				//Split constraints by comma to get list of all constraints
				const constraintList = constraints.split(",")
				//For each constraint in constraintList
				responsevalidation = constraintList.map(constraint => {
					var validationObject = {
						responseType:row["responseType"],
						operandLHS:null,
						operation:null,
						operandRHS:null
					}
					var constraintTokens = constraint.split(" ")
					constraintTokens = constraintTokens.filter(token=>token.toString().trim().length>0)
					if(constraintTokens[0] == "min_word_count"){
						validationObject['operandLHS']="text",
						validationObject['operation'] = "word_count"
						validationObject['operandRHS']=constraintTokens[1]
					}
					else if(constraintTokens[0] == "min_audio_len"){
						validationObject['operandLHS']="original_duration",
						validationObject['operation'] = ">="
						validationObject['operandRHS']=constraintTokens[1]
					}
					else if(constraintTokens[0] == "max_audio_len"){
						validationObject['operandLHS']="original_duration",
						validationObject['operation'] = "<="
						validationObject['operandRHS']=constraintTokens[1]
					}
					else{
						validationObject['operandLHS']="text",
						validationObject['operation'] = constraintTokens[0]
						validationObject['operandRHS']=constraintTokens[1]
					}
					validationObject['errorMessage']=constraintMsg
					return validationObject
				})
			}

			//console.log(responsevalidation)
			const options = row['options']!=null ? row['options'].filter(option=> (option!=null) && (option.length>0)) : null
			const answers = row['answers']!=null ? row['answers'].filter(answer=> (answer!=null) && (answer.length>0)) : null
			const tagValues = row['tags']!=null ? row['tags'].filter(tag=> (tag!=null) && (tag.length>0)) : null
            const triggers = row['triggers']!=null ? row['triggers'] : null
			const questionTimeOutPresent = (typeof row['questionTimeOut'] === 'undefined') ? false : row['questionTimeOut']==null ? false : row['questionTimeOut'].toString().length > 0 ? true:false
			var isVideoURL = false
			if(audioURLPresent == true)
			{
				const urlTokens = row['audioURL'].split('.')
				if(["mp4","3gpp"].includes(urlTokens[urlTokens.length-1])){
					isVideoURL = true
				}
			}
			
			return {
                Category:row['category'],
				QuestionType: (isVideoURL == true) ? "Video" : (((((audioURLPresent==true)) && (imageURLPresent==true)))?"Audio+Image":((imageURLPresent==true)?"Image":((audioURLPresent==true)?"Audio":"Text"))),
				Question: row['question'],
				avURL: row['audioURL'],
				ImageURL: row['imageURL'],
				ResponseFormat: row['responseType'],
				Options: options==null?null:options,
				Answers: answers==null?null:answers,
				ResponseValidations: (responsevalidation.length==0)?null:responsevalidation,
				Tags: tagValues==null?null:tagValues,
				Feedback: {
                    onSuccess:((typeof row['successMessage'] !== 'undefined') && (row['successMessage']!=null) && (row['successMessage'].length>0)) ? row['successMessage'] : null,
                    onSuccessAVURL: ((typeof row['successAVURL'] !== 'undefined') && (row['successAVURL']!=null)) ? row['successAVURL']: null,
                    onError:((typeof row['errorMessage'] !== 'undefined') && (row['errorMessage']!=null) && (row['errorMessage'].length>0)) ? row['errorMessage'] : null,
                    onErrorAVURL:((typeof row['errorAVURL'] !== 'undefined') && (row['errorAVURL'] != null)) ? row['errorAVURL']:null
                },
				ResponseTimeOut: questionTimeOutPresent==true ? row['questionTimeOut'] : null,
				IsEvaluative:(typeof row['isEvaluative']!=='undefined')?row['isEvaluative']:null,
				SkipLogic: (typeof row['skipLogic']!=='undefined')?JSON.stringify(row['skipLogic']):null,
                IsActive: (typeof row['isActive']!=='undefined')?row['isActive']:true,
                AskingOrder: (typeof row['displaySequence']!=='undefined')?row['displaySequence']:-1,
                Triggers: triggers==null?[]:triggers,
			}
        })
        console.info((new Date()).toString()+"|"+prependToLog,"Total records to be inserted: "+insertData.length)
		console.debug((new Date()).toString()+"|"+prependToLog,`Record being inserted in table=${JSON.stringify(insertData)}`)
		var returnArray = []
        
        for(var i=0; i<insertData.length; i++){
            try{
                var searchReturned = null
                if(insertData[i]['AskingOrder']!=-1){
                    searchReturned = await flowQuestions.find({
                        Category:insertData[i]['Category'],
                        AskingOrder:{$eq:insertData[i]['AskingOrder']},
                        IsActive:true
                    })

                }
                if(searchReturned.length>0){
                    console.info((new Date()).toString()+"|"+prependToLog,"Question ID "+searchReturned[0]['_id']+" already exists for the display sequence")
                    returnArray.push(
                        {
                            Question:decodeURIComponent(searchReturned[0]['Question']),
                            Error:"Question ID "+searchReturned[0]['_id']+" already exists for the display sequence"
                        }
                    )
                }
                else{
                    const rowReturned = await flowQuestions.create((insertData[i]))
                    console.info((new Date()).toString()+"|"+prependToLog,"Records Inserted")
                    console.debug((new Date()).toString()+"|"+prependToLog,"Inserted Record: "+rowReturned['_id']);
                    returnArray.push(
                        {
                            Question:decodeURIComponent(rowReturned['Question']),
                            QuestionID:rowReturned['_id']
                        }
                    )
                }
            }
            catch(err){
                console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with error")
                console.error((new Date()).toString()+"|"+prependToLog,'Encountered error while inserting record in Question Bank: '+err)
                returnArray.push(
                    {
                        Question:decodeURIComponent(insertData[i]['Question']),
                        QuestionID:err
                    }
                )
            }
        }
        responseObject['QuestionsConfigured'] = returnArray
        console.info((new Date()).toString()+"|"+prependToLog,"End of Execution:",responseObject)
        res.status(200).json(responseObject)
    }
})


app.patch("/", (req, res) => {
    
    const requestBody = req.body;
 
    const executionID = Math.random().toString(36).slice(2)
    
    //Prepare text to prepend with logs
    const params = ["FlowQuestionsCRUD",req.method,executionID,""]
    const prependToLog = params.join(" | ")
    
    console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")
    
    //Initialize Response Object
    var responseObject = {
        "OperationStatus":"SUCCESS"
    }

    const areElementsOK = validateRequest(requestBody,req.method)

    if(areElementsOK.some(record=>record.length>0))
		res.status(422).send(areElementsOK)
	else{
        const updateData = requestBody.map(async(row, rowIndex) => {
            
			console.debug((new Date()).toString()+"|"+prependToLog,`Row being processed=${JSON.stringify(row)}`)
            console.info((new Date()).toString()+"|"+prependToLog,"Parsing Row Index "+rowIndex)

            var finalData = {}
			
			const responseTypePresent = (typeof row['responseType'] === 'undefined') ? false : row['responseType']==null ? false : row['responseType'].length > 0 ? true:false
			const optionsPresent = (typeof row['options'] === 'undefined') ? false : row['options']==null ? false : row['options'].length > 0 ? true:false
			const audioURLPresent = (typeof row['audioURL'] === 'undefined') ? false : row['audioURL']==null ? false : row['audioURL'].length > 0 ? true:false
			const imageURLPresent = (typeof row['imageURL'] === 'undefined') ? false : row['imageURL']==null ? false : row['imageURL'].length > 0 ? true:false

			var isVideoURL = false
			if(audioURLPresent == true)
			{
				const urlTokens = row['audioURL'].split('.')
				if(["mp4","3gpp"].includes(urlTokens[urlTokens.length-1])){
					isVideoURL = true
				}
			}
			
            if(isVideoURL == true){
				finalData['QuestionType']="Video"
			}
			else if((((audioURLPresent==true)) && (imageURLPresent==true)))
				finalData['QuestionType']="Audio+Image"
			else if(imageURLPresent==true){
				finalData['QuestionType']="Image"
				finalData['ImageURL']=row['imageURL']
			}
			else if(audioURLPresent==true){
				finalData['QuestionType']="Audio"
				finalData['avURL']=row['audioURL']
			}
			
			if(typeof row['question'] !== 'undefined')
				if(row['question'].length>0)
					finalData['Question']= encodeURI(row['question'])
					
			if(responseTypePresent==true)
				finalData['ResponseFormat']= row['responseType']
            
			if(optionsPresent==true)
				if(Array.isArray(row['options']))
				{
					const optionValues = row['options'].filter(option=>option.length>0)
					finalData['Options']= optionValues.length==0?null:optionValues
				}

			if(typeof row['answers'] !== 'undefined')
				if(Array.isArray(row['answers']))
				{
					const answerValues = row['answers'].filter(answer=>answer.length>0)
					finalData['Answers']= answerValues.length==0?null:answerValues
				}

			if(typeof row['tags'] !== 'undefined')
				if(Array.isArray(row['tags'])){
					const tagValues = row['tags'].filter(tag=>tag.length>0)
					finalData['Tags']= tagValues.length==0?null:tagValues
				}
            
            if(typeof row['triggers'] !== 'undefined')
				if(Array.isArray(row['triggers'])){
					const triggers = row['triggers']
					finalData['Triggers']= triggers.length==0?null:triggers
				}


			if((typeof row['successMessage'] !== 'undefined') || (typeof row['errorMessage'] !== 'undefined'))
				finalData['Feedback']= JSON.stringify({
										onSuccess:((typeof row['successMessage'] !== 'undefined') && (row['successMessage']!=null) && (row['successMessage'].length>0)) ? encodeURI(row['successMessage']) : null,
										onSuccessAVURL: ((typeof row['successAVURL'] !== 'undefined') && (row['successAVURL']!=null)) ? encodeURI(row['successAVURL']): null,
										onError:((typeof row['errorMessage'] !== 'undefined') && (row['errorMessage']!=null) && (row['errorMessage'].length>0)) ? encodeURI(row['errorMessage']) : null,
										onErrorAVURL:((typeof row['errorAVURL'] !== 'undefined') && (row['errorAVURL'] != null)) ? encodeURI(row['errorAVURL']):null
									})
				
			//Build ResponseValidation
			if(typeof row['constraints'] !== 'undefined'){
				const constraints = row['constraints']
				var responsevalidation = []
				if(constraints!=null){					
					const constraintMsg = (typeof row['constraintMessage'] === 'undefined') ? null : row['constraintMessage']
					//Split constraints by comma to get list of all constraints
					const constraintList = constraints.split(",")
					//For each constraint in constraintList
					responsevalidation = constraintList.map(constraint => {
						var validationObject = {
							responseType:row["responseType"],
							operandLHS:null,
							operation:null,
							operandRHS:null
						}
						
						var constraintTokens = constraint.split(" ")
						constraintTokens = constraintTokens.filter(token=>token.toString().trim().length>0)
						
						if(constraintTokens[0] == "min_word_count"){
							validationObject['operandLHS']="text",
							validationObject['operation'] = "word_count"
							validationObject['operandRHS']=constraintTokens[1]
						}
						else if(constraintTokens[0] == "min_audio_len"){
							validationObject['operandLHS']="original_duration",
							validationObject['operation'] = ">="
							validationObject['operandRHS']=constraintTokens[1]
						}
						else if(constraintTokens[0] == "max_audio_len"){
							validationObject['operandLHS']="original_duration",
							validationObject['operation'] = "<="
							validationObject['operandRHS']=constraintTokens[1]
						}
						else{
							validationObject['operandLHS']="text",
							validationObject['operation'] = constraintTokens[0]
							validationObject['operandRHS']=constraintTokens[1]
						}
						validationObject['errorMessage']=constraintMsg
						return validationObject
					})
				}
				finalData["ResponseValidations"]= (responsevalidation.length==0)?null:JSON.stringify(responsevalidation)
			}
			const questionTimeOutPresent = (typeof row['questionTimeOut'] === 'undefined') ? false : row['questionTimeOut']==null ? false : row['questionTimeOut'].toString().length > 0 ? true:false
			finalData["ResponseTimeOut"]= questionTimeOutPresent==true ? row['questionTimeOut'] : null
			
			finalData["IsEvaluative"]= (typeof row['isEvaluative']!=='undefined')?row['isEvaluative']:null
            
			if(typeof row['skipLogic']!=='undefined')
				finalData["SkipLogic"] = JSON.stringify(row['skipLogic'])
			
            if(typeof row['isActive']!=='undefined')
				finalData["IsActive"] = row['isActive']

            if(typeof row['category']!=='undefined')
				finalData["Category"] = row['category']
            
            if(typeof row['displaySequence']!=='undefined')
                finalData["AskingOrder"] = row['displaySequence']
            
            //Search by ID and Update
            try{
                const updatedRow = await flowQuestions.findByIdAndUpdate(row['questionID'],finalData)
                console.info((new Date()).toString()+"|"+prependToLog,"Updated record in flowQuestions for ID :"+row['questionID'])
                return "Question ID "+row['questionID']+" updated"
            }
            catch(error){
                console.info((new Date()).toString()+"|"+prependToLog,"Error in updating record in flowQuestions for ID :"+row['questionID']+" | Error",error)
                return "Error in Updating Question ID "+row['questionID']
            }
        })
        console.info((new Date()).toString()+"|"+prependToLog,"Total records processed: "+updateData.length)
        responseObject['StatusDescription'] = updateData
        console.info((new Date()).toString()+"|"+prependToLog,"End of Execution:",responseObject)
        res.status(200).json(responseObject)
    }
})

app.get("/",async (req, res) => {
	const executionID = Math.random().toString(36).slice(2)
    
    //Prepare text to prepend with logs
    const params = ["FlowQuestionsCRUD",req.method,executionID,""]
    const prependToLog = params.join(" | ")
    
    console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")
    	
    let filter = {}
	const category = req.query.category ? req.query.category : ''
    if(category!=''){
	    const categories = category.split(",")
        filter = {
            Category:{
                $in: categories
            }
        }
    }
    const allQuestions = await flowQuestions.find(filter)
    const allCategories = allQuestions.map(data=>data.Category).filter(unique)

    var responseJSON = allCategories.map((record) => {
        const questions = allQuestions.filter(data=>data.Category == record)
        const topicQuestions = questions.map(questionRecord=>{
            var feedback = ((questionRecord['Feedback']==null) || (questionRecord['Feedback'].length==0)) ? null:(questionRecord['Feedback'].length > 0 ? JSON.parse(questionRecord['Feedback']):null)
            if(feedback!=null)
                if((typeof feedback['onSuccess'] === 'undefined')||(typeof feedback['onSuccessAVURL'] === 'undefined')||(typeof feedback['onError'] === 'undefined')||(typeof feedback['onErrorAVURL'] === 'undefined'))
                    feedback = JSON.parse(feedback)

            var responsevalidation = ((questionRecord['ResponseValidations']==null) || (questionRecord['ResponseValidations'].length==0)) ? null:(questionRecord['ResponseValidations'].length>0 ? questionRecord['ResponseValidations']:null)
            var constraint = null
            var constraintMessage = null
            if(responsevalidation!=null){
                const constraintList = responsevalidation.map(validation=>{
                    if ((validation.responseType=="Audio")&&(validation.operandLHS=="original_duration")&&(validation.operation==">="))
                        return "min_audio_len "+validation.operandRHS
                    if ((validation.responseType=="Audio")&&(validation.operandLHS=="original_duration")&&(validation.operation=="<="))
                        return "max_audio_len "+validation.operandRHS
                    else
                        return validation.operation +" " +validation.operandRHS
                })
                constraint = constraintList.join(",")
                constraintMessage = responsevalidation != null ? responsevalidation[0]['errorMessage'] :null
            }

            return {
                displaySequence: questionRecord.AskingOrder,
                questionID: questionRecord._id,
                questionType: questionRecord.QuestionType,
                question: questionRecord.Question,
                audioURL: questionRecord.avURL,
                imageURL:questionRecord.ImageURL,
                responseType: questionRecord.ResponseFormat,
                options: questionRecord.Options,
                answers: questionRecord.Answers,
                tags: questionRecord.Tags,
                successMessage : feedback==null?null:feedback['onSuccess']=="null"?null:feedback['onSuccess'],
                errorMessage : feedback==null?null:feedback['onError']=="null"?null:feedback['onError'],
                successAVURL : feedback==null?null:feedback['onSuccessAVURL']=="null"?null:feedback['onSuccessAVURL'],
                errorAVURL : feedback==null?null:feedback['onErrorAVURL']=="null"?null:feedback['onErrorAVURL'],
                constraints : constraint,
                constraintMessage:constraintMessage,
                questionTimeOut : questionRecord.ResponseTimeOut,
                isEvaluative:questionRecord.IsEvaluative,
                skipLogic:questionRecord.SkipLogic != null ? JSON.parse(questionRecord.SkipLogic) : null,
                isActive:questionRecord.IsActive,
                triggers:questionRecord.Triggers
            }
        })
        return {
            category: record,
            questions:topicQuestions
        }
    })
    console.info((new Date()).toString()+"|"+prependToLog,`End of Execution. Returned ${responseJSON.length} questions`)
    res.status(200).json(responseJSON)
})

app.delete("/:id", async (req, res) => {
    
    const executionID = Math.random().toString(36).slice(2)
    
    //Prepare text to prepend with logs
    const params = ["FlowQuestionsCRUD",req.method,executionID,""]
    const prependToLog = params.join(" | ")
    
    console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")
    
    //Initialize Response Object
    var responseObject = {
        "OperationStatus":"SUCCESS"
    }
    const rowID = req.params.id
  
    if(rowID.length==0){
        responseObject['OperationStatus'] = "REQ_ERR"
        responseObject['StatusDescription'] = "send the Question ID in url e.g. /:198978766545"
        console.info((new Date()).toString()+"|"+prependToLog,"End of Execution")
        console.debug((new Date()).toString()+"|"+prependToLog,"End of Execution. Response:",responseObject)
        res.status(200).json(responseObject)
    }
    else {
        try{
            const deletedRecord = await flowQuestions.findByIdAndDelete(rowID)
                
            if(deletedRecord.deletedCount==0){
                responseObject['OperationStatus'] = "ERROR"
                responseObject['StatusDescription'] = "Could not delete record for question ID "+rowID
            }
            console.debug((new Date()).toString()+"|"+prependToLog,"End of Execution. Response:",responseObject)
            res.status(200).json(responseObject)
        }
        catch(error){
            console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with error")
            console.error((new Date()).toString()+"|"+prependToLog,"Error in updating data: ",error)
            res.status(500).send(error)
        }
    }
})
  
module.exports = app;
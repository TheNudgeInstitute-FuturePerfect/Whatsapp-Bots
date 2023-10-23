"use strict"

const express = require("express");
// const catalyst = require('zcatalyst-sdk-node');
//const catalyst = require("zoho-catalyst-sdk");
const questionBank = require("./models/questionBank.js");
const systemPrompts = require("./models/SystemPrompts.js");
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;



// const app = express();
// app.use(express.json());
const app = express.Router();

const allowedResponseTypes = ['Text','Button','Audio','None','List','Integer','Float']

const validateRequest = (data,method) => {

    const dataArray = Array.isArray(data) ? data :[data]
    
    return dataArray.map((row,index) => {
		
        var error = []
        //If SystempPrompt ROWID of the topic is missing
        if(method=='POST'){
            if(typeof row['topicID']==='undefined')
                error.push('topicID is missing')
            else if(row['topicID'] == null)
                error.push('topicID is missing')
            else if(row['topicID'].length == 0)
                error.push('topicID is missing')
            
        
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

const getAllRows = (fields,query,zcql,prependToLog,dataLimit) => {
	return new Promise(async (resolve) => {			
		var jsonReport = []
		const dataQuery = query.replace("{}",fields)
		const lmt = dataLimit ? dataLimit : 300
		var i = 1
		while(true){
			query = dataQuery+" LIMIT "+i+", "+lmt
			console.debug((new Date()).toString()+"|"+prependToLog,'Fetching records from '+i+" to "+(i+300-1)+
						'\nQuery: '+query)
			const queryResult = await zcql.executeZCQLQuery(query)
			if(((Array.isArray(queryResult))&&(queryResult.length == 0))||(!Array.isArray(queryResult))){
				if(!Array.isArray(queryResult))
					console.error((new Date()).toString()+"|"+prependToLog,"Encountered error in executing query:",queryResult)
				break;
			}
			jsonReport = jsonReport.concat(queryResult)					
			i=i+300
		}
		resolve(jsonReport)
	})
}

app.post("/", async (req, res) => {
    
    //let catalystApp = catalyst.initialize(req, { type: catalyst.type.applogic });
    
    const requestBody = req.body;
 
    const executionID = Math.random().toString(36).slice(2)
    
    //Prepare text to prepend with logs
    const params = ["QuestionBankCRUD",req.method,executionID,""]
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
                SystemPromptROWID:row['topicID'],
				QuestionType: (isVideoURL == true) ? "Video" : (((((audioURLPresent==true)) && (imageURLPresent==true)))?"Audio+Image":((imageURLPresent==true)?"Image":((audioURLPresent==true)?"Audio":"Text"))),
				Question: encodeURI(row['question']),
				avURL: row['audioURL'],
				ImageURL: row['imageURL'],
				ResponseFormat: row['responseType'],
				Options: options==null?null:encodeURI(options.join('\n')),
				Answers: answers==null?null:encodeURI(answers.join('\n')),
				ResponseValidations: (responsevalidation.length==0)?null:JSON.stringify(responsevalidation),
				Tags: tagValues==null?null:encodeURI(tagValues.join(',')),
				Feedback: JSON.stringify(
					JSON.stringify(
						{
							onSuccess:((typeof row['successMessage'] !== 'undefined') && (row['successMessage']!=null) && (row['successMessage'].length>0)) ? encodeURI(row['successMessage']) : null,
							onSuccessAVURL: ((typeof row['successAVURL'] !== 'undefined') && (row['successAVURL']!=null)) ? encodeURI(row['successAVURL']): null,
							onError:((typeof row['errorMessage'] !== 'undefined') && (row['errorMessage']!=null) && (row['errorMessage'].length>0)) ? encodeURI(row['errorMessage']) : null,
							onErrorAVURL:((typeof row['errorAVURL'] !== 'undefined') && (row['errorAVURL'] != null)) ? encodeURI(row['errorAVURL']):null
						}
					)
				),
				ResponseTimeOut: questionTimeOutPresent==true ? row['questionTimeOut'] : null,
				IsEvaluative:(typeof row['isEvaluative']!=='undefined')?row['isEvaluative']:null,
				SkipLogic: (typeof row['skipLogic']!=='undefined')?JSON.stringify(row['skipLogic']):null,
                IsActive: (typeof row['isActive']!=='undefined')?row['isActive']:true,
                AskingOrder: (typeof row['displaySequence']!=='undefined')?row['displaySequence']:-1
			}
        })
        console.info((new Date()).toString()+"|"+prependToLog,"Total records to be inserted: "+insertData.length)
		console.debug((new Date()).toString()+"|"+prependToLog,`Record being inserted in table=${JSON.stringify(insertData)}`)
		// let datastore = catalystApp.datastore();
		// let table = datastore.table('QuestionBank');
        var returnArray = []
        for(var i=0; i<insertData.length; i++){
            try{
                console.info((new Date()).toString()+"|"+prependToLog,"hello..............................")
                const rowReturned = await questionBank.create(insertData[i])
                console.info((new Date()).toString()+"|"+prependToLog,'inserted................',rowReturned);
                if(typeof rowReturned._id!=='undefined'){
                    console.info((new Date()).toString()+"|"+prependToLog,"Records Inserted")
                    console.debug((new Date()).toString()+"|"+prependToLog,"Inserted Record: "+JSON.stringify(rowReturned));
                    returnArray.push(
                        {
                            Question:decodeURIComponent(rowReturned['Question']),
                            QuestionID:rowReturned._id
                        }
                    )
                }
                else{
                    returnArray.push(
                        {
                            Question:decodeURIComponent(insertData[i]['Question']),
                            QuestionID:rowReturned
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
                        QuestionID:rowReturned
                    }
                )
            }
        }
        responseObject['QuestionsConfigured'] = returnArray
        console.info((new Date()).toString()+"|"+prependToLog,"End of Execution:",responseObject)
        res.status(200).json(responseObject)
    }
})


app.patch("/", async (req, res) => {
    
    //let catalystApp = catalyst.initialize(req, { type: catalyst.type.applogic });
    
    const requestBody = req.body;
 
    const executionID = Math.random().toString(36).slice(2)
    
    //Prepare text to prepend with logs
    const params = ["QuestionBankCRUD",req.method,executionID,""]
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
        const updateData = requestBody.map((row, rowIndex) => {
            
			console.debug((new Date()).toString()+"|"+prependToLog,`Row being processed=${JSON.stringify(row)}`)
            console.info((new Date()).toString()+"|"+prependToLog,"Parsing Row Index "+rowIndex)

            var finalData = {
                _id:row['questionID']
            }
			
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
					finalData['Options']= optionValues.length==0?null:encodeURI(optionValues.join('\n'))
				}

			if(typeof row['answers'] !== 'undefined')
				if(Array.isArray(row['answers']))
				{
					const answerValues = row['answers'].filter(answer=>answer.toString().length>0)
					finalData['Answers']= answerValues.length==0?null:encodeURI(answerValues.join("\n"))
				}

			if(typeof row['tags'] !== 'undefined')
				if(Array.isArray(row['tags'])){
					const tagValues = row['tags'].filter(tag=>tag.length>0)
					finalData['Tags']= tagValues.length==0?null:tagValues
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

            if(typeof row['topicID']!=='undefined')
				finalData["SystemPromptROWID"] = row['topicID']
            
            if(typeof row['displaySequence']!=='undefined')
                finalData["AskingOrder"] = row['displaySequence']
            
            return finalData
        })
        console.info((new Date()).toString()+"|"+prependToLog,"Total records to be updated: "+updateData.length)
		console.debug((new Date()).toString()+"|"+prependToLog,`Record being updated in table=${JSON.stringify(updateData)}`)
		// let datastore = catalystApp.datastore();
		// let table = datastore.table('QuestionBank');
        var returnArray = []
        for(var i=0; i<updateData.length; i++){
            try{
                console.info((new Date()).toString()+"|"+prependToLog,"hello..............................")
                const rowReturned = await questionBank.findByIdAndUpdate(updateData[i]['_id'],updateData[i])
                console.info((new Date()).toString()+"|"+prependToLog,'updated................',rowReturned);
                if(typeof rowReturned._id!=='undefined'){
                    console.info((new Date()).toString()+"|"+prependToLog,"Records Updated")
                    console.debug((new Date()).toString()+"|"+prependToLog,"Updated Record: "+JSON.stringify(rowReturned));
                    returnArray.push(
                        {
                            Question:decodeURIComponent(rowReturned['Question']),
                            QuestionID:rowReturned._id
                        }
                    )
                }
                else{
                    returnArray.push(
                        {
                            Question:decodeURIComponent(updateData[i]['Question']),
                            QuestionID:rowReturned
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
                        QuestionID:rowReturned
                    }
                )
            }
        }
        responseObject['QuestionsUpdated'] = returnArray
        console.info((new Date()).toString()+"|"+prependToLog,"End of Execution:",responseObject)
        res.status(200).json(responseObject)
    }
})

app.get("/",(req, res) => {
	//let catalystApp = catalyst.initialize(req, {type: catalyst.type.applogic});

    const executionID = Math.random().toString(36).slice(2)
    
    //Prepare text to prepend with logs
    const params = ["QuestionBankCRUD",req.method,executionID,""]
    const prependToLog = params.join(" | ")
    
    console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")
    	
    //let zcql = catalystApp.zcql();
	var conditionList = []
    var filterParams = {};
	const topic = req.query.topic ? req.query.topic : req.query.prompt ? req.query.prompt : ''
	const persona = req.query.persona ? req.query.persona : ''
	if((persona=='')&&(topic=='')){
		console.info((new Date()).toString()+"|"+prependToLog,`End of Execution. Required parameter: topic or persona`)
        res.status(500).send("Required parameter: topic or persona")
    }
	if(topic!=''){
        //conditionList.push("SystemPrompts.Name='"+topic+"'")
        filterParams = {'Name':topic};
    }
		
	if(persona!=''){
        var personaList = Array.isArray(persona) ? persona : persona.split(",")
		personaList = personaList.map(data=>data.toString().trim())
        //conditionList.push("SystemPrompts.Persona in ('"+persona.replace(/,/g,"','")+"')")
        filterParams = {'Persona':{ $in: personaList }};
    }

    if((persona!='')&&(topic!='')){
        var personaList = Array.isArray(persona) ? persona : persona.split(",")
		personaList = personaList.map(data=>data.toString().trim())
		filterParams = {
            'Name':topic,
            'Persona':{ $in: personaList }
        }
    }
    
	// let query = "select {} from QuestionBank "
	// 			+"left join SystemPrompts on SystemPrompts.ROWID = QuestionBank.SystemPromptROWID "
	// 			+"where "+conditionList.join(" and ")
	// 			+" order by SystemPrompts.Name, SystemPrompts.Persona, QuestionBank.AskingOrder ASC"
	// console.info((new Date()).toString()+"|"+prependToLog,"++++++++++++++++++++++",query);
	// getAllRows("SystemPrompts.ROWID, SystemPrompts.Name, SystemPrompts.Persona, QuestionBank.AskingOrder,"
    //             +"QuestionBank.ROWID, QuestionBank.QuestionType, QuestionBank.Question, QuestionBank.ResponseValidations,"
    //             +"QuestionBank.avURL,QuestionBank.ResponseFormat, QuestionBank.Options,"
    //             +"QuestionBank.Answers, QuestionBank.Feedback, QuestionBank.ImageURL,QuestionBank.Tags,"
    //             +"QuestionBank.ResponseTimeOut, QuestionBank.IsEvaluative,QuestionBank.IsActive,Questionbank.SkipLogic",query,zcql,prependToLog)
    console.info((new Date()).toString()+"|"+prependToLog,".................",filterParams); 
    systemPrompts.findOne(filterParams).select("_id")
    .then((systemPrompt)=>{
        if(systemPrompt==null){
            let responseJSON = {
                OperationStatus:"NO_TOPIC",
                Status:"No such topic and(or) persona"
            }
            console.info((new Date()).toString()+"|"+prependToLog,`End of Execution. Returned ${responseJSON.length} questions`)
            res.status(200).json(responseJSON)
        }
        else{
            console.info((new Date()).toString()+"|"+prependToLog,`Found System Prompt Record:`+systemPrompt["_id"])
            questionBank.find({SystemPromptROWID:systemPrompt["_id"]})
            .populate(
                {
                    path: 'SystemPromptROWID',
                    select: '_id Name Persona -_id'
                }
            )
            .select(
            'SystemPromptROWID Name Persona AskingOrder _id QuestionType ' +
            'Question ResponseValidations avURL ResponseFormat Options Answers ' +
            'Feedback ImageURL Tags ResponseTimeOut IsEvaluative IsActive SkipLogic'
            )
            .sort('SystemPromptROWID.Name SystemPromptROWID.Persona AskingOrder')
            .then((allJsonReport)=>{
                console.info((new Date()).toString()+"|"+prependToLog,"allJson...",allJsonReport);
                if(allJsonReport.length==0){
                    let responseJSON = {
                        OperationStatus:"NO_QSTN_CFG",
                        Status:"No question configured for the topic and(or) persona"
                    }
                    console.info((new Date()).toString()+"|"+prependToLog,`End of Execution. Returned ${responseJSON.length} questions`)
                    res.status(200).json(responseJSON)
                }
                else{
                    console.info((new Date()).toString()+"|"+prependToLog,"Fetched "+allJsonReport.length+" records from QuestionBank")
                    
                    var jsonReport = allJsonReport
                    console.debug((new Date()).toString()+"|"+prependToLog,'Retrieved Report of length: '+jsonReport.length+" | "+JSON.stringify(jsonReport))

                    var responseJSON = jsonReport.map(record => {
                        var feedback = ((record['Feedback']==null) || (record['Feedback'].length==0)) ? null:(record['Feedback'].length > 0 ? JSON.parse(record['Feedback']):null)
                        if((typeof feedback['onSuccess'] === 'undefined')||(typeof feedback['onSuccessAVURL'] === 'undefined')||(typeof feedback['onError'] === 'undefined')||(typeof feedback['onErrorAVURL'] === 'undefined'))
                            feedback = JSON.parse(feedback)

                        var responsevalidation = ((record['ResponseValidations']==null) || (record['ResponseValidations'].length==0)) ? null:(record['ResponseValidations'].length>0 ? JSON.parse(record['ResponseValidations']):null)
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
                            topicID: record.SystemPromptROWID._id,
                            topic: record.SystemPromptROWID.Name,
                            persona: record.SystemPromptROWID.Persona,
                            displaySequence: record.AskingOrder,
                            questionID: record._id,
                            questionType: record.QuestionType,
                            question: decodeURI(record.Question),
                            audioURL: record.avURL,
                            imageURL:record.ImageURL,
                            responseType: record.ResponseFormat,
                            options: ((record.Options!=null)&&(record.Options.length>0))?(decodeURI(record.Options)).toString().split("\n"):[],
                            answers: ((record.Answers!=null)&&(record.Answers.length>0))?(decodeURI(record.Answers)).toString().split("\n"):[],
                            tags: ((record.Tags!=null)&&(record.Tags.length>0))?(decodeURI(record.Tags)).toString().split(","):[],
                            successMessage : feedback==null?null:decodeURI(feedback['onSuccess'])=="null"?null:decodeURI(feedback['onSuccess']),
                            errorMessage : feedback==null?null:decodeURI(feedback['onError'])=="null"?null:decodeURI(feedback['onError']),
                            successAVURL : feedback==null?null:decodeURI(feedback['onSuccessAVURL'])=="null"?null:decodeURI(feedback['onSuccessAVURL']),
                            errorAVURL : feedback==null?null:decodeURI(feedback['onErrorAVURL'])=="null"?null:decodeURI(feedback['onErrorAVURL']),
                            constraints : constraint,
                            constraintMessage:constraintMessage,
                            questionTimeOut : record.ResponseTimeOut,
                            isEvaluative:record.IsEvaluative,
                            skipLogic:record.SkipLogic != null ? JSON.parse(record.SkipLogic) : null,
                            isActive:record.IsActive,
                        }
                    })
                    console.info((new Date()).toString()+"|"+prependToLog,`End of Execution. Returned ${responseJSON.length} questions`)
                    res.status(200).json(responseJSON)
                }
            })
            .catch(err => {
                console.info((new Date()).toString()+"|"+prependToLog,'End of Execution with Error')
                console.error((new Date()).toString()+"|"+prependToLog,'Encountered Error: '+err)
                res.status(500).send(err)
            })
        }
    })
    .catch(err => {
        console.info((new Date()).toString()+"|"+prependToLog,'End of Execution with Error')
        console.error((new Date()).toString()+"|"+prependToLog,'Encountered Error: '+err)
        res.status(500).send(err)
    })
})

app.delete("/*", (req, res) => {
    let startTimeStamp = new Date();
    //let catalystApp = catalyst.initialize(req, { type: catalyst.type.applogic });
    
    const requestBody = req.body;
  
    const executionID = Math.random().toString(36).slice(2)
    
    //Prepare text to prepend with logs
    const params = ["QuestionBankCRUD",req.method,executionID,""]
    const prependToLog = params.join(" | ")
    
    console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")
    
    //Initialize Response Object
    var responseObject = {
        "OperationStatus":"SUCCESS"
    }
    const rowID = req.url.substring(1,req.url.length)
  
    if(rowID.length==0){
        responseObject['OperationStatus'] = "REQ_ERR"
        responseObject['StatusDescription'] = "send the ROWID in url e.g. /wordle/198978766545"
        console.info((new Date()).toString()+"|"+prependToLog,"End of Execution")
        console.debug((new Date()).toString()+"|"+prependToLog,"End of Execution. Response:",responseObject)
        res.status(200).json(responseObject)
    }
    else {
       // let zcql = catalystApp.zcql()
       // zcql.executeZCQLQuery("Delete from QuestionBank where ROWID = "+rowID)
       questionBank.deleteMany({ _id: rowID })
        .then((row)=>{
            if((row.length > 0) && (row[0]['QuestionBank']['DELETED_ROWS_COUNT']<=0)){
            responseObject['OperationStatus'] = "APP_ERR"
            responseObject['StatusDescription'] = "No such record with ROWID = "+rowID
            }
            console.info((new Date()).toString()+"|"+prependToLog,"End of Execution")
            console.debug((new Date()).toString()+"|"+prependToLog,"End of Execution. Response:",responseObject,"\nUpated Data: ",row)
            res.status(200).json(responseObject)
        })
        .catch((error)=>{
                console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with error")
                console.error((new Date()).toString()+"|"+prependToLog,"Error in updating data: ",error)
                res.status(500).send(error)
        })
    }
})
  
module.exports = app;
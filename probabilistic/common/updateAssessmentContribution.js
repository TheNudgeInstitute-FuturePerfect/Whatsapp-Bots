// const catalyst = require('zcatalyst-sdk-node');
//const catalyst = require("zoho-catalyst-sdk");
const SystemPrompt = require(".././models/SystemPrompts.js");
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

module.exports = async (basicIO) => {
	/*
	Request Params: 
		prompt: <Flow Version>
	Response: {
		OperationStatus: <Status Code>
		ErrorDescription: <Description of error if any>
		Value: <Contribution updated>
	}
	*/

	//const catalystApp = catalyst.initialize();

	const executionID = Math.random().toString(36).slice(2)

	//Prepare text to prepend with logs
	const params = ["Update System Prompt",executionID,""]
	const prependToLog = params.join(" | ")
		
	console.info((new Date()).toString()+"|"+prependToLog,"Execution Started")

	var result = {
		OperationStatus : "SUCCESS"
	}
	var updateData = {}
	var rowID = basicIO["id"];
	var objectIdRow;
	if(typeof rowID === 'undefined'){
		result['OperationStatus']="REQ_ERR"
		result['ErrorDescription']="Missing parameter: id. ID of the prompt of the topic is required."
		console.info((new Date()).toString()+"|"+prependToLog,"Execution Completed: ",result);
		return JSON.stringify(result);
		
	}
	else{
		rowID = rowID
		objectIdRow = new ObjectId(rowID);
		//Get the data for this ROWID
		//const zcql = catalystApp.zcql()
		//const query = "select ROWID, Name, Content, IsActive, SupportingText, SupportingAVURL,SupportingImageURL, Sequence, Persona, ObjectiveMessage, Type, ShowLearningContent from SystemPrompts where ROWID='"+rowID+"'"
		try{
        //    const searchQuery = await zcql.executeZCQLQuery(query);
		    const searchQuery = await SystemPrompt.findOne({ _id: objectIdRow });
			console.log(searchQuery,"y");
		   if(!((searchQuery!=null))){
				result['OperationStatus']="REQ_ERR"
				result['StatusDescription']="There is no record for id="+rowID
				console.info((new Date()).toString()+"|"+prependToLog,"Execution Completed: ",result);
				return JSON.stringify(result);
				
			}
			else{	
				var isActive = basicIO["isactive"];
				if((typeof isActive !== 'undefined')&&(typeof isActive !== "boolean")){
					result['OperationStatus']="REQ_ERR"
					result['StatusDescription']="isactive must be true or false. It's "+(typeof isActive)
					console.info((new Date()).toString()+"|"+prependToLog,"Execution Completed: ",result);
					return JSON.stringify(result);
					
				}
				else{

					if(typeof isActive !== 'undefined')
						updateData["IsActive"]=isActive
			
					var seqNO =  basicIO["sequence"]
					if((typeof seqNO !== 'undefined')&&(isNaN(parseInt(seqNO)))){
						result['OperationStatus']="REQ_ERR"
						result['StatusDescription']="sequence must be an integer. It's "+(typeof seqNO)
						console.info((new Date()).toString()+"|"+prependToLog,"Execution Completed: ",result);
						return JSON.stringify(result);
						
					}
					else{
						var showLearningContent = basicIO["showLearningContent"]
						if((typeof showLearningContent !== 'undefined')&&(typeof showLearningContent !== "boolean")){
							result['OperationStatus']="REQ_ERR"
							result['StatusDescription']="showLearningContent must be true or false. It's "+(typeof showLearningContent)
							console.info((new Date()).toString()+"|"+prependToLog,"Execution Completed: ",result);
							return JSON.stringify(result);
						}
						else{
							var isPaid = basicIO["isPaid"]
							if((typeof isPaid !== 'undefined')&&(typeof isPaid !== "boolean")){
								result['OperationStatus']="REQ_ERR"
								result['StatusDescription']="isPaid must be true or false. It's "+(typeof showLearningContent)
								console.info((new Date()).toString()+"|"+prependToLog,"Execution Completed: ",result);
								return JSON.stringify(result);
							}
							else{
								if(typeof isPaid !== 'undefined')
									updateData["IsPaid"]=isPaid

								if(typeof showLearningContent !== 'undefined')
									updateData["ShowLearningContent"]=showLearningContent

								if(typeof seqNO === 'undefined')
									seqNO = searchQuery['Sequence']
								else
									updateData["Sequence"]=seqNO
					
								var name = basicIO["prompt"];
								if(typeof name !== 'undefined'){
									name = name.toString().trim()
									updateData["Name"]= name
								}
								else
									name = searchQuery['Name']

								var prompt = basicIO["content"];		
								if(typeof prompt !== 'undefined')
									updateData["Content"]=prompt
							
								var supportingText = basicIO["helptext"]
								if(typeof supportingText !== 'undefined')
									updateData["SupportingText"]=supportingText
							
								var supportingAVURL = basicIO["helpurl"]
								if(typeof supportingAVURL !== 'undfined')
									updateData["SupportingAVURL"]=supportingAVURL
							
								var supportingImageURL = basicIO["helpimage"]
									if(typeof supportingImageURL !== 'undefined')
									updateData["SupportingImageURL"]=supportingImageURL
								
								var persona = basicIO["persona"]
									if(typeof persona !== 'undefined')
									updateData["Persona"]=persona
								
								var objectiveMessage = basicIO["objmsg"]
									if(typeof objectiveMessage !== 'undefined')
									updateData["ObjectiveMessage"]=objectiveMessage
								
								var type = basicIO["type"]
									if(typeof type !== 'undefined')
									updateData["Type"]=type
								
								var learningObjective = basicIO["learningObjective"]
									if(typeof learningObjective !== 'undefined')
									updateData["LearningObjective"]=learningObjective
								
								var module = basicIO["module"]
									if(typeof module !== 'undefined')
									updateData["Module"]=module
								
								var game = basicIO["game"]
									if(typeof game !== 'undefined')
									updateData["Game"]=game
								

								if((typeof seqNO !== 'undefined')||(typeof name !== 'undefined'))
									updateData["PrimaryKey"]=name+"-"+seqNO								

								console.debug((new Date()).toString()+"|"+prependToLog,updateData)

								// //let table = catalystApp.datastore().table('SystemPrompts')
								try{
								const updateQueryResult = await SystemPrompt.updateOne({_id:objectIdRow},updateData);
								result['OperationStatus']="SUCCESS"
									console.info((new Date()).toString()+"|"+prependToLog,"Execution Completed: ",result);
									return JSON.stringify(result);
								} catch(error){
									result['OperationStatus']="ZCQL_ERR"
									result['ErrorDescription']="Error in execution update query: "+error
									console.info((new Date()).toString()+"|"+prependToLog,"Execution Completed with Error",result);
									console.error((new Date()).toString()+"|"+prependToLog,error)
									return JSON.stringify(result);
								}
							}
						}
					}
				}
			}
		} catch(error){
			result['OperationStatus']="ZCQL_ERR"
			result['ErrorDescription']="Error in marking prompts inactive"
			console.info((new Date()).toString()+"|"+prependToLog,"Execution Completed with Error",result);
			console.error((new Date()).toString()+"|"+prependToLog,error)					
			return JSON.stringify(result);
		}
	}
}
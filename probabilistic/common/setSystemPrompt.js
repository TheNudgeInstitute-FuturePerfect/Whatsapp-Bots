// const catalyst = require('zcatalyst-sdk-node');
const catalyst = require("zoho-catalyst-sdk");

module.exports = (context, basicIO) => {
	/*
	Request Params: 
		{
			prompt: <Name of the prompt>
			content: <Content>
			isactive: <true/false>
		}
	Response: {
		OperationStatus: <Status Code>
		StatusDescription: <Description of error if any>
		Value: <Contribution updated>
	}
	*/

	const catalystApp = catalyst.initialize(context);

	var result = {
		OperationStatus : "SUCCESS"
	}
	
	var prompt = basicIO["prompt"];
	if(typeof prompt === 'undefined'){
		result['OperationStatus']="REQ_ERR"
		result['StatusDescription']="Missing parameter: prompt"
		console.log("Execution Completed: ",result);
		basicIO.write(JSON.stringify(result));
		context.close();
	}
	else{
		prompt = prompt.toString()
		if(prompt.length > 20){
			result['OperationStatus']="REQ_ERR"
			result['StatusDescription']="Topic name in prompt can't exceed 20 characters including whitespace and can't have emojis"
			console.log("Execution Completed: ",result);
			basicIO.write(JSON.stringify(result));
			context.close();
		}
		else{
			var isActive = basicIO["isactive"];
			if(typeof isActive === 'undefined'){
				result['OperationStatus']="REQ_ERR"
				result['StatusDescription']="Missing parameter: isactive"
				console.log("Execution Completed: ",result);
				basicIO.write(JSON.stringify(result));
				context.close();
			}
			else if((typeof isActive !== "boolean")&&(!(['true','false',true,false].includes(isActive)))){
				result['OperationStatus']="REQ_ERR"
				result['StatusDescription']="isactive must be true or false. It's "+(typeof isActive)
				console.log("Execution Completed: ",result,isActive);
				basicIO.write(JSON.stringify(result));
				context.close();
			}
			else{
				var content = basicIO["content"]
				if(typeof content === 'undefined'){
					result['OperationStatus']="REQ_ERR"
					result['StatusDescription']="Missing parameter: content"
					console.log("Execution Completed: ",result);
					basicIO.write(JSON.stringify(result));
					context.close();
				}
				else{
					var seqNO =  basicIO["sequence"]
					if(typeof seqNO === 'undefined'){
						result['OperationStatus']="REQ_ERR"
						result['StatusDescription']="Missing parameter: sequence"
						console.log("Execution Completed: ",result);
						basicIO.write(JSON.stringify(result));
						context.close();
					}
					else if(isNaN(parseInt(seqNO) == true)){
						result['OperationStatus']="REQ_ERR"
						result['StatusDescription']="sequence must be an integer. It's "+(typeof seqNO)
						console.log("Execution Completed: ",result);
						basicIO.write(JSON.stringify(result));
						context.close();
					}
					else
					{
						var supportingText =  basicIO["helptext"]
						var supportingAVURL =  basicIO["helpurl"]
						var supportingImageURL = basicIO["helpimage"]
						var persona = basicIO["persona"]
						var objectiveMessage = basicIO["objmsg"]
						var type = basicIO["type"]
						if((typeof persona !== 'undefined')&&(persona != null)&&(persona.length>20)){
							result['OperationStatus']="REQ_ERR"
							result['StatusDescription']="Persona name in prompt can't exceed 20 characters including whitespace and can't have emojis"
							console.log("Execution Completed: ",result);
							basicIO.write(JSON.stringify(result));
							context.close();
						}
						else if((typeof persona !== 'undefined')&&(persona != null)&&(persona.length == 0)){
							result['OperationStatus']="REQ_ERR"
							result['StatusDescription']="Persona name in prompt can't be empty string"
							console.log("Execution Completed: ",result);
							basicIO.write(JSON.stringify(result));
							context.close();
						}
						else{
							var insertQuery = {
								Name: prompt,
								Content: content,
								IsActive: isActive,
								SupportingText:supportingText,
								SupportingAVURL:supportingAVURL,
								SupportingImageURL: supportingImageURL,
								Sequence: seqNO,
								PrimaryKey: prompt+"-"+seqNO,
								Persona: persona,
								ObjectiveMessage:objectiveMessage,
								Type:(typeof type === 'undefined') ? "Topic Prompt" : type 
							}
							const datastore = catalystApp.datastore()
							let table = datastore.table('SystemPrompts');
							table.insertRow(insertQuery)
							.then((insertQueryResult) => {
								const allConfig = require("./application-config.json")
								let functions = catalystApp.functions()
								allConfig['defaultConfig'].forEach(cfg=>{
									functions.execute("setConfigurationParam",{
										args:{
											param:cfg.Name,
											value:cfg.Value,
											description:cfg.Description,
											id:insertQueryResult['ROWID']
										}
									})
									.then((addedCFG)=>console.log(" default configuration:",addedCFG))
									.catch(err=>console.log("Error in adding default configuration:",err))
								})

								result['OperationStatus']="SUCCESS"
								const searchQuery = "Select ROWID from SystemPrompts where IsActive = true and Name = '"+prompt+"'"
								const zcql = catalystApp.zcql()
								zcql.executeZCQLQuery(searchQuery)
								.then(searchQueryResult=>{
									if(searchQueryResult==null){
										result['OperationStatus']="SUCCESS_NO_ACTV"
										result['StatusDescription']="Prompt added. But none of the prompts are active for the topic '"+prompt+"'."
										console.log("Execution Completed: ",result);
										basicIO.write(JSON.stringify(result));
										context.close();
									}
									else if(searchQueryResult.length==0){
										result['OperationStatus']="SUCCESS_NO_ACTV"
										result['StatusDescription']="Prompt added. But none of the prompts are active for the topic '"+prompt+"'."
										console.log("Execution Completed: ",result);
										basicIO.write(JSON.stringify(result));
										context.close();
									}
									/*else if(searchQueryResult.length>1){
										var updateQuery = searchQueryResult.filter(data=>data.SystemPrompts.ROWID != insertQueryResult.ROWID)
										updateQuery = updateQuery.map(data=>{
											var returnVal = {}
											returnVal['ROWID']=data.SystemPrompts.ROWID
											returnVal['IsActive']=false
											return returnVal	
										})
										table.updateRows(updateQuery)
										.then((updateQueryResult) => {
											result['OperationStatus']="SUCCESS_MLTPL_ACTV"
											result['StatusDescription']="Prompt added. Multiple prompts were active for topic - '"+prompt+"'. Thus deactivated all other prompts except the new one."
											console.log("Execution Completed: ",result);
											basicIO.write(JSON.stringify(result));
											context.close();
										})
										.catch(err=>{
											result['OperationStatus']="SUCCESS_MLTPL_ACTV_ERR"
											result['StatusDescription']="Prompt added. Multiple prompts are active for topic - '"+prompt+"'. Please mark only one as active."
											console.log("Execution Completed: ",result,err);
											basicIO.write(JSON.stringify(result));
											context.close();
										})
									}*/
									else{
										console.log("Execution Completed: ",result);
										basicIO.write(JSON.stringify(result));
										context.close();
									}
								})
								.catch(err=>{
									result['OperationStatus']="ZCQL_ERR"
									result['StatusDescription']="Error in execution search query"
									console.log("Execution Completed: ",result,err);
									basicIO.write(JSON.stringify(result));
									context.close();
								})
							})
							.catch(err=>{
								if(err.indexOf("DUPLICATE")!=-1){
									result['OperationStatus']="DUP_ERR"
									result['StatusDescription']="A prompt with same name and sequene number exists. Please use a different sequence number"
								}
								else{
									result['OperationStatus']="ZCQL_ERR"
									result['StatusDescription']="Error in inserting new record"
								}
								console.log("Execution Completed: ",result,err);
								basicIO.write(JSON.stringify(result));
								context.close();
							})
						}
					}
				}
			}
		}
	}
}
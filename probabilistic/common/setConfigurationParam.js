// const catalyst = require('zcatalyst-sdk-node');
const catalyst = require("zoho-catalyst-sdk");

module.exports = async (basicIO) => {
	/*
	Request:
		name: <Name of the parameter. Case insensitive>,
		value: <Value of the parameter. Case sensitive>
		description: <Text describing the parameter.>
	Response:
	{	
		OperationStatus: <Status>,
		ErrorDescription: <Sth about error>,
		Configuration = [
							{
								Name: <Name of the parameter configured>,
								Value: <Value of the parameter configured>
								Description: <Text describing the parameter.>
							}
						]
	}
	*/


	const catalystApp = catalyst.initialize();

	const executionID = Math.random().toString(36).slice(2)

	//Prepare text to prepend with logs
	const params = ["Add Configuration Param",executionID,""]
	const prependToLog = params.join(" | ")
		
	console.info((new Date()).toString()+"|"+prependToLog,"Execution Started")


	var result = {
		OperationStatus : "SUCCESS"
	}
	/*var assessment = basicIO["version"];
	if(typeof assessment === 'undefined'){
		result['OperationStatus']="REQ_ERR"
		result['ErrorDescription']="Missing parameter: version"
		console.log("Execution Completed: ",result);
		return JSON.stringify(result);
		
	}
	else{
		let zcql = catalystApp.zcql()
		zcql.executeZCQLQuery("select ROWID from Assessments where Assessment = '"+assessment+"'")
		.then(searchQueryResult => {
			if(searchQueryResult.length == 0){
				result['OperationStatus']="VERSN_ERR"
				result['ErrorDescription']="Flow version not found: "+assessment
				console.log("Execution Completed: ",result);
				return JSON.stringify(result);
			}
			else{
				const assessmentROWID = searchQueryResult[0]['Assessments']['ROWID']*/
				var name = basicIO["param"];
				if(typeof name === 'undefined'){
					result['OperationStatus']="REQ_ERR"
					result['ErrorDescription']="Missing parameter: param"
					console.info((new Date()).toString()+"|"+prependToLog,"Execution Completed: ",result);
					return JSON.stringify(result);
					
				}
				else{
					name = name.toString().toLowerCase().trim()
					var val = basicIO["value"];
					if(typeof val === 'undefined'){
						result['OperationStatus']="REQ_ERR"
						result['ErrorDescription']="Missing parameter: value"
						console.info((new Date()).toString()+"|"+prependToLog,"Execution Completed: ",result);
						return JSON.stringify(result);
					}
					else{
						val = val.toString().trim()
						var systemPromptROWID = basicIO["id"];
						if(typeof systemPromptROWID === 'undefined'){
							result['OperationStatus']="REQ_ERR"
							result['ErrorDescription']="Missing parameter: id. Please send the ID of System Prompt"
							console.info((new Date()).toString()+"|"+prependToLog,"Execution Completed: ",result);
							return JSON.stringify(result);
						}
						else{
							var desc = basicIO["description"];
							if(typeof desc === 'undefined')
								desc=null
						
							var insertQuery = {
								Name: encodeURI(name),
								Value: encodeURI(val),
								Description: encodeURI(desc),
								SystemPromptROWID: systemPromptROWID,
								PrimaryKey:systemPromptROWID+"-"+encodeURI(name)
							}

							let table = catalystApp.datastore().table('Configurations');
							try{
								const insertQueryResult = await table.insertRow(insertQuery);
                                result['OperationStatus']="SUCCESS"
								result['Configurations']=insertQueryResult
								console.info((new Date()).toString()+"|"+prependToLog,"Execution Completed: ",result);
								return JSON.stringify(result);
							} catch(error){
                                result['OperationStatus']="ZCQL_ERR"
								if(error.includes("DUPLICATE"))
									result['OperationStatus']="DUP_RCRD"
								result['ErrorDescription']="Error in execution insert query"
								console.info((new Date()).toString()+"|"+prependToLog,"Execution Completed: ",result,error);
								return JSON.stringify(result);
							}
							
						}
					}
				}
		/*	}
		})
		.catch(error => {
			result['OperationStatus']="ZCQL_ERR"
			result['ErrorDescription']="Error in execution search query"
			console.log("Execution Completed: ",result,error);
			return JSON.stringify(result);

		})
	}*/
}
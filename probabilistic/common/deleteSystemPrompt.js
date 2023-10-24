// const catalyst = require('zcatalyst-sdk-node');
//const catalyst = require("zoho-catalyst-sdk");
const SystemPrompts = require('.././models/SystemPrompts.js');

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

	const executionID = basicIO['ExecutionID'] ? basicIO['ExecutionID'] : Math.random().toString(36).slice(2)

	//Prepare text to prepend with logs
	const params = ["Delete System Prompt",executionID,""]
	const prependToLog = params.join(" | ")
		
	console.info((new Date()).toString()+"|"+prependToLog,"Execution Started")

	var result = {
		OperationStatus : "SUCCESS"
	}

	var rowID = basicIO["id"];
	if(typeof rowID === 'undefined'){
		result['OperationStatus']="REQ_ERR"
		result['ErrorDescription']="Missing parameter: id"
		console.info((new Date()).toString()+"|"+prependToLog,"Execution Completed: ",result);
		return JSON.stringify(result);
	}
	else{
		if(Array.isArray(rowID)==false)
			rowID = rowID.toString().split(",")
			
		//const datastore = catalystApp.datastore()
		//const table = datastore.table("SystemPrompts")
		try{
           	const deleteQueryResult = await SystemPrompts.deleteMany({
				_id:{
					$in:rowID
				}
		   	})
			if(deleteQueryResult==null){
				result['OperationStatus']="NO_MTCHNG_ID"
				result['StatusDescription']="No matching ID found"
				result['id']=rowID
			}
			else if(deleteQueryResult.length==0){
				result['OperationStatus']="NO_MTCHNG_ID"
				result['StatusDescription']="No matching ID found"
				result['id']=rowID
			}
			else{
				result['OperationStatus']="SUCCESS"
				result['deletedIDs']=deleteQueryResult
			}
			console.info((new Date()).toString()+"|"+prependToLog,"Execution Completed: ",result);
			return JSON.stringify(result);
		} catch(error){
			result['OperationStatus']="ZCQL_ERR"
			result['ErrorDescription']="Error in deleting prompts"
			console.info((new Date()).toString()+"|"+prependToLog,"Execution Completed: ",result,error);
			return JSON.stringify(result);
		}
	}
}
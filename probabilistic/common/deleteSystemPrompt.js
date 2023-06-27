// const catalyst = require('zcatalyst-sdk-node');
const catalyst = require("zoho-catalyst-sdk");

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

	const catalystApp = catalyst.initialize();

	var result = {
		OperationStatus : "SUCCESS"
	}

	var rowID = basicIO["id"];
	if(typeof rowID === 'undefined'){
		result['OperationStatus']="REQ_ERR"
		result['ErrorDescription']="Missing parameter: id"
		console.log("Execution Completed: ",result);
		return JSON.stringify(result);
	}
	else{
		if(Array.isArray(rowID)==false)
			rowID = rowID.toString().split(",")
			
		const datastore = catalystApp.datastore()
		const table = datastore.table("SystemPrompts")
		try{
           const deleteQueryResult = await table.deleteRows(rowID);
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
				console.log("Execution Completed: ",result);
				return JSON.stringify(result);
		} catch(err){
			result['OperationStatus']="ZCQL_ERR"
			result['ErrorDescription']="Error in deleting prompts"
			console.log("Execution Completed: ",result,err);
			return JSON.stringify(result);
		}
	}
}
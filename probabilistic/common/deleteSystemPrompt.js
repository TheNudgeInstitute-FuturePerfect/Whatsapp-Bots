// const catalyst = require('zcatalyst-sdk-node');
const catalyst = require("zoho-catalyst-sdk");

module.exports = (context, basicIO) => {
	/*
	Request Params: 
		prompt: <Flow Version>
	Response: {
		OperationStatus: <Status Code>
		ErrorDescription: <Description of error if any>
		Value: <Contribution updated>
	}
	*/

	const catalystApp = catalyst.initialize(context);

	var result = {
		OperationStatus : "SUCCESS"
	}

	var rowID = basicIO("id");
	if(typeof rowID === 'undefined'){
		result['OperationStatus']="REQ_ERR"
		result['ErrorDescription']="Missing parameter: id"
		console.log("Execution Completed: ",result);
		basicIO.write(JSON.stringify(result));
		context.close();
	}
	else{
		if(Array.isArray(rowID)==false)
			rowID = rowID.toString().split(",")
			
		const datastore = catalystApp.datastore()
		const table = datastore.table("SystemPrompts")
		table.deleteRows(rowID)
		.then(deleteQueryResult=>{
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
			basicIO.write(JSON.stringify(result));
			context.close();
		})
		.catch(err=>{
			result['OperationStatus']="ZCQL_ERR"
			result['ErrorDescription']="Error in deleting prompts"
			console.log("Execution Completed: ",result,err);
			basicIO.write(JSON.stringify(result));
			context.close();
		})
	}
}
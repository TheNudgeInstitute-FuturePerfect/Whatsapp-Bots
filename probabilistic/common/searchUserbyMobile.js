// const catalyst = require('zcatalyst-sdk-node');
const catalyst = require("zoho-catalyst-sdk");

module.exports = async (basicIO) => {

	const catalystApp = catalyst.initialize();

	var responseJSON = {
		OperationStatus:"SUCCESS"
	}
	var userROWID = basicIO["UserROWID"]
	if(typeof userROWID !== 'undefined'){
		responseJSON['UserROWID']=userROWID
		console.log("End of Execution:", responseJSON)
		return JSON.stringify(responseJSON);
	}
	else{
		var mobile = basicIO["Mobile"]
		if(typeof mobile === 'undefined'){
			responseJSON['OperationStatus'] = "REQ_ERR"
			responseJSON['StatusDescription'] = 'Mobile field is required'
			console.log("End of Execution:", responseJSON)
			return JSON.stringify(responseJSON);
		}
		else{
			mobile = mobile.toString().slice(-10)
			let zcql = catalystApp.zcql()
			try{
               const user = await zcql.executeZCQLQuery("Select ROWID from Users where IsActive = true and Mobile = "+mobile)
               if(user==null){
					responseJSON['OperationStatus'] = "NO_DATA"
					responseJSON['StatusDescription'] = 'No record found with given mobile'
					console.log("End of Execution:", responseJSON)
					return JSON.stringify(responseJSON);
				}
				else if(user.length==0){
					responseJSON['OperationStatus'] = "NO_DATA"
					responseJSON['StatusDescription'] = 'No record found with given mobile'
					console.log("End of Execution:", responseJSON)
					return JSON.stringify(responseJSON);
				}
				else if(user.length!=1){
					responseJSON['OperationStatus'] = "DUP_RECORD"
					responseJSON['StatusDescription'] = 'Duplicate record found with given mobile'
					console.log("End of Execution:", responseJSON)
					return JSON.stringify(responseJSON);
				}
				else{
					responseJSON['UserROWID']=user[0]['Users']['ROWID']
					console.log("End of Execution:", responseJSON)
					return JSON.stringify(responseJSON);
				}
			} catch(err){
				result['OperationStatus']="ZCQL_ERR"
				result['ErrorDescription']="Error in search prompts"
				console.log("Execution Completed: ",result,err);
				return JSON.stringify(result);
			}
			
		}
	}
}
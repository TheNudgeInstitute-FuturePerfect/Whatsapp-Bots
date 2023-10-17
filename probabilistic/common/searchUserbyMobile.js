// const catalyst = require('zcatalyst-sdk-node');
//const catalyst = require("zoho-catalyst-sdk");
const User = require(".././models/Users.js");

module.exports = async (basicIO) => {

	const executionID = basicIO['ExecutionID'] ? basicIO['ExecutionID'] : Math.random().toString(36).slice(2)
    
	//Prepare text to prepend with logs
	const params = ["Search User Data by Mobile",executionID,""]
	const prependToLog = params.join(" | ")
	
	console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")
  

	//const catalystApp = catalyst.initialize();

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
			//let zcql = catalystApp.zcql()
			try{
			    const user = await User.find(
					{ IsActive: true, Mobile: mobile }, // Conditions to match
					'_id'); 	
               //const user = await zcql.executeZCQLQuery("Select ROWID from Users where IsActive = true and Mobile = "+mobile)
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
					responseJSON['UserROWID']=user[0]['_id']
					console.log("End of Execution:", responseJSON)
					return JSON.stringify(responseJSON);
				}
			} catch(error){
				responseJSON['OperationStatus']="ZCQL_ERR"
				responseJSON['ErrorDescription']="Error in search prompts"
				console.log("Execution Completed: ",responseJSON,error);
				return JSON.stringify(responseJSON);
			}
			
		}
	}
}
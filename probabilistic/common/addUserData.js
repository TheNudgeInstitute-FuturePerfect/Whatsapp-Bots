// const catalyst = require('zcatalyst-sdk-node');
//const catalyst = require("zoho-catalyst-sdk");
const UserData = require(".././models/UserData.js")

module.exports = async (basicIO) => {

	const executionID = basicIO['ExecutionID'] ? basicIO['ExecutionID'] : Math.random().toString(36).slice(2)
    
	//Prepare text to prepend with logs
	const params = ["Add User Data",executionID,""]
	const prependToLog = params.join(" | ")
	
	console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")
  
	//const catalystApp = catalyst.initialize();
	var responseJSON = {
		OperationStatus:"SUCCESS"
	}
	let userROWID = basicIO["UserROWID"]
	if(typeof userROWID === 'undefined'){
		const userData = basicIO["Users"]
		userROWID = userData['UserROWID']
	}
	const insertData = {
		UserROWID	:	userROWID,
		FlowID 		: 	basicIO["FlowID"],
		Segment		:	basicIO["Segment"],
		Question	:	basicIO["Question"],
		Answer		:	basicIO["Answer"]
	}
	
	// //let table = catalystApp.datastore().table("UserData")
	try{
       const row = await UserData.create(insertData);
	   responseJSON["UserDataROWID"] = row['_id']
	   console.info((new Date()).toString()+"|"+prependToLog,"End of Execution:", responseJSON)
	   return JSON.stringify(responseJSON);
	} catch (error) {
		responseJSON["OperationStatus"] = "APP_ERR"
		responseJSON["StatusDescription"] = error
		console.info((new Date()).toString()+"|"+prependToLog,"End of Execution:", responseJSON)
		return JSON.stringify(responseJSON);
	}
}
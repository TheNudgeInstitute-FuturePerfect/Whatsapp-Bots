// const catalyst = require('zcatalyst-sdk-node');
const catalyst = require("zoho-catalyst-sdk");
const UserData = require(".././models/UserData.js")

module.exports = async (basicIO) => {

	const catalystApp = catalyst.initialize();
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
	
	// let table = catalystApp.datastore().table("UserData")
	try{
       const row = await UserData.create(insertData);
	   responseJSON["UserDataROWID"] = row['ROWID']
	   console.log("End of Execution:", responseJSON)
	   return JSON.stringify(responseJSON);
	} catch (error) {
		responseJSON["OperationStatus"] = "APP_ERR"
		responseJSON["StatusDescription"] = error
		console.log("End of Execution:", responseJSON)
		return JSON.stringify(responseJSON);
	}
}
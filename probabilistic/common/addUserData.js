// const catalyst = require('zcatalyst-sdk-node');
const catalyst = require("zoho-catalyst-sdk");

module.exports = (context, basicIO) => {

	const catalystApp = catalyst.initialize(context);
	var responseJSON = {
		OperationStatus:"SUCCESS"
	}
	let userROWID = basicIO("UserROWID")
	if(typeof userROWID === 'undefined'){
		const userData = basicIO("Users")
		userROWID = userData['UserROWID']
	}
	const insertData = {
		UserROWID	:	userROWID,
		FlowID 		: 	basicIO("FlowID"),
		Segment		:	basicIO("Segment"),
		Question	:	basicIO("Question"),
		Answer		:	basicIO("Answer")
	}
	
	let table = catalystApp.datastore().table("UserData")
	table.insertRow(insertData)
	.then((row)=>{
		responseJSON["UserDataROWID"] = row['ROWID']
		console.log("End of Execution:", responseJSON)
		basicIO.write(JSON.stringify(responseJSON));
		context.close();
	})
	.catch((err)=>{
		responseJSON["OperationStatus"] = "APP_ERR"
		responseJSON["StatusDescription"] = err
		console.log("End of Execution:", responseJSON)
		basicIO.write(JSON.stringify(responseJSON));
		context.close();
	})
}
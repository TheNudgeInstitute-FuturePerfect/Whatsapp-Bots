// const catalyst = require('zcatalyst-sdk-node');
const catalyst = require("zoho-catalyst-sdk");

module.exports = (context, basicIO) => {

	const catalystApp = catalyst.initialize(context);

	var responseJSON = {
		OperationStatus:"SUCCESS"
	}
	var userROWID = basicIO["UserROWID"]
	if(typeof userROWID !== 'undefined'){
		responseJSON['UserROWID']=userROWID
		console.log("End of Execution:", responseJSON)
		basicIO.write(JSON.stringify(responseJSON));
		context.close();
	}
	else{
		var mobile = basicIO["Mobile"]
		if(typeof mobile === 'undefined'){
			responseJSON['OperationStatus'] = "REQ_ERR"
			responseJSON['StatusDescription'] = 'Mobile field is required'
			console.log("End of Execution:", responseJSON)
			basicIO.write(JSON.stringify(responseJSON));
			context.close();
		}
		else{
			mobile = mobile.toString().slice(-10)
			let zcql = catalystApp.zcql()
			zcql.executeZCQLQuery("Select ROWID from Users where IsActive = true and Mobile = "+mobile)
			.then((user)=>{
				if(user==null){
					responseJSON['OperationStatus'] = "NO_DATA"
					responseJSON['StatusDescription'] = 'No record found with given mobile'
					console.log("End of Execution:", responseJSON)
					basicIO.write(JSON.stringify(responseJSON));
					context.close();
				}
				else if(user.length==0){
					responseJSON['OperationStatus'] = "NO_DATA"
					responseJSON['StatusDescription'] = 'No record found with given mobile'
					console.log("End of Execution:", responseJSON)
					basicIO.write(JSON.stringify(responseJSON));
					context.close();
				}
				else if(user.length!=1){
					responseJSON['OperationStatus'] = "DUP_RECORD"
					responseJSON['StatusDescription'] = 'Duplicate record found with given mobile'
					console.log("End of Execution:", responseJSON)
					basicIO.write(JSON.stringify(responseJSON));
					context.close();
				}
				else{
					responseJSON['UserROWID']=user[0]['Users']['ROWID']
					console.log("End of Execution:", responseJSON)
					basicIO.write(JSON.stringify(responseJSON));
					context.close();
				}
			})
		}
	}
}
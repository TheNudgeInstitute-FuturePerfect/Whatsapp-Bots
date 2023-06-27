// const catalyst = require('zcatalyst-sdk-node');
const catalyst = require("zoho-catalyst-sdk");

module.exports = (context, basicIO) => {

	const catalystApp = catalyst.initialize(context);
	var responseJSON = {
		OperationStatus:"SUCCESS"
	}
	let userROWID = basicIO["UserROWID"]
	var mobile = basicIO["Mobile"]
	if((typeof userROWID === 'undefined') && (typeof mobile === 'undefined')){
		responseJSON['OperationStatus'] = "REQ_ERR"
		responseJSON['StatusDescription'] = 'Either UserROWID or Mobile field is required'
		console.log("End of Execution:", responseJSON)
		basicIO.write(JSON.stringify(responseJSON));
		context.close();
	}
	else{
		const flowID = basicIO["FlowID"]
		if(typeof flowID === 'undefined'){
			responseJSON['OperationStatus'] = "REQ_ERR"
			responseJSON['StatusDescription'] = 'FlowID is required'
			console.log("End of Execution:", responseJSON)
			basicIO.write(JSON.stringify(responseJSON));
			context.close();
		}
		else{
			const segment = basicIO["Segment"]
			if(typeof segment === 'undefined'){
				responseJSON['OperationStatus'] = "REQ_ERR"
				responseJSON['StatusDescription'] = 'Segment is required'
				console.log("End of Execution:", responseJSON)
				basicIO.write(JSON.stringify(responseJSON));
				context.close();
			}
			else{
				const question = basicIO["Question"]
				if(typeof question === 'undefined'){
					responseJSON['OperationStatus'] = "REQ_ERR"
					responseJSON['StatusDescription'] = 'Question is required'
					console.log("End of Execution:", responseJSON)
					basicIO.write(JSON.stringify(responseJSON));
					context.close();
				}
				else{
					if(typeof userROWID === 'undefined')
						responseJSON['UserROWIDPresent']=false
					else
						responseJSON['UserROWIDPresent']=true
					console.log("End of Execution:", responseJSON)
					basicIO.write(JSON.stringify(responseJSON));
					context.close();
				}
			}
		}
	}
}
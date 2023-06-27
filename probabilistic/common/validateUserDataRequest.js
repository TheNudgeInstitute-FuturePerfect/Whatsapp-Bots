// const catalyst = require('zcatalyst-sdk-node');
const catalyst = require("zoho-catalyst-sdk");

module.exports = async (basicIO) => {

	const catalystApp = catalyst.initialize();
	var responseJSON = {
		OperationStatus:"SUCCESS"
	}
	let userROWID = basicIO["UserROWID"]
	var mobile = basicIO["Mobile"]
	if((typeof userROWID === 'undefined') && (typeof mobile === 'undefined')){
		responseJSON['OperationStatus'] = "REQ_ERR"
		responseJSON['StatusDescription'] = 'Either UserROWID or Mobile field is required'
		console.log("End of Execution:", responseJSON)
		return JSON.stringify(responseJSON);
		
	}
	else{
		const flowID = basicIO["FlowID"]
		if(typeof flowID === 'undefined'){
			responseJSON['OperationStatus'] = "REQ_ERR"
			responseJSON['StatusDescription'] = 'FlowID is required'
			console.log("End of Execution:", responseJSON)
			return JSON.stringify(responseJSON);
			
		}
		else{
			const segment = basicIO["Segment"]
			if(typeof segment === 'undefined'){
				responseJSON['OperationStatus'] = "REQ_ERR"
				responseJSON['StatusDescription'] = 'Segment is required'
				console.log("End of Execution:", responseJSON)
				return JSON.stringify(responseJSON);
				
			}
			else{
				const question = basicIO["Question"]
				if(typeof question === 'undefined'){
					responseJSON['OperationStatus'] = "REQ_ERR"
					responseJSON['StatusDescription'] = 'Question is required'
					console.log("End of Execution:", responseJSON)
					return JSON.stringify(responseJSON);
					
				}
				else{
					if(typeof userROWID === 'undefined')
						responseJSON['UserROWIDPresent']=false
					else
						responseJSON['UserROWIDPresent']=true
					console.log("End of Execution:", responseJSON)
					return JSON.stringify(responseJSON);
					
				}
			}
		}
	}
}
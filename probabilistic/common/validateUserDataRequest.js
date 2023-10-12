// const catalyst = require('zcatalyst-sdk-node');
//const catalyst = require("zoho-catalyst-sdk");

module.exports = async (basicIO) => {

	const executionID = basicIO['ExecutionID'] ? basicIO['ExecutionID'] : Math.random().toString(36).slice(2)
    
	//Prepare text to prepend with logs
	const params = ["Validate User Data Request",executionID,""]
	const prependToLog = params.join(" | ")
	
	console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")
  
	//const catalystApp = catalyst.initialize();
	var responseJSON = {
		OperationStatus:"SUCCESS"
	}
	let userROWID = basicIO["UserROWID"]
	var mobile = basicIO["Mobile"]
	if((typeof userROWID === 'undefined') && (typeof mobile === 'undefined')){
		responseJSON['OperationStatus'] = "REQ_ERR"
		responseJSON['StatusDescription'] = 'Either UserROWID or Mobile field is required'
		console.info((new Date()).toString()+"|"+prependToLog,"End of Execution:", responseJSON)
		return JSON.stringify(responseJSON);
		
	}
	else{
		const flowID = basicIO["FlowID"]
		if(typeof flowID === 'undefined'){
			responseJSON['OperationStatus'] = "REQ_ERR"
			responseJSON['StatusDescription'] = 'FlowID is required'
			console.info((new Date()).toString()+"|"+prependToLog,"End of Execution:", responseJSON)
			return JSON.stringify(responseJSON);
			
		}
		else{
			const segment = basicIO["Segment"]
			if(typeof segment === 'undefined'){
				responseJSON['OperationStatus'] = "REQ_ERR"
				responseJSON['StatusDescription'] = 'Segment is required'
				console.info((new Date()).toString()+"|"+prependToLog,"End of Execution:", responseJSON)
				return JSON.stringify(responseJSON);
				
			}
			else{
				const question = basicIO["Question"]
				if(typeof question === 'undefined'){
					responseJSON['OperationStatus'] = "REQ_ERR"
					responseJSON['StatusDescription'] = 'Question is required'
					console.info((new Date()).toString()+"|"+prependToLog,"End of Execution:", responseJSON)
					return JSON.stringify(responseJSON);
					
				}
				else{
					if(typeof userROWID === 'undefined')
						responseJSON['UserROWIDPresent']=false
					else
						responseJSON['UserROWIDPresent']=true
					console.info((new Date()).toString()+"|"+prependToLog,"End of Execution:", responseJSON)
					return JSON.stringify(responseJSON);
					
				}
			}
		}
	}
}
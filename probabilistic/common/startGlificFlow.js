// const catalyst = require('zcatalyst-sdk-node');
const catalyst = require("zoho-catalyst-sdk");

module.exports = async (basicIO) => {
	const catalystApp = catalyst.initialize();	
	let flowID = basicIO["flowID"]
	let contactID = basicIO["contactID"]
	var params = basicIO["params"]
	console.log("Request: ",flowID," | ",contactID)
	var responseJSON = {
		OperationStatus:"REQ_ERR",
		StatusDescription:null
	}
	if(typeof flowID === 'undefined'){
		responseJSON["StatusDescription"] = "messageID missing";
		console.log("Returned: ",responseJSON)
		return JSON.stringify(responseJSON);
		
	}
	else if(typeof contactID === 'undefined'){
		responseJSON["StatusDescription"] = "contactID missing";
		console.log("Returned: ",responseJSON)
		return JSON.stringify(responseJSON);
		
	}
	else if((typeof params !== 'undefined')&&(Array.isArray(params) == false)){
		responseJSON["StatusDescription"] = "params must be an array";
		console.log("Returned: ",responseJSON)
		return JSON.stringify(responseJSON);
		
	}
	else{
		if(typeof params === 'undefined'){
			params = []
		}
		responseJSON['OperationStatus'] = "SUCCESS"
		console.info("Sending request to Glific to send HSM message");
		const request = require('request');
		//Get Auth Token
		var options = {
			'method': process.env.authMethod,
			'url': process.env.authURL.toString().replace('{1}',process.env.authUser.toString()).replace('{2}',process.env.authPwd.toString()),
			'headers': {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				query: ``,
				variables: {}
			})
		};
		request(options, function (error, response) {
			if (error){
				console.log("Error in Glific Authentication API Call: "+error);
				console.log("Request Parameters: "+JSON.stringify(options));
				responseJSON['OperationStatus'] = "GLFC_AUTH_ERR"
				responseJSON['StatusDescription'] = error
				return JSON.stringify(responseJSON)
				
			}
			else if(response.body == 'Something went wrong'){
				console.log("Error returned by Glific Authentication API: "+response.body);
				console.log("Request Parameters: "+JSON.stringify(options));
				responseJSON['OperationStatus'] = "GLFC_AUTH_ERR"
				responseJSON['StatusDescription'] = response.body
				return JSON.stringify(responseJSON)
				
			}
			else{
				console.info("Successfully Authenticated with Glific");
				try{
					let responseBody = JSON.parse(response.body)
					const authToken = responseBody.data.access_token;
					console.info("Extracted access token from response."+
								"\nSending Message ID "+flowID+" to "+ contactID);
					
					options = {
						'method': process.env.operationMethod.toString(),
						'url': process.env.operationURL.toString(),
						'headers': {
							'Authorization': authToken,
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({
							query: `mutation startContactFlow($flowId: ID!, $contactId: ID!) {
										startContactFlow(flowId: $flowId, contactId: $contactId) {
											success
											errors {
												key
												message
											}
										}
									}`,
							variables: {
								"flowId": flowID,
								"contactId": contactID
							}
						})
					};
					request(options, function (error, response) {
						//If any error in API call throw error
						if (error){
							console.log("Error in resuming flow in Glific: "+error);
							console.log("Request Parameters: "+JSON.stringify(options));
							responseJSON['OperationStatus'] = "GLFC_API_ERR"
							responseJSON['StatusDescription'] = error
							return JSON.stringify(responseJSON)
							
						}
						else{
							console.log('Glific Response: '+response.body+"\n"+
										"\nRequest Parameters: "+JSON.stringify(options));
							const startFlowResponse = JSON.parse(response.body)
							//If any error retruned by Glific API throw error
							if(startFlowResponse.errors != null)
							{
								console.log("Error rreturned by HSM Message API: "+JSON.stringify(startFlowResponse.errors));
								console.log("Request Parameters: "+JSON.stringify(options));
								responseJSON['OperationStatus'] = "GLFC_API_ERR"
								responseJSON['StatusDescription'] = startFlowResponse.errors
								return JSON.stringify(responseJSON)
								
							}
							else
							{
								const elementData = startFlowResponse.data
								const elementStartContactFlow = elementData.startContactFlow
								const elementErrors = elementStartContactFlow.errors
								
								if(elementErrors != null) 
								{
									console.log('Error returned by Glific API '+JSON.stringify(startFlowResponse))
									responseJSON['OperationStatus'] = "GLFC_API_ERR"
									responseJSON['StatusDescription'] = elementErrors
									return JSON.stringify(responseJSON)
									
								}
								else
								{
									console.info("Successfully resumed flow in Glific");
									responseJSON['OperationStatus'] = "SUCCESS"
									return JSON.stringify(responseJSON)
									
								}
							}
						}
					});
				}
				catch(e){
					console.log("Error in resuming flow in Glific: "+e,"\nGlific Response: ",response.body);
					console.log("Request Parameters: "+JSON.stringify(options));
					responseJSON['OperationStatus'] = "GLFC_AUTH_API_ERR"
					responseJSON['StatusDescription'] = error
					return JSON.stringify(responseJSON)
					
				}
			}
		});
	}
}
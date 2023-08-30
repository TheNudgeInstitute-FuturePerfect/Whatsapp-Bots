// const catalyst = require('zcatalyst-sdk-node');
const catalyst = require("zoho-catalyst-sdk");

module.exports = async (basicIO) => {
	return new Promise((resolve,reject)=>{
		const catalystApp = catalyst.initialize();	
		const executionID = Math.random().toString(36).slice(2)

		//Prepare text to prepend with logs
		const logparams = ["Start Glific Flow",executionID,""]
		const prependToLog = logparams.join(" | ")
			
		console.info((new Date()).toString()+"|"+prependToLog,"Execution Started")

		let flowID = basicIO["flowID"]
		let contactID = basicIO["contactID"]
		var params = basicIO["params"]
		console.info((new Date()).toString()+"|"+prependToLog,"Request: ",flowID," | ",contactID)
		var responseJSON = {
			OperationStatus:"REQ_ERR",
			StatusDescription:null
		}
		if(typeof flowID === 'undefined'){
			responseJSON["StatusDescription"] = "messageID missing";
			console.info((new Date()).toString()+"|"+prependToLog,"Returned: ",responseJSON)
			reject(JSON.stringify(responseJSON));
			
		}
		else if(typeof contactID === 'undefined'){
			responseJSON["StatusDescription"] = "contactID missing";
			console.info((new Date()).toString()+"|"+prependToLog,"Returned: ",responseJSON)
			reject(JSON.stringify(responseJSON));
			
		}
		else if((typeof params !== 'undefined')&&(Array.isArray(params) == false)){
			responseJSON["StatusDescription"] = "params must be an array";
			console.info((new Date()).toString()+"|"+prependToLog,"Returned: ",responseJSON)
			reject(JSON.stringify(responseJSON));
			
		}
		else{
			if(typeof params === 'undefined'){
				params = []
			}
			responseJSON['OperationStatus'] = "SUCCESS"
			console.info((new Date()).toString()+"|"+prependToLog,"Sending request to Glific to send HSM message");
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
					console.info((new Date()).toString()+"|"+prependToLog,"Error in Glific Authentication API Call: "+error);
					console.info((new Date()).toString()+"|"+prependToLog,"Request Parameters: "+JSON.stringify(options));
					responseJSON['OperationStatus'] = "GLFC_AUTH_ERR"
					responseJSON['StatusDescription'] = error
					reject(JSON.stringify(responseJSON))
					
				}
				else if(response.body == 'Something went wrong'){
					console.info((new Date()).toString()+"|"+prependToLog,"Error returned by Glific Authentication API: "+response.body);
					console.info((new Date()).toString()+"|"+prependToLog,"Request Parameters: "+JSON.stringify(options));
					responseJSON['OperationStatus'] = "GLFC_AUTH_ERR"
					responseJSON['StatusDescription'] = response.body
					reject(JSON.stringify(responseJSON))
					
				}
				else{
					console.info((new Date()).toString()+"|"+prependToLog,"Successfully Authenticated with Glific");
					try{
						let responseBody = JSON.parse(response.body)
						const authToken = responseBody.data.access_token;
						console.info((new Date()).toString()+"|"+prependToLog,"Extracted access token from response."+
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
								console.info((new Date()).toString()+"|"+prependToLog,"Error in resuming flow in Glific: "+error);
								console.info((new Date()).toString()+"|"+prependToLog,"Request Parameters: "+JSON.stringify(options));
								responseJSON['OperationStatus'] = "GLFC_API_ERR"
								responseJSON['StatusDescription'] = error
								reject(JSON.stringify(responseJSON))
							}
							else{
								console.info((new Date()).toString()+"|"+prependToLog,'Glific Response: '+response.body+"\n"+
											"\nRequest Parameters: "+JSON.stringify(options));
								const startFlowResponse = JSON.parse(response.body)
								//If any error retruned by Glific API throw error
								if(startFlowResponse.errors != null)
								{
									console.info((new Date()).toString()+"|"+prependToLog,"Error rreturned by HSM Message API: "+JSON.stringify(startFlowResponse.errors));
									console.info((new Date()).toString()+"|"+prependToLog,"Request Parameters: "+JSON.stringify(options));
									responseJSON['OperationStatus'] = "GLFC_API_ERR"
									responseJSON['StatusDescription'] = startFlowResponse.errors
									reject(JSON.stringify(responseJSON))
									
								}
								else
								{
									const elementData = startFlowResponse.data
									const elementStartContactFlow = elementData.startContactFlow
									const elementErrors = elementStartContactFlow.errors
									
									if(elementErrors != null) 
									{
										console.info((new Date()).toString()+"|"+prependToLog,'Error returned by Glific API '+JSON.stringify(startFlowResponse))
										responseJSON['OperationStatus'] = "GLFC_API_ERR"
										responseJSON['StatusDescription'] = elementErrors
										reject(JSON.stringify(responseJSON))
									}
									else
									{
										console.info((new Date()).toString()+"|"+prependToLog,"Successfully resumed flow in Glific");
										responseJSON['OperationStatus'] = "SUCCESS"
										resolve(JSON.stringify(responseJSON))	
									}
								}
							}
						});
					}
					catch(error){
						console.info((new Date()).toString()+"|"+prependToLog,"Error in resuming flow in Glific: "+error,"\nGlific Response: ",response.body);
						console.info((new Date()).toString()+"|"+prependToLog,"Request Parameters: "+JSON.stringify(options));
						responseJSON['OperationStatus'] = "GLFC_AUTH_API_ERR"
						responseJSON['StatusDescription'] = error
						reject(JSON.stringify(responseJSON))
					}
				}
			});
		}
	})
}
// const catalyst = require('zcatalyst-sdk-node');
const catalyst = require("zoho-catalyst-sdk");

module.exports = (context, basicIO) => {
	const catalystApp = catalyst.initialize(context);	
	let msgID = basicIO["messageID"]
	let contactID = basicIO["contactID"]
	var params = basicIO["params"]
	console.log("Request: ",msgID," | ",contactID)
	var responseJSON = {
		OperationStatus:"REQ_ERR",
		StatusDescription:null
	}
	if(typeof msgID === 'undefined'){
		responseJSON["StatusDescription"] = "messageID missing";
		console.log("Returned: ",responseJSON)
		basicIO.write(JSON.stringify(responseJSON));
		context.close();
	}
	else if(typeof contactID === 'undefined'){
		responseJSON["StatusDescription"] = "contactID missing";
		console.log("Returned: ",responseJSON)
		basicIO.write(JSON.stringify(responseJSON));
		context.close();
	}
	else if((typeof params !== 'undefined')&&(Array.isArray(params) == false)){
		responseJSON["StatusDescription"] = "params must be an array";
		console.log("Returned: ",responseJSON)
		basicIO.write(JSON.stringify(responseJSON));
		context.close();
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
				basicIO.write(JSON.stringify(responseJSON))
				context.close()
			}
			else if(response.body == 'Something went wrong'){
				console.log("Error returned by Glific Authentication API: "+response.body);
				console.log("Request Parameters: "+JSON.stringify(options));
				responseJSON['OperationStatus'] = "GLFC_AUTH_ERR"
				responseJSON['StatusDescription'] = response.body
				basicIO.write(JSON.stringify(responseJSON))
				context.close()
			}
			else{
				console.info("Successfully Authenticated with Glific");
				try{
					let responseBody = JSON.parse(response.body)
					const authToken = responseBody.data.access_token;
					console.info("Extracted access token from response."+
								"\nSending Message ID "+msgID+" to "+ contactID);
					
					options = {
						'method': process.env.operationMethod.toString(),
						'url': process.env.operationURL.toString(),
						'headers': {
							'Authorization': authToken,
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({
							query: `mutation sendHsmMessage($templateId: ID!, $receiverId: ID!, $parameters: [String]) {
								sendHsmMessage(templateId: $templateId, receiverId: $receiverId, parameters: $parameters) {
									message{
										id
										body
										isHsm
									}
									errors {
										key
										message
									}
								}
							}`,
							variables: {
								"templateId": msgID,
								"receiverId": contactID,
								"parameters": params
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
							basicIO.write(JSON.stringify(responseJSON))
							context.close()
						}
						else{
							console.log('Glific Response: '+response.body+"\n"+
										"\nRequest Parameters: "+JSON.stringify(options));
							const hsmMsgResponse = JSON.parse(response.body)
							//If any error retruned by Glific API throw error
							if(hsmMsgResponse.errors != null)
							{
								console.log("Error rreturned by HSM Message API: "+JSON.stringify(hsmMsgResponse.errors));
								console.log("Request Parameters: "+JSON.stringify(options));
								responseJSON['OperationStatus'] = "GLFC_API_ERR"
								responseJSON['StatusDescription'] = hsmMsgResponse.errors
								basicIO.write(JSON.stringify(responseJSON))
								context.close()
							}
							else
							{
								const elementData = hsmMsgResponse.data
								const elementSendHsmMessage = elementData.sendHsmMessage
								const elementErrors = elementSendHsmMessage.errors
								if(elementErrors != null) 
								{
									console.log('Error returned by Glific API '+JSON.stringify(hsmMsgResponse))
									responseJSON['OperationStatus'] = "GLFC_API_ERR"
									responseJSON['StatusDescription'] = elementErrors
									basicIO.write(JSON.stringify(responseJSON))
									context.close()
								}
								else
								{
									console.info("Successfully resumed flow in Glific");
									responseJSON['OperationStatus'] = "SUCCESS"
									basicIO.write(JSON.stringify(responseJSON))
									context.close()
								}

							}
						}
					});
				}
				catch(e){
					console.log("Error in sending HSM in Glific: "+e,"\nGlific Response: ",response.body);
					console.log("Request Parameters: "+JSON.stringify(options));
					responseJSON['OperationStatus'] = "GLFC_AUTH_API_ERR"
					responseJSON['StatusDescription'] = error
					basicIO.write(JSON.stringify(responseJSON))
					context.close()
				}
			}
		});
	}
}
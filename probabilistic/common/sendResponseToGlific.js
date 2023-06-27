// const catalyst = require('zcatalyst-sdk-node');
const catalyst = require("zoho-catalyst-sdk");

module.exports = (context, basicIO) => {
	const env = process.env.CATALYST_USER_ENVIRONMENT
	const catalystApp = catalyst.initialize(context);	
	let flowID = basicIO("flowID")
	let contactID = basicIO("contactID")
	let resultJSON = basicIO("resultJSON")
	console.log("Request: ",flowID," | ",contactID," | ",resultJSON)
	var responseJSON = {
		OperationStatus:"REQ_ERR",
		ErrorDescription:null
	}
	if(typeof flowID === 'undefined'){
		responseJSON["ErrorDescription"] = "flowID missing";
		console.log("Returned: ",responseJSON)
		basicIO.write(responseJSON);
		context.close();
	}
	else if(typeof contactID === 'undefined'){
		responseJSON["ErrorDescription"] = "contactID missing";
		console.log("Returned: ",responseJSON)
		basicIO.write(responseJSON);
		context.close();
	}
	else if(typeof resultJSON === 'undefined'){
		responseJSON["ErrorDescription"] = "resultJSON missing";
		console.log("Returned: ",responseJSON)
		basicIO.write(responseJSON);
		context.close();
	}
	else{
		responseJSON['OperationStatus'] = "SUCCESS"
		console.info("Sending request to Glific to resume flow");
		const allConfig = require("./application-config.json")
		const glificAPIConfig = allConfig[env];
		const request = require('request');
		//Get Auth Token
		var options = {
			'method': glificAPIConfig.authentication.method,
			'url': glificAPIConfig.authentication.url.toString().replace('{1}',glificAPIConfig.authentication.username.toString()).replace('{2}',glificAPIConfig.authentication.password.toString()),
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
				responseJSON['ErrorDescription'] = error
				basicIO.write(JSON.stringify(responseJSON))
				context.close()
			}
			else if(response.body == 'Something went wrong'){
				console.log("Error returned by Glific Authentication API: "+response.body);
				console.log("Request Parameters: "+JSON.stringify(options));
				responseJSON['OperationStatus'] = "GLFC_AUTH_ERR"
				responseJSON['ErrorDescription'] = response.body
				basicIO.write(JSON.stringify(responseJSON))
				context.close()
			}
			else{
				console.info("Successfully Authenticated with Glific");
				let responseBody = JSON.parse(response.body)
				const authToken = responseBody.data.access_token;
				console.info("Extracted access token from response");
				console.log("Resuming flow "+flowID+" for ContactID "+ contactID+" in Glific");
				options = {
					'method': glificAPIConfig.resumeFlow.method.toString(),
					'url': glificAPIConfig.resumeFlow.url.toString(),
					'headers': {
						'Authorization': authToken,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						query: `mutation resumeContactFlow($flowId: ID!, $contactId: ID!, $result: Json) {
							resumeContactFlow(flowId: $flowId, contactId: $contactId, result: $result) {
								success
								errors {
									key
									message
								}
							}
						}`,
						variables: {
						"flowId": flowID,
						"contactId": contactID,
						"result": resultJSON
						}
					})
				};
				request(options, function (error, response) {
					//If any error in API call throw error
					if (error){
						console.log("Error in resuming flow in Glific: "+error);
						console.log("Request Parameters: "+JSON.stringify(options));
						responseJSON['OperationStatus'] = "GLFC_API_ERR"
						responseJSON['ErrorDescription'] = error
						basicIO.write(JSON.stringify(responseJSON))
						context.close()
					}
					else{
						console.log('Glific Response: '+response.body)
						console.log("Request Parameters: "+JSON.stringify(options));
						const resumeFlowResponse = JSON.parse(response.body)
						//If any error retruned by Glific API throw error
						if(resumeFlowResponse.errors != null){
							console.log("Error returned by Glific API: "+JSON.stringify(resumeFlowResponse));
							console.log("Request Parameters: "+JSON.stringify(options));
							responseJSON['OperationStatus'] = "GLFC_API_ERR"
							responseJSON['ErrorDescription'] = resumeFlowResponse.errors
							basicIO.write(JSON.stringify(responseJSON))
							context.close()
						}
						else{
							const elementData = resumeFlowResponse.data
							const elementResumeFlow = elementData.resumeContactFlow
							const elementErrors = elementResumeFlow.errors
							if(elementErrors != null) 
							{
								console.log('Error returned by Glific API '+JSON.stringify(resumeFlowResponse))
								responseJSON['OperationStatus'] = "GLFC_API_ERR"
								responseJSON['ErrorDescription'] = elementErrors
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
		});
	}
}
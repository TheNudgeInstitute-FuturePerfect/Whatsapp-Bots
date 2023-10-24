// const catalyst = require('zcatalyst-sdk-node');
//const catalyst = require("zoho-catalyst-sdk");

module.exports = async (basicIO) => {
  const env = process.env.CATALYST_USER_ENVIRONMENT;
  //const catalystApp = catalyst.initialize();
  const executionID = (typeof basicIO['executionID'] === 'undefined') ? Math.random().toString(36).slice(2) : basicIO['executionID']

	//Prepare text to prepend with logs
	const params = ["Send Reponse to Glific",executionID,""]
	const prependToLog = params.join(" | ")
		
	console.info((new Date()).toString()+"|"+prependToLog,"Execution Started")

  let flowID = basicIO["flowID"];
  let contactID = basicIO["contactID"];
  let resultJSON = basicIO["resultJSON"];
  console.info((new Date()).toString()+"|"+prependToLog,"Request: ", flowID, " | ", contactID, " | ", resultJSON);
  var responseJSON = {
    OperationStatus: "REQ_ERR",
    ErrorDescription: null,
  };
  if (typeof flowID === "undefined") {
    responseJSON["ErrorDescription"] = "flowID missing";
    console.info((new Date()).toString()+"|"+prependToLog,"Returned: ", responseJSON);
    return responseJSON;
  } else if (typeof contactID === "undefined") {
    responseJSON["ErrorDescription"] = "contactID missing";
    console.info((new Date()).toString()+"|"+prependToLog,"Returned: ", responseJSON);
    return responseJSON;
  } else if (typeof resultJSON === "undefined") {
    responseJSON["ErrorDescription"] = "resultJSON missing";
    console.info((new Date()).toString()+"|"+prependToLog,"Returned: ", responseJSON);
    return responseJSON;
  } else {
    responseJSON["OperationStatus"] = "SUCCESS";
    console.info((new Date()).toString()+"|"+prependToLog,"Sending request to Glific to resume flow");
    const allConfig = require("./sendResponseToGlific-config.json");
    const glificAPIConfig = allConfig[env];
    const request = require("request");
    //Get Auth Token
    var options = {
      method: glificAPIConfig.authentication.method,
      url: glificAPIConfig.authentication.url
        .toString()
        .replace("{1}", glificAPIConfig.authentication.username.toString())
        .replace("{2}", glificAPIConfig.authentication.password.toString()),
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: ``,
        variables: {},
      }),
    };
    request(options, function (error, response) {
      if (error) {
        console.info((new Date()).toString()+"|"+prependToLog,"Error in Glific Authentication API Call: " + error);
        console.info((new Date()).toString()+"|"+prependToLog,"Request Parameters: " + JSON.stringify(options));
        responseJSON["OperationStatus"] = "GLFC_AUTH_ERR";
        responseJSON["ErrorDescription"] = error;
        return JSON.stringify(responseJSON);
      } else if (response.body == "Something went wrong") {
        console.info((new Date()).toString()+"|"+prependToLog,
          "Error returned by Glific Authentication API: " + response.body
        );
        console.info((new Date()).toString()+"|"+prependToLog,"Request Parameters: " + JSON.stringify(options));
        responseJSON["OperationStatus"] = "GLFC_AUTH_ERR";
        responseJSON["ErrorDescription"] = response.body;
        return JSON.stringify(responseJSON);
      } else {
        console.info((new Date()).toString()+"|"+prependToLog,"Successfully Authenticated with Glific");
        let responseBody = JSON.parse(response.body);
        const authToken = responseBody.data.access_token;
        console.info((new Date()).toString()+"|"+prependToLog,"Extracted access token from response");
        console.info((new Date()).toString()+"|"+prependToLog,
          "Resuming flow " +
            flowID +
            " for ContactID " +
            contactID +
            " in Glific"
        );
        options = {
          method: glificAPIConfig.resumeFlow.method.toString(),
          url: glificAPIConfig.resumeFlow.url.toString(),
          headers: {
            Authorization: authToken,
            "Content-Type": "application/json",
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
              flowId: flowID,
              contactId: contactID,
              result: resultJSON,
            },
          }),
        };
        request(options, function (error, response) {
          //If any error in API call throw error
          if (error) {
            console.info((new Date()).toString()+"|"+prependToLog,"Error in resuming flow in Glific: " + error);
            console.info((new Date()).toString()+"|"+prependToLog,"Request Parameters: " + JSON.stringify(options));
            responseJSON["OperationStatus"] = "GLFC_API_ERR";
            responseJSON["ErrorDescription"] = error;
            return JSON.stringify(responseJSON);
          } else {
            console.info((new Date()).toString()+"|"+prependToLog,"Glific Response: " + response.body);
            console.info((new Date()).toString()+"|"+prependToLog,"Request Parameters: " + JSON.stringify(options));
            const resumeFlowResponse = JSON.parse(response.body);
            //If any error retruned by Glific API throw error
            if (resumeFlowResponse.errors != null) {
              console.info((new Date()).toString()+"|"+prependToLog,
                "Error returned by Glific API: " +
                  JSON.stringify(resumeFlowResponse)
              );
              console.info((new Date()).toString()+"|"+prependToLog,"Request Parameters: " + JSON.stringify(options));
              responseJSON["OperationStatus"] = "GLFC_API_ERR";
              responseJSON["ErrorDescription"] = resumeFlowResponse.errors;
              return JSON.stringify(responseJSON);
            } else {
              const elementData = resumeFlowResponse.data;
              const elementResumeFlow = elementData.resumeContactFlow;
              const elementErrors = elementResumeFlow.errors;
              if (elementErrors != null) {
                //If there are no flows awaiting response for the user, return success
                if(elementErrors[0]["message"].includes("does not have any active flows awaiting results")){
                  console.info((new Date()).toString()+"|"+prependToLog,elementErrors[0]["message"]);
                  responseJSON["OperationStatus"] = "SUCCESS";
                  responseJSON["ErrorDescription"] = elementErrors;
                }
                else{
                  console.info((new Date()).toString()+"|"+prependToLog,
                    "Error returned by Glific API " +
                      JSON.stringify(resumeFlowResponse)
                  );
                  responseJSON["OperationStatus"] = "GLFC_API_ERR";
                  responseJSON["ErrorDescription"] = elementErrors;
                }
                return JSON.stringify(responseJSON);
              } else {
                console.info((new Date()).toString()+"|"+prependToLog,"Successfully resumed flow in Glific");
                responseJSON["OperationStatus"] = "SUCCESS";
                return JSON.stringify(responseJSON);
              }
            }
          }
        });
      }
    });
  }
};

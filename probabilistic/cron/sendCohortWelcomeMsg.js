const catalyst = require("zoho-catalyst-sdk");

module.exports = (cronDetails) => {
  const catalystApp = catalyst.initialize();

  const executionID = Math.random().toString(36).slice(2)
    
  //Prepare text to prepend with logs
  const params = ["sendCohortWelcomeMsg",executionID,""]
  const prependToLog = params.join(" | ")
      
  console.info((new Date()).toString()+"|"+prependToLog,"Execution Started")
	

  let zcql = catalystApp.zcql();

  //Get the current time
  let currentDate = new Date();
  currentDate.setHours(currentDate.getHours() + 5);
  currentDate.setMinutes(currentDate.getMinutes() + 30);
  console.info((new Date()).toString()+"|"+prependToLog,"Current TimeStamp = ", currentDate);
  const currentHour = ("0" + currentDate.getHours()).slice(-2) + ":00";
  const currentDt =
    currentDate.getFullYear() +
    "-" +
    ("0" + (currentDate.getMonth() + 1)).slice(-2) +
    "-" +
    ("0" + currentDate.getDate()).slice(-2);
  var endDt = currentDate.getDate() + parseInt(process.env.Period);
  const endDtLastDigit = endDt % 10;
  endDt =
    endDt.toString() +
    (endDt == 11
      ? "th"
      : endDtLastDigit == 1
      ? "st"
      : endDtLastDigit == 2
      ? "nd"
      : endDtLastDigit == 3
      ? "rd"
      : "th") +
    " " +
    (currentDate.getMonth() + 1 == 1
      ? "January"
      : currentDate.getMonth() + 1 == 2
      ? "February"
      : currentDate.getMonth() + 1 == 3
      ? "March"
      : currentDate.getMonth() + 1 == 4
      ? "April"
      : currentDate.getMonth() + 1 == 5
      ? "May"
      : currentDate.getMonth() + 1 == 6
      ? "June"
      : currentDate.getMonth() + 1 == 7
      ? "July"
      : currentDate.getMonth() + 1 == 8
      ? "August"
      : currentDate.getMonth() + 1 == 9
      ? "September"
      : currentDate.getMonth() + 1 == 10
      ? "October"
      : currentDate.getMonth() + 1 == 11
      ? "November"
      : currentDate.getMonth() + 1 == 12
      ? "December"
      : "");

  let query = "select {} from SessionEvents where SessionID = 'Welcome Message'";
  //console.debug((new Date()).toString()+"|"+prependToLog,query)
  const getAllRows = (fields) => {
    return new Promise(async (resolve) => {
      var jsonReport = [];
      const dataQuery = query.replace("{}", fields);
      var i = 0;
      while (true) {
        query = dataQuery + " LIMIT " + i + ", 300";
        console.info((new Date()).toString()+"|"+prependToLog,
          "Fetching records from " +
          i +
          " to " +
          (i + 300 - 1) +
          "\nQuery: " +
          query
        );
        const queryResult = await zcql.executeZCQLQuery(query);
        //console.debug((new Date()).toString()+"|"+prependToLog,queryResult)
        if (queryResult.length == 0) break;
        jsonReport = jsonReport.concat(queryResult);
        i = i + 300;
      }
      resolve(jsonReport);
    });
  };
  getAllRows("distinct Mobile")
  .then(async (events) => {
    const mobiles = events.length > 0 ? events.map(data=>data.SessionEvents.Mobile) : []
    query = "select {} from Users where Tags is not null" + (mobiles.length>0?" and Mobile not in ("+mobiles.join(",")+")":"");
    getAllRows("Name, Mobile, GlificID, Tags")
    .then(async (users) => {
      //If there is no record, then the mobile number does not exist in system. Return error
      if (users == null) {
        //Send the response
        console.info((new Date()).toString()+"|"+prependToLog,"No user");
      } else if (users.length == 0) {
        //Send the response
        console.info((new Date()).toString()+"|"+prependToLog,"No user");
      } else {
        console.info((new Date()).toString()+"|"+prependToLog,"Fetched User Records");
      
        const timer = (sleepTime) => {
          return new Promise(async (resolve, reject) => {
            //console.info((new Date()).toString()+"|"+prependToLog,'Wait for '+sleepTime)
            setTimeout(resolve, sleepTime);
          });
        };

        let table = catalystApp.datastore().table("SessionEvents");
        const systemPrompt = await zcql.executeZCQLQuery(
          "Select ROWID from SystemPrompts where Name = 'Dummy' and IsActive = true"
        );
        const topicID = systemPrompt[0]["SystemPrompts"]["ROWID"];
        const axios = require("axios");
        const request = require("request");

        var authToken = null;
        var renewToken = null;
        var tokenExpiryTime = null;

        //Get Auth Token
        const checkAccessTokenStatus = (renew) => {
          return new Promise((resolve, reject) => {
            const options = {
              method:
                renew == false
                  ? process.env.authMethod
                  : process.env.renewalMethod,
              url:
                renew == false
                  ? process.env.authURL
                      .toString()
                      .replace("{1}", process.env.authUser.toString())
                      .replace("{2}", process.env.authPwd.toString())
                  : process.env.renewalURL
                      .toString()
                      .replace("{1}", process.env.renewalUser.toString())
                      .replace("{2}", process.env.renewalPwd.toString()),
              headers:
                renew == false
                  ? { "Content-Type": "application/json" }
                  : { Authorization: renewToken },
              body: JSON.stringify({
                query: ``,
                variables: {},
              }),
            };
            request(options, function (error, response) {
              if (error) {
                console.error((new Date()).toString()+"|"+prependToLog,"Error in Glific Authentication API Call: " + error);
                console.error((new Date()).toString()+"|"+prependToLog,"Request Parameters: " + JSON.stringify(options));
                reject("GLFC_AUTH_ERR");
              } else if (response.body == "Something went wrong") {
                console.error((new Date()).toString()+"|"+prependToLog,
                  "Error returned by Glific Authentication API: " + response.body
                );
                console.error((new Date()).toString()+"|"+prependToLog,"Request Parameters: " + JSON.stringify(options));
                reject("GLFC_AUTH_ERR");
              } else {
                try{
                  let responseBody = JSON.parse(response.body);
                  //console.debug((new Date()).toString()+"|"+prependToLog,responseBody)
                  authToken = responseBody.data.access_token;
                  renewToken = responseBody.data.renewal_token;
                  tokenExpiryTime = new Date(responseBody.data.token_expiry_time);
                  console.info(
                    "Extracted access token from response. Valid till: " +
                      tokenExpiryTime
                  );
                  resolve(authToken);
                }
                catch(e){
                  console.error((new Date()).toString()+"|"+prependToLog,"Error in getting Auth Token from Glific: "+e,"\nGlific Response: ",response.body,"Request Parameters: "+JSON.stringify(options));
                  resolve(authToken);							
                }
              }
            });
          });
        };

        const invokeGlificAPI = (id, contactID, params = []) => {
          return new Promise(async (resolve, reject) => {
            const currentDateTime = new Date();
            const options = {
              method: process.env.operationMethod.toString(),
              url: process.env.operationURL.toString(),
              headers: {
                Authorization:
                  authToken == null
                    ? await checkAccessTokenStatus(false)
                    : tokenExpiryTime - currentDateTime > 60000
                    ? authToken
                    : await checkAccessTokenStatus(true),
                "Content-Type": "application/json",
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
                  templateId: id,
                  receiverId: contactID,
                  parameters: params,
                },
              }),
            };
            request(options, async function (error, response) {
              //If any error in API call throw error
              if (error) {
                console.error((new Date()).toString()+"|"+prependToLog,"Error in resuming flow in Glific: " + error);
                console.error((new Date()).toString()+"|"+prependToLog,"Request Parameters: " + JSON.stringify(options));
                reject("GLFC_API_ERR");
              } else {
                //console.debug((new Date()).toString()+"|"+prependToLog,'Glific Response: '+response.body+"\n"+
                //			"\nRequest Parameters: "+JSON.stringify(options));
                try{
                  const hsmMsgResponse = JSON.parse(response.body);
                  //If any error retruned by Glific API throw error
                  if (hsmMsgResponse.errors != null) {
                    console.error((new Date()).toString()+"|"+prependToLog,
                      "Error returned by HSM Message API: " +
                        JSON.stringify(hsmMsgResponse.errors)
                    );
                    console.debug((new Date()).toString()+"|"+prependToLog,"Request Parameters: " + JSON.stringify(options));
                    reject("GLFC_API_ERR");
                  } else {
                    const elementData = hsmMsgResponse.data;
                    const elementSendHsmMessage = elementData.sendHsmMessage;
                    const elementErrors = elementSendHsmMessage.errors;
                    if (elementErrors != null) {
                      console.error((new Date()).toString()+"|"+prependToLog,
                        "Error returned by Glific API " +
                          JSON.stringify(hsmMsgResponse)
                      );
                      reject("GLFC_API_ERR");
                    } else {
                      console.info("Successfully sent HSM Message");
                      resolve("SUCCESS");
                    }
                  }
                }
                catch(e){
                  console.error((new Date()).toString()+"|"+prependToLog,"Error in sending HSM in Glific: "+e,"\nGlific Response: ",response.body,"Request Parameters: "+JSON.stringify(options));
                  reject("GLFC_API_ERR")
                }	
              }
            });
          });
        };

        users
          .forEach(async (record, i) => {
            var messageID = process.env.CohortWelcomeMsg;
            var param = [decodeURIComponent(record.Users.Name), endDt];
            var cohort = null;

            if (
              record.Users.Tags.includes("Cohort-2") &&
              record.Users.Tags.includes(currentDt)
            ) {
              param.push("7");
              cohort = 2;
            } else if (
              record.Users.Tags.includes("Cohort-1") &&
              record.Users.Tags.includes(currentDt)
            ) {
              const pendingPractices = await axios.post(
                process.env.PendingPracticesURL,
                {
                  Mobile: record.Users.Mobile,
                },
                {
                  "Content-Type": "application/json",
                  Accept: "application/json",
                }
              );
              if (["SUCCESS","SSN_ABV_PERIOD","MIN_SSN_RCHD"].includes(pendingPractices.data.OperationStatus)==false)
                console.info((new Date()).toString()+"|"+prependToLog,
                  i + ":Failed to get pending practices for " + record.Users.Mobile
                );
              else if (typeof pendingPractices.data.PendingPracticeCount <= 0) {
                console.info((new Date()).toString()+"|"+prependToLog,
                  i + ":No pending practices for " + record.Users.Mobile
                );
                try {
                  let eventData = {
                    SessionID: "Welcome Message",
                    Event:
                      "Cohort " +
                      cohort +
                      " Welcome Message Not Sent (No Pending Practice)",
                    SystemPromptROWID: topicID,
                    Mobile: record.Users.Mobile,
                  };
                  await table.insertRow(eventData);
                } catch (e) {
                  console.error((new Date()).toString()+"|"+prependToLog,
                  i +
                    ": Could not update event table for " +
                    record.Users.Mobile
                  );
                }
              }
              else {
                cohort = 1;
                param.push(pendingPractices.data.PendingPracticeCount.toString());
              }
            }
            if (cohort != null) {
              await timer(Math.max(300, (i * 1000) / users.length));
              console.info((new Date()).toString()+"|"+prependToLog,
                i +
                  ": Nudge to be sent to Cohort " +
                  cohort +
                  " User " +
                  record.Users.Mobile
              );
              for (var index = 0; index < 100; index++) {
                try {
                  const output = await invokeGlificAPI(
                    messageID,
                    record.Users.GlificID,
                    param
                  );
                  /* sendGlificHSMMsg({
                                      "contactID":record.Users.GlificID,
                                      "messageID":messageID,
                                      "params":param
                              })
                              const nudgeStatus = JSON.parse(output)
                              if(nudgeStatus['OperationStatus']=="SUCCESS"){*/
                  if (output == "SUCCESS") {
                    console.info((new Date()).toString()+"|"+prependToLog,
                      i +
                        ":Nudge sent to Cohort " +
                        cohort +
                        " User " +
                        record.Users.Mobile
                    );
                    try {
                      let eventData = {
                        SessionID: "Welcome Message",
                        Event:
                          "Cohort " +
                          cohort +
                          " Welcome Message Sent (HSM Message)",
                        SystemPromptROWID: topicID,
                        Mobile: record.Users.Mobile,
                      };
                      await table.insertRow(eventData);
                    } catch (e) {
                      console.error((new Date()).toString()+"|"+prependToLog,
                        i +
                          ": Could not update event table for " +
                          record.Users.Mobile
                      );
                    }
                    break;
                  } else {
                    console.info((new Date()).toString()+"|"+prependToLog,
                      i +
                        ":Nudge not sent to " +
                        record.Users.Mobile +
                        " as OperationStatus = " +
                        nudgeStatus["OperationStatus"]
                    );
                    break;
                  }
                } catch (err) {
                  if (err.toString().includes("TOO_MANY_REQUEST")) {
                    await timer(Math.max(500, (i * 1000) / users.length));
                    console.info((new Date()).toString()+"|"+prependToLog,i + ":Retrying Nudge for " + record.Users.Mobile);
                  } else if (
                    [
                      "GLFC_AUTH_API_ERR",
                      "GLFC_AUTH_ERR",
                      "GLFC_API_ERR",
                    ].includes(err)
                  ) {
                    await timer(Math.max(500, (i * 1000) / users.length));
                    console.info((new Date()).toString()+"|"+prependToLog,i + ":Retrying Nudge for " + record.Users.Mobile);
                  } else {
                    console.error((new Date()).toString()+"|"+prependToLog,
                      i +
                        ":Nudge not sent to " +
                        record.Users.Mobile +
                        " due to error: ",
                      err
                    );
                    break;
                  }
                }
              }
            } else {
              console.info((new Date()).toString()+"|"+prependToLog,
                i +
                  ": Nudge not to be sent to " +
                  record.Users.Mobile +
                  " with Tags = " +
                  record.Users.Tags
              );
            }
          })
      }
    })
    .catch((err) => {
      console.error((new Date()).toString()+"|"+prependToLog,
        "Closing Execution. Encountered Error in getting count of records: " + err
      );
    })
  })
  .catch((err) => {
      console.error((new Date()).toString()+"|"+prependToLog,
      "Closing Execution. Encountered Error in getting Session Events data: " + err
    )
  })
}
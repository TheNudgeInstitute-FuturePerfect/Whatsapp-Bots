const catalyst = require("zoho-catalyst-sdk");

	
/*let cronParams = cronDetails.getCronParam("name");
if(typeof cronParams === 'undefined'){
	cronParams = 'DefaultName';
}*/

const catalystApp = catalyst.initialize();

const executionID = Math.random().toString(36).slice(2)

//Prepare text to prepend with logs
const params = ["sendDailyNudge",executionID,""]
const prependToLog = params.join(" | ")
	
console.info((new Date()).toString()+"|"+prependToLog,(new Date()).toString()+"|"+prependToLog,"Execution Started")


let zcql = catalystApp.zcql();

//Get the current time
let currentDate = new Date()
//currentDate.setHours(currentDate.getHours()+5)
//currentDate.setMinutes(currentDate.getMinutes()+30)
const currentHour = ("0"+currentDate.getHours()).slice(-2) + ":00"
console.info((new Date()).toString()+"|"+prependToLog,"Current TimeStamp = ",currentDate," | Current Hour = ",currentHour)

let query = "select {} from Users where NudgeTime = '"+currentHour+"'"
if(currentHour==process.env.DefaultNudgeHour)
	query = query + " or NudgeTime = '"+process.env.DefaultNudgeTime+"'"
//console.debug((new Date()).toString()+"|"+prependToLog,query)
zcql.executeZCQLQuery(query.replace("{}","count(ROWID)"))
.then((maxRowsResult) => {
	let maxRows = parseInt(maxRowsResult[0].Users.ROWID)
	console.info((new Date()).toString()+"|"+prependToLog,'Total Users: '+maxRows)
	if(maxRows>0)
	{
		const recordsToFetch = 300
		const startingRow = 1
		const getAllRows = (fields) => {
			return new Promise(async (resolve) => {			
				var jsonReport = []
				const dataQuery = query.replace("{}",fields)
				for(var i = startingRow; i <= maxRows ; i=i+recordsToFetch){
					query = dataQuery+" LIMIT "+i+", "+recordsToFetch
					console.info((new Date()).toString()+"|"+prependToLog,'Fetching records from '+i+" to "+(i+recordsToFetch-1)+
								'\nQuery: '+query)
					const queryResult = await zcql.executeZCQLQuery(query)
						jsonReport = jsonReport.concat(queryResult)
				}
				resolve(jsonReport)
			})
		}
		getAllRows("Mobile, GlificID, RegisteredTime, NudgeTime")
		.then((users) =>	{
			console.info((new Date()).toString()+"|"+prependToLog,"Fetched Records")
			//If there is no record, then the mobile number does not exist in system. Return error				
			if(users == null){
				//Send the response
				console.info((new Date()).toString()+"|"+prependToLog,'No user who has opted for this hour');
				
			}
			else if(users.length == 0){
				//Send the response
				console.info((new Date()).toString()+"|"+prependToLog,'No user who has opted for this hour');
			}
			else{
				const mobiles = users.map(data=>data.Users.Mobile)
				var userSessions = users.map(data=>{
					const sessionDate = new Date(data.Users.RegisteredTime.toString().slice(0,10))
					const duration = Math.floor((currentDate - sessionDate)/1000/60/60/24)
					return {
						Mobile: data.Users.Mobile,
						DaysSinceLastActivity: duration,
						IsRecentActivity: false
					}
				})
				query = "select {} from Sessions where Mobile in ("+mobiles.join(",")+") group by Mobile"
				maxRows = parseInt(users.length)
				console.info((new Date()).toString()+"|"+prependToLog,'Total Sessions Data: '+maxRows)
				getAllRows("Mobile, max(CREATEDTIME)")
				.then(async (sessions) =>	{
					console.info((new Date()).toString()+"|"+prependToLog,"Fetched Sessions Records")
					//If there is no record, then the mobile number does not exist in system. Return error				
					if(!((typeof sessions !== 'undefined')&&(sessions != null)&&(sessions.length > 0))){
						console.info((new Date()).toString()+"|"+prependToLog,'No session data. Using RegisteredTime of user');
					}
					else{
						//Calculate days since last activity for each user
						userSessions.forEach(userSession=>{
							if(sessions.some(session=>session.Sessions.Mobile == userSession.Mobile)){
								const sesssionData = sessions.filter(session=>session.Sessions.Mobile == userSession.Mobile)
								const sessionDate = new Date(sesssionData[0].Sessions.CREATEDTIME.toString().slice(0,10))
								const minutesElapsed = Math.floor((currentDate - sessionDate)/1000/60)
								const duration = Math.floor((currentDate - sessionDate)/1000/60/60/24)
								userSession['DaysSinceLastActivity'] = duration
								userSession['IsRecentActivity'] = minutesElapsed < 10 ? true : false
							}
						})
					}		
					console.debug((new Date()).toString()+"|"+prependToLog,userSessions)			
					const timer = (sleepTime) => {
						return new Promise( async (resolve,reject) => {
							//console.info((new Date()).toString()+"|"+prependToLog,'Wait for '+sleepTime)
							setTimeout(resolve, sleepTime)
						});
					}
		
					const closeContext = async (i,success)=>{
						if(i==(users.length-1)){
							await timer(5*60*1000)
							if(success==false){
								console.info((new Date()).toString()+"|"+prependToLog,'Execution completed with some error.')
							}
							else{
								console.info((new Date()).toString()+"|"+prependToLog,'Execution completed successfully.')
							}
						}
					}

					let table = catalystApp.datastore().table("SessionEvents")
					const systemPrompt = await zcql.executeZCQLQuery("Select ROWID from SystemPrompts where Name = 'Dummy' and IsActive = true")
					const topicID = systemPrompt[0]['SystemPrompts']['ROWID']

					const request = require("request");

					var authToken = null;
					var renewToken = null;
					var tokenExpiryTime = null

					//Get Auth Token
					const checkAccessTokenStatus = (renew) => {
						return new Promise((resolve, reject)=>{
							const options = {
								'method': renew==false ? process.env.authMethod : process.env.renewalMethod,
								'url': renew==false ? process.env.authURL.toString().replace('{1}',process.env.authUser.toString()).replace('{2}',process.env.authPwd.toString()) : process.env.renewalURL.toString().replace('{1}',process.env.renewalUser.toString()).replace('{2}',process.env.renewalPwd.toString()),
								'headers': renew==false ? {'Content-Type': 'application/json'} : {"Authorization": renewToken},
								body: JSON.stringify({
									query: ``,
									variables: {}
								})
							};
							request(options, function (error, response) {
								if (error){
									console.error((new Date()).toString()+"|"+prependToLog,"Error in Glific Authentication API Call: "+error);
									console.error((new Date()).toString()+"|"+prependToLog,"Request Parameters: "+JSON.stringify(options));
									reject("GLFC_AUTH_ERR")                            
								}
								else if(response.body == 'Something went wrong'){
									console.error((new Date()).toString()+"|"+prependToLog,"Error returned by Glific Authentication API: "+response.body);
									console.error((new Date()).toString()+"|"+prependToLog,"Request Parameters: "+JSON.stringify(options));
									reject("GLFC_AUTH_ERR")
								}
								else{
									try{
										let responseBody = JSON.parse(response.body)
										//console.debug((new Date()).toString()+"|"+prependToLog,responseBody)
										authToken = responseBody.data.access_token;
										renewToken = responseBody.data.renewal_token;
										tokenExpiryTime = new Date(responseBody.data.token_expiry_time)
										console.info((new Date()).toString()+"|"+prependToLog,"Extracted access token from response. Valid till: "+tokenExpiryTime);
										resolve(authToken)
									}
									catch(e){
										console.info((new Date()).toString()+"|"+prependToLog,"Error in getting Auth Token from Glific: "+e,"\nGlific Response: ",response.body,"Request Parameters: "+JSON.stringify(options))
										resolve(authToken)
									}
								}
							})
						})
					}
					
					const invokeGlificAPI = (type='HSM',id,contactID,params=[]) =>{
						return new Promise(async (resolve, reject)=>{
							const currentDateTime = new Date();
							const options = {
								'method': process.env.operationMethod.toString(),
								'url': process.env.operationURL.toString(),
								'headers': {
									'Authorization': authToken==null ? await checkAccessTokenStatus(false) : ((tokenExpiryTime-currentDateTime) > 60000 ? authToken : await checkAccessTokenStatus(true)),
									'Content-Type': 'application/json'
								},
								body: type=='Flow' ? JSON.stringify({
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
										"flowId": id,
										"contactId": contactID
									}
								}) : JSON.stringify({
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
										"templateId": id,
										"receiverId": contactID,
										"parameters": params
									}
								})
							};
							request(options, async function (error, response) {
								//If any error in API call throw error
								if (error){
									console.error((new Date()).toString()+"|"+prependToLog,(type=='Flow' ? "Error in resuming flow in Glific: " : "Error in sending HSM Message")+error);
									console.error((new Date()).toString()+"|"+prependToLog,"Request Parameters: "+JSON.stringify(options));
									reject("GLFC_API_ERR")
								}
								else{
									//console.debug((new Date()).toString()+"|"+prependToLog,'Glific Response: '+response.body+"\n"+
									//			"\nRequest Parameters: "+JSON.stringify(options));
									try{
										const apiResponse = JSON.parse(response.body)
										//If any error retruned by Glific API throw error
										if(apiResponse.errors != null)
										{
											console.error((new Date()).toString()+"|"+prependToLog,"Error returned by Glific API: "+JSON.stringify(apiResponse.errors));
											console.error((new Date()).toString()+"|"+prependToLog,"Request Parameters: "+JSON.stringify(options));
											reject("GLFC_API_ERR")
										}
										else
										{
											const elementData = apiResponse.data
											const elementMessage = type=='Flow' ? elementData.startContactFlow : elementData.sendHsmMessage
											const elementErrors = elementMessage.errors
											if(elementErrors != null) 
											{
												console.error((new Date()).toString()+"|"+prependToLog,'Error returned by Glific API '+JSON.stringify(apiResponse))
												if(JSON.stringify(apiResponse).includes('Not able to fetch the template') || JSON.stringify(apiResponse).includes("Resource not found"))
													reject("GLFC_REQ_ERR")
												else
													reject("GLFC_API_ERR")
											}
											else
											{
												console.info((new Date()).toString()+"|"+prependToLog,type=='Flow' ? "Successfully started Nudge Flow in Glific" : "Successfully sent HSM Message");
												resolve("SUCCESS")
											}

										}
									}catch(e){
										console.error((new Date()).toString()+"|"+prependToLog,"Error returned from Glific: "+e,"\nGlific Response: ",response.body,"Request Parameters: "+JSON.stringify(options));
										reject("GLFC_API_ERR")
									}
								}
							});
						})
					}

					users.forEach(async (record,i)=>{
						const userSessionData = userSessions.filter(data=>data.Mobile == record.Users.Mobile)
						var type = null
						var id = null
						if(userSessionData[0]['DaysSinceLastActivity']>process.env.MaxInactivityDaysForNudge){
							console.info((new Date()).toString()+"|"+prependToLog,i+": Nudge not to be sent to "+ record.Users.Mobile+". Not active for "+userSessionData[0]['DaysSinceLastActivity']+" days");
							closeContext(i,true)
						}
						else if(userSessionData[0]['DaysSinceLastActivity']==process.env.MaxInactivityDaysForNudge){
							await timer(Math.max(300,(i*1000)/users.length))
							console.info((new Date()).toString()+"|"+prependToLog,i+": Last Nudge to be sent to "+ record.Users.Mobile+". Not active for "+userSessionData[0]['DaysSinceLastActivity']+" days");
							type = "HSM"
							id = process.env.TemplateID_sendDailyNudge
							/*while(true){
								try{
									const sendGlificHSMMsg = require("../common/sendGlificHSMMsg.js");
									const output = await sendGlificHSMMsg({
										args:{
											"contactID":record.Users.GlificID,
											"messageID":process.env.TemplateID_sendDailyNudge,
										}
									})
									const nudgeStatus = JSON.parse(output)
									if(nudgeStatus['OperationStatus']=="SUCCESS"){
										console.info((new Date()).toString()+"|"+prependToLog,i+":Nudge sent to "+record.Users.Mobile)
										closeContext(i,true)
										try{
											let eventData = {
												SessionID: "Nudge Flow",
												Event : "Nudge Sent (HSM Message)",
												SystemPromptROWID: topicID,
												Mobile:record.Users.Mobile
											}
											await table.insertRow(eventData)
										}
										catch(e){
											console.error((new Date()).toString()+"|"+prependToLog,i+": Could not update event table for "+ record.Users.Mobile)
										}
										break;
									}
									else if(["GLFC_AUTH_API_ERR","GLFC_AUTH_ERR","GLFC_API_ERR"].includes(nudgeStatus['OperationStatus'])){
										await timer(Math.max(500,(i*1000)/users.length))
										console.info((new Date()).toString()+"|"+prependToLog,i+":Retrying Nudge for "+ record.Users.Mobile);
									}
									else{
										console.info((new Date()).toString()+"|"+prependToLog,i+":Nudge not sent to "+record.Users.Mobile+" as OperationStatus = "+nudgeStatus['OperationStatus'])
										closeContext(i,false)
										break;
									}
								}
								catch(err){
									if(err.indexOf("TOO_MANY_REQUEST")!=0){
										await timer(Math.max(500,(i*1000)/users.length))
										console.info((new Date()).toString()+"|"+prependToLog,i+":Retrying Nudge for "+ record.Users.Mobile);
									}
									else{
										console.error((new Date()).toString()+"|"+prependToLog,i+":Nudge not sent to "+record.Users.Mobile+" due to error: ",err)
										closeContext(i,false)
										break;
									}
								}
							}*/
						}
						else if(userSessionData[0]['IsRecentActivity']==false){
							await timer(Math.max(300,(i*1000)/users.length))
							console.info((new Date()).toString()+"|"+prependToLog,i+":Sending Nudge to "+ record.Users.Mobile);
							type = "Flow"
							id = process.env.FlowID
						}
						if(type!=null){
							for(var index = 0 ; index < 100; index++){
								try{
									//const startGlificFlow = require("../common/startGlificFlow.js");
									const output = await invokeGlificAPI(type,id,record.Users.GlificID)
									/*startGlificFlow({
										args:{
											"flowID":process.env.FlowID,
											"contactID":record.Users.GlificID
										}
									})
									const nudgeStatus = JSON.parse(output)
									if(nudgeStatus['OperationStatus']=="SUCCESS"){*/
									if(output=='SUCCESS'){
										console.info((new Date()).toString()+"|"+prependToLog,i+":Nudge sent to "+record.Users.Mobile)
										closeContext(i,true)
										if(type=='HSM'){
											try{
												let eventData = {
													SessionID: "Nudge Flow",
													Event : "Nudge Sent (HSM Message)",
													SystemPromptROWID: topicID,
													Mobile:record.Users.Mobile
												}
												await table.insertRow(eventData)
											}
											catch(e){
												console.error((new Date()).toString()+"|"+prependToLog,i+": Could not update event table for "+ record.Users.Mobile)
											}
										}
										break;
									}
									else{
										console.info((new Date()).toString()+"|"+prependToLog,i+":Nudge not sent to "+record.Users.Mobile+" as OperationStatus = "+nudgeStatus['OperationStatus'])
										closeContext(i,false)
										break;
									}
								}
								catch(err){
									if(err.toString().includes("TOO_MANY_REQUEST")){
										await timer(Math.random()*60000)
										console.info((new Date()).toString()+"|"+prependToLog,i+":Retrying Nudge for "+ record.Users.Mobile);
									}
									else if(["GLFC_AUTH_API_ERR","GLFC_AUTH_ERR","GLFC_API_ERR"].includes(err)){
										await timer(Math.random()*10000)
										console.info((new Date()).toString()+"|"+prependToLog,i+":Retrying Nudge for "+ record.Users.Mobile);
									}
									else{
										console.error((new Date()).toString()+"|"+prependToLog,i+":Nudge not sent to "+record.Users.Mobile+" due to error: ",err)
										closeContext(i,false)
										break;
									}
								}
							}
						}
					})
				
				})
				.catch(err => {
					console.error((new Date()).toString()+"|"+prependToLog,'Closing Execution. Encountered Error in getting session records: '+err)
				})
			}
		});
	}
	else{
		console.info((new Date()).toString()+"|"+prependToLog,"Closing Execution. No records retruned by query")
	}
}).catch(err => {
	console.error((new Date()).toString()+"|"+prependToLog,'Closing Execution. Encountered Error in getting count of records: '+err)
})

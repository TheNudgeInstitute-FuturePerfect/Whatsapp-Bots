const catalyst = require("zoho-catalyst-sdk");

module.exports = (cronDetails, context) => {
	
	/*let cronParams = cronDetails.getCronParam("name");
	if(typeof cronParams === 'undefined'){
		cronParams = 'DefaultName';
	}*/
	
    const catalystApp = catalyst.initialize(context);
	let zcql = catalystApp.zcql();

	//Get the current time
	let currentDate = new Date()
	currentDate.setHours(currentDate.getHours()+5)
	currentDate.setMinutes(currentDate.getMinutes()+30)
	console.log("Current TimeStamp = ",currentDate)
	const currentHour = ("0"+currentDate.getHours()).slice(-2) + ":00"

	let query = "select {} from Users where NudgeTime = '"+currentHour+"'"
	if(currentHour==process.env.DefaultNudgeHour)
		query = query + " or NudgeTime = '"+process.env.DefaultNudgeTime+"'"
	//console.log(query)
	zcql.executeZCQLQuery(query.replace("{}","count(ROWID)"))
	.then((maxRowsResult) => {
		let maxRows = parseInt(maxRowsResult[0].Users.ROWID)
		console.log('Total Users: '+maxRows)
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
						console.log('Fetching records from '+i+" to "+(i+recordsToFetch-1)+
									'\nQuery: '+query)
						const queryResult = await zcql.executeZCQLQuery(query)
							jsonReport = jsonReport.concat(queryResult)
					}
					resolve(jsonReport)
				})
			}
			getAllRows("Mobile, GlificID, RegisteredTime, NudgeTime")
			.then((users) =>	{
				console.log("Fetched Records")
                //If there is no record, then the mobile number does not exist in system. Return error				
				if(users == null){
					//Send the response
					console.log('No user who has opted for this hour');
					context.closeWithSuccess();
				}
				else if(users.length == 0){
					//Send the response
					console.log('No user who has opted for this hour');
					context.closeWithSuccess();
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
					console.log('Total Sessions Data: '+maxRows)
					getAllRows("Mobile, max(CREATEDTIME)")
					.then(async (sessions) =>	{
						console.log("Fetched Sessions Records")
						//If there is no record, then the mobile number does not exist in system. Return error				
						if(!((typeof sessions !== 'undefined')&&(sessions != null)&&(sessions.length > 0))){
							console.log('No session data. Using RegisteredTime of user');
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
						console.log(userSessions)			
						const timer = (sleepTime) => {
							return new Promise( async (resolve,reject) => {
								//console.log('Wait for '+sleepTime)
								setTimeout(resolve, sleepTime)
							});
						}
			
						const closeContext = async (i,success)=>{
							if(i==(users.length-1)){
								await timer(5*60*1000)
								if(success==false){
									console.log('Execution completed with some error.')
									context.closeWithFailure();
								}
								else{
									console.log('Execution completed successfully.')
									context.closeWithSuccess();
								}
							}
						}

						let functions = catalystApp.functions()
						let table = catalystApp.datastore().table("SessionEvents")
						const systemPrompt = await zcql.executeZCQLQuery("Select ROWID from SystemPrompts where Name = 'Dummy' and IsActive = true")
						const topicID = systemPrompt[0]['SystemPrompts']['ROWID']

						users.forEach(async (record,i)=>{
							const userSessionData = userSessions.filter(data=>data.Mobile == record.Users.Mobile)
							if(userSessionData[0]['DaysSinceLastActivity']>process.env.MaxInactivityDaysForNudge){
								console.log(i+": Nudge not to be sent to "+ record.Users.Mobile+". Not active for "+userSessionData[0]['DaysSinceLastActivity']+" days");
								closeContext(i,true)
							}
							else if(userSessionData[0]['DaysSinceLastActivity']==process.env.MaxInactivityDaysForNudge){
								await timer(Math.max(300,(i*1000)/users.length))
								console.log(i+": Last Nudge to be sent to "+ record.Users.Mobile+". Not active for "+userSessionData[0]['DaysSinceLastActivity']+" days");
								while(true){
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
											console.log(i+":Nudge sent to "+record.Users.Mobile)
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
												console.log(i+": Could not update event table for "+ record.Users.Mobile)
											}
											break;
										}
										else if(["GLFC_AUTH_API_ERR","GLFC_AUTH_ERR","GLFC_API_ERR"].includes(nudgeStatus['OperationStatus'])){
											await timer(Math.max(500,(i*1000)/users.length))
											console.log(i+":Retrying Nudge for "+ record.Users.Mobile);
										}
										else{
											console.log(i+":Nudge not sent to "+record.Users.Mobile+" as OperationStatus = "+nudgeStatus['OperationStatus'])
											closeContext(i,false)
											break;
										}
									}
									catch(err){
										if(err.indexOf("TOO_MANY_REQUEST")!=0){
											await timer(Math.max(500,(i*1000)/users.length))
											console.log(i+":Retrying Nudge for "+ record.Users.Mobile);
										}
										else{
											console.log(i+":Nudge not sent to "+record.Users.Mobile+" due to error: ",err)
											closeContext(i,false)
											break;
										}
									}
								}
							}
							else if(userSessionData[0]['IsRecentActivity']==false){
								await timer(Math.max(300,(i*1000)/users.length))
								console.log(i+":Sending Nudge to "+ record.Users.Mobile);
								while(true){
									try{
                                        const startGlificFlow = require("../common/startGlificFlow.js");
										const output = await startGlificFlow({
											args:{
												"flowID":process.env.FlowID,
												"contactID":record.Users.GlificID
											}
										})
										const nudgeStatus = JSON.parse(output)
										if(nudgeStatus['OperationStatus']=="SUCCESS"){
											console.log(i+":Nudge sent to "+record.Users.Mobile)
											closeContext(i,true)
											break;
										}
										else if(["GLFC_AUTH_API_ERR","GLFC_AUTH_ERR","GLFC_API_ERR"].includes(nudgeStatus['OperationStatus'])){
											await timer(Math.max(500,(i*1000)/users.length))
											console.log(i+":Retrying Nudge for "+ record.Users.Mobile);
										}
										else{
											console.log(i+":Nudge not sent to "+record.Users.Mobile+" as OperationStatus = "+nudgeStatus['OperationStatus'])
											closeContext(i,false)
											break;
										}
									}
									catch(err){
										if(err.indexOf("TOO_MANY_REQUEST")!=0){
											await timer(Math.max(500,(i*1000)/users.length))
											console.log(i+":Retrying Nudge for "+ record.Users.Mobile);
										}
										else{
											console.log(i+":Nudge not sent to "+record.Users.Mobile+" due to error: ",err)
											closeContext(i,false)
											break;
										}
									}
								}
							}
							else{
								console.log(i+": Nudge not to be sent to "+ record.Users.Mobile+". Attempted the flow within 10 minutes.");
								closeContext(i,true)
							}
						})
					
					})
					.catch(err => {
						console.log('Closing Execution. Encountered Error in getting session records: '+err)
						context.closeWithFailure()
					})
				}
			});
		}
		else{
			console.log("Closing Execution. No records retruned by query")
			context.closeWithSuccess()
		}
	}).catch(err => {
		console.log('Closing Execution. Encountered Error in getting count of records: '+err)
		context.closeWithFailure()
	})
}
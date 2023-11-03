//const catalyst = require("zoho-catalyst-sdk");
const dotenv = require("dotenv");
dotenv.config();
const mongoose = require('mongoose')
mongoose.connect(process.env.MongoDBConnStrng + "whatsapp-bots", {
  useNewUrlParser: true,
});
const SessionEvents = require(".././models/SessionEvents.js");
const Session = require(".././models/Sessions.js")
const User = require(".././models/Users.js");
const UsersReport = require(".././models/UsersReport.js");
const UserAssessment = require(".././models/UserAssessment.js");
const UserAssessmentLogs = require(".././models/UserAssessmentLogs.js");
const WordleAttempts = require(".././models/WordleAttempts.js");
const GameAttempts = require(".././models/GameAttempts.js");
const SystemPrompts = require(".././models/SystemPrompts.js");
/*let cronParams = cronDetails.getCronParam("name");
if(typeof cronParams === 'undefined'){
	cronParams = 'DefaultName';
}*/

const getYYYYMMDDDate = (date) => {
	return date.getFullYear()+"-"+('0'+(date.getMonth()+1)).slice(-2)+"-"+('0'+date.getDate()).slice(-2)
}
//const catalystApp = catalyst.initialize();

const executionID = Math.random().toString(36).slice(2)

//Prepare text to prepend with logs
const params = ["sendDailyNudge",executionID,""]
const prependToLog = params.join(" | ")
	
console.info((new Date()).toString()+"|"+prependToLog,"Execution Started")


//let zcql = catalystApp.zcql();

//Get the current time
let currentDate = new Date()
//currentDate.setHours(currentDate.getHours()+5)
//currentDate.setMinutes(currentDate.getMinutes()+30)
const currentHour = ("0"+currentDate.getHours()).slice(-2) + ":00"
const currentDt = currentDate.getFullYear()+"-"+('0'+(currentDate.getMonth()+1)).slice(-2)+"-"+('0'+currentDate.getDate()).slice(-2)
console.info((new Date()).toString()+"|"+prependToLog,"Current TimeStamp = ",currentDate," | Current Hour = ",currentHour)

let query = {NudgeTime: currentHour}//"select {} from Users where NudgeTime = '"+currentHour+"'"
if(currentHour==process.env.DefaultNudgeHour)
	query = { $or: [{ NudgeTime: currentHour }, { NudgeTime: process.env.DefaultNudgeTime }] }

	// 	query = query + " or NudgeTime = '"+process.env.DefaultNudgeTime+"'"
	// //console.debug((new Date()).toString()+"|"+prependToLog,query)
	// zcql.executeZCQLQuery(query.replace("{}","count(ROWID)"))
	// getAllRows("Mobile, GlificID, RegisteredTime, NudgeTime",query,zcql,prependToLog)

console.info((new Date()).toString()+"|"+prependToLog,"Getting Users Data")
User.find(query).select('Mobile GlificID RegisteredTime NudgeTime')
.then(async (users) =>	{
	console.info((new Date()).toString()+"|"+prependToLog,"Fetched Records")
	//If there is no record, then the mobile number does not exist in system. Return error				
	if(users == null){
		//End execution
		console.info((new Date()).toString()+"|"+prependToLog,'No user who has opted for this hour');
		mongoose.connection.close()
	}
	else if(users.length == 0){
		//End execution
		console.info((new Date()).toString()+"|"+prependToLog,'No user who has opted for this hour');
		mongoose.connection.close()
	}
	else{
		var mobiles = users.map(data=>data.Mobile)
		
		//Fetch all users from Glific BQ who sent a message to bot in last 4 days
		const {BigQuery} = require('@google-cloud/bigquery');
		const bigquery = new BigQuery({
			keyFilename : process.env.GCPAuthFile,
			projectId : process.env.GCPProjectID
		});

		query = "SELECT contact_phone as Mobile, max(format_datetime('%Y-%m-%d %H:%I:%S',inserted_at)) as CREATEDTIME "+
				"FROM `"+process.env.GCPProjectID+".91"+process.env.GlificBotNumber+".messages` "+
				"where flow = 'inbound' and inserted_at >=  (CURRENT_DATE('Asia/Kolkata')- 4) "+
				"and contact_phone in ('91"+mobiles.join("','91")+"') "+
				"group by 1"
		console.info((new Date()).toString()+"|"+prependToLog,`BQ Query: `,query)
		var bqUsers = null
		try{  
			// Run the query as a job
			const [job] = await bigquery.createQueryJob({
				query: query,
				location: 'US',
			});
			console.info((new Date()).toString()+"|"+prependToLog,`BQ Job ${job.id} started.`);
		
			// Wait for the query to finish
			[bqUsers] = await job.getQueryResults();
			console.info((new Date()).toString()+"|"+prependToLog,`BQ Job ${job.id} finished.`);
		}
		catch(error){
			console.info((new Date()).toString()+"|"+prependToLog,`BQ Job ${job.id} Failed. Error:`,error);
		}

		//query = "select {} from UsersReport where (OnboardingDate is null) or (OnboardingDate < '"+currentDt+" 00:00:00') and Mobile in ("+mobiles.join(",")+") group by Mobile"
		//getAllRows("Mobile, OnboardingDate",query,zcql,prependToLog)
		console.info((new Date()).toString()+"|"+prependToLog,"Getting UsersReport Data")
		UsersReport.aggregate([
			{
				$match: {
					$or: [
						{ OnboardingDate: null },
						{ OnboardingDate: { $lt: new Date(currentDt + ' 00:00:00') } }
					],
					Mobile: { $in: mobiles }
					}
			},
			{
				$sort:{createdAt: -1}
			},
			{
				$group: {
					_id: '$Mobile',
					Mobile: { $first: '$Mobile' },
					OnboardingDate: { $first: '$OnboardingDate' }
				}
			}
		])
		.then((usersReport)=>{
			if(!Array.isArray(usersReport))
				throw new Error(usersReport)
			mobiles = usersReport.map(data=>data.Mobile)
			var userSessions = users.filter(user=>usersReport.some(data=>data.Mobile == user.Mobile)).map(data=>{

				//If there is an activity as per Glific BQ, consider it
				var bqData = bqUsers.filter(bqdata=>bqdata.Mobile == "91"+data.Mobile)
				
				if(bqData.length==0)
					bqData = [{
						Mobile: data.Mobile,
						CREATEDTIME: null
					}]
				
				const sessionDate = Math.max(new Date(bqData[0]['CREATEDTIME']),
											new Date(data.RegisteredTime))

				const duration = Math.floor((currentDate - sessionDate)/1000/60/60/24)
				return {
					Mobile: data.Mobile,
					DaysSinceLastActivity: duration,
					IsRecentActivity: false
				}
			})
			
			// query = "select {} from Sessions where Mobile in ("+mobiles.join(",")+") group by Mobile"
			// const userSessionQuery = getAllRows("Mobile, max(CREATEDTIME)",query,zcql,prependToLog)
			const userSessionQuery = Session.aggregate([
				{
					$match: {
						Mobile: { $in: mobiles.map(data=>data.toString()) }
					}
				},
				{
					$group: {
						_id: '$Mobile',
						CREATEDTIME: { $max: '$CREATEDTIME' }
					}
				},
				{
					$project:{
						_id:0,
						Mobile:"$_id",
						CREATEDTIME:1
					}
				}
			])
			//const learningQuery = "Select {} from UserAssessment left join UserAssessmentLogs on UserAssessment.UserAssessmentLogROWID = UserAssessmentLogs.ROWID left join Users on Users.ROWID = UserAssessmentLogs.UserROWID where Users.Mobile in ("+mobiles.join(",")+") group by Users.Mobile"
			//const userAssessmentQuery = getAllRows("Users.Mobile, max(UserAssessment.CREATEDTIME)",learningQuery,zcql,prependToLog)
			const userAssessmentQuery = UserAssessment.aggregate([
				{
				  '$lookup': {
					'from': 'userassessmentlogs', 
					'localField': 'UserAssessmentLogROWID', 
					'foreignField': '_id', 
					'as': 'assessmentLogs'
				  }
				}, {
				  '$unwind': {
					'path': '$assessmentLogs', 
					'preserveNullAndEmptyArrays': true
				  }
				}, {
				  '$lookup': {
					'from': 'users', 
					'localField': 'assessmentLogs.UserROWID', 
					'foreignField': '_id', 
					'as': 'user'
				  }
				}, {
				  '$unwind': {
					'path': '$user', 
					'preserveNullAndEmptyArrays': true
				  }
				}, 
				{
					$match: {
						'user.Mobile': { $in: mobiles }
					}
				},
				{
					$group: {
					_id: '$user.Mobile',
						Mobile: { $first: '$user.Mobile' },
						CREATEDTIME: { $max: '$CREATEDTIME' }
					}
				}
			]);
			// const gameQuery = "Select {} from WordleAttempts left join Users on Users.ROWID = WordleAttempts.UserROWID where Users.Mobile in ("+mobiles.join(",")+") group by Users.Mobile "
			// const userGameQuery = getAllRows("Users.Mobile, max(WordleAttempts.CREATEDTIME)",gameQuery,zcql,prependToLog)
			const userGameQuery = WordleAttempts.aggregate([
				{
					$lookup: {
						from: "users", // Name of the Users collection
						localField: 'UserROWID',
						foreignField: '_id',
						as: 'user'
					}
				},
				{
					$unwind: {
						'path': '$user',
						'preserveNullAndEmptyArrays': true
					}
				},
				{
					$match: {
						'user.Mobile': { $in: mobiles }
					}
				},
				{
					$group: {
						_id: '$user.Mobile',
						Mobile: { $first: '$user.Mobile' },
						CREATEDTIME: { $max: '$CREATEDTIME' }
					}
				},
			])

			const userOtherGameQuery = GameAttempts.aggregate([
				{
					$match: {
						Mobile: { $in: mobiles.map(data=>parseInt(data)) }
					}
				},
				{
					$addFields:
					  /**
					   * newField: The new field name.
					   * expression: The new field expression.
					   */
					{
						latestDate: {
							$max: [
								"$SessionStartTime",
								"$SessionEndTime",
							],
						},
					},
				},
				{
					$group: {
						_id: "$Mobile",
						CREATEDTIME: {
							$max: "$latestDate",
						},
					},
				},
				{
					$project: {
						_id: 0,
						Mobile: "$_id",
						CREATEDTIME: 1,
					},
				}
			])
			
			Promise.all([userSessionQuery,userAssessmentQuery,userGameQuery,userOtherGameQuery])				
			.then(async ([sessions,userAssessments,gameSessions,gameAttempts]) =>	{
				console.info((new Date()).toString()+"|"+prependToLog,"Fetched Sessions Records")
				//Calculate days since last activity for each user
				userSessions.forEach(userSession=>{
					let sessionDates = []
					if(Array.isArray(sessions))
						if(sessions.some(session=>session.Mobile == userSession.Mobile)){
							const sesssionData = sessions.filter(session=>session.Mobile == userSession.Mobile)
							const sessionDate = new Date(getYYYYMMDDDate(sesssionData[0].CREATEDTIME))//.toString().slice(0,10))
							sessionDates.push(sessionDate)
						}
					if(Array.isArray(userAssessments))
						if(userAssessments.some(session=>session.Mobile == userSession.Mobile)){
							const sesssionData = userAssessments.filter(session=>session.Mobile == userSession.Mobile)
							const sessionDate = new Date(getYYYYMMDDDate(sesssionData[0].CREATEDTIME))//.toString().slice(0,10))
							sessionDates.push(sessionDate)
						}
					if(Array.isArray(gameSessions))
						if(gameSessions.some(session=>session.Mobile == userSession.Mobile)){
							const sesssionData = gameSessions.filter(session=>session.Mobile == userSession.Mobile)
							const sessionDate = new Date(getYYYYMMDDDate(sesssionData[0].CREATEDTIME))//.toString().slice(0,10))
							sessionDates.push(sessionDate)
						}
					if(Array.isArray(gameAttempts))
						if(gameAttempts.some(session=>session.Mobile == userSession.Mobile)){
							const sesssionData = gameAttempts.filter(session=>session.Mobile == userSession.Mobile)
							const sessionDate = new Date(getYYYYMMDDDate(sesssionData[0].CREATEDTIME))//.toString().slice(0,10))
							sessionDates.push(sessionDate)
						}
					const latestSessionDate = Math.max(...sessionDates)
					const minutesElapsed = Math.floor((currentDate - latestSessionDate)/1000/60)
					const duration = Math.floor((currentDate - latestSessionDate)/1000/60/60/24)
					userSession['DaysSinceLastActivity'] = Math.min(duration,userSession['DaysSinceLastActivity'])
					userSession['IsRecentActivity'] = minutesElapsed < 10 ? true : false
					
				})
				
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
						mongoose.connection.close()
					}
				}

				// //let table = catalystApp.datastore().table("SessionEvents")
				// const systemPrompt = await zcql.executeZCQLQuery("Select ROWID from SystemPrompts where Name = 'Dummy' and IsActive = true")
				const systemPrompt = await SystemPrompts.findOne({ Name: "Dummy", IsActive: true }, '_id');
				const topicID = systemPrompt['_id']

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
									//If any error returned by Glific API throw error
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

				users.filter(user=>usersReport.some(data=>data.Mobile == user.Mobile)).forEach(async (record,i)=>{
					const userSessionData = userSessions.filter(data=>data.Mobile == record.Mobile)
					var type = null
					var id = null
					if(usersReport.some(data=>data.Mobile==record.Mobile)==false){
						console.info((new Date()).toString()+"|"+prependToLog,i+": Nudge not to be sent to "+ record.Mobile+". Onboarded Today");
						closeContext(i,true)
					}
					else if(userSessionData[0]['DaysSinceLastActivity']>process.env.MaxInactivityDaysForNudge){
						console.info((new Date()).toString()+"|"+prependToLog,i+": Nudge not to be sent to "+ record.Mobile+". Not active for "+userSessionData[0]['DaysSinceLastActivity']+" days");
						closeContext(i,true)
					}
					else if(userSessionData[0]['DaysSinceLastActivity']==process.env.MaxInactivityDaysForNudge){
						await timer(Math.max(300,(i*1000)/users.length))
						console.info((new Date()).toString()+"|"+prependToLog,i+": Last Nudge to be sent to "+ record.Mobile+". Not active for "+userSessionData[0]['DaysSinceLastActivity']+" days");
						type = "HSM"
						id = process.env.TemplateID_sendDailyNudge
					}
					else if(userSessionData[0]['IsRecentActivity']==false){
						await timer(Math.max(300,(i*1000)/users.length))
						console.info((new Date()).toString()+"|"+prependToLog,i+":Sending Nudge to "+ record.Mobile);
						type = "Flow"
						id = process.env.FlowID
					}
					if(type!=null){
						for(var index = 0 ; index < 100; index++){
							try{
								const output = await invokeGlificAPI(type,id,record.GlificID)
								if(output=='SUCCESS'){
									console.info((new Date()).toString()+"|"+prependToLog,i+":Nudge sent to "+record.Mobile)
									closeContext(i,true)
									if(type=='HSM'){
										try{
											let eventData = {
												SessionID: "Nudge Flow",
												Event : "Nudge Sent (HSM Message)",
												SystemPromptROWID: topicID,
												Mobile:record.Mobile
											}
											await SessionEvents.create(eventData)
										}
										catch(e){
											console.error((new Date()).toString()+"|"+prependToLog,i+": Could not update event table for "+ record.Mobile)
										}
									}
									break;
								}
								else{
									console.info((new Date()).toString()+"|"+prependToLog,i+":Nudge not sent to "+record.Mobile+" as OperationStatus = "+nudgeStatus['OperationStatus'])
									closeContext(i,false)
									break;
								}
							}
							catch(err){
								if(err.toString().includes("TOO_MANY_REQUEST")){
									await timer(Math.random()*60000)
									console.info((new Date()).toString()+"|"+prependToLog,i+":Retrying Nudge for "+ record.Mobile);
								}
								else if(["GLFC_AUTH_API_ERR","GLFC_AUTH_ERR","GLFC_API_ERR"].includes(err)){
									await timer(Math.random()*10000)
									console.info((new Date()).toString()+"|"+prependToLog,i+":Retrying Nudge for "+ record.Mobile);
								}
								else{
									console.error((new Date()).toString()+"|"+prependToLog,i+":Nudge not sent to "+record.Mobile+" due to error: ",err)
									closeContext(i,false)
									break;
								}
							}
						}
					}
					else{
						closeContext(i,true)
					}
				})
			})
			.catch(err => {
				console.error((new Date()).toString()+"|"+prependToLog,'Closing Execution. Encountered Error in getting session records: '+err)
				mongoose.connection.close()
			})
		})
		.catch(err => {
			console.error((new Date()).toString()+"|"+prependToLog,'Closing Execution. Encountered Error in getting session records: '+err)
			mongoose.connection.close()
		})
	}
});
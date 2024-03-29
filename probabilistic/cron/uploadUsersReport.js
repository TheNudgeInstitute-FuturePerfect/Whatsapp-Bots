//const catalyst = require("zoho-catalyst-sdk");
const dotenv = require("dotenv");
dotenv.config();
const mongoose = require('mongoose')
mongoose.connect(process.env.MongoDBConnStrng + "whatsapp-bots", {
	useNewUrlParser: true,
});
const Session = require(".././models/Sessions.js");
const SystemPrompt = require(".././models/SystemPrompts.js");
const UsersReport = require(".././models/UsersReport.js");
const User = require(".././models/Users.js");
const Version = require(".././models/versions.js");
const GameAttempts = require("../models/GameAttempts.js");

//const catalystApp = catalyst.initialize();

const executionID = Math.random().toString(36).slice(2)

//Prepare text to prepend with logs
const params = ["uploadUsersReport", executionID, ""]
const prependToLog = params.join(" | ")

console.info((new Date()).toString() + "|" + prependToLog, "Start of Execution")

//Filter unique elements in an array
const unique = (value, index, self) => {
	return self.indexOf(value) === index
}
const timer = (sleepTime) => {
	return new Promise(async (resolve, reject) => {
		//console.debug((new Date()).toString()+"|"+prependToLog,'Wait for '+sleepTime)
		setTimeout(resolve, sleepTime)
	});
}
const getYYYYMMDDDate = (date) => {
	return date.getFullYear()+"-"+('0'+(date.getMonth()+1)).slice(-2)+"-"+('0'+date.getDate()).slice(-2)
}


//let zcql = catalystApp.zcql()

//let query = "select {} from UsersReport"
console.info((new Date()).toString() + "|" + prependToLog, "Getting UserReport Data")
//getAllRows("ROWID, Mobile",query,zcql)
UsersReport.find({})//, '_id Mobile')
	.then((currentReport) => {
		//query = "select {} from Users"
		console.info((new Date()).toString() + "|" + prependToLog, "Getting Users Data")
		//getAllRows("Name, Mobile, Consent, RegisteredTime, NudgeTime, Excluded, EnglishProficiency, SourcingChannel, CREATEDTIME",query,zcql)
		User.find({}, 'Name Mobile Consent RegisteredTime NudgeTime Excluded EnglishProficiency SourcingChannel CREATEDTIME')
			.then(async (users) => {
				const mobiles = users.map(user => user.Mobile)

				//Fetch all users from Glific BQ who sent a message to bot in last 4 days
				const { BigQuery } = require('@google-cloud/bigquery');
				const bigquery = new BigQuery({
					keyFilename: process.env.GCPAuthFile,
					projectId: process.env.GCPProjectID
				});

				query = "SELECT contact_phone as Mobile, max(format_datetime('%Y-%m-%d %H:%I:%S',inserted_at)) as CREATEDTIME " +
					"FROM `" + process.env.GCPProjectID + ".91" + process.env.GlificBotNumber + ".messages` " +
					"where flow = 'inbound' and ((body = 'Chat with Ramya Bot') or (flow_name like 'Probabilistic%')) " + //and inserted_at >=  (CURRENT_DATE('Asia/Kolkata')- 4) "+
					"and contact_phone in ('91" + mobiles.join("','91") + "') " +
					"group by 1"
				//console.info((new Date()).toString()+"|"+prependToLog,`BQ Query: `,query)
				console.info((new Date()).toString() + "|" + prependToLog, "Getting Users Data from BQ")
				var bqUsers = null
				try {
					// Run the query as a job
					const [job] = await bigquery.createQueryJob({
						query: query,
						location: 'US',
					});
					console.info((new Date()).toString() + "|" + prependToLog, `BQ Job ${job.id} started.`);

					// Wait for the query to finish
					[bqUsers] = await job.getQueryResults();
					console.info((new Date()).toString() + "|" + prependToLog, `BQ Job ${job.id} finished.`);
				}
				catch (error) {
					console.info((new Date()).toString() + "|" + prependToLog, `BQ Job ${job.id} Failed. Error:`, error);
				}

				// query = "Select {} "+
				// 		"from Sessions "+
				// 		"left join SystemPrompts on Sessions.SystemPromptsROWID = SystemPrompts.ROWID "+
				// 		"where ((SystemPrompts.Type = 'Topic Prompt') or (SystemPromptsROWID is null)) and  Mobile in ("+mobiles.join(",")+") "+
				// 		"order by Sessions.CREATEDTIME desc"
				// getAllRows("Sessions.Mobile, Sessions.SessionID, Sessions.CREATEDTIME, Sessions.SystemPromptsROWID, SystemPrompts.Name, Sessions.IsActive",query,zcql)
				console.info((new Date()).toString() + "|" + prependToLog, "Getting Sessions Data")
				Session.aggregate([
					{
						$match: {
							Mobile: { $in: mobiles.map(data=>data.toString()) }
						}
					},
					{
						$lookup: {
							from: "systemprompts", // Name of the collection to join with
							localField: 'SystemPromptsROWID',
							foreignField: '_id',
							as: 'SystemPrompts'
						}
					},
					{
						$unwind: {
							path: '$SystemPrompts',
							preserveNullAndEmptyArrays: true
						}
					},
					{
						$match: {
							$or: [
								{ 'SystemPrompts.Type': 'Topic Prompt' },
								{ SystemPromptsROWID: null }
							]
						}
					},
					{
						$sort: { CREATEDTIME: -1 } // Sort by CREATEDTIME in descending order
					},
					{
						$project: {
							Mobile: 1,
							SessionID: 1,
							CREATEDTIME: 1,
							SystemPromptsROWID: 1,
							'SystemPrompts.Name': 1,
							IsActive: 1
						}
					}
				])
					.then((allSessions) => {
						const sessions = allSessions.filter(data => !(data.SessionID.endsWith(' - Translation') || data.SessionID.endsWith(' - Hints') || data.SessionID.endsWith(' - ObjectiveFeedback')))
						// query = "Select {} "+
						// 		"from Sessions "+
						// 		"left join SystemPrompts on Sessions.SystemPromptsROWID = SystemPrompts.ROWID "+
						// 		"where SystemPrompts.Name = 'Self Introduction' and  Mobile in ("+mobiles.join(",")+") "+
						// 	"order by Sessions.CREATEDTIME desc"
						// getAllRows("Sessions.Mobile, Sessions.SessionID, Sessions.EndOfSession",query,zcql)
						console.info((new Date()).toString() + "|" + prependToLog, "Getting Onboarding Data")
						Session.aggregate([
							{
								$match: {
									Mobile: { $in: mobiles.map(data=>data.toString()) }
								}
							},
							{
								$lookup: {
									from: "systemprompts", // Name of the collection to join with
									localField: 'SystemPromptsROWID',
									foreignField: '_id',
									as: 'SystemPrompts'
								}
							},
							{
								$unwind: {
									path: '$SystemPrompts',
									preserveNullAndEmptyArrays: true
								}
							},
							{
								$match: {
									'SystemPrompts.Name': 'Self Introduction'
								}
							},
							{
								$sort: { CREATEDTIME: -1 } // Sort by CREATEDTIME in descending order
							},
							{
								$project: {
									Mobile: 1,
									SessionID: 1,
									EndOfSession: 1
								}
							}
						])
							.then((obdSessions) => {
								console.info((new Date()).toString() + "|" + prependToLog, "Getting Versions")
								// zcql.executeZCQLQuery("Select Version,StartDate from Versions order by StartDate")
								GameAttempts.find({
									Mobile: { $in: mobiles.map(data=>parseInt(data)) }
								})
								.then((gameAttempts)=>{
									Version.find().sort({ StartDate: 1 })
									.then(async (versionRecords) => {
										var versions = []
										if ((typeof versionRecords !== 'undefined') && (versionRecords != null) && (versionRecords.length > 0))
											versions = versionRecords.map((data, index) => {
												var d = data
												if ((index + 1) == versionRecords.length) {
													var now = new Date()
													now.setHours(now.getHours() + 5)
													now.setMinutes(now.getMinutes() + 30)
													d['EndDate'] = now
												}
												else
													d['EndDate'] = versionRecords[index + 1]['StartDate']
												return d
											})
										var report = []
										for (var i = 0; i < users.length; i++) {
											var userReport = {}
											try {
												userReport['Name'] = decodeURIComponent(users[i]["Name"])
											} catch (e) {
												userReport['Name'] = users[i]["Name"]
											}
											userReport['Mobile'] = users[i]["Mobile"]
											userReport['UserCreatedAt'] = users[i]["CREATEDTIME"]//.toString().slice(0, 19)
											const rowID = currentReport.length == 0 ? null : currentReport.filter(data => data['Mobile'] == userReport['Mobile'])
											if ((rowID != null) && (rowID.length > 0))
												userReport['_id'] = rowID[0]['_id']
											userReport['Consent'] = users[i]["Consent"] == true ? "Yes" : "No"
											userReport['Excluded'] = users[i]["Excluded"] == true ? "Yes" : "No"
											let regTimeStamp = new Date(users[i]["RegisteredTime"])
											//If it's an old user shift the timezone
											if (regTimeStamp <= "2023-07-18 18:00:00") {
												regTimeStamp.setHours(regTimeStamp.getHours() + 5)
												regTimeStamp.setMinutes(regTimeStamp.getMinutes() + 30)
											}
											userReport['OnboardingDate'] = regTimeStamp.getFullYear() + "-" + ("0" + (regTimeStamp.getMonth() + 1)).slice(-2) + "-" + ("0" + regTimeStamp.getDate()).slice(-2) + " " + ("0" + regTimeStamp.getHours()).slice(-2) + ":" + ("0" + regTimeStamp.getMinutes()).slice(-2) + ":" + ("0" + regTimeStamp.getSeconds()).slice(-2)
											const regTimeStampVersion = versions.filter(data => ((new Date(data.StartDate)) <= regTimeStamp) && ((new Date(data.EndDate)) > regTimeStamp))
											userReport['OnboardingVersion'] = regTimeStampVersion.length > 0 ? regTimeStampVersion[0]['Version'] : ""
											if (userReport['OnboardingVersion'] == 4.3)
												userReport['Onboarded'] = users[i]["EnglishProficiency"] != null ? "Yes" : "No"
											else if (userReport['OnboardingVersion'] >= 4.4) {
												const sessionRecord = obdSessions.filter(record => record.Mobile == userReport['Mobile'])
												userReport['Onboarded'] = sessionRecord.some(record => record.EndOfSession == true) ? "Yes" : "No"
											}
											else
												userReport['Onboarded'] = "Yes"
											userReport['ReminderTime'] = users[i]["NudgeTime"] == "None" ? "No Reminder" : users[i]["NudgeTime"]
											const userSessions = sessions.filter(data => data.Mobile == userReport['Mobile'])
											const sessionDates = userSessions.map(data => getYYYYMMDDDate(data.CREATEDTIME).toString())//.slice(0, 10))
											//console.debug((new Date()).toString()+"|"+prependToLog,users[i]["Mobile"],' | sessionDates | ',sessionDates)
											var uniqueDates = sessionDates.filter(unique)
											//Add BQ Activity Date of User to Session Date
											const bqData = bqUsers.filter(data => data.Mobile == "91" + userReport["Mobile"])
											if (bqData.length > 0)
												uniqueDates.push(bqData[0]["CREATEDTIME"].toString().slice(0, 10))
											//Add Game Activity Date of User to Session Date
											const gameData = gameAttempts.filter(data => data.Mobile == userReport["Mobile"])
											uniqueDates = uniqueDates.concat(gameData.map(data=>getYYYYMMDDDate(data["SessionStartTime"])))
											uniqueDates = uniqueDates.concat(gameData.map(data=>getYYYYMMDDDate(data["SessionEndTime"])))
											
											uniqueDates = uniqueDates.filter(unique).sort().reverse()
											//console.debug((new Date()).toString()+"|"+prependToLog,users[i]["Mobile"],' | uniqueDates | ',uniqueDates)
											const uniqueSessions = (userSessions.map(data => data.SessionID)).filter(unique)
											//console.debug((new Date()).toString()+"|"+prependToLog,users[i]["Mobile"],' | uniqueSessions | ',uniqueSessions)
											const sessionDuration = uniqueSessions.map(data => {
												const sessionData = userSessions.filter(record => record.SessionID == data)
												var currentSessionDates = sessionData.map(record => getYYYYMMDDDate(record.CREATEDTIME).toString())//.slice(0, 10))
												currentSessionDates = currentSessionDates.sort()
												const sessionCompletionData = userSessions.filter(record => (record.SessionID == data) && (record.IsActive == false))
												var sessionCompletionDates = sessionCompletionData.map(record => getYYYYMMDDDate(record.CREATEDTIME).toString())//.slice(0, 10))
												sessionCompletionDates = sessionCompletionDates.sort()
												return {
													SessionID: data,
													StartDate: currentSessionDates[0],
													EndDate: sessionCompletionDates[sessionCompletionDates.length - 1]
												}
											})
											//console.debug((new Date()).toString()+"|"+prependToLog,users[i]["Mobile"],' | sessionDuration | ',sessionDuration)
											const startedSessions = uniqueDates.map(data => {
												const sessionsStarted = sessionDuration.filter(record => record.StartDate == data)
												const sessionsCompleted = sessionDuration.filter(record => record.EndDate == data)
												return {
													SessionDate: data,
													TotalSessionsStarted: sessionsStarted == null ? 0 : sessionsStarted.length,
													TotalSessionsCompleted: sessionsCompleted == null ? 0 : sessionsCompleted.length,
												}
											})
											//console.debug((new Date()).toString()+"|"+prependToLog,users[i]["Mobile"],' | startedSessions | ',startedSessions)

											var resurrected = null
											var resurrectionDate = null
											let allSessionDates = uniqueDates
											allSessionDates.push(userReport['OnboardingDate'].slice(0, 10))
											allSessionDates = allSessionDates.filter(unique).sort().reverse()
											userReport['LastActiveDate'] = allSessionDates.length == 0 ? null : allSessionDates[0]
											var currentTimeStamp = new Date()
											//currentTimeStamp.setHours(currentTimeStamp.getHours()+5)
											//currentTimeStamp.setMinutes(currentTimeStamp.getMinutes()+30)
											const lastActiveDate = new Date(userReport['LastActiveDate'])
											var daysSinceLastActivity = Math.floor((currentTimeStamp - lastActiveDate) / 1000 / 60 / 60 / 24)
											for (var j = allSessionDates.length - 1; j > 0; j--) {
												const gap = ((new Date(allSessionDates[j - 1])) - (new Date(allSessionDates[j]))) / 1000 / 60 / 60 / 24
												let maxGap = 3
												if (allSessionDates[j - 1] >= '2023-08-07') //Date after release of 5.3 version
													maxGap = 5
												if (gap > maxGap) {
													resurrected = "Yes"
													resurrectionDate = getYYYYMMDDDate(new Date(allSessionDates[j - 1]))
												}
											}
											uniqueDates.sort()
											const sortedUniqueDates = uniqueDates
											//userReport['LastActiveDate'] = uniqueDates.length == 0 ? null : sortedUniqueDates[sortedUniqueDates.length-1]

											userReport['Resurrected'] = resurrected
											userReport['ResurrectionDate'] = resurrectionDate
											const resurrectionVersion = versions.filter(data => {
												/*console.debug((new Date()).toString()+"|"+prependToLog,
													new Date(data.Versions.StartDate.toString().slice(0,10)), 
													new Date(resurrectionDate), 
													new Date(data.Versions.EndDate),
													(
														(new Date(data.Versions.StartDate.toString().slice(0,10))) <= (new Date(resurrectionDate))
													) && (
														(new Date(data.Versions.EndDate)) > (new Date(resurrectionDate))
													)
												)*/
												if (resurrectionDate == null)
													return false
												else
													return ((
														(new Date(data.StartDate)) <= (new Date(resurrectionDate))
													) && (
															(new Date(data.EndDate)) > (new Date(resurrectionDate))
														))
											})
											userReport['RessurectionVersion'] = resurrectionVersion.length == 0 ? null : resurrectionVersion[0]['Version']

											//----GLOW 5.3: ravi.bhushan@dhwaniris.com: Updated Deadline Date Logic Start-------
											var deadline = new Date(userReport['ResurrectionDate'] > userReport['OnboardingDate'] ? userReport['ResurrectionDate'] : userReport['OnboardingDate'])
											if (deadline <= "2023-07-18 18:00:00") {
												deadline.setHours(deadline.getHours() + 5)
												deadline.setMinutes(deadline.getMinutes() + 30)
											}
											deadline.setDate(deadline.getDate() + parseInt(process.env.Period))
											userReport['DeadlineDate'] = deadline.getFullYear() + "-" + ("0" + (deadline.getMonth() + 1)).slice(-2) + "-" + ("0" + deadline.getDate()).slice(-2) + " " + ("0" + deadline.getHours()).slice(-2) + ":" + ("0" + deadline.getMinutes()).slice(-2) + ":" + ("0" + deadline.getSeconds()).slice(-2)
											const obdrsrctVersion = userReport['ResurrectionDate'] > userReport['OnboardingDate'] ? userReport['ResurrectionVersion'] : userReport['OnboardingVersion']
											if (obdrsrctVersion < 5.3)
												userReport['Churned'] = (daysSinceLastActivity > 3) ? "Yes" : "No"
											else
												userReport['Churned'] = (daysSinceLastActivity >= 5) ? "Yes" : (daysSinceLastActivity >= 3) ? "At Risk" : "No"

											//----GLOW 5.3: ravi.bhushan@dhwaniris.com: Updated Deadline Date Logic End-------

											const regDate = regTimeStamp.getFullYear() + "-" + ('0' + (regTimeStamp.getMonth() + 1)).slice(-2) + "-" + ('0' + regTimeStamp.getDate()).slice(-2)
											const resurrectionDt = resurrectionDate != null ? resurrectionDate.toString().slice(0, 10) : '' //resurrectionDate.getFullYear()+"-"+('0'+(resurrectionDate.getMonth()+1)).slice(-2)+"-"+('0'+resurrectionDate.getDate()).slice(-2)
											const cmpltnOnOBDRSDt = startedSessions.some(data => (data.TotalSessionsCompleted >= 1) && ((data.SessionDate == regDate) || (data.SessionDate == resurrectionDt)))
											//console.debug((new Date()).toString()+"|"+prependToLog,users[i]["Mobile"],' | cmpltnOnOBDRSDt | ',cmpltnOnOBDRSDt,regDate,resurrectionDt)
											userReport['CmpltnOnOBDRSDt'] = cmpltnOnOBDRSDt == true ? 'Yes' : 'No'
											//userReport['CmpltnOnOBDRSDt'] = (startedSessions.filter(data=>(data.TotalSessionsCompleted >= 1) && ((data.SessionDate == regTimeStamp.toString().slice(0,10))||(data.SessionDate == resurrectionDate.toString().slice(0,10))))).length > 0 ? 'Yes' : 'No'
											userReport['CmpltnOnOBDDt'] = (startedSessions.filter(data => (data.TotalSessionsCompleted >= 1) && (data.SessionDate == regDate))).length > 0 ? 'Yes' : 'No'
											userReport['AttmptOnOBDDt'] = (startedSessions.filter(data => data.SessionDate == regDate)).length > 0 ? 'Yes' : 'No'
											userReport['DaysAttmptStrtd'] = (startedSessions.filter(data => (data.TotalSessionsStarted >= 1) && (data.SessionDate > regDate) && (data.SessionDate > resurrectionDt))).length
											userReport['DaysAttmptCmpltd'] = (startedSessions.filter(data => (data.TotalSessionsCompleted >= 1) && (data.SessionDate > regDate) && (data.SessionDate > resurrectionDt))).length
											userReport['DaysAttmptdPstOBDRS'] = (uniqueDates.filter(data => (data > regDate) && (data > resurrectionDt))).length
											userReport['DaysAttmptStrtdPstRS'] = (startedSessions.filter(data => (data.TotalSessionsStarted >= 1) && (data.SessionDate > resurrectionDt))).length
											userReport['DaysAttmptCmpltdPstRS'] = (startedSessions.filter(data => (data.TotalSessionsCompleted >= 1) && (data.SessionDate > resurrectionDt))).length
											userReport['DaysAttmptdPstRS'] = (uniqueDates.filter(data => data > resurrectionDt)).length
											userReport['DaysAttmptStrtdPstOBD'] = (startedSessions.filter(data => (data.TotalSessionsStarted >= 1) && (data.SessionDate > regDate))).length
											userReport['DaysAttmptCmpltdPstOBD'] = (startedSessions.filter(data => (data.TotalSessionsCompleted >= 1) && (data.SessionDate > regDate))).length
											userReport['DaysAttmptdPstOBD'] = (uniqueDates.filter(data => data > regDate)).length
											userReport['TotalActiveDays'] = uniqueDates.length
											const uniqueTopics = userSessions.filter(data => (typeof data.SystemPrompts !== 'undefined')).map(data => data.SystemPrompts.Name).filter(unique)
											userReport['TotalTopicsAttempted'] = uniqueTopics.length
											const uniqueActiveTopics = userSessions.filter(data => data.IsActive == false).filter(data => (typeof data.SystemPrompts !== 'undefined')).map(data => data.SystemPrompts.Name).filter(unique)
											userReport['TotalTopicsCompleted'] = uniqueActiveTopics.length
											//uniqueDates.forEach(data=>console.debug((new Date()).toString()+"|"+prependToLog,users[i]["Mobile"],' | data | ',data,' | regDate | ',regDate,' | ',data > regDate))
											userReport['EnglishProficiency'] = users[i]["EnglishProficiency"]
											userReport['SourcingChannel'] = users[i]["SourcingChannel"]
											report.push(userReport)
										}
										const upsertData = report.map(data=>{
											if(typeof data['_id'] !== 'undefined')
												return {
													updateOne: {
														filter:{
															_id:data['_id']
														},
														update:data
													}
												}
											else
												return {
													insertOne: {
														document:data
													}
												}
										})
										const upsertOutput = await UsersReport.bulkWrite(upsertData)
										console.info((new Date()).toString() + "|" + prependToLog, "End of Execution | Inserted: "+upsertOutput.insertedCount +" | Updated: "+upsertOutput.modifiedCount);
										mongoose.connection.close()
									})
									.catch((err) => {
										console.info((new Date()).toString() + "|" + prependToLog, "End of Execution");
										console.error((new Date()).toString() + "|" + prependToLog, err);
										mongoose.connection.close()
									});
								})
								.catch((err) => {
									console.info((new Date()).toString() + "|" + prependToLog, "End of Execution");
									console.error((new Date()).toString() + "|" + prependToLog, err);
									mongoose.connection.close()
								});
							})
							.catch((err) => {
								console.info((new Date()).toString() + "|" + prependToLog, "End of Execution");
								console.error((new Date()).toString() + "|" + prependToLog, err);
								mongoose.connection.close()
							});
					})
					.catch((err) => {
						console.info((new Date()).toString() + "|" + prependToLog, "End of Execution");
						console.error((new Date()).toString() + "|" + prependToLog, err);
						mongoose.connection.close()
					});
			})
			.catch((err) => {
				console.info((new Date()).toString() + "|" + prependToLog, "End of Execution");
				console.error((new Date()).toString() + "|" + prependToLog, err);
				mongoose.connection.close()
			});
	})
	.catch((err) => {
		console.info((new Date()).toString() + "|" + prependToLog, "End of Execution");
		console.error((new Date()).toString() + "|" + prependToLog, err);
		mongoose.connection.close()
	});
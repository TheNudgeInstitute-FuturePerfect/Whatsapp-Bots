const catalyst = require("zoho-catalyst-sdk");
const emojiRegex = require('emoji-regex');


module.exports = (cronDetails, context) => {

    const catalystApp = catalyst.initialize(context);

	//Filter unique elements in an array
	const unique = (value, index, self) => {
		return self.indexOf(value) === index
	}
					
	const getAllRows = (fields,query,zcql,dataLimit) => {
		return new Promise(async (resolve) => {			
			var jsonReport = []
			const dataQuery = query.replace("{}",fields)
			const lmt = dataLimit ? dataLimit : 300
			var i = 1
			while(true){
				query = dataQuery+" LIMIT "+i+", "+lmt
				console.log('Fetching records from '+i+" to "+(i+300-1)+
							'\nQuery: '+query)
				const queryResult = await zcql.executeZCQLQuery(query)
				if(queryResult.length == 0)
					break;
				jsonReport = jsonReport.concat(queryResult)					
				i=i+300
			}
			resolve(jsonReport)
		})
	}

	let zcql = catalystApp.zcql()
	
	let query = "select {} from UserSessionAttemptReport" // where IsActive = true or IsActive is null"
	getAllRows("ROWID, SessionID, IsActive",query,zcql)
	.then((usersAttemptReport)=>{
		const currentReport = usersAttemptReport.filter(data=>(data.UserSessionAttemptReport.IsActive == true) || (data.UserSessionAttemptReport.IsActive == null))
		const openSessions = currentReport.map(data=>data.UserSessionAttemptReport.SessionID)
		console.log('Total Open Sessions = '+openSessions.length)
		const closedReport = usersAttemptReport.filter(data=>data.UserSessionAttemptReport.IsActive == false)
		const closedSessions = closedReport.map(data=>data.UserSessionAttemptReport.SessionID)
		console.log('Total Closed Sessions = '+closedSessions.length)		
		query = "select {} from Users"
		getAllRows("Mobile",query,zcql)
		.then((users)=>{
			if(users.length>0){
				const mobiles = users.map(user=>user.Users.Mobile)
				query = "Select {} "+
						"from Sessions "+
						"left join SystemPrompts on Sessions.SystemPromptsROWID = SystemPrompts.ROWID "+
						"where ((SystemPrompts.Type = 'Topic Prompt') or (SystemPromptsROWID is null)) and SessionID not in ('"+closedSessions.join("','")+"') "+
						"order by Sessions.CREATEDTIME desc"
				getAllRows("Sessions.IsActive, Sessions.PerformanceReportURL, Sessions.EndOfSession, Sessions.Mobile, Sessions.SessionID, Sessions.CREATEDTIME, Sessions.SystemPromptsROWID, SystemPrompts.ROWID, SystemPrompts.Name, SystemPrompts.Persona, Sessions.Message, Sessions.MessageType, Sessions.CompletionTokens, Sessions.PromptTokens, Sessions.SLFCompletionTokens, Sessions.SLFPromptTokens",query,zcql)
				.then((allSessions)=>{
					const sessions = allSessions.filter(data=>!(data.Sessions.SessionID.endsWith(' - Translation')||data.Sessions.SessionID.endsWith(' - Hints')||data.Sessions.SessionID.endsWith(' - ObjectiveFeedback')))
					if(sessions.length>0){
						const sessionIDs = sessions.map(session=>session.Sessions.SessionID)
						query = "Select {} "+
								"from SessionFeedback "+
								"where SessionID in ('"+sessionIDs.join("','")+"') "+
								"order by SessionFeedback.CREATEDTIME desc"
						getAllRows("SessionID, Rating, Feedback, FeedbackType, FeedbackURL, GPTRating, GPTFeedback, GPTFeedbackType, GPTFeedbackURL",query,zcql)
						.then((feedbacks)=>{
							zcql.executeZCQLQuery("Select Version,StartDate from Versions order by StartDate")
							.then(async (versionRecords)=>{
								var versions = []
								if((typeof versionRecords !== 'undefined')&&(versionRecords!=null)&&(versionRecords.length>0))
									versions = versionRecords.map((data,index)=>{
										var d = data
										if((index+1)==versionRecords.length){
											var now = new Date()
											now.setHours(now.getHours()+5)
											now.setMinutes(now.getMinutes()+30)
											d['Versions']['EndDate'] = now
										}
										else
											d['Versions']['EndDate'] = versionRecords[index+1]['Versions']['StartDate']
										return d
									})
								var report = []
								const emojiRegEx = emojiRegex()
								for(var i=0; i<users.length; i++){
									const userSessions = sessions.filter(data=>data.Sessions.Mobile == users[i]['Users']['Mobile'])	
									const userSessionsWC = userSessions.map(data=>{
										var temp = data
										var msg = ""
										try{
											msg = (decodeURIComponent(data['Sessions']['Message'])).replace(emojiRegEx,"")
										}
										catch(e){
											msg = (data['Sessions']['Message']).replace(emojiRegEx,"")
										}
										temp['Sessions']['TotalWords'] = (data['Sessions']['MessageType']=='UserMessage') ? (msg.split(" ")).length : 0
										return temp
									})
									const userSessionsTopics = userSessions.map(data=>data.SystemPrompts.Name+"-"+data.SystemPrompts.ROWID)
									const uniqueTopics = userSessionsTopics.filter(unique)
									if(uniqueTopics.length==0){
										var userReport = {}
										userReport['Mobile'] = users[i]['Users']['Mobile']
										userReport['Topic'] = ""
										userReport['Persona'] = ""
										userReport['Attempt'] = ""
										userReport['SessionID'] = ""
										userReport['SessionStartTime'] = ""
										userReport['AttemptVersion'] = ""
										userReport['SessionEndTime'] = ""
										userReport['SessionDuration'] = ""
										userReport['OptedForPerformanceReport'] = ""
										userReport['PerformanceReportURL'] = ""
										userReport['SessionComplete'] = ""
										userReport['EndOfSession'] = ""
										userReport['OptedForGPTFeedback'] =	""
										userReport['GPTRating'] = ""
										userReport['GPTFeedback'] = ""
										userReport['GPTFeedbackURL'] = ""
										userReport['FlowRating'] = ""
										userReport['Feedback'] = ""
										userReport['FeedbackURL'] = ""
										userReport['TotalWords'] = ""
										userReport['CompletionTokens'] = ""
										userReport['PromptTokens'] = ""
										userReport['SLFCompletionTokens'] = ""
										userReport['SLFPromptTokens'] = ""
										report.push(userReport)
									}
									else{
										for(var j=0; j<uniqueTopics.length;j++)
										{
											const topicSessionsData = userSessions.filter(data=>(data.SystemPrompts.Name+"-"+data.SystemPrompts.ROWID)==uniqueTopics[j])
											const topicSessions = topicSessionsData.map(data=>data.Sessions.SessionID)
											const uniqueTopicSessions = topicSessions.filter(unique)
											var attempt = uniqueTopicSessions.length
											
											for(var k=0; k<uniqueTopicSessions.length; k++)
											{
												var userReport = {}
												userReport['Mobile'] = users[i]["Users"]["Mobile"]
												userReport['Topic'] = uniqueTopics[j] == null ? "" : (uniqueTopics[j].split("-"))[0]
												userReport['Persona'] = topicSessionsData[0].SystemPrompts.Persona
												userReport['SessionID'] = uniqueTopicSessions[k]
												const rowID = currentReport.length == 0 ? null : currentReport.filter(data=>data['UserSessionAttemptReport']['SessionID']==userReport['SessionID'])
												if((rowID!=null)&&(rowID.length>0))
													userReport['ROWID'] = rowID[0]['UserSessionAttemptReport']['ROWID']
												userReport['Attempt'] = attempt
												attempt--
												const sessionRecord = userSessionsWC.filter(record=>record.Sessions.SessionID == userReport['SessionID'])
												userReport['IsActive'] = sessionRecord.some(record=>record.Sessions.IsActive == true)
												const sessionWCs = sessionRecord.map(record=>record.Sessions.TotalWords)
												userReport['TotalWords'] = (sessionWCs.reduce((a,b)=>a+b,0))
												const sessionCompletionTokens = sessionRecord.map(record=>record.Sessions.CompletionTokens==null ? 0:parseInt(record.Sessions.CompletionTokens))
												userReport['CompletionTokens'] = (sessionCompletionTokens.reduce((a,b)=>a+b,0))
												const sessionPromptTokens = sessionRecord.map(record=>record.Sessions.PromptTokens==null ? 0:parseInt(record.Sessions.PromptTokens))
												userReport['PromptTokens'] = (sessionPromptTokens.reduce((a,b)=>a+b,0))
												const sessionSLFCompletionTokens = sessionRecord.map(record=>record.Sessions.SLFCompletionTokens==null ? 0:parseInt(record.Sessions.SLFCompletionTokens))
												userReport['SLFCompletionTokens'] = (sessionSLFCompletionTokens.reduce((a,b)=>a+b,0))
												const sessionSLFPromptTokens = sessionRecord.map(record=>record.Sessions.SLFPromptTokens==null ? 0:parseInt(record.Sessions.SLFPromptTokens))
												userReport['SLFPromptTokens'] = (sessionSLFPromptTokens.reduce((a,b)=>a+b,0))
												
												var sessionTimeStamps = sessionRecord.map(record=>record.Sessions.CREATEDTIME)
												sessionTimeStamps = sessionTimeStamps.sort()
												userReport['SessionStartTime'] = (new String(sessionTimeStamps[0])).slice(0,19)
												const sessionTimeStampVersion = versions.filter(data=>{
													/*console.log(new Date(data.Versions.StartDate), "|",
														new Date(sessionTimeStamps[0]), "|",
														new Date(data.Versions.EndDate), " = ",
														(((new Date(data.Versions.StartDate)) <= (new Date(sessionTimeStamps[0]))) && ((new Date(data.Versions.EndDate)) > (new Date(sessionTimeStamps[0]))))
													)*/
													return (((new Date(data.Versions.StartDate)) <= (new Date(sessionTimeStamps[0]))) && ((new Date(data.Versions.EndDate)) > (new Date(sessionTimeStamps[0]))))
												})
												userReport['AttemptVersion'] = sessionTimeStampVersion[0]['Versions']['Version']
												userReport['SessionEndTime'] = (new String(sessionTimeStamps[sessionTimeStamps.length-1])).slice(0,19)
												userReport['SessionDuration'] = 0
												for(var l = 1; l<sessionTimeStamps.length; l++){
													const currentTimeStamp = new Date(sessionTimeStamps[l])
													const lastTimeStamp = new Date(sessionTimeStamps[l-1])
													var duration = (currentTimeStamp - lastTimeStamp)/1000/60
													if(duration > 10) 
														duration = 10
													userReport['SessionDuration'] += duration
												}
												userReport['EndOfSession'] = sessionRecord.some(record=>record.Sessions.EndOfSession == true) ? "Yes":"No"
												const perfReport = sessionRecord.filter(record=>record.Sessions.PerformanceReportURL != null)
												userReport['OptedForPerformanceReport'] = (typeof perfReport === 'undefined') ? "No" : perfReport==null ? "No" : perfReport.length==0 ? "No" : "Yes"
												userReport['PerformanceReportURL'] = userReport['OptedForPerformanceReport']=="Yes" ? perfReport[0].Sessions.PerformanceReportURL: ""
												const feedback = feedbacks.filter(record=>record.SessionFeedback.SessionID == userReport['SessionID'])													
												if((typeof feedback!=='undefined') && (feedback != null) && (feedback.length>0)){
													userReport['SessionComplete'] = "Yes"
													userReport['OptedForGPTFeedback'] =	feedback[0]['SessionFeedback']['GPTRating'] == -99 ? "No":"Yes"
													userReport['GPTRating'] = feedback[0]['SessionFeedback']['GPTRating'] == -99 ? "" : feedback[0]['SessionFeedback']['GPTRating'] == -1 ? "Skipped" : feedback[0]['SessionFeedback']['GPTRating']==null ? "":feedback[0]['SessionFeedback']['GPTRating']
													userReport['GPTFeedback'] = feedback[0]['SessionFeedback']['GPTRating'] == -99 ? "" : feedback[0]['SessionFeedback']['GPTRating'] == -1 ? "" : feedback[0]['SessionFeedback']['GPTFeedback'] == null ?"": feedback[0]['SessionFeedback']['GPTFeedback']
													userReport['GPTFeedbackURL'] = feedback[0]['SessionFeedback']['GPTRating'] == -99 ? "" : feedback[0]['SessionFeedback']['GPTRating'] == -1 ? "" : feedback[0]['SessionFeedback']['GPTFeedbackURL'] == null ? "" : feedback[0]['SessionFeedback']['GPTFeedbackURL']
													userReport['FlowRating'] = feedback[0]['SessionFeedback']['Rating'] == -99 ? "" : feedback[0]['SessionFeedback']['Rating'] == -1 ? "Skipped" : feedback[0]['SessionFeedback']['Rating'] == null ? "" : feedback[0]['SessionFeedback']['Rating']
													userReport['Feedback'] = feedback[0]['SessionFeedback']['Rating'] == -99 ? "" : feedback[0]['SessionFeedback']['Rating'] == -1 ? "" : feedback[0]['SessionFeedback']['Feedback'] == null ? "" : feedback[0]['SessionFeedback']['Feedback']
													userReport['FeedbackURL'] = feedback[0]['SessionFeedback']['Rating'] == -99 ? "" : feedback[0]['SessionFeedback']['Rating'] == -1 ? "" : feedback[0]['SessionFeedback']['FeedbackURL'] == null ? "" : feedback[0]['SessionFeedback']['FeedbackURL']
												}
												else{
													userReport['SessionComplete'] = "No"
													userReport['OptedForGPTFeedback'] =	""
													userReport['GPTRating'] = ""
													userReport['GPTFeedback'] = ""
													userReport['GPTFeedbackURL'] = ""
													userReport['FlowRating'] = ""
													userReport['Feedback'] = ""
													userReport['FeedbackURL'] = ""

												}
												report.push(userReport)
											}
										}
									}
								}	
								//var uniqueUserSessionsTopics = [...new Map(userSessionsTopics.map(item => [item.SessionID, item])).values()]
								report = report.filter(data=>data.SessionID != '')
								report = report.sort((a, b)=>{
									if((a['Topic'] == b['Topic']) && (a.SessionStartTime < b.SessionStartTime)) {
										return -1;
									}
									if((a['Topic'] == b['Topic']) && (a.SessionStartTime > b.SessionStartTime)) {
										return 1;
									}
									if((a['Topic'] == b['Topic'])) {
										return 0;
									}
									if((a['Topic'] < b['Topic'])) {
										return -1;
									}
									if((a['Topic'] > b['Topic'])) {
										return 1;
									}
									// a must be equal to b
									return 0;
								})
								let table = catalystApp.datastore().table("UserSessionAttemptReport")
								const updateData = report.filter(data=>typeof data['ROWID'] !== 'undefined')
								const insertData = report.filter(data=>typeof data['ROWID'] === 'undefined')
								let tableIndex = 0
								while((updateData.length>0)&&(tableIndex<updateData.length)){
									try{
										await table.updateRows(updateData.slice(tableIndex,tableIndex+200))
									}
									catch(e){
										console.log('Could not update data from index =',tableIndex,"\nError",e)
										console.log(updateData.slice(tableIndex,tableIndex+200))
									}
									tableIndex = tableIndex+200
								}
								tableIndex = 0
								while((insertData.length>0)&&(tableIndex<insertData.length)){
									try{
										await table.insertRows(insertData.slice(tableIndex,tableIndex+200))
									}
									catch(e){
										console.log('Could not update data from index =',tableIndex,"\nError",e)
										console.log(insertData.slice(tableIndex,tableIndex+200))
									}
									tableIndex = tableIndex+200
								}
								context.closeWithSuccess()
							})
							.catch((err) => {
								console.log(err);
								context.closeWithFailure()
							});
						})
						.catch((err) => {
							console.log(err);
							context.closeWithFailure()
						});	
					}
					else{
						console.log("No Session Data")
						context.closeWithSuccess()
					}
				})
				.catch((err) => {
					console.log(err);
					context.closeWithFailure()
				});
			}
			else{
				console.log("No user found")
				context.closeWithSuccess()
			}
		})
		.catch((err) => {
			console.log(err);
			context.closeWithFailure()
		});
	})
	.catch((err) => {
		console.log(err);
		context.closeWithFailure()
	});
}
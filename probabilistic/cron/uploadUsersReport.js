const catalyst = require("zoho-catalyst-sdk");

module.exports = (cronDetails) => {

    const catalystApp = catalyst.initialize();

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
	
	let query = "select {} from UsersReport"
	getAllRows("ROWID, Mobile",query,zcql)
	.then((currentReport)=>{
		query = "select {} from Users"
		getAllRows("Name, Mobile, Consent, RegisteredTime, NudgeTime, Excluded, EnglishProficiency, SourcingChannel",query,zcql)
		.then((users)=>{
			const mobiles = users.map(user=>user.Users.Mobile)
			query = "Select {} "+
					"from Sessions "+
					"left join SystemPrompts on Sessions.SystemPromptsROWID = SystemPrompts.ROWID "+
					"where ((SystemPrompts.Type = 'Topic Prompt') or (SystemPromptsROWID is null)) and  Mobile in ("+mobiles.join(",")+") "+
					"order by Sessions.CREATEDTIME desc"
			getAllRows("Sessions.Mobile, Sessions.SessionID, Sessions.CREATEDTIME, Sessions.SystemPromptsROWID, SystemPrompts.Name, Sessions.IsActive",query,zcql)
			.then((allSessions)=>{
				const sessions = allSessions.filter(data=>!(data.Sessions.SessionID.endsWith(' - Translation')||data.Sessions.SessionID.endsWith(' - Hints')||data.Sessions.SessionID.endsWith(' - ObjectiveFeedback')))
				query = "Select {} "+
						"from Sessions "+
						"left join SystemPrompts on Sessions.SystemPromptsROWID = SystemPrompts.ROWID "+
						"where SystemPrompts.Name = 'Self Introduction' and  Mobile in ("+mobiles.join(",")+") "+
					"order by Sessions.CREATEDTIME desc"
				getAllRows("Sessions.Mobile, Sessions.SessionID, Sessions.EndOfSession",query,zcql)
				.then((obdSessions)=>{
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
						for(var i=0; i<users.length; i++){
							var userReport = {}
							userReport['Name'] = decodeURIComponent(users[i]["Users"]["Name"])
							userReport['Mobile'] = users[i]["Users"]["Mobile"]
							const rowID = currentReport.length == 0 ? null : currentReport.filter(data=>data['UsersReport']['Mobile']==userReport['Mobile'])
							if((rowID!=null)&&(rowID.length>0))
								userReport['ROWID'] = rowID[0]['UsersReport']['ROWID']
							userReport['Consent'] = users[i]["Users"]["Consent"] == true ? "Yes":"No"
							userReport['Excluded'] = users[i]["Users"]["Excluded"] == true ? "Yes":"No"
							let regTimeStamp = new Date(users[i]["Users"]["RegisteredTime"])
							regTimeStamp.setHours(regTimeStamp.getHours()+5)
							regTimeStamp.setMinutes(regTimeStamp.getMinutes()+30)
							userReport['OnboardingDate'] = regTimeStamp.getFullYear()+"-"+("0"+(regTimeStamp.getMonth()+1)).slice(-2)+"-"+("0"+regTimeStamp.getDate()).slice(-2)+" "+("0"+regTimeStamp.getHours()).slice(-2)+":"+("0"+regTimeStamp.getMinutes()).slice(-2)+":"+("0"+regTimeStamp.getSeconds()).slice(-2)
							const regTimeStampVersion = versions.filter(data=>((new Date(data.Versions.StartDate)) <= regTimeStamp) && ((new Date(data.Versions.EndDate)) > regTimeStamp))
							userReport['OnboardingVersion'] = regTimeStampVersion[0]['Versions']['Version']
							if(userReport['OnboardingVersion']==4.3)
								userReport['Onboarded'] = users[i]["Users"]["EnglishProficiency"]!=null ? "Yes" : "No"
							else if(userReport['OnboardingVersion']==4.4){
								const sessionRecord = obdSessions.filter(record=>record.Sessions.Mobile == userReport['Mobile'])
								userReport['Onboarded'] = sessionRecord.some(record=>record.Sessions.EndOfSession == true) ? "Yes":"No"
							}
							else
								userReport['Onboarded'] = "Yes"
							var deadline = new Date(users[i]["Users"]["RegisteredTime"])
							deadline.setHours(deadline.getHours()+5)
							deadline.setMinutes(deadline.getMinutes()+30)
							deadline.setDate(deadline.getDate()+parseInt(process.env.Period))
							userReport['DeadlineDate'] = deadline.getFullYear()+"-"+("0"+(deadline.getMonth()+1)).slice(-2)+"-"+("0"+deadline.getDate()).slice(-2)+" "+("0"+deadline.getHours()).slice(-2)+":"+("0"+deadline.getMinutes()).slice(-2)+":"+("0"+deadline.getSeconds()).slice(-2)
							userReport['ReminderTime'] = users[i]["Users"]["NudgeTime"] == "None" ? "No Reminder" : users[i]["Users"]["NudgeTime"]
							const userSessions = sessions.filter(data=>data.Sessions.Mobile == userReport['Mobile'])
							const sessionDates = userSessions.map(data=>(data.Sessions.CREATEDTIME).toString().slice(0,10))
							//console.log(users[i]["Users"]["Mobile"],' | sessionDates | ',sessionDates)
							const uniqueDates = sessionDates.filter(unique)
							//console.log(users[i]["Users"]["Mobile"],' | uniqueDates | ',uniqueDates)
							const uniqueSessions = (userSessions.map(data=>data.Sessions.SessionID)).filter(unique)
							//console.log(users[i]["Users"]["Mobile"],' | uniqueSessions | ',uniqueSessions)
							const sessionDuration = uniqueSessions.map(data=>{
								const sessionData = userSessions.filter(record=>record.Sessions.SessionID == data)
								var currentSessionDates = sessionData.map(record=>(record.Sessions.CREATEDTIME).toString().slice(0,10))
								currentSessionDates = currentSessionDates.sort()
								const sessionCompletionData = userSessions.filter(record=>(record.Sessions.SessionID == data)&&(record.Sessions.IsActive == false))
								var sessionCompletionDates = sessionCompletionData.map(record=>(record.Sessions.CREATEDTIME).toString().slice(0,10))
								sessionCompletionDates = sessionCompletionDates.sort()
								return {
									SessionID:data,
									StartDate:currentSessionDates[0],
									EndDate:sessionCompletionDates[sessionCompletionDates.length-1]
								}
							})
							//console.log(users[i]["Users"]["Mobile"],' | sessionDuration | ',sessionDuration)
							const startedSessions = uniqueDates.map(data=>{
								const sessionsStarted = sessionDuration.filter(record=>record.StartDate == data)
								const sessionsCompleted = sessionDuration.filter(record=>record.EndDate == data)
								return{
									SessionDate: data,
									TotalSessionsStarted: sessionsStarted == null ? 0 : sessionsStarted.length,
									TotalSessionsCompleted: sessionsCompleted == null ? 0 : sessionsCompleted.length,
								}
							})
							//console.log(users[i]["Users"]["Mobile"],' | startedSessions | ',startedSessions)
							
							var resurrected = null
							var resurrectionDate = null
							for(var j=uniqueDates.length-1; j>0; j--){
								const gap = ((new Date(uniqueDates[j-1]))-(new Date(uniqueDates[j])))/1000/60/60/24
								if(gap > 3){
									resurrected = "Yes"
									resurrectionDate = uniqueDates[j-1]
								}
							}
							uniqueDates.sort()
							const sortedUniqueDates = uniqueDates
							userReport['LastActiveDate'] = uniqueDates.length == 0 ? null : sortedUniqueDates[sortedUniqueDates.length-1]
							var currentTimeStamp = new Date()
							currentTimeStamp.setHours(currentTimeStamp.getHours()+5)
							currentTimeStamp.setMinutes(currentTimeStamp.getMinutes()+30)
							const lastActiveDate = new Date(userReport['LastActiveDate'])
							var daysSinceLastActivity = Math.floor((currentTimeStamp-lastActiveDate)/1000/60/60/24)
							userReport['Churned'] = daysSinceLastActivity > 3 ? "Yes":"No"
							userReport['Resurrected'] = resurrected
							userReport['ResurrectionDate'] = resurrectionDate
							const resurrectionVersion = versions.filter(data=>{
								/*console.log(
									new Date(data.Versions.StartDate.toString().slice(0,10)), 
									new Date(resurrectionDate), 
									new Date(data.Versions.EndDate),
									(
										(new Date(data.Versions.StartDate.toString().slice(0,10))) <= (new Date(resurrectionDate))
									) && (
										(new Date(data.Versions.EndDate)) > (new Date(resurrectionDate))
									)
								)*/
								if(resurrectionDate == null)
									return false
								else
									return ((
										(new Date(data.Versions.StartDate)) <= (new Date(resurrectionDate))
									) && (
										(new Date(data.Versions.EndDate)) > (new Date(resurrectionDate))
									))
							})
							userReport['RessurectionVersion'] = resurrectionVersion.length == 0 ? null : resurrectionVersion[0]['Versions']['Version']
							const regDate = regTimeStamp.getFullYear()+"-"+('0'+(regTimeStamp.getMonth()+1)).slice(-2)+"-"+('0'+regTimeStamp.getDate()).slice(-2)
							const resurrectionDt = resurrectionDate != null ? resurrectionDate.toString().slice(0,10) : '' //resurrectionDate.getFullYear()+"-"+('0'+(resurrectionDate.getMonth()+1)).slice(-2)+"-"+('0'+resurrectionDate.getDate()).slice(-2)
							const cmpltnOnOBDRSDt = startedSessions.some(data=>(data.TotalSessionsCompleted >=1) && ((data.SessionDate == regDate)||(data.SessionDate == resurrectionDt)))
							//console.log(users[i]["Users"]["Mobile"],' | cmpltnOnOBDRSDt | ',cmpltnOnOBDRSDt,regDate,resurrectionDt)
							userReport['CmpltnOnOBDRSDt'] = cmpltnOnOBDRSDt == true ? 'Yes' : 'No'
							//userReport['CmpltnOnOBDRSDt'] = (startedSessions.filter(data=>(data.TotalSessionsCompleted >= 1) && ((data.SessionDate == regTimeStamp.toString().slice(0,10))||(data.SessionDate == resurrectionDate.toString().slice(0,10))))).length > 0 ? 'Yes' : 'No'
							userReport['CmpltnOnOBDDt'] = (startedSessions.filter(data=>(data.TotalSessionsCompleted >= 1) && (data.SessionDate == regDate))).length > 0 ? 'Yes' : 'No'
							userReport['AttmptOnOBDDt'] = (startedSessions.filter(data=>data.SessionDate == regDate)).length > 0 ? 'Yes' : 'No'
							userReport['DaysAttmptStrtd'] = (startedSessions.filter(data=>(data.TotalSessionsStarted >= 1) && (data.SessionDate > regDate) && (data.SessionDate > resurrectionDt))).length
							userReport['DaysAttmptCmpltd'] = (startedSessions.filter(data=>(data.TotalSessionsCompleted >= 1) && (data.SessionDate > regDate) && (data.SessionDate > resurrectionDt))).length
							userReport['DaysAttmptdPstOBDRS'] = (uniqueDates.filter(data=>(data > regDate) && (data > resurrectionDt))).length
							userReport['DaysAttmptStrtdPstRS'] = (startedSessions.filter(data=>(data.TotalSessionsStarted >= 1) && (data.SessionDate > resurrectionDt))).length
							userReport['DaysAttmptCmpltdPstRS'] = (startedSessions.filter(data=>(data.TotalSessionsCompleted >= 1) && (data.SessionDate > resurrectionDt))).length
							userReport['DaysAttmptdPstRS'] = (uniqueDates.filter(data=>data > resurrectionDt)).length
							userReport['DaysAttmptStrtdPstOBD'] = (startedSessions.filter(data=>(data.TotalSessionsStarted >= 1) && (data.SessionDate > regDate))).length
							userReport['DaysAttmptCmpltdPstOBD'] = (startedSessions.filter(data=>(data.TotalSessionsCompleted >= 1) && (data.SessionDate > regDate))).length
							userReport['DaysAttmptdPstOBD'] = (uniqueDates.filter(data=> data > regDate)).length
							userReport['TotalActiveDays'] = uniqueDates.length
							const allTopics = userSessions.map(data=>data.SystemPrompts.Name)
							const uniqueTopics = allTopics.filter(unique)
							userReport['TotalTopicsAttempted'] = uniqueTopics.length
							const allActiveSessions = userSessions.filter(data=>data.Sessions.IsActive == false)
							const allActiveTopics = allActiveSessions.map(data=>data.SystemPrompts.Name)
							const uniqueActiveTopics = allActiveTopics.filter(unique)
							userReport['TotalTopicsCompleted'] = uniqueActiveTopics.length
							//uniqueDates.forEach(data=>console.log(users[i]["Users"]["Mobile"],' | data | ',data,' | regDate | ',regDate,' | ',data > regDate))
							userReport['EnglishProficiency'] = users[i]["Users"]["EnglishProficiency"]
							userReport['SourcingChannel'] = users[i]["Users"]["SourcingChannel"]
							report.push(userReport)
						}
						let table = catalystApp.datastore().table("UsersReport")
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
					})
					.catch((err) => {
						console.log(err);
					});
				})
				.catch((err) => {
					console.log(err);
				});
			})
			.catch((err) => {
				console.log(err);
			});
		})
		.catch((err) => {
			console.log(err);
		});
	})
	.catch((err) => {
		console.log(err);
	});
}
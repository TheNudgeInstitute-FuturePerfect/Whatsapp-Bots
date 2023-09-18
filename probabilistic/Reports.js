"use strict"

const express = require("express");
// const catalyst = require('zcatalyst-sdk-node');
const catalyst = require("zoho-catalyst-sdk");
const emojiRegex = require('emoji-regex');
const userFlowQuestionLogs = require("./models/userFlowQuestionLogs");
const flowQuestions = require("./models/flowQuestions");

// const app = express();
// app.use(express.json());
const app = express.Router();

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
			console.log(queryResult.length)
			if((queryResult.length == 0)||(!Array.isArray(queryResult))){
				if(!Array.isArray(queryResult))
					console.log("Error in query - ",queryResult)
				break;
			}
			jsonReport = jsonReport.concat(queryResult)					
			i=i+300
		}
		resolve(jsonReport)
	})
}
	

app.get("/userreport", (req, res) => {

    let catalystApp = catalyst.initialize(req, {type: catalyst.type.applogic});

	const executionID = Math.random().toString(36).slice(2)
    
    //Prepare text to prepend with logs
    const params = ["Reports",req.url,executionID,""]
    const prependToLog = params.join(" | ")
    
    console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")


	let zcql = catalystApp.zcql()

	const startDate = req.query.startDate ? req.query.startDate : (req.query.date ? req.query.date : '1970-01-01')
	var today = new Date()
	today.setHours(today.getHours()+5)
	today.setMinutes(today.getMinutes()+30)
	const endDate = req.query.endDate ? req.query.endDate : (today.getFullYear()+"-"+('0'+(today.getMonth()+1)).slice(-2)+"-"+('0'+today.getDate()).slice(-2))
	const dataLimit = req.query.limit ? req.query.limit : null

	let query = "select {} from UsersReport "+
				"where UsersReport.OnboardingDate >='"+startDate+" 00:00:00' and UsersReport.OnboardingDate <= '"+endDate+" 23:59:59' "
	getAllRows("*",query,zcql,dataLimit)
	.then((reportData)=>{
		const report = reportData.map(data=>{
			return {
				//Name:data.UsersReport.Name == null ? "" : data.UsersReport.Name.toString(),
				Mobile:data.UsersReport.Mobile == null ? "" : data.UsersReport.Mobile.toString(),
				//Consent:data.UsersReport.Consent == null ? "" : data.UsersReport.Consent.toString(),
				Excluded:data.UsersReport.Excluded == null ? "" : data.UsersReport.Excluded.toString(),
				UserCreatedAt:data.UsersReport.UserCreatedAt == null ? "" : data.UsersReport.UserCreatedAt.toString(),
				//OnboardingDate:data.UsersReport.OnboardingDate == null ? "" : data.UsersReport.OnboardingDate.toString(),
				//OnboardingVersion:data.UsersReport.OnboardingVersion == null ? "" : data.UsersReport.OnboardingVersion.toString(),
				//Onboarded:data.UsersReport.Onboarded == null ? "" : data.UsersReport.Onboarded.toString(),
				OnboardingResurrectionDate : (data.UsersReport.ResurrectionDate != null) && (data.UsersReport.ResurrectionDate > data.UsersReport.OnboardingDate) ? data.UsersReport.ResurrectionDate.toString() : data.UsersReport.OnboardingDate.toString(),
				OnboardingResurrectionVersion : (data.UsersReport.ResurrectionDate != null) && (data.UsersReport.ResurrectionDate > data.UsersReport.OnboardingDate) ? data.UsersReport.RessurectionVersion.toString() : data.UsersReport.OnboardingVersion.toString(),
				DeadlineDate:data.UsersReport.DeadlineDate == null ? "" : data.UsersReport.DeadlineDate.toString(),
				ReminderTime:data.UsersReport.ReminderTime == null ? "" : data.UsersReport.ReminderTime.toString(),
				LastActiveDate:data.UsersReport.LastActiveDate == null ? "" : data.UsersReport.LastActiveDate.toString(),
				Churned:data.UsersReport.Churned == null ? "" : data.UsersReport.Churned.toString(),
				//Resurrected:data.UsersReport.Resurrected == null ? "" : data.UsersReport.Resurrected.toString(),
				//ResurrectionDate:data.UsersReport.ResurrectionDate == null ? "" : data.UsersReport.ResurrectionDate.toString(),
				//RessurectionVersion:data.UsersReport.RessurectionVersion == null ? "" : data.UsersReport.RessurectionVersion.toString(),
				//CmpltnOnOBDRSDt:data.UsersReport.CmpltnOnOBDRSDt == null ? "" : data.UsersReport.CmpltnOnOBDRSDt.toString(),
				//CmpltnOnOBDDt:data.UsersReport.CmpltnOnOBDDt == null ? "" : data.UsersReport.CmpltnOnOBDDt.toString(),
				//AttmptOnOBDDt:data.UsersReport.AttmptOnOBDDt == null ? "" : data.UsersReport.AttmptOnOBDDt.toString(),
				//DaysAttmptStrtd:data.UsersReport.DaysAttmptStrtd == null ? "" : data.UsersReport.DaysAttmptStrtd.toString(),
				//DaysAttmptCmpltd:data.UsersReport.DaysAttmptCmpltd == null ? "" : data.UsersReport.DaysAttmptCmpltd.toString(),
				//TotalActiveDays:data.UsersReport.TotalActiveDays == null ? "" : data.UsersReport.TotalActiveDays.toString(),
				//TotalTopicsAttempted:data.UsersReport.TotalTopicsAttempted == null ? "" : data.UsersReport.TotalTopicsAttempted.toString(),
				//TotalTopicsCompleted:data.UsersReport.TotalTopicsCompleted == null ? "" : data.UsersReport.TotalTopicsCompleted.toString(),
				//DaysAttmptdPstOBDRS:data.UsersReport.DaysAttmptdPstOBDRS == null ? "" :data.UsersReport.DaysAttmptdPstOBDRS.toString(),
				//DaysAttmptStrtdPstRS:data.UsersReport.DaysAttmptStrtdPstRS == null ? "" :data.UsersReport.DaysAttmptStrtdPstRS.toString(),
				//DaysAttmptCmpltdPstRS:data.UsersReport.DaysAttmptCmpltdPstRS == null ? "" :data.UsersReport.DaysAttmptCmpltdPstRS.toString(),
				//DaysAttmptdPstRS:data.UsersReport.DaysAttmptdPstRS == null ? "" :data.UsersReport.DaysAttmptdPstRS.toString(),
				//DaysAttmptStrtdPstOBD:data.UsersReport.DaysAttmptStrtdPstOBD == null ? "" :data.UsersReport.DaysAttmptStrtdPstOBD.toString(),
				//DaysAttmptCmpltdPstOBD:data.UsersReport.DaysAttmptCmpltdPstOBD == null ? "" :data.UsersReport.DaysAttmptCmpltdPstOBD.toString(),
				//DaysAttmptdPstOBD:data.UsersReport.DaysAttmptdPstOBD == null ? "" :data.UsersReport.DaysAttmptdPstOBD.toString(),
				//EnglishProficiency:data.UsersReport.EnglishProficiency == null ? "" :data.UsersReport.EnglishProficiency.toString(),
				SourcingChannel:data.UsersReport.SourcingChannel == null ? "" :data.UsersReport.SourcingChannel.toString(),
			}
		})
		console.info((new Date()).toString()+"|"+prependToLog,'End of Execution. Total Length of Report=',report.length)
		res.status(200).json(report)
	})
	.catch((err) => {
		console.info((new Date()).toString()+"|"+prependToLog,'End of Execution with error.')
		console.error((new Date()).toString()+"|"+prependToLog,err);
		res.status(500).send(err);
	});

	/*let query = "select {} from Users "+"where Users.RegisteredTime >='"+startDate+" 00:00:00' and Users.RegisteredTime <= '"+endDate+" 23:59:59'"
	getAllRows("Mobile, Consent, RegisteredTime, NudgeTime, Excluded, EnglishProficiency",query,zcql,dataLimit)
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
			zcql.executeZCQLQuery("Select Version,StartDate from Versions order by StartDate")
			.then((versionRecords)=>{
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
					userReport['Mobile'] = users[i]["Users"]["Mobile"]
					userReport['Consent'] = users[i]["Users"]["Consent"] == true ? "Yes":"No"
					userReport['Excluded'] = users[i]["Users"]["Excluded"] == true ? "Yes":"No"
					let regTimeStamp = new Date(users[i]["Users"]["RegisteredTime"])
					regTimeStamp.setHours(regTimeStamp.getHours()+5)
					regTimeStamp.setMinutes(regTimeStamp.getMinutes()+30)
					userReport['OnboardingDate'] = regTimeStamp
					const regTimeStampVersion = versions.filter(data=>((new Date(data.Versions.StartDate)) <= regTimeStamp) && ((new Date(data.Versions.EndDate)) > regTimeStamp))
					userReport['OnboardingVersion'] = regTimeStampVersion.length == 0 ? '' : regTimeStampVersion[0]['Versions']['Version'].toString()
					userReport['Onboarded'] = users[i]["Users"]["EnglishProficiency"]!=null ? "Yes" : "No"
					var deadline = new Date(users[i]["Users"]["RegisteredTime"])
					deadline.setHours(deadline.getHours()+5)
					deadline.setMinutes(deadline.getMinutes()+30)
					deadline.setDate(deadline.getDate()+parseInt(process.env.Period))
					userReport['DeadlineDate'] = deadline
					userReport['ReminderTime'] = users[i]["Users"]["NudgeTime"] == "None" ? "No Reminder" : users[i]["Users"]["NudgeTime"]
					const userSessions = sessions.filter(data=>data.Sessions.Mobile == userReport['Mobile'])
					const sessionDates = userSessions.map(data=>(data.Sessions.CREATEDTIME).toString().slice(0,10))
					const uniqueDates = sessionDates.filter(unique)
					
					const uniqueSessions = (userSessions.map(data=>data.Sessions.SessionID)).filter(unique)
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
					
					var resurrected = ''
					var resurrectionDate = ''
					for(var j=uniqueDates.length-1; j>0; j--){
						const gap = ((new Date(uniqueDates[j-1]))-(new Date(uniqueDates[j])))/1000/60/60/24
						if(gap > 3){
							resurrected = "Yes"
							resurrectionDate = uniqueDates[j-1]
						}
					}
					
					userReport['LastActiveDate'] = uniqueDates.length == 0 ? '' : uniqueDates.sort().pop()
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
						)*//*
						if(resurrectionDate == '')
							return false
						else
							return ((
								(new Date(data.Versions.StartDate)) <= (new Date(resurrectionDate))
							) && (
								(new Date(data.Versions.EndDate)) > (new Date(resurrectionDate))
							))
					})
					userReport['RessurectionVersion'] = resurrectionVersion.length == 0 ? '' : resurrectionVersion[0]['Versions']['Version'].toString()
					const regDate = regTimeStamp.getFullYear()+"-"+('0'+(regTimeStamp.getMonth()+1)).slice(-2)+"-"+('0'+regTimeStamp.getDate()).slice(-2)
					const resurrectionDt = resurrectionDate.toString().slice(0,10) //resurrectionDate.getFullYear()+"-"+('0'+(resurrectionDate.getMonth()+1)).slice(-2)+"-"+('0'+resurrectionDate.getDate()).slice(-2)
					const cmpltnOnOBDRSDt = startedSessions.some(data=>(data.TotalSessionsCompleted >=1) && ((data.SessionDate == regDate)||(data.SessionDate == resurrectionDt)))
					//console.log(users[i]["Users"]["Mobile"],' | cmpltnOnOBDRSDt | ',cmpltnOnOBDRSDt,regDate,resurrectionDt)
					userReport['CmpltnOnOBDRSDt'] = cmpltnOnOBDRSDt == true ? 'Yes' : 'No'
					//userReport['CmpltnOnOBDRSDt'] = (startedSessions.filter(data=>(data.TotalSessionsCompleted >= 1) && ((data.SessionDate == regTimeStamp.toString().slice(0,10))||(data.SessionDate == resurrectionDate.toString().slice(0,10))))).length > 0 ? 'Yes' : 'No'
					userReport['CmpltnOnOBDDt'] = (startedSessions.filter(data=>(data.TotalSessionsCompleted >= 1) && (data.SessionDate == regDate))).length > 0 ? 'Yes' : 'No'
					userReport['AttmptOnOBDDt'] = (startedSessions.filter(data=>data.SessionDate == regDate)).length > 0 ? 'Yes' : 'No'
					userReport['DaysAttmptStrtd'] = ((startedSessions.filter(data=>(data.TotalSessionsStarted >= 1) && (data.SessionDate > regDate) && (data.SessionDate > resurrectionDt))).length).toString()
					userReport['DaysAttmptCmpltd'] = ((startedSessions.filter(data=>(data.TotalSessionsCompleted >= 1) && (data.SessionDate > regDate) && (data.SessionDate > resurrectionDt))).length).toString()
					
					userReport['TotalActiveDays'] = uniqueDates.length.toString()
					const allTopics = userSessions.map(data=>data.SystemPrompts.Name)
					const uniqueTopics = allTopics.filter(unique)
					userReport['TotalTopicsAttempted'] = uniqueTopics.length.toString()
					const allActiveSessions = userSessions.filter(data=>data.Sessions.IsActive == false)
					const allActiveTopics = allActiveSessions.map(data=>data.SystemPrompts.Name)
					const uniqueActiveTopics = allActiveTopics.filter(unique)
					userReport['TotalTopicsCompleted'] = uniqueActiveTopics.length.toString()
					report.push(userReport)
				}
				res.status(200).json(report)
			})
			.catch((err) => {
				console.error((new Date()).toString()+"|"+prependToLog,err)
				res.status(500).send(err);
			});
		})
		.catch((err) => {
			console.error((new Date()).toString()+"|"+prependToLog,err)
			res.status(500).send(err);
		});
	})
	.catch((err) => {
		console.error((new Date()).toString()+"|"+prependToLog,err)
		res.status(500).send(err);
	});	*/
});

app.get("/useronboardingreport", (req, res) => {

    let catalystApp = catalyst.initialize(req, {type: catalyst.type.applogic});

	const executionID = Math.random().toString(36).slice(2)
    
    //Prepare text to prepend with logs
    const params = ["Reports",req.url,executionID,""]
    const prependToLog = params.join(" | ")
    
    console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")


	const startDate = req.query.startDate ? req.query.startDate : (req.query.date ? req.query.date : '1970-01-01')
	var today = new Date()
	today.setHours(today.getHours()+5)
	today.setMinutes(today.getMinutes()+30)
	const endDate = req.query.endDate ? req.query.endDate : (today.getFullYear+"-"+('0'+(today.getMonth()+1)).slice(-2)+"-"+('0'+today.getDate()).slice(-2))
	const dataLimit = req.query.limit ? req.query.limit : null

	let zcql = catalystApp.zcql()
		
	let query = "Select {} from UserData"
	
	getAllRows("distinct Segment, Question",query,zcql,dataLimit)
	.then((segmentQuestions)=>{
		let questions = segmentQuestions.map(data=>data.UserData.Segment+" "+data.UserData.Question)
		questions = questions.filter(unique)
		questions = questions.filter(data=>data.toString()!="null-null")	
		query = "Select {} "+
					"from Users "+
					"left join UserData on UserData.UserROWID = Users.ROWID "+
					"where UserData.CREATEDTIME  >='"+startDate+" 00:00:00' and UserData.CREATEDTIME <= '"+endDate+" 23:59:59' "+
					"order by Users.Mobile asc, UserData.CREATEDTIME desc"
		getAllRows("Users.Name, Users.Excluded, Users.Mobile, Users.RegisteredTime, Users.NudgeTime, Users.EnglishProficiency, UserData.CREATEDTIME, UserData.Segment, UserData.Question, UserData.Answer",query,zcql)
		.then((users)=>{
			var report = []
			let mobiles = users.map(data=>data.Users.Mobile)
			mobiles = mobiles.filter(unique)
			//Get Session Data
			query = "Select {} "+
			"from Sessions "+
			"where SessionID != 'Onboarding' and Sessions.Mobile in ("+mobiles.join(",")+") group by Mobile, SessionID"
			getAllRows("Mobile, SessionID, max(CREATEDTIME)",query,zcql)
			.then((sessions)=>{
				for(var i=0; i<mobiles.length;i++){
					var userReport = {
						Mobile:mobiles[i]
					}
					const userData = users.filter(data=>mobiles[i]==data.Users.Mobile)
					try{
						userReport['Name'] = userData[0]["Users"]["Name"] == null ? "":decodeURIComponent(userData[0]["Users"]["Name"])
					}
					catch(e){
						userReport['Name'] = userData[0]["Users"]["Name"] == null ? "":userData[0]["Users"]["Name"]
					}
					userReport['Excluded'] =  userData[0]["Users"]["Excluded"] == true ? "Yes":"No"
					var regTimeStamp = new Date(userData[0]['Users']["RegisteredTime"])
					regTimeStamp.setMinutes(regTimeStamp.getMinutes()+30)
					regTimeStamp.setHours(regTimeStamp.getHours()+5)
					const onboardingDate = regTimeStamp.getFullYear() + "-" + ('0'+(regTimeStamp.getMonth()+1)).slice(-2) + "-" + ('0'+regTimeStamp.getDate()).slice(-2)
					var deadline = new Date(onboardingDate)
					deadline.setDate(deadline.getDate()+parseInt(process.env.Period))
					userReport['OnboardingDate'] = onboardingDate
					userReport['DeadlineDate'] = deadline.getFullYear() + "-" + ('0'+(deadline.getMonth()+1)).slice(-2) + "-" + ('0'+deadline.getDate()).slice(-2)
					userReport['ReminderTime'] = userData[0]["Users"]["NudgeTime"] == "None" ? "No Reminder" : userData[0]["Users"]["NudgeTime"]
					userReport['EnglishProficiency'] = userData[0]["Users"]["EnglishProficiency"] == null ? "":userData[0]["Users"]["EnglishProficiency"]
					
					let userDataCreatedTimes = userData.map(data=>data.UserData.CREATEDTIME)
					userDataCreatedTimes = userDataCreatedTimes.sort()
					var postOnbrdngAtmpt = 0
					if(userDataCreatedTimes[0]!=null){
						const postOnboardingSessionsData = sessions.filter(session=>(session.Sessions.Mobile == mobiles[i]) && (session.Sessions.CREATEDTIME >= userDataCreatedTimes[0]))
						if(postOnboardingSessionsData.length>0){
							const postOnboardingSessions = postOnboardingSessionsData.map(session=>session.Sessions.SessionID)
							const postOnboardingUniqueSessions = postOnboardingSessions.filter(unique)
							postOnbrdngAtmpt =  postOnboardingUniqueSessions.length
						}
					}
					userReport['PostOnbrdngAtmpt'] = postOnbrdngAtmpt.toString()// > 0 ? 'Yes' : "No"
					for(var j=0; j<questions.length; j++){
						const questionAnswer = userData.filter(data=>questions[j]==(data.UserData.Segment+" "+data.UserData.Question))
						if((typeof questionAnswer !== 'undefined')&&(questionAnswer!=null)&&(questionAnswer.length>0))
							userReport[questions[j].toString().replace("?","").replace(":"," to ").replace("."," ").replace(/[0-9/,*]/g," ")]=questionAnswer[0]['UserData']['Answer']
						else
							userReport[questions[j].toString().replace("?","").replace(":"," to ").replace("."," ").replace(/[0-9/,*]/g," ")]=""
					}
					report.push(userReport)
				}		
				console.info((new Date()).toString()+"|"+prependToLog,"End of Execution. Report Length = ",report.length)
				res.status(200).json(report)
			})
			.catch((err) => {
				console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error")
				console.error((new Date()).toString()+"|"+prependToLog,err)
				res.status(500).send(err);
			});
		})
		.catch((err) => {
			console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error")
			console.error((new Date()).toString()+"|"+prependToLog,err)
			res.status(500).send(err);
		});
	})
	.catch((err) => {
		console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error")
		console.error((new Date()).toString()+"|"+prependToLog,err)
		res.status(500).send(err);
	});
});


app.get("/usertopicreport", (req, res) => {

    let catalystApp = catalyst.initialize(req, {type: catalyst.type.applogic});

	const executionID = Math.random().toString(36).slice(2)
    
    //Prepare text to prepend with logs
    const params = ["Reports",req.url,executionID,""]
    const prependToLog = params.join(" | ")
    
    console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")
	
	let zcql = catalystApp.zcql()

	const startDate = req.query.startDate ? req.query.startDate : (req.query.date ? req.query.date : '1970-01-01')
	var today = new Date()
	today.setHours(today.getHours()+5)
	today.setMinutes(today.getMinutes()+30)
	const endDate = req.query.endDate ? req.query.endDate : (today.getFullYear()+"-"+('0'+(today.getMonth()+1)).slice(-2)+"-"+('0'+today.getDate()).slice(-2))
	const dataLimit = req.query.limit ? req.query.limit : null

	let query = "select {} from Users"
	getAllRows("Mobile, Excluded",query,zcql,dataLimit)
	.then((users)=>{
		if(users.length>0){
			const mobiles = users.map(user=>user.Users.Mobile)
			query = "Select {} "+
					"from Sessions "+
					"left join SystemPrompts on Sessions.SystemPromptsROWID = SystemPrompts.ROWID "+
					"where Sessions.CREATEDTIME >='"+startDate+" 00:00:00' and Sessions.CREATEDTIME <= '"+endDate+" 23:59:59'"
					"and ((SystemPrompts.Type = 'Topic Prompt') or (SystemPromptsROWID is null)) and Mobile in ("+mobiles.join(",")+") "+
					"order by Sessions.CREATEDTIME desc"
			getAllRows("Sessions.Mobile, Sessions.SessionID, Sessions.CREATEDTIME, Sessions.SystemPromptsROWID, SystemPrompts.Name, SystemPrompts.Persona, Sessions.Message, Sessions.MessageType",query,zcql)
			.then((allSessions)=>{
				const sessions = allSessions.filter(data=>!(data.Sessions.SessionID.endsWith(' - Translation')||data.Sessions.SessionID.endsWith(' - Hints')||data.Sessions.SessionID.endsWith(' - ObjectiveFeedback')))
				if(sessions.length>0){
					var report = []
					const emojiRegEx = emojiRegex()
					for(var i=0; i<users.length; i++){
						const userSessions = sessions.filter(data=>data.Sessions.Mobile == users[i]['Users']['Mobile'])	
						const userSessionsWC = userSessions.map(data=>{
							var temp = data
							var msg = (decodeURIComponent(data['Sessions']['Message'])).replace(emojiRegEx,'')
							temp['Sessions']['TotalWords'] = (data['Sessions']['MessageType'] == "UserMessage") ? (msg.split(" ")).length : 0
							return temp
						})
						const userSessionsTopics = userSessions.map(data=>data.SystemPrompts.Name)
						const uniqueTopics = userSessionsTopics.filter(unique)
						if(uniqueTopics.length==0){
							report.push({
								Mobile:users[i]["Users"]["Mobile"],
								Excluded: users[i]["Users"]["Excluded"]==true ? "Yes":"No",
								Topic:"",
								Persona:"",
								TotalAttempts:"",
								MinWordCount:"",
								MaxWordCount:"",
								LastAttemptWordCount:""
							})
						}
						else{
							for(var j=0; j<uniqueTopics.length;j++)
							{
								const topicSessionsData = userSessions.filter(data=>data.SystemPrompts.Name==uniqueTopics[j])
								var persona = topicSessionsData.map(data=>data.SystemPrompts.Persona)
								persona = persona.filter(unique)

								for(var k=0; k<persona.length;k++){
									var userReport = {}
									userReport['Mobile'] = users[i]["Users"]["Mobile"]
									userReport['Excluded'] = users[i]["Users"]["Excluded"]==true ? "Yes":"No",
									userReport['Topic'] = uniqueTopics[j]
									userReport['Persona'] = persona[k]
									const personaSessionData = topicSessionsData.filter(data=>data.SystemPrompts.Persona == userReport['Persona'])
									const topicSessions = personaSessionData.map(data=>data.Sessions.SessionID)
									const uniqueTopicSessions = topicSessions.filter(unique)
									userReport['TotalAttempts'] = uniqueTopicSessions.length.toString()

									var topicWC = uniqueTopicSessions.map(data=>{
										const sessionWCs = personaSessionData.map(record=>record.Sessions.SessionID == data ? record.Sessions.TotalWords:0)
										return sessionWCs.reduce((a,b)=>a+b,0)
									})
									console.log("topicWC",topicWC)
									userReport['MinWordCount']=Math.min(...topicWC).toString()
									userReport['MaxWordCount']=Math.max(...topicWC).toString()	

									const sessionDates = personaSessionData.map(data=>data.Sessions.CREATEDTIME)
									const uniqueDates = sessionDates.filter(unique)
									const lastActiveDate = uniqueDates.sort().pop()

									const latestSessionData = personaSessionData.filter(data=>data.Sessions.CREATEDTIME == lastActiveDate)
									const latestSessionID = latestSessionData[0]['Sessions']['SessionID']								
									console.log("Latest Session ID: ",latestSessionID)
									const latestSessionIDWCs = personaSessionData.map(data=>data.Sessions.SessionID == latestSessionID ? data.Sessions.TotalWords:0)
									console.log("latestSessionIDWCs:",latestSessionIDWCs)
									userReport['LastAttemptWordCount'] = latestSessionIDWCs.reduce((a,b)=>a+b,0).toString()											

									report.push(userReport)
								}
							}
						}
					}
					console.info((new Date()).toString()+"|"+prependToLog,"End of Execution. Report Length = ",report.length)
					res.status(200).json(report)
				}
				else{
					console.info((new Date()).toString()+"|"+prependToLog,"End of Execution. No session found")
					const report = users.map(user=>{
						return {
							Mobile:user.Users.Mobile,
							Excluded: user["Users"]["Excluded"]==true ? "Yes":"No",
							Topic:"",
							Persona:"",
							TotalAttempts:"",
							MinWordCount:"",
							MaxWordCount:"",
							LastAttemptWordCount:""
						}
					})				
					res.status(200).json(report)
				}
			})
			.catch((err) => {
				console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error")
				console.error((new Date()).toString()+"|"+prependToLog,err)
				res.status(500).send(err);
			});
		}
		else{
			console.info((new Date()).toString()+"|"+prependToLog,"No user found")
			res.status(200).json([{
				Mobile:"",
				Excluded:"",
				Topic:"",
				Persona:"",
				TotalAttempts:"",
				MinWordCount:"",
				MaxWordCount:"",
				LastAttemptWordCount:""
			}])
		}
	})
	.catch((err) => {
		console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error")
		console.error((new Date()).toString()+"|"+prependToLog,err)
		res.status(500).send(err);
	});
});

app.get("/usertopicattemptreport", (req, res) => {

    let catalystApp = catalyst.initialize(req, {type: catalyst.type.applogic});

	const executionID = Math.random().toString(36).slice(2)
    
    //Prepare text to prepend with logs
    const params = ["Reports",req.url,executionID,""]
    const prependToLog = params.join(" | ")
    
    console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")


	let zcql = catalystApp.zcql()

	const startDate = req.query.startDate ? req.query.startDate : (req.query.date ? req.query.date : '1970-01-01')
	var today = new Date()
	today.setHours(today.getHours()+5)
	today.setMinutes(today.getMinutes()+30)
	const endDate = req.query.endDate ? req.query.endDate : (today.getFullYear()+"-"+('0'+(today.getMonth()+1)).slice(-2)+"-"+('0'+today.getDate()).slice(-2))
	const dataLimit = req.query.limit ? req.query.limit : null

	let query = "select {} from UserSessionAttemptReport "+
				"where UserSessionAttemptReport.SessionStartTime >='"+startDate+" 00:00:00' and UserSessionAttemptReport.SessionStartTime <= '"+endDate+" 23:59:59' "
	getAllRows("*",query,zcql,dataLimit)
	.then((reportData)=>{
		const report = reportData.map(data=>{
			return {
				Mobile:data.UserSessionAttemptReport.Mobile == null ? "" : data.UserSessionAttemptReport.Mobile.toString(),
				Module:data.UserSessionAttemptReport.Module == null ? "" : data.UserSessionAttemptReport.Module.toString(),
				Topic:data.UserSessionAttemptReport.Topic == null ? "" : data.UserSessionAttemptReport.Topic.toString(),
				Persona:data.UserSessionAttemptReport.Persona == null ? "" : data.UserSessionAttemptReport.Persona.toString(),
				Attempt:data.UserSessionAttemptReport.Attempt == null ? "" : data.UserSessionAttemptReport.Attempt.toString(),
				//Completed:data.UserSessionAttemptReport.Completed == null ? "" : data.UserSessionAttemptReport.Completed.toString(),
				SessionID:data.UserSessionAttemptReport.SessionID == null ? "" : data.UserSessionAttemptReport.SessionID.toString(),
				SessionStartTime:data.UserSessionAttemptReport.SessionStartTime == null ? "" : data.UserSessionAttemptReport.SessionStartTime.toString(),
				AttemptVersion:data.UserSessionAttemptReport.AttemptVersion == null ? "" : data.UserSessionAttemptReport.AttemptVersion.toString(),
				SessionEndTime:data.UserSessionAttemptReport.SessionEndTime == null ? "" : data.UserSessionAttemptReport.SessionEndTime.toString(),
				//SessionDuration:data.UserSessionAttemptReport.SessionDuration == null ? "" : data.UserSessionAttemptReport.SessionDuration.toString(),
				//OptedForPerformanceReport:data.UserSessionAttemptReport.OptedForPerformanceReport == null ? "" : data.UserSessionAttemptReport.OptedForPerformanceReport.toString(),
				//PerformanceReportURL:data.UserSessionAttemptReport.PerformanceReportURL == null ? "" : data.UserSessionAttemptReport.PerformanceReportURL.toString(),
				//SessionComplete:data.UserSessionAttemptReport.SessionComplete == null ? "" : data.UserSessionAttemptReport.SessionComplete.toString(),
				//EndOfSession:data.UserSessionAttemptReport.EndOfSession == null ? "" : data.UserSessionAttemptReport.EndOfSession.toString(),
				//OptedForGPTFeedback:data.UserSessionAttemptReport.OptedForGPTFeedback == null ? "" : data.UserSessionAttemptReport.OptedForGPTFeedback.toString(),
				//GPTRating:data.UserSessionAttemptReport.GPTRating == null ? "" : data.UserSessionAttemptReport.GPTRating.toString(),
				//GPTFeedback:data.UserSessionAttemptReport.GPTFeedback == null ? "" : data.UserSessionAttemptReport.GPTFeedback.toString(),
				//GPTFeedbackURL:data.UserSessionAttemptReport.GPTFeedbackURL == null ? "" : data.UserSessionAttemptReport.GPTFeedbackURL.toString(),
				FlowRating:(data.UserSessionAttemptReport.FlowRating == null) || (data.UserSessionAttemptReport.FlowRating.length == 0) ? ((data.UserSessionAttemptReport.GPTRating == null) || (data.UserSessionAttemptReport.GPTRating.length == 0) ? "" : data.UserSessionAttemptReport.GPTRating.toString()) : data.UserSessionAttemptReport.FlowRating.toString(),
				Feedback:(data.UserSessionAttemptReport.Feedback == null) || (data.UserSessionAttemptReport.Feedback.length == 0) ? ((data.UserSessionAttemptReport.GPTFeedback == null) || (data.UserSessionAttemptReport.GPTFeedback.length == 0) ? "" : data.UserSessionAttemptReport.GPTFeedback.toString()) : data.UserSessionAttemptReport.Feedback.toString(),
				//FeedbackURL:data.UserSessionAttemptReport.FeedbackURL == null ? "" : data.UserSessionAttemptReport.FeedbackURL.toString(),
				TotalWords:data.UserSessionAttemptReport.TotalWords == null ? "" : data.UserSessionAttemptReport.TotalWords.toString(),
				CompletionTokens:data.UserSessionAttemptReport.CompletionTokens == null ? "" : data.UserSessionAttemptReport.CompletionTokens.toString(),
				PromptTokens:data.UserSessionAttemptReport.PromptTokens == null ? "" : data.UserSessionAttemptReport.PromptTokens.toString(),
				SLFCompletionTokens:data.UserSessionAttemptReport.SLFCompletionTokens == null ? "" : data.UserSessionAttemptReport.SLFCompletionTokens.toString(),
				SLFPromptTokens:data.UserSessionAttemptReport.SLFPromptTokens == null ? "" : data.UserSessionAttemptReport.SLFPromptTokens.toString(),
				//ProgressBarMsgSent:data.UserSessionAttemptReport.ProgressBarMsgSent == null ? "" : data.UserSessionAttemptReport.ProgressBarMsgSent.toString(),
				//ActiveDays:data.UserSessionAttemptReport.ActiveDays == null ? "" : data.UserSessionAttemptReport.ActiveDays.toString(),
			}
		})
		console.info((new Date()).toString()+"|"+prependToLog,'End of Execution. Total Length of Report=',report.length)
		res.status(200).json(report)
	})
	.catch((err) => {
		console.info((new Date()).toString()+"|"+prependToLog,'End of Execution with error.')
		console.err((new Date()).toString()+"|"+prependToLog,err);
		res.status(500).send(err);
	});

	/*let query = "select {} from Users"
	getAllRows("Mobile",query,zcql,dataLimit)
	.then((users)=>{
		if(users.length>0){
			const mobiles = users.map(user=>user.Users.Mobile)
			query = "Select {} "+
					"from Sessions "+
					"left join SystemPrompts on Sessions.SystemPromptsROWID = SystemPrompts.ROWID "+
					"where Sessions.CREATEDTIME >='"+startDate+" 00:00:00' and Sessions.CREATEDTIME <= '"+endDate+" 23:59:59' "+
					"and ((SystemPrompts.Type = 'Topic Prompt') or (SystemPromptsROWID is null)) and Mobile in ("+mobiles.join(",")+") "+
					"order by Sessions.CREATEDTIME desc"
			getAllRows("Sessions.PerformanceReportURL, Sessions.EndOfSession, Sessions.Mobile, Sessions.SessionID, Sessions.CREATEDTIME, Sessions.SystemPromptsROWID, SystemPrompts.Name, SystemPrompts.Persona, Sessions.Message, Sessions.MessageType",query,zcql)
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
						.then((versionRecords)=>{
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
								const userSessionsTopics = userSessions.map(data=>data.SystemPrompts.Name)
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
									report.push(userReport)
								}
								else{
									for(var j=0; j<uniqueTopics.length;j++)
									{
										const topicSessionsData = userSessions.filter(data=>data.SystemPrompts.Name==uniqueTopics[j])
										const topicSessions = topicSessionsData.map(data=>data.Sessions.SessionID)
										const uniqueTopicSessions = topicSessions.filter(unique)
										var attempt = uniqueTopicSessions.length
										
										for(var k=0; k<uniqueTopicSessions.length; k++)
										{
											var userReport = {}
											userReport['Mobile'] = users[i]["Users"]["Mobile"]
											userReport['Topic'] = uniqueTopics[j] == null ? "":uniqueTopics[j]
											userReport['Persona'] = topicSessionsData[0].SystemPrompts.Persona == null ? "":topicSessionsData[0].SystemPrompts.Persona
											userReport['SessionID'] = uniqueTopicSessions[k]
											userReport['Attempt'] = attempt.toString()
											attempt--
											const sessionRecord = userSessionsWC.filter(record=>record.Sessions.SessionID == userReport['SessionID'])
											const sessionWCs = sessionRecord.map(record=>record.Sessions.TotalWords)
											userReport['TotalWords'] = (sessionWCs.reduce((a,b)=>a+b,0)).toString()
											var sessionTimeStamps = sessionRecord.map(record=>record.Sessions.CREATEDTIME)
											sessionTimeStamps = sessionTimeStamps.sort()
											userReport['SessionStartTime'] = sessionTimeStamps[0]
											const sessionTimeStampVersion = versions.filter(data=>{
												/*console.log(new Date(data.Versions.StartDate), "|",
													new Date(sessionTimeStamps[0]), "|",
													new Date(data.Versions.EndDate), " = ",
													(((new Date(data.Versions.StartDate)) <= (new Date(sessionTimeStamps[0]))) && ((new Date(data.Versions.EndDate)) > (new Date(sessionTimeStamps[0]))))
												)*//*
												return (((new Date(data.Versions.StartDate)) <= (new Date(sessionTimeStamps[0]))) && ((new Date(data.Versions.EndDate)) > (new Date(sessionTimeStamps[0]))))
											})
											userReport['AttemptVersion'] = sessionTimeStampVersion.length == 0 ? '' : sessionTimeStampVersion[0]['Versions']['Version'].toString()
											userReport['SessionEndTime'] = sessionTimeStamps[sessionTimeStamps.length-1]
											userReport['SessionDuration'] = 0
											for(var l = 1; l<sessionTimeStamps.length; l++){
												const currentTimeStamp = new Date(sessionTimeStamps[l])
												const lastTimeStamp = new Date(sessionTimeStamps[l-1])
												var duration = (currentTimeStamp - lastTimeStamp)/1000/60
												if(duration > 10) 
													duration = 10
												userReport['SessionDuration'] += duration
											}
											userReport['SessionDuration'] = userReport['SessionDuration'].toString()
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
							res.status(200).json(report)
						})
						.catch((err) => {
							console.error((new Date()).toString()+"|"+prependToLog,err)
							res.status(500).send(err);
						});	
					})
					.catch((err) => {
						console.error((new Date()).toString()+"|"+prependToLog,err)
						res.status(500).send(err);
					});
				}
				else{
					console.log("No session found")
					const report = users.map(user=>{
						return {
							Mobile:user.Users.Mobile,
							Topic:"",
							Persona:"",
							Attempt:"",
							SessionID:"",
							SessionStartTime:"",
							AttemptVersion:"",
							SessionEndTime:"",
							SessionDuration:"",
							OptedForPerformanceReport:"",
							PerformanceReportURL:"",
							SessionComplete:"",
							EndOfSession:"",
							OptedForGPTFeedback:"",
							GPTRating:"",
							GPTFeedback:"",
							GPTFeedbackURL:"",
							FlowRating:"",
							Feedback:"",
							FeedbackURL:"",
							TotalWords:""											
						}
					})				
					res.status(200).json(report)
				}
			})
			.catch((err) => {
				console.error((new Date()).toString()+"|"+prependToLog,err)
				res.status(500).send(err);
			});
		}
		else{
			console.log("No user found")
			res.status(200).json([{
				Mobile:'',
				Topic:"",
				Persona:"",
				Attempt:"",
				SessionID:"",
				SessionStartTime:"",
				AttemptVersion:"",
				SessionEndTime:"",
				SessionDuration:"",
				OptedForPerformanceReport:"",
				PerformanceReportURL:"",
				SessionComplete:"",
				EndOfSession:"",
				OptedForGPTFeedback:"",
				GPTRating:"",
				GPTFeedback:"",
				GPTFeedbackURL:"",
				FlowRating:"",
				Feedback:"",
				FeedbackURL:"",
				TotalWords:""											
			}])
		}
	})
	.catch((err) => {
		console.error((new Date()).toString()+"|"+prependToLog,err)
		res.status(500).send(err);
	});*/
});

app.get("/userobdtopicattemptreport", (req, res) => {

    let catalystApp = catalyst.initialize(req, {type: catalyst.type.applogic});

	const executionID = Math.random().toString(36).slice(2)
    
    //Prepare text to prepend with logs
    const params = ["Reports",req.url,executionID,""]
    const prependToLog = params.join(" | ")
    
    console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")

	let zcql = catalystApp.zcql()

	const startDate = req.query.startDate ? req.query.startDate : (req.query.date ? req.query.date : '1970-01-01')
	var today = new Date()
	today.setHours(today.getHours()+5)
	today.setMinutes(today.getMinutes()+30)
	const endDate = req.query.endDate ? req.query.endDate : (today.getFullYear()+"-"+('0'+(today.getMonth()+1)).slice(-2)+"-"+('0'+today.getDate()).slice(-2))
	const dataLimit = req.query.limit ? req.query.limit : null

	let query = "select {} from Users where RegisteredTime >= '2023-06-15 19:00:00'"
	getAllRows("Name, Mobile, EnglishProficiency",query,zcql,dataLimit)
	.then((users)=>{
		if(users.length>0){
			const mobiles = users.map(user=>user.Users.Mobile)
			query = "Select {} "+
					"from Sessions "+
					"left join SystemPrompts on Sessions.SystemPromptsROWID = SystemPrompts.ROWID "+
					"where Sessions.CREATEDTIME >='"+startDate+" 00:00:00' and Sessions.CREATEDTIME <= '"+endDate+" 23:59:59' "+
					"and SystemPrompts.Name = 'Self Introduction' and Mobile in ("+mobiles.join(",")+") "+
					"order by Sessions.CREATEDTIME desc"
			console.debug((new Date()).toString()+"|"+prependToLog,query)
			getAllRows("Sessions.PerformanceReportURL, Sessions.EndOfSession, Sessions.Mobile, Sessions.SessionID, Sessions.CREATEDTIME, Sessions.SystemPromptsROWID, SystemPrompts.Name, SystemPrompts.Persona, Sessions.Message, Sessions.MessageType, Sessions.CompletionTokens, Sessions.PromptTokens, Sessions.SLFCompletionTokens, Sessions.SLFPromptTokens",query,zcql)
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
						.then((versionRecords)=>{
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
							query = "Select {} from SessionEvents where SessionID in ('"+sessionIDs.join("','")+"') and Event in ('Progress Message - 1','Progress Message - 2','Progress Message - 3','Progress Message - 4','Progress Message - 5','Progress Message - 6','Progress Message - 7','Progress Message - 8')"
							getAllRows("distinct SessionID",query,zcql)
							.then(async (events)=>{	
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
									const userSessionsTopics = userSessions.map(data=>data.SystemPrompts.Name)
									const uniqueTopics = userSessionsTopics.filter(unique)
									if(uniqueTopics.length==0){
										var userReport = {}
										//userReport['Name'] = users[i]['Users']['Name']
										userReport['Mobile'] = users[i]['Users']['Mobile']
										//userReport['EnglishProficiency'] = users[i]['Users']['EnglishProficiency']
										//userReport['Topic'] = ""
										//userReport['Persona'] = ""
										//userReport['Attempt'] = ""
										userReport['SessionID'] = ""
										userReport['SessionStartTime'] = ""
										//userReport['AttemptVersion'] = ""
										userReport['SessionEndTime'] = ""
										//userReport['SessionDuration'] = ""
										//userReport['OptedForPerformanceReport'] = ""
										//userReport['PerformanceReportURL'] = ""
										//userReport['SessionComplete'] = ""
										//userReport['EndOfSession'] = ""
										//userReport['OptedForGPTFeedback'] =	""
										//userReport['GPTRating'] = ""
										//userReport['GPTFeedback'] = ""
										//userReport['GPTFeedbackURL'] = ""
										userReport['FlowRating'] = ""
										userReport['Feedback'] = ""
										//userReport['FeedbackURL'] = ""
										userReport['TotalWords'] = ""
										userReport['CompletionTokens'] = ""
										userReport['PromptTokens'] = ""
										userReport['SLFCompletionTokens'] = ""
										userReport['SLFPromptTokens'] = ""
										//userReport['ProgressBarMsgSent'] = ""	
										report.push(userReport)
									}
									else{
										for(var j=0; j<uniqueTopics.length;j++)
										{
											const topicSessionsData = userSessions.filter(data=>data.SystemPrompts.Name==uniqueTopics[j])
											const topicSessions = topicSessionsData.map(data=>data.Sessions.SessionID)
											const uniqueTopicSessions = topicSessions.filter(unique)
											var attempt = uniqueTopicSessions.length
											
											for(var k=0; k<uniqueTopicSessions.length; k++)
											{
												var userReport = {}
												//userReport['Name'] = users[i]["Users"]["Name"]
												userReport['Mobile'] = users[i]["Users"]["Mobile"]
												//userReport['EnglishProficiency'] = users[i]["Users"]["EnglishProficiency"]
												//userReport['Topic'] = uniqueTopics[j] == null ? "":uniqueTopics[j]
												//userReport['Persona'] = topicSessionsData[0].SystemPrompts.Persona == null ? "":topicSessionsData[0].SystemPrompts.Persona
												userReport['SessionID'] = uniqueTopicSessions[k]
												//userReport['Attempt'] = attempt.toString()
												attempt--
												const sessionRecord = userSessionsWC.filter(record=>record.Sessions.SessionID == userReport['SessionID'])
												const sessionWCs = sessionRecord.map(record=>record.Sessions.TotalWords)
												userReport['TotalWords'] = (sessionWCs.reduce((a,b)=>a+b,0)).toString()
												const sessionCompletionTokens = sessionRecord.map(record=>record.Sessions.CompletionTokens==null?0:parseInt(record.Sessions.CompletionTokens))
												userReport['CompletionTokens'] = (sessionCompletionTokens.reduce((a,b)=>a+b,0))
												const sessionPromptTokens = sessionRecord.map(record=>record.Sessions.PromptTokens==null?0:parseInt(record.Sessions.PromptTokens))
												userReport['PromptTokens'] = (sessionPromptTokens.reduce((a,b)=>a+b,0))
												const sessionSLFCompletionTokens = sessionRecord.map(record=>record.Sessions.SLFCompletionTokens==null?0:parseInt(record.Sessions.SLFCompletionTokens))
												userReport['SLFCompletionTokens'] = (sessionSLFCompletionTokens.reduce((a,b)=>a+b,0))
												const sessionSLFPromptTokens = sessionRecord.map(record=>record.Sessions.SLFPromptTokens==null?0:parseInt(record.Sessions.SLFPromptTokens))
												userReport['SLFPromptTokens'] = (sessionSLFPromptTokens.reduce((a,b)=>a+b,0))
												
												var sessionTimeStamps = sessionRecord.map(record=>record.Sessions.CREATEDTIME)
												sessionTimeStamps = sessionTimeStamps.sort()
												userReport['SessionStartTime'] = sessionTimeStamps[0].toString().slice(0,19)
												const sessionTimeStampVersion = versions.filter(data=>{
													/*console.log(new Date(data.Versions.StartDate), "|",
														new Date(sessionTimeStamps[0]), "|",
														new Date(data.Versions.EndDate), " = ",
														(((new Date(data.Versions.StartDate)) <= (new Date(sessionTimeStamps[0]))) && ((new Date(data.Versions.EndDate)) > (new Date(sessionTimeStamps[0]))))
													)*/
													return (((new Date(data.Versions.StartDate)) <= (new Date(sessionTimeStamps[0]))) && ((new Date(data.Versions.EndDate)) > (new Date(sessionTimeStamps[0]))))
												})
												//userReport['AttemptVersion'] = sessionTimeStampVersion.length == 0 ? '' : sessionTimeStampVersion[0]['Versions']['Version'].toString()
												userReport['SessionEndTime'] = sessionTimeStamps[sessionTimeStamps.length-1].toString().slice(0,19)
												//userReport['SessionDuration'] = 0
												/*for(var l = 1; l<sessionTimeStamps.length; l++){
													const currentTimeStamp = new Date(sessionTimeStamps[l])
													const lastTimeStamp = new Date(sessionTimeStamps[l-1])
													var duration = (currentTimeStamp - lastTimeStamp)/1000/60
													if(duration > 10) 
														duration = 10
													userReport['SessionDuration'] += duration
												}*/
												//userReport['SessionDuration'] = userReport['SessionDuration'].toString()
												//userReport['EndOfSession'] = sessionRecord.some(record=>record.Sessions.EndOfSession == true) ? "Yes":"No"
												const perfReport = sessionRecord.filter(record=>record.Sessions.PerformanceReportURL != null)
												//userReport['OptedForPerformanceReport'] = ""//(typeof perfReport === 'undefined') ? "No" : perfReport==null ? "No" : perfReport.length==0 ? "No" : "Yes"
												//userReport['PerformanceReportURL'] = userReport['OptedForPerformanceReport']=="Yes" ? perfReport[0].Sessions.PerformanceReportURL: ""
												const feedback = feedbacks.filter(record=>record.SessionFeedback.SessionID == userReport['SessionID'])													
												if((typeof feedback!=='undefined') && (feedback != null) && (feedback.length>0)){
												//	userReport['SessionComplete'] = "Yes"
												//	userReport['OptedForGPTFeedback'] =	feedback[0]['SessionFeedback']['GPTRating'] == -99 ? "No":"Yes"
												//	userReport['GPTRating'] = feedback[0]['SessionFeedback']['GPTRating'] == -99 ? "" : feedback[0]['SessionFeedback']['GPTRating'] == -1 ? "Skipped" : feedback[0]['SessionFeedback']['GPTRating']==null ? "":feedback[0]['SessionFeedback']['GPTRating']
												//	userReport['GPTFeedback'] = feedback[0]['SessionFeedback']['GPTRating'] == -99 ? "" : feedback[0]['SessionFeedback']['GPTRating'] == -1 ? "" : feedback[0]['SessionFeedback']['GPTFeedback'] == null ?"": feedback[0]['SessionFeedback']['GPTFeedback']
												//	userReport['GPTFeedbackURL'] = feedback[0]['SessionFeedback']['GPTRating'] == -99 ? "" : feedback[0]['SessionFeedback']['GPTRating'] == -1 ? "" : feedback[0]['SessionFeedback']['GPTFeedbackURL'] == null ? "" : feedback[0]['SessionFeedback']['GPTFeedbackURL']
													userReport['FlowRating'] = feedback[0]['SessionFeedback']['Rating'] == -99 ? (feedback[0]['SessionFeedback']['GPTRating'] == -99 ? "" : feedback[0]['SessionFeedback']['GPTRating'] == -1 ? "Skipped" : feedback[0]['SessionFeedback']['GPTRating']==null ? "":feedback[0]['SessionFeedback']['GPTRating']) : feedback[0]['SessionFeedback']['Rating'] == -1 ? "Skipped" : feedback[0]['SessionFeedback']['Rating'] == null ? (feedback[0]['SessionFeedback']['GPTRating'] == -99 ? "" : feedback[0]['SessionFeedback']['GPTRating'] == -1 ? "Skipped" : feedback[0]['SessionFeedback']['GPTRating']==null ? "":feedback[0]['SessionFeedback']['GPTRating']) : feedback[0]['SessionFeedback']['Rating']
													userReport['Feedback'] = feedback[0]['SessionFeedback']['Rating'] == -99 ? (feedback[0]['SessionFeedback']['GPTRating'] == -99 ? "" : feedback[0]['SessionFeedback']['GPTRating'] == -1 ? "" : feedback[0]['SessionFeedback']['GPTFeedback'] == null ?"": feedback[0]['SessionFeedback']['GPTFeedback']) : feedback[0]['SessionFeedback']['Rating'] == -1 ? "" : feedback[0]['SessionFeedback']['Feedback'] == null ? (feedback[0]['SessionFeedback']['GPTRating'] == -99 ? "" : feedback[0]['SessionFeedback']['GPTRating'] == -1 ? "" : feedback[0]['SessionFeedback']['GPTFeedback'] == null ?"": feedback[0]['SessionFeedback']['GPTFeedback']) : feedback[0]['SessionFeedback']['Feedback']
												//	userReport['FeedbackURL'] = feedback[0]['SessionFeedback']['Rating'] == -99 ? "" : feedback[0]['SessionFeedback']['Rating'] == -1 ? "" : feedback[0]['SessionFeedback']['FeedbackURL'] == null ? "" : feedback[0]['SessionFeedback']['FeedbackURL']
												}
												else{
												//	userReport['SessionComplete'] = "No"
												//	userReport['OptedForGPTFeedback'] =	""
												//	userReport['GPTRating'] = ""
												//	userReport['GPTFeedback'] = ""
												//	userReport['GPTFeedbackURL'] = ""
													userReport['FlowRating'] = ""
													userReport['Feedback'] = ""
												//	userReport['FeedbackURL'] = ""

												}
												//userReport['ProgressBarMsgSent'] = userReport['AttemptVersion'] < 5 ? "" :events.some(data=>data.SessionEvents.SessionID == userReport['SessionID']) ? "Yes" : "No"
												report.push(userReport)
											}
										}
									}
								}	
								//var uniqueUserSessionsTopics = [...new Map(userSessionsTopics.map(item => [item.SessionID, item])).values()]
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
								console.info((new Date()).toString()+"|"+prependToLog,'End of Execution. Report Length = ',report.length)
								res.status(200).json(report)
							})
							.catch((err) => {
								console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error")
								console.error((new Date()).toString()+"|"+prependToLog,err);
								res.status(500).send(err);
							});	
						})
						.catch((err) => {
							console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error")
							console.error((new Date()).toString()+"|"+prependToLog,err);
							res.status(500).send(err);
						});	
					})
					.catch((err) => {
						console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error")
						console.error((new Date()).toString()+"|"+prependToLog,err);
						res.status(500).send(err);
					});
				}
				else{
					console.info((new Date()).toString()+"|"+prependToLog,"No session found")
					const report = users.map(user=>{
						return {
							//Name:user.Users.Name,
							Mobile:user.Users.Mobile,
							//EnglishProficiency:user.Users.EnglishProficiency,
							//Topic:"",
							//Persona:"",
							//Attempt:"",
							SessionID:"",
							SessionStartTime:"",
							//AttemptVersion:"",
							SessionEndTime:"",
							SessionDuration:"",
							//OptedForPerformanceReport:"",
							//PerformanceReportURL:"",
							//SessionComplete:"",
							//EndOfSession:"",
							//OptedForGPTFeedback:"",
							//GPTRating:"",
							//GPTFeedback:"",
							//GPTFeedbackURL:"",
							FlowRating:"",
							Feedback:"",
							//FeedbackURL:"",
							TotalWords:"",
							CompletionTokens:"",
							PromptTokens:"",
							SLFCompletionTokens:"",
							SLFPromptTokens:"",
							//ProgressBarMsgSent:""
						}
					})				
					res.status(200).json(report)
				}
			})
			.catch((err) => {
				console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error")
				console.error((new Date()).toString()+"|"+prependToLog,err);
				res.status(500).send(err);
			});
		}
		else{
			console.info((new Date()).toString()+"|"+prependToLog,"No user found")
			res.status(200).json([{
				//Name:'',
				Mobile:'',
				//EnglishProficiency:'',
				//Topic:"",
				//Persona:"",
				//Attempt:"",
				SessionID:"",
				SessionStartTime:"",
				//AttemptVersion:"",
				SessionEndTime:"",
				//SessionDuration:"",
				//OptedForPerformanceReport:"",
				//PerformanceReportURL:"",
				//SessionComplete:"",
				//EndOfSession:"",
				//OptedForGPTFeedback:"",
				//GPTRating:"",
				//GPTFeedback:"",
				//GPTFeedbackURL:"",
				FlowRating:"",
				Feedback:"",
				//FeedbackURL:"",
				TotalWords:"",
				CompletionTokens:"",
				PromptTokens:"",
				SLFCompletionTokens:"",
				SLFPromptTokens:"",
				ProgressBarMsgSent:""										
			}])
		}
	})
	.catch((err) => {
		console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error")
		console.error((new Date()).toString()+"|"+prependToLog,err);		
		res.status(500).send(err);
	});
});

app.get("/usertopicmsgs", (req, res) => {

    let catalystApp = catalyst.initialize(req, {type: catalyst.type.applogic});

	const executionID = Math.random().toString(36).slice(2)
    
    //Prepare text to prepend with logs
    const params = ["Reports",req.url,executionID,""]
    const prependToLog = params.join(" | ")
    
    console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")

	let zcql = catalystApp.zcql()

	const startDate = req.query.startDate ? req.query.startDate : '1970-01-01'
	var today = new Date()
	today.setHours(today.getHours()+5)
	today.setMinutes(today.getMinutes()+30)
	const endDate = req.query.endDate ? req.query.endDate : (today.getFullYear()+"-"+('0'+(today.getMonth()+1)).slice(-2)+"-"+('0'+today.getDate()).slice(-2))
	const dataLimit = req.query.limit ? req.query.limit : null

	let query = "Select {} "+
					"from Sessions "+
					"left join SystemPrompts on Sessions.SystemPromptsROWID = SystemPrompts.ROWID "+
					"where Sessions.CREATEDTIME >='"+startDate+" 00:00:00' and Sessions.CREATEDTIME <= '"+endDate+" 23:59:59' "+
					"and (((SystemPrompts.Type = 'Topic Prompt') or (SystemPromptsROWID is null)) or ((SystemPrompts.Type = 'Backend Prompt') and ((SystemPrompts.Name = 'Self Introduction') or (SystemPrompts.Name = 'SLF Doubts'))))"+
					"order by Sessions.SessionID, Sessions.CREATEDTIME asc"
	getAllRows("IsActive, MessageType, Classification, Improvement, UserFeedback, Sessions.Mobile, Sessions.SessionID, Sessions.CREATEDTIME, Sessions.SystemPromptsROWID, SystemPrompts.Name,SystemPrompts.Module,SystemPrompts.Persona, Sessions.Message, MessageAudioURL, Sessions.Reply, ReplyAudioURL, Sessions.PerformanceReportURL, Sessions.SentenceLevelFeedback, Sessions.CompletionTokens, Sessions.PromptTokens, Sessions.SLFCompletionTokens, Sessions.SLFPromptTokens	",query,zcql,dataLimit)
	.then((allSessions)=>{
		const sessions = allSessions.filter(data=>!(data.Sessions.SessionID.endsWith(' - Translation')||data.Sessions.SessionID.endsWith(' - Hints')||data.Sessions.SessionID.endsWith(' - ObjectiveFeedback')))
		if(sessions.length>0){
			var report = sessions.map(data=>{
				try{
					return {
						Mobile : data.Sessions.Mobile,
						Topic : decodeURIComponent(data.SystemPrompts.Name),
						Persona : decodeURIComponent(data.SystemPrompts.Persona),
						Module : data.SystemPrompts.Module,
						SessionID : data.Sessions.SessionID,
						IsActive : data.Sessions.IsActive.toString(),
						MsgTimeStamp : data.Sessions.CREATEDTIME,
						UserMessage : decodeURIComponent(data.Sessions.Message),
						UserMessageWordCount : ((decodeURIComponent(data.Sessions.Message)).split(" ")).length.toString(),
						MsgAudioURL : data.Sessions.MessageAudioURL == null ? '' : decodeURIComponent(data.Sessions.MessageAudioURL),
						ChatGPTResponse : decodeURIComponent(data.Sessions.Reply),
						ChatGPTResponseWordCount : ((decodeURIComponent(data.Sessions.Reply)).split(" ")).length.toString(),
						ChatGPTRespURL : data.Sessions.ReplyAudioURL == null ? '' : decodeURIComponent(data.Sessions.ReplyAudioURL),
						MessageType : data.Sessions.MessageType == null ? '' : decodeURIComponent(data.Sessions.MessageType),
						Classification : data.Sessions.Classification == null ? '' : data.Sessions.Classification,
						Improvement : data.Sessions.Improvement == null ? '' : data.Sessions.Improvement,
						UserFeedback : data.Sessions.UserFeedback == null ? '' : data.Sessions.UserFeedback,
						PerfReportURL : data.Sessions.PerformanceReportURL == null ? '' : decodeURIComponent(data.Sessions.PerformanceReportURL),
						SentenceLevelFeedback: data.Sessions.SentenceLevelFeedback == null ? '' : decodeURIComponent(data.Sessions.SentenceLevelFeedback),
						CompletionTokens:data.Sessions.CompletionTokens == null ? "" : data.Sessions.CompletionTokens.toString(),
						PromptTokens:data.Sessions.PromptTokens == null ? "" : data.Sessions.PromptTokens.toString(),
						SLFCompletionTokens:data.Sessions.SLFCompletionTokens == null ? "" : data.Sessions.SLFCompletionTokens.toString(),
						SLFPromptTokens:data.Sessions.SLFPromptTokens == null ? "" : data.Sessions.SLFPromptTokens.toString()
					}
				}
				catch(e){
					return {
						Mobile : data.Sessions.Mobile,
						Topic : data.SystemPrompts.Name,
						SessionID : data.Sessions.SessionID,
						IsActive : data.Sessions.IsActive.toString(),
						MsgTimeStamp : data.Sessions.CREATEDTIME,
						UserMessage : data.Sessions.Message,
						UserMessageWordCount : (data.Sessions.Message.split("%20")).length.toString(),
						MsgAudioURL : data.Sessions.MessageAudioURL == null ? '' : decodeURIComponent(data.Sessions.MessageAudioURL),
						ChatGPTResponse : decodeURIComponent(data.Sessions.Reply),
						ChatGPTResponseWordCount : (data.Sessions.Reply.spli("&20")).length.toString(),
						ChatGPTRespURL : data.Sessions.ReplyAudioURL == null ? '' : decodeURIComponent(data.Sessions.ReplyAudioURL),
						MessageType : data.Sessions.MessageType == null ? '' : decodeURIComponent(data.Sessions.MessageType),
						Classification : data.Sessions.Classification == null ? '' : data.Sessions.Classification,
						Improvement : data.Sessions.Improvement == null ? '' : data.Sessions.Improvement,
						UserFeedback : data.Sessions.UserFeedback == null ? '' : data.Sessions.UserFeedback,
						PerfReportURL : data.Sessions.PerformanceReportURL == null ? '' : decodeURIComponent(data.Sessions.PerformanceReportURL),
						SentenceLevelFeedback: data.Sessions.SentenceLevelFeedback == null ? '' : decodeURIComponent(data.Sessions.SentenceLevelFeedback),
						CompletionTokens:data.Sessions.CompletionTokens == null ? "" : data.Sessions.CompletionTokens.toString(),
						PromptTokens:data.Sessions.PromptTokens == null ? "" : data.Sessions.PromptTokens.toString(),
						SLFCompletionTokens:data.Sessions.SLFCompletionTokens == null ? "" : data.Sessions.SLFCompletionTokens.toString(),
						SLFPromptTokens:data.Sessions.SLFPromptTokens == null ? "" : data.Sessions.SLFPromptTokens.toString()
					}
				}
			})
			let seq = 1
			for(var i=0; i<report.length;i++){
				report[i]['Sequence'] = seq
				if(i<report.length-1)
					if(report[i]['SessionID'] == report[i+1]['SessionID'])
						seq=seq+1
					else
						seq=1
			}
			console.info((new Date()).toString()+"|"+prependToLog,"End of Execution. Report Length = ",report.length)
			res.status(200).json(report)
		}
		else{
			console.info((new Date()).toString()+"|"+prependToLog,"End of Execution. No Session found")
			res.status(200).json([
				{
					Sequence : "",
					Mobile : "",
					Topic : "",
					SessionID : "",
					IsActive : "",
					MsgTimeStamp : "",
					UserMessage : "",
					UserMessageWordCount : "",
					MsgAudioURL : "",
					ChatGPTResponse : "",
					ChatGPTResponseWordCount : "",
					ChatGPTRespURL : "",
					MessageType : "", 
					Classification : "", 
					Improvement : "",
					UserFeedback : "",
					PerfReportURL : "",
					SentenceLevelFeedback: "",
					CompletionTokens:"",
					PromptTokens:"",
					SLFCompletionTokens:"",
					SLFPromptTokens:""
				}
			])
		}
	})
	.catch((err) => {
		console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error")
		console.error((new Date()).toString()+"|"+prependToLog,err);
		res.status(500).send(err);
	});
});

app.get("/sessionevents", (req, res) => {

    let catalystApp = catalyst.initialize(req, {type: catalyst.type.applogic});

	const executionID = Math.random().toString(36).slice(2)
    
    //Prepare text to prepend with logs
    const params = ["Reports",req.url,executionID,""]
    const prependToLog = params.join(" | ")
    
    console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")

	let zcql = catalystApp.zcql()
	const startDate = req.query.startDate ? req.query.startDate : (req.query.date ? req.query.date : '1970-01-01')
	var today = new Date()
	today.setHours(today.getHours()+5)
	today.setMinutes(today.getMinutes()+30)
	const endDate = req.query.endDate ? req.query.endDate : (today.getFullYear()+"-"+('0'+(today.getMonth()+1)).slice(-2)+"-"+('0'+today.getDate()).slice(-2))
	const dataLimit = req.query.limit ? req.query.limit : null
	const event = req.query.event ? req.query.event.split(",") : null

	let query = "Select {} from SessionEvents left join SystemPrompts on SystemPrompts.ROWID=SessionEvents.SystemPromptROWID where SessionEvents.CREATEDTIME >='"+startDate+" 00:00:00' and SessionEvents.CREATEDTIME <= '"+endDate+" 23:59:59' order by CREATEDTIME ASC"
	getAllRows("Mobile, SessionID, Event, SystemPrompts.Name, SystemPrompts.Persona, SystemPrompts.Module, SessionEvents.CREATEDTIME", query,zcql,dataLimit)
			.then((sessions)=>{
				let mobiles = sessions.map(data=>data.SessionEvents.Mobile).filter(unique)
				query = "select {} from Users where Mobile in ("+mobiles.join(",")+")"
				getAllRows("Mobile, GoalInMinutes", query,zcql,dataLimit)
				.then((users)=>{
					var eventData = sessions.filter(data=> event == null ? true : (event.includes(data.SessionEvents.Event)) || (data.SessionEvents.Event.includes(event)))
					var report = eventData.map(data=>{
						let userReport = {
							Mobile : data.SessionEvents.Mobile,
							Topic : decodeURIComponent(data.SystemPrompts.Name),
							Persona : decodeURIComponent(data.SystemPrompts.Persona),
							Module : data.SystemPrompts.Module,
							SessionID : data.SessionEvents.SessionID,
							Event : data.SessionEvents.Event,
							EventTimestamp : data.SessionEvents.CREATEDTIME.toString().slice(0,19)
						}
						if(userReport['Event'].includes("Goal Reached")||userReport['Event'].includes("Goal Not Reached")){
							const user = users.filter(record=>record.Users.Mobile == userReport['Mobile'])
							userReport['GoalInMinutes']=user[0]['Users']['GoalInMinutes']
						}
						return userReport
					})
					console.info((new Date()).toString()+"|"+prependToLog,"End of Execution. Report Length = ",report.length)
					res.status(200).json(report)
				})
				.catch((err) => {
					console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error")
					console.error((new Date()).toString()+"|"+prependToLog,err);
					res.status(500).send(err);
				});
			})
			.catch((err) => {
				console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error")
				console.error((new Date()).toString()+"|"+prependToLog,err);
				res.status(500).send(err);
			});
});

app.get("/sessionhints", (req, res) => {

    let catalystApp = catalyst.initialize(req, {type: catalyst.type.applogic});
	const executionID = Math.random().toString(36).slice(2)
    
    //Prepare text to prepend with logs
    const params = ["Reports",req.url,executionID,""]
    const prependToLog = params.join(" | ")
    
    console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")

	let zcql = catalystApp.zcql()

    const startDate = req.query.startDate ? req.query.startDate : (req.query.date ? req.query.date : '1970-01-01')
	var today = new Date()
	today.setHours(today.getHours()+5)
	today.setMinutes(today.getMinutes()+30)
	const endDate = req.query.endDate ? req.query.endDate : (today.getFullYear()+"-"+('0'+(today.getMonth()+1)).slice(-2)+"-"+('0'+today.getDate()).slice(-2))
	const dataLimit = req.query.limit ? req.query.limit : null

	let query = "Select {} from Sessions where Sessions.CREATEDTIME >='"+startDate+" 00:00:00' and Sessions.CREATEDTIME <= '"+endDate+" 23:59:59' order by Mobile, CREATEDTIME ASC"
	zcql.executeZCQLQuery(query.replace("{}","count(ROWID)"),dataLimit)
	.then((maxRowsResult) => {
		let maxRows = parseInt(maxRowsResult[0].Sessions.ROWID)
		console.info((new Date()).toString()+"|"+prependToLog,'Total Rows: '+maxRows)
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
			getAllRows("SessionID, Message, Reply, CreatedTime, CompletionTokens, PromptTokens, SLFCompletionTokens, SLFPromptTokens")
			.then((sessions)=>{
				var report = sessions.map((data,index)=>{
					if(data.Sessions.SessionID.endsWith(" - Hint")){
						var returnObject = {}
						returnObject["SessionID"]=data.Sessions.SessionID
						returnObject["Hint"]= data.Sessions.Reply == null ? "" : decodeURIComponent(data.Sessions.Reply)
						returnObject["HintWordCount"] = returnObject["Hint"] == null ? "" : (returnObject["Hint"].split(" ")).length.toString()
						returnObject["HintPayload"]= data.Sessions.Message == null ? "" : decodeURIComponent(data.Sessions.Message)
						returnObject["HintPayloadWordCount"] = returnObject["HintPayload"] == null ? "" : (returnObject["HintPayload"].split(" ")).length.toString()
						const sessionID = data.Sessions.SessionID.replace(" - Hint","")
						const lastSessionID = (index>0) ? sessions[index-1].Sessions.SessionID.replace(" - Hint","") : null
						const nextSessionID = (index<(sessions.length-1)) ? sessions[index+1].Sessions.SessionID.replace(" - Hint","") : null
						if((index>0) && (data.Sessions.Mobile == sessions[index-1].Sessions.Mobile) && (sessionID == lastSessionID) && (!sessions[index-1].Sessions.SessionID.endsWith(" - Hint"))){
							returnObject["LastMessage"] = decodeURIComponent(sessions[index-1].Sessions.Message)
							returnObject["LastReply"] = decodeURIComponent(sessions[index-1].Sessions.Reply)
						}
						else{
							returnObject["LastMessage"] = ""
							returnObject["LastReply"] = ""
						}
						if((index<(sessions.length-1)) && (data.Sessions.Mobile == sessions[index+1].Sessions.Mobile) && (sessionID == nextSessionID))
							returnObject["NextMessage"] = decodeURIComponent(sessions[index+1].Sessions.Message)
						else
							returnObject["NextMessage"] = ""
						if((index<(sessions.length-1)) && (data.Sessions.SessionID==sessions[index+1].Sessions.SessionID)){
							returnObject["ConsecutiveUse"] = "Yes"
							returnObject["NextMessage"] = ""
						}
						else
							returnObject["ConsecutiveUse"] = ""
						returnObject["CompletionTokens"]=data.Sessions.CompletionTokens == null ? "" : data.Sessions.CompletionTokens.toString(),
						returnObject["PromptTokens"]=data.Sessions.PromptTokens == null ? "" : data.Sessions.PromptTokens.toString(),
						returnObject["SLFCompletionTokens"]=data.Sessions.SLFCompletionTokens == null ? "" : data.Sessions.SLFCompletionTokens.toString(),
						returnObject["SLFPromptTokens"]=data.Sessions.SLFPromptTokens == null ? "" : data.Sessions.SLFPromptTokens.toString()
						return returnObject
					}
					else
						return null
				})
				report = report.filter(data=>data!=null)
				if(report.length==0){
					report=[
						{
							SessionID:"",
							Hint:"",
							HintWordCount:"",
							HintPayload : "",
							HintPayloadWordCount : "",
							LastMessage:"",
							LastReply:"",
							NextMessage:"",
							ConsecutiveUse:"",
							CompletionTokens:"",
							PromptTokens:"",
							SLFCompletionTokens:"",
							SLFPromptTokens:""
						}
					]
				}
				console.info((new Date()).toString()+"|"+prependToLog,"End of Execution. Report Length = ",report.length)
				res.status(200).json(report)
			})
			.catch((err) => {
				console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error")
				console.error((new Date()).toString()+"|"+prependToLog,err);
				res.status(500).send(err);
			});
		}
		else{
			console.info((new Date()).toString()+"|"+prependToLog,"End of Execution. No Session Data found")
			res.status(200).json([
				{
					SessionID:"",
					Hint:"",
					HintWordCount:"",
					HintPayload:"",
					HintPayloadWordCount:"",
					LastMessage:"",
					LastReply:"",
					NextMessage:"",
					ConsecutiveUse:"",
					CompletionTokens:"",
					PromptTokens:"",
					SLFCompletionTokens:"",
					SLFPromptTokens:""
				}
			])
		}
	})
	.catch((err) => {
		console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error")
		console.error((new Date()).toString()+"|"+prependToLog,err);
		res.status(500).send(err);
	});
});

app.get("/sessiontranslations", (req, res) => {

    let catalystApp = catalyst.initialize(req, {type: catalyst.type.applogic});

	const executionID = Math.random().toString(36).slice(2)
    
    //Prepare text to prepend with logs
    const params = ["Reports",req.url,executionID,""]
    const prependToLog = params.join(" | ")
    
    console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")

	let zcql = catalystApp.zcql()

	const startDate = req.query.startDate ? req.query.startDate : (req.query.date ? req.query.date : '1970-01-01')
	var today = new Date()
	today.setHours(today.getHours()+5)
	today.setMinutes(today.getMinutes()+30)
	const endDate = req.query.endDate ? req.query.endDate : (today.getFullYear()+"-"+('0'+(today.getMonth()+1)).slice(-2)+"-"+('0'+today.getDate()).slice(-2))
	const dataLimit = req.query.limit ? req.query.limit : null

	let query = "Select {} from Sessions where Sessions.CREATEDTIME >='"+startDate+" 00:00:00' and Sessions.CREATEDTIME <= '"+endDate+" 23:59:59' order by Mobile,SessionID, CREATEDTIME ASC"
	zcql.executeZCQLQuery(query.replace("{}","count(ROWID)"),dataLimit)
	.then((maxRowsResult) => {
		let maxRows = parseInt(maxRowsResult[0].Sessions.ROWID)
		console.info((new Date()).toString()+"|"+prependToLog,'Total Rows: '+maxRows)
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
			getAllRows("SessionID, Message, Reply, CreatedTime")
			.then((sessions)=>{
				var report = sessions.map((data,index)=>{
					if(data.Sessions.SessionID.endsWith(" - Translation")){
						var returnObject = {}
						returnObject["SessionID"]=data.Sessions.SessionID
						const reply = data.Sessions.Reply == null ? null : decodeURIComponent(data.Sessions.Reply)
						returnObject["LangChosen"] = reply == null ? "" : (reply['sourceLanguage'] + " to " + reply['targetLanguage'])
						returnObject["UserInput"] = data.Sessions.Message != null ? decodeURIComponent(data.Sessions.Message) : ""
						returnObject["Translation"] = reply != null ? decodeURIComponent(reply):""
						const sessionID = data.Sessions.SessionID.replace(" - Translation","")
						const lastSessionID = (index>0) ? sessions[index-1].Sessions.SessionID.replace(" - Translation","") : null
						const nextSessionID = (index<(sessions.length-1)) ? sessions[index+1].Sessions.SessionID.replace(" - Translation","") : null
						if((index>0) && (data.Sessions.Mobile == sessions[index-1].Sessions.Mobile) && (sessionID == lastSessionID)){
							returnObject["LastMessage"] = decodeURIComponent(sessions[index-1].Sessions.Message)
							returnObject["LastReply"] = decodeURIComponent(sessions[index-1].Sessions.Reply)
						}
						else{
							returnObject["LastMessage"] = ""
							returnObject["LastReply"] = ""
						}
						if((index<(sessions.length-1)) && (data.Sessions.Mobile == sessions[index+1].Sessions.Mobile) && (sessionID == nextSessionID))
							returnObject["NextMessage"] = decodeURIComponent(sessions[index+1].Sessions.Message)
						else
							returnObject["NextMessage"] = ""
						if((index<(sessions.length-1)) && (data.Sessions.SessionID==sessions[index+1].Sessions.SessionID))
							returnObject["ConsecutiveUse"] = "Yes"
						else
							returnObject["ConsecutiveUse"] = ""
						return returnObject
					}
					else
						return null
				})
				report = report.filter(data=>data!=null)
				if(report.length==0){
					report=[
						{
							SessionID:"",
							LangChosen:"",
							UserInput:"",
							LastMessage:"",
							LastReply:"",
							NextMessage:"",
							ConsecutiveUse:""
						}
					]
				}
				console.info((new Date()).toString()+"|"+prependToLog,"End of Execution. Report Length = ",report.length)
				res.status(200).json(report)
			})
			.catch((err) => {
				console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error")
				console.error((new Date()).toString()+"|"+prependToLog,err);
				res.status(500).send(err);
			});
		}
		else{
			console.info((new Date()).toString()+"|"+prependToLog,"End of Execution. No Session Data found")
			res.status(200).json([
				{
					SessionID:"",
					LangChosen:"",
					UserInput:"",
					LastMessage:"",
					LastReply:"",
					NextMessage:"",
					ConsecutiveUse:""
				}
			])
		}
	})
	.catch((err) => {
		console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error")
		console.error((new Date()).toString()+"|"+prependToLog,err);
		res.status(500).send(err);
	});
});

app.get("/sessiontecherrors", (req, res) => {

    let catalystApp = catalyst.initialize(req, {type: catalyst.type.applogic});

	const executionID = Math.random().toString(36).slice(2)
    
    //Prepare text to prepend with logs
    const params = ["Reports",req.url,executionID,""]
    const prependToLog = params.join(" | ")
    
    console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")
	
	let zcql = catalystApp.zcql()

	const dataLimit = req.query.limit ? req.query.limit : null


	let query = "Select {} from Sessions left join SystemPrompts on SystemPrompts.ROWID = Sessions.SystemPromptsROWID where (SystemPrompts.Type = 'Topic Prompt') or (SystemPrompts.Type is null) order by Mobile, SessionID, Sessions.CREATEDTIME ASC"
	zcql.executeZCQLQuery(query.replace("{}","count(ROWID)"),dataLimit)
	.then((maxRowsResult) => {
		let maxRows = parseInt(maxRowsResult[0].Sessions.ROWID)
		console.info((new Date()).toString()+"|"+prependToLog,'Total Rows: '+maxRows)
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
			getAllRows("SessionID, Message, Reply, CreatedTime")
			.then((sessions)=>{
				var report = sessions.map((data,index)=>{
					if(data.Sessions.Reply == null){
						var returnObject = {}
						returnObject["SessionID"]=data.Sessions.SessionID
						returnObject["UserMessage"]= data.Sessions.Message == null ? "" : decodeURIComponent(data.Sessions.Message)
						const sessionID = data.Sessions.SessionID
						const lastSessionID = (index>0) ? sessions[index-1].Sessions.SessionID : null
						const nextSessionID = (index<(sessions.length-1)) ? sessions[index+1].Sessions.SessionID : null
						if((index>0) && (data.Sessions.Mobile == sessions[index-1].Sessions.Mobile) && (sessionID == lastSessionID)){
							returnObject["LastMessage"] = decodeURIComponent(sessions[index-1].Sessions.Message)
							returnObject["LastReply"] = decodeURIComponent(sessions[index-1].Sessions.Reply)
						}
						else{
							returnObject["LastMessage"] = ""
							returnObject["LastReply"] = ""
						}
						if((index<(sessions.length-1)) && (data.Sessions.Mobile == sessions[index+1].Sessions.Mobile) && (sessionID == nextSessionID))
							returnObject["NextMessage"] = decodeURIComponent(sessions[index+1].Sessions.Message)
						else
							returnObject["NextMessage"] = ""
						if((index<(sessions.length-1)) && (data.Sessions.SessionID==sessions[index+1].Sessions.SessionID) && (data.Sessions.Reply == sessions[index+1].Sessions.Reply))
							returnObject["ConsecutiveUse"] = "Yes"
						else
							returnObject["ConsecutiveUse"] = ""
						return returnObject
					}
					else
						return null
				})
				report = report.filter(data=>data!=null)
				if(report.length==0){
					report=[
						{
							SessionID:"",
							UserMessage:"",
							LastMessage:"",
							LastReply:"",
							NextMessage:"",
							ConsecutiveUse:""
						}
					]
				}
				console.info((new Date()).toString()+"|"+prependToLog,"End of Execution. Report Length = ", report.length)
				res.status(200).json(report)
			})
			.catch((err) => {
				console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error")
				console.error((new Date()).toString()+"|"+prependToLog,err);
				res.status(500).send(err);
			});
		}
		else{
			console.info((new Date()).toString()+"|"+prependToLog,"End of Execution. No Session Data found")
			res.status(200).json([
				{
					SessionID:"",
					UserMessage:"",
					LastMessage:"",
					LastReply:"",
					NextMessage:"",
					ConsecutiveUse:""
				}
			])
		}
	})
	.catch((err) => {
		console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error")
		console.error((new Date()).toString()+"|"+prependToLog,err);
		res.status(500).send(err);
	});
});

app.get("/sessionabandoned", (req, res) => {

    let catalystApp = catalyst.initialize(req, {type: catalyst.type.applogic});

	const executionID = Math.random().toString(36).slice(2)
    
    //Prepare text to prepend with logs
    const params = ["Reports",req.url,executionID,""]
    const prependToLog = params.join(" | ")
    
    console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")

	let zcql = catalystApp.zcql()
	const dataLimit = req.query.limit ? req.query.limit : null

	let query = "Select {} from Sessions order by Mobile, SessionID, Sessions.CREATEDTIME ASC"
	zcql.executeZCQLQuery(query.replace("{}","count(ROWID)"),dataLimit)
	.then((maxRowsResult) => {
		let maxRows = parseInt(maxRowsResult[0].Sessions.ROWID)
		console.info((new Date()).toString()+"|"+prependToLog,'Total Rows: '+maxRows)
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
			getAllRows("SessionID, Message, Reply, CreatedTime")
			.then((sessions)=>{
				var report = sessions.map((data,index)=>{
					if(index==(sessions.length-1))
						return null
					else if(data.Sessions.SessionID.endsWith(" - ObjectiveFeedback"))
						return null
					else if(data.Sessions.Reply != null){
						const currentMesageAt = new Date(data.Sessions.CREATEDTIME)
						const nextMesageAt = new Date(sessions[index+1].Sessions.CREATEDTIME)
						const duration = (nextMesageAt-currentMesageAt)/1000/60
						if(duration > 10){
							const sessionID = data.Sessions.SessionID
							const lastSessionID = (index>0) ? sessions[index-1].Sessions.SessionID : null
							const nextSessionID = (index<(sessions.length-1)) ? sessions[index+1].Sessions.SessionID : null
							if((sessionID == nextSessionID)||(sessionID.includes(nextSessionID))||((nextSessionID!=null)&&(nextSessionID.includes(sessionID)))){
								var returnObject = {}
								returnObject["SessionID"]=data.Sessions.SessionID
								returnObject["UserMessage"]= data.Sessions.Message == null ? "" : decodeURIComponent(data.Sessions.Message)
								returnObject["Reply"]= data.Sessions.Reply == null ? "" : decodeURIComponent(data.Sessions.Reply)
								if((index>0) && (data.Sessions.Mobile == sessions[index-1].Sessions.Mobile) && (sessionID == lastSessionID)){
									returnObject["LastMessage"] = decodeURIComponent(sessions[index-1].Sessions.Message)
									returnObject["LastReply"] = decodeURIComponent(sessions[index-1].Sessions.Reply)
								}
								else{
									returnObject["LastMessage"] = ""
									returnObject["LastReply"] = ""
								}
								if((index<(sessions.length-1)) && (data.Sessions.Mobile == sessions[index+1].Sessions.Mobile) && (sessionID == nextSessionID))
									returnObject["NextMessage"] = decodeURIComponent(sessions[index+1].Sessions.Message)
								else
									returnObject["NextMessage"] = ""
								return returnObject
							}
							else
								return null
						}
						else{
							return null
						}
					}
					else
						return null
				})
				report = report.filter(data=>data!=null)
				if(report.length==0){
					report=[
						{
							SessionID:"",
							UserMessage:"",
							Reply:"",
							LastMessage:"",
							LastReply:"",
							NextMessage:""
						}
					]
				}
				console.info((new Date()).toString()+"|"+prependToLog,"End of Execution. Report Length = ",report.length)
				res.status(200).json(report)
			})
			.catch((err) => {
				console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error")
				console.error((new Date()).toString()+"|"+prependToLog,err);
				res.status(500).send(err);
			});
		}
		else{
			console.info((new Date()).toString()+"|"+prependToLog,"End of Execution. No Session Data found")
			res.status(200).json([
				{
					SessionID:"",
					UserMessage:"",
					Reply:"",
					LastMessage:"",
					LastReply:"",
					NextMessage:""
				}
			])
		}
	})
	.catch((err) => {
		console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error")
		console.error((new Date()).toString()+"|"+prependToLog,err);
		res.status(500).send(err);
	});
});

app.get("/wordleattempts", (req, res) => {

    let catalystApp = catalyst.initialize(req, {type: catalyst.type.applogic});

	const executionID = Math.random().toString(36).slice(2)
    
    //Prepare text to prepend with logs
    const params = ["Reports",req.url,executionID,""]
    const prependToLog = params.join(" | ")
    
    console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")

	let zcql = catalystApp.zcql()

	const mobile = req.query.mobile ? req.query.mobile.slice(-10) : null
	const startDate = req.query.startDate ? req.query.startDate : '1970-01-01'
	var today = new Date()
	today.setHours(today.getHours()+5)
	today.setMinutes(today.getMinutes()+30)
	const endDate = req.query.endDate ? req.query.endDate : (today.getFullYear()+"-"+('0'+(today.getMonth()+1)).slice(-2)+"-"+('0'+today.getDate()).slice(-2))
	const dataLimit = req.query.limit ? req.query.limit : null

	let query = "Select {} "+
					"from WordleAttempts "+
					"left join Users on WordleAttempts.UserROWID = Users.ROWID "+
					"left join WordleConfiguration on WordleAttempts.WordleROWID = WordleConfiguration.ROWID "+
					"where WordleAttempts.CREATEDTIME >='"+startDate+" 00:00:00' and WordleAttempts.CREATEDTIME <= '"+endDate+" 23:59:59' "+
					(mobile !=null ? (" and Users.Mobile="+mobile+" "):"")+
					"order by WordleAttempts.UserROWID, WordleAttempts.CREATEDTIME asc"
	getAllRows("WordleConfiguration.ROWID, WordleConfiguration.MaxAttempts, WordleConfiguration.Word, WordleConfiguration.RecommendedTopic, Users.Mobile, WordleAttempts.ROWID, WordleAttempts.CREATEDTIME, WordleAttempts.IsCorrect, WordleAttempts.Answer, WordleAttempts.Source",query,zcql,dataLimit)
	.then((cfuAttempts)=>{
		if(cfuAttempts.length>0){
			const mobiles = cfuAttempts.map(data=>data.Users.Mobile).filter(unique)
			query = "Select {} from Sessions left join SystemPrompts on SystemPrompts.ROWID = Sessions.SystemPromptsROWID where Sessions.Mobile in ("+mobiles.join(",")+")"
			getAllRows("Sessions.Mobile, Sessions.SessionID, Sessions.CREATEDTIME, SystemPrompts.Name, SystemPrompts.Persona",query,zcql,dataLimit)
			.then((sessions)=>{
				const wordleROWIDs = cfuAttempts.map(data=>data.WordleConfiguration.ROWID).filter(unique)
				query = "Select {} from SessionEvents where SessionID in ('"+wordleROWIDs.join("','")+"') and Mobile in ("+mobiles.join(",")+")"
				getAllRows("Mobile, SessionID, CREATEDTIME, Event",query,zcql,dataLimit)
				.then((events)=>{
					var report = []
					//For each mobile which played Wordle
					for(var i = 0; i<mobiles.length; i++){
						const mobile = mobiles[i]
						//Get the list of wordles played
						const wordlesPlayed = cfuAttempts.filter(data=>data.Users.Mobile == mobile).map(data=>data.WordleConfiguration.ROWID).filter(unique)
						//For each wordle played
						for(var j=0; j<wordlesPlayed.length; j++){
							var userReport = {
								Mobile: mobile
							}	
							const wordlePlayed = wordlesPlayed[j]
							//Get the wordle attempt data
							const wordleAttemptData = cfuAttempts.filter(data=>(data.WordleConfiguration.ROWID==wordlePlayed)&&(data.Users.Mobile == userReport['Mobile']))
							//Get the wordle attempt timestamps
							const wordleAttemptTimeStamps = wordleAttemptData.map(data=>data.WordleAttempts.CREATEDTIME).filter(unique).sort()
							userReport['SessionStartedTime'] = wordleAttemptTimeStamps[0].slice(0,19)
							userReport['SessionEndTime'] = wordleAttemptTimeStamps[wordleAttemptTimeStamps.length-1].slice(0,19)
							//Get the total attempts
							userReport['NumberOfGuesses'] = wordleAttemptData.length
							//If wordle has been answered correctly or max attempts has been reached
							userReport['CompletedWordle'] = (wordleAttemptData.some(data=>data.WordleAttempts.IsCorrect == true)) || (parseInt(userReport['NumberOfGuesses'])==parseInt(wordleAttemptData[0]['WordleConfiguration']['MaxAttempts'])) ? "Yes" : "No"
							userReport['GuessedCorrect'] = wordleAttemptData.some(data=>data.WordleAttempts.IsCorrect == true) ? "Yes" : "No"
							userReport['Guessedwords'] = wordleAttemptData.map(data=>data.WordleAttempts.Answer).join(",")
							userReport['WordOfDay'] = wordleAttemptData[0]['WordleConfiguration']['Word']
							userReport['RecommendedTopic'] = wordleAttemptData[0]['WordleConfiguration']['RecommendedTopic']
							const wordleSource = wordleAttemptData.map(data=>data.WordleAttempts.Source).filter(unique).filter(data=>data!=null)
							userReport['WordleSource'] = wordleSource.length > 0 ? wordleSource.join(","):null
							
							var sessionStartedTimeStamp = new Date(userReport['SessionStartedTime'])
							const sessionStartedTime = ('0'+sessionStartedTimeStamp.getHours()).slice(-2)+":"+('0'+sessionStartedTimeStamp.getMinutes()).slice(-2)
							if(sessionStartedTime>=process.env.WordleStartTime){
								sessionStartedTimeStamp.setDate(sessionStartedTimeStamp.getDate()+1)
							}
							var endTimeStamp = new Date(sessionStartedTimeStamp.getFullYear(),sessionStartedTimeStamp.getMonth(),sessionStartedTimeStamp.getDate(),20,45)
							const sessionData = sessions.filter(session=>(session.Sessions.Mobile==userReport['Mobile'])
															&&(session.Sessions.CREATEDTIME >= userReport['SessionStartedTime'])
															&&((new Date(session.Sessions.CREATEDTIME)) < endTimeStamp))
												.map(session=>session.SystemPrompts.Name +"-"+session.SystemPrompts.Persona +"-"+ session.Sessions.SessionID)
												.filter(unique)
							userReport['NextTopicAttemptedBeforeReminder'] = sessionData.length > 0 ? sessionData.join(",") :  null

							const wordleAttemptEvents = events.filter(data=>(data.SessionEvents.Mobile == userReport['Mobile'])&&
																			(data.SessionEvents.SessionID == wordleAttemptData[0]['WordleConfiguration']['ROWID']) &&
																			((data.SessionEvents.Event == 'How to Play')||(data.SessionEvents.Event.startsWith('Start Wordle')))
																	).map(data=>data.SessionEvents.Event).filter(unique).filter(data=>data!=null)
							
							userReport['ButtonClick'] = wordleAttemptEvents.length > 0 ? wordleAttemptEvents.join(",") : null
							userReport['WordleID'] = wordleAttemptData[0]['WordleAttempts']['ROWID']

							report.push(userReport)
						}
					}
					report = report.sort((a, b)=>{
						if((a['Mobile'] == b['Mobile']) && (a.SessionStartTime < b.SessionStartTime)) {
							return -1;
						}
						if((a['Mobile'] == b['Mobile']) && (a.SessionStartTime > b.SessionStartTime)) {
							return 1;
						}
						if((a['Mobile'] == b['Mobile'])) {
							return 0;
						}
						if((a['Mobile'] < b['Mobile'])) {
							return -1;
						}
						if((a['Mobile'] > b['Mobile'])) {
							return 1;
						}
						// a must be equal to b
						return 0;
					})
					var attempted = 0
					for(var m = 0; m < report.length; m++){
						if((m>0)&&(report[m-1]['Mobile']!=report[m]['Mobile'])){
							attempted = 0
						}
						report[m]['Attempt'] = ++attempted
					}
					console.info((new Date()).toString()+"|"+prependToLog,"End of Execution. Report Length = ",report.length)
					res.status(200).json(report)
				})
				.catch((err) => {
					console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error")
					console.error((new Date()).toString()+"|"+prependToLog,err);
					res.status(500).send(err);
				});
			})
			.catch((err) => {
				console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error")
				console.error((new Date()).toString()+"|"+prependToLog,err);
				res.status(500).send(err);
			});
		}
		else{
			console.info((new Date()).toString()+"|"+prependToLog,"End of Execution. No Wordle Attempt found")
			res.status(200).json([])
		}
	})
	.catch((err) => {
		console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error")
		console.error((new Date()).toString()+"|"+prependToLog,err);
		res.status(500).send(err);
	});
});

app.get("/cfuattempts", (req, res) => {

    let catalystApp = catalyst.initialize(req, {type: catalyst.type.applogic});

	const executionID = Math.random().toString(36).slice(2)
    
    //Prepare text to prepend with logs
    const params = ["Reports",req.url,executionID,""]
    const prependToLog = params.join(" | ")
    
    console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")

	let zcql = catalystApp.zcql()

	const startDate = req.query.startDate ? req.query.startDate : '1970-01-01'
	var today = new Date()
	today.setHours(today.getHours()+5)
	today.setMinutes(today.getMinutes()+30)
	const endDate = req.query.endDate ? req.query.endDate : (today.getFullYear()+"-"+('0'+(today.getMonth()+1)).slice(-2)+"-"+('0'+today.getDate()).slice(-2))
	const dataLimit = req.query.limit ? req.query.limit : null

	let query = "select {} "+
				"from Users "+	
				"left join UserAssessmentLogs on Users.ROWID = UserAssessmentLogs.UserROWID "+
				"left join UserAssessment on UserAssessment.UserAssessmentLogROWID = UserAssessmentLogs.ROWID "+
				"left join QuestionBank on UserAssessment.QuestionROWID = QuestionBank.ROWID "+
				"left join SystemPrompts on QuestionBank.SystemPromptROWID = SystemPrompts.ROWID "+
				"where ((UserAssessment.ErrorInResponse = '') or (UserAssessment.ErrorInResponse is null)) and "+
				"UserAssessmentLogs.CREATEDTIME >='"+startDate+" 00:00:00' and "+
				"UserAssessmentLogs.CREATEDTIME <= '"+endDate+" 23:59:59' "+
				"order by Users.Mobile, UserAssessmentLogs.ROWID, UserAssessmentLogs.CREATEDTIME, QuestionBank.AskingOrder ASC "

	getAllRows("Name, Mobile,UserAssessmentLogs.SessionID, "+
			"UserAssessmentLogs.ROWID, UserAssessmentLogs.IsAssessmentComplete, "+
			"UserAssessmentLogs.AssessmentCompletionReason, UserAssessmentLogs.CREATEDTIME, "+
			"UserAssessmentLogs.MODIFIEDTIME, QuestionBank.AskingOrder, QuestionBank.Question, QuestionBank.Answers, "+
			"UserAssessment.ResponseText, UserAssessment.ResponseAVURL, UserAssessment.IsCorrectResponse, "+
			"SystemPrompts.Name, SystemPrompts.Persona "
	,query,zcql,dataLimit)
	.then((cfuAttempts)=>{
		if(!Array.isArray(cfuAttempts))
			throw new Error(cfuAttempts)
		else if(cfuAttempts.length>0){
			var report = cfuAttempts.map(record=>{
				return {
					Mobile:record.Users.Mobile,
					Name: record.Users.Name,
					Topic: decodeURI(record.SystemPrompts.Name),
					Persona: record.SystemPrompts.Persona,
					SessionID: record.UserAssessmentLogs.SessionID,
					AssessmentID: record.UserAssessmentLogs.ROWID,
					AssessmentStartTime: record.UserAssessmentLogs.CREATEDTIME.toString().slice(0,19),
					AssessmentEndTime: record.UserAssessmentLogs.MODIFIEDTIME.toString().slice(0,19),
					IsAssessmentComplete: record.UserAssessmentLogs.IsAssessmentComplete,
					AssessmentCompletionReason: record.UserAssessmentLogs.AssessmentCompletionReason,
					DisplaySequence: record.QuestionBank.AskingOrder,
					Question: decodeURI(record.QuestionBank.Question),
					Answer: record.UserAssessment.ResponseText,
					AnswerAVURL: record.UserAssessment.ResponseAVURL,
					IsCorrectResponse: record.UserAssessment.IsCorrectResponse,
					CorrectAnswer: decodeURI(record.QuestionBank.Answers),
				}
			})
			report = report.sort((a, b)=>{
				if((a['Mobile'] == b['Mobile']) && (a.AssessmentStartTime < b.AssessmentStartTime)) {
					return -1;
				}
				if((a['Mobile'] == b['Mobile']) && (a.AssessmentStartTime > b.AssessmentStartTime)) {
					return 1;
				}
				if((a['Mobile'] == b['Mobile'])) {
					return 0;
				}
				if((a['Mobile'] < b['Mobile'])) {
					return -1;
				}
				if((a['Mobile'] > b['Mobile'])) {
					return 1;
				}
				// a must be equal to b
				return 0;
			})
			var attempted = 1
			for(var m = 0; m < report.length; m++){
				if(m>0)
					if(report[m-1]['Mobile']!=report[m]['Mobile'])
						attempted = 0
					else if(report[m-1]['AssessmentID']!=report[m]['AssessmentID'])
						attempted++
				report[m]['Attempt'] = attempted
			}
			console.info((new Date()).toString()+"|"+prependToLog,"End of Execution. Report Length = ",report.length)
			res.status(200).json(report)
		}
		else{
			console.info((new Date()).toString()+"|"+prependToLog,"End of Execution. No Wordle Attempt found")
			res.status(200).json([])
		}
	})
	.catch((err) => {
		console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error")
		console.error((new Date()).toString()+"|"+prependToLog,err);
		res.status(500).send(err);
	});
});

app.get("/sessionfeedbacks", (req, res) => {

    let catalystApp = catalyst.initialize(req, {type: catalyst.type.applogic});

	const executionID = Math.random().toString(36).slice(2)
    
    //Prepare text to prepend with logs
    const params = ["Reports",req.url,executionID,""]
    const prependToLog = params.join(" | ")
    
    console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")

	let zcql = catalystApp.zcql()
	const startDate = req.query.startDate ? req.query.startDate : (req.query.date ? req.query.date : '1970-01-01')
	var today = new Date()
	today.setHours(today.getHours()+5)
	today.setMinutes(today.getMinutes()+30)
	const endDate = req.query.endDate ? req.query.endDate : (today.getFullYear()+"-"+('0'+(today.getMonth()+1)).slice(-2)+"-"+('0'+today.getDate()).slice(-2))
	const dataLimit = req.query.limit ? req.query.limit : null
	
	let query = "Select {} from SessionEvents left join SystemPrompts on SystemPrompts.ROWID=SessionEvents.SystemPromptROWID where SessionEvents.CREATEDTIME >='"+startDate+" 00:00:00' and SessionEvents.CREATEDTIME <= '"+endDate+" 23:59:59' "+
				(req.query.mobile ? "and Mobile in ("+req.query.mobile.split(",")+")":"")+
				"order by CREATEDTIME ASC"
	getAllRows("Mobile, SessionID, Event, SystemPrompts.Name, SystemPrompts.Persona, SystemPrompts.Module, SessionEvents.CREATEDTIME", query,zcql,dataLimit)
	.then((sessions)=>{
		let mobiles = sessions.map(data=>data.SessionEvents.Mobile).filter(unique)
		query = "select {} from Users where Mobile in ("+mobiles.join(",")+")"
		getAllRows("Mobile, GoalInMinutes", query,zcql,dataLimit)
		.then((users)=>{
			let eventData = []
			let event = "Learn"
			const learningEventData = sessions.filter(data=> event == null ? true : (event.includes(data.SessionEvents.Event)) || (data.SessionEvents.Event.includes(event)))
			event = "Game"
			const gamesEventData = sessions.filter(data=> event == null ? true : (event.includes(data.SessionEvents.Event)) || (data.SessionEvents.Event.includes(event)))
			event = "Conversation"
			const conversationEventData = sessions.filter(data=> event == null ? true : (event.includes(data.SessionEvents.Event)) || (data.SessionEvents.Event.includes(event)))
			
			let allSessions = learningEventData.map(data=>data.SessionEvents.SessionID).filter(unique)
			allSessions = allSessions.concat(gamesEventData.map(data=>data.SessionEvents.SessionID).filter(unique))
			allSessions = allSessions.concat(conversationEventData.map(data=>data.SessionEvents.SessionID).filter(unique))
		
			query = "Select {} from SessionFeedback where SessionID in ('"+allSessions.join("','")+"')"+
					" order by CREATEDTIME ASC"
			getAllRows("Mobile, SessionID, CREATEDTIME, Rating, Feedback, FeedbackType, FeedbackURL, GPTRating, GPTFeedback, GPTFeedbackType, GPTFeedbackURL", query,zcql,dataLimit)
			.then((feedbacks)=>{			
				var report = learningEventData.map(data=>{
					var userReport = {
						Mobile : data.SessionEvents.Mobile,
						Topic : decodeURIComponent(data.SystemPrompts.Name),
						Persona : decodeURIComponent(data.SystemPrompts.Persona),
						Module : data.SystemPrompts.Module,
						SessionID : data.SessionEvents.SessionID,
						Event : data.SessionEvents.Event,
						EventTimestamp : data.SessionEvents.CREATEDTIME.toString().slice(0,19)
					}
					//const user = users.filter(record=>record.Users.Mobile == data.SessionEvents.Mobile)
					//userReport['GoalInMinutes']=user[0]['Users']['GoalInMinutes']
					if(userReport['Event'].includes('Start')){
						const sessionFeedbacks = feedbacks.filter(record=>record.SessionFeedback.SessionID == data.SessionEvents.SessionID).map(record=>{		
							return {
								FlowRating: (record.SessionFeedback.Rating == null) || (record.SessionFeedback.Rating.length == 0) ? ((record.SessionFeedback.GPTRating == null) || (record.SessionFeedback.GPTRating.length == 0) ? "" : record.SessionFeedback.GPTRating.toString()) : record.SessionFeedback.Rating.toString(),
								Feedback: (record.SessionFeedback.Feedback == null) || (record.SessionFeedback.Feedback.length == 0) ? ((record.SessionFeedback.GPTFeedback == null) || (record.SessionFeedback.GPTFeedback.length == 0) ? "" : record.SessionFeedback.GPTFeedback.toString()) : record.SessionFeedback.Feedback.toString(),
								FeedbackTimestamp : record.SessionFeedback.CREATEDTIME.toString().slice(0,19)
							}
						})
						const learningSessionFeedback= sessionFeedbacks.filter(data=>data.Feedback.startsWith("Learnings Started"))
						if(learningSessionFeedback.length>0){
							userReport['FeedbackRating']=learningSessionFeedback[0]['FlowRating']
							userReport['Feedback']=learningSessionFeedback[0]['Feedback']
							userReport['FeedbackTimestamp']=learningSessionFeedback[0]['FeedbackTimestamp']
						}
					}
					return userReport
				})
				report = report.concat(gamesEventData.map(data=>{
					var userReport = {
						Mobile : data.SessionEvents.Mobile,
						Topic : decodeURIComponent(data.SystemPrompts.Name),
						Persona : decodeURIComponent(data.SystemPrompts.Persona),
						SessionID : data.SessionEvents.SessionID,
						Event : data.SessionEvents.Event,
						EventTimestamp : data.SessionEvents.CREATEDTIME.toString().slice(0,19)
					}
					//const user = users.filter(record=>record.Users.Mobile == data.SessionEvents.Mobile)
					//userReport['GoalInMinutes']=user[0]['Users']['GoalInMinutes']
					if(userReport['Event'].includes('End')){
						const sessionFeedbacks = feedbacks.filter(record=>record.SessionFeedback.SessionID == data.SessionEvents.SessionID).map(record=>{		
							return {
								FlowRating: (record.SessionFeedback.Rating == null) || (record.SessionFeedback.Rating.length == 0) ? ((record.SessionFeedback.GPTRating == null) || (record.SessionFeedback.GPTRating.length == 0) ? "" : record.SessionFeedback.GPTRating.toString()) : record.SessionFeedback.Rating.toString(),
								Feedback: (record.SessionFeedback.Feedback == null) || (record.SessionFeedback.Feedback.length == 0) ? ((record.SessionFeedback.GPTFeedback == null) || (record.SessionFeedback.GPTFeedback.length == 0) ? "" : record.SessionFeedback.GPTFeedback.toString()) : record.SessionFeedback.Feedback.toString(),
								FeedbackTimestamp : record.SessionFeedback.CREATEDTIME.toString().slice(0,19)
							}
						})
						const gameSessionFeedback= sessionFeedbacks.filter(data=>data.Feedback.startsWith("Overall Game Sessions"))
						if(gameSessionFeedback.length>0){
							userReport['FeedbackRating']=gameSessionFeedback[0]['FlowRating']
							userReport['Feedback']=gameSessionFeedback[0]['Feedback']
							userReport['FeedbackTimestamp']=gameSessionFeedback[0]['FeedbackTimestamp']
						}
					}
					return userReport
				}))
				report = report.concat(conversationEventData.map(data=>{
					var userReport = {
						Mobile : data.SessionEvents.Mobile,
						Topic : decodeURIComponent(data.SystemPrompts.Name),
						Persona : decodeURIComponent(data.SystemPrompts.Persona),
						SessionID : data.SessionEvents.SessionID,
						Event : data.SessionEvents.Event,
						EventTimestamp : data.SessionEvents.CREATEDTIME.toString().slice(0,19)
					}
					//const user = users.filter(record=>record.Users.Mobile == data.SessionEvents.Mobile)
					//userReport['GoalInMinutes']=user[0]['Users']['GoalInMinutes']
					if(userReport['Event'].includes('End')){
						const sessionFeedbacks = feedbacks.filter(record=>record.SessionFeedback.SessionID == data.SessionEvents.SessionID).map(record=>{		
							return {
								FlowRating: (record.SessionFeedback.Rating == null) || (record.SessionFeedback.Rating.length == 0) ? ((record.SessionFeedback.GPTRating == null) || (record.SessionFeedback.GPTRating.length == 0) ? "" : record.SessionFeedback.GPTRating.toString()) : record.SessionFeedback.Rating.toString(),
								Feedback: (record.SessionFeedback.Feedback == null) || (record.SessionFeedback.Feedback.length == 0) ? ((record.SessionFeedback.GPTFeedback == null) || (record.SessionFeedback.GPTFeedback.length == 0) ? "" : record.SessionFeedback.GPTFeedback.toString()) : record.SessionFeedback.Feedback.toString(),
								FeedbackTimestamp : record.SessionFeedback.CREATEDTIME.toString().slice(0,19)
							}
						})
						const otherSessionFeedback= sessionFeedbacks.filter(data=>(data.Feedback.startsWith("Overall Game Sessions")==false)&&(data.Feedback.startsWith("Learnings Started")==false))
						if(otherSessionFeedback.length>0){
							userReport['FeedbackRating']=otherSessionFeedback[0]['FlowRating']
							userReport['Feedback']=otherSessionFeedback[0]['Feedback']
							userReport['FeedbackTimestamp']=otherSessionFeedback[0]['FeedbackTimestamp']
						}
					}
					return userReport
				}))
				console.info((new Date()).toString()+"|"+prependToLog,"End of Execution. Report Length = ",report.length)
				res.status(200).json(report)
			})
			.catch((err) => {
				console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error")
				console.error((new Date()).toString()+"|"+prependToLog,err);
				res.status(500).send(err);
			});
		})
		.catch((err) => {
			console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error")
			console.error((new Date()).toString()+"|"+prependToLog,err);
			res.status(500).send(err);
		});
	})
	.catch((err) => {
		console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error")
		console.error((new Date()).toString()+"|"+prependToLog,err);
		res.status(500).send(err);
	});
});

app.get("/userlifecycle", (req, res) => {

	const catalystApp = catalyst.initialize();

    const executionID = Math.random().toString(36).slice(2)
    
    //Prepare text to prepend with logs
    const params = ["Reports",req.url,executionID,""]
    const prependToLog = params.join(" | ")
    
    console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")

	let zcql = catalystApp.zcql()

	const startDate = req.query.startDate ? req.query.startDate : '1970-01-01'
	var today = new Date()
	today.setHours(today.getHours()+5)
	today.setMinutes(today.getMinutes()+30)
	const endDate = req.query.endDate ? req.query.endDate : (today.getFullYear()+"-"+('0'+(today.getMonth()+1)).slice(-2)+"-"+('0'+today.getDate()).slice(-2))
	const dataLimit = req.query.limit ? req.query.limit : null

	let query = "select {} from Users "+
				"where Users.CREATEDTIME >='"+startDate+" 00:00:00' and "+
				"Users.CREATEDTIME <= '"+endDate+" 23:59:59' "+
				(req.query.mobile ? ("and Mobile in ("+req.query.mobile+")"):"")
	
	getAllRows("Mobile, RegisteredTime, OnboardingComplete",query,zcql)
	.then(async  (users)=>{
		const mobiles = users.map(user=>user.Users.Mobile)
		
		
		//Fetch all users from Glific BQ who sent a message to bot in last 4 days
		const {BigQuery} = require('@google-cloud/bigquery');
		const bigquery = new BigQuery({
			keyFilename : process.env.GCPAuthFile,
			projectId : process.env.GCPProjectID
		});

		query = "SELECT distinct contact_phone as Mobile, format_date('%Y-%m-%d',date(inserted_at)) as ActivityDate "+
				"FROM `"+process.env.GCPProjectID+".91"+process.env.GlificBotNumber+".messages` "+
				"where flow = 'inbound' and ((body = 'Chat with Ramya Bot') or (flow_name like 'Probabilistic%')) "+ //and inserted_at >=  (CURRENT_DATE('Asia/Kolkata')- 4) "+
				"and contact_phone in ('91"+mobiles.join("','91")+"') "+
				"order by 1,2"
		console.info((new Date()).toString()+"|"+prependToLog,`BQ Query: `,query)
		var bqUsers = null
		
		// Run the query as a job
		const [job] = await bigquery.createQueryJob({
			query: query,
			location: 'US',
		});
		console.info((new Date()).toString()+"|"+prependToLog,`BQ Job ${job.id} started.`);
	
		// Wait for the query to finish
		[bqUsers] = await job.getQueryResults();
		console.info((new Date()).toString()+"|"+prependToLog,`BQ Job ${job.id} finished.`);
		

		query =
            "Select {} " +
            "from Sessions " +
            "where Mobile in (" +mobiles.join(",")+")"+
            " and Sessions.MessageType = 'UserMessage' "+
            "order by Sessions.Mobile, Sessions.SessionID, Sessions.CREATEDTIME ASC";
		const runSessionQuery = getAllRows("Sessions.Mobile, Sessions.SessionID, Sessions.CREATEDTIME",query,zcql)
		const learningQuery = "Select {} " +
			"from SessionEvents " +
			"where Mobile in (" +mobiles.join(",")+")"+
			" and Event = 'Learn Session Start'"
			" order by Mobile, CREATEDTIME ASC";
		const runLearningQuery = getAllRows("Mobile, CREATEDTIME",learningQuery,zcql)
		const gameAttemptQuery = "Select {} " +
				"from WordleAttempts " +
				"left join Users on Users.ROWID = WordleAttempts.UserROWID " +
				"where Users.Mobile in (" +mobiles.join(",")+")"+
				" order by Users.Mobile, WordleAttempts.WordleROWID, WordleAttempts.CREATEDTIME ASC";
		const runGameAttemptQuery = getAllRows("Users.Mobile, WordleAttempts.WordleROWID, WordleAttempts.CREATEDTIME",gameAttemptQuery,zcql)

		Promise.all([runSessionQuery,runLearningQuery,runGameAttemptQuery])
		.then(([allsessions,learning,wordleAttempts]) => {
			if(!Array.isArray(allsessions))
				throw new Error(allsessions)
			else if(!Array.isArray(learning))
				throw new Error(learning)
			if(!Array.isArray(wordleAttempts))
				throw new Error(wordleAttempts)
			else{
				const sessions = allsessions.filter(
				(data) =>
					!(
					//data.Sessions.SessionID.endsWith("Hint") ||
					//data.Sessions.SessionID.endsWith("Translation") ||
					data.Sessions.SessionID.endsWith("ObjectiveFeedback") ||
					data.Sessions.SessionID.startsWith("Onboarding") ||
					data.Sessions.SessionID.endsWith("Onboarding") ||
					data.Sessions.SessionID.startsWith("onboarding") ||
					data.Sessions.SessionID.endsWith("onboarding")
					)
				);
				
				const report = mobiles.map(mobile=>{
					//Initialize return object
					let userReport = {
						"Mobile":mobile
					}
					//Filter BQ data for the given mobile
					const onboardingComplete = (users.filter(data=>data.Users.Mobile==mobile))[0]['Users']['OnboardingComplete']
					const regDate = (users.filter(data=>data.Users.Mobile==mobile))[0]['Users']['RegisteredTime']

					let activityDates = [] 
					if(onboardingComplete == true){
						activityDates = activityDates.concat(
							sessions.filter(data=>
								(data.Sessions.Mobile==mobile) && 
								(data.Sessions.CREATEDTIME >= regDate)
								).map(data=>data.Sessions.CREATEDTIME.toString().slice(0,10)
								).filter(unique).sort()
						)
						activityDates = activityDates.concat(
							learning.filter(data=>
								(data.SessionEvents.Mobile==mobile) && 
								(data.SessionEvents.CREATEDTIME >= regDate)
								).map(data=>data.SessionEvents.CREATEDTIME.toString().slice(0,10)
								).filter(unique).sort()
						)
						activityDates = activityDates.concat(
							wordleAttempts.filter(data=>
								(data.Users.Mobile==mobile) && 
								(data.WordleAttempts.CREATEDTIME >= regDate)
								).map(data=>data.WordleAttempts.CREATEDTIME.toString().slice(0,10)
								).filter(unique).sort()
						)
					}
					console.info((new Date()).toString()+"|"+prependToLog,"Got Conversation, Learning, Games Data:",activityDates)
						

					activityDates = activityDates.filter(unique).sort()

					//Cases:
					//1. User registers but never onboards but tries sth on different dates. 
					//2. User registers but onboards on a later date and tries sth in between

					const allActivityDates = bqUsers.filter(data=>data.Mobile==("91"+mobile)).map(data=>data.ActivityDate).sort()
					userReport['LastActiveDate'] = allActivityDates.length > 0 ? allActivityDates[allActivityDates.length-1]:null
					userReport['LastAttemptDate'] = regDate.toString().slice(0,10)
					let lastStatusSince = userReport['LastAttemptDate']
					let lastAttemptDate = userReport['LastAttemptDate']
					let currentActiveDays = onboardingComplete!=true ? null : 0
					let lifetimeActiveDays = onboardingComplete!=true ? null : 0
					userReport['History'] = []
					if(activityDates.length>0){
						userReport['History'] = [{
							"Date":activityDates[0],
							"Status":"Active"
						}]
						lastStatusSince = activityDates[0]
						currentActiveDays = 1
						lifetimeActiveDays = 1
						for(var i=1; i<activityDates.length;i++){
							let previousDate = new Date(activityDates[i-1])
							const currentDate = new Date(activityDates[i])
							const gap = Math.floor((currentDate - previousDate)/1000/60/60/24)
							if(gap>5){
								previousDate.setDate(previousDate.getDate()+5)
								const churnedDate = previousDate.getFullYear()+"-"+('0'+(previousDate.getMonth()+1)).slice(-2)+"-"+('0'+previousDate.getDate()).slice(-2)
								userReport['History'].push({
									"Date":churnedDate,
									"Status":"Churned"
								})
								lastStatusSince = currentDate.getFullYear()+"-"+('0'+(currentDate.getMonth()+1)).slice(-2)+"-"+('0'+currentDate.getDate()).slice(-2)
								currentActiveDays = 0
							}
							userReport['History'].push({
								"Date":activityDates[i],
								"Status":"Active"
							})
							currentActiveDays++
							if(currentActiveDays % 7 == 0){
								let lastIndex = userReport['History'].length-1
								userReport['History'][lastIndex]['7Activedays']=true
								userReport['History'][lastIndex]['CurrentStatusSince']=lastStatusSince
							}
							lifetimeActiveDays++
						}
						userReport['LastAttemptDate'] = userReport['History'][userReport['History'].length-1]['Date']
					}
					lastAttemptDate = new Date(userReport['LastAttemptDate'])
					let daysSinceLastActivity = Math.floor(((new Date())-lastAttemptDate)/1000/60/60/24)
					if((onboardingComplete==true)&&(daysSinceLastActivity > 5)){
						lastAttemptDate.setDate(lastAttemptDate.getDate()+5)
						const churnedDate = lastAttemptDate.getFullYear()+"-"+('0'+(lastAttemptDate.getMonth()+1)).slice(-2)+"-"+('0'+lastAttemptDate.getDate()).slice(-2)
						userReport['History'].push({
							"Date":churnedDate,
							"Status":"Churned"
						})
						lastStatusSince = churnedDate
						currentActiveDays = 0
					}
					userReport['CurrentStatus'] = (onboardingComplete != true) ? null: daysSinceLastActivity > 5 ? "Churned":"Active"
					userReport['CurrentStatusSince'] = lastStatusSince.toString().slice(0,10)
					userReport['LifetimeActiveDays'] = lifetimeActiveDays
					userReport['CurrentActiveDays'] = currentActiveDays
					return userReport
				})
				res.status(200).json(report)
				console.info((new Date()).toString()+"|"+prependToLog,"End of Execution")
			}
		})
		.catch((err) => {
			console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error")
			console.error((new Date()).toString()+"|"+prependToLog,err);
			res.status(500).send(err);
		});
	})
	.catch((err) => {
		console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error")
		console.error((new Date()).toString()+"|"+prependToLog,err);
		res.status(500).send(err);
	});
});         

app.get("/allattempts", (req, res) => {

    const executionID = Math.random().toString(36).slice(2)
    
    //Prepare text to prepend with logs
    const params = ["Reports",req.url,executionID,""]
    const prependToLog = params.join(" | ")
    
    console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")

	const axios = require("axios");
    const gameQuery = axios.get(process.env.WordleReportURL)
	const conversationQuery = axios.get(process.env.UserSessionAttemptReportURL)
	const quizQuery = axios.get(process.env.CFUAttemptReportURL)
	const obdQuery = axios.get(process.env.OnboardingReportURL)

	Promise.all([gameQuery,conversationQuery,quizQuery,obdQuery])
	.then(([gameQueryResult,conversationQueryResult,quizQueryResult,obdQueryResult])=>{
		console.info((new Date()).toString()+"|"+prependToLog,"Fetched Games Report of length:",gameQueryResult.data.length)
		console.info((new Date()).toString()+"|"+prependToLog,"Fetched Quiz Attempt Report of length:",quizQueryResult.data.length)
		console.info((new Date()).toString()+"|"+prependToLog,"Fetched Conversation Attempt Report of length:",conversationQueryResult.data.length)
		console.info((new Date()).toString()+"|"+prependToLog,"Fetched Onboarding Report of length:",obdQueryResult.data.length)

		const startDate = req.query.startDate ? req.query.startDate : (req.query.date ? req.query.date : '1970-01-01')
		var today = new Date()
		today.setHours(today.getHours()+5)
		today.setMinutes(today.getMinutes()+30)
		const endDate = req.query.endDate ? req.query.endDate : (today.getFullYear()+"-"+('0'+(today.getMonth()+1)).slice(-2)+"-"+('0'+today.getDate()).slice(-2))
	
		const quizQueryIDs = quizQueryResult.data.filter(data=>(data.AssessmentStartTime>=(startDate+" 00:00:00"))&&(data.AssessmentStartTime<=(endDate+" 23:59:59"))).map(data=>data.AssessmentID).filter(unique)
		var report = quizQueryIDs.map(id=>{
			const data = quizQueryResult.data.filter(report=>report.AssessmentID==id)
			return {
				Mobile: data[0].Mobile,
				Type: "Learn",
				SessionID: data[0].AssessmentID,
				SessionStartTime: data[0].AssessmentStartTime,
				SessionEndTime: data[0].AssessmentEndTime,
				SessionComplete: data[0].IsAssessmentComplete == true ? "Yes":"No"
			}
		})
		console.info((new Date()).toString()+"|"+prependToLog,"Appended Quiz Report Data")
		report = report.concat(gameQueryResult.data.filter(data=>(data.SessionStartedTime>=(startDate+" 00:00:00"))&&(data.SessionStartedTime<=(endDate+" 23:59:59"))).map(data=>{
			return {
				Mobile: data.Mobile,
				Type: "Game",
				SessionID: data.WordleID,
				SessionStartTime: data.SessionStartedTime,
				SessionEndTime: data.SessionEndTime,
				SessionComplete: data.CompletedWordle
			}
		}))
		console.info((new Date()).toString()+"|"+prependToLog,"Appended Game Report Data")
		report = report.concat(conversationQueryResult.data.filter(data=>(data.SessionStartTime>=(startDate+" 00:00:00"))&&(data.SessionStartTime<=(endDate+" 23:59:59"))).map(data=>{
			return {
				Mobile: data.Mobile,
				Type: "Conversation",
				SessionID: data.SessionID,
				SessionStartTime: data.SessionStartTime,
				SessionEndTime: data.SessionEndTime,
				SessionComplete: data.IsActive == false ? "Yes":"No"
			}
		}))
		console.info((new Date()).toString()+"|"+prependToLog,"Appended Conversation Report Data")
		report = report.concat(obdQueryResult.data.filter(data=>data.SessionStartTime.toString().length>0).filter(data=>(data.SessionStartTime>=(startDate+" 00:00:00"))&&(data.SessionStartTime<=(endDate+" 23:59:59"))).map(data=>{
			return {
				Mobile: data.Mobile,
				Type: "Onboarding",
				SessionID: data.SessionID,
				SessionStartTime: data.SessionStartTime,
				SessionEndTime: data.SessionEndTime,
				SessionComplete: data.IsActive == false ? "Yes":"No"
			}
		}))
		console.info((new Date()).toString()+"|"+prependToLog,"Appended Onboarding Report Data")
		
		res.status(200).json(report)
		console.info((new Date()).toString()+"|"+prependToLog,"End of Execution")
	})
	.catch((err) => {
		console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error")
		console.error((new Date()).toString()+"|"+prependToLog,err);
		res.status(500).send(err);
	});
});         

app.get("/flowquestionanswers", (req, res) => {

    const executionID = Math.random().toString(36).slice(2)
    
    //Prepare text to prepend with logs
    const params = ["Reports",req.url,executionID,""]
    const prependToLog = params.join(" | ")
    
    console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")

	const startDate = req.query.startDate ? req.query.startDate : '1970-01-01 00:00:00'
	var today = new Date()
	today.setHours(today.getHours()+5)
	today.setMinutes(today.getMinutes()+30)
	const endDate = req.query.endDate ? req.query.endDate : (today.getFullYear()+"-"+('0'+(today.getMonth()+1)).slice(-2)+"-"+('0'+today.getDate()).slice(-2))+" 23:59:59"
	
	let filter = {
		createdAt: {
			$gte:startDate,
			$lte:endDate
		}
	}
	if(req.query.category)
		filter["Category"]=req.query.category

	let flowQuestionLogsQuery = userFlowQuestionLogs.find(filter)
	let flowQuestionsQuery = flowQuestions.find()
	Promise.all([flowQuestionLogsQuery,flowQuestionsQuery])
	.then(([logs,questionBank])=>{
		if(logs==null){
			console.info((new Date()).toString()+"|"+prependToLog,"End of Execution. No record found matching given criteria")
			res.status(200).json([])
		}
		else if(questionBank==null){
			console.info((new Date()).toString()+"|"+prependToLog,"End of Execution. No question configured")
			res.status(200).json([])
		}
		else{
			let report = [] 
			
			for(var i = 0; i < logs.length; i++){
				const record=logs[i]
				var j=0;
				while(true){
					let userReport = {
						Mobile:record.Mobile,
						SessionID: record.SessionID,
						Category: record.Category,
						LogID: record.id,
						StartTime: record.createdAt.getFullYear()+"-"+
							('0'+(record.createdAt.getMonth()+1)).slice(-2)+"-"+
							('0'+record.createdAt.getDate()).slice(-2)+" "+
							('0'+record.createdAt.getHours()).slice(-2)+":"+
							('0'+record.createdAt.getMinutes()).slice(-2)+":"+
							('0'+record.createdAt.getSeconds()).slice(-2),
						EndTime: record.updatedAt.getFullYear()+"-"+
							('0'+(record.updatedAt.getMonth()+1)).slice(-2)+"-"+
							('0'+record.updatedAt.getDate()).slice(-2)+" "+
							('0'+record.updatedAt.getHours()).slice(-2)+":"+
							('0'+record.updatedAt.getMinutes()).slice(-2)+":"+
							('0'+record.updatedAt.getSeconds()).slice(-2),
						IsComplete: record.IsComplete,
						CompletionReason: record.CompletionReason
					}

					if(record.QuestionAnswers.length>0){
						const question = questionBank.filter(quest=>quest.id == record.QuestionAnswers[j]['QuestionID'])
						userReport["DisplaySequence"]= question[0].AskingOrder,
						userReport["Question"]= question[0].Question,
						userReport["Answer"]= record.QuestionAnswers[j].ResponseText
						userReport["AnswerAVURL"]= record.QuestionAnswers[j].ResponseAVURL
						userReport["IsCorrectResponse"]= record.QuestionAnswers[j].IsCorrectResponse
						userReport["CorrectAnswer"]= question[0].Answers
						report.push(userReport);;
						j++;
						if(j>=record.QuestionAnswers.length)
							break;
					}
					else{
						userReport["DisplaySequence"]= "",
						userReport["Question"]= "",
						userReport["Answer"]= ""
						userReport["AnswerAVURL"]= ""
						userReport["IsCorrectResponse"]= ""
						userReport["CorrectAnswer"]= ""
						report.push(userReport)
						break;
					}
				}
			}

			report = report.sort((a, b)=>{
				if((a['Mobile'] == b['Mobile']) && (a.StartTime < b.StartTime)) {
					return -1;
				}
				if((a['Mobile'] == b['Mobile']) && (a.StartTime > b.StartTime)) {
					return 1;
				}
				if((a['Mobile'] == b['Mobile'])) {
					return 0;
				}
				if((a['Mobile'] < b['Mobile'])) {
					return -1;
				}
				if((a['Mobile'] > b['Mobile'])) {
					return 1;
				}
				// a must be equal to b
				return 0;
			})
			console.info((new Date()).toString()+"|"+prependToLog,"End of Execution. Report Length = ",report.length)
			res.status(200).json(report)
		}
	})
	.catch((err) => {
		console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error")
		console.error((new Date()).toString()+"|"+prependToLog,err);
		res.status(500).send(err);
	});
});

app.all("/", (req,res) => {

	res.status(403).send("Resource Not Found.");

});

module.exports = app;
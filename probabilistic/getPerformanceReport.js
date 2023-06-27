"use strict"

const express = require("express");
// const catalyst = require('zcatalyst-sdk-node');
const catalyst = require("zoho-catalyst-sdk");
const emojiRegex = require('emoji-regex');

// const app = express();
// app.use(express.json());
const app = express.Router();

app.post("/getperformancereport", (req, res) => {

    let catalystApp = catalyst.initialize(req, {type: catalyst.type.applogic});

	const requestBody = req.body;
	const sessionId = (requestBody['sessionId'])
	console.log("requestBody['SessionID']"+requestBody['sessionId'])
	console.log("sessionId"+sessionId)
	var responseObject = {
		OperationStatus: 'SUCCESS'
	}
	if(typeof requestBody['SessionROWID'] === 'undefined'){
		responseObject['OperationStatus'] = 'REQ_ERR'
		responseObject['StatusDescription'] = 'Missing mandatory field - SessionROWID'
		console.log("End of Execution: ",responseObject)
		res.status("200").json(responseObject)
	}
	else{
		const timer = (sleepTime) => {
			return new Promise( async (resolve,reject) => {
				console.log('Wait for '+sleepTime)
				setTimeout(resolve, sleepTime)
			});
		}
		
		//Get table meta object without details.
		let zcql = catalystApp.zcql();
		//zcql.executeZCQLQuery("Select PerformanceReportURL from Sessions where ROWID = "+requestBody['SessionROWID'])
		let query = "Select ROWID, Message from Sessions where MessageType = 'UserMessage' and SessionID = '"+sessionId+"' order by CREATEDTIME DESC"
		console.log(query)
		zcql.executeZCQLQuery(query)
		.then((row) => {
			console.log(row)
			if(row == null){
				responseObject['OperationStatus'] = 'NO_DATA'
				responseObject['StatusDescription'] = 'No record found with ID '+ requestBody['SessionROWID']
				console.log("End of Execution: ",responseObject)
				res.status("200").json(responseObject)
			}
			else if(row.length == 0){
				responseObject['OperationStatus'] = 'NO_DATA'
				responseObject['StatusDescription'] = 'No record found with ID '+ requestBody['SessionROWID']
				console.log("End of Execution: ",responseObject)
				res.status("200").json(responseObject)
			}
			/*else if(row[0]['Sessions']['PerformanceReportURL'] == null){
			 	responseObject['OperationStatus'] = 'NO_RPRT'
			 	responseObject['StatusDescription'] = 'No performance report found for ID '+ requestBody['SessionROWID']
			 	console.log("End of Execution: ",responseObject)
			 	res.status("200").json(responseObject)
			}*/
			else{
				console.log("in condition "+row.length)
				const allMessages = row.map(message => decodeURIComponent(message.Sessions.Message)).join(' ');
				const emojiRegEx = emojiRegex()
				const allWords = (allMessages.replace(emojiRegEx,"")).split(' ');
				const totalWords = allWords.length;// - 7 if auto generated msg - I want to talk about topic name
				console.log(totalWords);
				responseObject['wordcount'] = totalWords
				responseObject['PerformanceReportType'] = "Text"

				let functions = catalystApp.functions()
				functions.execute("writeTextOnImage", {
					args:{
						sessionROWID:row[0]['Sessions']['ROWID'],
						textmap: JSON.stringify([
							{
								text: requestBody['topic'],
								x: 402,
								y: 507
							},
							{
								text: totalWords,
								x: 455,
								y: 766
							}
						]),
						filename: "probabilisticbot/" + row[0]['Sessions']['ROWID'],
						templateurl: process.env.PerfReportTemplate
					}
            	}).then(async (perfReport)=>{
					const performanceReport = JSON.parse(perfReport)
					if(performanceReport['OperationStatus']=="SUCCESS"){
						responseObject['PerformanceReportType'] = "Image"
						responseObject['PerformanceReport'] = performanceReport['PublicURL']
					}
					await timer(5000)
					console.log("End of Execution: ",responseObject)
					res.status("200").json(responseObject)
					functions.execute("sendResponseToGlific",{
						args:{
							"flowID":requestBody["FlowID"],
							"contactID": requestBody["contact"]["id"],
							"resultJSON": JSON.stringify({
								"perfreport":responseObject
							})
						}
					}).then(glificResponse=>{})
					.catch(err=>console.log("Error returned from Glific: ",err))
				})
				.catch((err) => {
					console.log(err);
					res.status(500).send(err);
				});
			}
		})
		.catch((err) => {
			console.log(err);
			res.status(500).send(err);
		});
	}
});

app.post("/getoverallperformancereport", (req, res) => {

    let catalystApp = catalyst.initialize(req, {type: catalyst.type.applogic});

	const requestBody = req.body;
	
	let mobile = (requestBody['Mobile'])
	
	var responseObject = {
		OperationStatus: 'SUCCESS'
	}
	if(typeof mobile === 'undefined'){
		responseObject['OperationStatus'] = 'REQ_ERR'
		responseObject['StatusDescription'] = 'Missing mandatory field - Mobile'
		console.log("End of Execution: ",responseObject)
		res.status("200").json(responseObject)
	}
	else{	
		mobile = mobile.toString().slice(-10)
		let zcql = catalystApp.zcql()
		let query = "Select {} "+
					"from Sessions "+
					"left join SystemPrompts on Sessions.SystemPromptsROWID = SystemPrompts.ROWID "+
					"where Mobile = "+mobile+" and SystemPrompts.Type = 'Topic Prompt' and Sessions.MessageType = 'UserMessage' "
					"order by Sessions.CREATEDTIME desc"
		zcql.executeZCQLQuery(query.replace("{}","count(ROWID)"))
		.then((maxRowsResult) => {
			let maxRows = parseInt(maxRowsResult[0].Sessions.ROWID)
			console.log('Total Session Records: '+maxRows)
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
				getAllRows("Sessions.SessionID, Sessions.CREATEDTIME, Sessions.SystemPromptsROWID, SystemPrompts.Name, Sessions.Message, Sessions.MessageType")
				.then((sessions)=>{
					var report = []
					//Filter unique elements in an array
					const unique = (value, index, self) => {
						return self.indexOf(value) === index
					}
					const emojiRegEx = emojiRegex()
					const userSessionsWC = sessions.map(data=>{
						var temp = data
						var msg = (decodeURIComponent(data['Sessions']['Message'])).replace(emojiRegEx,'')
						temp['Sessions']['TotalWords'] = (data['Sessions']['MessageType'] == "UserMessage") ? (msg.split(" ")).length : 0
						return temp
					})
					const userSessionsTopics = sessions.map(data=>data.SystemPrompts.Name)
					const uniqueTopics = userSessionsTopics.filter(unique)
					var totalSessions = 0
					for(var j=0; j<uniqueTopics.length;j++){
						var userReport = {}
						userReport['Topic'] = uniqueTopics[j]
						const topicSessionsData = sessions.filter(data=>data.SystemPrompts.Name==userReport['Topic'])
						const topicSessions = topicSessionsData.map(data=>data.Sessions.SessionID)
						const uniqueTopicSessions = topicSessions.filter(unique)
						userReport['TotalAttempts'] = uniqueTopicSessions.length.toString()
						totalSessions = totalSessions + parseInt(userReport['TotalAttempts'])
						var topicWC = uniqueTopicSessions.map(data=>{
							const sessionWCs = topicSessionsData.map(record=>record.Sessions.SessionID == data ? record.Sessions.TotalWords:0)
							return sessionWCs.reduce((a,b)=>a+b,0)
						})
						console.log("topicWC",topicWC)
						userReport['MinWordCount']=Math.min(...topicWC).toString()
						userReport['MaxWordCount']=Math.max(...topicWC).toString()
						userReport['TotalWordCount']=topicWC.reduce((a,b)=>a+b,0)
						userReport['AvgWordCount']=(userReport['TotalWordCount'])/topicWC.length
						const sessionDates = topicSessionsData.map(data=>data.Sessions.CREATEDTIME)
						const uniqueDates = sessionDates.filter(unique)
						const lastActiveDate = uniqueDates.sort().pop()
						const latestSessionData = topicSessionsData.filter(data=>data.Sessions.CREATEDTIME == lastActiveDate)
						const latestSessionID = latestSessionData[0]['Sessions']['SessionID']								
						console.log("Latest Session ID: ",latestSessionID)
						const latestSessionIDWCs = topicSessionsData.map(data=>data.Sessions.SessionID == latestSessionID ? data.Sessions.TotalWords:0)
						console.log("latestSessionIDWCs:",latestSessionIDWCs)
						userReport['LastAttemptWordCount'] = latestSessionIDWCs.reduce((a,b)=>a+b,0).toString()
						report.push(userReport)
					}
					responseObject['TopicWiseReport']=report.sort((a, b)=>{
						if(a.AvgWordCount < b.AvgWordCount) {
							return 1;
						}
						if(a.AvgWordCount > b.AvgWordCount) {
							return -1;
						}
						return 0;
					})
					responseObject['TotalSessions'] = totalSessions
					responseObject['TotalTopics'] = uniqueTopics.length
					res.status(200).json(responseObject)
				})
				.catch((err) => {
					console.log(err);
					res.status(500).send(err);
				});
			}
			else{
				responseObject['OperationStatus'] = 'NO_DATA'
				responseObject['StatusDescription'] = 'No Session Record found'
				console.log("End of Execution: ",responseObject)
				res.status("200").json(responseObject)
			}
		})
		.catch((err) => {
			console.log(err);
			res.status(500).send(err);
		});
	}
});


app.all("/", (req,res) => {

	res.status(200).send("I am Live and Ready.");

});

module.exports = app;
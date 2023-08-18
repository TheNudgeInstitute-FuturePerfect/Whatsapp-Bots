"use strict"

const express = require("express");
// const catalyst = require('zcatalyst-sdk-node');
const catalyst = require("zoho-catalyst-sdk");
const Version = require("./models/versions");
const SessionFeedback = require("./models/SessionFeedback.js")
const Session = require("./models/Sessions.js")
const SystemPrompt = require("./models/SystemPrompts.js");
const User = require("./models/Users.js");

// const app = express();
// app.use(express.json());
const app = express.Router();

const getAllRows = (fields,query,zcql) => {
	return new Promise(async (resolve) => {			
		var jsonReport = []
		const dataQuery = query.replace("{}",fields)
		var i = 1
		while(true){
			query = dataQuery+" LIMIT "+i+", 300"
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

app.get("/versions", async (req, res) => {
    await Version.find({})
    .then((rows) => {
		const report = rows //rows.map(data=>data.Users)
		console.log("End of Execution. Total Versions Data = ",rows.length)
		res.status(200).json(report);
	})
    .catch((err) =>{
		console.log(err);
		res.status(500).send(err);
	});
});


app.get("/users", (req, res) => {

    let catalystApp = catalyst.initialize(req, {type: catalyst.type.applogic});

	const requestBody = req.body;

	//Get table meta object without details.
	// let zcql = catalystApp.zcql();

	// let query = "select {} from Users"

	// getAllRows("*",query,zcql)
	User.find({})
	.then((rows)=>{
		const report = rows //rows.map(data=>data.Users)
		console.log("End of Execution. Total User Data = ",rows.length)
		res.status(200).json(report);
	})
	.catch((err) => {
		console.log(err);
		res.status(500).send(err);
	});
});

app.get("/sessions", (req, res) => {

    let catalystApp = catalyst.initialize(req, {type: catalyst.type.applogic});

	const requestBody = req.body;

	//Get table meta object without details.
	// let zcql = catalystApp.zcql();

	// let query = "Select {} "+
	// 			"from Sessions "+
	// 			"left join SystemPrompts on Sessions.SystemPromptsROWID = SystemPrompts.ROWID"

	// getAllRows("Sessions.PerformanceReportURL, Sessions.Mobile, Sessions.SessionID, Sessions.CREATEDTIME, Sessions.SystemPromptsROWID, SystemPrompts.Name, SystemPrompts.Persona, Sessions.Message, Sessions.MessageType",query,zcql)
	Session.aggregate([
		{
		  $lookup: {
			from: SystemPrompt, // Name of the collection to join with
			localField: 'SystemPromptsROWID',
			foreignField: 'ROWID',
			as: 'systemPromptData'
		  }
		},
		{
		  $project: {
			PerformanceReportURL: 1,
			Mobile: 1,
			SessionID: 1,
			CREATEDTIME: 1,
			SystemPromptsROWID: 1,
			'systemPromptData.Name': 1,
			'systemPromptData.Persona': 1,
			Message: 1,
			MessageType: 1
		  }
		}
	  ])
	.then((rows)=>{
		const report = rows /*rows.map(data=>{
			return{
				PerformanceReportURL:data.Sessions.PerformanceReportURL,
				Mobile:data.Sessions.Mobile, 
				SessionID:data.Sessions.SessionID, 
				CREATEDTIME:data.Sessions.CREATEDTIME, 
				SystemPromptsROWID:data.Sessions.SystemPromptsROWID, 
				Name:data.SystemPrompts.Name, 
				Persona:data.SystemPrompts.Persona, 
				Message:data.Sessions.Message, 
				MessageType:data.Sessions.MessageType
			}
		})	*/
		console.log("End of Execution. Total Session Data = ",rows.length)
		res.status(200).json(report);
	})
	.catch((err) => {
		console.log(err);
		res.status(500).send(err);
	});
});

app.get("/sessionfeedbacks", (req, res) => {

    let catalystApp = catalyst.initialize(req, {type: catalyst.type.applogic});

	const requestBody = req.body;

	//Get table meta object without details.
	// let zcql = catalystApp.zcql();

	// let query = "Select {} "+
	// 			"from SessionFeedbacks "+
	// 			"left join SystemPrompts on Sessions.SystemPromptsROWID = SystemPrompts.ROWID"

	// getAllRows("Sessions.PerformanceReportURL, Sessions.Mobile, Sessions.SessionID, Sessions.CREATEDTIME, Sessions.SystemPromptsROWID, SystemPrompts.Name, SystemPrompts.Persona, Sessions.Message, Sessions.MessageType",query,zcql)
	  

		SessionFeedback.aggregate([
			{
			$lookup: {
				from: Session, // Name of the collection to join with
				localField: 'Sessions.SystemPromptsROWID', // Adjust this based on your schema
				foreignField: 'SystemPromptsROWID',
				as: 'sessionData'
			}
			},
			{
			$unwind: {
				path: '$sessionData',
				preserveNullAndEmptyArrays: true
			}
			},
			{
			$lookup: {
				from: SystemPrompt, // Name of the collection to join with
				localField: 'sessionData.SystemPromptsROWID',
				foreignField: 'ROWID',
				as: 'systemPromptData'
			}
			},
			{
			$project: {
				PerformanceReportURL: '$sessionData.PerformanceReportURL',
				Mobile: '$sessionData.Mobile',
				SessionID: '$sessionData.SessionID',
				CREATEDTIME: '$sessionData.CREATEDTIME',
				SystemPromptsROWID: '$sessionData.SystemPromptsROWID',
				'systemPromptData.Name': 1,
				'systemPromptData.Persona': 1,
				'sessionData.Message': 1,
				'sessionData.MessageType': 1
			}
			}
		])
	  .then((rows)=>{
		const report = rows.map(data=>{
			return{
				PerformanceReportURL:data.Sessions.PerformanceReportURL,
				Mobile:data.Sessions.Mobile, 
				SessionID:data.Sessions.SessionID, 
				CREATEDTIME:data.Sessions.CREATEDTIME, 
				SystemPromptsROWID:data.Sessions.SystemPromptsROWID, 
				Name:data.SystemPrompts.Name, 
				Persona:data.SystemPrompts.Persona, 
				Message:data.Sessions.Message, 
				MessageType:data.Sessions.MessageType
			}
		})	
		console.log("End of Execution. Total Session Data = ",rows.length)
		res.status(200).json(report);
	})
	.catch((err) => {
		console.log(err);
		res.status(500).send(err);
	});
});


app.all("/", (req,res) => {

	res.status(403).send("I am Live and Ready.");

});

module.exports = app;
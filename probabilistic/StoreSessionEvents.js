"use strict"

const express = require("express");
// const catalyst = require('zcatalyst-sdk-node');
const catalyst = require("zoho-catalyst-sdk");
const SessionEvents = require("./models/SessionEvents.js");
const SystemPrompts = require("./models/SystemPrompts.js");

// const app = express();
// app.use(express.json());
const app = express.Router();

app.post("/sessionevents", async (req, res) => {

    let catalystApp = catalyst.initialize(req, {type: catalyst.type.applogic});

	const requestBody = req.body;

	var topicID = requestBody['TopicID']

	if(typeof topicID === 'undefined'){
		// const systemPrompt = await catalystApp.zcql().executeZCQLQuery("Select ROWID from SystemPrompts where Name = 'Dummy' and IsActive = true")
		const systemPrompt = await SystemPrompts.findOne({ Name: 'Dummy', IsActive: true }).select('ROWID');
		topicID = systemPrompt[0]['SystemPrompts']['ROWID']
	}
	else  if(topicID == null){
		// const systemPrompt = await catalystApp.zcql().executeZCQLQuery("Select ROWID from SystemPrompts where Name = 'Dummy' and IsActive = true")
		const systemPrompt = await SystemPrompts.findOne({ Name: 'Dummy', IsActive: true }).select('ROWID');
		topicID = systemPrompt[0]['SystemPrompts']['ROWID']
	}
	else if(topicID.startsWith("@result") == true){
		// const systemPrompt = await catalystApp.zcql().executeZCQLQuery("Select ROWID from SystemPrompts where Name = 'Dummy' and IsActive = true")
		const systemPrompt = await SystemPrompts.findOne({ Name: 'Dummy', IsActive: true }).select('ROWID');
		topicID = systemPrompt[0]['SystemPrompts']['ROWID']
	}

	//Get table meta object without details.
	// let table = catalystApp.datastore().table('SessionEvents');

	//Use Table Meta Object to insert the row which returns a promise
	// let insertPromise = table.insertRow({
	// 	SessionID: requestBody.SessionID,
	// 	SystemPromptROWID: topicID,
	// 	Event: requestBody.Event,
	// 	Mobile: requestBody.Mobile.toString().slice(-10)
	// });

	SessionEvents.create({
			SessionID: requestBody.SessionID,
			SystemPromptROWID: topicID,
			Event: requestBody.Event,
			Mobile: requestBody.Mobile.toString().slice(-10)
		})
		.then((row) => {
			console.log("\nInserted Row : " + JSON.stringify(row));
			res.status(200).json({OperationStatus:"SUCCESS",SessionEventROWID:row['ROWID']});
		})
		.catch((err) => {
			console.log(err);
			res.status(500).send(err);
		});
});

app.all("/", (req,res) => {

	res.status(403).send("Forbidden");

});

module.exports = app;
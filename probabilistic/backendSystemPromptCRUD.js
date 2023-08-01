"use strict"

const express = require("express");
// const catalyst = require('zcatalyst-sdk-node');
const catalyst = require("zoho-catalyst-sdk");

// const app = express();
// app.use(express.json());
const app = express.Router();

app.post("/backendprompt", (req, res) => {

    let catalystApp = catalyst.initialize(req, {type: catalyst.type.applogic});

	const executionID = Math.random().toString(36).slice(2)

	//Prepare text to prepend with logs
	const params = ["backendSystemPromptCRUD",req.url,req.method,executionID,""]
	const prependToLog = params.join(" | ")
		
	console.info((new Date()).toString()+"|"+prependToLog,"Execution Started")

	const requestBody = req.body;

	//Get table meta object without details.
	let setSystemPrompt = require("./common/setSystemPrompt.js");

	//Use Table Meta Object to insert the row which returns a promise
	let argument = requestBody
	if(typeof argument['type'] === 'undefined'){
		argument['type'] = "Backend Prompt"
		argument["isactive"]=true
		argument["sequence"]=1
	}
	
	setSystemPrompt(argument)
		.then((result) => {
			const responseJSON = JSON.parse(result)
			console.info((new Date()).toString()+"|"+prependToLog,"End of Execution : " + responseJSON);
			res.status(200).json(responseJSON);
		})
		.catch((err) => {
			console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with error")
			console.error((new Date()).toString()+"|"+prependToLog,err);
			res.status(500).send(err);
		});
});

app.get("/prompt", (req, res) => {

    let catalystApp = catalyst.initialize(req, {type: catalyst.type.applogic});

	const executionID = Math.random().toString(36).slice(2)

	//Prepare text to prepend with logs
	const params = ["backendSystemPromptCRUD",req.url,req.method,executionID,""]
	const prependToLog = params.join(" | ")
		
	console.info((new Date()).toString()+"|"+prependToLog,"Execution Started")


	const requestBody = req.query;

	//Get table meta object without details.
	let getSystemPrompt = require("./common/getAssessmentContribution.js");

	//Use Table Meta Object to insert the row which returns a promise
	let argument = requestBody
	
	getSystemPrompt(argument)
		.then((result) => {
			const responseJSON = JSON.parse(result)
			console.info((new Date()).toString()+"|"+prependToLog,"End of Execution : " + responseJSON);
			res.status(200).json(responseJSON);
		})
		.catch((err) => {
			console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with error");
			console.error((new Date()).toString()+"|"+prependToLog,err);
			res.status(500).send(err);
		});
});

app.put("/prompt", (req, res) => {

    let catalystApp = catalyst.initialize(req, {type: catalyst.type.applogic});

	const executionID = Math.random().toString(36).slice(2)

	//Prepare text to prepend with logs
	const params = ["backendSystemPromptCRUD",req.url,req.method,executionID,""]
	const prependToLog = params.join(" | ")
		
	console.info((new Date()).toString()+"|"+prependToLog,"Execution Started")

	const requestBody = req.body;

	//Get table meta object without details.
	let updateSystemPrompt = require("./common/updateAssessmentContribution.js");

	//Use Table Meta Object to insert the row which returns a promise
	let argument = requestBody
	
	updateSystemPrompt(argument)
		.then((result) => {
			const responseJSON = JSON.parse(result)
			console.info((new Date()).toString()+"|"+prependToLog,"End of Execution : " + responseJSON);
			res.status(200).json(responseJSON);
		})
		.catch((err) => {
			console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with error");
			console.error((new Date()).toString()+"|"+prependToLog,err);
			res.status(500).send(err);
		});
});

app.post("/configuration", (req, res) => {

    let catalystApp = catalyst.initialize(req, {type: catalyst.type.applogic});

	const executionID = Math.random().toString(36).slice(2)

	//Prepare text to prepend with logs
	const params = ["backendSystemPromptCRUD",req.url,req.method,executionID,""]
	const prependToLog = params.join(" | ")
		
	console.info((new Date()).toString()+"|"+prependToLog,"Execution Started")


	const requestBody = req.body;

	//Get table meta object without details.
	let fn = require("./common/setConfigurationParam.js");

	//Use Table Meta Object to insert the row which returns a promise
	let argument = requestBody
		
	fn(argument)
		.then((result) => {
			const responseJSON = JSON.parse(result)
			console.info((new Date()).toString()+"|"+prependToLog,"End of Execution : " + responseJSON);
			res.status(200).json(responseJSON);
		})
		.catch((err) => {
			console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with error");
			console.error((new Date()).toString()+"|"+prependToLog,err);
			res.status(500).send(err);
		});
});

app.get("/configuration", (req, res) => {

    let catalystApp = catalyst.initialize(req, {type: catalyst.type.applogic});

	const executionID = Math.random().toString(36).slice(2)

	//Prepare text to prepend with logs
	const params = ["backendSystemPromptCRUD",req.url,req.method,executionID,""]
	const prependToLog = params.join(" | ")
		
	console.info((new Date()).toString()+"|"+prependToLog,"Execution Started")


	const requestBody = req.query;

	//Get table meta object without details.
	let fn = require("./common/getConfigurationParam.js");

	//Use Table Meta Object to insert the row which returns a promise
	let argument = requestBody
		
	fn(argument)
		.then((result) => {
			const responseJSON = JSON.parse(result)
			console.info((new Date()).toString()+"|"+prependToLog,"End of Execution : " + responseJSON);
			res.status(200).json(responseJSON);
		})
		.catch((err) => {
			console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with error");
			console.error((new Date()).toString()+"|"+prependToLog,err);
			res.status(500).send(err);
		});
});

app.get("/configuration/list", (req, res) => {

    let catalystApp = catalyst.initialize(req, {type: catalyst.type.applogic});

	const executionID = Math.random().toString(36).slice(2)

	//Prepare text to prepend with logs
	const params = ["backendSystemPromptCRUD",req.url,req.method,executionID,""]
	const prependToLog = params.join(" | ")
		
	console.info((new Date()).toString()+"|"+prependToLog,"Execution Started")


	const requestBody = req.query;

	//Get table meta object without details.
	let fn = require("./common/getConfigurationParamList.js");

	//Use Table Meta Object to insert the row which returns a promise
	let argument = requestBody
		
	fn(argument)
		.then((result) => {
			const responseJSON = JSON.parse(result)
			console.info((new Date()).toString()+"|"+prependToLog,"End of Execution : " + responseJSON);
			res.status(200).json(responseJSON);
		})
		.catch((err) => {
			console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with error");
			console.error((new Date()).toString()+"|"+prependToLog,err);
			res.status(500).send(err);
		});
});

app.put("/configuration", (req, res) => {

    let catalystApp = catalyst.initialize(req, {type: catalyst.type.applogic});

	const executionID = Math.random().toString(36).slice(2)

	//Prepare text to prepend with logs
	const params = ["backendSystemPromptCRUD",req.url,req.method,executionID,""]
	const prependToLog = params.join(" | ")
		
	console.info((new Date()).toString()+"|"+prependToLog,"Execution Started")


	const requestBody = req.body;

	//Get table meta object without details.
	let fn = require("./common/updateConfigurationParam.js");

	//Use Table Meta Object to insert the row which returns a promise
	let argument = requestBody
		
	fn(argument)
		.then((result) => {
			const responseJSON = JSON.parse(result)
			console.info((new Date()).toString()+"|"+prependToLog,"End of Execution : " + responseJSON);
			res.status(200).json(responseJSON);
		})
		.catch((err) => {
			console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with error");
			console.error((new Date()).toString()+"|"+prependToLog,err);
			res.status(500).send(err);
		});
});

app.all("/", (req,res) => {

	res.status(403).send("Invalid.");

});

module.exports = app;
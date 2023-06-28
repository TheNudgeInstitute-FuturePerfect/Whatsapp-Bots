"use strict"

const express = require("express");
// const catalyst = require('zcatalyst-sdk-node');
const catalyst = require("zoho-catalyst-sdk");

// const app = express();
// app.use(express.json());
const app = express.Router();

app.post("/backendprompt", (req, res) => {

    let catalystApp = catalyst.initialize(req, {type: catalyst.type.applogic});

	const requestBody = req.body;

	//Get table meta object without details.
	let setSystemPrompt = require("./common/setSystemPrompt.js");

	//Use Table Meta Object to insert the row which returns a promise
	let argument = requestBody
	if(typeof argument['type'] === 'undefined')
		argument['type'] = "Backend Prompt"
	argument["isactive"]=true
	argument["sequence"]=1
	
	setSystemPrompt(argument)
		.then((result) => {
			const responseJSON = JSON.parse(result)
			console.log("\nEnd of Execution : " + responseJSON);
			res.status(200).json(responseJSON);
		})
		.catch((err) => {
			console.log(err);
			res.status(500).send(err);
		});
});

app.all("/", (req,res) => {

	res.status(403).send("Invalid.");

});

module.exports = app;
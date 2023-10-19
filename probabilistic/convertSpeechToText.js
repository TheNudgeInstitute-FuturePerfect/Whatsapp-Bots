"use strict"

const express = require("express");
// const catalyst = require('zcatalyst-sdk-node');
//const catalyst = require("zoho-catalyst-sdk");

// const app = express();
// app.use(express.json());
const app = express.Router();

app.post("/", (req, res) => {

    //let catalystApp = catalyst.initialize(req, {type: catalyst.type.applogic});

	const executionID = Math.random().toString(36).slice(2)

	//Prepare text to prepend with logs
	const params = ["convertSpeechToText",req.url,req.method,executionID,""]
	const prependToLog = params.join(" | ")
		
	console.info((new Date()).toString()+"|"+prependToLog,"Execution Started")

	const requestBody = req.body;

	//Get table meta object without details.
	let convertSpeechToText = require("./common/convertSpeechToText.js");

	//Use Table Meta Object to insert the row which returns a promise
	let argument = requestBody
	
	convertSpeechToText(argument)
		.then((result) => {
			console.info((new Date()).toString()+"|"+prependToLog,"result ........",result);
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

app.all("/", (req,res) => {

	res.status(403).send("Invalid.");

});

module.exports = app;
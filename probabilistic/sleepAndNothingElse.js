"use strict"

const express = require("express");
// const catalyst = require('zcatalyst-sdk-node');
const catalyst = require("zoho-catalyst-sdk");

// const app = express();
// app.use(express.json());
const app = express.Router();

app.post("/cache", (req, res) => {

    const catalystApp = catalyst.initialize(req);

	const requestQuery = req.query;

	//Get Segment instance with segment ID (If no ID is given, Default segment is used)
	let segment = catalystApp.cache().segment();
	//Insert Cache using put by passing the key-value pair.
	let cachePromise = segment.put(requestQuery.name, requestQuery.value, requestQuery.expiry);

	cachePromise
		.then((cache) => {
			console.log("\nInserted Cache : " + JSON.stringify(cache));
			res.status(200).json(cache);
		})
		.catch((err) => {
			console.log(err);
			res.status(500).send(err);
		});

});

app.get("/sleep", (req, res) => {
	const catalystApp = catalyst.initialize(req);

	const requestBody = req.body
	console.log(requestBody)
	var sleepTime = requestBody["Seconds"];
	if(typeof sleepTime === 'undefined')
		sleepTime = req.query.seconds*1000;

	console.log(JSON.stringify(sleepTime))
	const timer = (sleepTime) => {
		return new Promise( async (resolve,reject) => {
			setTimeout(resolve, sleepTime)
		});
	}
	timer(sleepTime)
		.then(()=>{
			console.log("Received sleep request for "+sleepTime.toString()+" seconds and returned afterwards");
			const reply = {'status':'OK'}
			res.status(200).json(reply);
			let sendResponseToGlific = require("./common/sendResponseToGlific.js");
			sendResponseToGlific({
					"flowID":requestBody["FlowId"],
                	"contactID": requestBody["ContactID"],
                	"resultJSON": JSON.stringify({
                    	"result":{}
                	})
				}).then(glificResponse=>{})
			.catch(err=>console.log("Error returned from Glific: ",err))
		})
});

app.post("/sleep", (req, res) => {
	const catalystApp = catalyst.initialize(req);
	const requestBody = req.body
	console.log(requestBody)
	var sleepTime = requestBody["Seconds"]*1000;
	
	console.log(JSON.stringify(sleepTime))
	const timer = (sleepTime) => {
		return new Promise( async (resolve,reject) => {
			setTimeout(resolve, sleepTime)
		});
	}
	timer(sleepTime)
		.then(()=>{
			console.log("Received sleep request for "+sleepTime.toString()+" seconds and returned afterwards");
			const reply = {'status':'OK'}
			res.status(200).json(reply);
			let sendResponseToGlific = require("./common/sendResponseToGlific.js");
			sendResponseToGlific({
					"flowID":requestBody["FlowID"],
                	"contactID": requestBody["ContactID"],
                	"resultJSON": JSON.stringify({
                    	"result":reply
                	})
				}).then(glificResponse=>{})
			.catch(err=>console.log("Error returned from Glific: ",err))
		})
});

app.all("/", (req,res) => {

	res.status(200).send("I am Live and Ready.");

});

module.exports = app;
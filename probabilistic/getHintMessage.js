"use strict"

const express = require("express");
// const catalyst = require('zcatalyst-sdk-node');
const catalyst = require("zoho-catalyst-sdk");

// const app = express();
// app.use(express.json());
const app = express.Router();

app.post("/gethintmessage", (req, res) => {

    let catalystApp = catalyst.initialize(req, {type: catalyst.type.applogic});

	const requestBody = req.body;
	
	var result = {
		OperationStatus:"SUCCESS"
	}

	let sessionID = requestBody["SessionID"];
	if(typeof sessionID === 'undefined'){
		result['OperationStatus'] = "REQ_ERR"
		result['StatusDescription'] = "Missing required parameter - SessionID"
		console.log("End of Execution: ",result)
		res.status(200).json(result)
	}
	else{
		let zcql = catalystApp.zcql()
		zcql.executeZCQLQuery("Select count(ROWID) from Sessions where Reply is not null and SessionID = '"+sessionID+" - Hint'")
		.then((hintcount)=>{
			if((typeof hintcount !== 'undefined')&&(hintcount!=null)&&(parseInt(hintcount[0]['Sessions']['ROWID'])>=parseInt(process.env.MaxHints))){
				result['OperationStatus'] = "MAX_HINTS_RCHD"
				result['StatusDescription'] = "Maximum Number of Hints Reached"
				console.log("End of Execution: ",result)
				res.status(200).json(result)
			}
			else{
				zcql.executeZCQLQuery("Select Message, Reply from Sessions where MessageType = 'UserMessage' and SessionID = '"+sessionID+"' order by Sessions.CREATEDTIME DESC limit 1")
				.then((sessiondata)=>{
					if(typeof sessiondata === 'undefined'){
						result['OperationStatus'] = "NO_DATA"
						result['StatusDescription'] = "No session data for the given session id"
						console.log("End of Execution: ",result)
						res.status(200).json(result)
					}
					else if(sessiondata == null){
						result['OperationStatus'] = "NO_DATA"
						result['StatusDescription'] = "No session data for the given session id"
						console.log("End of Execution: ",result)
						res.status(200).json(result)
					}
					else if(sessiondata.length == 0){
						result['OperationStatus'] = "NO_DATA"
						result['StatusDescription'] = "No session data for the given session id"
						console.log("End of Execution: ",result)
						res.status(200).json(result)
					}
					else{
						//result['Message'] = ""
						/*for(var i=sessiondata.length-1; i>=0; i--){
							result['Message'] = result['Message']+"\n"+
								"User:"+decodeURIComponent(sessiondata[i]['Sessions']['Message'])+
								(i>0 ? ("\n"+"Ramya:"+decodeURIComponent(sessiondata[i]['Sessions']['Reply'])) : "")
						}*/
						result['Message'] = "User:"+decodeURIComponent(sessiondata[0]['Sessions']['Message'])+
											"\n"+"Ramya:"+decodeURIComponent(sessiondata[0]['Sessions']['Reply'])
						result['PendingHints'] = process.env.MaxHints - hintcount[0]['Sessions']['ROWID']
						console.log("End of Execution: ",result)
						res.status(200).json(result)
					}
				})
				.catch((err) => {
					console.log("End of Execution: ",err);
					res.status(500).send(err);
				});
			}
		})
		.catch((err) => {
			console.log("End of Execution: ",err);
			res.status(500).send(err);
		});		
	}
});

app.all("/", (req,res) => {

	res.status(403).send("Error.");

});

module.exports = app;
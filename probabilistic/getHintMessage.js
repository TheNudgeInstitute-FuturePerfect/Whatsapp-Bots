"use strict"

const express = require("express");
// const catalyst = require('zcatalyst-sdk-node');
const catalyst = require("zoho-catalyst-sdk");
const Sessions = require("./models/Sessions.js");
const sendResponseToGlific = require("./common/sendResponseToGlific.js");

// const app = express();
// app.use(express.json());
const app = express.Router();

app.post("/gethintmessage", (req, res) => {

    let catalystApp = catalyst.initialize(req, {type: catalyst.type.applogic});

	const requestBody = req.body;

	const startTimeStamp = new Date();

    const executionID = requestBody["SessionID"] ? requestBody["SessionID"] : Math.random().toString(36).slice(2)
        
    //Prepare text to prepend with logs
    const params = ["getHintMessage",req.url,executionID,""]
    const prependToLog = params.join(" | ")
    
    console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")
    	
	var result = {
		OperationStatus:"SUCCESS"
	}

	let sessionID = requestBody["SessionID"];
	if(typeof sessionID === 'undefined'){
		result['OperationStatus'] = "REQ_ERR"
		result['StatusDescription'] = "Missing required parameter - SessionID"
		console.info((new Date()).toString()+"|"+prependToLog,"End of Execution: ",result)
		res.status(200).json(result)
	}
	else{
		// let zcql = catalystApp.zcql()
		// zcql.executeZCQLQuery("Select count(ROWID) from Sessions where Reply is not null and SessionID = '"+sessionID+" - Hint'")
		Sessions.countDocuments({
			Reply: { $ne: null },
			SessionID: `${sessionID} - Hint`
		  })
		.then((hintcount)=>{
			if((typeof hintcount !== 'undefined')&&(hintcount!=null)&&(parseInt(hintcount[0]['Sessions']['ROWID'])>=parseInt(process.env.MaxHints))){
				result['OperationStatus'] = "MAX_HINTS_RCHD"
				result['StatusDescription'] = "Maximum Number of Hints Reached"
				console.info((new Date()).toString()+"|"+prependToLog,"End of Execution: ",result)
				res.status(200).json(result)
			}
			else{
				// zcql.executeZCQLQuery("Select Message, Reply from Sessions where MessageType = 'UserMessage' and SessionID = '"+sessionID+"' order by Sessions.CREATEDTIME DESC limit 1")
				Sessions.findOne({
					MessageType: 'UserMessage',
					SessionID: sessionID
				  })
				.select('Message Reply')
				.sort({ CREATEDTIME: -1 })
				.then((sessiondata)=>{
					if(typeof sessiondata === 'undefined'){
						result['OperationStatus'] = "NO_DATA"
						result['StatusDescription'] = "No session data for the given session id"
						console.info((new Date()).toString()+"|"+prependToLog,"End of Execution: ",result)
						res.status(200).json(result)
					}
					else if(sessiondata == null){
						result['OperationStatus'] = "NO_DATA"
						result['StatusDescription'] = "No session data for the given session id"
						console.info((new Date()).toString()+"|"+prependToLog,"End of Execution: ",result)
						res.status(200).json(result)
					}
					else if(sessiondata.length == 0){
						result['OperationStatus'] = "NO_DATA"
						result['StatusDescription'] = "No session data for the given session id"
						console.info((new Date()).toString()+"|"+prependToLog,"End of Execution: ",result)
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
						console.info((new Date()).toString()+"|"+prependToLog,"End of Execution: ",result)
						res.status(200).json(result)
						//Send Reponse to Glific
						let endTimeStamp = new Date();
						let executionDuration = (endTimeStamp - startTimeStamp) / 1000;
						if (executionDuration > 5) {
							sendResponseToGlific({
								flowID: requestBody["FlowID"],
								contactID: requestBody["contact"]["id"],
								resultJSON: JSON.stringify({
									hintmessages: responseJSON,
								}),
							})
							.then((glificResponse) => {})
							.catch((error) => console.info((new Date()).toString()+"|"+prependToLog,"Error returned from Glific: ", error));
						}
					}
				})
				.catch((err) => {
					console.info((new Date()).toString()+"|"+prependToLog,"End of Execution: ",err);
					res.status(500).send(err);
				});
			}
		})
		.catch((err) => {
			console.info((new Date()).toString()+"|"+prependToLog,"End of Execution: ",err);
			res.status(500).send(err);
		});		
	}
});

app.post("/tokenizehintmessage", (req, res) => {

    let catalystApp = catalyst.initialize(req, {type: catalyst.type.applogic});

	const requestBody = req.body;

	const startTimeStamp = new Date();

    const executionID = requestBody["SessionID"] ? requestBody["SessionID"] : Math.random().toString(36).slice(2)
        
    //Prepare text to prepend with logs
    const params = ["getHintMessage",req.url,executionID,""]
    const prependToLog = params.join(" | ")
    
    console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")
    	
	var result = {
		OperationStatus:"SUCCESS"
	}

	let hint = requestBody["Hint"];
	if(typeof hint === 'undefined'){
		result['OperationStatus'] = "REQ_ERR"
		result['StatusDescription'] = "Missing required parameter - Hint"
		console.info((new Date()).toString()+"|"+prependToLog,"End of Execution: ",result)
		res.status(200).json(result)
	}
	else{
		const hintTokens = hint.split("\n")
		let hintIndex = 0
		for(var i=0;i<hintTokens.length;i++){
			if(hintTokens[i].startsWith("1.") || hintTokens[i].startsWith("2.") || hintTokens[i].startsWith("3.")){
				result["Hint"+(++hintIndex)] = hintTokens[i].substring(2).trim()
			}
		}
		if(hintIndex==0){
			result['TotalTokens']=1
			result["Hint1"]=hint
		}
		else{
			result['TotalTokens']=hintIndex
		}
		console.info((new Date()).toString()+"|"+prependToLog,"End of Execution: ",result)
		res.status(200).json(result)
		//Send Reponse to Glific
		let endTimeStamp = new Date();
		let executionDuration = (endTimeStamp - startTimeStamp) / 1000;
		if (executionDuration > 5) {
			sendResponseToGlific({
				flowID: requestBody["FlowID"],
				contactID: requestBody["contact"]["id"],
				resultJSON: JSON.stringify({
					hintmessages: responseJSON,
				}),
			})
			.then((glificResponse) => {})
			.catch((error) => console.info((new Date()).toString()+"|"+prependToLog,"Error returned from Glific: ", error));
		}
	}
});

app.all("/", (req,res) => {

	res.status(403).send("Error.");

});

module.exports = app;
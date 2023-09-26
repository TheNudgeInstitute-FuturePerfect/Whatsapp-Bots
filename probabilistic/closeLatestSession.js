"use strict"

const express = require("express");
// const catalyst = require('zcatalyst-sdk-node');
const catalyst = require("zoho-catalyst-sdk");

// const app = express();
// app.use(express.json());
const app = express.Router();

app.post("/latestsession", (req, res) => {
	//Initialize catalyst app
    let catalystApp = catalyst.initialize(req, {type: catalyst.type.applogic});

	const startTimeStamp = new Date();

	const executionID = Math.random().toString(36).slice(2)
		
	//Prepare text to prepend with logs
	const params = ["closeLatestSession",req.url,executionID,""]
	const prependToLog = params.join(" | ")
	
	console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")
  
	//Get the request mbody
	const requestBody = req.body;
	//Initialize response object
	var responseBody = {
		OperationStatus:"SUCCESS"
	}
	//Check if mandatory field is present in request or not
	if(typeof requestBody['Mobile']==='undefined'){
		responseBody['OperationStatus']='REQ_ERR'
		responseBody['StatusDescription']='Mising mandatory field in request: Mobile'
		console.info((new Date()).toString()+"|"+prependToLog,"End of Execution. Response: ",responseBody)
		res.status(200).json(responseBody);//Return a request err
	}
	else{//If Present
		//Get the mobile in 10 digit format
		const mobile = requestBody['Mobile'].toString().slice(-10)
		//Initialize ZCQL
		let zcql = catalystApp.zcql()
		//Build query
		let query = "Select distinct SessionID from Sessions where Sessions.IsActive = true and Sessions.Mobile = '"+mobile+"'"
		console.info((new Date()).toString()+"|"+prependToLog,query)
		//Execute Query
		zcql.executeZCQLQuery(query)
		.then((searchQueryResult)=>{//On successful execution
			if(searchQueryResult==null){//If no data returned
				responseBody['OperationStatus']='SUCCESS' 
				responseBody['StatusDescription']='No session data for the user'
				console.info((new Date()).toString()+"|"+prependToLog,"End of Execution. Response: ",responseBody)
				res.status(200).json(responseBody);//Send the response	
			}
			else if(!Array.isArray(searchQueryResult)){
				throw new Error(searchQueryResult)
			}
			else if(searchQueryResult.length==0){//Or an empty object returned
				responseBody['OperationStatus']='SUCCESS' 
				responseBody['StatusDescription']='No session data for the user'
				console.info((new Date()).toString()+"|"+prependToLog,"End of Execution. Response: ",responseBody)
				res.status(200).json(responseBody);//Send the response	
			}
			else{//Else
				let activeSessions = searchQueryResult.map(data=>data.Sessions.SessionID)
				//If CloseAskAnyDoubt flag field is present
				if(typeof requestBody["CloseAskAnyDoubt"] !== 'undefined'){
					//If CloseAskAnyDoubt = true => Close only AskAnyDoubt Session
					if(requestBody["CloseAskAnyDoubt"]==true){
						activeSessions = activeSessions.filter(data=>data.endsWith("AskAnyDoubt"))
						console.info((new Date()).toString()+"|"+prependToLog,"Close only AskAnyDoubt Session: "+activeSessions.join(","))
					}
					else{//Ignore AskAnyDoubt sessions from closing
						activeSessions = activeSessions.filter(data=>!data.endsWith("AskAnyDoubt"))
						console.info((new Date()).toString()+"|"+prependToLog,"Close all active sessions except AskAnyDoubt Session: "+activeSessions.join(","))
					}
				}
				else{//Ignore AskAnyDoubt sessions from closing
					activeSessions = activeSessions.filter(data=>!data.endsWith("AskAnyDoubt"))
					console.info((new Date()).toString()+"|"+prependToLog,"Close all active sessions except AskAnyDoubt Session: "+activeSessions.join(","))
				}
				
				query = "Update Sessions set Sessions.IsActive = false where Sessions.SessionID in ('"+activeSessions.join("','")+"')"
				console.info((new Date()).toString()+"|"+prependToLog,query)
				//Execute Query
				zcql.executeZCQLQuery(query)
				.then((queryResult)=>{//On successful execution
					if(queryResult==null){//If no data returned
						responseBody['OperationStatus']='NO_DATA' //Send a non success status
						responseBody['StatusDescription']='No session data for the user'
					}
					else if(queryResult.length==0){//Or an empty object returned
						responseBody['OperationStatus']='NO_DATA' //Send a non success status
						responseBody['StatusDescription']='No session data for the user'
					}
					else{//Else
						responseBody['StatusDescription']='All active sessions closed'
					}
					console.info((new Date()).toString()+"|"+prependToLog,"End of Execution. Response: ",responseBody)
					res.status(200).json(responseBody);//Send the response
					let sendResponseToGlific = require("./common/sendResponseToGlific.js");
					sendResponseToGlific({
							"flowID":requestBody["FlowId"],
							"contactID": requestBody["contact"]["id"],
							"resultJSON": JSON.stringify({
								"closedsession":responseBody
							})
						}).then(glificResponse=>{})
					.catch(err=>console.info((new Date()).toString()+"|"+prependToLog,"Error returned from Glific: ",err))
				})
				.catch((err) => {//On error in execution
					console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error while executing select statement");
					console.error((new Date()).toString()+"|"+prependToLog,"Error while executing select statement: ",query,"\nError: ",err);
					res.status(500).send(err);//Return technical error
				});
			}
		})
		.catch((err) => {//On error in execution
			console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error while executing select statement");
			console.error((new Date()).toString()+"|"+prependToLog,"Error while executing select statement: ",query,"\nError: ",err);
			res.status(500).send(err);//Return technical error
		});
	}
});

app.post("/endsession", (req, res) => {
	//Initialize catalyst app
    let catalystApp = catalyst.initialize(req, {type: catalyst.type.applogic});

	const startTimeStamp = new Date();

	const executionID = Math.random().toString(36).slice(2)
		
	//Prepare text to prepend with logs
	const params = ["closeLatestSession",req.url,executionID,""]
	const prependToLog = params.join(" | ")
	
	console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")
  
	//Get the request mbody
	const requestBody = req.body;
	//Initialize response object
	var responseBody = {
		OperationStatus:"SUCCESS"
	}
	//Check if mandatory field is present in request or not
	if(typeof requestBody['SessionID']==='undefined'){
		responseBody['OperationStatus']='REQ_ERR'
		responseBody['StatusDescription']='Mising mandatory field in request: SessionID'
		console.info((new Date()).toString()+"|"+prependToLog,"End of Execution. Response: ",responseBody)
		res.status(200).json(responseBody);//Return a request err
	}
	else{//If Present
		//Initialize ZCQL
		let zcql = catalystApp.zcql()
		//Build query
		const query = "Update Sessions set EndOfSession = true where Sessions.SessionID = '"+requestBody['SessionID']+"'"
		console.info((new Date()).toString()+"|"+prependToLog,query)
		//Execute Query
		zcql.executeZCQLQuery(query)
		.then((queryResult)=>{//On successful execution
			if(queryResult==null){//If no data returned
				responseBody['OperationStatus']='NO_DATA' //Send a non success status
				responseBody['StatusDescription']='No session data for the user'
			}
			else if(queryResult.length==0){//Or an empty object returned
				responseBody['OperationStatus']='NO_DATA' //Send a non success status
				responseBody['StatusDescription']='No session data for the user'
			}
			else{//Else
				responseBody['StatusDescription']='Sessions Closed'
			}
			console.info((new Date()).toString()+"|"+prependToLog,"End of Execution. Response: ",responseBody)
			res.status(200).json(responseBody);//Send the response
			let sendResponseToGlific = require("./common/sendResponseToGlific.js");
			sendResponseToGlific({
					"flowID":requestBody["FlowId"],
					"contactID": requestBody["contact"]["id"],
					"resultJSON": JSON.stringify({
						"closedsession":responseBody
					})
				}).then(glificResponse=>{})
			.catch(err=>console.info((new Date()).toString()+"|"+prependToLog,"Error returned from Glific: ",err))
		})
		.catch((err) => {//On error in execution
			console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error while executing select statement");
			console.error((new Date()).toString()+"|"+prependToLog,"Error while executing select statement: ",query,"\nError: ",err);
			res.status(500).send(err);//Return technical error
			});
	}
});

module.exports = app;
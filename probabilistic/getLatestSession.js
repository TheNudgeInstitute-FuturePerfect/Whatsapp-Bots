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
	const params = ["getLatestSession",req.url,executionID,""]
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
		const module = (typeof requestBody['Module'] === 'undefined') ? null : (requestBody['Module'].startsWith("@contact") || requestBody['Module'].startsWith("@result")) ? null : requestBody['Module']
		//Initialize ZCQL
		let zcql = catalystApp.zcql()
		//Build query
		let query = "select Sessions.IsActive, Sessions.Reply, Sessions.ReplyAudioURL, Sessions.SessionID, Sessions.SystemPromptsROWID, SystemPrompts.Name from Sessions left join SystemPrompts on SystemPrompts.ROWID = Sessions.SystemPromptsROWID  where Sessions.Mobile = '"+mobile+"' "+
					(module != null ? " and SystemPrompts.Module = '"+module+"' ":"")+
					"order by Sessions.CREATEDTIME DESC"
		//Execute Query
		zcql.executeZCQLQuery(query)
		.then((queryResultAll)=>{//On successful execution
			const sendResponse = () => {
				console.info((new Date()).toString()+"|"+prependToLog,"End of Execution. Response: ",responseBody)
				res.status(200).json(responseBody);//Send the response
				let sendResponseToGlific = require("./common/sendResponseToGlific.js");
				sendResponseToGlific({
						"flowID":requestBody["FlowId"],
						"contactID": requestBody["contact"]["id"],
						"resultJSON": JSON.stringify({
							"activesession":responseBody
						})
					}).then(glificResponse=>{})
				.catch(err=>console.info((new Date()).toString()+"|"+prependToLog,"Error returned from Glific: ",err))
			}
			//Filter Ask Any Doubt Sessions if the module is not present in request
			const queryResult = module != null ? queryResultAll : queryResultAll.filter(data=>!data.Sessions.SessionID.endsWith("AskAnyDoubt"))
			if(queryResult==null){//If no data returned
				responseBody['OperationStatus']='NO_DATA' //Send a non success status
				responseBody['StatusDescription']='No session data for the user'
				responseBody['NewSessionID'] = Math.random().toString(36).slice(2)
				sendResponse()
			}
			else if(queryResult.length==0){//If no data returned
				responseBody['OperationStatus']='NO_DATA' //Send a non success status
				responseBody['StatusDescription']='No session data for the user'
				responseBody['NewSessionID'] = Math.random().toString(36).slice(2)
				sendResponse()
			}
			else{
				query = "select Users.OnboardingComplete, Users.OnboardingStep from Users where Users.Mobile = "+mobile+""
				zcql.executeZCQLQuery(query)
				.then((users)=>{//On successful execution
					if(typeof users === 'undefined'){
						responseBody['OperationStatus']='NO_USR' //Send a non success status
						responseBody['StatusDescription']='No record for the user'
						sendResponse()
					}
					else if(users == null){
						responseBody['OperationStatus']='NO_USR' //Send a non success status
						responseBody['StatusDescription']='No record for the user'
						sendResponse()
					}
					else if(users.length == 0){
						responseBody['OperationStatus']='NO_USR' //Send a non success status
						responseBody['StatusDescription']='No record for the user'
						sendResponse()
					}
					else{
						const activeOnboardingSessionData = queryResult.filter(data=>(data.Sessions.IsActive == true) && (!data.Sessions.SessionID.endsWith('ObjectiveFeedback')) && (!data.Sessions.SessionID.endsWith('Hint')) && (data.Sessions.SessionID.startsWith('Onboarding')))
						if(users[0]['Users']['OnboardingComplete'] == null){
							if(activeOnboardingSessionData.length>0){
								responseBody['OperationStatus']='LST_ONBRD_PNDNG' //Send a non success status
								responseBody['SessionID']=activeOnboardingSessionData[0]['Sessions']['SessionID']
								responseBody['LastReply']=activeOnboardingSessionData[0]['Sessions']['Reply'] == null ? "Let's continue our conversation." : decodeURIComponent(activeOnboardingSessionData[0]['Sessions']['Reply'])
								responseBody['Topic']=activeOnboardingSessionData[0]['SystemPrompts']['Name']
								responseBody['TopicID']=activeOnboardingSessionData[0]['Sessions']['SystemPromptsROWID']
							}
							else
								responseBody['OperationStatus']='ONBRD_PNDNG' //Send a non success status
							responseBody['StatusDescription']='Onboarding pending for user'
							responseBody['OnboardingStep'] = 1 
							responseBody['NewSessionID'] = Math.random().toString(36).slice(2)
							
							sendResponse()
						}
						else if(users[0]['Users']['OnboardingComplete'] == false){
							if(activeOnboardingSessionData.length>0){
								responseBody['OperationStatus']='LST_ONBRD_PNDNG' //Send a non success status
								responseBody['SessionID']=activeOnboardingSessionData[0]['Sessions']['SessionID']
								responseBody['LastReply']=activeOnboardingSessionData[0]['Sessions']['Reply'] == null ? "Let's continue our conversation." : decodeURIComponent(activeOnboardingSessionData[0]['Sessions']['Reply'])
								responseBody['Topic']=activeOnboardingSessionData[0]['SystemPrompts']['Name']
								responseBody['TopicID']=activeOnboardingSessionData[0]['Sessions']['SystemPromptsROWID']
							}
							else
								responseBody['OperationStatus']='ONBRD_PNDNG' //Send a non success status
							responseBody['StatusDescription']='Onboarding pending for user'
							responseBody['OnboardingStep'] = users[0]['Users']['OnboardingStep']
							responseBody['NewSessionID'] = Math.random().toString(36).slice(2)
							sendResponse()
						}
						else{
							const activeQueryResult = queryResult.filter(data=>(data.Sessions.IsActive == true) && (!data.Sessions.SessionID.endsWith('ObjectiveFeedback')) && (!data.Sessions.SessionID.endsWith('Hint')) && (data.Sessions.SessionID!='Onboarding'))
							if(activeQueryResult.length==0){//Or an empty object returned
								responseBody['OperationStatus']='NO_DATA' //Send a non success status
								responseBody['StatusDescription']='No session data for the user'
								const lastReply = queryResult.filter(record=>((record.Sessions.Reply!=null))||(record.Sessions.ReplyAudioURL!=null))
								responseBody['ReplyFormat'] = lastReply.length == 0 ? "Text" : lastReply[0]["Sessions"]["ReplyAudioURL"]!=null ? "Audio" : "Text"
								responseBody['NewSessionID'] = Math.random().toString(36).slice(2)
								sendResponse()
							}
							else{//Else
								//Get the session ID from 1st record arranged in descending order of creation time
								responseBody['SessionID']=activeQueryResult[0]['Sessions']['SessionID']
								responseBody['LastReply']=activeQueryResult[0]['Sessions']['Reply'] == null ? "Let's continue our conversation." : decodeURIComponent(activeQueryResult[0]['Sessions']['Reply'])
								responseBody['Topic']=activeQueryResult[0]['SystemPrompts']['Name']
								responseBody['TopicID']=activeQueryResult[0]['Sessions']['SystemPromptsROWID']
								const lastReply = activeQueryResult.filter(record=>((record.Sessions.Reply!=null))||(record.Sessions.ReplyAudioURL!=null))
								responseBody['ReplyFormat'] = lastReply.length == 0 ? "Text" : lastReply[0]["Sessions"]["ReplyAudioURL"]!=null ? "Audio" : "Text"
								responseBody['NewSessionID'] = Math.random().toString(36).slice(2)
								sendResponse()
							}
						}
					}
				})
				.catch((err) => {//On error in execution
					console.info((new Date()).toString()+"|"+prependToLog,"Error while executing select statement: ",query,"\nError: ",err);
					res.status(500).send(err);//Return technical error
				});
			}
		})
		.catch((err) => {//On error in execution
			console.info((new Date()).toString()+"|"+prependToLog,"Error while executing select statement: ",query,"\nError: ",err);
			res.status(500).send(err);//Return technical error
		});
	}
});

module.exports = app;
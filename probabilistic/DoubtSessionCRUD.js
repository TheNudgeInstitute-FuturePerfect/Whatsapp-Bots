"use strict";

const express = require("express");
// const catalyst = require('zcatalyst-sdk-node');
const catalyst = require("zoho-catalyst-sdk");
const userDoubtSession = require("./models/userDoubtSession.js");
const sendResponseToGlific = require("./common/sendResponseToGlific.js");
const Session = require("./models/Sessions.js");
const User = require("./models/Users.js");
const SystemPrompts = require("./models/SystemPrompts.js");

// const app = express();
// app.use(express.json());
const app = express.Router();

const unique = (value, index, self) => {
  return self.indexOf(value) === index;
};
const sendResponse = (prependToLog,responseJSON,startTimeStamp,requestBody,res) => {
    console.info((new Date()).toString()+"|"+prependToLog,"End of Execution. Response:",responseJSON)
    res.status(200).json(responseJSON)
    //Send Reponse to Glific
    let endTimeStamp = new Date();
    let executionDuration = (endTimeStamp - startTimeStamp) / 1000;
    if (executionDuration > 5) {
        sendResponseToGlific({
            flowID: requestBody["FlowID"],
            contactID: requestBody["contact"]["id"],
            resultJSON: JSON.stringify({
                getdoubtsession: responseJSON,
            }),
        })
        .then((glificResponse) => {})
        .catch((error) => console.info((new Date()).toString()+"|"+prependToLog,"Error returned from Glific: ", error));
    }
    return true
}

app.get("/", (req, res) => {

    let catalystApp = catalyst.initialize(req, { type: catalyst.type.applogic });

    const startTimeStamp = new Date();

    const executionID = Math.random().toString(36).slice(2)
        
    //Prepare text to prepend with logs
    const params = ["DoubtSessionCRUD",req.method,executionID,""]
    const prependToLog = params.join(" | ")
    
    console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")
        
    let sessionID = req.query['session']
    if(typeof sessionID === 'undefined'){
        throw new Error("session missing in query parameter")
    }
    else{
        res.status(200).json({})
        console.info((new Date()).toString()+"|"+prependToLog,"Sent Respose")
                           
    
        let eventData = {
            SessionID: sessionID,
            Event : "User Requested for Doubt Session",
            Mobile: 0
        }
        let table = catalystApp.datastore().table("SessionEvents")

        let zcql = catalystApp.zcql()
        // zcql.executeZCQLQuery("Select distinct Mobile,SystemPromptsROWID from Sessions where SessionID ='"+sessionID+"'")
        Session.distinct('Mobile SystemPromptsROWID', { SessionID: sessionID })
        .then((session)=>{
            if(!Array.isArray(session))
                throw new Error(session)
            else{
                console.info((new Date()).toString()+"|"+prependToLog,"Fetched Session Details")
                eventData["SystemPromptROWID"]= session[0]['Sessions']['SystemPromptsROWID']
                eventData['Mobile']=session[0]['Sessions']['Mobile']
                // zcql.executeZCQLQuery("Select distinct ROWID, GlificID from Users where Mobile ='"+session[0]['Sessions']['Mobile']+"'")
                User.distinct('ROWID', { Mobile: sessionMobile })
                .then(async (user)=>{
                    if(!Array.isArray(user))
                        throw new Error(user)
                    else{
                        console.info((new Date()).toString()+"|"+prependToLog,"Fetched User Details")
                        const fltr = {
                            "UserROWID":user[0]['Users']['ROWID']
                        }
                        const updateData = {
                            "UserROWID":user[0]['Users']['ROWID'],
                            "SessionID":sessionID
                        }
                        const updatedRow = await userDoubtSession.updateOne(fltr,updateData,{upsert: true})
                        console.info((new Date()).toString()+"|"+prependToLog,"Updated Session ID in UserDoubtSession model. Matched Records: "+updatedRow.matchedCount+" | Modified Records: "+updatedRow.modifiedCount+" | Acknowledged Records: "+updatedRow.acknowledged)
                        //Prepare Glific Params
                        //Start Glific Flow
                        const startGlificFlow = require("./common/startGlificFlow.js")
                        const backOff = require("exponential-backoff")
                        const flowStatus = JSON.parse(await backOff.backOff(()=>startGlificFlow({
                                                flowID:process.env.DoubtSessionFlowID,
                                                contactID:user[0]['Users']['GlificID']
                                            })))
                        if(flowStatus['OperationStatus']!='SUCCESS')
                            throw new Error(flowStatus)
                        console.info((new Date()).toString()+"|"+prependToLog,"Doubt Session Flow Started for User")
                        eventData['Event']="Doubt Session Flow Started"
                        const insertResult = await table.insertRow(eventData)
                        if(typeof insertResult['ROWID']==='undefined')
                            throw new Error(insertResult)
                        console.info((new Date()).toString()+"|"+prependToLog,"End of Execution")
                    }
                })
                .catch(async (error)=>{
                    eventData['Event']="Technical Error in Starting Doubt Session"
                    const insertResult = await table.insertRow(eventData)
                    if(typeof insertResult['ROWID']!=='undefined')
                        console.info((new Date()).toString()+"|"+prependToLog,"Session Event Table Updated for error = "+eventData['Event'])
                    else
                        console.info((new Date()).toString()+"|"+prependToLog,"Session Event Table Not Updated for error = ",insertResult)        
                    console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error in Getting User of Updating Doubt Model");
                    console.error((new Date()).toString()+"|"+prependToLog,"End of Execution with Error: ",error);
                })
            }
        })
        .catch(async (error)=>{
            eventData['Event']="Technical Error in Starting Doubt Session"
            const insertResult = await table.insertRow(eventData)
            if(typeof insertResult['ROWID']!=='undefined')
                console.info((new Date()).toString()+"|"+prependToLog,"Session Event Table Updated for error = "+eventData['Event'])
            else
                console.info((new Date()).toString()+"|"+prependToLog,"Session Event Table Not Updated for error = ",insertResult)
            console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error in Gettig Session Data");
            console.error((new Date()).toString()+"|"+prependToLog,"End of Execution with Error: ",error);
        })
    }
})

app.post("/getsessiondetails", async (req, res) => {

    let catalystApp = catalyst.initialize(req, { type: catalyst.type.applogic });

    const startTimeStamp = new Date();

    const requestBody = req.body;

    const executionID = Math.random().toString(36).slice(2)
        
    //Prepare text to prepend with logs
    const params = ["DoubtSessionCRUD",req.url,executionID,""]
    const prependToLog = params.join(" | ")
    
    console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")
        
    var responseJSON = {
        OperationStatus: "SUCCESS",
    };

    const mobile = requestBody['Mobile'].toString().slice(-10)

    let zcql = catalystApp.zcql()
    // zcql.executeZCQLQuery('Select ROWID from Users where Mobile = '+mobile)

    User.findOne({ Mobile: mobile }).select('ROWID')
    .then(async (user)=>{
        if(!Array.isArray(user))
            throw new Error(user)
        else{
            console.info((new Date()).toString()+"|"+prependToLog,"Fetched User's Record")
            const filter = {
                UserROWID: user[0]['Users']['ROWID']
            }
            const rowReturned = await userDoubtSession.find(filter)
            if(rowReturned.length==0){
                responseJSON['OperationStatus']="NO_DBT_SSN_RECORD"
                responseJSON['StatusDescription']="There is no Doubt Session record for the user"
                console.info((new Date()).toString()+"|"+prependToLog,"End of Execution. No record in UserDoubtSession for User ROWID :"+user[0]['Users']['ROWID'])
                sendResponse(prependToLog,responseJSON,startTimeStamp,requestBody,res)
            }
            else{
                console.info((new Date()).toString()+"|"+prependToLog,"Returned "+rowReturned.length+" Records from UserDoubtSession matching User ROWID :"+user[0]['Users']['ROWID'])
                responseJSON['SessionID']=rowReturned[0]['SessionID']
                // zcql.executeZCQLQuery("Select ROWID from SystemPrompts where Name = 'SLF Doubts'")
                SystemPrompts.findOne({ Name: queryName }, 'ROWID')
                .then((systemPrompt)=>{
                    if(!Array.isArray(systemPrompt))
                        throw new Error(systemPrompt)
                    else if(systemPrompt.length==0)
                        throw new Error("No System Prompt Defined")
                    else{
                        console.info((new Date()).toString()+"|"+prependToLog,"Fetched SystemPrompt Record")
                        responseJSON['TopicID']=systemPrompt[0]['SystemPrompts']['ROWID']
                        responseJSON['Topic']='SLF Doubts'
                        console.info((new Date()).toString()+"|"+prependToLog,"End of Execution.",responseJSON)
                        sendResponse(prependToLog,responseJSON,startTimeStamp,requestBody,res)
                    }
                })
                .catch((error)=>{
                    console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error.");
                    console.error((new Date()).toString()+"|"+prependToLog,"End of Execution with Error: ",error);
                    res.status(500).send(error)
                })
            }
        }
    })
    .catch((error)=>{
        console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error.");
        console.error((new Date()).toString()+"|"+prependToLog,"End of Execution with Error: ",error);
        res.status(500).send(error)
    })
})


module.exports = app;
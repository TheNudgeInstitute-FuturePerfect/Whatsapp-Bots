"use strict";

const express = require("express");
// const catalyst = require('zcatalyst-sdk-node');
const catalyst = require("zoho-catalyst-sdk");
const sendResponseToGlific = require("./common/sendResponseToGlific.js");
// const app = express();
// app.use(express.json());
const app = express.Router();

//Filter unique elements in an array
const unique = (value, index, self) => {
  return self.indexOf(value) === index;
};

app.post("/totalsessions", (req, res) => {
    let startTimeStamp = new Date();
    let catalystApp = catalyst.initialize(req, { type: catalyst.type.applogic });
    let zcql = catalystApp.zcql()
    const requestBody = req.body;
 
    const executionID = Math.random().toString(36).slice(2)
    
    const params = ["getUserSessionCount","totalsessions",executionID,""]
    const prependToLog = params.join(" | ")
    
    console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")
    const mobile = requestBody["Mobile"].slice(-10)
    
    let query = "Select distinct SessionID from Sessions where Mobile = "+mobile
    console.log(query)
    zcql.executeZCQLQuery(query)
    .then((userSessions)=>{
        const sessions = userSessions.filter(
            (data) =>
              !(
                data.Sessions.SessionID.endsWith("Hint") ||
                data.Sessions.SessionID.endsWith("Translation") ||
                data.Sessions.SessionID.endsWith("ObjectiveFeedback") ||
                data.Sessions.SessionID.startsWith("Onboarding") ||
                data.Sessions.SessionID.endsWith("Onboarding") ||
                data.Sessions.SessionID.startsWith("onboarding") ||
                data.Sessions.SessionID.endsWith("onboarding")
              )
          );
        var responseObject = {
            "OperationStatus":"SUCCESS"
        }
        if(sessions.length==0){
            responseObject['OperationStatus'] = "NO_SESSION_RECORD"
            responseObject['StatusDescription'] = "No Session Data"
        }
        else{
            const uniqueSession = sessions.map(data=>data.Sessions.SessionID).filter(unique)
            responseObject['TotalSessions']=uniqueSession.length
            console.info((new Date()).toString()+"|"+prependToLog,'Total Sessions='+responseObject['TotalSessions'])
            console.info((new Date()).toString()+"|"+prependToLog,'Total Sessions=',uniqueSession)
        }
        console.info((new Date()).toString()+"|"+prependToLog,"End of Execution")
        console.debug((new Date()).toString()+"|"+prependToLog,"End of Execution. Response:",responseObject)
        res.status(200).json(responseObject)
    })
    .catch((error)=>{
        console.error((new Date()).toString()+"|"+prependToLog,"Error in executing query: "+query+"\n",error)
        res.status(500).send(error)
    })

    //Send Reponse to Glific
    let endTimeStamp = new Date();
    let executionDuration = (endTimeStamp - startTimeStamp) / 1000;
    if (executionDuration > 5) {
      sendResponseToGlific({
        flowID: requestBody["FlowID"],
        contactID: requestBody["contact"]["id"],
        resultJSON: JSON.stringify({
          practices: responseObject,
        }),
      })
      .then((glificResponse) => {})
      .catch((err) => console.log("Error returned from Glific: ", err));
    }
})

module.exports = app;
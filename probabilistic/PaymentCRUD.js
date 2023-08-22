"use strict";

const express = require("express");
// const catalyst = require('zcatalyst-sdk-node');
const catalyst = require("zoho-catalyst-sdk");
const sendResponseToGlific = require("./common/sendResponseToGlific.js");
let userTopicSubscriptionMapper = require("./models/userTopicSubscriptionMapper.js")

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
                paymentlink: responseJSON,
            }),
        })
        .then((glificResponse) => {})
        .catch((error) => console.info((new Date()).toString()+"|"+prependToLog,"Error returned from Glific: ", error));
    }
    return true
}

app.post("/create", (req, res) => {

    let catalystApp = catalyst.initialize(req, { type: catalyst.type.applogic });

    const startTimeStamp = new Date();

    const requestBody = req.body;

    const executionID = Math.random().toString(36).slice(2)
        
    //Prepare text to prepend with logs
    const params = ["PaymentCRUD",req.url,executionID,""]
    const prependToLog = params.join(" | ")
    
    console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")
        
    var responseJSON = {
        OperationStatus: "SUCCESS",
    };

    const mobile = requestBody['Mobile'].toString().slice(-10)

    let zcql = catalystApp.zcql()
    zcql.executeZCQLQuery("Select ROWID, Name, GlificID from Users where Mobile ='"+mobile+"'")
    .then(async (user)=>{
        if(!Array.isArray(user))
            throw new Error(user)
        console.info((new Date()).toString()+"|"+prependToLog,"Fetched User's Details")
        
        let getConfigurationParam = require("./common/getConfigurationParam.js");
        const topicConfig = JSON.parse(
                await getConfigurationParam({
                    id: requestBody["TopicID"],
                    param: ["subscriptionamt"],
                })
            );
        if (topicConfig.OperationStatus != "SUCCESS")
            throw new Error(topicConfig)
        
        if(topicConfig.Values==null){
            responseJSON["OperationStatus"] = "FREE_TOPIC"
            sendResponse(prependToLog,responseJSON,startTimeStamp,requestBody, res)
        }
        else if((typeof topicConfig.Values['subscriptionamt'] !== 'undefined')&&(topicConfig.Values['subscriptionamt']==0)){
            responseJSON["OperationStatus"] = "FREE_TOPIC"
            sendResponse(prependToLog,responseJSON,startTimeStamp,requestBody, res)
        }
        else if(typeof topicConfig.Values['subscriptionamt'] === 'undefined'){
            responseJSON["OperationStatus"] = "FREE_TOPIC"
            sendResponse(prependToLog,responseJSON,startTimeStamp,requestBody, res)
        }
        else{
            console.info((new Date()).toString()+"|"+prependToLog,"Fetched Topic Subscription Amount:"+topicConfig.Values['subsciptionamt'])
            zcql.executeZCQLQuery("Select distinct ROWID from SystemPrompts where IsPaid = true and Name = '"+requestBody["Topic"]+"'")
            .then(async (systemPrompts)=>{
                if(!Array.isArray(systemPrompts))
                    throw new Error(systemPrompts)
                console.info((new Date()).toString()+"|"+prependToLog,"Fetched All Paid Personas for Topic :"+requestBody["Topic"])
                  
                let currentTimeStamp = new Date()
                currentTimeStamp.setMinutes(currentTimeStamp.getMinutes()+60)
        
                //Call Razor Pay API to create payment link
                const Razorpay = require("razorpay")
                var instance = new Razorpay({
                    key_id: process.env.RPayKeyID,
                    key_secret: process.env.RPayKeySecret
                });
                const paymentLinkPayload = {
                    "amount": parseInt(topicConfig.Values['subscriptionamt'])*100,
                    "currency": "INR",
                    "accept_partial": false,
                    "first_min_partial_amount": 0,
                    "expire_by": Math.floor(currentTimeStamp.getTime() / 1000),
                    "reference_id": requestBody["SessionID"],
                    "description": "Sign Up for "+requestBody["Topic"],
                    "customer": {
                        "name": user[0]['Users']['Name'],
                        "email": mobile+"@noemail.com",
                        "contact": "+"+requestBody['Mobile']
                    },
                    "notify": {
                        "sms": false,
                        "email": false
                    },
                    "reminder_enable": false,
                    "notes": {
                        "TopicID": requestBody["TopicID"],
                        "Topic": requestBody["Topic"],
                        "Persona": requestBody["Persona"],
                        "SessionID": requestBody["SessionID"],
                        "GlificID": requestBody["contact"]["id"]
                    },
                "callback_url": "https://wa.me/91"+process.env.GlificBotNumber,
                "callback_method": "get"
                }
                instance.paymentLink.create(paymentLinkPayload)
                .then(async (paymentLink)=>{
                    if(paymentLink["status"]=='created'){
                        console.info((new Date()).toString()+"|"+prependToLog,"Created Payment Link")
                        responseJSON["PaymentLink"] = paymentLink["short_url"]
                        console.info((new Date()).toString()+"|"+prependToLog,"Creating UserTopicSubscriptionMapper")
                        const insertData = systemPrompts.map(data=>{
                            return {
                                UserROWID: user[0]['Users']['ROWID'].toString(),
                                SessionID: requestBody['SessionID'],
                                SystemPromptROWID: data['SystemPrompts']['ROWID'].toString(),
                                IsUnlocked: false,
                                PaymentID: paymentLink["id"],
                                PaymentTracker:[paymentLink]
                            }
                        })
                        const rowReturned = await userTopicSubscriptionMapper.create(insertData)
                        console.debug((new Date()).toString()+"|"+prependToLog,"Inserted Record: "+rowReturned.map(data=>data['_id']).join(","));
                        sendResponse(prependToLog,responseJSON,startTimeStamp,requestBody, res)
                    }
                    else{
                        console.info((new Date()).toString()+"|"+prependToLog,"Failed to Create Payment Link")
                        responseJSON["OperationStatus"] = "APP_ERR"
                        sendResponse(prependToLog,responseJSON,startTimeStamp,requestBody, res)
                    }
                })
                .catch((error)=>{
                    console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error in Creating Payment Link");
                    console.error((new Date()).toString()+"|"+prependToLog,"End of Execution with Error: ",error);
                    res.status(500).send(error);
                })
            })
            .catch((error)=>{
                console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error in Gettig Paid Personas for "+requestBody["Topic"]);
                console.error((new Date()).toString()+"|"+prependToLog,"End of Execution with Error: ",error);
                res.status(500).send(error);
            })
        }
    })
    .catch((error)=>{
        console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error in Gettig User Info or Topic Info or Payment Link");
        console.error((new Date()).toString()+"|"+prependToLog,"End of Execution with Error: ",error);
        res.status(500).send(error);
    })
})

app.post("/update", async (req, res) => {

    let catalystApp = catalyst.initialize(req, { type: catalyst.type.applogic });

    const startTimeStamp = new Date();

    const requestBody = req.body;

    const executionID = Math.random().toString(36).slice(2)
        
    //Prepare text to prepend with logs
    const params = ["PaymentCRUD",req.url,executionID,""]
    const prependToLog = params.join(" | ")
    
    console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")
        
    var responseJSON = {
        OperationStatus: "SUCCESS",
    };

    res.status(200).send(responseJSON)

    console.info((new Date()).toString()+"|"+prependToLog,"Returned Response")

    const {validateWebhookSignature} = require('razorpay/dist/utils/razorpay-utils')

    if(validateWebhookSignature(JSON.stringify(requestBody), req.header['X-Razorpay-Signature'], process.env.RPayWebhookSecret)==false){
        console.info((new Date()).toString()+"|"+prependToLog,"End of Execution. Signature Could not be Validated. Signature: ",req.header['X-Razorpay-Signature'])
    }
    else{
        if(requestBody['entity']=="event"){
            console.info((new Date()).toString()+"|"+prependToLog,"Received Event="+requestBody['event'])
            console.info((new Date()).toString()+"|"+prependToLog,"Getting record from UserTopicSubscriptionMapper for payment ID :"+requestBody['payload']['payment_link']['entity']['id'])
            const filter = {
                PaymentID: requestBody['payload']['payment_link']['entity']['id']
            }
            try{
                const rowReturned = await userTopicSubscriptionMapper.find(filter)
                if(rowReturned.length==0){
                    console.info((new Date()).toString()+"|"+prependToLog,"End of Execution. No record in UserTopicSubscriptionMapper for payment ID :"+requestBody['payload']['payment_link']['entity']['id'])
                }
                else{
                    console.info((new Date()).toString()+"|"+prependToLog,"Returned "+rowReturned.length+" Records from UserTopicSubscriptionMapper matching payment ID :"+requestBody['payload']['payment_link']['entity']['id'])
                    let isUnlocked = rowReturned[0]['IsUnlocked']
                    console.info((new Date()).toString()+"|"+prependToLog,"Current Unlock Status="+rowReturned[0]['IsUnlocked'])
                    if(requestBody['payload']['payment_link']['entity']['status']=='paid'){
                        isUnlocked = true
                        console.info((new Date()).toString()+"|"+prependToLog,"Payment Successful. Unlocking Topic Records")
                    }
                    let paymentTracker = rowReturned[0]['PaymentTracker']
                    paymentTracker.push(requestBody)
                    const updateData = {
                        IsUnlocked: isUnlocked,
                        PaymentTracker: paymentTracker
                    }
                    const updatedRow = await userTopicSubscriptionMapper.updateMany(filter,updateData)
                    console.info((new Date()).toString()+"|"+prependToLog,"Matched Records: "+updatedRow.matchedCount+" | Modified Records: "+updatedRow.modifiedCount+" | Acknowledged Records: "+updatedRow.acknowledged)
					//Send HSM Message about payment being Successful
					let hsmTemplateID = null
					let params = null
                    let eventData = {
                        SessionID: rowReturned[0]['SessionID'],
                        Event : null,
                        SystemPromptROWID: rowReturned[0]['SystemPromptROWID'],
                        Mobile: requestBody['payload']['payment_link']['entity']['customer']['contact'].slice(-10)
                    }
                    let table = catalystApp.datastore().table("SessionEvents")
                    
					if(requestBody['payload']['payment_link']['entity']['status']=='paid'){
						hsmTemplateID = process.env.PaymentSuccessMsgID
						params = [requestBody['payload']['payment_link']['entity']['amount'].toString(),requestBody['payload']['order']['entity']['id']]
                        eventData['Event']="Payment Success Msg Sent"
					}
					else if((requestBody['payload']['payment_link']['entity']['status']=='expired')&&(isUnlocked==false)){
						hsmTemplateID = process.env.PaymentExpiryMsgID
						params = [requestBody['payload']['payment_link']['entity']['short_url'],requestBody['payload']['payment_link']['entity']['amount'].toString()]
                        eventData['Event']="Payment Link Expiry Msg Sent"
					}
                    else if((requestBody['payload']['payment_link']['entity']['status']=='cancelled')&&(isUnlocked==false)){
						hsmTemplateID = process.env.PaymentCancelledMsgID
						params = [requestBody['payload']['payment_link']['entity']['short_url'],requestBody['payload']['payment_link']['entity']['amount'].toString()]
                        eventData['Event']="Payment Link Cancellation Msg Sent"
					}
					if(hsmTemplateID!=null){
						const sendHSMMessage = require("./common/sendGlificHSMMsg.js")
						const msgStatus = JSON.parse(await sendHSMMessage({
												messageID:hsmTemplateID,
												contactID:requestBody['payload']['payment_link']['entity']['notes']['GlificID'],
												params: params
											}))
                        if(msgStatus['OperationStatus']!='SUCCESS')
                            throw new Error(msgStatus)
						console.info((new Date()).toString()+"|"+prependToLog,"HSM Message Sent to User Regarding the Payment Status: "+requestBody['payload']['payment_link']['entity']['status'])
					}
					else{
						console.info((new Date()).toString()+"|"+prependToLog,"HSM Message Not to be Sent to User as Payment Status: "+requestBody['payload']['payment_link']['entity']['status'])
					}
                    if(eventData['Event']!=null){
                        const insertResult = await table.insertRow(eventData)
                        if(typeof insertResult['ROWID']==='undefined')
                            throw new Error(insertResult)
                        console.info((new Date()).toString()+"|"+prependToLog,"Session Event Table Updated for event = "+eventData['Event'])
                    }
                    else
                        console.info((new Date()).toString()+"|"+prependToLog,"No Session Event to be updated")

					console.info((new Date()).toString()+"|"+prependToLog,"End of Execution")
                }
            }
            catch(error){
                console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error.");
                console.error((new Date()).toString()+"|"+prependToLog,"End of Execution with Error: ",error);
            }
        }
        else{
            console.info((new Date()).toString()+"|"+prependToLog,"End of Execution. Not a razorpay event")
        }
    }
})


module.exports = app;
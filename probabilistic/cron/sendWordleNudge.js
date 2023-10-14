//const catalyst = require("zoho-catalyst-sdk");
const dotenv = require("dotenv");
dotenv.config();
const mongoose = require('mongoose')
mongoose.connect(process.env.MongoDBConnStrng + "whatsapp-bots", {
  useNewUrlParser: true,
});
const SessionEvents = require(".././models/SessionEvents.js");
const Session = require(".././models/Sessions.js");
const User = require(".././models/Users.js");
const WordleAttempts = require(".././models/WordleAttempts.js");
const SystemPrompts = require(".././models/SystemPrompts.js");

/*let cronParams = cronDetails.getCronParam("name");
if(typeof cronParams === 'undefined'){
    cronParams = 'DefaultName';
}*/

//const catalystApp = catalyst.initialize();

const executionID = Math.random().toString(36).slice(2)

//Prepare text to prepend with logs
const params = ["sendWordleNudge",executionID,""]
const prependToLog = params.join(" | ")
    
console.info((new Date()).toString()+"|"+prependToLog,"Execution Started")

//let zcql = catalystApp.zcql();

//Get the current time
let currentDate = new Date()
//currentDate.setHours(currentDate.getHours()+5)
//currentDate.setMinutes(currentDate.getMinutes()+30)
console.info((new Date()).toString()+"|"+prependToLog,"Current TimeStamp = ",currentDate)
const currentHour = ("0"+currentDate.getHours()).slice(-2) + ":00"
const currentDt = currentDate.getFullYear()+"-"+("0"+(currentDate.getMonth()+1)).slice(-2)+"-"+("0"+currentDate.getDate()).slice(-2)

//let query = "Select {} from Users left join WordleAttempts on WordleAttempts.UserROWID = Users.ROWID group by Mobile, GlificID, Tags"
//getAllRows("Users.Mobile, Users.GlificID, Users.Tags, max(WordleAttempts.CREATEDTIME)")
User.aggregate([
    {
      $lookup: {
        from: "wordleattempts", // Name of the WordleAttempts collection
        localField: '_id',
        foreignField: 'UserROWID',
        as: 'wordleAttempts'
      }
    },
    {
      $group: {
        _id: { Mobile: '$Mobile', GlificID: '$GlificID', Tags: '$Tags' },
        //Mobile: '$_id.Mobile',
        //GlificID: '$_id.GlificID',
        //Tags: '$_id.Tags',
        CREATEDTIME: { $max: '$wordleAttempts.CREATEDTIME' }
      }
    },
    {
        $unwind:{
            path:"$CREATEDTIME",
            preserveNullAndEmptyArrays:true
        }
    },
    {
        $project:{
            _id: 0,
            Mobile: '$_id.Mobile',
            GlificID: '$_id.GlificID',
            Tags: '$_id.Tags',
            CREATEDTIME: 1
        }
    }
  ])
.then(async (users) =>{
    //If there is no record,
    if(users == null){
        console.error((new Date()).toString()+"|"+prependToLog,'No user');
    }
    else if(users.length == 0){
        console.error((new Date()).toString()+"|"+prependToLog,'No user');
    }
    else if(typeof users[0]==='undefined'){
        console.error((new Date()).toString()+"|"+prependToLog,users);
    }
    else{
        console.info((new Date()).toString()+"|"+prependToLog,"Fetched User Records")    
        const mobiles = users.map(data=>data.Mobile)

        //Fetch all users from Glific BQ who sent a message to bot in last 4 days
        const {BigQuery} = require('@google-cloud/bigquery');
        const bigquery = new BigQuery({
            keyFilename : process.env.GCPAuthFile,
            projectId : process.env.GCPProjectID
        });

        query = "SELECT contact_phone as Mobile, max(format_datetime('%Y-%m-%d %H:%I:%S',inserted_at)) as CREATEDTIME "+
                "FROM `"+process.env.GCPProjectID+".91"+process.env.GlificBotNumber+".messages` "+
                "where flow = 'inbound' and inserted_at >=  (CURRENT_DATE('Asia/Kolkata')- 4) "+
                "and contact_phone in ('91"+mobiles.join("','91")+"') "+
                "group by 1"
        console.info((new Date()).toString()+"|"+prependToLog,`BQ Query: `,query)
        var bqUsers = null
        try{  
            // Run the query as a job
            const [job] = await bigquery.createQueryJob({
                query: query,
                location: 'US',
            });
            console.info((new Date()).toString()+"|"+prependToLog,`BQ Job ${job.id} started.`);
        
            // Wait for the query to finish
            [bqUsers] = await job.getQueryResults();
            console.info((new Date()).toString()+"|"+prependToLog,`BQ Job ${job.id} finished.`);
        }
        catch(error){
            console.info((new Date()).toString()+"|"+prependToLog,`BQ Job ${job.id} Failed. Error:`,error);
        }

        // query = "Select {} from Sessions where Mobile in ("+mobiles.join(",")+") group by Mobile"
        // getAllRows("Mobile, max(CREATEDTIME)")
        Session.aggregate([
            {
              $match: {
                Mobile: { $in: mobiles.map(data=>data.toString()) }
              }
            },
            {
              $group: {
                _id: '$Mobile',
                CREATEDTIME: { $max: '$CREATEDTIME' }
              }
            },
            {
                $project: {
                    _id: 0,
                    Mobile: "$_id",
                    CREATEDTIME: 1
                }
            }
          ])
        .then(async (sessions) =>{
            //If there is no record,
            if(sessions == null){
                console.error((new Date()).toString()+"|"+prependToLog,'No Session Data');
            }
            else if(sessions.length == 0){
                console.error((new Date()).toString()+"|"+prependToLog,'No Session Data');
            }
            else if(typeof sessions[0]==='undefined'){
                console.error((new Date()).toString()+"|"+prependToLog,sessions);
            }
            else{
                console.info((new Date()).toString()+"|"+prependToLog,"Fetched Session Records")
            
                const timer = (sleepTime) => {
                    return new Promise( async (resolve,reject) => {
                        //console.debug((new Date()).toString()+"|"+prependToLog,'Wait for '+sleepTime)
                        setTimeout(resolve, sleepTime)
                    });
                }					
                
                // //let table = catalystApp.datastore().table("SessionEvents")
                //const systemPrompt = await zcql.executeZCQLQuery("Select ROWID from SystemPrompts where Name = 'Dummy' and IsActive = true")
                const systemPrompt = await SystemPrompts.findOne({ Name: 'Dummy', IsActive: true }, 'ROWID');
                const topicID = systemPrompt["_id"]

                const request = require("request");

                var authToken = null;
                var renewToken = null;
                var tokenExpiryTime = null

                //Get Auth Token
                const checkAccessTokenStatus = (renew) => {
                    return new Promise((resolve, reject)=>{
                        const options = {
                            'method': renew==false ? process.env.authMethod : process.env.renewalMethod,
                            'url': renew==false ? process.env.authURL.toString().replace('{1}',process.env.authUser.toString()).replace('{2}',process.env.authPwd.toString()) : process.env.renewalURL.toString().replace('{1}',process.env.renewalUser.toString()).replace('{2}',process.env.renewalPwd.toString()),
                            'headers': renew==false ? {'Content-Type': 'application/json'} : {"Authorization": renewToken},
                            body: JSON.stringify({
                                query: ``,
                                variables: {}
                            })
                        };
                        request(options, function (error, response) {
                            if (error){
                                console.error((new Date()).toString()+"|"+prependToLog,"Error in Glific Authentication API Call: "+error);
                                console.error((new Date()).toString()+"|"+prependToLog,"Request Parameters: "+JSON.stringify(options));
                                reject("GLFC_AUTH_ERR")                            
                            }
                            else if(response.body == 'Something went wrong'){
                                console.error((new Date()).toString()+"|"+prependToLog,"Error returned by Glific Authentication API: "+response.body);
                                console.error((new Date()).toString()+"|"+prependToLog,"Request Parameters: "+JSON.stringify(options));
                                reject("GLFC_AUTH_ERR")
                            }
                            else{
                                try{
                                    let responseBody = JSON.parse(response.body)
                                    //console.debug((new Date()).toString()+"|"+prependToLog,responseBody)
                                    authToken = responseBody.data.access_token;
                                    renewToken = responseBody.data.renewal_token;
                                    tokenExpiryTime = new Date(responseBody.data.token_expiry_time)
                                    console.info((new Date()).toString()+"|"+prependToLog,"Extracted access token from response. Valid till: "+tokenExpiryTime);
                                    resolve(authToken)
                                }
                                catch(e){
                                    console.info((new Date()).toString()+"|"+prependToLog,"Error in getting Auth Token from Glific: "+e,"\nGlific Response: ",response.body,"Request Parameters: "+JSON.stringify(options))
                                    resolve(authToken)
                                }
                            }
                        })
                    })
                }
                
                const invokeGlificAPI = (type='HSM',id,contactID,params=[]) =>{
                    return new Promise(async (resolve, reject)=>{
                        const currentDateTime = new Date();
                        const options = {
                            'method': process.env.operationMethod.toString(),
                            'url': process.env.operationURL.toString(),
                            'headers': {
                                'Authorization': authToken==null ? await checkAccessTokenStatus(false) : ((tokenExpiryTime-currentDateTime) > 60000 ? authToken : await checkAccessTokenStatus(true)),
                                'Content-Type': 'application/json'
                            },
                            body: type=='Flow' ? JSON.stringify({
                                query: `mutation startContactFlow($flowId: ID!, $contactId: ID!) {
                                            startContactFlow(flowId: $flowId, contactId: $contactId) {
                                                success
                                                errors {
                                                    key
                                                    message
                                                }
                                            }
                                        }`,
                                variables: {
                                    "flowId": id,
                                    "contactId": contactID
                                }
                            }) : JSON.stringify({
                                query: `mutation sendHsmMessage($templateId: ID!, $receiverId: ID!, $parameters: [String]) {
                                    sendHsmMessage(templateId: $templateId, receiverId: $receiverId, parameters: $parameters) {
                                        message{
                                            id
                                            body
                                            isHsm
                                        }
                                        errors {
                                            key
                                            message
                                        }
                                    }
                                }`,
                                variables: {
                                    "templateId": id,
                                    "receiverId": contactID,
                                    "parameters": params
                                }
                            })
                        };
                        request(options, async function (error, response) {
                            //If any error in API call throw error
                            if (error){
                                console.error((new Date()).toString()+"|"+prependToLog,(type=='Flow' ? "Error in resuming flow in Glific: " : "Error in sending HSM Message")+error);
                                console.error((new Date()).toString()+"|"+prependToLog,"Request Parameters: "+JSON.stringify(options));
                                reject("GLFC_API_ERR")
                            }
                            else{
                                //console.debug((new Date()).toString()+"|"+prependToLog,'Glific Response: '+response.body+"\n"+
                                //			"\nRequest Parameters: "+JSON.stringify(options));
                                try{
                                    const apiResponse = JSON.parse(response.body)
                                    //If any error retruned by Glific API throw error
                                    if(apiResponse.errors != null)
                                    {
                                        console.error((new Date()).toString()+"|"+prependToLog,"Error returned by Glific API: "+JSON.stringify(apiResponse.errors));
                                        console.error((new Date()).toString()+"|"+prependToLog,"Request Parameters: "+JSON.stringify(options));
                                        reject("GLFC_API_ERR")
                                    }
                                    else
                                    {
                                        const elementData = apiResponse.data
                                        const elementMessage = type=='Flow' ? elementData.startContactFlow : elementData.sendHsmMessage
                                        const elementErrors = elementMessage.errors
                                        if(elementErrors != null) 
                                        {
                                            console.error((new Date()).toString()+"|"+prependToLog,'Error returned by Glific API '+JSON.stringify(apiResponse))
                                            reject("GLFC_API_ERR")
                                        }
                                        else
                                        {
                                            console.info((new Date()).toString()+"|"+prependToLog,type=='Flow' ? "Successfully started Nudge Flow in Glific" : "Successfully sent HSM Message");
                                            resolve("SUCCESS")
                                        }

                                    }
                                }
                                catch(e){
                                    console.error((new Date()).toString()+"|"+prependToLog,"Error returned from Glific: "+e,"\nGlific Response: ",response.body,"Request Parameters: "+JSON.stringify(options));
                                    reject("GLFC_API_ERR")
                                }
                            }
                        });
                    })
                }

                var eventData = {
                    SessionID: "Wordle Nudge",
                    Event : null,
                    SystemPromptROWID: topicID,
                    Mobile:null
                }

                users.forEach(async(record,i)=>{
                    await timer(Math.max(300,(i*1000)/sessions.length))
                    var sessionData = sessions.filter(data=>data.Mobile == record.Mobile)
                    if(sessionData.length==0)
                        sessionData = [{
                            Sessions:{
                                Mobile:record.Mobile,
                                CREATEDTIME: null
                            }
                        }]
                    
                    var bqData = bqUsers.filter(data=>data.Mobile == "91"+record.Mobile)
                    if(bqData.length==0)
                        bqData = [{
                            
                            Mobile:record.Mobile,
                            CREATEDTIME: null
                            
                        }]
                    

                    const latestSessionDt = Math.max(new Date(bqData[0]['CREATEDTIME']), new Date(sessionData[0]['CREATEDTIME']),new Date(record.CREATEDTIME))
                    const sessionDate = new Date(latestSessionDt)
                    const minutesElapsed = Math.floor((currentDate - sessionDate)/1000/60)
                    const daysElapsed = Math.floor((currentDate - sessionDate)/1000/60/60/24)
                    var sendTo24thCohort = false
                    if(currentDt=='2023-07-26'){
                        const tags = record.Tags //(users.filter(data=>data.Users.Mobile == record.Users.Mobile))[0]['Users']['Tags']
                        if(["Cohort-1, 2023-07-24","Cohort-1, 2023-07-25","Cohort-2, 2023-07-24"].includes(tags))
                            sendTo24thCohort = true
                    }                    
                    if(minutesElapsed < 10){
                        try{
                            eventData['Event'] = "Wordle Nudge Not Sent (User Active within 10 min)"
                            eventData['Mobile'] = record.Mobile
                            await SessionEvents.create(eventData)
                        }
                        catch(e){
                            console.error((new Date()).toString()+"|"+prependToLog,i+": Could not update event table for "+ record.Mobile)
                        }
                    }
                    else if((daysElapsed > 4)&&(sendTo24thCohort==false)){
                        try{
                            eventData['Event'] = "Wordle Nudge Not Sent (User Inactive for more than 4 days)"
                            eventData['Mobile'] = record.Mobile
                            await SessionEvents.create(eventData)
                        }
                        catch(e){
                            console.error((new Date()).toString()+"|"+prependToLog,i+": Could not update event table for "+ record.Mobile)
                        }
                    }
                    else{
                        await timer(Math.max(300,(i*1000)/sessions.length))
                        console.info((new Date()).toString()+"|"+prependToLog,i+":Sending Nudge to "+ record.Mobile);
                        const glificID = record.GlificID //(users.filter(data=>data.Users.Mobile == record.Users.Mobile))[0]['Users']['GlificID']
                        for(var index = 0 ; index < 100; index++){
                            try{
                                const output = await invokeGlificAPI("Flow",process.env.WordleNudgeFlowID,glificID)
                                if(output=='SUCCESS'){
                                    console.info((new Date()).toString()+"|"+prependToLog,i+":Nudge sent to "+record.Mobile)
                                    try{
                                        eventData['Event'] = "Wordle Nudge Sent"
                                        eventData['Mobile'] = record.Mobile
                                        await SessionEvents.create(eventData)
                                    }
                                    catch(e){
                                        console.error((new Date()).toString()+"|"+prependToLog,i+": Could not update event table for "+ record.Mobile)
                                    }
                                    break;
                                }
                                else{
                                    console.info((new Date()).toString()+"|"+prependToLog,i+":Nudge not sent to "+record.Mobile+" as OperationStatus = "+nudgeStatus['OperationStatus'])
                                    break;
                                }
                            }
                            catch(err){
                                if(err.toString().includes("TOO_MANY_REQUEST")){
                                    await timer(Math.max(500,(i*1000)/users.length))
                                    console.info((new Date()).toString()+"|"+prependToLog,i+":Retrying Nudge for "+ record.Mobile);
                                }
                                else if(["GLFC_AUTH_API_ERR","GLFC_AUTH_ERR","GLFC_API_ERR"].includes(err)){
                                    await timer(Math.max(500,(i*1000)/users.length))
                                    console.info((new Date()).toString()+"|"+prependToLog,i+":Retrying Nudge for "+ record.Mobile);
                                }
                                else{
                                    console.error((new Date()).toString()+"|"+prependToLog,i+":Nudge not sent to "+record.Mobile+" due to error: ",err)
                                    break;
                                }
                            }
                        }
                    }
                });
            }
        }).catch(err => {
            console.error((new Date()).toString()+"|"+prependToLog,'Closing Execution. Encountered Error in getting Session records: '+err)
        })
    }
    console.info((new Date()).toString()+"|"+prependToLog,"Closing Execution. No records retruned by query")
}).catch(err => {
    console.error((new Date()).toString()+"|"+prependToLog,'Closing Execution. Encountered Error in getting User records: '+err)
})

"use strict";

const express = require("express");
// const catalyst = require('zcatalyst-sdk-node');
const catalyst = require("zoho-catalyst-sdk");
const sendResponseToGlific = require("./common/sendResponseToGlific.js");
const WordleAttempts = require("./models/WordleAttempts.js");
const User = require("./models/Users.js");
const WordleConfiguration = require("./models/WordleConfiguration.js");
// const app = express();
// app.use(express.json());
const app = express.Router();

//Filter unique elements in an array
const unique = (value, index, self) => {
  return self.indexOf(value) === index;
};

//Check key in object
const checkKey = (ki,obj) => {
  const tokens = ki == null ? [] : Array.isArray(ki) ? ki : ki.split(",")
  const missingTokens = []
  for(var i = 0; i < tokens.length; i++){
    if(typeof obj[tokens[i]] === 'undefined')
      missingTokens.push(tokens[i])
  }
  return missingTokens
}

const checkType = (keyTypePair, obj) => {
  const tokens = keyTypePair == null ? [] : keyTypePair
  const invalidTokens = []
  for(var i = 0; i < tokens.length; i++){
    const ki = tokens[i]["keyName"]
    const tipe = tokens[i]["type"]
    if((tipe=='date')  && isNaN(Date.parse(obj[ki])))
      invalidTokens.push(ki)
    else if((tipe=='int')  && isNaN(parseInt((obj[ki]))))
      invalidTokens.push(ki)
  }
  return invalidTokens

}

app.post("/userstatus", (req, res) => {
    let startTimeStamp = new Date();

    const requestBody = req.body;
 
    const executionID = Math.random().toString(36).slice(2)
    
    //Prepare text to prepend with logs
    const params = ["wordleOfDay",req.url,executionID,""]
    const prependToLog = params.join(" | ")
    
    console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")

    const missingParams = checkKey(["Mobile"],requestBody)

    var responseObject = {
        "OperationStatus" : "SUCCESS"
    }

    if(missingParams.length>0){
        responseObject['OperationStatus'] = "REQ_ERR"
        responseObject['StatusDescription'] = "Missing field - "+missingParams.join(",")
        console.info((new Date()).toString()+"|"+prependToLog,"End of Execution")
        console.debug((new Date()).toString()+"|"+prependToLog,"End of Execution. Response:",responseObject)
        res.status(200).json(responseObject)
    }
    else {
        //Total total wordle attempts today
        var currentDate = new Date()
        //currentDate.setHours(currentDate.getHours()+5)
        //currentDate.setMinutes(currentDate.getMinutes()+30)
        const currentTime = ('0'+currentDate.getHours()).slice(-2)+":"+('0'+currentDate.getMinutes()).slice(-2)
        var wordleDate = null
        if((currentTime>='00:00')&&(currentTime<=process.env.WordleStartTime))
            currentDate.setDate(currentDate.getDate()-1)
        wordleDate = currentDate.getFullYear()+"-"+('0'+(currentDate.getMonth()+1)).slice(-2)+"-"+('0'+currentDate.getDate()).slice(-2)

        console.info((new Date()).toString()+"|"+prependToLog,"Wordle Date="+wordleDate)

        // let query = "select Users.ROWID, Users.WordleLevel, WordleAttempts.ROWID, WordleAttempts.WordleROWID, WordleAttempts.Answer, WordleAttempts.IsCorrect "+
        // "from Users left join WordleAttempts on Users.ROWID = WordleAttempts.UserROWID"+
        // " where Mobile = "+requestBody['Mobile'].slice(-10)+
        // " order by WordleAttempts.CREATEDTIME ASC"
        // zcql.executeZCQLQuery(query)
        const mobileSuffix = requestBody['Mobile'].slice(-10);

        User.aggregate([
            {
              $match: { Mobile: mobileSuffix },
            },
            {
              $lookup: {
                from: 'WordleAttempts', // Replace with the actual name of the WordleAttempts collection
                localField: '_id',
                foreignField: 'UserROWID',
                as: 'WordleAttempts',
              },
            },
            {
              $unwind: {
                path: '$WordleAttempts',
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $project: {
                '_id': 1,
                'WordleLevel': 1,
                'WordleAttempts._id': 1,
                'WordleAttempts.WordleROWID': 1,
                'WordleAttempts.Answer': 1,
                'WordleAttempts.IsCorrect': 1,
              },
            },
            {
              $sort: {
                'WordleAttempts.CREATEDTIME': 1,
              },
            },
          ])
        .then(async (allWordleAttempts)=>{
            console.debug((new Date()).toString()+"|"+prependToLog,"QueryResult=",allWordleAttempts)
            if(allWordleAttempts.length==0){
                responseObject['OperationStatus'] = "USR_NT_FND"
                responseObject['StatusDescription'] = "User not present in database"
                console.info((new Date()).toString()+"|"+prependToLog,"End of Execution")
                console.debug((new Date()).toString()+"|"+prependToLog,"End of Execution. Response:",responseObject)
                res.status(200).json(responseObject)
            }
            else if(allWordleAttempts.includes("ZCQL QUERY ERR")){
                responseObject['OperationStatus'] = "APP_ERR"
                responseObject['StatusDescription'] = allWordleAttempts
                console.info((new Date()).toString()+"|"+prependToLog,"End of Execution")
                console.debug((new Date()).toString()+"|"+prependToLog,"End of Execution. Response:",responseObject)
                res.status(200).json(responseObject)
            }
            else{
                var userWordleLevel = allWordleAttempts[0]['Users']['WordleLevel']
                if(userWordleLevel==null){
                    console.info((new Date()).toString()+"|"+prependToLog,"Determining User's Wordle Level")   
                    const wordles = allWordleAttempts.map(data=>data.WordleAttempts.WordleROWID).filter(unique)
                    var wordleStatus = wordles.map(wordle=>{
                        const totalRecords = allWordleAttempts.filter(data=>(wordle==data.WordleAttempts.WordleROWID))
                        return{
                            "WordleROWID" : wordle,
                            "IsCorrect" : (allWordleAttempts.some(data=>(wordle==data.WordleAttempts.WordleROWID) && (data.WordleAttempts.IsCorrect==true))),
                            "TotalRecords":totalRecords.length
                        }
                    })
                    wordleStatus = wordleStatus.filter(data=>(data.IsCorrect == true)||((data.IsCorrect == false)&&(data.TotalRecords >= 5)))
                    console.debug((new Date()).toString()+"|"+prependToLog,"Wordles Attempted by User",wordleStatus)
                    if(wordleStatus.length>=2){
                        
                        const totalCorrectWordles = (wordleStatus.filter(data=>data.IsCorrect == true)).length

                        console.debug((new Date()).toString()+"|"+prependToLog,"Total Correct Wordles in 1st two = "+totalCorrectWordles)   
                        console.info((new Date()).toString()+"|"+prependToLog,"Updating User's Wordle Level")   
                        const updateData= {
                            WordleLevel:totalCorrectWordles == 2? 'C':totalCorrectWordles == 1 ? 'B' : 'A'
                        }

                        await User.updateOne({"_id":allWordleAttempts[0]._id},updateData);
                        console.info((new Date()).toString()+"|"+prependToLog,"Updated User's Wordle Level") 
                        userWordleLevel =  updateData['WordleLevel'] 
                    }
                    else{
                        console.info((new Date()).toString()+"|"+prependToLog,"User yet to attempt two wordles")   
                        userWordleLevel = 'A'
                    }
                }      
                console.debug((new Date()).toString()+"|"+prependToLog,"User's Wordle Level="+userWordleLevel)
                // query = "Select * from WordleConfiguration where WordleDate = '"+wordleDate+"' and EnglishLevel = '"+userWordleLevel+"'"
                // zcql.executeZCQLQuery(query)
                WordleConfiguration.find(
                    { WordleDate: wordleDate, EnglishLevel: userWordleLevel })
                .then((wordleofday)=>{
                    console.debug((new Date()).toString()+"|"+prependToLog,"WordleOfDay=",wordleofday)
                    if(wordleofday.includes("ZCQL QUERY ERR")){
                        responseObject['OperationStatus'] = "APP_ERR"
                        responseObject['StatusDescription'] = wordleofday
                        console.info((new Date()).toString()+"|"+prependToLog,"End of Execution")
                        console.debug((new Date()).toString()+"|"+prependToLog,"End of Execution. Response:",responseObject)
                        res.status(200).json(responseObject)
                    }
                    else if(wordleofday.length>0){
                        console.info((new Date()).toString()+"|"+prependToLog,"Got wordle of day")
                        responseObject['Word'] = wordleofday[0]['WordleConfiguration']['Word']
                        responseObject['Translation'] = wordleofday[0]['WordleConfiguration']['WordTranslation']
                        responseObject['Definition'] = wordleofday[0]['WordleConfiguration']['Definition']
                        responseObject['Example'] = wordleofday[0]['WordleConfiguration']['Example']
                        responseObject['RecommendedTopic'] = wordleofday[0]['WordleConfiguration']['RecommendedTopic']
                        responseObject['WordleID'] = wordleofday[0]['WordleConfiguration']['ROWID']
                        
                        const wordleAttempts = allWordleAttempts.filter(data=>data.WordleAttempts.WordleROWID == wordleofday[0]['WordleConfiguration']['ROWID'])
                        
                        const totalAttempts = wordleAttempts.length
                        console.info((new Date()).toString()+"|"+prependToLog,"Total Attempts="+totalAttempts+" | Max Attempts="+wordleofday[0]['WordleConfiguration']['MaxAttempts'])
                        if(wordleAttempts.some(data=>data.WordleAttempts.IsCorrect==true)){
                            responseObject['OperationStatus'] = "ANSWRD_CRRCT"
                            responseObject['StatusDescription'] = "Wordle answered correctly by user"
                        }
                        else if(totalAttempts >= wordleofday[0]['WordleConfiguration']['MaxAttempts']){
                            responseObject['OperationStatus'] = "MAX_ATTMPTS_RCHD"
                            responseObject['StatusDescription'] = "Max Attempts Reached by User"
                        }
                        else{
                            responseObject['PendingAttempts'] = wordleofday[0]['WordleConfiguration']['MaxAttempts'] - totalAttempts
                            var hints = []
                            var index = 1;
                            for(var i=0; i<wordleAttempts.length; i++){
                                var hintText = ''
                                var noMatch = true
                                for(var j=0; j<wordleofday[0]['WordleConfiguration']['Word'].length; j++){
                                    if(typeof wordleAttempts[i]['WordleAttempts']['Answer'][j]==='undefined')
                                        hintText += ' _'
                                    else if(wordleofday[0]['WordleConfiguration']['Word'][j].toLowerCase()==wordleAttempts[i]['WordleAttempts']['Answer'][j].toLowerCase()){
                                        hintText += wordleofday[0]['WordleConfiguration']['Word'][j]
                                        noMatch = false
                                    }
                                    else
                                        hintText += ' _'
                                }
                                if(noMatch==false){
                                    hints.push(""+(index)+". "+hintText)
                                    index++
                                }
                            }
                            responseObject['Hint'] = hints.length == 0 ? wordleofday[0]['WordleConfiguration']['Hint'] : hints.join("\n")
                            responseObject['IsStart'] = hints.length == 0
                            responseObject['FirstLetter'] = wordleofday[0]['WordleConfiguration']['Word'][0]
                            for(var k=1; k<wordleofday[0]['WordleConfiguration']['Word'].length; k++)
                                responseObject['FirstLetter'] += " _"
                        }
                        console.info((new Date()).toString()+"|"+prependToLog,"End of Execution")
                        console.debug((new Date()).toString()+"|"+prependToLog,"End of Execution. Response:",responseObject)
                        res.status(200).json(responseObject)
                    }
                    else{
                        responseObject['OperationStatus'] = "NO_WRDL"
                        responseObject['StatusDescription'] = "No wordle configured yet"
                        console.info((new Date()).toString()+"|"+prependToLog,"End of Execution")
                        console.debug((new Date()).toString()+"|"+prependToLog,"End of Execution. Response:",responseObject)
                        res.status(200).json(responseObject)
                    }
                    //Send Reponse to Glific
                    let endTimeStamp = new Date();
                    let executionDuration = (endTimeStamp - startTimeStamp) / 1000;
                    if (executionDuration > 5) {
                        sendResponseToGlific({
                            flowID: requestBody["FlowID"],
                            contactID: requestBody["contact"]["id"],
                            resultJSON: JSON.stringify({
                                wordlestatus: responseObject,
                            }),
                        })
                        .then((glificResponse) => {})
                        .catch((err) => console.log("Error returned from Glific: ", err));
                    }
                })
                .catch((error)=>{
                    console.error((new Date()).toString()+"|"+prependToLog,"Error in getting wordle of day: \n",query,"\n",error)
                    res.status(500).send(error)
                })
            }
        })
        .catch((error)=>{
            console.error((new Date()).toString()+"|"+prependToLog,"Error in getting wordle attempts of user: \n","\n",error)
            res.status(500).send(error)
        })
    }
})

app.post("/storeuserresponse", (req, res) => {
    let startTimeStamp = new Date();
    // let catalystApp = catalyst.initialize(req, { type: catalyst.type.applogic });
    
    const requestBody = req.body;
 
    const executionID = Math.random().toString(36).slice(2)
    
    //Prepare text to prepend with logs
    const params = ["wordleOfDay",req.url,executionID,""]
    const prependToLog = params.join(" | ")
    
    console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")

    const missingParams = checkKey(["Mobile","Response","WordleROWID"],requestBody)

    var responseObject = {
        "OperationStatus" : "SUCCESS"
    }

    if(missingParams.length>0){
        responseObject['OperationStatus'] = "REQ_ERR"
        responseObject['StatusDescription'] = "Missing field - "+missingParams.join(",")
        console.info((new Date()).toString()+"|"+prependToLog,"End of Execution")
        console.debug((new Date()).toString()+"|"+prependToLog,"End of Execution. Response:",responseObject)
        res.status(200).json(responseObject)
    }
    else {
        //Getting ROWID of Student
        // let zcql = catalystApp.zcql()
        // let query = "Select ROWID, WordleLevel from Users where Mobile = "+requestBody['Mobile'].slice(-10)
        // zcql.executeZCQLQuery(query)
        console.log("requestBody['Mobile'].slice(-10)",requestBody['Mobile'].slice(-10));
        User.findOne(
            { Mobile: requestBody['Mobile'].slice(-10) }, // Condition to match
            '_id WordleLevel')
        .then((user)=>{

            console.debug((new Date()).toString()+"|"+prependToLog,"Query=",user)
            if(user){
                console.info((new Date()).toString()+"|"+prependToLog,"Got Student Record")
                // query = "Select Word from WordleConfiguration where ROWID = "+requestBody['WordleROWID']
                // zcql.executeZCQLQuery(query)
                WordleConfiguration.findOne(
                    { _id: requestBody['WordleROWID'] }, // Condition to match
                    'Word')
                .then((wordleofday)=>{
                    console.debug((new Date()).toString()+"|"+prependToLog,"Query=")
                    if(wordleofday.length>0){
                        //------27/07/2023:rbhushan@dhwaniris.com : Skipped world length check on CR from sahana.madlapur
                        if(1==0){//wordleofday[0]['WordleConfiguration']['Word'].length!=requestBody['Response'].length){
                            responseObject['OperationStatus'] = "WRD_LNGTH_ERR"
                            responseObject['StatusDescription'] = "The word must be of "+wordleofday[0]['Word'].length+" characters only"
                        }
                        else{
                            const insertData = {
                                UserROWID : user[0]['_id'],
                                WordleROWID : requestBody['WordleROWID'],
                                Answer : requestBody['Response'],
                                IsCorrect : requestBody['Response'].toLowerCase()==wordleofday[0]['Word'].toLowerCase(),
                                Source : requestBody['WordleSource'].startsWith("@result") ? "Wordle Reminder" : requestBody['WordleSource'],
                                SystemPromptROWID : requestBody['TopicID'] ? (requestBody['TopicID'].startsWith("@result") ? null:requestBody['TopicID']):null
                            }
                           // let table = catalystApp.datastore().table('WordleAttempts')
                           WordleAttempts.create(insertData)
                            .then(async (row)=>{
                                // if(typeof row['ROWID'] !== 'undefined'){
                                //     responseObject['IsCorrectResponse'] = insertData['IsCorrect']  
                                // }
                                // else{
                                //     responseObject['OperationStatus'] = "APP_ERR"
                                //     responseObject['StatusDescription'] = row
                                // }
                                console.info((new Date()).toString()+"|"+prependToLog,"Row data",row)
                            })
                        }
                        console.info((new Date()).toString()+"|"+prependToLog,"End of Execution")
                        console.debug((new Date()).toString()+"|"+prependToLog,"End of Execution. Response:",responseObject)
                        res.status(200).json(responseObject)
                        //Send Reponse to Glific
                        let endTimeStamp = new Date();
                        let executionDuration = (endTimeStamp - startTimeStamp) / 1000;
                        if (executionDuration > 5) {
                            sendResponseToGlific({
                                flowID: requestBody["FlowID"],
                                contactID: requestBody["contact"]["id"],
                                resultJSON: JSON.stringify({
                                    storeanswer: responseObject,
                                }),
                            })
                            .then((glificResponse) => {})
                            .catch((err) => console.log("Error returned from Glific: ", err));
                        }
                    }
                    else{
                        responseObject['OperationStatus'] = "NO_WRDL"
                        responseObject['StatusDescription'] = "No wordle configured yet"
                        console.info((new Date()).toString()+"|"+prependToLog,"End of Execution")
                        console.debug((new Date()).toString()+"|"+prependToLog,"End of Execution. Response:",responseObject)
                        res.status(200).json(responseObject)
                    }
                })
                .catch((error)=>{
                    console.error((new Date()).toString()+"|"+prependToLog,"Error in getting wordle of day: \n","\n",error)
                    res.status(500).send(error)
                })
            }
            else{
                responseObject['OperationStatus'] = "NO_USER"
                responseObject['StatusDescription'] = "User not found"
                console.info((new Date()).toString()+"|"+prependToLog,"End of Execution")
                console.debug((new Date()).toString()+"|"+prependToLog,"End of Execution. Response:",responseObject)
                res.status(200).json(responseObject)
            }
        })
        .catch((error)=>{
            console.error((new Date()).toString()+"|"+prependToLog,"Error in getting user record: \n",query,"\n",error)
            res.status(500).send(error)
        })
    }
})

module.exports = app;
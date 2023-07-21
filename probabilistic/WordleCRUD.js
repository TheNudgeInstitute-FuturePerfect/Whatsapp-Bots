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

app.post("/", (req, res) => {
    let startTimeStamp = new Date();
    let catalystApp = catalyst.initialize(req, { type: catalyst.type.applogic });
    
    const requestBody = req.body;
 
    const executionID = Math.random().toString(36).slice(2)
    
    //Prepare text to prepend with logs
    const params = ["wordleOfDay",req.method,executionID,""]
    const prependToLog = params.join(" | ")
    
    console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")
    
    //Initialize Response Object
    var responseObject = {
        "OperationStatus":"SUCCESS"
    }
    
    const missingParams = checkKey(["Date","Word","Hint","Definition","RecommendedTopic","MaxAttempts","EnglishLevel"],requestBody)

    if(missingParams.length>0){
        responseObject['OperationStatus'] = "REQ_ERR"
        responseObject['StatusDescription'] = "Missing field - "+missingParams.join(",")
        console.info((new Date()).toString()+"|"+prependToLog,"End of Execution")
        console.debug((new Date()).toString()+"|"+prependToLog,"End of Execution. Response:",responseObject)
        res.status(200).json(responseObject)
    }
    else {
      const invalidParams = checkType([{
        "keyName":"Date",
        "type":'date'
      },{
        "keyName":"MaxAttempts",
        "type":"int"
      }],requestBody)
      if(invalidParams.length>0){
        responseObject['OperationStatus'] = "REQ_ERR"
        responseObject['StatusDescription'] = "Invalid value for fields - "+invalidParams.join(",")
        console.info((new Date()).toString()+"|"+prependToLog,"End of Execution")
        console.debug((new Date()).toString()+"|"+prependToLog,"End of Execution. Response:",responseObject)
        res.status(200).json(responseObject)
      }
      else{
        try{
          let insertData = {
            WordleDate:new Date(requestBody['Date']),
            Word:requestBody['Word'],
            WordTranslation:requestBody['Translation'],
            Definition:requestBody['Definition'],
            Hint:requestBody['Hint'],
            Example:requestBody['Example'],
            RecommendedTopic:requestBody['RecommendedTopic'],
            MaxAttempts:requestBody['MaxAttempts'],
            EnglishLevel:requestBody['EnglishLevel'],
          }
          const table = catalystApp.datastore().table("WordleConfiguration")
          table.insertRow(insertData)
          .then((row)=>{
            if(typeof row['Word'] === 'undefined'){
              responseObject['OperationStatus'] = "APP_ERR"
              responseObject['StatusDescription'] = row        
            }
            console.info((new Date()).toString()+"|"+prependToLog,"End of Execution")
            console.debug((new Date()).toString()+"|"+prependToLog,"End of Execution. Response:",responseObject,"\nInserted Data: ",row)
            res.status(200).json(responseObject)
          })
          .catch((error)=>{
              console.error((new Date()).toString()+"|"+prependToLog,"Error in inserting data: ",error)
              res.status(500).send(error)
          })
        }
        catch(e){
          console.error((new Date()).toString()+"|"+prependToLog,"Error in inserting data: ",e)
          res.status(500).send(e)
        }
      }
    }
})

app.get("/", (req, res) => {
  let startTimeStamp = new Date();
  let catalystApp = catalyst.initialize(req, { type: catalyst.type.applogic });
  
  const requestBody = req.body;

  const executionID = Math.random().toString(36).slice(2)
  
  //Prepare text to prepend with logs
  const params = ["wordleOfDay",req.method,executionID,""]
  const prependToLog = params.join(" | ")
  
  console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")
  
  //Initialize Response Object
  var responseObject = {
      "OperationStatus":"SUCCESS"
  }

  const wordleDate = req.query.Date
  const word = req.query.Word
  const recommendedTopic = req.query.RecommendedTopic
  const maxAttempts = req.query.MaxAttempts

  const checkTypeData = []
  if(typeof wordleDate !== 'undefined')
    checkTypeData.push({
      "keyName":"Date",
      "type":'date'
    })
  if(typeof maxAttempts !== 'undefined')
    checkTypeData.push({
      "keyName":"MaxAttempts",
      "type":"int"
    })

  const invalidParams = checkType(checkTypeData,req.query)

  if(invalidParams.length>0){
    responseObject['OperationStatus'] = "REQ_ERR"
    responseObject['StatusDescription'] = "Invalid value for fields - "+invalidParams.join(",")
    console.info((new Date()).toString()+"|"+prependToLog,"End of Execution")
    console.debug((new Date()).toString()+"|"+prependToLog,"End of Execution. Response:",responseObject)
    res.status(200).json(responseObject)
  }
  else{
    let query = "select * from WordleConfiguration"
    let whereConditions = []
    if(typeof wordleDate !== 'undefined')
      whereConditions.push("WordleDate='"+wordleDate+"'")
    if(typeof word !== 'undefined')
      whereConditions.push("Word='"+wordleDate+"'")
    if(typeof recommendedTopic !== 'undefined')
      whereConditions.push("RecommendedTopic='"+recommendedTopic+"'")
    if(typeof maxAttempts !== 'undefined')
      whereConditions.push("MaxAttepts="+maxAttempts)
    if(whereConditions.length>0)
      query = query + " where " + whereConditions.join("and")
    
    let zcql = catalystApp.zcql()
    zcql.executeZCQLQuery(query)
    .then((wordle)=>{
      if(wordle.length==0){
        responseObject['OperationStatus'] = "APP_ERR"
        responseObject['StatusDescription'] = "No record satisfying the given condition"
      }
      else{
        responseObject['WordleData'] = wordle.map(data=>{
          return {
            ROWID : data.WordleConfiguration.ROWID,
            Date : data.WordleConfiguration.WordleDate,
            Word : data.WordleConfiguration.Word,
            Translation : data.WordleConfiguration.WordTranslation,
            Definition : data.WordleConfiguration.Definition,
            Hint : data.WordleConfiguration.Hint,
            Example : data.WordleConfiguration.Example,
            RecommendedTopic : data.WordleConfiguration.RecommendedTopic,
            MaxAttempts : data.WordleConfiguration.MaxAttempts,
            EnglishLevel  : data.WordleConfiguration.EnglishLevel
          }
        })
      }
      console.info((new Date()).toString()+"|"+prependToLog,"End of Execution")
      console.debug((new Date()).toString()+"|"+prependToLog,"End of Execution. Response:",responseObject)
      res.status(200).json(responseObject)
    })
    .catch((error)=>{
        console.error((new Date()).toString()+"|"+prependToLog,"Error in getting data: ",error)
        res.status(500).send(error)
    })
  }
})

app.patch("/", (req, res) => {
  let startTimeStamp = new Date();
  let catalystApp = catalyst.initialize(req, { type: catalyst.type.applogic });
  
  const requestBody = req.body;

  const executionID = Math.random().toString(36).slice(2)
  
  //Prepare text to prepend with logs
  const params = ["wordleOfDay",req.method,executionID,""]
  const prependToLog = params.join(" | ")
  
  console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")
  
  //Initialize Response Object
  var responseObject = {
      "OperationStatus":"SUCCESS"
  }
  
  const missingParams = checkKey(["ROWID"],requestBody)

  if(missingParams.length>0){
      responseObject['OperationStatus'] = "REQ_ERR"
      responseObject['StatusDescription'] = "Missing field - "+missingParams.join(",")
      console.info((new Date()).toString()+"|"+prependToLog,"End of Execution")
      console.debug((new Date()).toString()+"|"+prependToLog,"End of Execution. Response:",responseObject)
      res.status(200).json(responseObject)
  }
  else {
    const checkTypeData = []
    if(typeof requestBody['Date'] !== 'undefined')
      checkTypeData.push({
        "keyName":"Date",
        "type":'date'
      })
    if(typeof requestBody['MaxAttempts'] !== 'undefined')
      checkTypeData.push({
        "keyName":"MaxAttempts",
        "type":"int"
      })

    const invalidParams = checkType(checkTypeData,requestBody)

    if(invalidParams.length>0){
      responseObject['OperationStatus'] = "REQ_ERR"
      responseObject['StatusDescription'] = "Invalid value for fields - "+invalidParams.join(",")
      console.info((new Date()).toString()+"|"+prependToLog,"End of Execution")
      console.debug((new Date()).toString()+"|"+prependToLog,"End of Execution. Response:",responseObject)
      res.status(200).json(responseObject)
    }
    else{
      try{
        let updateData = {
          ROWID:requestBody['ROWID'],
          WordleDate:new Date(requestBody['Date']),
          Word:requestBody['Word'],
          WordTranslation:requestBody['Translation'],
          Definition:requestBody['Definition'],
          Hint:requestBody['Hint'],
          Example:requestBody['Example'],
          RecommendedTopic:requestBody['RecommendedTopic'],
          MaxAttempts:requestBody['MaxAttempts'],
          EnglishLevel:requestBody['EnglishLevel']
        }
        const table = catalystApp.datastore().table("WordleConfiguration")
        table.updateRow(updateData)
        .then((row)=>{
          if(typeof row['Word'] === 'undefined'){
            responseObject['OperationStatus'] = "APP_ERR"
            responseObject['StatusDescription'] = row        
          }
          console.info((new Date()).toString()+"|"+prependToLog,"End of Execution")
          console.debug((new Date()).toString()+"|"+prependToLog,"End of Execution. Response:",responseObject,"\nUpated Data: ",row)
          res.status(200).json(responseObject)
        })
        .catch((error)=>{
            console.error((new Date()).toString()+"|"+prependToLog,"Error in updating data: ",error)
            res.status(500).send(error)
        })
      }
      catch(e){
        console.error((new Date()).toString()+"|"+prependToLog,"Error in updating data: ",e)
        res.status(500).send(e)
      }
    }
  }
})

app.delete("/*", (req, res) => {
  let startTimeStamp = new Date();
  let catalystApp = catalyst.initialize(req, { type: catalyst.type.applogic });
  
  const requestBody = req.body;

  const executionID = Math.random().toString(36).slice(2)
  
  //Prepare text to prepend with logs
  const params = ["wordleOfDay",req.method,executionID,""]
  const prependToLog = params.join(" | ")
  
  console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")
  
  //Initialize Response Object
  var responseObject = {
      "OperationStatus":"SUCCESS"
  }
  const rowID = req.url.substring(1,req.url.length)

  if(rowID.length==0){
      responseObject['OperationStatus'] = "REQ_ERR"
      responseObject['StatusDescription'] = "send the ROWID in url e.g. /wordle/198978766545"
      console.info((new Date()).toString()+"|"+prependToLog,"End of Execution")
      console.debug((new Date()).toString()+"|"+prependToLog,"End of Execution. Response:",responseObject)
      res.status(200).json(responseObject)
  }
  else {
    let zcql = catalystApp.zcql()
    zcql.executeZCQLQuery("Delete from WordleConfiguration where ROWID = "+rowID)
    .then((row)=>{
      if((row.length > 0) && (row[0]['WordleConfiguration']['DELETED_ROWS_COUNT']<=0)){
        responseObject['OperationStatus'] = "APP_ERR"
        responseObject['StatusDescription'] = "No such record with ROWID = "+rowID
      }
      console.info((new Date()).toString()+"|"+prependToLog,"End of Execution")
      console.debug((new Date()).toString()+"|"+prependToLog,"End of Execution. Response:",responseObject,"\nUpated Data: ",row)
      res.status(200).json(responseObject)
    })
    .catch((error)=>{
        console.error((new Date()).toString()+"|"+prependToLog,"Error in updating data: ",error)
        res.status(500).send(error)
    })
  }
})

module.exports = app;
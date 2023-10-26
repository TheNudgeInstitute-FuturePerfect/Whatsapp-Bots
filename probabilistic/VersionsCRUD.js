"use strict";

const express = require("express");
// const catalyst = require('zcatalyst-sdk-node');
//const catalyst = require("zoho-catalyst-sdk");
const versions = require("./models/versions.js")
// const app = express();
// app.use(express.json());
const bodyParser = require('body-parser')

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

app.post("/", (req, res) => {
    
    const requestBody = req.body;

    const executionID = Math.random().toString(36).slice(2)
 
    //Prepare text to prepend with logs
    const params = ["Versions",req.method,executionID,""]
    const prependToLog = params.join(" | ")
    
    console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")
    
    //Initialize Response Object
    var responseJSON = {
        "OperationStatus":"SUCCESS"
    }

    const validateRequest = checkKey(["Version","StartDate","Sequence"],requestBody)
    if(validateRequest.length > 0){
      responseJSON["OperationStatus"] = "REQ_ERR"
      responseJSON["StatusDescription"] = "Missing params: "+validateRequest
      console.info((new Date()).toString()+"|"+prependToLog,"End of Execution. Response:",responseJSON)
      res.status(200).json(responseJSON)
    }
    else{
      versions.create(requestBody)
      .then((config)=>{
          responseJSON["VersionID"] = config["id"]
          console.info((new Date()).toString()+"|"+prependToLog,"End of Execution. Response:",responseJSON)
          res.status(200).json(responseJSON)
      })
      .catch((error)=>{
          console.info((new Date()).toString()+"|"+prependToLog,"End of Execution. Response:",responseJSON)
          console.error((new Date()).toString()+"|"+prependToLog,"End of Execution. Error:",error)
          res.status(500).send(error)
      })
    }
});

app.get("/", (req, res) => {
    
  const executionID = Math.random().toString(36).slice(2)

  //Prepare text to prepend with logs
  const params = ["Versions",req.method,req.url,executionID,""]
  const prependToLog = params.join(" | ")
  
  console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")
    
  let filter = {}
  /*if(typeof req.params["Version"] !== 'undefined'){
    filter["Version"] = req.params["Version"]
  }*/

  versions.find(filter)
  .then((config)=>{
      console.info((new Date()).toString()+"|"+prependToLog,"End of Execution. Response:",config)
      res.status(200).json(config)
  })
  .catch((error)=>{
      console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error")
      console.error((new Date()).toString()+"|"+prependToLog,"End of Execution. Error:",error)
      res.status(500).send(error)
  })
});

app.patch("/:Version", (req, res) => {
    
  const executionID = Math.random().toString(36).slice(2)

  //Prepare text to prepend with logs
  const params = ["Versions",req.method,req.url,executionID,""]
  const prependToLog = params.join(" | ")
  
  console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")
  
  let filter = {}
  if(typeof req.params["Version"] !== 'undefined'){
    filter["Version"] = req.params["Version"]
  }
  
  versions.findOneAndUpdate(filter,req.body, {new:true})
  .then((config)=>{
      console.info((new Date()).toString()+"|"+prependToLog,"End of Execution. Response:",config)
      res.status(200).json(config)
  })
  .catch((error)=>{
      console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error")
      console.error((new Date()).toString()+"|"+prependToLog,"End of Execution. Error:",error)
      res.status(500).send(error)
  })
});

app.put("/:Version", (req, res) => {
    
  const executionID = Math.random().toString(36).slice(2)

  //Prepare text to prepend with logs
  const params = ["Versions",req.method,req.url,executionID,""]
  const prependToLog = params.join(" | ")
  
  console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")
  
  let filter = {}
  if(typeof req.params["Version"] !== 'undefined'){
    filter["Version"] = req.params["Version"]
  }
  
  versions.findOneAndReplace(filter,req.body, {new:true})
  .then((config)=>{
      console.info((new Date()).toString()+"|"+prependToLog,"End of Execution. Response:",config)
      res.status(200).json(config)
  })
  .catch((error)=>{
      console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error.")
      console.error((new Date()).toString()+"|"+prependToLog,"End of Execution. Error:",error)
      res.status(500).send(error)
  })
});

app.delete("/:id", (req, res) => {
    
  const executionID = Math.random().toString(36).slice(2)

  //Prepare text to prepend with logs
  const params = ["Versions",req.method,req.url,executionID,""]
  const prependToLog = params.join(" | ")
  
  console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")
  
  versions.findByIdAndDelete(req.params['id'])
  .then((config)=>{
      console.info((new Date()).toString()+"|"+prependToLog,"End of Execution. Response:",config)
      res.status(200).json(config)
  })
  .catch((error)=>{
      console.info((new Date()).toString()+"|"+prependToLog,"End of Execution.")
      console.error((new Date()).toString()+"|"+prependToLog,"End of Execution. Error:",error)
      res.status(500).send(error)
  })
  
});


module.exports = app;

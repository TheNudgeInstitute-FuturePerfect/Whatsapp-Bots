"use strict"

const express = require("express");
// const catalyst = require('zcatalyst-sdk-node');
const catalyst = require("zoho-catalyst-sdk");

// const app = express();
// app.use(express.json());
const app = express.Router();

app.post("/getproficiency", (req, res) => {

    let catalystApp = catalyst.initialize(req, {type: catalyst.type.applogic});

	const requestBody = req.body;
	
	var result = {
		OperationStatus:"SUCCESS"
	}

	let mobile = requestBody["Mobile"];
	if(typeof mobile === 'undefined'){
		result['OperationStatus'] = "REQ_ERR"
		result['StatusDescription'] = "Missing required parameter - Mobile"
		console.log("End of Execution: ",result)
		res.status(200).json(result)
	}
	else{
		mobile = mobile.toString().slice(-10)
		let segment = requestBody["Segment"];
		if(typeof segment === 'undefined'){
			result['OperationStatus'] = "REQ_ERR"
			result['StatusDescription'] = "Missing required parameter - Segment"
			console.log("End of Execution: ",result)
			res.status(200).json(result)
		}
		else{
			let questions = requestBody["Questions"];
			if(typeof questions === 'undefined'){
				result['OperationStatus'] = "REQ_ERR"
				result['StatusDescription'] = "Missing required parameter - Questions"
				console.log("End of Execution: ",result)
				res.status(200).json(result)
			}
			else{
				let zcql = catalystApp.zcql()
				zcql.executeZCQLQuery("Select UserData.CREATEDTIME, UserData.Question, UserData.Answer from UserData left join Users on UserData.UserROWID = Users.ROWID where Segment = '"+segment+"' and Users.Mobile = "+mobile+" order by UserData.CREATEDTIME DESC")
				.then((userdata)=>{
					if(typeof userdata === 'undefined'){
						result['OperationStatus'] = "NO_DATA"
						result['StatusDescription'] = "No question-answer record for the given segment and user"
						console.log("End of Execution: ",result)
						res.status(200).json(result)
					}
					else if(userdata == null){
						result['OperationStatus'] = "NO_DATA"
						result['StatusDescription'] = "No question-answer record for the given segment and user"
						console.log("End of Execution: ",result)
						res.status(200).json(result)
					}
					else if(userdata.length == 0){
						result['OperationStatus'] = "NO_DATA"
						result['StatusDescription'] = "No question-answer record for the given segment and user"
						console.log("End of Execution: ",result)
						res.status(200).json(result)
					}
					else{
						let questionRecord = userdata.filter(data=> questions.includes(data.UserData.Question))
						if(questionRecord.length == 0)
						{
							result['OperationStatus'] = "NO_DATA"
							result['StatusDescription'] = "No question-answer record for the given questions for the user"
							console.log("End of Execution: ",result)
							res.status(200).json(result)
						}
						else{
							questionRecord = questionRecord.sort((a,b)=> {
								return a.UserData.CREATEDTIME >= b.UserData.CREATEDTIME ? -1 : 1
							})
							//let texts = questionRecord.map(data=>data.UserData.Answer)
							let texts = []
							for(var i=0; i<questions.length; i++){
								for(var j=0; j<questionRecord.length; j++){
									if(questions[i]==questionRecord[j]['UserData']['Question']){
										texts.push(questionRecord[j]['UserData']['Answer'])
										break;
									}
								}
							}
							const tokens = texts.join(" ").split(" ")
							result['TotalWords'] = tokens.length
							result['TotalTexts'] = questions.length
							result['AvgWordsPerText'] = Math.ceil(result['TotalWords']/result['TotalTexts'])
							result['EnglishProficiency'] = null
							const criteria = JSON.parse(process.env.EnglishProficiencyCriteria)
							for(var i=0; i<criteria.length; i++){
								if((result['AvgWordsPerText'] >= criteria[i]['MinWords'])&&(result['AvgWordsPerText'] <= criteria[i]['MaxWords'])){
									result['EnglishProficiency'] = criteria[i]['EnglishProficiency']
									break;
								}
							}
							console.log("End of Execution: ",result)
							res.status(200).json(result)
						}
					}
				})
				.catch((err) => {
					console.log("End of Execution: ",err);
					res.status(500).send(err);
				});
			}
		}			
	}
	/*
	//Get table meta object without details.
	let functions = catalystApp.functions()
	functions.execute("calculateEnglishProficiency",{
		args:{
			Mobile:requestBody['Mobile'],
			Texts:JSON.stringify(requestBody['Texts'])
		}
	})
	.then((result) => {
		console.log("\End of Execution : " , result);
		res.status(200).json(JSON.parse(result));
	})
	.catch((err) => {
		console.log(err);
		res.status(500).send(err);
	});*/
});

app.all("/", (req,res) => {

	res.status(403).send("Error.");

});

module.exports = app;
// const catalyst = require('zcatalyst-sdk-node');
const catalyst = require("zoho-catalyst-sdk");
const SystemPrompts = require('.././models/SystemPrompts.js');

module.exports = async (basicIO) => {
	/*
	Request: None
	Response: {
		OperationStatus: <Status Code>
		ErrorDescription: <Description of error if any>
		Prompts:{
			Version: Contribution
		}
	}
	*/

	const catalystApp = catalyst.initialize();

	const executionID = Math.random().toString(36).slice(2)

	//Prepare text to prepend with logs
	const params = ["Get System Prompt",executionID,""]
	const prependToLog = params.join(" | ")
		
	console.info((new Date()).toString()+"|"+prependToLog,"Execution Started")


	const prompt = basicIO["prompt"];
	//let query = "select Game, Module, LearningObjective, ROWID, Name, Content, IsActive, SupportingText, SupportingAVURL, SupportingImageURL, Sequence, Persona, ObjectiveMessage, Type, ShowLearningContent, IsPaid from SystemPrompts"
	var conditions = []
	var filterParams = {};
	if(typeof prompt !== 'undefined'){
		var promptList = Array.isArray(prompt) ? prompt : prompt.split(",")
		promptList = promptList.map(data=>data.toString().trim())
		// conditions.push("Name in ('"+promptList.join("','")+"')")
		filterParams.Name = { $in: promptList };
	}
	const isactive = basicIO["isactive"];
	if(typeof isactive !== 'undefined'){
		// conditions.push("IsActive = "+isactive)
		filterParams.IsActive = isactive;
	}
	const seqNo = basicIO["sequence"];
	if(typeof seqNo !== 'undefined'){
		// conditions.push("Sequence = "+seqNo)
		filterParams.Sequence = seqNo;
	}
	const type = basicIO["type"];
	if(typeof type !== 'undefined'){
		// conditions.push("Type = '"+type+"'")
		filterParams.Type = type;
	}
	
	// if(conditions.length>0)
	// 	query = query + " where " + conditions.join(" and ")
	// query = query + " order by CREATEDTIME"
	// let zcql = catalystApp.zcql()
	var responseJSON = {
		OperationStatus: "SUCCESS"
	}

	try{
		console.log("---------------",filterParams);
        const queryOutput = await SystemPrompts.find(filterParams)
		  .select('Game Module LearningObjective _id Name Content IsActive SupportingText SupportingAVURL SupportingImageURL Sequence Persona ObjectiveMessage Type ShowLearningContent IsPaid')
		  .sort({ CREATEDTIME: 1 });

		if(queryOutput.length == 0){
			responseJSON['OperationStatus']="NO_DATA"
			responseJSON['ErrorDescription']="No data returrned by query"
		}
		else{
			const retrunValues = queryOutput.map(data=>data)
			responseJSON['Prompts'] = retrunValues//.reduce(((r, c) => Object.assign(r, c)), {}) 
			responseJSON['TotalPrompts'] = retrunValues.length
		}
		console.info((new Date()).toString()+"|"+prependToLog,"End of Execution.")
		return JSON.stringify(responseJSON);
	} catch(error){
		responseJSON['OperationStatus']="ZCQL_ERR"
		responseJSON['ErrorDescription']=error
		console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with error")
		console.error((new Date()).toString()+"|"+prependToLog,"Error in executing ZCQL statement: ", query, "\nError: ",error)
		return JSON.stringify(responseJSON);
	}
}
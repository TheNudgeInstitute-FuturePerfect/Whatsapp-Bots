// const catalyst = require('zcatalyst-sdk-node');
const catalyst = require("zoho-catalyst-sdk");

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

	const prompt = basicIO["prompt"];
	let query = "select ROWID, Name, Content, IsActive, SupportingText, SupportingAVURL, SupportingImageURL, Sequence, Persona from SystemPrompts"
	var conditions = []
	if(typeof prompt !== 'undefined'){
		var promptList = Array.isArray(prompt) ? prompt : prompt.split(",")
		promptList = promptList.map(data=>data.toString().trim())
		conditions.push("Name in ('"+promptList.join("','")+"')")
	}
	const isactive = basicIO["isactive"];
	if(typeof isactive !== 'undefined'){
		conditions.push("IsActive = "+isactive)
	}
	const seqNo = basicIO["sequence"];
	if(typeof seqNo !== 'undefined'){
		conditions.push("Sequence = "+seqNo)
	}
	const type = basicIO["type"];
	if(typeof type !== 'undefined'){
		conditions.push("Type = '"+type+"'")
	}
	
	if(conditions.length>0)
		query = query + " where " + conditions.join(" and ")
	query = query + " order by CREATEDTIME"
	let zcql = catalystApp.zcql()
	var responseJSON = {
		OperationStatus: "SUCCESS"
	}

	try{
        const queryOutput = await zcql.executeZCQLQuery(query);
		if(queryOutput.length == 0){
			responseJSON['OperationStatus']="NO_DATA"
			responseJSON['ErrorDescription']="No data returrned by query"
			console.log("End of Execution. Response:",responseJSON)
		}
		else{
			const retrunValues = queryOutput.map(data=>data.SystemPrompts)
			responseJSON['Prompts'] = retrunValues//.reduce(((r, c) => Object.assign(r, c)), {}) 
			responseJSON['TotalPrompts'] = retrunValues.length
		}
		return JSON.stringify(responseJSON);
	} catch(error){
		responseJSON['OperationStatus']="ZCQL_ERR"
		responseJSON['ErrorDescription']=error
		console.log("End of Execution. Error in executing ZCQL statement: ", query, "\nError: ",error)
		return JSON.stringify(responseJSON);
	}
}
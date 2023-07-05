// const catalyst = require('zcatalyst-sdk-node');
const catalyst = require("zoho-catalyst-sdk");

module.exports = async (basicIO) => {
	/*
	Request:
		param = <Name>
		version = <Assessment ROWID/Flow Version configured>
	Response:
		{
			OperationStatus: <Status Code>,
			ErrorDescription: <In case of any error code being sent>,
			Value: <Value for the given Name>
		}
	*/

	const catalystApp = catalyst.initialize();

	var result = {
		OperationStatus : "SUCCESS"
	}
	/*var assessment = basicIO["version"];
	if(typeof assessment === 'undefined'){
		result['OperationStatus']="REQ_ERR"
		result['ErrorDescription']="Missing parameter: version"
		console.log("Execution Completed: ",result);
		return JSON.stringify(result);
	}
	else{*/
		var systemPromptROWID = basicIO["id"];
		if(typeof systemPromptROWID === 'undefined'){
			result['OperationStatus']="REQ_ERR"
			result['ErrorDescription']="Missing parameter : id. Need Topic Prompt's ROWID"
			console.log("Execution Completed: ",result);
			return JSON.stringify(result);
		}
		else
		{
			var name = basicIO["param"];
			var listOfParams = []
			if(typeof name !== 'undefined'){
				if(Array.isArray(name) == false)
					name = name.split(",")
				listOfParams = name.map(param=>encodeURI(param.toString().toLowerCase().trim()))
			}
			//basicIO.write(JSON.stringify({x:listOfParams}));
			var searchQuery = "select Name, Value from Configurations where SystemPromptROWID = "+systemPromptROWID
			let zcql = catalystApp.zcql()
			try {
              const searchQueryResult = await zcql.executeZCQLQuery(searchQuery);
			  result['OperationStatus']="SUCCESS"
				if(searchQueryResult.length > 0){
					var filteredValues = searchQueryResult
					if(listOfParams.length>0)
						filteredValues = searchQueryResult.filter(data => listOfParams.includes(data.Configurations.Name))
					if((filteredValues != null) && (filteredValues.length > 0)){
						const values = filteredValues.map(data => {
							var pair = {}
							pair[decodeURI(data.Configurations.Name)]=decodeURI(data.Configurations.Value)
							return pair
						})
						result['Values'] = values.reduce(((r, c) => Object.assign(r, c)), {}) 
					}
					else
						result['Values'] = null
				}
				else{
					result['OperationStatus']="NO_TOPIC_CFG"
					result['StatusDescription']="There is no configuration set for the given topic id"
					result['Values'] = null
				}
				console.log("Execution Completed: ",result);
				return JSON.stringify(result);
			} catch(error){
                result['OperationStatus']="ZCQL_ERR"
				result['ErrorDescription']="Error in execution of search query"
				console.log("Execution Completed: ",result,"\nError:",error,"\nQuery:",searchQuery);
				return JSON.stringify(result);
			}
		}	
	//}
}
// const catalyst = require('zcatalyst-sdk-node');
//const catalyst = require("zoho-catalyst-sdk");
const Configuration = require(".././models/Configurations.js");

module.exports = async (basicIO) => {
	/*
	Request:
		param = <Name>
	Response:
		{
			OperationStatus: <Status Code>,
			ErrorDescription: <In case of any error code being sent>,
			Value: <Value for the given Name>
		}
	*/

	//const catalystApp = catalyst.initialize();

	const executionID = Math.random().toString(36).slice(2)

	//Prepare text to prepend with logs
	const params = ["Get Configuration Param List",executionID,""]
	const prependToLog = params.join(" | ")
		
	console.info((new Date()).toString()+"|"+prependToLog,"Execution Started")


	var result = {
		OperationStatus : "SUCCESS"
	}
	let searchQuery = null
	//var searchQuery = "select distinct Name, Description, Assessments.Assessment from Configurations left join Assessments on Configurations.AssessmentROWID = Assessments.ROWID"
	// var searchQuery = "select distinct SystemPromptROWID, Name, Description from Configurations"
	// let zcql = catalystApp.zcql()
	try {
    //    const searchQueryResult = await zcql.executeZCQLQuery(searchQuery);
		const distinctConfigurations = await Configuration.distinct(
			'SystemPromptROWID',
			{},
			{ lean: true }
		);
		searchQuery = { SystemPromptROWID: { $in: distinctConfigurations } }
	    const searchQueryResult = await Configuration.find(searchQuery,'SystemPromptROWID Name Description');
	   if(searchQueryResult.length > 0){
		result['OperationStatus']="SUCCESS"
		result['Values'] = searchQueryResult.map(data => {
			return {
					Name: decodeURI(data.Name),
					Description: decodeURI(data.Description),
					TopicID: data.SystemPromptROWID
				}
			})		
		}
		else{
			result['OperationStatus']="NO_CFG_PARAM"
			result['Values'] = null
		}
		console.info((new Date()).toString()+"|"+prependToLog,"Execution Completed");
		return JSON.stringify(result);
	} catch(error){
        result['OperationStatus']="ZCQL_ERR"
		result['ErrorDescription']="Error in execution of search query"
		console.info((new Date()).toString()+"|"+prependToLog,"Execution Completed with error: ",result)
		console.error((new Date()).toString()+"|"+prependToLog,"Error Encountered:",error,"\nQuery:",searchQuery);
		return JSON.stringify(result);
	}
}
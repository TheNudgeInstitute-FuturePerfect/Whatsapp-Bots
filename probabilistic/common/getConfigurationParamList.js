// const catalyst = require('zcatalyst-sdk-node');
const catalyst = require("zoho-catalyst-sdk");

module.exports = (context, basicIO) => {
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

	const catalystApp = catalyst.initialize(context);

	var result = {
		OperationStatus : "SUCCESS"
	}

	//var searchQuery = "select distinct Name, Description, Assessments.Assessment from Configurations left join Assessments on Configurations.AssessmentROWID = Assessments.ROWID"
	var searchQuery = "select distinct SystemPromptROWID, Name, Description from Configurations"
	let zcql = catalystApp.zcql()
	zcql.executeZCQLQuery(searchQuery)
	.then(searchQueryResult=>{
		if(searchQueryResult.length > 0){
			result['OperationStatus']="SUCCESS"
			result['Values'] = searchQueryResult.map(data => {
				return {
						Name: decodeURI(data.Configurations.Name),
						Description: decodeURI(data.Configurations.Description),
						TopicID: data.Configurations.SystemPromptROWID
				}
			})		
		}
		else{
			result['OperationStatus']="NO_CFG_PARAM"
			result['Values'] = null
		}
		console.log("Execution Completed: ",result);
		basicIO.write(JSON.stringify(result));
		context.close();
	})
	.catch(err=>{
		result['OperationStatus']="ZCQL_ERR"
		result['ErrorDescription']="Error in execution of search query"
		console.log("Execution Completed: ",result,"\nError:",err,"\nQuery:",searchQuery);
		basicIO.write(JSON.stringify(result));
		context.close();
	})	
}
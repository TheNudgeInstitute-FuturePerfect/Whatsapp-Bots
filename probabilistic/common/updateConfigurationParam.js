// const catalyst = require('zcatalyst-sdk-node');
const catalyst = require("zoho-catalyst-sdk");

const Configurations = require(".././models/Configurations");

module.exports = async (basicIO) => {

	const catalystApp = catalyst.initialize();

	const executionID = Math.random().toString(36).slice(2)

	//Prepare text to prepend with logs
	const params = ["Update Configuration Param",executionID,""]
	const prependToLog = params.join(" | ")
		
	console.info((new Date()).toString()+"|"+prependToLog,"Execution Started")

	var result = {
		OperationStatus : "SUCCESS"
	}
	var systemPromptROWID = basicIO["id"];
	if(typeof systemPromptROWID === 'undefined'){
		result['OperationStatus']="REQ_ERR"
		result['ErrorDescription']="Missing parameter : id. Need Topic Prompt's ROWID"
		console.info((new Date()).toString()+"|"+prependToLog,"Execution Completed: ",result);
		return JSON.stringify(result);
		
	}
	else{
		var name = basicIO["param"];
		if(typeof name === 'undefined'){
			result['OperationStatus']="REQ_ERR"
			result['ErrorDescription']="Missing parameter: param"
			console.info((new Date()).toString()+"|"+prependToLog,"Execution Completed: ",result);
			return JSON.stringify(result);
			
		}
		else{
			name = name.toString().toLowerCase()
			var val = basicIO["value"];
			if(typeof val === 'undefined'){
				result['OperationStatus']="REQ_ERR"
				result['ErrorDescription']="Missing parameter: value"
				console.info((new Date()).toString()+"|"+prependToLog,"Execution Completed: ",result);
				return JSON.stringify(result);
				
			}
			else{
				var description = basicIO["description"];

				// var updateQuery = "Update Configurations set Value = '"+encodeURI(val.replace(/'/g,"''"))+"' "+
				// 					((typeof description !== 'undefined') && (description!=null) && (description.length>0) ? ", Description = '"+encodeURI(description)+"' ":"")+
				// 					"where Name = '"+encodeURI(name)+"' and SystemPromptROWID="+systemPromptROWID
				// let zcql = catalystApp.zcql()
				try{
				 const updateQuery = { Name: encodeURI(name),SystemPromptROWID : systemPromptROWID }; 
				 const UpdateQueryString = "Value : '"+encodeURI(val.replace(/'/g,"''"))+"' "+
				 ((typeof description !== 'undefined') && (description!=null) && (description.length>0) ? ", Description : '"+encodeURI(description)+"' ":"");
				 const updateOperation = { $set: { UpdateQueryString } }; // Set status to 'active'
                 const updateQueryResult = await Configurations.updateMany(updateQuery, updateOperation);
				 if((typeof updateQueryResult !== 'undefined')&&(updateQueryResult!=null)){
						result['OperationStatus']="SUCCESS"
						//result['Value']=updateQueryResult[0].Configurations.Value
					}
					else{
						result['OperationStatus']="NO_CFG_PRMPT"
						result['StatusDescription']="There is no record for given configuration param and systemprompt"
					}
					console.info((new Date()).toString()+"|"+prependToLog,"Execution Completed: ",result);
					return JSON.stringify(result);
				} catch(error){
					result['OperationStatus']="ZCQL_ERR"
					result['ErrorDescription']="Error in execution update query"
					console.info((new Date()).toString()+"|"+prependToLog,"Execution Completed with error: ",result)
					console.error((new Date()).toString()+"|"+prependToLog,"Execution Completed with error: ",error,updateQuery);
					return JSON.stringify(result);
				}
			}
		}
	}
}
// const catalyst = require('zcatalyst-sdk-node');
const catalyst = require("zoho-catalyst-sdk");

module.exports = async (basicIO) => {

	const catalystApp = catalyst.initialize();

	var result = {
		OperationStatus : "SUCCESS"
	}
	var systemPromptROWID = basicIO["id"];
	if(typeof systemPromptROWID === 'undefined'){
		result['OperationStatus']="REQ_ERR"
		result['ErrorDescription']="Missing parameter : id. Need Topic Prompt's ROWID"
		console.log("Execution Completed: ",result);
		return JSON.stringify(result);
		
	}
	else{
		var name = basicIO["param"];
		if(typeof name === 'undefined'){
			result['OperationStatus']="REQ_ERR"
			result['ErrorDescription']="Missing parameter: param"
			console.log("Execution Completed: ",result);
			return JSON.stringify(result);
			
		}
		else{
			name = name.toString().toLowerCase()
			var val = basicIO["value"];
			if(typeof val === 'undefined'){
				result['OperationStatus']="REQ_ERR"
				result['ErrorDescription']="Missing parameter: value"
				console.log("Execution Completed: ",result);
				return JSON.stringify(result);
				
			}
			else{
				var description = basicIO["description"];
				var updateQuery = "Update Configurations set Value = '"+encodeURI(val.replace(/'/g,"''"))+"' "+
									((typeof description !== 'undefined') && (description!=null) && (description.length>0) ? ", Description = '"+encodeURI(description)+"' ":"")+
									"where Name = '"+encodeURI(name)+"' and SystemPromptROWID="+systemPromptROWID
				let zcql = catalystApp.zcql()
				try{
                 const updateQueryResult = await zcql.executeZCQLQuery(updateQuery);
				 if((typeof updateQueryResult !== 'undefined')&&(updateQueryResult!=null)){
						result['OperationStatus']="SUCCESS"
						//result['Value']=updateQueryResult[0].Configurations.Value
					}
					else{
						result['OperationStatus']="NO_CFG_PRMPT"
						result['StatusDescription']="There is no record for given configuration param and systemprompt"
					}
					console.log("Execution Completed: ",result);
					return JSON.stringify(result);
				} catch(error){
					result['OperationStatus']="ZCQL_ERR"
					result['ErrorDescription']="Error in execution update query"
					console.log("Execution Completed: ",result,error,updateQuery);
					return JSON.stringify(result);
				}
			}
		}
	}
}
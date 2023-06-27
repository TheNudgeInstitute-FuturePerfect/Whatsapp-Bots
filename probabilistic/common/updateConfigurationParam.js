// const catalyst = require('zcatalyst-sdk-node');
const catalyst = require("zoho-catalyst-sdk");

module.exports = (context, basicIO) => {

	const catalystApp = catalyst.initialize(context);

	var result = {
		OperationStatus : "SUCCESS"
	}
	var systemPromptROWID = basicIO("id");
	if(typeof systemPromptROWID === 'undefined'){
		result['OperationStatus']="REQ_ERR"
		result['ErrorDescription']="Missing parameter : id. Need Topic Prompt's ROWID"
		console.log("Execution Completed: ",result);
		basicIO.write(JSON.stringify(result));
		context.close();
	}
	else{
		var name = basicIO("param");
		if(typeof name === 'undefined'){
			result['OperationStatus']="REQ_ERR"
			result['ErrorDescription']="Missing parameter: param"
			console.log("Execution Completed: ",result);
			basicIO.write(JSON.stringify(result));
			context.close();
		}
		else{
			name = name.toString().toLowerCase()
			var val = basicIO("value");
			if(typeof val === 'undefined'){
				result['OperationStatus']="REQ_ERR"
				result['ErrorDescription']="Missing parameter: value"
				console.log("Execution Completed: ",result);
				basicIO.write(JSON.stringify(result));
				context.close();
			}
			else{
				var description = basicIO("description");
				var updateQuery = "Update Configurations set Value = '"+encodeURI(val.replace(/'/g,"''"))+"' "+
									((typeof description !== 'undefined') && (description!=null) && (description.length>0) ? ", Description = '"+encodeURI(description)+"' ":"")+
									"where Name = '"+encodeURI(name)+"' and SystemPromptROWID="+systemPromptROWID
				let zcql = catalystApp.zcql()
				zcql.executeZCQLQuery(updateQuery)
				.then(updateQueryResult=>{
					if((typeof updateQueryResult !== 'undefined')&&(updateQueryResult!=null)){
						result['OperationStatus']="SUCCESS"
						//result['Value']=updateQueryResult[0].Configurations.Value
					}
					else{
						result['OperationStatus']="NO_CFG_PRMPT"
						result['StatusDescription']="There is no record for given configuration param and systemprompt"
					}
					console.log("Execution Completed: ",result);
					basicIO.write(JSON.stringify(result));
					context.close();
				})
				.catch(err=>{
					result['OperationStatus']="ZCQL_ERR"
					result['ErrorDescription']="Error in execution update query"
					console.log("Execution Completed: ",result,err,updateQuery);
					basicIO.write(JSON.stringify(result));
					context.close();
				})
			}
		}
	}
}
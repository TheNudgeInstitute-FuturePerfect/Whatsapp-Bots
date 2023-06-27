// const catalyst = require('zcatalyst-sdk-node');
const catalyst = require("zoho-catalyst-sdk");

module.exports = (context, basicIO) => {
	/*
	Request Params: 
		prompt: <Flow Version>
	Response: {
		OperationStatus: <Status Code>
		ErrorDescription: <Description of error if any>
		Value: <Contribution updated>
	}
	*/

	const catalystApp = catalyst.initialize(context);

	var result = {
		OperationStatus : "SUCCESS"
	}
	var updateData = {}
	var rowID = basicIO["id"];
	if(typeof rowID === 'undefined'){
		result['OperationStatus']="REQ_ERR"
		result['ErrorDescription']="Missing parameter: id. ID of the prompt of the topic is required."
		console.log("Execution Completed: ",result);
		basicIO.write(JSON.stringify(result));
		context.close();
	}
	else{
		rowID = rowID
		updateData["ROWID"]= rowID
		
		//Get the data for this ROWID
		const zcql = catalystApp.zcql()
		const query = "select ROWID, Name, Content, IsActive, SupportingText, SupportingAVURL,SupportingImageURL, Sequence, Persona from SystemPrompts where ROWID='"+rowID+"'"
		zcql.executeZCQLQuery(query)
		.then((searchQuery)=>{
			if(!((searchQuery!=null)&&(searchQuery.length>0))){
				result['OperationStatus']="REQ_ERR"
				result['StatusDescription']="There is no record for id="+rowID
				console.log("Execution Completed: ",result);
				basicIO.write(JSON.stringify(result));
				context.close();
			}
			else{	
				var isActive = basicIO["isactive"];
				if((typeof isActive !== 'undefined')&&(typeof isActive !== "boolean")){
					result['OperationStatus']="REQ_ERR"
					result['StatusDescription']="isactive must be true or false. It's "+(typeof isActive)
					console.log("Execution Completed: ",result);
					basicIO.write(JSON.stringify(result));
					context.close();
				}
				else{
					if(typeof isActive !== 'undefined')
						updateData["IsActive"]=isActive
			
					var seqNO =  basicIO["sequence"]
					if((typeof seqNO !== 'undefined')&&(isNaN(parseInt(seqNO)))){
						result['OperationStatus']="REQ_ERR"
						result['StatusDescription']="sequence must be an integer. It's "+(typeof seqNO)
						console.log("Execution Completed: ",result);
						basicIO.write(JSON.stringify(result));
						context.close();
					}
					else{
						if(typeof seqNO === 'undefined')
							seqNO = searchQuery[0]['SystemPrompts']['Sequence']
						else
							updateData["Sequence"]=seqNO
			
						var name = basicIO["prompt"];
						if(typeof name !== 'undefined'){
							name = name.toString().trim()
							updateData["Name"]= name
						}
						else
							name = searchQuery[0]['SystemPrompts']['Name']

						var prompt = basicIO["content"];		
						if(typeof prompt !== 'undefined')
							updateData["Content"]=prompt
					
						var supportingText = basicIO["helptext"]
						if(typeof supportingText !== 'undefined')
							updateData["SupportingText"]=supportingText
					
						var supportingAVURL = basicIO["helpurl"]
						if(typeof supportingAVURL !== 'undfined')
							updateData["SupportingAVURL"]=supportingAVURL
					
						var supportingImageURL = basicIO["helpimage"]
							if(typeof supportingImageURL !== 'undefined')
							updateData["SupportingImageURL"]=supportingImageURL
						
						var persona = basicIO["persona"]
							if(typeof persona !== 'undefined')
							updateData["Persona"]=persona
						
						var objectiveMessage = basicIO["objmsg"]
							if(typeof objectiveMessage !== 'undefined')
							updateData["ObjectiveMessage"]=objectiveMessage
						
						var type = basicIO["type"]
							if(typeof type !== 'undefined')
							updateData["Type"]=type
						

						if((typeof seqNO !== 'undefined')||(typeof name !== 'undefined'))
							updateData["PrimaryKey"]=name+"-"+seqNO

						console.log(updateData)

						let table = catalystApp.datastore().table('SystemPrompts')
						table.updateRow(updateData)
						.then(updateQueryResult=>{
							result['OperationStatus']="SUCCESS"
							console.log("Execution Completed: ",result);
							basicIO.write(JSON.stringify(result));
							context.close();
						})
						.catch(err=>{
							result['OperationStatus']="ZCQL_ERR"
							result['ErrorDescription']="Error in execution update query"
							console.log("Execution Completed: ",result,err);
							basicIO.write(JSON.stringify(result));
							context.close();
						})
					}
				}
			}
		})
		.catch(err=>{
			result['OperationStatus']="ZCQL_ERR"
			result['ErrorDescription']="Error in marking prompts inactive"
			console.log("Execution Completed: ",result,err);
			basicIO.write(JSON.stringify(result));
			context.close();
		})
	}
}
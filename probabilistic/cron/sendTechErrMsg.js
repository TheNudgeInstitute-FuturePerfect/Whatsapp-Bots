const catalyst = require("zoho-catalyst-sdk");

module.exports = (cronDetails, context) => {

    let cronParams = cronDetails.getCronParam("name");
	if(typeof cronParams === 'undefined'){
		cronParams = 'DefaultName';
	}

    const catalystApp = catalyst.initialize(context);
	
	let zcql = catalystApp.zcql()

	zcql.executeZCQLQuery("Select distinct Mobile from Sessions where CREATEDTIME >= '2023-06-24 23:53:00' and CREATEDTIME < '2023-06-26 12:19:00'")
	.then((sessions)=>{
		const mobiles = sessions.map(data=>data.Sessions.Mobile)
		console.log("Total Users=",mobiles.length)
		if(mobiles.length>0){
			zcql.executeZCQLQuery("Select distinct Mobile, GlificID from Users where Mobile in ("+mobiles.join(",")+")")
			.then(async (users)=>{
				const timer = (sleepTime) => {
					return new Promise( async (resolve,reject) => {
						//console.log('Wait for '+sleepTime)
						setTimeout(resolve, sleepTime)
					});
				}
				const closeContext = async (i,success)=>{
					if(i==(users.length-1)){
						await timer(5*60*1000)
						if(success==false){
							console.log('Execution completed with some error.')
							context.closeWithFailure();
						}
						else{
							console.log('Execution completed successfully.')
							context.closeWithSuccess();
						}
					}
				}

				let table = catalystApp.datastore().table("SessionEvents")
				const systemPrompt = await zcql.executeZCQLQuery("Select ROWID from SystemPrompts where Name = 'Dummy' and IsActive = true")
				const topicID = systemPrompt[0]['SystemPrompts']['ROWID']

				users.forEach(async (record,i)=>{
					await timer(Math.max(300,(i*1000)/users.length))
					console.log(i+": Message to be sent to "+ record.Users.Mobile);
					while(true){
						try{
                            const sendGlificHSMMsg = require("../common/sendGlificHSMMsg.js");
							const output = await sendGlificHSMMsg({
								args:{
									"contactID":record.Users.GlificID,
									"messageID":process.env.TemplateID,
								}
							})
							const nudgeStatus = JSON.parse(output)
							if(nudgeStatus['OperationStatus']=="SUCCESS"){
								console.log(i+":Msg sent to "+record.Users.Mobile)
								closeContext(i,true)
								try{
									let eventData = {
										SessionID: "GPT Quota Error",
										Event : "Regret Message Sent",
										SystemPromptROWID: topicID,
										Mobile:record.Users.Mobile
									}
									await table.insertRow(eventData)
								}
								catch(e){
									console.log(i+": Could not update event table for "+ record.Users.Mobile)
								}
								break;
							}
							else if(["GLFC_AUTH_API_ERR","GLFC_AUTH_ERR","GLFC_API_ERR"].includes(nudgeStatus['OperationStatus'])){
								await timer(Math.max(500,(i*1000)/users.length))
								console.log(i+":Retrying Msg for "+ record.Users.Mobile);
							}
							else{
								console.log(i+":Msg not sent to "+record.Users.Mobile+" as OperationStatus = "+nudgeStatus['OperationStatus'])
								closeContext(i,false)
								break;
							}
						}
						catch(err){
							if(err.indexOf("TOO_MANY_REQUEST")!=0){
								await timer(Math.max(500,(i*1000)/users.length))
								console.log(i+":Retrying Msg for "+ record.Users.Mobile);
							}
							else{
								console.log(i+":Msg not sent to "+record.Users.Mobile+" due to error: ",err)
								closeContext(i,false)
								break;
							}
						}
					}
				})
			})
			.catch(err=>{
				console.log(err)
				context.closeWithFailure()
			})
		}
		else{
			context.closeWithSuccess()
		}
	})
	.catch(err=>{
		console.log(err)
		context.closeWithFailure()
	})
}
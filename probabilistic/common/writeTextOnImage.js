// const catalyst = require('zcatalyst-sdk-node');
const catalyst = require("zoho-catalyst-sdk");

module.exports = async (basicIO) => {

	const catalystApp = catalyst.initialize();
	
	var response = {
		OperationStatus:"SUCCESS"
	}

	let sessionROWID = basicIO["sessionROWID"];
	if(typeof sessionROWID === 'undefined'){
		response['OperationStatus'] = "REQ_ERR"
		response['StatusDescription'] = "Missing param - sessionROWID"
		console.log("End of execution:",response)
		return JSON.stringify(response)
		 
	}
	else{
		let templateURL = basicIO["templateurl"];
		if(typeof templateURL === 'undefined'){
			response['OperationStatus'] = "REQ_ERR"
			response['StatusDescription'] = "Missing param - templateurl"
			console.log("End of execution:",response)
			return JSON.stringify(response)
			 
		}
		else{
			let textMap = basicIO["textmap"];
			if(typeof textMap === 'undefined'){
				response['OperationStatus'] = "REQ_ERR"
				response['StatusDescription'] = "Missing param - textmap"
				console.log("End of execution:",response)
				return JSON.stringify(response)
				 
			}
			else{
				textMap = JSON.parse(textMap)
				if(!Array.isArray(textMap)){
					response['OperationStatus'] = "REQ_ERR"
					response['StatusDescription'] = "textMap must be an array of object: [{'text':<>,'x':<>,'y':<>,}]"
					console.log("End of execution:",response)
					return JSON.stringify(response)
					 
				}
				else{
					let fileName = basicIO["filename"]
					if(typeof fileName === 'undefined'){
						response['OperationStatus'] = "REQ_ERR"
						response['StatusDescription'] = "Missing param - filename"
						console.log("End of execution:",response)
						return JSON.stringify(response)
						 
					}
					else{
						const jimp = require("jimp")
						try{
							let img = await jimp.read(templateURL);
							console.log("Read template image file")
							try{
								let font = await jimp.loadFont(jimp.FONT_SANS_32_BLACK);
								console.log("Loaded fonts")
								textMap.forEach(txt=>{
									img.print(font,txt['x'],txt['y'],txt['text'])
								})
								try{
									let data = await img.getBufferAsync(jimp.MIME_JPEG);
									console.log("Read Image as buffer")
									const config = require("./application-config.json")
									fileName = fileName+'.'+config['fileExtension']
									// Imports the Google Cloud client library
									const {Storage} = require('@google-cloud/storage');
									// Creates a client from a Google service account key
									options = config['options']
									const storage = new Storage(options);
									// construct the file to write
									const fileOptions = config['fileOptions']
									const bucket = config['bucket']	
									var file = storage.bucket(bucket).file(fileName)
									try{
                                        await file.save(data,options);
										await file.makePublic()
										const publicURL = config["publicURLPath"].replace("{{bucket}}",bucket).replace("{{filename}}",fileName)
										console.log("Stored the image file")
										let table = catalystApp.datastore().table("Sessions")
										try{
											let row = await table.updateRow({
												ROWID:sessionROWID,
												PerformanceReportURL:publicURL
											})
											response["OperationStatus"] = "SUCCESS";
											response["PublicURL"] = publicURL
											console.log("Returned: ",response)
											return JSON.stringify(response);
										} catch(error){
											response['OperationStatus'] = "DATASTORE_ERR"
											response['ErrorDescription'] = error
											console.log('Technical Error in storing performace report url in sessions table: '+error+"\n\n Returned error response: ",response)
											return JSON.stringify(response)
										}
									} catch(error){
										response['OperationStatus'] = "GCS_ERR"
										response['ErrorDescription'] = error
										console.log('Technical Error in storing file: '+error+"\n\n Returned error response: ",response)
										return JSON.stringify(response)
									}
								} catch(error){
									response['OperationStatus'] = "APP_ERR"
									response['StatusDescription'] = "Error in getting file buffer"
									console.log("End of execution:",response,"\n",error)
									return JSON.stringify(response)
								}
							} catch(error){
								response['OperationStatus'] = "APP_ERR"
								response['StatusDescription'] = "Error in loading font"
								console.log("End of execution:",response,"\n",error)
								return JSON.stringify(response)
							}
							
							

						} catch(error){
							response['OperationStatus'] = "APP_ERR"
							response['StatusDescription'] = "Error in fetching template file"
							console.log("End of execution:",response,"\n",error)
							return JSON.stringify(response)
						}
					}
				}
			}
		}
	}
}
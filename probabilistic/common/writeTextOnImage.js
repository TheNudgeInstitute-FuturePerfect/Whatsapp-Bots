// const catalyst = require('zcatalyst-sdk-node');
const catalyst = require("zoho-catalyst-sdk");

module.exports = (basicIO) => {

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
						jimp.read(templateURL)
						.then((img)=>{
							console.log("Read template image file")
							jimp.loadFont(jimp.FONT_SANS_32_BLACK)
							.then((font)=>{
								console.log("Loaded fonts")
								textMap.forEach(txt=>{
									img.print(font,txt['x'],txt['y'],txt['text'])
								})
								img.getBufferAsync(jimp.MIME_JPEG)
								.then((data)=>{
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
									file.save(data,options)
									.then(async ()=>{
										await file.makePublic()
										const publicURL = config["publicURLPath"].replace("{{bucket}}",bucket).replace("{{filename}}",fileName)
										console.log("Stored the image file")
										let table = catalystApp.datastore().table("Sessions")
										table.updateRow({
											ROWID:sessionROWID,
											PerformanceReportURL:publicURL
										})
										.then((row)=>{
											response["OperationStatus"] = "SUCCESS";
											response["PublicURL"] = publicURL
											console.log("Returned: ",response)
											return JSON.stringify(response);
												
										})
										.catch(error =>{
											response['OperationStatus'] = "DATASTORE_ERR"
											response['ErrorDescription'] = error
											console.log('Technical Error in storing performace report url in sessions table: '+error+"\n\n Returned error response: ",response)
											return JSON.stringify(response)
											
										})	
									})
									.catch(error =>{
										response['OperationStatus'] = "GCS_ERR"
										response['ErrorDescription'] = error
										console.log('Technical Error in storing file: '+error+"\n\n Returned error response: ",response)
										return JSON.stringify(response)
										
									})
								})
								.catch(err=>{
									response['OperationStatus'] = "APP_ERR"
									response['StatusDescription'] = "Error in getting file buffer"
									console.log("End of execution:",response,"\n",err)
									return JSON.stringify(response)
									 
								})
							})
							.catch(err=>{
								response['OperationStatus'] = "APP_ERR"
								response['StatusDescription'] = "Error in loading font"
								console.log("End of execution:",response,"\n",err)
								return JSON.stringify(response)
								 
							})
						})
						.catch(err=>{
							response['OperationStatus'] = "APP_ERR"
							response['StatusDescription'] = "Error in fetching template file"
							console.log("End of execution:",response,"\n",err)
							return JSON.stringify(response)
							 
						})
					}
				}
			}
		}
	}
}
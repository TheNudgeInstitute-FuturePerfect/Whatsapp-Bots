// const catalyst = require('zcatalyst-sdk-node');
const catalyst = require("zoho-catalyst-sdk");

module.exports = async (basicIO) => {

	const catalystApp = catalyst.initialize();

	let contentType = basicIO["contentType"]
	let fileData = basicIO["fileData"]
	let fileName = basicIO["fileName"]
	let fileType = basicIO["fileType"]
	var responseJSON = {
		OperationStatus:"REQ_ERR",
		ErrorDescription:null
	}
	if(typeof contentType === 'undefined'){
		responseJSON["ErrorDescription"] = "contentType missing";
		console.log("Returned: ",responseJSON)
		return JSON.stringify(responseJSON)
		
	}
	else if(typeof fileData === 'undefined'){
		responseJSON["ErrorDescription"] = "fileData missing";
		console.log("Returned: ",responseJSON)
		return JSON.stringify(responseJSON)
		
	}
	else if(typeof fileName === 'undefined'){
		responseJSON["ErrorDescription"] = "fileName missing";
		console.log("Returned: ",responseJSON)
		return JSON.stringify(responseJSON)
		
	}
	else{
		fileType = (typeof fileType === 'undefined') ?  contentType : fileType
		responseJSON['OperationStatus'] = "SUCCESS"
		console.log('Storing File in GCS')

		const getFileContent = (contentType,content) => {
			return new Promise((resolve,reject)=>{
				if(contentType!='URL'){
					resolve(content)
				}
				else{
					// Read the file from URL in binary mode
					let options = {
						method: 'Get',
						url: content,
						headers: {},
						body:null,
						responseType:"arraybuffer",
						responseEncoding:"binary"
					};
					const httpRequest = require('request').defaults({ encoding: null });;
					httpRequest(options, async function (error, response) {
						if (error){
							reject(error)
						}
						else if(response.statusCode == 200){
							resolve(response.body)
						}
						else{
							reject(response.statusCode)
						}
					})
				}
			})
		}
		
		try{
           const fileContent = await getFileContent(contentType,fileData);
		   const config = require("./application-config.json")
			fileName = fileName+'.'+config['fileExtension'][fileType]
			// Imports the Google Cloud client library
			const {Storage} = require('@google-cloud/storage');
			// Creates a client from a Google service account key
			options = config['options']
			const storage = new Storage(options);
			// construct the file to write
			const fileOptions = config['fileOptions'][contentType]
			const bucket = config['bucket']	
			var file = storage.bucket(bucket).file(fileName)
			try{
              await file.save(fileContent,options);
			  await file.makePublic()
				const publicURL = config["publicURLPath"].replace("{{bucket}}",bucket).replace("{{filename}}",fileName)
				console.log("Stored the audio file")
				responseJSON["OperationStatus"] = "SUCCESS";
				responseJSON["PublicURL"] = publicURL
				console.log("Returned: ",responseJSON)
				return JSON.stringify(responseJSON)
			} catch(err){
				responseJSON['OperationStatus'] = "GCS_ERR"
				responseJSON['ErrorDescription'] = error
				console.log('Technical Error in storing file: '+error+"\n\n Returned error response: ",responseJSON)
				return responseJSON
			}
		} catch(err){
			responseJSON['OperationStatus'] = "REST_API_ERR"
			responseJSON['ErrorDescription'] = error
			console.log('Technical Error in HTTP Request: '+error+"\n\n Returned error response: ",responseJSON)
			return responseJSON
		}
	}
}
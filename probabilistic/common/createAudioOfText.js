// const catalyst = require('zcatalyst-sdk-node');
const catalyst = require("zoho-catalyst-sdk");

module.exports = (basicIO) => {

	const catalystApp = catalyst.initialize();

	var result = {
		OperationStatus : "SUCCESS"
	}

	const text = basicIO["text"]
	if(typeof text === 'undefined'){
		result['OperationStatus']="REQ_ERR"
		result['ErrorDescription']="Missing parameter: text"
		console.log("Execution Completed: ",result);
		return JSON.stringify(result);
	}
	else{
		var language = basicIO["language"]
		if(typeof language === 'undefined'){
			console.log("Missing parameter: language. Using the default value 'English'")
			language = "English"
		}
		var fileName = basicIO["filename"]
		if(typeof fileName === 'undefined'){
			result['OperationStatus']="REQ_ERR"
			result['ErrorDescription']="Missing parameter: filename"
			console.log("Execution Completed: ",result);
			return JSON.stringify(result);
		}	
		else{
			const allConfig = require("./application-config.json")
			
			console.log('Converting Text to Speech')

			// Imports the Google Cloud client library
			const textToSpeech = require('@google-cloud/text-to-speech');

			let config = allConfig["gTTSConfig"]

			// Creates a client
			let options = config['options']
			fileName = fileName+'.'+config['fileExtension']
			const client = new textToSpeech.TextToSpeechClient(options);
			// Construct the request
			const request = {
				input: {text: text},
				// Select the language and SSML voice gender (optional)
				voice: {languageCode: config['languageCode'][language], ssmlGender: config['ssmlGender']},
				// select the type of audio encoding
				audioConfig: config['audioConfig'],
			};
			console.log(request)
			// Performs the text-to-speech request
			client.synthesizeSpeech(request)
			.then((response)=>{
				console.log("Storing audio received for the request: "+JSON.stringify(request));
			
				// Imports the Google Cloud client library
				const {Storage} = require('@google-cloud/storage');
				// Creates a client from a Google service account key
				config = allConfig['gcsConfig']
				options = config['options']
				const storage = new Storage(options);
				// construct the file to write
				const fileOptions = config['fileOptions']
				const bucket = config['bucket']
			
				var file = storage.bucket(bucket).file(fileName)
				file.save(response[0].audioContent,options)
				.then(async ()=>{
					await file.makePublic()
					const publicURL = config["publicURLPath"].replace("{{bucket}}",bucket).replace("{{filename}}",fileName)
					result['StatusDescription']="Created and stored the audio file"
					result['URL']=publicURL
					console.log("Execution Completed: ",result);
					return JSON.stringify(result);
				})
				.catch(err =>{
					result['OperationStatus']="GCS_ERR"
					result['StatusDescription']="Error in storing audio file"
					console.log("Execution Completed: ",result,err);
					return JSON.stringify(result);
				})
			})
			.catch(err =>{
				result['OperationStatus']="GTTS_ERR"
				result['StatusDescription']="Error in converting text to audio"
				console.log("Execution Completed: ",result,err);
				return JSON.stringify(result);
			})
	  	}
	}
}
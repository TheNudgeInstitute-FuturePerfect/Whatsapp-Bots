// const catalyst = require('zcatalyst-sdk-node');
const catalyst = require("zoho-catalyst-sdk");

module.exports = (context, basicIO) => {

	const catalystApp = catalyst.initialize(context);

	let responseAVURL = basicIO["responseAVURL"]
	var responseJSON = {
		OperationStatus:"REQ_ERR",
		StatusDescription:null
	}
	if(typeof responseAVURL === 'undefined'){
		responseJSON["StatusDescription"] = "responseAVURL missing";
		console.log("Returned: ",responseJSON)
		basicIO.write(JSON.stringify(responseJSON));
		context.close();
	}
	else{
		responseJSON['OperationStatus'] = "SUCCESS"
		console.log('Converting Speech to Text')
		
		// Get the Audio bytes
		var options = {
			method: 'Get',
			url: responseAVURL,
			headers: {},
			body:null,
			responseType:"arraybuffer",
			responseEncoding:"binary"
		};

		const httpRequest = require('request').defaults({ encoding: null });;
		var audioTranscript=''
		var confidence = 1
		httpRequest(options, async function (error, response) {
			if (error){
				responseJSON['OperationStatus'] = "REST_API_ERR"
				responseJSON['StatusDescription'] = error
				console.log('Technical Error in call audio URL: '+error+"\n\n Returned error response: ",responseJSON)
				basicIO.write(responseJSON)
				context.close()
			}
			else if(response.statusCode == 200){
				const config = require("./application-config.json")
				
				//console.log(JSON.stringify(response.header))
				const gSTTrequest = {
					config: {
						encoding: config["audioEncoding"],
						sampleRateHertz: config["sampleRateHertz"],
						languageCode: config['languageCode'],
						//alternativeLanguageCodes: config['altLanguageCodes'],
						//enableAutomaticPunctuation: true,
						profanityFilter: true,
						//enableSpokenPunctuation: true,
						//enableSpokenEmojis: true,
						//model: config[model]
						//speechContexts: config["speechContexts"]
					},
					audio: {
						//uri:null //GCS URI Path
						content:response.body//Buffer.from(response.body,'binary').toString('base64')
					}
				};
				//console.log(JSON.stringify(gSTTrequest))
				// Detects speech in the audio file
				console.log('Sending request to Speech to Text API')
				// Imports the Google Cloud client library
				const speech = require('@google-cloud/speech');

				// Creates a client
				const client = new speech.SpeechClient(config['options']);

				const [gSTTresponse] = await client.recognize(gSTTrequest);
				//console.log(JSON.stringify(gSTTresponse))
				
				audioTranscript = gSTTresponse.results.map(result => result.alternatives[0].transcript).join('\n');
				confidence = gSTTresponse.results.map(result => result.alternatives[0].confidence).join('\n');
				audioTranscript=audioTranscript.toLowerCase()
				console.log('Transcription: ', audioTranscript);
				responseJSON["OperationStatus"] = "SUCCESS";
				responseJSON["AudioTranscript"] = audioTranscript
				responseJSON["Confidence"] = confidence
				console.log("Returned: ",responseJSON)
				basicIO.write(JSON.stringify(responseJSON));
				context.close();
				/*client.recognize(gSTTrequest)
				.then(([gSTTresponse]) => {
					console.log(JSON.stringify(gSTTresponse))
					audioTranscript = gSTTresponse.results.map(result => result.alternatives[0].transcript).join('\n');
					confidence = gSTTresponse.results.map(result => result.alternatives[0].confidence).join('\n');
					audioTranscript=audioTranscript.toLowerCase()
					console.log('Transcription: ', audioTranscript);
					resolve([audioTranscript,confidence])
				})
				.catch(err=>{
					console.log('Error from S2T API: '+ err);
					reject(err)
				})*/
			}
			else{
				responseJSON['OperationStatus'] = "REST_API_ERR"
				responseJSON['StatusDescription'] = 'Error returned by API: '+response.statusCode
				console.log('Error returned by API: '+response.statusCode+' | '+JSON.stringify(response.body)+"\n\Returned error response: ",responseJSON)
				basicIO.write(responseJSON)
				context.close()
			}
		})
	}
}
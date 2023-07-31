// const catalyst = require('zcatalyst-sdk-node');
const catalyst = require("zoho-catalyst-sdk");

module.exports = async (basicIO) => {
    const catalystApp = catalyst.initialize();

    const executionID = Math.random().toString(36).slice(2)

	//Prepare text to prepend with logs
	const params = ["Convert Speech to Text",executionID,""]
	const prependToLog = params.join(" | ")
		
	console.info((new Date()).toString()+"|"+prependToLog,"Execution Started")


    let text = basicIO["text"];
    var responseJSON = {
        OperationStatus: "REQ_ERR",
        StatusDescription: null,
    };
    if (typeof text === "undefined") {
        responseJSON["StatusDescription"] = "text missing";
        console.info((new Date()).toString()+"|"+prependToLog,"Returned: ", responseJSON);
        return JSON.stringify(responseJSON);
    } 
    else {
        let languageCode = basicIO["languageCode"];  
        if (typeof languageCode === "undefined") {
            responseJSON["StatusDescription"] = "languageCode missing";
            console.info((new Date()).toString()+"|"+prependToLog,"Returned: ", responseJSON);
            return JSON.stringify(responseJSON);
        }
        else {
            let fileName = basicIO["fileName"];
            if (typeof fileName === "undefined") {
                responseJSON["StatusDescription"] = "fileName missing";
                console.info((new Date()).toString()+"|"+prependToLog,"Returned: ", responseJSON);
                return JSON.stringify(responseJSON);
            } 
            else {
                    responseJSON["OperationStatus"] = "SUCCESS";
                    console.info((new Date()).toString()+"|"+prependToLog,"Converting Text to Speech");
                    const allConfig = require("./convertTextToSpeech-config.json");
                    let config = allConfig['gTTSConfig']

                    // Imports the Google Cloud client library
                    const textToSpeech = require('@google-cloud/text-to-speech');
                                
                    // Creates a client
                    let options = config['options']
                    fileName = fileName+'.'+config['fileExtension']
                    const client = new textToSpeech.TextToSpeechClient(options);

                    // Construct the request
                    const request = {
                        input: {text: text},
                        // Select the language and SSML voice gender (optional)
                        voice: {languageCode: languageCode, ssmlGender: config['ssmlGender']},
                        // select the type of audio encoding
                        audioConfig: config['audioConfig'],
                    };
                    
                    // Performs the text-to-speech request
                    client.synthesizeSpeech(request)
                    .then((response)=>{
                        console.info((new Date()).toString()+"|"+prependToLog,"Storing audio received for the request: "+JSON.stringify(request));

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
                                responseJSON['PublicURL'] = config["publicURLPath"].replace("{{bucket}}",bucket).replace("{{filename}}",fileName)
                                console.info((new Date()).toString()+"|"+prependToLog,"Stored the audio file")
                                return JSON.stringify(responseJSON);
                            })
                            .catch(error =>{
                                console.info((new Date()).toString()+"|"+prependToLog,"Error encountered in storing file: "+error)
                                responseJSON["OperationStatus"] = "SUCCESS";
                                responseJSON['StatusDescription'] = error                
                                return JSON.stringify(responseJSON);
                            })
                    })
                    .catch(error =>{
                        console.info((new Date()).toString()+"|"+prependToLog,"Error encountered in synthesizing speech "+error);
                        responseJSON["OperationStatus"] = "SUCCESS";
                        responseJSON['StatusDescription'] = error                
                        return JSON.stringify(responseJSON);
                    })
            }
        }
    }
};

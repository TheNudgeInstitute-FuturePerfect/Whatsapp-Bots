// const catalyst = require('zcatalyst-sdk-node');
//const catalyst = require("zoho-catalyst-sdk");
const applicationConfig = require("./../models/applicationConfigs.js")

module.exports = (basicIO) => {

    return new Promise(async (resolve,reject)=>{
    
        const executionID = (typeof basicIO['SessionID'] !== 'undefined') ? basicIO['SessionID'] : Math.random().toString(36).slice(2)

        //Prepare text to prepend with logs
        const params = ["Convert Text to Speech",executionID,""]
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
            resolve(JSON.stringify(responseJSON));
        } 
        else {
            let language = basicIO["language"];  
            if (typeof language === "undefined") {
                responseJSON["StatusDescription"] = "language missing";
                console.info((new Date()).toString()+"|"+prependToLog,"Returned: ", responseJSON);
                resolve(JSON.stringify(responseJSON));
            }
            else {
                let fileName = basicIO["fileName"];
                if (typeof fileName === "undefined") {
                    responseJSON["StatusDescription"] = "fileName missing";
                    console.info((new Date()).toString()+"|"+prependToLog,"Returned: ", responseJSON);
                    resolve(JSON.stringify(responseJSON));
                } 
                else {
                    responseJSON["OperationStatus"] = "SUCCESS";
                    ///const allConfig = require("./convertTextToSpeech-config.json");
                    const appConfig = await applicationConfig.find({AppName:"TTSConfig"}).sort({"id":'descending'})
                    const allConfig = appConfig[0]["Config"]

                    console.info((new Date()).toString()+"|"+prependToLog,"TTSProvider:"+allConfig.Provider)
                    
        
                    if(allConfig.Provider=='Bhashini'){
                        let config = allConfig['Bhashini']
                        const axios = require("axios")
                        let data = JSON.stringify({
                            "pipelineTasks": [
                                {
                                    "taskType": "tts",
                                    "config": {
                                        "language": {
                                            "sourceLanguage": config["languageCode"][language]
                                        }
                                    }
                                }
                            ],
                            "pipelineRequestConfig": {
                                "pipelineId": process.env.BhashiniPipelineID
                            }
                        })
                        //Create pipeline config
                        console.info((new Date()).toString()+"|"+prependToLog,"Sending request to create Bhashini pipeline config")
                        axios.request({
                            method: 'post',
                            maxBodyLength: Infinity,
                            url: config["configURL"],
                            headers: { 
                              'userID': process.env.BhashiniUserID, 
                              'ulcaApiKey': process.env.BhashiniAPIKey, 
                              'Content-Type': 'application/json'
                            },
                            data : data
                        })
                        .then((response) => {
                            console.info((new Date()).toString()+"|"+prependToLog,"Received Pipeline Config Response from Bhashini")
                            var jsonRes=response.data;
                            const callbackURL = jsonRes.pipelineInferenceAPIEndPoint.callbackUrl;
                            const computeCallAuthorizationKey = jsonRes.pipelineInferenceAPIEndPoint.inferenceApiKey.name;
                            const computeCallAuthorizationValue = jsonRes.pipelineInferenceAPIEndPoint.inferenceApiKey.value;
                            const serviceID = jsonRes.pipelineResponseConfig[0].config[0].serviceId;
                            console.info((new Date()).toString()+"|"+prependToLog,"Retrieved Bhashini Config Params")
                            const computeData = JSON.stringify({
                                "pipelineTasks": [       
                                    {
                                        "taskType": "tts",
                                        "config": {
                                            "language": {
                                                "sourceLanguage": config["languageCode"][language]
                                            },
                                            "serviceId": serviceID,
                                            "gender": config["ssmlGender"],
                                            "samplingRate": config['audioConfig']['sampleRateHertz']
                                        }
                                    }
                                ],
                                "inputData": {
                                    "input": [
                                        {
                                            "source": text
                                        }
                                    ]
                                }
                            })
                            console.info((new Date()).toString()+"|"+prependToLog,"Sending request to compute Bhashini config")
                            let headers = {
                                'Content-Type': 'application/json'
                            }
                            headers[computeCallAuthorizationKey]=computeCallAuthorizationValue
                            axios.request({
                                method: 'post',
                                maxBodyLength: Infinity,
                                url: callbackURL,
                                headers: headers,
                                data : computeData
                            })
                            .then((computeResponse) => {
                                console.info((new Date()).toString()+"|"+prependToLog,"Received Pipeline Compute Response from Bhashini")
                                                                
                                // Imports the Google Cloud client library
                                const {Storage} = require('@google-cloud/storage');
                                // Creates a client from a Google service account key
                                config = allConfig['gcsConfig']
                                options = config['options']
                                const storage = new Storage(options);
                                // construct the file to write
                                const fileOptions = config['fileOptions']
                                const bucket = config['bucket']
                                fileName = fileName+'.'+computeResponse['data']['pipelineResponse'][0]['config']['audioFormat']
                                var file = storage.bucket(bucket).file(fileName)
                                const fileBufer = Buffer.from(computeResponse['data']['pipelineResponse'][0]['audio'][0]['audioContent'], 'base64')
                                file.save(fileBufer,options)
                                .then(async ()=>{
                                    await file.makePublic()
                                    responseJSON['PublicURL'] = config["publicURLPath"].replace("{{bucket}}",bucket).replace("{{filename}}",fileName)
                                    console.info((new Date()).toString()+"|"+prependToLog,"Stored the audio file")
                                    resolve(JSON.stringify(responseJSON));
                                })
                                .catch(error =>{
                                    console.info((new Date()).toString()+"|"+prependToLog,"Error encountered in storing file: "+error)
                                    responseJSON["OperationStatus"] = "SUCCESS";
                                    responseJSON['StatusDescription'] = error                
                                    reject(JSON.stringify(responseJSON));
                                })
                            })
                            .catch((error) => {
                                console.info((new Date()).toString()+"|"+prependToLog,"Error encountered in Bhashini Pipeline Compute");
                                console.error((new Date()).toString()+"|"+prependToLog,"Error encountered in Bhashini Pipeline Compute",error);
                                responseJSON["OperationStatus"] = "APP_ERR";
                                responseJSON['StatusDescription'] = error                
                                reject(JSON.stringify(responseJSON));
                            });
                        })
                        .catch((error) => {
                            console.info((new Date()).toString()+"|"+prependToLog,"Error encountered in Bhashini Pipeline Configuration");
                            console.error((new Date()).toString()+"|"+prependToLog,"Error encountered in Bhashini Pipeline Configuration",error);
                            responseJSON["OperationStatus"] = "APP_ERR";
                            responseJSON['StatusDescription'] = error                
                            reject(JSON.stringify(responseJSON));
                        });
                    }
                    else{
                        console.info((new Date()).toString()+"|"+prependToLog,"Converting Text to Speech");
                        let config = allConfig['GCP']

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
                            voice: {languageCode: config["languageCode"][language], ssmlGender: config['ssmlGender']},
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
                                    resolve(JSON.stringify(responseJSON));
                                })
                                .catch(error =>{
                                    console.info((new Date()).toString()+"|"+prependToLog,"Error encountered in storing file: "+error)
                                    responseJSON["OperationStatus"] = "SUCCESS";
                                    responseJSON['StatusDescription'] = error                
                                    reject(JSON.stringify(responseJSON));
                                })
                        })
                        .catch(error =>{
                            console.info((new Date()).toString()+"|"+prependToLog,"Error encountered in synthesizing speech "+error);
                            responseJSON["OperationStatus"] = "APP_ERR";
                            responseJSON['StatusDescription'] = error                
                            reject(JSON.stringify(responseJSON));
                        })
                    }
                }
            }
        }
    })
};

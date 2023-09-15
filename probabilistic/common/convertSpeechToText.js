// const catalyst = require('zcatalyst-sdk-node');
const catalyst = require("zoho-catalyst-sdk");

module.exports = async (basicIO) => {
    
    const executionID = (typeof basicIO['SessionID'] !== 'undefined') ? basicIO['SessionID'] : Math.random().toString(36).slice(2)

    //Prepare text to prepend with logs
    const params = ["Convert Speech to Text",executionID,""]
    const prependToLog = params.join(" | ")
      
    console.info((new Date()).toString()+"|"+prependToLog,"Execution Started")

    let responseAVURL = basicIO["responseAVURL"];
    
    var responseJSON = {
      OperationStatus: "REQ_ERR",
      StatusDescription: null,
    };
    
    if (typeof responseAVURL === "undefined") {
      responseJSON["StatusDescription"] = "responseAVURL missing";
      console.info((new Date()).toString()+"|"+prependToLog,"Returned: ", responseJSON);
      return JSON.stringify(responseJSON);
    }
    else {
      responseJSON["OperationStatus"] = "SUCCESS";
      console.info((new Date()).toString()+"|"+prependToLog,"Converting Speech to Text");

      const getFileBuffer = () => {
        return new Promise((resolve,reject)=>{      
          // Get the Audio bytes
          var options = {
            method: "Get",
            url: responseAVURL,
            headers: {},
            body: null,
            responseType: "arraybuffer",
            responseEncoding: "binary",
          };

          const httpRequest = require("request").defaults({ encoding: null });
          var audioTranscript = "";
          var confidence = 1;
          httpRequest(options, function (error, response) {
            if (error) {
              responseJSON["OperationStatus"] = "REST_API_ERR";
              responseJSON["StatusDescription"] = error;
              console.info((new Date()).toString()+"|"+prependToLog,
                "Technical Error in call audio URL: " +
                  error +
                  "\n\n Returned error response: ",
                responseJSON
              );
              reject(responseJSON);
            } 
            else if (response.statusCode == 200) {
              resolve(response.body)
            }
          })
        })
      }
          
      try{
          const fileBuffer = await getFileBuffer()
          const config = require("./convertSpeechToText-config.json");
          console.info((new Date()).toString()+"|"+prependToLog,"TTSProvider:"+process.env.TTSProvider)
          if(process.env.STTProvider=='Bhashini'){
              let bhashiniConfig = config['BhashiniConfig']
              const axios = require("axios")
              try{
                let data = JSON.stringify({
                    "pipelineTasks": [
                        {
                            "taskType": "asr",
                            "config": {
                                "language": {
                                    "sourceLanguage": bhashiniConfig["languageCode"]["English"]
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
                const response = await axios.request({
                    method: 'post',
                    maxBodyLength: Infinity,
                    url: bhashiniConfig["configURL"],
                    headers: { 
                      'userID': process.env.BhashiniUserID, 
                      'ulcaApiKey': process.env.BhashiniAPIKey, 
                      'Content-Type': 'application/json'
                    },
                    data : data
                })
                console.info((new Date()).toString()+"|"+prependToLog,"Received Pipeline Config Response from Bhashini")
                var jsonRes=response.data;
                const callbackURL = jsonRes.pipelineInferenceAPIEndPoint.callbackUrl;
                const computeCallAuthorizationKey = jsonRes.pipelineInferenceAPIEndPoint.inferenceApiKey.name;
                const computeCallAuthorizationValue = jsonRes.pipelineInferenceAPIEndPoint.inferenceApiKey.value;
                const serviceID = jsonRes.pipelineResponseConfig[0].config[0].serviceId;
                console.info((new Date()).toString()+"|"+prependToLog,"Retrieved Bhashini Config Params")
                const fileBuferBase64 = Buffer.from(fileBuffer,'binary').toString('base64')
                const computeData = JSON.stringify({
                    "pipelineTasks": [       
                        {
                            "taskType": "asr",
                            "config": {
                                "language": {
                                    "sourceLanguage": bhashiniConfig["languageCode"]["English"]
                                },
                                "serviceId": serviceID,
                                "audioFormat": bhashiniConfig['audioConfig']['audioEncoding'],
                                "samplingRate": bhashiniConfig['audioConfig']['sampleRateHertz']
                            }
                        }
                    ],
                    "inputData": {
                        "audio": [
                            {
                                "audioContent": fileBuferBase64
                            }
                        ]
                    }
                })
                console.info((new Date()).toString()+"|"+prependToLog,"Sending request to compute Bhashini config")
                let headers = {
                    'Content-Type': 'application/json'
                }
                headers[computeCallAuthorizationKey]=computeCallAuthorizationValue
                const computeResponse = await axios.request({
                    method: 'post',
                    maxBodyLength: Infinity,
                    url: callbackURL,
                    headers: headers,
                    data : computeData
                })
                console.info((new Date()).toString()+"|"+prependToLog,"Received Pipeline Compute Response from Bhashini")
                responseJSON["OperationStatus"] = "SUCCESS";
                responseJSON["AudioTranscript"] = computeResponse['data']['pipelineResponse'][0]['output'][0]['source']
                responseJSON["Confidence"] = null;
                console.info((new Date()).toString()+"|"+prependToLog,"Returned: ", responseJSON);
                return JSON.stringify(responseJSON);
            }
            catch(error){
                console.info((new Date()).toString()+"|"+prependToLog,"Error encountered in Bhashini Pipeline Configuration");
                console.error((new Date()).toString()+"|"+prependToLog,"Error encountered in Bhashini Pipeline Configuration",error);
                responseJSON["OperationStatus"] = "APP_ERR";
                responseJSON['StatusDescription'] = error                
                return JSON.stringify(responseJSON);
            }
          }
          else{
          const gSTTrequest = {
            config: {
              encoding: config["audioEncoding"],
              sampleRateHertz: config["sampleRateHertz"],
              languageCode: config["languageCode"],
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
              content: fileBuffer//response.body, //Buffer.from(response.body,'binary').toString('base64')
            },
          };
          // Detects speech in the audio file
          console.info((new Date()).toString()+"|"+prependToLog,"Sending request to Speech to Text API");
          // Imports the Google Cloud client library
          const speech = require("@google-cloud/speech");

          // Creates a client
          const client = new speech.SpeechClient(config["options"]);

          const [gSTTresponse] = await client.recognize(gSTTrequest);
          

          audioTranscript = gSTTresponse.results
            .map((result) => result.alternatives[0].transcript)
            .join("\n");
          confidence = gSTTresponse.results
            .map((result) => result.alternatives[0].confidence)
            .join("\n");
          audioTranscript = audioTranscript.toLowerCase();
          console.info((new Date()).toString()+"|"+prependToLog,"Transcription: ", audioTranscript);
          responseJSON["OperationStatus"] = "SUCCESS";
          responseJSON["AudioTranscript"] = audioTranscript;
          responseJSON["Confidence"] = confidence;
          console.info((new Date()).toString()+"|"+prependToLog,"Returned: ", responseJSON);
          return JSON.stringify(responseJSON);
          /*client.recognize(gSTTrequest)
          .then(([gSTTresponse]) => {
            console.info((new Date()).toString()+"|"+prependToLog,JSON.stringify(gSTTresponse))
            audioTranscript = gSTTresponse.results.map(result => result.alternatives[0].transcript).join('\n');
            confidence = gSTTresponse.results.map(result => result.alternatives[0].confidence).join('\n');
            audioTranscript=audioTranscript.toLowerCase()
            console.info((new Date()).toString()+"|"+prependToLog,'Transcription: ', audioTranscript);
            resolve([audioTranscript,confidence])
          })
          .catch(err=>{
            console.info((new Date()).toString()+"|"+prependToLog,'Error from S2T API: '+ err);
            reject(err)
          })*/
        }
      } 
      catch(error){
          responseJSON["OperationStatus"] = "REST_API_ERR";
          responseJSON["StatusDescription"] = error
//            "Error returned by API: " + response.statusCode;
          console.info((new Date()).toString()+"|"+prependToLog,  "Error returned by API: " , error)
//              response.statusCode +
  //            " | " +
    //          JSON.stringify(response.body) +
      //        "\nReturned error response: ",
        //    responseJSON
          //);
          return JSON.stringify(responseJSON);
      };
    }
};

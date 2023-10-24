// const catalyst = require('zcatalyst-sdk-node');
//const catalyst = require("zoho-catalyst-sdk");

module.exports = async (basicIO) => {
  const executionID = (typeof basicIO['SessionID'] !== 'undefined') ? basicIO['SessionID'] : Math.random().toString(36).slice(2)

  //Prepare text to prepend with logs
  const params = ["Store File in GCS",executionID,""]
  const prependToLog = params.join(" | ")
      
  console.info((new Date()).toString()+"|"+prependToLog,"Execution Started")

  let contentType = basicIO["contentType"];
  let fileData = basicIO["fileData"];
  let fileName = basicIO["fileName"];
  let fileType = basicIO["fileType"];
  var responseJSON = {
    OperationStatus: "REQ_ERR",
    ErrorDescription: null,
  };
  if (typeof contentType === "undefined") {
    responseJSON["ErrorDescription"] = "contentType missing";
    console.info((new Date()).toString()+"|"+prependToLog,"Returned: ", responseJSON);
    return JSON.stringify(responseJSON);
  } else if (typeof fileData === "undefined") {
    responseJSON["ErrorDescription"] = "fileData missing";
    console.info((new Date()).toString()+"|"+prependToLog,"Returned: ", responseJSON);
    return JSON.stringify(responseJSON);
  } else if (typeof fileName === "undefined") {
    responseJSON["ErrorDescription"] = "fileName missing";
    console.info((new Date()).toString()+"|"+prependToLog,"Returned: ", responseJSON);
    return JSON.stringify(responseJSON);
  } else {
    fileType = typeof fileType === "undefined" ? contentType : fileType;
    responseJSON["OperationStatus"] = "SUCCESS";
    console.info((new Date()).toString()+"|"+prependToLog,"Storing File in GCS");

    const getFileContent = (contentType, content) => {
      return new Promise((resolve, reject) => {
        if (contentType != "URL") {
          resolve(content);
        } else {
          // Read the file from URL in binary mode
          let options = {
            method: "Get",
            url: content,
            headers: {},
            body: null,
            responseType: "arraybuffer",
            responseEncoding: "binary",
          };
          const httpRequest = require("request").defaults({ encoding: null });
          httpRequest(options, async function (error, response) {
            if (error) {
              reject(error);
            } else if (response.statusCode == 200) {
              resolve(response.body);
            } else {
              reject(response.statusCode);
            }
          });
        }
      });
    };

    try {
      const fileContent = await getFileContent(contentType, fileData);
      const config = require("./storeAudioFileinGCS-config.json");
      fileName = fileName + "." + config["fileExtension"][fileType];
      // Imports the Google Cloud client library
      const { Storage } = require("@google-cloud/storage");
      // Creates a client from a Google service account key
      options = config["options"];
      const storage = new Storage(options);
      // construct the file to write
      const fileOptions = config["fileOptions"][contentType];
      const bucket = config["bucket"];
      var file = storage.bucket(bucket).file(fileName);
      try {
        await file.save(fileContent, options);
        await file.makePublic();
        const publicURL = config["publicURLPath"]
          .replace("{{bucket}}", bucket)
          .replace("{{filename}}", fileName);
        console.info((new Date()).toString()+"|"+prependToLog,"Stored the audio file");
        responseJSON["OperationStatus"] = "SUCCESS";
        responseJSON["PublicURL"] = publicURL;
        console.info((new Date()).toString()+"|"+prependToLog,"Returned: ", responseJSON);
        return JSON.stringify(responseJSON);
      } catch (error) {
        responseJSON["OperationStatus"] = "GCS_ERR";
        responseJSON["ErrorDescription"] = error;
        console.info((new Date()).toString()+"|"+prependToLog,
          "Technical Error in storing file: " +
            error +
            "\n\n Returned error response: ",
          responseJSON
        );
        return JSON.stringify(responseJSON);
      }
    } catch (error) {
      responseJSON["OperationStatus"] = "REST_API_ERR";
      responseJSON["ErrorDescription"] = error;
      console.info((new Date()).toString()+"|"+prependToLog,
        "Technical Error in HTTP Request: " +
          error +
          "\n\n Returned error response: ",
        responseJSON
      );
      return JSON.stringify(responseJSON);
    }
  }
};

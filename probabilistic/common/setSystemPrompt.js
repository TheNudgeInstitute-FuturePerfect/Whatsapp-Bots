// const catalyst = require('zcatalyst-sdk-node');
const catalyst = require("zoho-catalyst-sdk");

module.exports = async (basicIO) => {
  /*
	Request Params: 
		{
			prompt: <Name of the prompt>
			content: <Content>
			isactive: <true/false>
		}
	Response: {
		OperationStatus: <Status Code>
		StatusDescription: <Description of error if any>
		Value: <Contribution updated>
	}
	*/

  const catalystApp = catalyst.initialize();

  const executionID = Math.random().toString(36).slice(2)

	//Prepare text to prepend with logs
	const params = ["Set System Prompt",executionID,""]
	const prependToLog = params.join(" | ")
		
	console.info((new Date()).toString()+"|"+prependToLog,"Execution Started")


  var result = {
    OperationStatus: "SUCCESS",
  };

  var prompt = basicIO["prompt"];
  if (typeof prompt === "undefined") {
    result["OperationStatus"] = "REQ_ERR";
    result["StatusDescription"] = "Missing parameter: prompt";
    console.info((new Date()).toString()+"|"+prependToLog,"Execution Completed: ", result);
    return JSON.stringify(result);
  } else {
    prompt = prompt.toString();
    if (prompt.length > 20) {
      result["OperationStatus"] = "REQ_ERR";
      result["StatusDescription"] =
        "Topic name in prompt can't exceed 20 characters including whitespace and emojis";
        console.info((new Date()).toString()+"|"+prependToLog,"Execution Completed: ", result);
      return JSON.stringify(result);
    } else {
      var isActive = basicIO["isactive"];
      if (typeof isActive === "undefined") {
        result["OperationStatus"] = "REQ_ERR";
        result["StatusDescription"] = "Missing parameter: isactive";
        console.info((new Date()).toString()+"|"+prependToLog,"Execution Completed: ", result);
        return JSON.stringify(result);
      } else if (
        typeof isActive !== "boolean" &&
        !["true", "false", true, false].includes(isActive)
      ) {
        result["OperationStatus"] = "REQ_ERR";
        result["StatusDescription"] =
          "isactive must be true or false. It's " + typeof isActive;
        console.info((new Date()).toString()+"|"+prependToLog,"Execution Completed: ", result, isActive);
        return JSON.stringify(result);
      } else {
        var content = basicIO["content"];
        if (typeof content === "undefined") {
          result["OperationStatus"] = "REQ_ERR";
          result["StatusDescription"] = "Missing parameter: content";
          console.log("Execution Completed: ", result);
          return JSON.stringify(result);
        } else {
          var seqNO = basicIO["sequence"];
          if (typeof seqNO === "undefined") {
            result["OperationStatus"] = "REQ_ERR";
            result["StatusDescription"] = "Missing parameter: sequence";
            console.info((new Date()).toString()+"|"+prependToLog,"Execution Completed: ", result);
            return JSON.stringify(result);
          } else if (isNaN(parseInt(seqNO) == true)) {
            result["OperationStatus"] = "REQ_ERR";
            result["StatusDescription"] =
              "sequence must be an integer. It's " + typeof seqNO;
            console.info((new Date()).toString()+"|"+prependToLog,"Execution Completed: ", result);
            return JSON.stringify(result);
          } else {
            var supportingText = basicIO["helptext"];
            var supportingAVURL = basicIO["helpurl"];
            var supportingImageURL = basicIO["helpimage"];
            var persona = basicIO["persona"];
            var objectiveMessage = basicIO["objmsg"];
            var type = basicIO["type"];
            if (
              typeof persona !== "undefined" &&
              persona != null &&
              persona.length > 20
            ) {
              result["OperationStatus"] = "REQ_ERR";
              result["StatusDescription"] =
                "Persona name in prompt can't exceed 20 characters including whitespace and can't have emojis";
              console.info((new Date()).toString()+"|"+prependToLog,"Execution Completed: ", result);
              return JSON.stringify(result);
            } else if (
              typeof persona !== "undefined" &&
              persona != null &&
              persona.length == 0
            ) {
              result["OperationStatus"] = "REQ_ERR";
              result["StatusDescription"] =
                "Persona name in prompt can't be empty string";
              console.info((new Date()).toString()+"|"+prependToLog,"Execution Completed: ", result);
              return JSON.stringify(result);
            } else {

              var showLearningContent = basicIO["showLearningContent"];
              if (
                typeof showLearningContent !== "boolean" &&
                !["true", "false", true, false].includes(showLearningContent)
              ) {
                result["OperationStatus"] = "REQ_ERR";
                result["StatusDescription"] =
                  "showLearningContent must be true or false. It's " + typeof isActive;
                console.info((new Date()).toString()+"|"+prependToLog,"Execution Completed: ", result, isActive);
                return JSON.stringify(result);
              } else {

                var isPaid = basicIO["isPaid"];
                if (
                  typeof isPaid !== "boolean" &&
                  !["true", "false", true, false].includes(isPaid)
                ) {
                  result["OperationStatus"] = "REQ_ERR";
                  result["StatusDescription"] =
                    "isPaid must be true or false. It's " + typeof isActive;
                  console.info((new Date()).toString()+"|"+prependToLog,"Execution Completed: ", result, isActive);
                  return JSON.stringify(result);
                } else {
                  var insertQuery = {
                    Name: prompt,
                    Content: content,
                    IsActive: isActive,
                    SupportingText: supportingText,
                    SupportingAVURL: supportingAVURL,
                    SupportingImageURL: supportingImageURL,
                    Sequence: seqNO,
                    PrimaryKey: prompt + "-" + seqNO,
                    Persona: persona,
                    ObjectiveMessage: objectiveMessage,
                    Type: typeof type === "undefined" ? "Topic Prompt" : type,
                    ShowLearningContent : (typeof showLearningContent === "undefined") ? false : showLearningContent,
                    IsPaid : (typeof isPaid === "undefined") ? false : isPaid
                  };
                  const datastore = catalystApp.datastore();
                  let table = datastore.table("SystemPrompts");
                  try {
                    const insertQueryResult = await table.insertRow(insertQuery);
                    if(typeof insertQueryResult['ROWID']==='undefined'){
                        throw new Error(insertQueryResult)
                    }
                    const allConfig = require("./setSystemPrompt-config.json");
                    let setConfigurationParam = require("./setConfigurationParam.js");
                    allConfig["defaultConfig"].forEach(async (cfg) => {
                      try {
                        let addedCFG = await setConfigurationParam({
                          param: cfg.Name,
                          value: cfg.Value,
                          description: cfg.Description,
                          id: insertQueryResult["ROWID"],
                        });
                        console.info((new Date()).toString()+"|"+prependToLog," default configuration:", addedCFG);
                      } catch (error) {
                        console.info((new Date()).toString()+"|"+prependToLog,
                          "Error in adding default configuration:"
                        );
                        console.error((new Date()).toString()+"|"+prependToLog,
                          "Error in adding default configuration:",
                          error
                        );
                      }
                    });

                    result["OperationStatus"] = "SUCCESS";
                    const searchQuery =
                      "Select ROWID from SystemPrompts where IsActive = true and Name = '" +
                      prompt +
                      "'";
                    const zcql = catalystApp.zcql();
                    try {
                      const searchQueryResult = await zcql.executeZCQLQuery(
                        searchQuery
                      );
                      if (searchQueryResult == null) {
                        result["OperationStatus"] = "SUCCESS_NO_ACTV";
                        result["StatusDescription"] =
                          "Prompt added. But none of the prompts are active for the topic '" +
                          prompt +
                          "'.";
                        console.info((new Date()).toString()+"|"+prependToLog,"Execution Completed: ", result);
                        return JSON.stringify(result);
                      } else if (searchQueryResult.length == 0) {
                        result["OperationStatus"] = "SUCCESS_NO_ACTV";
                        result["StatusDescription"] =
                          "Prompt added. But none of the prompts are active for the topic '" +
                          prompt +
                          "'.";
                          console.info((new Date()).toString()+"|"+prependToLog,"Execution Completed: ", result);
                        return JSON.stringify(result);
                      } else {
                      /*else if(searchQueryResult.length>1){
                        var updateQuery = searchQueryResult.filter(data=>data.SystemPrompts.ROWID != insertQueryResult.ROWID)
                        updateQuery = updateQuery.map(data=>{
                          var returnVal = {}
                          returnVal['ROWID']=data.SystemPrompts.ROWID
                          returnVal['IsActive']=false
                          return returnVal	
                        })
                        table.updateRows(updateQuery)
                        .then((updateQueryResult) => {
                          result['OperationStatus']="SUCCESS_MLTPL_ACTV"
                          result['StatusDescription']="Prompt added. Multiple prompts were active for topic - '"+prompt+"'. Thus deactivated all other prompts except the new one."
                          console.info((new Date()).toString()+"|"+prependToLog,"Execution Completed: ",result);
                          return JSON.stringify(result);
                          
                        })
                        .catch(error=>{
                          result['OperationStatus']="SUCCESS_MLTPL_ACTV_ERR"
                          result['StatusDescription']="Prompt added. Multiple prompts are active for topic - '"+prompt+"'. Please mark only one as active."
                          console.info((new Date()).toString()+"|"+prependToLog,"Execution Completed: ",result,error);
                          return JSON.stringify(result);
                          
                        })
                      }*/
                        console.info((new Date()).toString()+"|"+prependToLog,"Execution Completed: ", result);
                        return JSON.stringify(result);
                      }
                    } catch (error) {
                      result["OperationStatus"] = "ZCQL_ERR";
                      result["StatusDescription"] =
                        "Error in execution search query";
                      console.info((new Date()).toString()+"|"+prependToLog,"Execution Completed: ", result, error);
                      return JSON.stringify(result);
                    }
                  } catch (error) {
                    if (error.toString().includes("DUPLICATE") != -1) {
                      result["OperationStatus"] = "DUP_ERR";
                      result["StatusDescription"] =
                        "A prompt with same name and sequene number exists. Please use a different sequence number";
                    } else {
                      result["OperationStatus"] = "ZCQL_ERR";
                      result["StatusDescription"] = "Error in inserting new record";
                    }
                    console.info((new Date()).toString()+"|"+prependToLog,"Execution Completed with error: ", result);
                    console.info((new Date()).toString()+"|"+prependToLog,"Execution Completed with error: ", error);
                    return JSON.stringify(result);
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};

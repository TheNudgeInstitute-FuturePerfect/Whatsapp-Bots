const request = require("request");
const catalyst = require("zoho-catalyst-sdk");

const catalystApp = catalyst.initialize();

const executionID = Math.random().toString(36).slice(2)

//Prepare text to prepend with logs
const params = ["addNewConfiguration",executionID,""]
const prependToLog = params.join(" | ")
    
console.info((new Date()).toString()+"|"+prependToLog,"Execution Started")


const timer = (sleepTime) => {
    return new Promise(async (resolve, reject) => {
      //console.info((new Date()).toString()+"|"+prependToLog,'Wait for '+sleepTime)
      setTimeout(resolve, sleepTime);
    });
  };

let zcql = catalystApp.zcql()

zcql.executeZCQLQuery("Select distinct ROWID, Name from SystemPrompts where Type = 'Topic Prompt'")
.then(async (rowids)=>{
    for(var i = 0; i<rowids.length; i++){
        data = rowids[i]
        const options = {
            method:"POST",
            url:process.env.ConfigurationCRUDurl,
            headers:{"Content-Type": "application/json"},
            body:JSON.stringify({
                "id":data.SystemPrompts.ROWID,
                "param":"progressbarat",
                "value":data.SystemPrompts.Name == "Mock Interview" ? "4,8":"3",
                "description":"number of lines of chat after which msg needs to be sent"
            })
        }
        await timer(1000)
        request(options, function (error, response) {
            if (error) {
              console.error((new Date()).toString()+"|"+prependToLog,"Error in API Call: " + error);
              console.error((new Date()).toString()+"|"+prependToLog,"Request Parameters: " + JSON.stringify(options));
            } 
            else {
                console.info((new Date()).toString()+"|"+prependToLog,"API Response: ", response.body);
            }
        })
    }
})
.catch((error)=>{
    console.error((new Date()).toString()+"|"+prependToLog,"Error in API Call: " + error);
    console.error((new Date()).toString()+"|"+prependToLog,"Request Parameters: " + JSON.stringify(options));
})
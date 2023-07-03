"use strict";

const express = require("express");
// const catalyst = require('zcatalyst-sdk-node');
const catalyst = require("zoho-catalyst-sdk");
const searchUserbyMobile = require("./common/searchUserbyMobile.js");
const addUserData = require("./common/addUserData.js");

// const app = express();
// app.use(express.json());
const app = express.Router();

app.post("/create", (req, res) => {
  let catalystApp = catalyst.initialize(req, { type: catalyst.type.applogic });

  const requestBody = req.body;
  //Prepare Date
  const currentDate = new Date();
  const regDate =
    currentDate.getFullYear() +
    "-" +
    ("0" + (currentDate.getMonth() + 1)).slice(-2) +
    "-" +
    ("0" + currentDate.getDate()).slice(-2) +
    " " +
    ("0" + currentDate.getHours()).slice(-2) +
    ":" +
    ("0" + currentDate.getMinutes()).slice(-2) +
    ":" +
    ("0" + currentDate.getSeconds()).slice(-2);
  //console.log('Current TimeStamp= '+currentDate)

  //Get table meta object without details.
  let table = catalystApp.datastore().table("Users");

  //Use Table Meta Object to insert the row which returns a promise
  let insertPromise = table.insertRow({
    Mobile: requestBody["Mobile"].slice(-10),
    Name: encodeURI(requestBody["Name"]),
    Age: requestBody["Age"],
    WhatsAppOptedIn: requestBody["WAOptedIn"],
    Consent: false, //Updated in separate call after seeking informed consent
    GlificID: requestBody["contact"]["id"],
    GlificIDUpdated: true,
    IsActive: true,
    RegisteredTime: regDate,
    Language: requestBody["Language"],
    Gender: requestBody["Gender"],
    NudgeTime: process.env.DefaultNudgeHour,
    OnboardingComplete: false,
    OnboardingStep: 1,
    Excluded: false,
  });

  insertPromise
    .then((row) => {
      console.log("\nInserted Row : " + JSON.stringify(row));
      res.status(200).json({ OperationStatus: "USER_RECORD_CREATED" });
    })
    .catch((err) => {
      console.log(err);
      if (err.indexOf("DUPLICATE_VALUE") != 0) {
        console.log("Response Sent:", { OperationStatus: "USER_ALRDY_PRSNT" });
        res.status(200).json({ OperationStatus: "USER_ALRDY_PRSNT" });
      } else res.status(500).send(err);
    });
});

app.post("/update", async (req, res) => {
  let catalystApp = catalyst.initialize(req, { type: catalyst.type.applogic });
  //Initialze ZCQL
  let zcql = catalystApp.zcql();

  const requestBody = req.body;
  var responseJSON = {};

  //Get the User's mobile number
  //const mobile = requestBody['contact'].phone.length == 12 ? requestBody['contact'].phone-910000000000 : requestBody['contact'].phone
  const mobile = requestBody["Mobile"].toString().slice(-10);
  console.log("User Mobile Number: " + mobile);
  //Get the Consent Status: Yes/No
  var updateFields = [];
  var requestOK = true;
  var errorDescription = "";
  //Consent
  //console.log(typeof requestBody.consent)
  //console.log(typeof requestBody["contact"]["fields"]["consent"]["value"])
  //console.log(requestBody["contact"]["fields"]["consent"]["value"].length)
  if (typeof requestBody["Consent"] !== "undefined") {
    if (requestBody["Consent"].length > 0) {
      updateFields.push("Consent=" + requestBody["Consent"]);
    }
  }

  //Name
  if (typeof requestBody["Name"] !== "undefined")
    if (requestBody["Name"].length > 0)
      updateFields.push("Name='" + encodeURI(requestBody["Name"]) + "'");
    else {
      requestOK = false;
      errorDescription += "name is empty. ";
    }

  //Age
  if (typeof requestBody["Age"] !== "undefined")
    if (requestBody["Age"].length > 0)
      updateFields.push("Age=" + requestBody["Age"] + "");
    else {
      requestOK = false;
      errorDescription += "age is empty. ";
    }
  //Gender
  if (typeof requestBody["Gender"] !== "undefined")
    if (requestBody["Gender"].length > 0)
      updateFields.push("Gender='" + requestBody["Gender"] + "'");
    else {
      requestOK = false;
      errorDescription += "gender is empty. ";
    }
  //Language
  if (typeof requestBody["Language"] !== "undefined")
    if (
      requestBody["Language"].length > 0 &&
      requestBody["Language"].indexOf("@result") == -1
    )
      updateFields.push("Language='" + requestBody["Language"] + "'");
    else {
      requestOK = false;
      errorDescription +=
        "Either Language is null or has invalid value like @result. ";
    }

  //1:1 Nudge Time
  if (typeof requestBody["NudgeTime"] !== "undefined")
    if (requestBody["NudgeTime"].length > 0)
      updateFields.push("NudgeTime='" + requestBody["NudgeTime"] + "'");
    else {
      requestOK = false;
      errorDescription += "NudgeTime is empty. ";
    }

  //Unsubscribed/Re-Subscribed
  if (typeof requestBody["IsActive"] !== "undefined")
    if (typeof requestBody["IsActive"] === "boolean")
      updateFields.push("IsActive=" + requestBody["IsActive"]);
    else {
      requestOK = false;
      errorDescription += "isactive is not a boolean value. ";
    }

  //Excluded
  if (typeof requestBody["Excluded"] !== "undefined")
    if (typeof requestBody["Excluded"] === "boolean")
      updateFields.push("Excluded=" + requestBody["Excluded"]);
    else {
      requestOK = false;
      errorDescription += "Excluded is not a boolean value. ";
    }

  if (typeof requestBody["GlificID"] !== "undefined")
    if (!isNaN(parseInt(requestBody["GlificID"])))
      updateFields.push("GlificID=" + requestBody["GlificID"]);
    else {
      requestOK = false;
      errorDescription += "GlificID is not a number. ";
    }

  //EnglishProficiency
  if (typeof requestBody["EnglishProficiency"] !== "undefined")
    if (requestBody["EnglishProficiency"] == null) {
      updateFields.push("EnglishProficiency=null");
    } else if (requestBody["EnglishProficiency"].length > 0)
      if (
        ["Decent", "Beginner", "Intermediate", "Advanced"].includes(
          requestBody["EnglishProficiency"]
        )
      )
        updateFields.push(
          "EnglishProficiency='" + requestBody["EnglishProficiency"] + "'"
        );
      else {
        requestOK = false;
        errorDescription +=
          "EnglishProficiency not one of Beginner,Intermediate and Advanced. ";
      }

  //Unsubscribed/Re-Subscribed
  if (typeof requestBody["OnboardingComplete"] !== "undefined") {
    if (typeof requestBody["OnboardingComplete"] === "boolean") {
      if (typeof requestBody["OnboardingStep"] === "undefined") {
        requestOK = false;
        errorDescription +=
          "OnboardingStep is required along with OnboardingComplete status.";
      } else {
        updateFields.push(
          "OnboardingComplete=" + requestBody["OnboardingComplete"]
        );
        updateFields.push("OnboardingStep=" + requestBody["OnboardingStep"]);
      }
    } else {
      requestOK = false;
      errorDescription += "OnboardingComplete is not a boolean value. ";
    }
  }

  //Final fields to update
  console.log("Final fields to update: " + updateFields.join(","));
  if (requestOK == false) {
    console.log("Issue with request: ", errorDescription);
    responseJSON["ErrorDescription"] = errorDescription;
    responseJSON["OperationStatus"] = "REQ_ERR";
    res.status(200).json(responseJSON);
  } else if (updateFields.length == 0) {
    console.log("No field to update");
    responseJSON["ErrorDescription"] = "No field to update";
    responseJSON["OperationStatus"] = "SUCCESS";
    res.status(200).json(responseJSON);
  } else {
    //Update consent
    let query =
      "UPDATE Users SET " +
      updateFields.join(",") +
      " where Mobile='" +
      mobile +
      "'";
    console.log("Query : " + query);
    //Execute Query
    let zcqlQuestions = zcql.executeZCQLQuery(query);

    zcqlQuestions
      .then((questionQueryResult) => {
        //If there is no record, then the mobile number does not exist in system. Return error
        if (questionQueryResult.length == 0) {
          //Send the response
          responseJSON["OperationStatus"] = "USER_NOT_FOUND";
          console.log("USER_NOT_FOUND ERROR");
          res.status(200).json(responseJSON);
        }
        //If there are more than one records active for a mobile number, return error that there are more than one User.
        else if (questionQueryResult.length > 1) {
          //Send the response
          responseJSON["OperationStatus"] = "DUPLICATE_USERS_FOUND";
          console.log("DUPLICATE_USERS_FOUND: " + questionQueryResult);
          res.status(200).json(responseJSON);
        } else {
          responseJSON["OperationStatus"] = "SUCCESS";
          responseJSON["UserROWID"] = questionQueryResult[0]["Users"]["ROWID"];
          console.log(
            "Updated User Record - " + JSON.stringify(questionQueryResult)
          );
          res.status(200).json(responseJSON);
        }
      })
      .catch((err) => {
        console.log(err);
        res.status(500).send(err);
      });
  }
});

app.post("/search", (req, res) => {
  let catalystApp = catalyst.initialize(req, { type: catalyst.type.applogic });

  const requestBody = req.body;
  //Get the User's mobile number
  //const mobile = requestBody['contact'].phone.length == 12 ? requestBody['contact'].phone-910000000000 : requestBody['contact'].phone
  const mobile = requestBody["Mobile"].slice(-10);
  console.log("User Mobile Number: " + mobile);

  //Initialze ZCQL
  let zcql = catalystApp.zcql();

  //Update consent
  let query =
    "Select ROWID, IsActive from User where Mobile='" +
    mobile +
    "' and isActive=true";
  console.log("Query : " + query);
  //Execute Query
  let zcqlQuestions = zcql.executeZCQLQuery(query);
  var responseJSON = {};
  zcqlQuestions
    .then((questionQueryResult) => {
      //If there is no record, then the mobile number does not exist in system. Return error
      if (questionQueryResult.length == 0) {
        //Send the response
        responseJSON["OperationStatus"] = "USER_NOT_FOUND";
        console.log("USER_NOT_FOUND ERROR");
        res.status(200).json(responseJSON);
      }
      //Else return success
      else {
        responseJSON["OperationStatus"] = "SUCCESS";
        console.log("User Found");
        res.status(200).json(responseJSON);
      }
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send(err);
    });
});

app.post("/searchfield", (req, res) => {
  let catalystApp = catalyst.initialize(req, { type: catalyst.type.applogic });

  const requestBody = req.body;
  //Get the User's mobile number
  //const mobile = requestBody['contact'].phone.length == 12 ? requestBody['contact'].phone-910000000000 : requestBody['contact'].phone
  const mobile = requestBody["Mobile"].slice(-10);
  console.log("User Mobile Number: " + mobile);
  var fields = requestBody["Fields"];
  console.log("Fields: " + fields);
  if (!Array.isArray(fields)) {
    fields = fields.split(",");
  }
  console.log("Field Array: " + fields);
  //Initialze ZCQL
  let zcql = catalystApp.zcql();

  //Update consent
  let query =
    "Select ROWID, " +
    fields.join(", ") +
    " from Users where Mobile='" +
    mobile +
    "' and IsActive=true";
  console.log("Query : " + query);
  //Execute Query
  let zcqlQuestions = zcql.executeZCQLQuery(query);
  var responseJSON = {};
  zcqlQuestions
    .then((questionQueryResult) => {
      //If there is no record, then the mobile number does not exist in system. Return error
      if (questionQueryResult.length == 0) {
        //Send the response
        responseJSON["OperationStatus"] = "USER_NOT_FOUND";
        console.log("USER_NOT_FOUND ERROR");
        res.status(200).json(responseJSON);
      }
      //Else return success
      else {
        responseJSON["OperationStatus"] = "NO_VAL";
        for (var i = 0; i < fields.length; i++) {
          if (
            typeof questionQueryResult[i]["Users"][fields[i]] !== "undefined"
          ) {
            if (questionQueryResult[i]["Users"][fields[i]] != null) {
              responseJSON[fields[i]] =
                questionQueryResult[i]["Users"][fields[i]];
              responseJSON["OperationStatus"] = "SUCCESS";
            }
          } else responseJSON[fields[i]] = null;
        }
        console.log("End of execution", responseJSON);
        res.status(200).json(responseJSON);
      }
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send(err);
    });
});

app.post("/createuserdata", (req, res) => {
  const requestBody = req.body;
  //Get table meta object without details.
  /*let circuit = catalystApp.circuit();
	circuit.execute("Test",Math.random().toString(36).slice(2),requestBody)
	.then((result)=>{
		console.log("\nInserted Row : " + JSON.stringify(result));
		res.status(200).json({"OperationStatus":"SUCCESS"});
	})
	.catch((err)=>{
		console.log(err);
		res.status(500).send(err);
	})*/
  let validateUserDataRequest = require("./common/validateUserDataRequest.js");
  validateUserDataRequest(requestBody)
    .then((validationResultString) => {
      const validationResult = JSON.parse(validationResultString);
      if (validationResult["OperationStatus"] == "SUCCESS") {
        console.log("Validated Request");
        searchUserbyMobile(requestBody)
          .then((userROWIDResultString) => {
            const userROWIDResult = JSON.parse(userROWIDResultString);
            if (userROWIDResult["OperationStatus"] == "SUCCESS") {
              console.log("User ROWID Retrieved");
              var argument = requestBody;
              argument["UserROWID"] = userROWIDResult["UserROWID"];
              addUserData(argument)
                .then((userDataResultString) => {
                  const userDataResult = JSON.parse(userDataResultString);
                  console.log("End of Execution", userDataResult);
                  res.status(200).json(userDataResult);
                  try {
                    sendResponseToGlific({
                      flowID: requestBody["FlowID"],
                      contactID: requestBody["contact"]["id"],
                      resultJSON: JSON.stringify({
                        apiresponse: userDataResult,
                      }),
                    });
                  } catch (e) {
                    console.log(e);
                  }
                })
                .catch((err) => {
                  console.log(err);
                  res.status(500).send(err);
                });
            } else {
              console.log("End of Execution", userROWIDResult);
              res.status(200).json(userROWIDResult);
            }
          })
          .catch((err) => {
            console.log(err);
            res.status(500).send(err);
          });
      } else {
        console.log("End of Execution", validationResult);
        res.status(200).json(validationResult);
      }
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send(err);
    });
});

app.all("/", (req, res) => {
  res.status(200).send("Invalid Operation");
});

module.exports = app;

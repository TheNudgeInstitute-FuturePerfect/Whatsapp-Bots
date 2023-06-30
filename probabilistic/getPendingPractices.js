"use strict";

const express = require("express");
// const catalyst = require('zcatalyst-sdk-node');
const catalyst = require("zoho-catalyst-sdk");
const sendResponseToGlific = require("./common/sendResponseToGlific.js");

// const app = express();
// app.use(express.json());
const app = express.Router();

//Filter unique elements in an array
const unique = (value, index, self) => {
  return self.indexOf(value) === index;
};

app.post("/pendingpractices", (req, res) => {
  let catalystApp = catalyst.initialize(req, { type: catalyst.type.applogic });
  let startTimeStamp = new Date();
  const requestBody = req.body;

  var mobile = requestBody["Mobile"];
  if (typeof mobile === "undefined") {
    const response = {
      OperationStatus: "REQ_ERR",
      StatusDescription: "Missing required parameter - Mobile",
    };
    console.log("End of Execution : ", response);
    res.status(200).json(response);
  } else {
    var responseObject = {
      OperationStatus: "SUCCESS",
    };
    mobile = mobile.slice(-10);
    let zcql = catalystApp.zcql();
    zcql
      .executeZCQLQuery(
        "Select distinct ROWID, RegisteredTime from Users where IsActive=true and Mobile = '" +
          mobile +
          "'"
      )
      .then((users) => {
        if (users.length == 0) {
          responseObject["OperationStatus"] = "USR_NT_FND";
          responseObject["StatusDescription"] =
            "User could not be found or is inactive";
          console.log("End of Execution: ", responseObject);
          res.status(200).json(responseObject);
        } else {
          const today = new Date();
          zcql
            .executeZCQLQuery(
              "Select distinct CREATEDTIME, SessionID from Sessions where Mobile = '" +
                mobile +
                "'"
            )
            .then((sessions) => {
              if (sessions == null) {
                responseObject["StatusDescription"] =
                  "User has not started any conversation";
                responseObject["PendingPracticeCount"] = process.env.MinDays;
                responseObject["PendingPracticeDays"] = process.env.Period;
                console.log("End of Execution: ", responseObject);
                res.status(200).json(responseObject);
              } else if (sessions.length == 0) {
                responseObject["StatusDescription"] =
                  "User has not started any conversation";
                responseObject["PendingPracticeCount"] = process.env.MinDays;
                responseObject["PendingPracticeDays"] = process.env.Period;
                console.log("End of Execution: ", responseObject);
                res.status(200).json(responseObject);
              } else {
                const allDates = sessions.map((data) =>
                  data.Sessions.CREATEDTIME.toString().slice(0, 10)
                );
                //console.log(allDates)
                var uniqueDates = allDates.filter(unique);
                uniqueDates = uniqueDates.sort();
                //console.log(uniqueDates)
                var resurrected = false;
                var resurrectionDate = "";
                for (var j = uniqueDates.length - 1; j > 0; j--) {
                  const gap =
                    (new Date(uniqueDates[j]) - new Date(uniqueDates[j - 1])) /
                    1000 /
                    60 /
                    60 /
                    24;
                  if (gap > 3) {
                    resurrected = true;
                    resurrectionDate = uniqueDates[j];
                    break;
                  }
                }
                var deadline = null;
                var daysSinceRegistration = null;
                if (resurrected == true) {
                  deadline = new Date(resurrectionDate);
                  daysSinceRegistration = Math.floor(
                    (new Date(
                      today.getFullYear(),
                      today.getMonth(),
                      today.getDate()
                    ) -
                      new Date(resurrectionDate)) /
                      1000 /
                      60 /
                      60 /
                      24
                  );
                } else {
                  deadline = new Date(users[0]["Users"]["RegisteredTime"]);
                  deadline.setHours(deadline.getHours() + 5);
                  deadline.setMinutes(deadline.getMinutes() + 30);
                  daysSinceRegistration = Math.floor(
                    (new Date(
                      today.getFullYear(),
                      today.getMonth(),
                      today.getDate()
                    ) -
                      new Date(
                        users[0]["Users"]["RegisteredTime"]
                          .toString()
                          .slice(0, 10)
                      )) /
                      1000 /
                      60 /
                      60 /
                      24
                  );
                }
                console.log(
                  "Resurrected: ",
                  resurrected,
                  "Days since Registration/Resurrection = " +
                    daysSinceRegistration
                );
                deadline.setDate(
                  deadline.getDate() + parseInt(process.env.Period)
                );
                responseObject["DeadlineDate"] =
                  deadline.getFullYear() +
                  "-" +
                  ("0" + (deadline.getMonth() + 1)).slice(-2) +
                  "-" +
                  ("0" + deadline.getDate()).slice(-2);
                //basicIO.write(daysSinceRegistration);
                //
                if (daysSinceRegistration >= process.env.Period) {
                  responseObject["OperationStatus"] = "SSN_ABV_PERIOD";
                  responseObject["StatusDescription"] =
                    "User registered " + daysSinceRegistration + " days ago";
                  console.log("End of Execution: ", responseObject);
                  res.status(200).json(responseObject);
                } else {
                  const userSessions = sessions.filter(
                    (data) =>
                      !(
                        data.Sessions.SessionID.endsWith("Hint") ||
                        data.Sessions.SessionID.endsWith("Translation") ||
                        data.Sessions.SessionID.endsWith("ObjectiveFeedback") ||
                        data.Sessions.SessionID.startsWith("Onboarding") ||
                        data.Sessions.SessionID.endsWith("Onboarding") ||
                        data.Sessions.SessionID.startsWith("onboarding") ||
                        data.Sessions.SessionID.endsWith("onboarding")
                      )
                  );
                  const sessionsAfterResurrection =
                    resurrected == false
                      ? userSessions
                      : userSessions.filter(
                          (data) => data.Sessions.CREATEDTIME > resurrectionDate
                        );
                  const postResurrectionDates = sessionsAfterResurrection.map(
                    (data) => data.Sessions.CREATEDTIME.toString().slice(0, 10)
                  );
                  uniqueDates = postResurrectionDates.filter(unique);
                  uniqueDates = uniqueDates.sort();
                  responseObject["CompletedPracticeCount"] = uniqueDates.length;
                  responseObject["CompletedPracticePeriod"] =
                    daysSinceRegistration;

                  if (uniqueDates.length >= process.env.MinDays) {
                    responseObject["OperationStatus"] = "MIN_SSN_RCHD";
                    responseObject["StatusDescription"] =
                      "User has completed the required days of practice";
                    console.log(
                      "End of Execution: ",
                      responseObject,
                      "\nTotal Days Practices = ",
                      uniqueDates.length
                    );
                    res.status(200).json(responseObject);
                  } else {
                    responseObject["PendingPracticeCount"] =
                      process.env.MinDays - uniqueDates.length;
                    responseObject["PendingPracticeDays"] =
                      process.env.Period - daysSinceRegistration;
                    console.log("End of Execution: ", responseObject);
                    res.status(200).json(responseObject);
                  }
                }
              }
            })
            .catch((err) => {
              responseObject["OperationStatus"] = "ZCQL_ERR";
              responseObject["StatusDescription"] =
                "Error in executing Sessions query";
              console.log(
                "End of Execution: ",
                responseObject,
                "\nError:",
                err
              );
              res.status(200).json(responseObject);
            });
        }
      })
      .catch((err) => {
        responseObject["OperationStatus"] = "ZCQL_ERR";
        responseObject["StatusDescription"] = "Error in Users executing query";
        console.log("End of Execution: ", responseObject, "\nError:", err);
        res.status(200).json(responseObject);
      });
    let endTimeStamp = new Date();
    let executionDuration = (endTimeStamp - startTimeStamp) / 1000;
    if (executionDuration > 3) {
      sendResponseToGlific({
        flowID: requestBody["FlowID"],
        contactID: requestBody["contact"]["id"],
        resultJSON: JSON.stringify({
          practices: responseObject,
        }),
      })
        .then((glificResponse) => {})
        .catch((err) => console.log("Error returned from Glific: ", err));
    }
  }
});

app.all("/", (req, res) => {
  res.status(403).send("Resource not found.");
});

module.exports = app;

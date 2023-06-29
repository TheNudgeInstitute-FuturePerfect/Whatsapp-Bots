"use strict";

const express = require("express");
// const catalyst = require('zcatalyst-sdk-node');
const catalyst = require("zoho-catalyst-sdk");

// const app = express();
// app.use(express.json());
const app = express.Router();

app.get("/sleep", (req, res) => {
  const catalystApp = catalyst.initialize(req);

  const requestBody = req.body;
  console.log(requestBody);
  var sleepTime = requestBody["Seconds"];
  if (typeof sleepTime === "undefined") sleepTime = req.query.seconds * 1000;

  console.log(JSON.stringify(sleepTime));
  const timer = (sleepTime) => {
    return new Promise(async (resolve, reject) => {
      setTimeout(resolve, sleepTime);
    });
  };
  timer(sleepTime).then(() => {
    console.log(
      "Received sleep request for " +
        sleepTime.toString() +
        " seconds and returned afterwards"
    );
    const reply = { status: "OK" };
    res.status(200).json(reply);
    let functions = catalystApp.functions();
    functions
      .execute("sendResponseToGlific", {
        arg: {
          flowID: requestBody["FlowId"],
          contactID: requestBody["ContactID"],
          resultJSON: JSON.stringify({
            result: {},
          }),
        },
      })
      .then((glificResponse) => {})
      .catch((err) => console.log("Error returned from Glific: ", err));
  });
});

app.post("/sleep", (req, res) => {
  const catalystApp = catalyst.initialize(req);
  const requestBody = req.body;
  console.log(requestBody);
  var sleepTime = requestBody["Seconds"] * 1000;

  console.log(JSON.stringify(sleepTime));
  const timer = (sleepTime) => {
    return new Promise(async (resolve, reject) => {
      setTimeout(resolve, sleepTime);
    });
  };
  timer(sleepTime).then(() => {
    console.log(
      "Received sleep request for " +
        sleepTime.toString() +
        " seconds and returned afterwards"
    );
    const reply = { status: "OK" };
    res.status(200).json(reply);
    let functions = catalystApp.functions();
    functions
      .execute("sendResponseToGlific", {
        args: {
          flowID: requestBody["FlowID"],
          contactID: requestBody["ContactID"],
          resultJSON: JSON.stringify({
            result: reply,
          }),
        },
      })
      .then((glificResponse) => {})
      .catch((err) => console.log("Error returned from Glific: ", err));
  });
});

module.exports = app;

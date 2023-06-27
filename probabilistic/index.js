const express = require("express");
const app = express.Router();

const getEnglishProficiency = require("./getEnglishProficiency.js");
const reportData = require("./ReportData.js");
const translateMsg = require("./translateMsg.js");
const getHintMessage = require("./getHintMessage.js");
const backendSystemPromptCRUD = require("./backendSystemPromptCRUD.js");
const getUserdata = require("./getUserData.js");
const storeSessionEvents = require("./StoreSessionEvents.js");
const reports = require("./Reports.js");
const sleepAndNothingElse = require("./sleepAndNothingElse.js");
const getPendingPractices = require("./getPendingPractices.js");
const studentCRUD = require("./studentCRUD.js");
const data = require("./Data.js");
const getPerformanceReport = require("./getPerformanceReport.js");
const storeFeedback = require("./storeFeedback.js");
const closeLatestSession = require("./closeLatestSession.js");
const getTopics = require("./getTopics.js");
const getLatestSession = require("./getLatestSession.js");

app.use("/getEnglishProficiency", getEnglishProficiency);
app.use("/ReportData", reportData);
app.use("/translateMsg", translateMsg);
app.use("/getHintMessage", getHintMessage);
app.use("/backendSystemPromptCRUD",backendSystemPromptCRUD);
app.use("/getUserdata",getUserdata);
app.use("/StoreSessionEvents",storeSessionEvents);
app.use("/Reports",reports);
app.use("/sleepAndNothingElse",sleepAndNothingElse);
app.use("/getPendingPractices",getPendingPractices);
app.use("/studentCRUD",studentCRUD);
app.use("/Data",data);
app.use("/getPerformanceReport",getPerformanceReport);
app.use("/storeFeedback",storeFeedback);
app.use("/closeLatestSession",closeLatestSession);
app.use("/getTopics",getTopics);
app.use("/getLatestSession",getLatestSession);

module.exports = app;

const express = require("express");
const app = express.Router();

// Advanced I/O const
const glificChatGPTIntegrator = require("./glificChatGPTIntegrator.js");
const getEnglishProficiency = require("./getEnglishProficiency.js");
//const reportData = require("./ReportData.js");
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
const getUserSessionCounts = require("./getUserSessionCount.js");
const wordle = require("./WordleCRUD.js");
const wordleOfDay = require("./wordleOfDay.js");
const questionBank = require("./QuestionBankCRUD.js");
const getRandomQuestions = require("./getRandomQuestions.js");
const storeQuestionAnswers = require("./storeQuestionAnswers.js");
const payment = require("./PaymentCRUD.js");
const doubtsession = require("./DoubtSessionCRUD.js")
const flowQuestions = require("./FlowQuestionsCRUD.js");
const getFlowQuestion = require("./getFlowQuestions.js");
const storeFlowQuestionAnswer = require("./storeFlowQuestionAnswer.js");
const applicationConfig = require("./ApplicationConfigCRUD.js");
const convertSpeechToText = require("./convertSpeechToText.js");

// Basic I/O const
const addUserData = require("./common/addUserData.js");
const sendResponseToGlific = require("./common/sendResponseToGlific.js");
const updateAssessmentContribution = require("./common/updateAssessmentContribution.js");
const getAssessmentContribution = require("./common/getAssessmentContribution.js");
const setSystemPrompt = require("./common/setSystemPrompt.js");
const getConfigurationParamList = require("./common/getConfigurationParamList.js");
const setConfigurationParam = require("./common/setConfigurationParam.js");
const updateConfigurationParam = require("./common/updateConfigurationParam.js");
const getConfigurationParam = require("./common/getConfigurationParam.js");
const deleteSystemPrompt = require("./common/deleteSystemPrompt.js");
const createAudioOfText = require("./common/convertTextToSpeech.js");
const storeAudioFileinGCS = require("./common/storeAudioFileinGCS.js");
const writeTextOnImage = require("./common/writeTextOnImage.js");
const startGlificFlow = require("./common/startGlificFlow.js");
const sendGlificHSMMsg = require("./common/sendGlificHSMMsg.js");
const validateUserDataRequest = require("./common/validateUserDataRequest.js");
const searchUserbyMobile = require("./common/searchUserbyMobile.js");

// Advanced I/O routes
app.use("/glificChatGPTIntegrator",glificChatGPTIntegrator);
app.use("/getEnglishProficiency", getEnglishProficiency);
//app.use("/ReportData", reportData);
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
app.use("/getUserSessionCounts",getUserSessionCounts);
app.use("/wordle",wordle);
app.use("/wordleofday",wordleOfDay);
app.use("/question",questionBank);
app.use("/getquestion",getRandomQuestions);
app.use("/storeanswer",storeQuestionAnswers);
app.use("/payment",payment);
app.use("/doubtsessions",doubtsession);
app.use("/flowQuestions",flowQuestions);
app.use("/getflowquestion",getFlowQuestion);
app.use("/storeflowanswer",storeFlowQuestionAnswer);
app.use("/appconfig",applicationConfig);

// Basic I/O  routes
app.use("/addUserData",addUserData);
app.use("/sendResponseToGlific",sendResponseToGlific);
app.use("/updateAssessmentContribution",updateAssessmentContribution);
app.use("/getAssessmentContribution",getAssessmentContribution);
app.use("/setSystemPrompt",setSystemPrompt);
app.use("/getConfigurationParamList",getConfigurationParamList);
app.use("/setConfigurationParam",setConfigurationParam);
app.use("/updateConfigurationParam",updateConfigurationParam);
app.use("/getConfigurationParam",getConfigurationParam);
app.use("/deleteSystemPrompt",deleteSystemPrompt);
app.use("/createAudioOfText",createAudioOfText);
app.use("/convertSpeechToText",convertSpeechToText);
app.use("/storeAudioFileinGCS",storeAudioFileinGCS);
app.use("/writeTextOnImage",writeTextOnImage);
app.use("/startGlificFlow",startGlificFlow);
app.use("/sendGlificHSMMsg",sendGlificHSMMsg);
app.use("/validateUserDataRequest",validateUserDataRequest);
app.use("/searchUserbyMobile",searchUserbyMobile);

module.exports = app;

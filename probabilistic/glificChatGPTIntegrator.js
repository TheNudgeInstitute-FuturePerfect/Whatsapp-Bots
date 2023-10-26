"use strict";

const express = require("express");
// const catalyst = require('zcatalyst-sdk-node');
//const catalyst = require("zoho-catalyst-sdk");
const Session = require("./models/Sessions.js");
const SystemPrompt = require("./models/SystemPrompts.js");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
// const app = express();
// app.use(express.json());
const app = express.Router();
var bodyParser = require("body-parser");
var prependToLog = null;
var executionID;
app.use(bodyParser.urlencoded({ extended: false }));

const transcribeAudio = async (audioURL, sessionID) => {
  let returnValue = null;
  try {
    const convertSpeechToText = require("./common/convertSpeechToText.js");
    const audioDetails = JSON.parse(
      await convertSpeechToText({
        responseAVURL: audioURL,
        SessionID: sessionID,
      })
    );
    if (audioDetails.OperationStatus === "SUCCESS") {
      returnValue = [audioDetails.AudioTranscript, audioDetails.Confidence];
    } else {
      console.info(
        new Date().toString() + "|" + prependToLog,
        "Encountered error in transcribing audio"
      );
      console.debug(new Date().toString() + "|" + prependToLog, audioDetails);
    }
  } catch (e) {
    console.info(
      new Date().toString() + "|" + prependToLog,
      "Technical error in transcribing audio"
    );
    console.error(new Date().toString() + "|" + prependToLog, e);
  } finally {
    return returnValue;
  }
};

const saveContentInGCS = async (
  fileData,
  fileName,
  fileType,
  contentType,
  sessionID
) => {
  let publicURL = null;
  if (!["Text", "Audio", "Image", "Video"].includes(fileType)) {
    return publicURL;
  }
  try {
    const storeAudioFileinGCS = require("./common/storeAudioFileinGCS.js");
    const gcsFile = JSON.parse(
      await storeAudioFileinGCS({
        contentType: contentType,
        fileData: fileData,
        fileName: fileName,
        fileType: fileType,
        SessionID: sessionID,
      })
    );

    if (gcsFile.OperationStatus === "SUCCESS") {
      publicURL = gcsFile.PublicURL;
      console.info(
        new Date().toString() + "|" + prependToLog,
        "Stored the file in GCS: " + publicURL
      );
    } else {
      console.info(
        new Date().toString() + "|" + prependToLog,
        "Couldn't store the performance report file in GCS"
      );
      console.debug(new Date().toString() + "|" + prependToLog, gcsFile);
    }
  } catch (e) {
    console.info(
      new Date().toString() + "|" + prependToLog,
      "Technical error in storing file in Google Cloud Storage"
    );
    console.error(new Date().toString() + "|" + prependToLog, e);
  } finally {
    return publicURL;
  }
};

const runQuery = async (query, zcql) => {
  let queryData = null;
  try {
    console.debug(
      new Date().toString() + "|" + prependToLog,
      "Executing Query: " + query
    );
    const queryResult = await zcql.executeZCQLQuery(query);
    if (!queryResult || queryResult.length === 0) {
      console.info(
        new Date().toString() + "|" + prependToLog,
        "No data returned from ZCQL Query"
      );
    } else {
      queryData = queryResult;
    }
  } catch (e) {
    console.info(
      new Date().toString() + "|" + prependToLog,
      "Technical error in executing ZCQL Query"
    );
    console.error(new Date().toString() + "|" + prependToLog, e);
  } finally {
    return queryData;
  }
};

app.post("/chatgpt", async (request, response) => {
  //const app = catalyst.initialize(request, { type: catalyst.type.applogic });

  executionID = request.body.sessionId
    ? request.body.sessionId
    : Math.random().toString(36).slice(2);

  //Prepare text to prepend with logs
  const params = ["glificChatGPTIntegrator", request.url, executionID, ""];
  prependToLog = params.join(" | ");

  console.info(
    new Date().toString() + "|" + prependToLog,
    "Start of Execution"
  );

  //const zcql = app.zcql();

  const startTimeStamp = new Date();

  const requestBody = request.body;
  //console.debug((new Date()).toString()+"|"+prependToLog,"request body ......", requestBody);
  //console.info((new Date()).toString()+"|"+prependToLog,requestBody.sessionId);
  let mobile = parseInt(requestBody.mobile.slice(-10));

  let message = requestBody.message;
  console.info(
    new Date().toString() + "|" + prependToLog,
    "Message: " + message
  );

  const messageType = requestBody.messageType;
  //console.info((new Date()).toString()+"|"+prependToLog,"Message Type: " + messageType);

  let messageURL = null;
  let confidenceInterval = null;
  // if message type audio
  if (messageType === "Audio") {
    messageURL = message;
    const messageAudioDetails = await transcribeAudio(messageURL, executionID);
    if (messageAudioDetails !== null) {
      message = messageAudioDetails[0];
      confidenceInterval = messageAudioDetails[1];
      console.debug(
        new Date().toString() + "|" + prependToLog,
        messageAudioDetails
      );
    } else {
      console.info(
        new Date().toString() + "|" + prependToLog,
        "Encountered error in speech recognition"
      );
      response.status(500).json("Encountered error in speech recognition");
    }
  }

  console.info(
    new Date().toString() + "|" + prependToLog,
    "Session ID in Request: " + requestBody.sessionId
  );
  const requestSessionIDTokens = requestBody.sessionId.split(" - ");
  const sessionId = requestSessionIDTokens[0];
  console.info(
    new Date().toString() + "|" + prependToLog,
    "Session ID: " + sessionId
  );

  //Split Session ID to distinguish whether its relateed to normal conversation in a session on specific triggers like Hint, Translation, Doubt, Objective Message etc.
  const sessionType =
    requestSessionIDTokens.length > 1
      ? requestSessionIDTokens[1]
      : "Normal Flow";
  console.info(
    new Date().toString() + "|" + prependToLog,
    "Session Type: " + sessionType
  );

  let systemPromptROWID = null;
  let systemPrompt = null;
  let query = null;
  var filterParams = {};
  if ("topicId" in requestBody) {
    // && !isNaN(requestBody.topicId)) {
    console.log(requestBody.topicId, "_====================");
    systemPromptROWID = new ObjectId(requestBody.topicId);

    // query =
    //   "Select ROWID, Name, Content from SystemPrompts where IsActive = true and ROWID = '" +
    //   systemPromptROWID +
    //   "'";
    filterParams = { IsActive: true, _id: systemPromptROWID };
  } else {
    // query =
    //   "Select ROWID, Name, Content from SystemPrompts where IsActive = true and Name = '" +
    //   requestBody.topic +
    //   "'";
    filterParams = { IsActive: true, Name: requestBody.topic };
  }

  // const systemPromptsResult = await runQuery(query, zcql);
  const systemPromptsResult = await SystemPrompt.find(
    filterParams,
    "_id Name Content"
  );
  if (systemPromptsResult.length > 0) {
    console.info(
      new Date().toString() + "|" + prependToLog,
      "systemPromptsResult",
      systemPromptsResult
    );
    let tempId = systemPromptsResult[0]._id;
    systemPromptROWID = tempId;
    systemPrompt = systemPromptsResult[0].Content;
  } else if (systemPromptsResult !== null) {
    console.info(
      new Date().toString() + "|" + prependToLog,
      "systemPromptsResult",
      systemPromptsResult
    );
    let tempId = systemPromptsResult[0]._id;
    systemPromptROWID = tempId;
    systemPrompt = systemPromptsResult[0].Content;
  } else {
    response
      .status(500)
      .json(
        "Encountered error in executing query for SystemPrompts:" +
          JSON.stringify(filterParams)
      );
  }

  console.info(
    new Date().toString() + "|" + prependToLog,
    "systemPromptROWID: " + systemPromptROWID
  );
  let getConfigurationParam = require("./common/getConfigurationParam.js");
  const messagePrompt = JSON.parse(
    await getConfigurationParam({
      id: systemPromptROWID,
      param: [
        message,
        "model",
        "temperature",
        "maxlinesofchat",
        "terminationprompt",
        "responsetype",
        "performance template",
        "progressbarat",
        "feedback prompt", //Get the feedback prompt configured for the topic to return whether feedback prompt exists or not
        "serious mode prompt", //Get the serious mode prompt
        "voice challenge prompt", //Get the voice challenge prompt
        "easy mode prompt", //Get the voice challenge prompt
      ],
    })
  );

  let isConfigMsg = false;
  let commandMsg = null;
  let feedbackPromptFlag = false;

  //Determine the input type
  let inputType = "SystemMessage";
  if ("inputType" in requestBody) {
    inputType = requestBody.inputType;
  }

  console.info(
    new Date().toString() + "|" + prependToLog,
    "messagePrompt",
    messagePrompt
  );
  if (messagePrompt.OperationStatus == "SUCCESS") {
    if ("Values" in messagePrompt) {
      //Check whether the message received in input is a command message
      if (
        typeof messagePrompt.Values[message.toLowerCase().trim()] !==
        "undefined"
      ) {
        isConfigMsg = true;
        commandMsg = message;
        inputType = commandMsg;
        message = messagePrompt.Values[message.toLowerCase().trim()];
        //console.info((new Date()).toString()+"|"+prependToLog,"Message Prompt: " + message);
      }
      //If feedback prompt exists for the topic, feedbackPromptFlag to True
      if (typeof messagePrompt.Values["feedback prompt"] !== "undefined")
        feedbackPromptFlag = true;
    }
  } else {
    console.info(
      new Date().toString() + "|" + prependToLog,
      "Encountered error in getting configuration parameters"
    );
    console.info(
      new Date().toString() + "|" + prependToLog,
      "status .... ",
      messagePrompt
    );
    response
      .status(500)
      .json("Encountered error in getting configuration parameters");
  }
  // ##############################################
  console.info(
    new Date().toString() + "|" + prependToLog,
    "Input Type: " + inputType
  );

  // ##############################################
  // Initialize the sessions table. Insert the new user message
  // const sessionsTable = app.datastore().table("Sessions");
  let storedSessionRecord = {};
  if (sessionType !== "SentenceFeedback") {
    // Store User's Message in Session Table
    storedSessionRecord = await Session.create({
      Mobile: mobile,
      Message: encodeURIComponent(message),
      SessionID: requestBody.sessionId,
      IsActive: true,
      SystemPromptsROWID: systemPromptROWID,
      MessageAudioURL: messageURL,
      SpeechRecognitionCI: confidenceInterval,
      MessageType: inputType,
    });
  } else {
    storedSessionRecord._id = requestBody.sessionROWID;
  }
  // ##############################################

  /*// Get the session history of user
  let maxRows = null;

  if (sessionType === "SentenceFeedback") {
    maxRows = 1;
  } else {
    const query =
      "select count(ROWID) from Sessions where Mobile = " +
      mobile +
      " and SessionID = '" +
      sessionId +
      "'";
    const maxRowsResult = await runQuery(query, zcql);
    if (maxRowsResult !== null) {
      maxRows = parseInt(maxRowsResult[0]["Sessions"]["ROWID"]);
    } else {
      response.status(500).json("Encountered error in executing query");
    }
  }*/

  const sessionRecords = [];

  //If there is no maxlinesofchat, set it to -1
  const maxlinesofchat =
    typeof messagePrompt["Values"]["maxlinesofchat"] !== "undefined"
      ? messagePrompt["Values"]["maxlinesofchat"] != null
        ? parseInt(messagePrompt["Values"]["maxlinesofchat"])
        : -1
      : -1;

  //const startIndex = Math.max(maxRows - maxlinesofchat, 0);

  let operationStatus = "SUCCESS";
  let isActive = true;

  //for (let i = startIndex; i < maxRows; i += 300) {
  let queryOutput = [];
  if (sessionType === "SentenceFeedback") {
    // query =
    //   "select ROWID, Message, MessageType, Reply, CREATEDTIME, SystemPrompts.Content " +
    //   "from Sessions " +
    //   "left join SystemPrompts on Sessions.SystemPromptsROWID = SystemPrompts.ROWID " +
    //   "where Sessions.ROWID='" +
    //   storedSessionRecord["ROWID"] +
    //   "'";
    queryOutput = await Session.find({
      _id: storedSessionRecord["_id"],
    }).populate({
      path: "SystemPromptsROWID",
      model: SystemPrompt,
      select: "Content",
    });
  } else {
    // query =
    //   "select ROWID, Message, MessageType, Reply, CREATEDTIME, SystemPrompts.Content " +
    //   "from Sessions " +
    //   "left join SystemPrompts on Sessions.SystemPromptsROWID = SystemPrompts.ROWID " +
    //   "where Mobile = " +
    //   mobile +
    //   " and SessionID = '" +
    //   sessionId +
    //   "'" +
    //   " order by CREATEDTIME ASC"

    /*+
      " limit " +
      i +
      ", 300"*/ //" and SystemPromptsROWID =" + systemPromptROWID +

    queryOutput = await Session.aggregate([
      {
        $match: {
          Mobile: mobile.toString(),
          //SessionID: sessionId
          SessionID: [
            "Serious Mode",
            "Voice Challenge",
            "AskAnyDoubt",
          ].includes(sessionType)
            ? requestBody.sessionId
            : sessionId,
        },
      },
      {
        $lookup: {
          from: "systemprompts", // Name of the collection to join with
          localField: "SystemPromptsROWID",
          foreignField: "_id",
          as: "systemPromptData",
        },
      },
      {
        $sort: { CREATEDTIME: 1 }, // Sort by CREATEDTIME in ascending order
      },
      {
        $project: {
          _id: 1,
          Message: 1,
          MessageType: 1,
          Reply: 1,
          CREATEDTIME: 1,
          "systemPromptData.Content": 1,
        },
      },
    ]);
  }

  console.debug(
    new Date().toString() + "|" + prependToLog,
    "queryOutput: " + queryOutput
  );

  // const queryOutput = await zcql.executeZCQLQuery(query);

  const delimeterStartToken = process.env.DelimiterStartToken;
  const delimeterEndToken = process.env.DelimiterEndToken;

  let totalUserMessages = 0;

  sessionRecords.push({
    role: "system",
    content:
      commandMsg == "feedback prompt"
        ? messagePrompt.Values["feedback prompt"]
        : sessionType == "Serious Mode"
        ? messagePrompt.Values["serious mode prompt"]
        : sessionType == "Voice Challenge"
        ? messagePrompt.Values["voice challenge prompt"]
        : sessionType == "Easy Mode"
        ? messagePrompt.Values["easy mode prompt"]
        : systemPrompt, //queryOutput[j]['SystemPrompts']['Content']
  });

  // Prepare a request from active session
  //For Ask Any Doubt, only send last two messages before current one
  let j = ["AskAnyDoubt"].includes(sessionType)
    ? Math.max(queryOutput.length - 3, 0)
    : 0;

  for (; j < queryOutput.length; j++) {
    /*if (i === startIndex && j === 0) {
      sessionRecords.push({
        role: "system",
        content: systemPrompt, //queryOutput[j]['SystemPrompts']['Content']
      });
    }*/

    //If it's an empty response from ChatGPT in the record and it's not current record, don't include it in the session records
    if (j !== queryOutput.length - 1 && queryOutput[j]["Reply"] == null)
      continue;

    //If maxlinesofchat = -1 and its more than 20 messages, break
    if (j >= 20 && maxlinesofchat == -1) break;

    let content = queryOutput[j]["Message"];
    content = decodeURIComponent(content);

    if (
      ["SentenceFeedback", "Serious Mode", "Voice Challenge"].includes(
        sessionType
      )
    ) {
      content = delimeterStartToken + content + delimeterEndToken;
    }

    //Add End of Conversation prompt on last message
    if (
      j === queryOutput.length - 1 &&
      queryOutput.length >= maxlinesofchat &&
      ![
        "ObjectiveFeedback",
        "SentenceFeedback",
        "Hint",
        "Serious Mode",
        "Voice Challenge",
        "AskAnyDoubt",
      ].includes(sessionType)
    ) {
      content = content + "\n" + messagePrompt["Values"]["terminationprompt"];
      operationStatus = "END_OF_CNVRSSN";
      isActive = false;
    }

    //Add prompt to keep conversation on track, in the last message
    if (
      !isConfigMsg &&
      ![
        "ObjectiveFeedback",
        "SentenceFeedback",
        "Hint",
        "Serious Mode",
        "Voice Challenge",
        "AskAnyDoubt",
      ].includes(sessionType) &&
      !message.includes("I want to continue our last conversation") &&
      j === queryOutput.length - 1
    ) {
      content =
        content +
        "\n" +
        "If my statement is not in the context of the topic that we are discussing, please redirect our conversation as per the context.";
    }

    if (commandMsg != "feedback prompt") {
      sessionRecords.push({
        role: "user",
        content: content,
      });

      if (
        queryOutput[j]["Reply"] !== null &&
        sessionType !== "SentenceFeedback"
      ) {
        sessionRecords.push({
          role: "assistant",
          content: decodeURIComponent(queryOutput[j]["Reply"]),
        });
      }
    }

    //Increase counter of successful User Messages
    if (queryOutput[j]["MessageType"].startsWith("UserMessage")) {
      //If its the last message, increase the counter
      if (j === queryOutput.length - 1) totalUserMessages++;
      else {
        //If the next record is not a retry of current one, increase the counter
        if (
          !queryOutput[j + 1]["MessageType"].startsWith("UserMessage - Retry")
        )
          totalUserMessages++;
        //Else the counter will be increased on next record (To handle case where there is retry on the record at mid of conversation)
      }
    }
  }

  //If it's a doubt session
  if (sessionType == "Doubt") {
    //Collate the conversation of actucal session
    const conversation = sessionRecords.map((data, index) => {
      if (index == 0) return "";
      else return data.role + ": " + data.content;
    });
    //Substitute in System Prompt
    sessionRecords[0]["content"] = sessionRecords[0]["content"].replace(
      "{{\n}}",
      "{{" + conversation.join("\n") + "}}"
    );
    //Append the doubt message as user message
    sessionRecords[1]["content"] = message;
    sessionRecords.splice(2);
  }

  // Send request to ChatGPT
  console.info(
    new Date().toString() + "|" + prependToLog,
    "Request sent to Chat GPT"
  );
  // openai.api_key = os.getenv("openAIKey")#"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"
  // chatGPTResponse = openai.ChatCompletion.create(
  // model=messagePrompt['Values']['model'],
  // temperature=float(messagePrompt['Values']['temperature']),
  // messages=sessionRecords
  // )

  const _retry = require("async-retry");
  /*const { Configuration, OpenAIApi } = require("openai");
  const configuration = new Configuration({
    apiKey: process.env.openAIKey,
  });
  const openai = new OpenAIApi(configuration);*/

  const OpenAI = require("openai");
  const openai = new OpenAI({
    apiKey: process.env.openAIKey,
  });

  async function completionWithBackoff(model, temperature, messages) {
    //return await openai.createChatCompletion({
    return await openai.chat.completions.create({
      model: model,
      temperature: temperature,
      messages: messages,
    });
  }

  const retryOptions = {
    retries: parseInt(process.env.MaxAttempts),
    minTimeout: 1000,
    maxTimeout: 60000,
    randomize: true,
  };

  const chatGPTResponse = await _retry(async () => {
    return await completionWithBackoff(
      messagePrompt["Values"]["model"],
      parseFloat(messagePrompt["Values"]["temperature"]),
      sessionRecords
    );
  }, retryOptions);
  // Read ChatGPT's Response
  //const reply = chatGPTResponse.data.choices[0].message.content;
  const reply = chatGPTResponse.choices[0].message.content;
  console.info(
    new Date().toString() + "|" + prependToLog,
    "Reply received from Chat GPT: " + reply
  );
  let completionTokens = null;
  let promptTokens = null;
  /*if(typeof chatGPTResponse['data']['usage'] !== 'undefined'){
      completionTokens = (typeof chatGPTResponse['data']['usage']['completion_tokens'] !== 'undefined') ? chatGPTResponse['data']['usage']['completion_tokens'] : 0
      promptTokens = (typeof chatGPTResponse['data']['usage']['prompt_tokens'] !== 'undefined') ? chatGPTResponse['data']['usage']['prompt_tokens'] : 0
  }*/
  if (typeof chatGPTResponse["usage"] !== "undefined") {
    completionTokens =
      typeof chatGPTResponse["usage"]["completion_tokens"] !== "undefined"
        ? chatGPTResponse["usage"]["completion_tokens"]
        : 0;
    promptTokens =
      typeof chatGPTResponse["usage"]["prompt_tokens"] !== "undefined"
        ? chatGPTResponse["usage"]["prompt_tokens"]
        : 0;
  }

  // Initialize Public URL of audio/image of response
  let publicURL = null;

  // Get the response type configured
  let responseType = null;
  if (requestBody.replyFormat) {
    responseType = requestBody.replyFormat;
  } else {
    responseType = messagePrompt.Values.responsetype;
  }

  // If responseType configuration == Same as Input, assign messageType to responseType
  if (responseType === "Same as Input") {
    responseType = messageType;
  }

  console.info(new Date().toString() + "|" + prependToLog, responseType);
  // Convert reply to audio

  // If responseType configuration == Audio or Text+Audio, then create audio else not
  if (
    (responseType === "Audio" || responseType === "Text+Audio") &&
    sessionType !== "SentenceFeedback"
  ) {
    let createAudioOfText = require("./common/convertTextToSpeech.js");
    const audioDetails = JSON.parse(
      await createAudioOfText({
        text: reply,
        fileName: "R" + storedSessionRecord._id, //R=>Reply of GPT
        language: "English",
        SessionID: executionID,
      })
    );

    if (audioDetails.OperationStatus === "SUCCESS") {
      publicURL = audioDetails.PublicURL;
    } else {
      console.info(
        new Date().toString() + "|" + prependToLog,
        "Encountered error in creating audio of ChatGPT reply"
      );
      console.error(new Date().toString() + "|" + prependToLog, audioDetails);
      responseType = "Text"; // Send only text response
    }
  }

  let sentenceFeedbackClassification = null;
  let sentenceFeedbackImprovement = null;

  if (sessionType === "SentenceFeedback") {
    console.info(new Date().toString() + "|" + prependToLog, "reply", reply);
    const replyTokens = reply.split(/\r?\n/).filter(Boolean);
    sentenceFeedbackClassification =
      replyTokens[0].toLowerCase().replace(".", "").replace("-", "").trim() !==
      "perfect"
        ? "Could be Improved"
        : replyTokens[0].replace(".", "").replace("-", "").trim();
    sentenceFeedbackImprovement =
      replyTokens.length > 1
        ? replyTokens[1]
            .replace("-", "")
            .replace(delimeterStartToken, "")
            .replace(delimeterEndToken, "")
            .trim()
        : null;
  }

  // Update the latest session record with the reply
  let updatedSessionRecord;
  if (sessionType === "SentenceFeedback") {
    updatedSessionRecord = await Session.findByIdAndUpdate(
      storedSessionRecord._id,
      {
        Classification: sentenceFeedbackClassification,
        Improvement: sentenceFeedbackImprovement,
        SentenceLevelFeedback: encodeURIComponent(reply),
        SLFCompletionTokens: completionTokens,
        SLFPromptTokens: promptTokens,
      },
      { new: true }
    );
  } else {
    if (sessionId === "Onboarding") {
      isActive = false;
    }
    updatedSessionRecord = await Session.findByIdAndUpdate(
      storedSessionRecord._id,
      {
        Reply: encodeURIComponent(reply),
        IsActive: sessionType !== "ObjectiveFeedback" ? isActive : false,
        ReplyAudioURL: publicURL,
        Classification: sentenceFeedbackClassification,
        Improvement: sentenceFeedbackImprovement,
        CompletionTokens: completionTokens,
        PromptTokens: promptTokens,
      },
      { new: true }
    );
  }

  console.info(
    new Date().toString() + "|" + prependToLog,
    "Updated the Session Record"
  );

  if (operationStatus === "END_OF_CNVRSSN") {
    // const query =
    //   "Update Sessions set IsActive = false where Mobile = " +
    //   mobile +
    //   " and ROWID !=" +
    //   storedSessionRecord.ROWID +
    //   " and SessionID = '" +
    //   sessionId +
    //   "'";
    // await zcql.executeZCQLQuery(query);
    await Session.findByIdAndUpdate(
      storedSessionRecord._id,
      { $set: { IsActive: false } },
      { new: true }
    );

    console.info(
      new Date().toString() + "|" + prependToLog,
      "Marked the session inactive"
    );
  }

  // Prepare response JSON
  console.info(
    new Date().toString() + "|" + prependToLog,
    "storedSessionRecord.....",
    storedSessionRecord
  );
  console.info(
    new Date().toString() + "|" + prependToLog,
    "updatedSessionRecord ----",
    updatedSessionRecord
  );
  let replyText = decodeURIComponent(updatedSessionRecord["Reply"]);
  if (commandMsg === "objective prompt") {
    replyText = "Please wait while we prepare your performance report";
    operationStatus = "OBJ_PRMPT";
  }

  let progressMessageLinesOfChat = null;
  if (typeof messagePrompt["Values"]["progressbarat"] !== "undefined")
    if (messagePrompt["Values"]["progressbarat"] != null)
      progressMessageLinesOfChat =
        messagePrompt["Values"]["progressbarat"].split(",");

  const responseJSON = {
    OperationStatus:
      operationStatus == "SUCCESS"
        ? progressMessageLinesOfChat == null
          ? operationStatus
          : progressMessageLinesOfChat.includes(totalUserMessages.toString())
          ? "MID_OF_CNVRSSN"
          : operationStatus
        : operationStatus,
    Reply: replyText,
    ReponseType: responseType,
    AudioURL: publicURL,
    SessionROWID: storedSessionRecord._id,
    LinesOfChatConsumed: totalUserMessages,
    LinesOfChatPending:
      maxlinesofchat > -1 ? maxlinesofchat - 1 - totalUserMessages : -1,
    FeedbackPromptFlag: feedbackPromptFlag,
  };

  // Send Response
  console.info(new Date().toString() + "|" + prependToLog, "Sent Response");

  // Call Glific Wait for Result Node
  const endTimeStamp = new Date();
  const executionTime = endTimeStamp - startTimeStamp;
  const secondsDiff = Math.floor(executionTime / 1000);

  response.status(200).json(responseJSON);

  let sendResponseToGlific = require("./common/sendResponseToGlific.js");

  if (
    secondsDiff > 2 &&
    requestBody.flowId &&
    sessionType != "SentenceFeedback"
  ) {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    sendResponseToGlific({
      flowID: requestBody.flowId,
      contactID: requestBody.contact.id,
      resultJSON: JSON.stringify({
        gptresponse: responseJSON,
      }),
    });
  }

  // Store message audio file in GCS
  if (messageType === "Audio") {
    const messageAudioPublicURL = await saveContentInGCS(
      messageURL,
      "M" + storedSessionRecord._id,
      "Audio",
      "URL",
      executionID
    ); //M=>Message of User
    if (messageAudioPublicURL !== null) {
      Session.updateMany(
        {
          _id: storedSessionRecord._id,
        },
        {
          MessageAudioURL: messageAudioPublicURL,
        }
      );
    } else {
      console.info(
        new Date().toString() + "|" + prependToLog,
        "Encountered error in saving message audio in GCS"
      );
    }
  }

  // Sentence Level Feedback

  if (
    inputType.startsWith("UserMessage") &&
    sessionId !== "Onboarding" &&
    sessionType !== "Doubt"
  ) {
    const newRequestBody = {
      ...requestBody,
      sessionROWID: storedSessionRecord._id,
      sessionId: sessionId + " - SentenceFeedback",
      topic: "Sentence Feedback",
      messageType: "Text",
      inputType: "SystemMessage",
    };
    delete newRequestBody.topicId;
    console.info(
      new Date().toString() + "|" + prependToLog,
      "newRequestBody .... ",
      newRequestBody
    );
    const axios = require("axios");

    const requestResponce = await axios.post(
      process.env.SentenceFeedbackURL,
      newRequestBody,
      {
        "Content-Type": "application/json",
        Accept: "application/json",
      }
    );

    console.info(
      new Date().toString() + "|" + prependToLog,
      "Request sent for sentence level feedback"
    );
  }

  // console.info((new Date()).toString()+"|"+prependToLog,"End of Execution", responseJSON);
});

app.all("/", (req, res) => {
  console.info(new Date().toString() + "|" + prependToLog, "hello");
  res.status(200).send("hello");
});

module.exports = app;

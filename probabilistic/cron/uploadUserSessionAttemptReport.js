const catalyst = require("zoho-catalyst-sdk");
const emojiRegex = require("emoji-regex");
const mongoose = require("mongoose");
const userFlowQuestionLogs = require("./../models/userFlowQuestionLogs.js");
mongoose.connect(process.env.MongoDBConnStrng + "whatsapp-bots", {
  useNewUrlParser: true,
});

const catalystApp = catalyst.initialize();

const executionID = Math.random().toString(36).slice(2);

//Prepare text to prepend with logs
const params = ["uploadUserSessionAttemptReport", executionID, ""];
const prependToLog = params.join(" | ");

console.info(new Date().toString() + "|" + prependToLog, "Start of Execution");

//Filter unique elements in an array
const unique = (value, index, self) => {
  return self.indexOf(value) === index;
};
const timer = (sleepTime) => {
  return new Promise(async (resolve, reject) => {
    //console.debug((new Date()).toString()+"|"+prependToLog,'Wait for '+sleepTime)
    setTimeout(resolve, sleepTime);
  });
};

const getAllRows = (fields, query, zcql, dataLimit) => {
  return new Promise(async (resolve) => {
    var jsonReport = [];
    const dataQuery = query.replace("{}", fields);
    const lmt = dataLimit ? dataLimit : 300;
    var i = 1;
    while (true) {
      query = dataQuery + " LIMIT " + i + ", " + lmt;
      console.debug(
        new Date().toString() + "|" + prependToLog,
        "Fetching records from " + i + " to " + (i + 300 - 1)
      ); /* +
          "\nQuery: " +
          query
      );*/
      var queryResult = [];
      try {
        queryResult = await zcql.executeZCQLQuery(query);
      } catch (err) {
        console.debug(
          new Date().toString() + "|" + prependToLog,
          "Error in Fetching records from " + i + " to " + (i + 300 - 1),
          err
        );
      }

      if (queryResult.length == 0 || typeof queryResult[0] === "undefined") {
        if (queryResult.length > 0 && typeof queryResult[0] === "undefined")
          console.error(
            new Date().toString() + "|" + prependToLog,
            "Encountered error in executing query:",
            queryResult
          );
        break;
      }
      jsonReport = jsonReport.concat(queryResult);
      i = i + 300;
    }
    resolve(jsonReport);
  });
};

let zcql = catalystApp.zcql();

let query = "select {} from UserSessionAttemptReport"; // where IsActive = true or IsActive is null"
console.info(
  new Date().toString() + "|" + prependToLog,
  "Getting UserSessionAttemptReport Data"
);
getAllRows("ROWID, SessionID, IsActive, EndOfSession", query, zcql)
  .then((usersAttemptReport) => {
    console.info(
      new Date().toString() + "|" + prependToLog,
      "Total Sessions = " + usersAttemptReport.length
    );
    const currentReport = usersAttemptReport.filter(
      (data) =>
        data.UserSessionAttemptReport.IsActive == true ||
        data.UserSessionAttemptReport.IsActive == null ||
        data.UserSessionAttemptReport.EndOfSession == "No" ||
        data.UserSessionAttemptReport.EndOfSession == null
    );
    const openSessions = currentReport.map(
      (data) => data.UserSessionAttemptReport.SessionID
    );
    console.info(
      new Date().toString() + "|" + prependToLog,
      "Total Open Sessions = " + openSessions.length
    );
    const closedReport = usersAttemptReport.filter(
      (data) =>
        data.UserSessionAttemptReport.IsActive == false &&
        data.UserSessionAttemptReport.EndOfSession == "Yes"
    );
    const closedSessions = closedReport.map(
      (data) => data.UserSessionAttemptReport.SessionID
    );
    console.info(
      new Date().toString() + "|" + prependToLog,
      "Total Closed Sessions = " + closedSessions.length
    );
    query = "select {} from UsersReport";
    console.info(
      new Date().toString() + "|" + prependToLog,
      "Getting UsersReport Data"
    );
    getAllRows("Name, Mobile, OnboardingDate", query, zcql)
      .then((users) => {
        if (users.length > 0) {
          const mobiles = users.map((user) => user.UsersReport.Mobile);
          query =
            "Select {} " +
            "from Sessions " +
            "left join SystemPrompts on Sessions.SystemPromptsROWID = SystemPrompts.ROWID " +
            "where ((SystemPrompts.Type = 'Topic Prompt') or (SystemPromptsROWID is null) or (SystemPrompts.Name = 'SLF Doubts')) " + //and SessionID not in ('"+closedSessions.join("','")+"') "+
            "order by Sessions.CREATEDTIME ASC";
          console.info(
            new Date().toString() + "|" + prependToLog,
            "Getting Sessions Data"
          );
          getAllRows(
            "Sessions.IsActive, Sessions.PerformanceReportURL, Sessions.EndOfSession, Sessions.Mobile, Sessions.SessionID, Sessions.CREATEDTIME, Sessions.SystemPromptsROWID, SystemPrompts.ROWID, SystemPrompts.Name, SystemPrompts.Persona, SystemPrompts.Module, Sessions.Message, Sessions.MessageType, Sessions.CompletionTokens, Sessions.PromptTokens, Sessions.SLFCompletionTokens, Sessions.SLFPromptTokens",
            query,
            zcql
          )
            .then(async (allSessions) => {
              const sessions = allSessions.filter(
                (data) =>
                  !(
                    data.Sessions.SessionID.endsWith(" - Translation") ||
                    data.Sessions.SessionID.endsWith(" - Hints") ||
                    data.Sessions.SessionID.endsWith(" - ObjectiveFeedback")
                  )
              );
              if (sessions.length > 0) {
                const sessionIDs = sessions
                  .map((session) => session.Sessions.SessionID)
                  .filter(unique);
                await timer(2000);
                query = "Select {} from SessionFeedback";
                //"where SessionID in ('"+sessionIDs.join("','")+"') "+
                //"order by SessionFeedback.CREATEDTIME ASC"
                console.info(
                  new Date().toString() + "|" + prependToLog,
                  "Getting Session Feedback Data"
                );
                getAllRows(
                  "SessionID, Rating, Feedback, FeedbackType, FeedbackURL, GPTRating, GPTFeedback, GPTFeedbackType, GPTFeedbackURL",
                  query,
                  zcql
                )
                  .then((allfeedbacks) => {
                    const feedbacks = allfeedbacks.filter(
                      (data) =>
                        sessionIDs.includes(data.SessionFeedback.SessionID) &&
                        (data.SessionFeedback.Feedback == null
                          ? true
                          : data.SessionFeedback.Feedback.startsWith(
                              "Overall Game Sessions"
                            ) == false &&
                            data.SessionFeedback.Feedback.startsWith(
                              "Learnings Started"
                            ) == false) &&
                        (data.SessionFeedback.GPTFeedback == null
                          ? true
                          : data.SessionFeedback.GPTFeedback.startsWith(
                              "Overall Game Sessions"
                            ) == false &&
                            data.SessionFeedback.GPTFeedback.startsWith(
                              "Learnings Started"
                            ) == false)
                    );
                    zcql
                      .executeZCQLQuery(
                        "Select Version,StartDate from Versions order by StartDate"
                      )
                      .then(async (versionRecords) => {
                        var versions = [];
                        if (
                          typeof versionRecords !== "undefined" &&
                          versionRecords != null &&
                          versionRecords.length > 0
                        )
                          versions = versionRecords.map((data, index) => {
                            var d = data;
                            if (index + 1 == versionRecords.length) {
                              var now = new Date();
                              now.setHours(now.getHours() + 5);
                              now.setMinutes(now.getMinutes() + 30);
                              d["Versions"]["EndDate"] = now;
                            } else
                              d["Versions"]["EndDate"] =
                                versionRecords[index + 1]["Versions"][
                                  "StartDate"
                                ];
                            return d;
                          });
                        query =
                          "Select {} from SessionEvents where Event in ('Progress Message - 1','Progress Message - 2','Progress Message - 3','Progress Message - 4','Progress Message - 5','Progress Message - 6','Progress Message - 7','Progress Message - 8')";

                        const seriousModeVoiceChallengeSessionIDs = sessions
                          .filter(
                            (data) =>
                              data.Sessions.SessionID.endsWith(
                                "Serious Mode"
                              ) ||
                              data.Sessions.SessionID.endsWith(
                                "Voice Challenge"
                              )
                          )
                          .map(
                            (data) => data.Sessions.SessionID.split(" - ")[0]
                          )
                          .filter(unique);
                        const runUserFlowQuestionLog =
                          userFlowQuestionLogs.find({
                            SessionID: {
                              $in: seriousModeVoiceChallengeSessionIDs,
                            },
                          });
                        console.info(
                          new Date().toString() + "|" + prependToLog,
                          "Getting Session Events Data + Serious Mode and Voice Challenge Data"
                        );
                        Promise.all([
                          getAllRows("distinct SessionID", query, zcql),
                          runUserFlowQuestionLog,
                        ])
                          .then(async ([allevents, userFlowQuestionLog]) => {
                            const events = allevents.filter((data) =>
                              sessionIDs.includes(data.SessionEvents.SessionID)
                            );
                            var report = [];
                            const emojiRegEx = emojiRegex();
                            for (var i = 0; i < users.length; i++) {
                              const userSessions = sessions.filter(
                                (data) =>
                                  data.Sessions.Mobile ==
                                  users[i]["UsersReport"]["Mobile"]
                              );
                              const userSessionsWC = userSessions.map(
                                (data) => {
                                  var temp = data;
                                  var msg = "";
                                  try {
                                    msg = decodeURIComponent(
                                      data["Sessions"]["Message"]
                                    ).replace(emojiRegEx, "");
                                  } catch (e) {
                                    msg = data["Sessions"]["Message"].replace(
                                      emojiRegEx,
                                      ""
                                    );
                                  }
                                  temp["Sessions"]["TotalWords"] =
                                    data["Sessions"]["MessageType"] ==
                                    "UserMessage"
                                      ? msg.split(" ").length
                                      : 0;
                                  return temp;
                                }
                              );
                              const userSessionsTopics = userSessions.map(
                                (data) =>
                                  data.SystemPrompts.Name +
                                  "-" +
                                  data.SystemPrompts.ROWID
                              );
                              const uniqueTopics =
                                userSessionsTopics.filter(unique);
                              if (uniqueTopics.length == 0) {
                                var userReport = {};
                                userReport["Mobile"] =
                                  users[i]["UsersReport"]["Mobile"];
                                userReport["Topic"] = "";
                                userReport["Persona"] = "";
                                userReport["Module"] = "";
                                userReport["Attempt"] = "";
                                userReport["IsActive"] = "";
                                userReport["Completed"] = "";
                                userReport["SessionID"] = "";
                                userReport["SessionStartTime"] = "";
                                userReport["AttemptVersion"] = "";
                                userReport["SessionEndTime"] = "";
                                userReport["SessionDuration"] = "";
                                userReport["OptedForPerformanceReport"] = "";
                                userReport["PerformanceReportURL"] = "";
                                userReport["SessionComplete"] = "";
                                userReport["EndOfSession"] = "";
                                userReport["OptedForGPTFeedback"] = "";
                                userReport["GPTRating"] = "";
                                userReport["GPTFeedback"] = "";
                                userReport["GPTFeedbackURL"] = "";
                                userReport["FlowRating"] = "";
                                userReport["Feedback"] = "";
                                userReport["FeedbackURL"] = "";
                                userReport["TotalWords"] = "";
                                userReport["CompletionTokens"] = "";
                                userReport["PromptTokens"] = "";
                                userReport["SLFCompletionTokens"] = "";
                                userReport["SLFPromptTokens"] = "";
                                userReport["ProgressBarMsgSent"] = "";
                                userReport["ActiveDays"] = "";
                                report.push(userReport);
                              } else {
                                //const totalUserSessions = userSessions.map(data=>data.Sessions.SessionID)
                                //const uniqueUserSessions = totalUserSessions.filter(unique)
                                //var attempt = 0 //uniqueUserSessions.length
                                //const totalCompletedUserSessions = (userSessions.filter(data=>data.Sessions.IsActive==false)).map(data=>data.Sessions.SessionID)
                                //const uniqueCompletedUserSessions = totalCompletedUserSessions.filter(unique)
                                //var attemptCompleted = 0 //uniqueCompletedUserSessions.length

                                for (var j = 0; j < uniqueTopics.length; j++) {
                                  const topicSessionsData = userSessions.filter(
                                    (data) =>
                                      data.SystemPrompts.Name +
                                        "-" +
                                        data.SystemPrompts.ROWID ==
                                      uniqueTopics[j]
                                  );
                                  const topicSessions = topicSessionsData.map(
                                    (data) => data.Sessions.SessionID
                                  );
                                  const uniqueTopicSessions =
                                    topicSessions.filter(unique);

                                  for (
                                    var k = 0;
                                    k < uniqueTopicSessions.length;
                                    k++
                                  ) {
                                    var userReport = {};
                                    userReport["Mobile"] =
                                      users[i]["UsersReport"]["Mobile"];
                                    userReport["Topic"] =
                                      uniqueTopics[j] == null
                                        ? ""
                                        : uniqueTopics[j].split("-")[0];
                                    userReport["Module"] =
                                      topicSessionsData[0].SystemPrompts.Persona;
                                    userReport["Topic"] =
                                      userReport["Topic"] == null
                                        ? ""
                                        : userReport["Topic"];
                                    userReport["Persona"] =
                                      topicSessionsData[0].SystemPrompts.Persona;
                                    userReport["SessionID"] =
                                      uniqueTopicSessions[k];
                                    //const rowID = currentReport.length == 0 ? null : currentReport.filter(data=>data['UserSessionAttemptReport']['SessionID']==userReport['SessionID'])
                                    const rowID =
                                      usersAttemptReport.length == 0
                                        ? null
                                        : usersAttemptReport.filter(
                                            (data) =>
                                              data["UserSessionAttemptReport"][
                                                "SessionID"
                                              ] == userReport["SessionID"]
                                          );
                                    if (rowID != null && rowID.length > 0)
                                      userReport["ROWID"] =
                                        rowID[0]["UserSessionAttemptReport"][
                                          "ROWID"
                                        ];
                                    //userReport['Attempt'] = ++attempt
                                    //attempt++ //--

                                    const sessionRecord = userSessionsWC.filter(
                                      (record) =>
                                        record.Sessions.SessionID ==
                                        userReport["SessionID"]
                                    );
                                    userReport["IsActive"] = sessionRecord.some(
                                      (record) =>
                                        record.Sessions.IsActive == true
                                    );
                                    //if(userReport['IsActive']==false){
                                    //	userReport['Completed'] = ++attemptCompleted
                                    //attemptCompleted++ //--
                                    //}
                                    //else
                                    //userReport['Completed'] = 0

                                    const sessionWCs = sessionRecord.map(
                                      (record) => record.Sessions.TotalWords
                                    );
                                    userReport["TotalWords"] =
                                      sessionWCs.reduce((a, b) => a + b, 0);
                                    const sessionCompletionTokens =
                                      sessionRecord.map((record) =>
                                        record.Sessions.CompletionTokens == null
                                          ? 0
                                          : parseInt(
                                              record.Sessions.CompletionTokens
                                            )
                                      );
                                    userReport["CompletionTokens"] =
                                      sessionCompletionTokens.reduce(
                                        (a, b) => a + b,
                                        0
                                      );
                                    const sessionPromptTokens =
                                      sessionRecord.map((record) =>
                                        record.Sessions.PromptTokens == null
                                          ? 0
                                          : parseInt(
                                              record.Sessions.PromptTokens
                                            )
                                      );
                                    userReport["PromptTokens"] =
                                      sessionPromptTokens.reduce(
                                        (a, b) => a + b,
                                        0
                                      );
                                    const sessionSLFCompletionTokens =
                                      sessionRecord.map((record) =>
                                        record.Sessions.SLFCompletionTokens ==
                                        null
                                          ? 0
                                          : parseInt(
                                              record.Sessions
                                                .SLFCompletionTokens
                                            )
                                      );
                                    userReport["SLFCompletionTokens"] =
                                      sessionSLFCompletionTokens.reduce(
                                        (a, b) => a + b,
                                        0
                                      );
                                    const sessionSLFPromptTokens =
                                      sessionRecord.map((record) =>
                                        record.Sessions.SLFPromptTokens == null
                                          ? 0
                                          : parseInt(
                                              record.Sessions.SLFPromptTokens
                                            )
                                      );
                                    userReport["SLFPromptTokens"] =
                                      sessionSLFPromptTokens.reduce(
                                        (a, b) => a + b,
                                        0
                                      );

                                    var sessionTimeStamps = sessionRecord.map(
                                      (record) => record.Sessions.CREATEDTIME
                                    );
                                    if (
                                      userReport["SessionID"].endsWith(
                                        "Serious Mode"
                                      ) ||
                                      userReport["SessionID"].endsWith(
                                        "Voice Challenge"
                                      )
                                    ) {
                                      sessionTimeStamps =
                                        sessionTimeStamps.concat(
                                          userFlowQuestionLog
                                            .filter(
                                              (log) =>
                                                log.SessionID ==
                                                userReport["SessionID"].split(
                                                  " - "
                                                )[0]
                                            )
                                            .map(
                                              (log) =>
                                                log.createdAt.getFullYear() +
                                                "-" +
                                                (
                                                  "0" +
                                                  (log.createdAt.getMonth() + 1)
                                                ).slice(-2) +
                                                "-" +
                                                (
                                                  "0" + log.createdAt.getDate()
                                                ).slice(-2) +
                                                " " +
                                                (
                                                  "0" + log.createdAt.getHours()
                                                ).slice(-2) +
                                                ":" +
                                                (
                                                  "0" +
                                                  log.createdAt.getMinutes()
                                                ).slice(-2) +
                                                ":" +
                                                (
                                                  "0" +
                                                  log.createdAt.getSeconds()
                                                ).slice(-2)
                                            )
                                        );
                                    }
                                    sessionTimeStamps =
                                      sessionTimeStamps.sort();
                                    userReport["SessionStartTime"] = new String(
                                      sessionTimeStamps[0]
                                    ).slice(0, 19);
                                    const sessionTimeStampVersion =
                                      versions.filter((data) => {
                                        /*console.debug((new Date()).toString()+"|"+prependToLog,new Date(data.Versions.StartDate), "|",
                              new Date(sessionTimeStamps[0]), "|",
                              new Date(data.Versions.EndDate), " = ",
                              (((new Date(data.Versions.StartDate)) <= (new Date(sessionTimeStamps[0]))) && ((new Date(data.Versions.EndDate)) > (new Date(sessionTimeStamps[0]))))
                            )*/
                                        return (
                                          new Date(data.Versions.StartDate) <=
                                            new Date(sessionTimeStamps[0]) &&
                                          new Date(data.Versions.EndDate) >
                                            new Date(sessionTimeStamps[0])
                                        );
                                      });
                                    userReport["AttemptVersion"] =
                                      sessionTimeStampVersion[0]["Versions"][
                                        "Version"
                                      ];
                                    userReport["SessionEndTime"] = new String(
                                      sessionTimeStamps[
                                        sessionTimeStamps.length - 1
                                      ]
                                    ).slice(0, 19);
                                    userReport["SessionDuration"] = 0;
                                    for (
                                      var l = 1;
                                      l < sessionTimeStamps.length;
                                      l++
                                    ) {
                                      const currentTimeStamp = new Date(
                                        sessionTimeStamps[l]
                                      );
                                      const lastTimeStamp = new Date(
                                        sessionTimeStamps[l - 1]
                                      );
                                      var duration =
                                        (currentTimeStamp - lastTimeStamp) /
                                        1000 /
                                        60;
                                      if (duration > 10) duration = 10;
                                      userReport["SessionDuration"] += duration;
                                    }
                                    userReport["EndOfSession"] =
                                      sessionRecord.some(
                                        (record) =>
                                          record.Sessions.EndOfSession == true
                                      ) || userReport["IsActive"] != false
                                        ? "Yes"
                                        : "No";
                                    const perfReport = sessionRecord.filter(
                                      (record) =>
                                        record.Sessions.PerformanceReportURL !=
                                        null
                                    );
                                    userReport["OptedForPerformanceReport"] =
                                      typeof perfReport === "undefined"
                                        ? "No"
                                        : perfReport == null
                                        ? "No"
                                        : perfReport.length == 0
                                        ? "No"
                                        : "Yes";
                                    userReport["PerformanceReportURL"] =
                                      userReport["OptedForPerformanceReport"] ==
                                      "Yes"
                                        ? perfReport[0].Sessions
                                            .PerformanceReportURL
                                        : "";
                                    const feedback = feedbacks.filter(
                                      (record) =>
                                        record.SessionFeedback.SessionID ==
                                        userReport["SessionID"]
                                    );
                                    if (
                                      typeof feedback !== "undefined" &&
                                      feedback != null &&
                                      feedback.length > 0
                                    ) {
                                      userReport["SessionComplete"] = "Yes";
                                      userReport["OptedForGPTFeedback"] =
                                        feedback[0]["SessionFeedback"][
                                          "GPTRating"
                                        ] == -99
                                          ? "No"
                                          : "Yes";
                                      userReport["GPTRating"] =
                                        feedback[0]["SessionFeedback"][
                                          "GPTRating"
                                        ] == -99
                                          ? ""
                                          : feedback[0]["SessionFeedback"][
                                              "GPTRating"
                                            ] == -1
                                          ? "Skipped"
                                          : feedback[0]["SessionFeedback"][
                                              "GPTRating"
                                            ] == null
                                          ? ""
                                          : feedback[0]["SessionFeedback"][
                                              "GPTRating"
                                            ];
                                      userReport["GPTFeedback"] =
                                        feedback[0]["SessionFeedback"][
                                          "GPTRating"
                                        ] == -99
                                          ? ""
                                          : feedback[0]["SessionFeedback"][
                                              "GPTRating"
                                            ] == -1
                                          ? ""
                                          : feedback[0]["SessionFeedback"][
                                              "GPTFeedback"
                                            ] == null
                                          ? ""
                                          : feedback[0]["SessionFeedback"][
                                              "GPTFeedback"
                                            ];
                                      userReport["GPTFeedbackURL"] =
                                        feedback[0]["SessionFeedback"][
                                          "GPTRating"
                                        ] == -99
                                          ? ""
                                          : feedback[0]["SessionFeedback"][
                                              "GPTRating"
                                            ] == -1
                                          ? ""
                                          : feedback[0]["SessionFeedback"][
                                              "GPTFeedbackURL"
                                            ] == null
                                          ? ""
                                          : feedback[0]["SessionFeedback"][
                                              "GPTFeedbackURL"
                                            ];
                                      userReport["FlowRating"] =
                                        feedback[0]["SessionFeedback"][
                                          "Rating"
                                        ] == -99
                                          ? ""
                                          : feedback[0]["SessionFeedback"][
                                              "Rating"
                                            ] == -1
                                          ? "Skipped"
                                          : feedback[0]["SessionFeedback"][
                                              "Rating"
                                            ] == null
                                          ? ""
                                          : feedback[0]["SessionFeedback"][
                                              "Rating"
                                            ];
                                      userReport["Feedback"] =
                                        feedback[0]["SessionFeedback"][
                                          "Rating"
                                        ] == -99
                                          ? ""
                                          : feedback[0]["SessionFeedback"][
                                              "Rating"
                                            ] == -1
                                          ? ""
                                          : feedback[0]["SessionFeedback"][
                                              "Feedback"
                                            ] == null
                                          ? ""
                                          : feedback[0]["SessionFeedback"][
                                              "Feedback"
                                            ];
                                      userReport["FeedbackURL"] =
                                        feedback[0]["SessionFeedback"][
                                          "Rating"
                                        ] == -99
                                          ? ""
                                          : feedback[0]["SessionFeedback"][
                                              "Rating"
                                            ] == -1
                                          ? ""
                                          : feedback[0]["SessionFeedback"][
                                              "FeedbackURL"
                                            ] == null
                                          ? ""
                                          : feedback[0]["SessionFeedback"][
                                              "FeedbackURL"
                                            ];
                                    } else {
                                      userReport["SessionComplete"] = "No";
                                      userReport["OptedForGPTFeedback"] = "";
                                      userReport["GPTRating"] = "";
                                      userReport["GPTFeedback"] = "";
                                      userReport["GPTFeedbackURL"] = "";
                                      userReport["FlowRating"] = "";
                                      userReport["Feedback"] = "";
                                      userReport["FeedbackURL"] = "";
                                    }
                                    //Add Progress Bar Message Sent for Sessions created on and after version 5.0
                                    userReport["ProgressBarMsgSent"] =
                                      userReport["SessionEndTime"] <
                                      "2023-07-18 18:00:00"
                                        ? null
                                        : events.some(
                                            (data) =>
                                              data.SessionEvents.SessionID ==
                                              userReport["SessionID"]
                                          )
                                        ? "Yes"
                                        : "No";
                                    userReport["ActiveDays"] = sessionTimeStamps
                                      .map((data) => data.slice(0, 10))
                                      .filter(
                                        (data) =>
                                          data !=
                                          users[i]["UsersReport"][
                                            "OnboardingDate"
                                          ].slice(0, 10)
                                      )
                                      .filter(unique).length;

                                    report.push(userReport);
                                  }
                                }
                              }
                            }
                            //var uniqueUserSessionsTopics = [...new Map(userSessionsTopics.map(item => [item.SessionID, item])).values()]
                            report = report.filter(
                              (data) => data.SessionID != "" // && (data.Topic != "") && (data.Topic != null) && (data.Topic != 'null')
                            );
                            report = report
                              .sort((a, b) => {
                                if (a["Mobile"] == b["Mobile"]) {
                                  return 0;
                                }
                                if (a["Mobile"] < b["Mobile"]) {
                                  return -1;
                                }
                                if (a["Mobile"] > b["Mobile"]) {
                                  return 1;
                                }
                                // a must be equal to b
                                return 0;
                              })
                              .sort((a, b) => {
                                if (
                                  a["Mobile"] == b["Mobile"] &&
                                  a.SessionStartTime < b.SessionStartTime
                                ) {
                                  return -1;
                                }
                                if (
                                  a["Mobile"] == b["Mobile"] &&
                                  a.SessionStartTime > b.SessionStartTime
                                ) {
                                  return 1;
                                }
                                // a must be equal to b
                                return 0;
                              });
                            var attempted = 0,
                              completed = 0;
                            for (var m = 0; m < report.length; m++) {
                              if (
                                m > 0 &&
                                report[m - 1]["Mobile"] != report[m]["Mobile"]
                              ) {
                                (attempted = 0), (completed = 0);
                              }
                              report[m]["Attempt"] = ++attempted;
                              report[m]["Completed"] =
                                report[m]["IsActive"] == false
                                  ? ++completed
                                  : 0;
                            }
                            let table = catalystApp
                              .datastore()
                              .table("UserSessionAttemptReport");
                            const updateData = report.filter(
                              (data) => typeof data["ROWID"] !== "undefined"
                            );
                            const insertData = report.filter(
                              (data) => typeof data["ROWID"] === "undefined"
                            );
                            let tableIndex = 0;
                            console.info(
                              new Date().toString() + "|" + prependToLog,
                              "Records to Update " + updateData.length
                            );
                            var breakAt = 10;
                            while (
                              updateData.length > 0 &&
                              tableIndex < updateData.length
                            ) {
                              try {
                                const updated = await table.updateRows(
                                  updateData.slice(tableIndex, tableIndex + 50)
                                );
                                if (!Array.isArray(updated))
                                  console.info(
                                    new Date().toString() + "|" + prependToLog,
                                    "Status of Update records from index =",
                                    tableIndex,
                                    " : ",
                                    updated
                                  );
                                else
                                  console.info(
                                    new Date().toString() + "|" + prependToLog,
                                    "Updated records from index =",
                                    tableIndex
                                  );
                                tableIndex = tableIndex + 50;
                              } catch (e) {
                                console.error(
                                  new Date().toString() + "|" + prependToLog,
                                  "Could not update data from index =",
                                  tableIndex,
                                  "\nError",
                                  e
                                );
                                console.debug(
                                  new Date().toString() + "|" + prependToLog,
                                  updateData.slice(tableIndex, tableIndex + 200)
                                );
                                if (breakAt == 0) tableIndex = tableIndex + 50;
                                else breakAt--;
                              }
                            }
                            tableIndex = 0;
                            breakAt = 10;
                            console.info(
                              new Date().toString() + "|" + prependToLog,
                              "Records to Insert " + insertData.length
                            );
                            while (
                              insertData.length > 0 &&
                              tableIndex < insertData.length
                            ) {
                              try {
                                //const inserted = await table.insertRows(
                                //insertData.slice(tableIndex, tableIndex + 50)
                                //);
                                const inserted = await table.insertRow(
                                  insertData[tableIndex]
                                );

                                if (!Array.isArray(inserted))
                                  console.info(
                                    new Date().toString() + "|" + prependToLog,
                                    "Status of Insert records from index =",
                                    tableIndex,
                                    " : ",
                                    inserted
                                  );
                                else
                                  console.info(
                                    new Date().toString() + "|" + prependToLog,
                                    "Inserted records from index =",
                                    tableIndex
                                  );
                                tableIndex++; //tableIndex = tableIndex + 50;
                              } catch (e) {
                                console.error(
                                  new Date().toString() + "|" + prependToLog,
                                  "Could not insert data from index =",
                                  tableIndex,
                                  "\nError",
                                  e
                                );
                                console.debug(
                                  new Date().toString() + "|" + prependToLog,
                                  insertData.slice(tableIndex, tableIndex + 200)
                                );
                                if (breakAt == 0)
                                  tableIndex++; // = tableIndex+50
                                else breakAt--;
                              }
                            }
                            console.info(
                              new Date().toString() + "|" + prependToLog,
                              "End of Execution"
                            );
                          })
                          .catch((err) => {
                            console.info(
                              new Date().toString() + "|" + prependToLog,
                              "End of Execution"
                            );
                            console.error(
                              new Date().toString() + "|" + prependToLog,
                              err
                            );
                          });
                      })
                      .catch((err) => {
                        console.info(
                          new Date().toString() + "|" + prependToLog,
                          "End of Execution"
                        );
                        console.error(
                          new Date().toString() + "|" + prependToLog,
                          err
                        );
                      });
                  })
                  .catch((err) => {
                    console.info(
                      new Date().toString() + "|" + prependToLog,
                      "End of Execution"
                    );
                    console.error(
                      new Date().toString() + "|" + prependToLog,
                      err
                    );
                  });
              } else {
                console.log("End of Execution. No Session Data");
              }
            })
            .catch((err) => {
              console.info(
                new Date().toString() + "|" + prependToLog,
                "End of Execution"
              );
              console.error(new Date().toString() + "|" + prependToLog, err);
            });
        } else {
          console.info(
            new Date().toString() + "|" + prependToLog,
            "End of Execution. No user found"
          );
        }
      })
      .catch((err) => {
        console.info(
          new Date().toString() + "|" + prependToLog,
          "End of Execution"
        );
        console.error(new Date().toString() + "|" + prependToLog, err);
      });
  })
  .catch((err) => {
    console.info(
      new Date().toString() + "|" + prependToLog,
      "End of Execution"
    );
    console.error(new Date().toString() + "|" + prependToLog, err);
  });

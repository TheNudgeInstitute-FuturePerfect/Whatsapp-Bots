//const catalyst = require("zoho-catalyst-sdk");
const dotenv = require("dotenv");
dotenv.config();
const emojiRegex = require("emoji-regex");
const mongoose = require('mongoose')
const userFlowQuestionLogs = require("./../models/userFlowQuestionLogs.js");
mongoose.connect(process.env.MongoDBConnStrng + "whatsapp-bots", {
  useNewUrlParser: true,
});
const SessionEvents = require(".././models/SessionEvents.js");
const SessionFeedback = require(".././models/SessionFeedback.js")
const Session = require(".././models/Sessions.js");
const SystemPrompts = require(".././models/SystemPrompts.js");
const UsersReport = require(".././models/UsersReport.js");
const UserSessionAttemptReport = require(".././models/UserSessionAttemptReport.js");
const Version = require(".././models/versions.js");

//const catalystApp = catalyst.initialize();

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
    setTimeout(resolve, sleepTime)
  });
}

//let zcql = catalystApp.zcql();

//let query = "select {} from UserSessionAttemptReport"; // where IsActive = true or IsActive is null"
//getAllRows("ROWID, SessionID, IsActive, EndOfSession", query, zcql)
console.info((new Date()).toString() + "|" + prependToLog, "Getting UserSessionAttemptReport Data")
UserSessionAttemptReport.find({}, '_id SessionID IsActive EndOfSession')
  .then((usersAttemptReport) => {
    console.info(new Date().toString() + "|" + prependToLog,"Total Sessions = " + usersAttemptReport.length);
    const currentReport = usersAttemptReport.filter(
      (data) =>
        data.IsActive == true ||
        data.IsActive == null ||
        data.EndOfSession == "No" ||
        data.EndOfSession == null
    );
    const openSessions = currentReport.map(
      (data) => data.SessionID
    );
    console.info(new Date().toString() + "|" + prependToLog,"Total Open Sessions = " + openSessions.length
    );
    const closedReport = usersAttemptReport.filter(
      (data) =>
        data.IsActive == false &&
        data.EndOfSession == "Yes"
    );
    const closedSessions = closedReport.map(
      (data) => data.SessionID
    );
    console.info(new Date().toString() + "|" + prependToLog,"Total Closed Sessions = " + closedSessions.length
    );
    // query = "select {} from UsersReport";
    //getAllRows("Name, Mobile, OnboardingDate", query, zcql)
    console.info((new Date()).toString() + "|" + prependToLog, "Getting UsersReport Data")
    UsersReport.find({}, 'Name Mobile OnboardingDate')
      .then((users) => {
        if (users.length > 0) {
          console.info((new Date()).toString() + "|" + prependToLog, "UsersReport Records:" + users.length)
          const mobiles = users.map((user) => user.Mobile);
          // query =
          //   "Select {} " +
          //   "from Sessions " +
          //   "left join SystemPrompts on Sessions.SystemPromptsROWID = SystemPrompts.ROWID " +
          //   "where ((SystemPrompts.Type = 'Topic Prompt') or (SystemPromptsROWID is null)) " + //and SessionID not in ('"+closedSessions.join("','")+"') "+
          //   "order by Sessions.CREATEDTIME ASC";
          // getAllRows(
          //   "Sessions.IsActive, Sessions.PerformanceReportURL, Sessions.EndOfSession, Sessions.Mobile, Sessions.SessionID, Sessions.CREATEDTIME, Sessions.SystemPromptsROWID, SystemPrompts.ROWID, SystemPrompts.Name, SystemPrompts.Persona, SystemPrompts.Module, Sessions.Message, Sessions.MessageType, Sessions.CompletionTokens, Sessions.PromptTokens, Sessions.SLFCompletionTokens, Sessions.SLFPromptTokens",
          //   query,
          //   zcql
          // )
          console.info((new Date()).toString() + "|" + prependToLog, "Getting Sessions Data")
          Session.find()
            .populate({
              path: 'SystemPromptsROWID',
              model: SystemPrompts,
              match: {
                $or: [
                  { Type: 'Topic Prompt' },
                  { SystemPromptsROWID: null }
                ]
              },
              select: '_id Name Persona Module Type'
            })
            .sort({ CREATEDTIME: 1 })
            .then(async (allSessions) => {
              console.info((new Date()).toString() + "|" + prependToLog, "Session Records:" + allSessions.length)
              const sessions = allSessions.filter(
                (data) =>
                  !(
                    data.SessionID.endsWith(" - Translation") ||
                    data.SessionID.endsWith(" - Hints") ||
                    data.SessionID.endsWith(" - ObjectiveFeedback")
                  )
              );
              if (sessions.length > 0) {
                const sessionIDs = sessions
                  .map((session) => session.SessionID)
                  .filter(unique);
                await timer(2000)
                // query = "Select {} from SessionFeedback";
                // //"where SessionID in ('"+sessionIDs.join("','")+"') "+
                // //"order by SessionFeedback.CREATEDTIME ASC"
                // getAllRows(
                //   "SessionID, Rating, Feedback, FeedbackType, FeedbackURL, GPTRating, GPTFeedback, GPTFeedbackType, GPTFeedbackURL",
                //   query,
                //   zcql
                // )
                console.info((new Date()).toString() + "|" + prependToLog, "Getting Session Feedback Data")
                SessionFeedback.find()
                  .then((allfeedbacks) => {
                    const feedbacks = allfeedbacks.filter((data) =>
                      sessionIDs.includes(data.SessionID)
                      && (data.Feedback == null ? true : (data.Feedback.startsWith("Overall Game Sessions") == false)
                        && (data.Feedback.startsWith("Learnings Started") == false))
                      && (data.GPTFeedback == null ? true : (data.GPTFeedback.startsWith("Overall Game Sessions") == false)
                        && (data.GPTFeedback.startsWith("Learnings Started") == false))
                    );
                    // zcql
                    //   .executeZCQLQuery(
                    //     "Select Version,StartDate from Versions order by StartDate"
                    //   )
                    Version.find().sort({ StartDate: 1 })
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
                              d["EndDate"] = now;
                            } else
                              d["EndDate"] =
                                versionRecords[index + 1][
                                "StartDate"
                                ];
                            return d;
                          });
                        // query =
                        //   "Select {} from SessionEvents where Event in ('Progress Message - 1','Progress Message - 2','Progress Message - 3','Progress Message - 4','Progress Message - 5','Progress Message - 6','Progress Message - 7','Progress Message - 8')";
                        // getAllRows("distinct SessionID", query, zcql)

                        const seriousModeVoiceChallengeSessionIDs = sessions.filter(data => data.SessionID.endsWith("Serious Mode") || data.SessionID.endsWith("Voice Challenge")).map(data => (data.SessionID.split(" - "))[0]).filter(unique)
                        const runUserFlowQuestionLog = userFlowQuestionLogs.find(
                          {
                            SessionID: {
                              "$in": seriousModeVoiceChallengeSessionIDs
                            }
                          }
                        )
                        const runSessionEventsQuery = SessionEvents.find({ Event: { $in: ['Progress Message - 1', 'Progress Message - 2', 'Progress Message - 3', 'Progress Message - 4', 'Progress Message - 5', 'Progress Message - 6', 'Progress Message - 7', 'Progress Message - 8'] } })
                        console.info((new Date()).toString() + "|" + prependToLog, "Getting Session Events Data + Serious Mode and Voice Challenge Data")
                        Promise.all([runSessionEventsQuery, runUserFlowQuestionLog])
                          .then(async ([allevents, userFlowQuestionLog]) => {
                            const events = allevents.filter((data) =>
                              sessionIDs.includes(data.SessionID)
                            );
                            var report = [];
                            const emojiRegEx = emojiRegex();
                            for (var i = 0; i < users.length; i++) {
                              const userSessions = sessions.filter(
                                (data) =>
                                  data.Mobile ==
                                  users[i]["Mobile"]
                              );
                              const userSessionsWC = userSessions.map(
                                (data) => {
                                  var temp = data;
                                  var msg = "";
                                  try {
                                    msg = decodeURIComponent(
                                      data["Message"]
                                    ).replace(emojiRegEx, "");
                                  } catch (e) {
                                    msg = data["Message"].replace(
                                      emojiRegEx,
                                      ""
                                    );
                                  }
                                  temp["TotalWords"] =
                                    data["MessageType"] ==
                                      "UserMessage"
                                      ? msg.split(" ").length
                                      : 0;
                                  return temp;
                                }
                              );
                              const userSessionsTopics = userSessions.map(
                                (data) =>
                                  data.SystemPromptsROWID.Name +
                                  "-" +
                                  data.SystemPromptsROWID._id
                              );
                              const uniqueTopics =
                                userSessionsTopics.filter(unique);
                              if (uniqueTopics.length == 0) {
                                var userReport = {};
                                userReport["Mobile"] =
                                  users[i]["Mobile"];
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
                                      data.SystemPromptsROWID.Name +
                                      "-" +
                                      data.SystemPromptsROWID._id ==
                                      uniqueTopics[j]
                                  );
                                  const topicSessions = topicSessionsData.map(
                                    (data) => data.SessionID
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
                                      users[i]["Mobile"];
                                    userReport["Topic"] =
                                      uniqueTopics[j] == null
                                        ? ""
                                        : uniqueTopics[j].split("-")[0];
                                    userReport["Module"] = topicSessionsData[0].SystemPromptsROWID.Persona;
                                    userReport["Topic"] = userReport["Topic"] == null ? "" : userReport["Topic"]
                                    userReport["Persona"] =
                                      topicSessionsData[0].SystemPromptsROWID.Persona;
                                    userReport["SessionID"] =
                                      uniqueTopicSessions[k];
                                    //const rowID = currentReport.length == 0 ? null : currentReport.filter(data=>data['UserSessionAttemptReport']['SessionID']==userReport['SessionID'])
                                    const rowID =
                                      usersAttemptReport.length == 0
                                        ? null
                                        : usersAttemptReport.filter(
                                          (data) =>
                                            data[
                                            "SessionID"
                                            ] == userReport["SessionID"]
                                        );
                                    if (rowID != null && rowID.length > 0)
                                      userReport["_id"] =
                                        rowID[0][
                                        "_id"
                                        ];
                                    //userReport['Attempt'] = ++attempt
                                    //attempt++ //--

                                    const sessionRecord = userSessionsWC.filter(
                                      (record) =>
                                        record.SessionID ==
                                        userReport["SessionID"]
                                    );
                                    userReport["IsActive"] = sessionRecord.some(
                                      (record) =>
                                        record.IsActive == true
                                    );
                                    //if(userReport['IsActive']==false){
                                    //	userReport['Completed'] = ++attemptCompleted
                                    //attemptCompleted++ //--
                                    //}
                                    //else
                                    //userReport['Completed'] = 0

                                    const sessionWCs = sessionRecord.map(
                                      (record) => record.TotalWords
                                    );
                                    userReport["TotalWords"] =
                                      sessionWCs.reduce((a, b) => a + b, 0);
                                    const sessionCompletionTokens =
                                      sessionRecord.map((record) =>
                                        record.CompletionTokens == null
                                          ? 0
                                          : parseInt(
                                            record.CompletionTokens
                                          )
                                      );
                                    userReport["CompletionTokens"] =
                                      sessionCompletionTokens.reduce(
                                        (a, b) => a + b,
                                        0
                                      );
                                    const sessionPromptTokens =
                                      sessionRecord.map((record) =>
                                        record.PromptTokens == null
                                          ? 0
                                          : parseInt(
                                            record.PromptTokens
                                          )
                                      );
                                    userReport["PromptTokens"] =
                                      sessionPromptTokens.reduce(
                                        (a, b) => a + b,
                                        0
                                      );
                                    const sessionSLFCompletionTokens =
                                      sessionRecord.map((record) =>
                                        record.SLFCompletionTokens ==
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
                                        record.SLFPromptTokens == null
                                          ? 0
                                          : parseInt(
                                            record.SLFPromptTokens
                                          )
                                      );
                                    userReport["SLFPromptTokens"] =
                                      sessionSLFPromptTokens.reduce(
                                        (a, b) => a + b,
                                        0
                                      );

                                    var sessionTimeStamps = sessionRecord.map(
                                      (record) => record.CREATEDTIME
                                    );
                                    if (userReport["SessionID"].endsWith("Serious Mode") || userReport["SessionID"].endsWith("Voice Challenge")) {
                                      sessionTimeStamps = sessionTimeStamps.concat(
                                        userFlowQuestionLog.filter(
                                          log => log.SessionID == (userReport["SessionID"].split(" - "))[0]
                                        ).map(log =>
                                          log.createdAt.getFullYear() + "-" +
                                          ('0' + (log.createdAt.getMonth() + 1)).slice(-2) + "-" +
                                          ('0' + log.createdAt.getDate()).slice(-2) + " " +
                                          ('0' + log.createdAt.getHours()).slice(-2) + ":" +
                                          ('0' + log.createdAt.getMinutes()).slice(-2) + ":" +
                                          ('0' + log.createdAt.getSeconds()).slice(-2)
                                        )
                                      )
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
                                          new Date(data.StartDate) <=
                                          new Date(sessionTimeStamps[0]) &&
                                          new Date(data.EndDate) >
                                          new Date(sessionTimeStamps[0])
                                        );
                                      });
                                    userReport["AttemptVersion"] = sessionTimeStampVersion.length>0 ? sessionTimeStampVersion[0]["Version"] :"" ;
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
                                          record.EndOfSession == true
                                      ) || userReport["IsActive"] != false
                                        ? "Yes"
                                        : "No";
                                    const perfReport = sessionRecord.filter(
                                      (record) =>
                                        record.PerformanceReportURL !=
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
                                        record.SessionID ==
                                        userReport["SessionID"]
                                    );
                                    if (
                                      typeof feedback !== "undefined" &&
                                      feedback != null &&
                                      feedback.length > 0
                                    ) {
                                      userReport["SessionComplete"] = "Yes";
                                      userReport["OptedForGPTFeedback"] =
                                        feedback[0][
                                          "GPTRating"
                                        ] == -99
                                          ? "No"
                                          : "Yes";
                                      userReport["GPTRating"] =
                                        feedback[0][
                                          "GPTRating"
                                        ] == -99
                                          ? ""
                                          : feedback[0][
                                            "GPTRating"
                                          ] == -1
                                            ? "Skipped"
                                            : feedback[0][
                                              "GPTRating"
                                            ] == null
                                              ? ""
                                              : feedback[0][
                                              "GPTRating"
                                              ];
                                      userReport["GPTFeedback"] =
                                        feedback[0][
                                          "GPTRating"
                                        ] == -99
                                          ? ""
                                          : feedback[0][
                                            "GPTRating"
                                          ] == -1
                                            ? ""
                                            : feedback[0][
                                              "GPTFeedback"
                                            ] == null
                                              ? ""
                                              : feedback[0][
                                              "GPTFeedback"
                                              ];
                                      userReport["GPTFeedbackURL"] =
                                        feedback[0][
                                          "GPTRating"
                                        ] == -99
                                          ? ""
                                          : feedback[0][
                                            "GPTRating"
                                          ] == -1
                                            ? ""
                                            : feedback[0][
                                              "GPTFeedbackURL"
                                            ] == null
                                              ? ""
                                              : feedback[0][
                                              "GPTFeedbackURL"
                                              ];
                                      userReport["FlowRating"] =
                                        feedback[0][
                                          "Rating"
                                        ] == -99
                                          ? ""
                                          : feedback[0][
                                            "Rating"
                                          ] == -1
                                            ? "Skipped"
                                            : feedback[0][
                                              "Rating"
                                            ] == null
                                              ? ""
                                              : feedback[0][
                                              "Rating"
                                              ];
                                      userReport["Feedback"] =
                                        feedback[0][
                                          "Rating"
                                        ] == -99
                                          ? ""
                                          : feedback[0][
                                            "Rating"
                                          ] == -1
                                            ? ""
                                            : feedback[0][
                                              "Feedback"
                                            ] == null
                                              ? ""
                                              : feedback[0][
                                              "Feedback"
                                              ];
                                      userReport["FeedbackURL"] =
                                        feedback[0][
                                          "Rating"
                                        ] == -99
                                          ? ""
                                          : feedback[0][
                                            "Rating"
                                          ] == -1
                                            ? ""
                                            : feedback[0][
                                              "FeedbackURL"
                                            ] == null
                                              ? ""
                                              : feedback[0][
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
                                            data.SessionID ==
                                            userReport["SessionID"]
                                        )
                                          ? "Yes"
                                          : "No";
                                    userReport["ActiveDays"] = sessionTimeStamps
                                      .map((data) => data.getFullYear()+"-"+('0'+(data.getMonth()+1)).slice(-2)+"-"+('0'+data.getDate()).slice(-2))//data.slice(0, 10))
                                      .filter(
                                        (data) =>
                                          data != (users[i]["OnboardingDate"].getFullYear()+"-"+('0'+(users[i]["OnboardingDate"].getMonth()+1)).slice(-2)+"-"+('0'+users[i]["OnboardingDate"].getDate()).slice(-2))
                                          //users[i]["OnboardingDate"].slice(0, 10)
                                      )
                                      .filter(unique).length;

                                    report.push(userReport);
                                  }
                                }
                              }
                            }
                            //var uniqueUserSessionsTopics = [...new Map(userSessionsTopics.map(item => [item.SessionID, item])).values()]
                            report = report.filter(
                              (data) => (data.SessionID != "")// && (data.Topic != "") && (data.Topic != null) && (data.Topic != 'null')
                            );
                            report = report.sort((a, b) => {
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
                            }).sort((a, b) => {
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
                            const upsertData = report.map((data) => {
                              if(typeof data["_id"] !== "undefined")
                                return {
                                  updateOne:{
                                    filter:{
                                      _id: data["_id"]
                                    },
                                    update:data
                                  }
                                }
                              else
                                return {
                                  insertOne:{
                                    document: data
                                  }
                                }
                            });
                            const upsertOutput = await UserSessionAttemptReport.bulkWrite(upsertData)
										        console.info((new Date()).toString() + "|" + prependToLog, "End of Execution | Inserted: "+upsertOutput.insertedCount +" | Updated: "+upsertOutput.modifiedCount);
                          })
                          .catch((err) => {
                            console.info(new Date().toString() + "|" + prependToLog,"End of Execution");
                            console.error(new Date().toString() + "|" + prependToLog,err);
                          });
                      })
                      .catch((err) => {
                        console.info(new Date().toString() + "|" + prependToLog,"End of Execution");
                        console.error(new Date().toString() + "|" + prependToLog,err);
                      });
                  })
                  .catch((err) => {
                    console.info(new Date().toString() + "|" + prependToLog,"End of Execution");
                    console.error(new Date().toString() + "|" + prependToLog,err);
                  });
              } else {
                console.info((new Date()).toString() + "|" + prependToLog,"End of Execution. No Session Data");
              }
            })
            .catch((err) => {
              console.info(new Date().toString() + "|" + prependToLog,"End of Execution");
              console.error(new Date().toString() + "|" + prependToLog, err);
            });
        } else {
          console.info(new Date().toString() + "|" + prependToLog,"End of Execution. No user found"
          );
        }
      })
      .catch((err) => {
        console.info(new Date().toString() + "|" + prependToLog,"End of Execution");
        console.error(new Date().toString() + "|" + prependToLog, err);
      });
  })
  .catch((err) => {
    console.info(new Date().toString() + "|" + prependToLog,"End of Execution");
    console.error(new Date().toString() + "|" + prependToLog, err);
  });
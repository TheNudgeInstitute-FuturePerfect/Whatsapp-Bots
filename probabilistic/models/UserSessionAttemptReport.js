const { Schema, model } = require("mongoose");

const schema = new Schema({
  ROWID: {type: Number},
  CREATORID: {type: Number}, 
  CREATEDTIME: {type: Date,default: Date.now},
  MODIFIEDTIME: {type: Date,default: Date.now},
  Mobile: { type: Number },
  SessionID: { type: String },
  Topic: { type: String },
  Persona: { type: String },
  Attempt: { type: Number },
  SessionStartTime: {type: Date,default: Date.now},
  SessionEndTime: {type: Date,default: Date.now},
  TotalWords: { type: Number },
  EndOfSession: { type: String },
  OptedForPerformanceReport: { type: String },
  PerformanceReportURL: { type: String },
  SessionComplete: { type: String },
  OptedForGPTFeedback: { type: String },
  GPTRating: { type: String },
  GPTFeedback: { type: String },
  GPTFeedbackURL: { type: String },
  FlowRating: { type: String },
  Feedback: { type: String },
  FeedbackURL: { type: String },
  AttemptVersion: { type: Number },
  SessionDuration: { type: Number },
  IsActive: { type: Boolean,default:true },
  CompletionTokens: { type: Number },
  PromptTokens: { type: Number },
  SLFCompletionTokens: { type: Number },
  SLFPromptTokens: { type: Number },
  ProgressBarMsgSent: { type: String },
  ActiveDays: { type: Number },
  Completed: { type: Number }
});

module.exports = model("UserSessionAttemptReport", schema);
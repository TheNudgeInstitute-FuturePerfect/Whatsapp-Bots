const { Schema, model } = require("mongoose");

const schema = new Schema({
  ROWID: {type: Number},
  CREATORID: {type: Number}, 
  CREATEDTIME: {type: Date,default: Date.now},
  MODIFIEDTIME: {type: Date,default: Date.now},
  SessionID: { type: String },
  IsActive: {type: Boolean,default: true},
  SystemPromptsROWID: { type: Number },
  Reply: { type: String },
  Message: { type: String },
  Mobile: { type: String },
  ReplyAudioURL: { type: String },
  MessageAudioURL: { type: String },
  SpeechRecognitionCI: { type: String },
  PerformanceReportURL: { type: String },
  MessageType: { type: String ,default: "UserMessage"},
  Classification: { type: String },
  Improvement: { type: String },
  UserFeedback: { type: String },
  SentenceLevelFeedback: { type: String },
  Objective1Complete: {type: Boolean,default: true},
  Objective2Complete: {type: Boolean,default: true},
  Objective3Complete: {type: Boolean,default: true},
  EndOfSession: {type: Boolean,default: true},
  CompletionTokens: { type: Number },
  PromptTokens: { type: Number },
  SLFCompletionTokens: { type: Number },
  SLFPromptTokens: { type: Number },
});

module.exports = model("Sessions", schema);
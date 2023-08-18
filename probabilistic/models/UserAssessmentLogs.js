const { Schema, model } = require("mongoose");

const schema = new Schema({
  ROWID: Schema.Types.ObjectId,
  CREATORID: {type: Number}, 
  CREATEDTIME: {type: Date,default: Date.now},
  MODIFIEDTIME: {type: Date,default: Date.now},
  UserROWID: {type: Number},
  SystemPromptROWID: {type: Number},
  IsAssessmentComplete: {type: Boolean,default: false},
  AssessmentCompletionReason: { type: String, default: "All Questions Asked" },
  NextQuestionROWID: {type: Number},
  QuestionsAsked: { type: String},
  SessionID : { type: String}
});

module.exports = model("UserAssessmentLogs", schema);
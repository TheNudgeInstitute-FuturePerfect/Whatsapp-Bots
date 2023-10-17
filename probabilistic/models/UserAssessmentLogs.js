const { Schema, model } = require("mongoose");

const schema = new Schema({
  ROWID: {type: Number},
  CREATORID: {type: Number}, 
  //CREATEDTIME: {type: Date,default: Date.now},
  //MODIFIEDTIME: {type: Date,default: Date.now},
  UserROWID: { type: Schema.Types.ObjectId, ref: 'Users' },
  SystemPromptROWID: { type: Schema.Types.ObjectId, ref: 'SystemPrompts' },
  IsAssessmentComplete: {type: Boolean,default: false},
  AssessmentCompletionReason: { type: String, default: "All Questions Asked" },
  NextQuestionROWID: { type: Schema.Types.ObjectId, ref: 'QuestionBank',require:false },
  QuestionsAsked: { type: String},
  SessionID : { type: String}
},
{
  timestamps: {
    createdAt:'CREATEDTIME',
    updatedAt:'MODIFIEDTIME'
  },
});

module.exports = model("UserAssessmentLogs", schema);
const { Schema, model } = require("mongoose");

const schema = new Schema({
  ROWID: Schema.Types.ObjectId,
  CREATORID: {type: Number}, 
  CREATEDTIME: {type: Date,default: Date.now},
  MODIFIEDTIME: {type: Date,default: Date.now},
  UserAssessmentLogROWID : {type: Number},
  QuestionROWID : {type: Number},
  ResponseAVURL : {type: String},
  ResponseText : {type: String},
  IsCorrectResponse : {type: Boolean,default: false},
  ErrorInResponse : {type: String},
  ErrorDescription : {type: String},
  ConfidenceInterval : {type: Number}
});

module.exports = model("WordleAttempts", schema);
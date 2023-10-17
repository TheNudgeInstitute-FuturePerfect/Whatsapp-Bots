const { Schema, model } = require("mongoose");

const schema = new Schema({
  ROWID: {type:Number},
  CREATORID: {type: Number}, 
  //CREATEDTIME: {type: Date,default: Date.now},
  //MODIFIEDTIME: {type: Date,default: Date.now},
  UserAssessmentLogROWID :  { type: Schema.Types.ObjectId, ref: 'UserAssessmentLogs' },
  QuestionROWID :  { type: Schema.Types.ObjectId, ref: 'QuestionBank' },
  ResponseAVURL : {type: String},
  ResponseText : {type: String},
  IsCorrectResponse : {type: Boolean,default: false},
  ErrorInResponse : {type: String},
  ErrorDescription : {type: String},
  ConfidenceInterval : {type: Number}
},
{
  timestamps: {
    createdAt:'CREATEDTIME',
    updatedAt:'MODIFIEDTIME'
  },
});

module.exports = model("UserAssessment", schema);
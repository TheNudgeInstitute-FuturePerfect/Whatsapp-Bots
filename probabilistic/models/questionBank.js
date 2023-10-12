const { Schema, model } = require("mongoose");

const schema = new Schema({
  ROWID: {type: Number},
  CREATORID: {type: Number}, 
  CREATEDTIME: {type: Date,default: Date.now},
  MODIFIEDTIME: {type: Date,default: Date.now},
  avURL:{type:String},
  ResponseValidations:{type:String},
  ResponseFormat:{type:String},
  Options:{type:String},
  Answers:{type:String},
  Question:{type:String},
  ImageURL:{type:String},
  ResponseTimeOut:{type:Number},
  IsEvaluative:{type:Boolean,default:true},
  SkipLogic: { type: String},
  SystemPromptROWID: { type: Schema.Types.ObjectId, ref: 'SystemPrompts' },
  AskingOrder : { type: Number},
  IsActive:{type:Boolean,default:true},
  Feedback:{type:String},
  Tags:{type:String},
  QuestionType:{type:String}
});

module.exports = model("QuestionBank", schema);
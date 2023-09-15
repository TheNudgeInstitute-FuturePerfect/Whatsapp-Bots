const { Schema, model } = require("mongoose");

const schema = new Schema({
  ROWID: {type: Number},
  CREATORID: {type: Number}, 
  CREATEDTIME: {type: Date,default: Date.now},
  MODIFIEDTIME: {type: Date,default: Date.now},
  Content: { type: String },
  IsActive: {type: Boolean,default: false},
  Name: { type: String },
  SupportingText: { type: String },
  SupportingAVURL: { type: String },
  Sequence: {type: Number},
  PrimaryKey: { type: String },
  SupportingImageURL: { type: String },
  Persona: { type: String },
  ObjectiveMessage: { type: String },
  Type: { type: String },
  ShowLearningContent: {type: Boolean,default: false},
  IsPaid: {type: Boolean,default: false},
  Module: { type: String,require:false },
  LearningObjective: { type: String,require:false },
  Game: { type: String,require:false },
});

module.exports = model("SystemPrompts", schema);
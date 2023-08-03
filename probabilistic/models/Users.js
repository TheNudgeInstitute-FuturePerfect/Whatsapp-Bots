const { Schema, model } = require("mongoose");

const schema = new Schema({
  ROWID: {type: Number},
  CREATORID: {type: Number}, 
  CREATEDTIME: {type: Date,default: Date.now},
  MODIFIEDTIME: {type: Date,default: Date.now},
  Mobile: { type: Number },
  Name: { type: String },
  WhatsAppOptedIn: { type: Boolean,default: false },
  GlificID: { type: Number },
  GlificIDUpdated: { type: Boolean,default: false },
  IsActive: { type: Boolean,default: true },
  Language: { type: String, default: "English"},
  Age: { type: Number },
  Consent: { type: Boolean, default:false },
  RegisteredTime: {type: Date,default: Date.now},
  NudgeTime: { type: String },
  Gender: { type: String },
  EnglishProficiency: { type: String },
  OnboardingComplete: { type: Boolean, default:false },
  OnboardingStep: { type: Number,default:"1" },
  Excluded: { type: Boolean, default:false },
  SourcingChannel: { type: String },
  Tags: { type: String },
  WordleLevel: { type: String }
});

module.exports = model("Users", schema);
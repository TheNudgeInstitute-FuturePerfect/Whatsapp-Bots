const { Schema, model } = require("mongoose");

const schema = new Schema({
  ROWID: {type: Number},
  CREATORID: {type: Number}, 
  CREATEDTIME: {type: Date,default: Date.now},
  MODIFIEDTIME: {type: Date,default: Date.now},
  SessionID: { type: String },
  Mobile: { type: String },
  Rating: { type: Number },
  Feedback: { type: String },
  FeedbackType: { type: String },
  FeedbackURL: { type: String },
  GPTRating: { type: Number },
  GPTFeedback: { type: String },
  GPTFeedbackType: { type: String },
  GPTFeedbackURL: { type: String }
});

module.exports = model("SessionFeedback", schema);
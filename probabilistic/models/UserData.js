const { Schema, model } = require("mongoose");

const schema = new Schema({
  ROWID: {type: Number},
  CREATORID: {type: Number}, 
  CREATEDTIME: {type: Date,default: Date.now},
  MODIFIEDTIME: {type: Date,default: Date.now},
  FlowID: { type: Number },
  Segment: { type: String },
  Question: { type: String },
  Answer: { type: String },
  UserROWID: { type: Schema.Types.ObjectId, ref: 'Users' }
});

module.exports = model("UserData", schema);
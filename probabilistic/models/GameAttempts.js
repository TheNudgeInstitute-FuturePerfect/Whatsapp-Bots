const { Schema, model } = require("mongoose");

const schema = new Schema({
  Mobile: { type: Number },
  Type: { type: String, required:true},
  SessionID: { type: String, required:true},
  SessionStartTime: {type: Date, required:true},
  SessionEndTime: {type: Date},
  SessionComplete: { type: String, enum:["Yes","No"], required:true },
  TimeSpent: { type: Number, required:true }
},
{
  timestamps: true,
});

module.exports = model("GameAttempts", schema);
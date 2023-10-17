const { Schema, model } = require("mongoose");

const schema = new Schema({
  ROWID: {type: Number},
  CREATORID: {type: Number}, 
  //CREATEDTIME: {type: Date,default: Date.now},
  //MODIFIEDTIME: {type: Date,default: Date.now},
  Version: { type: Number },
  StartDate: {type: Date,default: Date.now},
  Sequence: { type: Number }
},
{
  timestamps: true,
});

module.exports = model("Versions", schema);
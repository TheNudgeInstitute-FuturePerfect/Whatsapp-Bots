const { Schema, model } = require("mongoose");

const schema = new Schema({
  ROWID: {type: Number},
  CREATORID: {type: Number}, 
  CREATEDTIME: {type: Date,default: Date.now},
  MODIFIEDTIME: {type: Date,default: Date.now},
  Name: { type: String },
  Description: { type: String },
  Value: { type: String },
  SystemPromptROWID: { type: Schema.Types.ObjectId, ref: 'SystemPrompts' },
  PrimaryKey: { type: String }
},
{
  timestamps: true,
});

module.exports = model("Configurations", schema);
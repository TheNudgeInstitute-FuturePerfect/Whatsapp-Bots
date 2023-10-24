const { Schema, model } = require("mongoose");

const schema = new Schema({
  ROWID: {type: Number},
  CREATORID: {type: Number}, 
  //CREATEDTIME: {type: Date,default: Date.now},
  //MODIFIEDTIME: {type: Date,default: Date.now},
  SessionID: { type: String },
  Event: { type: String },
  SystemPromptROWID: { type: Schema.Types.ObjectId, ref: 'SystemPrompts' },
  Mobile: { type: Number }
},
{
  timestamps: {
    createdAt:'CREATEDTIME',
    updatedAt:'MODIFIEDTIME'
  },
});

module.exports = model("SessionEvents", schema);
const { Schema, model } = require("mongoose");

const schema = new Schema({
  ROWID: {type: Number},
  CREATORID: {type: Number}, 
  CREATEDTIME: {type: Date,default: Date.now},
  MODIFIEDTIME: {type: Date,default: Date.now},
  UserROWID: { type: Schema.Types.ObjectId, ref: 'Users' },
  SystemPromptROWID: { type: Schema.Types.ObjectId, ref: 'SystemPrompts' },
  IsActive: {type: Boolean},
  TransactionID: { type: String },
  PaymentStatus: { type: String }
});

module.exports = model("UserPaidTopicMapper", schema);
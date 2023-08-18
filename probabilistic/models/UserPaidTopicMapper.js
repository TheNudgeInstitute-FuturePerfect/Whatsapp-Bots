const { Schema, model } = require("mongoose");

const schema = new Schema({
  ROWID: Schema.Types.ObjectId,
  CREATORID: {type: Number}, 
  CREATEDTIME: {type: Date,default: Date.now},
  MODIFIEDTIME: {type: Date,default: Date.now},
  UserROWID: Schema.Types.ObjectId,
  SystemPromptROWID: Schema.Types.ObjectId,
  IsActive: {type: Boolean},
  TransactionID: { type: String },
  PaymentStatus: { type: String }
});

module.exports = model("UserPaidTopicMapper", schema);
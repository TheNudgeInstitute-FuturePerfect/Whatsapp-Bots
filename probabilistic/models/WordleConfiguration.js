const { Schema, model } = require("mongoose");

const schema = new Schema({
  ROWID: {type: Number},
  CREATORID: {type: Number}, 
  CREATEDTIME: {type: Date,default: Date.now},
  MODIFIEDTIME: {type: Date,default: Date.now},
  WordleDate : {type: Date,default: Date.now},
  Word : {type: String},
  WordTranslation : {type: String},
  Definition : {type: String},
  Hint : {type: String},
  Example : {type: String},
  RecommendedTopic : {type: String},
  MaxAttempts : {type: Number},
  EnglishLevel : {type: String}
},
{
  timestamps: true,
});

module.exports = model("WordleConfiguration", schema);
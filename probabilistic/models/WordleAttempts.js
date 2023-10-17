const { Schema, model } = require("mongoose");

const schema = new Schema({
  ROWID: {type:Number},
  CREATORID: {type: Number}, 
  //CREATEDTIME: {type: Date,default: Date.now},
  //MODIFIEDTIME: {type: Date,default: Date.now},
  UserROWID : { type: Schema.Types.ObjectId, ref: 'Users' },
  WordleROWID : { type: Schema.Types.ObjectId, ref: 'WordleConfiguration' },
  Answer : {type: String},
  IsCorrect : {type: Boolean,default: false},
  Source : {type: String},
  SystemPromptROWID : { type: Schema.Types.ObjectId, ref: 'SystemPrompts' }
},
{
  timestamps: {
    createdAt:'CREATEDTIME',
    updatedAt:'MODIFIEDTIME'
  },
});

module.exports = model("WordleAttempts", schema);
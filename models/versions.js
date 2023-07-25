import { Schema, model } from "mongoose";

const schema = new Schema({
  ROWID: {type: Long},
  CREATORID: {type: Long}, 
  CREATEDTIME: {type: Date,default: Date.now},
  MODIFIEDTIME: {type: Date,default: Date.now},
  name: { type: String, minlength: 3, unique: true, required: true },
  Version: { type: Number, required: true },
});

export default model("Word", schema);
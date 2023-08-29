const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const schema = new Schema(
  {
    UserROWID           :{ type: String, required: true },
    SessionID           :{ type: String, required: true }
  },
  {
    timestamps: true,
  }
);

const UserDoubtSession = mongoose.model("UserDoubtSession", schema);

module.exports = UserDoubtSession

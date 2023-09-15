const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const schema = new Schema(
  {
    UserROWID           :{ type: Schema.Types.ObjectId, ref: 'Users' },
    SessionID           :{ type: String, required: true },
    SystemPromptROWID   :{ type: Schema.Types.ObjectId, ref: 'SystemPrompts' },
    IsUnlocked          :{ type: Boolean, required: true, default: false},
    PaymentID           :{ type: String, required: true },
    PaymentTracker      :[]
  },
  {
    timestamps: true,
  }
);

const UserTopicSubscriptionMapper = mongoose.model("UserTopicSubscriptionMapper", schema);

module.exports = UserTopicSubscriptionMapper

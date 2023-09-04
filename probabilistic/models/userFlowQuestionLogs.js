const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const schema = new Schema(
  {
    Mobile              :{ type: Number, min:6000000000, max:9999999999, required: true },
    SessionID           :{ type: String, required: true },
    SystemPromptROWID   :{ type: String, required: true },
    Category            :{ type: String, required: true },
    IsComplete          :{ type: Boolean, required: true, default:false },
    CompletionReason    :{ type: String },
    NextQuestionID      :{ type: String },
    QuestionAnswers     :[
        {
            QuestionID          :{ type: String, required: true },
            ResponseAVURL       :{ type: String },
            ResponseText        :{ type: String },
            IsCorrectResponse   :{ type: Boolean, default:false },
            ErrorInResponse     :{ type: String },
            ErrorDescription    :{ type: String },
            ConfidenceInterval  :{ type: Number, min:0, max:1 },
            CreatedTime         :{ type: Date, default: Date.now, required:true }
        }
    ]
  },
  {
    timestamps: true,
  }
);

const UserFlowQuestionLogs = mongoose.model("UserFlowQuestionLogs", schema);

module.exports = UserFlowQuestionLogs

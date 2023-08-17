const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const schema = new Schema(
  {
    SystemPromptROWID   :{ type: BigInt, required: true },
    AskingOrder         :{ type: Number, required: true, default:-1 },
    Question            :{ type: String, required: true, trim:true },
    QuestionType        :{ 
                            type: String, 
                            enum: ['Text','Audio','Image', 'Audio+Image'],
                            required: true,
                            default:'Text',

                        },
    avURL               :{type:String,trim:true},
    ImageURL            :{type:String,trim:true},
    ResponseFormat      :{ 
                            type: String, 
                            enum: ['Text','Button','Audio','None','List','Integer','Float'],
                            required: true 
                        },
    ResponseValidations:[
        {
            responseType:{ 
                type: String, 
                enum: ['Text','Button','Audio','None','List','Integer','Float'],
                required: true 
            },
            operandLHS:{type:String,required:true},
            operation:{type:String,required:true},
            operandRHS:{type:String,required:true},
            errorMessage:{type:String,required:true}
        }
    ],
    ResponseTimeOut:{type:Number,min:0},
    Options:[],
    Answers:[],
    Tags:[],
    SkipLogic:{type:String},
    IsActive:{type:Boolean,default:true,required:true},
    IsEvaluative:{type:Boolean,default:true},
    Feedback:{
        onSuccess:String,
        onSuccessAVURL:String,
        onError:String,
        onErrorAVURL:String
    }    
  },
  {
    timestamps: true,
  }
);

const QuestionBank = mongoose.model("QuestionBank", schema);

module.exports = QuestionBank

const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    lastActivity: {
      type: Date,
      default: Date.now,
      index: true, 
    },
  },
  {
    timestamps: true,
  }
);

// Optional: auto-update lastActivity when updated
chatSchema.pre("save", function (next) {
  this.lastActivity = Date.now();
  next();
});

const Chat = mongoose.model("chat", chatSchema);

module.exports = Chat;

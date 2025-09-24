const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user", 
    },
    chat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
      index: true, 
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ["user", "assistant", "system"], 
      default: "user",
    },
  },
  { timestamps: true }
);

// Index for fetching chat history fast
messageSchema.index({ chat: 1, createdAt: 1 });

const Message = mongoose.model("message", messageSchema);

module.exports = Message;

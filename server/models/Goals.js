const mongoose = require("mongoose");

const goalSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  title: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  priority: {
    type: String,
    enum: ['urgent', 'high', 'medium', 'low'],
    required: true
  },
  deadline: {
    type: Date
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  },
  completed: {
    type: Boolean,
    default: false
  },
  recurrence: {
    type: String,
    enum: ['one-time', 'daily', 'weekly', 'monthly', 'yearly'],
    default: 'one-time'
  },

  // Per-occurrence exceptions for recurring tasks
  exceptions: [
    {
      date: { type: String, required: true }, // 'YYYY-MM-DD'
  type: { type: String, enum: ['delete', 'modify', 'complete', 'uncomplete'], required: true },
      override: {
        title: String,
        category: String,
        priority: {
          type: String,
          enum: ['urgent', 'high', 'medium', 'low']
        },
        startTime: String,
        endTime: String,
        // Add more fields as needed
      }
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Goal", goalSchema);

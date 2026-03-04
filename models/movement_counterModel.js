const mongoose = require("mongoose");

const counterSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: true,
      // Example: MOVEMENT_OS_202603
    },
    seq: {
      type: Number,
      default: 0,
    },
  },
  {
    versionKey: false,
  },
);

module.exports = mongoose.model("movement_seq_counter", counterSchema);

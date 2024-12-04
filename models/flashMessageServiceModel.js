const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");
const Schema = mongoose.Schema;

const flashMessageServiceSchema = new mongoose.Schema({
  department: { type: String },
  message: { type: String },
  description: { type: String },
  createdAt: { type: Date },
  updatedAt: { type: Date },
});
mongoose.model("flash_message_service", flashMessageServiceSchema);
flashMessageServiceSchema.plugin(timestamps);
module.exports = mongoose.model("flash_message_service");

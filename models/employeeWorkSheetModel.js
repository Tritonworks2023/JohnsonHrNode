const mongoose = require("mongoose");
const mongooseTimestamp = require("mongoose-timestamp");

const employeeWorkSheetSchema = new mongoose.Schema({
  JLS_EWD_WKDATE: { type: Date, required: true },
  JLS_EWD_BRCODE: { type: String, required: true },
  JLS_EWD_JOBNO: { type: String, required: true },
  JLS_EWD_EMPNO: { type: String, required: true },
  JLS_EWD_ACTIVITY: { type: String, required: true },
  JLS_EWD_WRKHOUR: { type: Number, required: true },
  JLS_EWD_PREPBY: { type: String, required: true },
  JLS_EWD_PREPDT: { type: Date, required: true },
  JLS_EWD_STATUS: { type: String, default: 'A' },
  JLS_EWD_MODBY: { type: String },
  JLS_EWD_MODDT: { type: Date },
  JLS_EWD_STATUS: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
  JLS_UPLOAD_STATUS: { type: String, enum: ['N', 'Y', 'U'], default: 'N' },
  JLS_EWD_DISTANCE: { type: Number },
  JLS_EWD_CREATEDDATE: { type: Date, default: Date.now }
});

employeeWorkSheetSchema.plugin(mongooseTimestamp);
const EmployeeWorkSheet = mongoose.model("EmployeeWorkSheet", employeeWorkSheetSchema);
module.exports = EmployeeWorkSheet;

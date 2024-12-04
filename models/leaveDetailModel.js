const mongoose = require("mongoose");
const { Schema } = mongoose;

const leaveDetailSchema = new Schema({
  EMPID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "EmployeeMaster",
    required: true,
    index: true,
  },
  GRADE: String,
  DEPT: String,
  LVAPNO: { type: Number, default: 99999999 },
  LVYR: { type: String, required: true },
  LVCODE: { type: String, required: true },
  FRMSESSION: { type: String },
  TOSESSION: { type: String },
  LVFRMDT: { type: Date, required: true, index: true },
  LVTODT: { type: Date, required: true, index: true },
  LVFROMTIME: String,
  LVTOTIME: String,
  PREFERREDTIME: String,
  LVFROMDTTIME: { type: Date, default: null },
  LVTODTTIME: { type: Date, default: null },
  EMPNO: { type: String, index: true },
  EMPNAME: { type: String },
  BRCODE: { type: String, ref: "BranchMaster", required: true, index: true },
  ISESLVCODE: String,
  IISESLVCODE: String,
  REASON: String,
  STATUS: {
    type: String,
    enum: ["PENDING", "APPROVED", "REJECTED", "CANCELLED"],
    default: "PENDING",
    index: true,
  },
  SOURCE: { type: String, default: "JLSMART" },
  ENTRYBY: String,
  ENTRYDT: Date,
  MODBY: String,
  MODDT: Date,
  LVSANCBY: String,
  LVSANCDT: { type: Date, index: true },
  TYPE: { type: String, default: "LEAVE" },
  APPROVER: { type: String, ref: "EmployeeMaster" },
  FROMLOC: { type: String },
  FROMLOCLAT: { type: Number },
  FROMLOCLNG: { type: Number },
  TOLOC: { type: String },
  TOLOCLAT: { type: Number },
  TOLOCLNG: { type: Number },
  JOURNEYMODE: { type: String, enum: ["AIR", "BUS", "TRAIN", "CAR"] },
  ADVANCEAMT: { type: Number },
  ADVANCEAMTFLG: { type: Boolean, default: false },
  DEPARTUREDT: { type: Date },
  RETURNDT: { type: Date },
  LARRANGEMENTS: { type: String, enum: ["OWN", "COMPANY"] },
  CARRANGEMENTS: { type: String, enum: ["OWN", "COMPANY"] },
  travelId: { type: mongoose.Schema.Types.ObjectId, ref: "TravelDesk" },
  TRAVELMODE: { type: String, enum: ["INTERNATIONAL", "DOMESTIC"] },
  TRAVELTIME: { type: Number },
  DEVIATION: { type: Boolean, default: false },
  DEVIATIONDESC: { type: String },
  DEVIATIONDATA: {},
  detail: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  LODGINGPAIDBY: String,
  JOBSPECIFIC: { type: String, default: "" },
});

leaveDetailSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

const LeaveDetail = mongoose.model("LeaveDetail", leaveDetailSchema);
module.exports = LeaveDetail;

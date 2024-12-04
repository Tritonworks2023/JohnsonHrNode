const mongoose = require("mongoose");
const mongooseTimestamp = require("mongoose-timestamp");

const balanceLeaveSchema = new mongoose.Schema({
    EMPID: { type: mongoose.Schema.Types.ObjectId, ref: 'EmployeeMaster', required: true , index: true },
    GRADE: String,
    DEPT: String,
    PA_ELSTD_EMPNO: { type: String, ref: "EmployeeMaster", index: true },
    PA_ELSTD_ENAME: { type: String },
    PA_ELSTD_BRCODE: { type: String, ref: 'BranchMaster', index: true},
    PA_ELSTD_LVYR: String,
    PA_ELSTD_LVCODE: String, 
    PA_ELSTD_AVD: Number,
    PA_ELSTD_BAL: Number
});

balanceLeaveSchema.plugin(mongooseTimestamp);

const BalanceLeave = mongoose.model("BalanceLeave", balanceLeaveSchema);

module.exports = BalanceLeave;

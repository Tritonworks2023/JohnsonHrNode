const mongoose = require('mongoose');

const employeeTrackingSchema = new mongoose.Schema({
    EMPNO: { type: String, required: true , index: true },
    EMPID: { type: mongoose.Schema.Types.ObjectId, ref: 'EmployeeMaster', required: true , index: true },
    GRADE: String,
    DEPT: String,
    BRCODE: { type: String, ref: 'BranchMaster', required: true, index: true },
    ENAME: { type: String },
    REPMGR: { type: String, ref: 'EmployeeMaster', index: true },
    REPHR: { type: String, ref: 'EmployeeMaster' , index: true },
    DATE: { type: Date, required: true , index: true },
    LATITUDE: { type: Number, required: true },
    LONGITUDE: { type: Number, required: true },
    ADDRESS: { type: String, required: true },
    ACTIVITY: { type: String }
});

const EmployeeTracking = mongoose.model('EmployeeTracking', employeeTrackingSchema);

module.exports = EmployeeTracking;

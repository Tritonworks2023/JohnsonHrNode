const mongoose = require('mongoose');
const { Schema } = mongoose;

const attendanceRecordSchema = new Schema({
    LVAPNO: { type: Number, default: 99999999 },
    LVYR: { type: String, required: true },
    LVDT: { type: Date, required: true , index: true},
    EMPNO: { type: String, ref: 'EmployeeMaster', required: true },
    EMPNAME: String,
    BRCODE: { type: String, ref: 'BranchMaster', required: true },
    BRSTARTTIME: { type: String }, 
    BRENDTIME: { type: String }, 
    LVCODE: String,
    ISESLVCODE: String,
    IISESLVCODE: String,
    ISESREASON: String,
    IISESREASON: String,
    REASON: String,
    SOURCE: { type: String, default: 'JLSMART' },
    ENTRYBY: String,
    ENTRYDT: Date,
    MODBY: String,
    MODDT: Date,
    LVSANCBY: String,
    LVSANCDT: Date,
    CHECKINTIME: { type: String },
    CHECKOUTTIME: { type: String },
    TOTWORKHOURS: { type: Number, default: 0 },
    TOTOLKM: { type: Number, default: 0 },
    CHECKINDTTIME: { type: Date, default: null },
    CHECKOUTDTTIME: { type: Date, default: null },
    TYPE: { type: String, enum: ['LEAVE', 'ATTENDANCE', 'MOVEMENT'], required: true },
    ORACLESTATUS: { type: String, default: 'N' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, { _id: false }); // Disable _id for subdocuments

const leaveAttendanceMasterSchema = new Schema({
    EMPNO: { type: String, required: true , index: true},
    EMPID: { type: mongoose.Schema.Types.ObjectId, ref: 'EmployeeMaster', required: true , index: true },
    GRADE: String,
    DEPT: String,
    BRCODE: { type: String, ref: 'BranchMaster', required: true , index: true},
    attendanceRecords: [attendanceRecordSchema]
});

leaveAttendanceMasterSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

leaveAttendanceMasterSchema.index({ BRCODE: 1, 'attendanceRecords.LVDT': -1 });
leaveAttendanceMasterSchema.index({ EMPNO: 1, BRCODE: 1 });


const LeaveAttendanceMaster = mongoose.model('LeaveAttendanceMaster', leaveAttendanceMasterSchema);

module.exports = LeaveAttendanceMaster;

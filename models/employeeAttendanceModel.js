const mongoose = require('mongoose');
const { Schema } = mongoose;

const employeeAttendanceSchema = new Schema({
    EMPID: { type: mongoose.Schema.Types.ObjectId, ref: 'EmployeeMaster', required: true , index: true },
    GRADE: String,
    DEPT: String,
    LVAPNO: { type: Number, default: 99999999 },
    LVYR: { type: String, required: true },
    LVDT: { type: Date, default: Date.now, required: true , index: true},
    EMPNO: { type: String, ref: 'EmployeeMaster', required: true , index: true},
    EMPNAME: { type: String },
    BRCODE: { type: String, ref: 'BranchMaster', required: true , index: true},
    BRSTARTTIME: { type: String }, 
    BRENDTIME: { type: String  }, 
    CHECKINSTATUS: { type: Boolean, default: false },
    CHECKINTIME: { type: String },
    CHECKINLAT: { type: Number }, 
    CHECKINLNG: { type: Number }, 
    CHECKINADDRESS: { type: String }, 
    CHECKOUTSTATUS: { type: Boolean, default: false },
    CHECKOUTTIME: { type: String },
    CHECKOUTLAT: { type: Number }, 
    CHECKOUTLNG: { type: Number }, 
    CHECKOUTADDRESS: { type: String },
    REASON: String,
    STATUS: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
    SOURCE: { type: String, default: 'JLSMART' },
    ENTRYBY: String,
    ENTRYDT: Date,
    MODBY: String,
    MODDT: Date,
    LVSANCBY: String,
    LVSANCDT: Date,
    TYPE: { type: String, default: 'ATTENDANCE' },
    PHOTO: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

employeeAttendanceSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

employeeAttendanceSchema.index({ EMPNO: 1, LVDT: -1 });

const EmployeeAttendance = mongoose.model('EmployeeAttendance', employeeAttendanceSchema);
module.exports = EmployeeAttendance;

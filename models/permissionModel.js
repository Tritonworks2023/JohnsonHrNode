const mongoose = require('mongoose');
const { Schema } = mongoose;

const permissionSchema = new Schema({
    EMPID: { type: mongoose.Schema.Types.ObjectId, ref: 'EmployeeMaster', required: true , index: true },
    GRADE: String,
    DEPT: String,
    EMPNO: { type: String, required: true , index: true},
    EMPNAME: { type: String},
    BRCODE: { type: String, ref: 'BranchMaster', required: true , index: true},
    REASON: String,
    STATUS: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' , index: true},
    PERMISSIONDATE: { type: Date, required: true , index: true},
    FROMTIME: { type: String, required: true , index: true},
    TOTIME: { type: String, required: true , index: true},
    DURATION: String,
    ENTRYBY: String,
    ENTRYDT: { type: Date, default: Date.now },
    SANCBY: String,
    SANCDT: { type: Date, default: Date.now },
    APPROVER: { type: String, ref: 'EmployeeMaster' },
    createdAt: { type: Date, default: Date.now }, 
    updatedAt: { type: Date, default: Date.now } 
});

// Pre-save hook to update updatedAt field
permissionSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

const Permission = mongoose.model('Permission', permissionSchema);
module.exports = Permission;

const mongoose = require('mongoose');
const { Schema } = mongoose;

// Schema for compensatory off entries
const compensatoryOffSchema = new Schema({
    EMPID: { type: mongoose.Schema.Types.ObjectId, ref: 'EmployeeMaster', required: true , index: true },
    GRADE: String,
    DEPT: String,
    EMPNO: { type: String, required: true },
    EMPNAME: { type: String },
    BRCODE: { type: String, ref: 'BranchMaster', required: true },
    APPROVER: { type: String, ref: 'EmployeeMaster' },
    COMPOFFHOURS: { type: Number, required: true },
    CHECKINTIME: { type: String },
    CHECKOUTTIME: { type: String },
    ENTRYDATE: { type: Date, required: true },
    VALIDUNTIL: { type: Date, required: true },
    STATUS: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
    SANCBY: String,
    SANCDT: Date,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

compensatoryOffSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});



const CompensatoryOff = mongoose.model('CompensatoryOff', compensatoryOffSchema);

module.exports = CompensatoryOff;
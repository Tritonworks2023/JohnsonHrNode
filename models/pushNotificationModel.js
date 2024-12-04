const mongoose = require('mongoose');
const pushNotificationSchema = new mongoose.Schema({
    USERID: { type: mongoose.Schema.Types.ObjectId, ref: 'EmployeeMaster', required: true },
    EMPNO: { type: String, ref: 'EmployeeMaster', required: true },
    BRCODE: { type: String, ref: 'BranchMaster', required: true },
    TITLE: { type: String, required: true },
    DESC: { type: String, required: true },
    SENDAT: { type: Date, default: Date.now },
    READSTATUS: { type: Boolean, default: false }
});

const PushNotification = mongoose.model('PushNotification', pushNotificationSchema);
module.exports = PushNotification;

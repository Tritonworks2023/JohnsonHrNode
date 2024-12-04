const mongoose = require('mongoose');

const trackingNotificationSchema = new mongoose.Schema({
    EMPNO: { type: String, ref: 'EmployeeMaster', required: true },
    USERNAME: { type: String },
    USERNO: { type: String },
    TRACKINGID: { type: mongoose.Schema.Types.ObjectId, ref: 'EmployeeTracking', required: true },
    DATE: { type: Date, required: true },
    TIME: { type: String },
    TYPE: { type: String },
    ACTIVITY: { type: String },
    DESCRIPTION: { type: String },
    STATUS: { type: String }
});

const TrackingNotification = mongoose.model('TrackingNotification', trackingNotificationSchema);

module.exports = TrackingNotification;


const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());
const baseURL = process.env.BASE_URL;
const dates = require('date-and-time');
const request = require("request");
const path = require('path');
const fs = require('fs');
const { executeOracleQuery } = require('../../config/oracle'); 
const mongoose = require('mongoose');

const moment = require('moment');

// TABLES
const EmployeeMaster = require('../../models/employeeMasterModel');
const LeaveAttendanceMaster = require('../../models/leaveAttendanceMasterModel');
const LeaveDetail = require('../../models/leaveDetailModel');
const EmployeeAttendance = require('../../models/employeeAttendanceModel');
const BranchMaster = require('../../models/branchMasterModel');
const BalanceLeave = require('../../models/balanceLeaveModel');
const Holiday = require('../../models/holidayModel');
const Permission = require('../../models/permissionModel');
const PushNotification = require('../../models/pushNotificationModel');

function isTimeWithinRange(time, startTime, endTime) {
    return moment(time, 'HH:mm').isSameOrAfter(moment(startTime, 'HH:mm')) && moment(time, 'HH:mm').isSameOrBefore(moment(endTime, 'HH:mm'));
}

const formatDateMiddleware = (req, res, next) => {
    const originalJson = res.json;
    const recursiveFormatDates = (obj) => {
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                if (obj[key] instanceof Date) {
                    obj[key] = moment(obj[key]).format('DD-MM-YYYY');
                } else if (typeof obj[key] === 'object') {
                    recursiveFormatDates(obj[key]);
                }
            }
        }
    };
    res.json = function (body) {
        if (typeof body === 'object') {
            recursiveFormatDates(body);
        }
        originalJson.call(this, body);
    };
    next();
};

router.use(formatDateMiddleware);


router.post('/tokenUpdate', async (req, res) => {
    try {
      console.log("===notificationCreate",req.body,"================+++++++++++++++++++++++++++++++++++++++++++");
      const employee = await EmployeeMaster.findById(req.body.USERID);
      if (!employee) {
        return res.json({
          Status: "Failed",
          Message: "Employee not found",
          Data: {},
          Code: 200,
        });
      }
      const employeeUpdate = await EmployeeMaster.findByIdAndUpdate(
        req.body.USERID,
        { $set: { USERTOKEN: req.body.USERTOKEN } },
        { new: true }
      );
      if (!employeeUpdate) {
        return res.status(404).json({ Status: "Failed",Message: "User not found",Data: {},Code: 404 });
      }
      return res.status(200).json({ Status: "Success",Message: "User token updated successfully",Data: employeeUpdate,Code: 200 });
    } catch (err) {
      console.error('Error updating user token:', err);
      return res.status(500).json({ Status: "Failed",Message: "Internal Server Error",Data: {},Code: 500 });
    }
});


router.post('/getNotificationList', async (req, res) => {
    try {
        const EMPNO = req.body.EMPNO;
        console.log("=======req.body",req.body);
        const notifications = await PushNotification.find({ EMPNO }).sort({ sentAt: -1 });
        return res.status(200).json({ success: true, notifications });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

router.post('/updateNotificationStatus', async (req, res) => {
    try {
        const notificationId = req.body.notificationId;
        const notification = await PushNotification.findById(notificationId);
        if (!notification) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }
        notification.READSTATUS = true;
        await notification.save();
        return res.status(200).json({ success: true, message: 'Notification read status updated successfully' });
    } catch (error) {
        console.error('Error updating notification read status:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

module.exports = router


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


const firebaseHeaders = {
    'Authorization': 'key=AAAAjuadi54:APA91bFRpHYqKm_0hd2-tjjHXo_ISQKS47e6m8lZrB_T0oapV1OaLM-zqTYj-U5CfrYXEGdlX8X-qYdNiPbZhFpfE6-fAuENcjuFaasU1BPCgU5JLwdi5r-7R6QSaS4RuKBfPPSnusNb',
    'Content-Type': 'application/json'
};

async function createNotification(notificationData) {
    console.log("=======createNotification innnnnnnnnnnnnnnnnnnn=============",notificationData);
    try {
        try {
            const employee = await EmployeeMaster.findOne({ EMPNO: notificationData.EMPNO });
            if (!employee) {
                return { success: false, message: "Employee Not found" };
            }
            const createdNotification = await PushNotification.create({
                USERID: employee._id,
                EMPNO: notificationData.EMPNO,
                BRCODE: notificationData.BRCODE,
                TITLE: notificationData.TITLE,
                DESC: notificationData.DESC,
                LVAPNO:notificationData.LVAPNO
            });
            console.log("=======createdNotification==",createdNotification);
            if (employee) {
                const userToken = employee.USERTOKEN;
                let notificationResult = await sendFCMNotification(userToken, notificationData.TITLE, notificationData.DESC);
                console.log("=======notificationResult==",notificationResult);
            }
            return { success: true };
        } catch (e) {
            return { success: false , message: e };
        }
    } catch (err) {
      console.error('Error creating notification:', err);
      return { success: false , message: e };
    }
}
  
const sendFCMNotification = async (userToken, title, body) => {
    const firebaseURL = "https://fcm.googleapis.com/fcm/send";
    const notificationBody = {
        to: userToken,
        notification: {
        title: title,
        body: body,
        sound: "default"
        },
        data: {}
    };
    const options = {
        priority: "high",
        timeToLive: 60 * 60 * 24
    };

    try {
        const response = await request.post({
        url: firebaseURL,
        method: "POST",
        headers: firebaseHeaders,
        body: notificationBody,
        options,
        json: true
        });
        //console.log("=====================response================",response,userToken,"=++++++++++++++++++++++++++++++++++++========")
        return response;
    } catch (error) {
        console.error('Error sending FCM notification:', error);
        throw error;
    }
};


module.exports = {
    createNotification    
}

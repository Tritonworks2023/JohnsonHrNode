
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
const LeaveDetail = require('../../models/leaveDetailModel');
const BranchMaster = require('../../models/branchMasterModel');
const Holiday = require('../../models/holidayModel');
const { TravelDesk } = require('../../models/travelDeskModel');

const { createNotification } = require('../hr-admin/shareRoutes');

async function validateUserExistence(EMPNO) {
    const userExists = await EmployeeMaster.findOne({ ECODE: EMPNO });
    return userExists;
}

function validateRequiredFields(LVFRMDT, LVTODT, EMPNO, LVCODE, BRCODE, ENTRYBY) {
    if (!LVFRMDT || !LVTODT || !EMPNO || !LVCODE || !BRCODE || !ENTRYBY) {
        return 'LVFRMDT, LVTODT, EMPNO, LVCODE, BRCODE, and ENTRYBY are required fields';
    }
    return null;
}

async function isHolidayDate(date, brcode, year) {
    console.log("========date, brcode, year",date, brcode, year)
    const holiday = await Holiday.findOne({ HLDYDT: date, BRCODE: brcode, HLDYYR: year });
    console.log("========holiday",holiday)
    return !!holiday;
}

async function validateHolidayDate(parsedLVFRMDT, parsedLVTODT, BRCODE, lvYear, lvToYear) {
    const isHoliday = await isHolidayDate(parsedLVFRMDT, BRCODE, lvYear ) || await isHolidayDate(parsedLVTODT, BRCODE, lvToYear);
    console.log("========isHoliday",isHoliday)
    return isHoliday;
}

router.post('/movements-list', async (req, res) => {
    try {
        // const { EMPNO } = req.body; 
        // if (!EMPNO) {
        //     return res.status(400).json({ Status: 'Failed', Message: 'EMPNO is required', Data: {}, Code: 400 });
        // }
        const leaveList = await LeaveDetail.find({ TYPE: "MOVEMENT" });
        return res.status(200).json({ Status: 'Success', Message: 'Leave list retrieved successfully', Data: leaveList, Code: 200 });
    } catch (error) {
        console.error('Error retrieving leave list:', error);
        return res.status(500).json({ Status: 'Failed', Message: 'Internal Server Error', Data: {}, Code: 500 });
    }
});

router.post('/movement-data', async (req, res) => {
    try {
        const movementId = req.body.movementId;
        const leaveRequest = await LeaveDetail.findById(movementId);
        if (!leaveRequest) {
            return res.status(404).json({ Status: "Failed", Message: "Leave request not found", Data: {} });
        }
        res.json({ Status: "Success", Message: "Leave request retrieved", Data: leaveRequest, Code: 200 });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ Status: "Failed", Message: error.message, Data: {}, Code: 500 });
    }
});

router.post('/approvals-list', async (req, res) => {
    try {
        const { EMPNO } = req.body; 
        if (!EMPNO) {
            return res.status(400).json({ Status: 'Failed', Message: 'EMPNO is required', Data: [], Code: 400 });
        }
        const leaveListPromise = LeaveDetail.find({ APPROVER: EMPNO, TYPE: "MOVEMENT" });
        const [leaveList] = await Promise.all([leaveListPromise]);

        if (leaveList.length === 0) {
            return res.status(200).json({ Status: 'Success', Message: 'No records found for the approver', Data: [], Code: 200 });
        }
        const responseData = [];
        await Promise.all(leaveList.map(async (leave) => {
            const formattedLeave = {
                _id: leave._id,
                EMPNO: leave.EMPNO,
                EMPNAME: leave.EMPNAME,
                LVCODE: leave.LVCODE,
                TYPE: leave.TYPE,
                LVDESC: leave.LVDESC,
                LVAPNO: leave.LVAPNO,
                LVYR: leave.LVYR,
                LVFRMDT: leave.LVFRMDT,
                LVTODT: leave.LVTODT,
                REASON: leave.REASON,
                STATUS: leave.STATUS,
                APPROVER: leave.APPROVER,
                LVFROMTIME: leave.LVFROMTIME,
                LVTOTIME: leave.LVTOTIME,
                FROMLOC: leave.FROMLOC,
                TOLOC: leave.TOLOC,
                JOURNEYMODE: leave.APPROVER,
                ADVANCEAMT: leave.ADVANCEAMT, 
                ADVANCEAMTFLG: leave.ADVANCEAMTFLG, 
                ENTRYBY: leave.ENTRYBY, 
                createdAt: leave.createdAt,
                updatedAt: leave.updatedAt
            };
            responseData.push(formattedLeave);
        }));
        return res.status(200).json({ Status: 'Success', Message: 'Approver records retrieved successfully', Data: responseData, Code: 200 });
    } catch (error) {
        console.error('Error retrieving approver records:', error);
        return res.status(500).json({ Status: 'Failed', Message: 'Internal Server Error', Data: [], Code: 500 });
    }
});

router.post('/approvals-summary', async (req, res) => {
    try {
        const { EMPNO, STATUS } = req.body; 
        if (!EMPNO) {
            return res.status(400).json({ Status: 'Failed', Message: 'EMPNO is required', Data: [], Code: 400 });
        }
        const leaveList = await LeaveDetail.find({ APPROVER: EMPNO, TYPE: "MOVEMENT", STATUS: STATUS });
        if (leaveList.length === 0) {
            return res.status(200).json({ Status: 'Success', Message: `No ${STATUS.toLowerCase()} records found for the approver`, Data: [], Code: 200 });
        }
        return res.status(200).json({ Status: 'Success', Message: `${STATUS} records retrieved successfully`, Data: leaveList, Code: 200 });
    } catch (error) {
        console.error(`Error retrieving ${STATUS.toLowerCase()} records:`, error);
        return res.status(500).json({ Status: 'Failed', Message: 'Internal Server Error', Data: [], Code: 500 });
    }
});

router.post("/approval-action", async (req, res) => {
    try {
        const { ID, ACTION, EMPNO, ADVANCEAMT, REASON } = req.body;
        const today = moment().toDate();
        console.log("====request",req.body);

        const request = await LeaveDetail.findById(ID);
        if (!request) {
            return res.status(404).json({
                Status: "Failed",
                Message: "Leave request not found",
                Code: 404,
            });
        }

        // Check if the request has already been approved or rejected
        if (request.STATUS === "APPROVED" || request.STATUS === "REJECTED") {
            return res.status(400).json({
                Status: "Failed",
                Message: "Request has already been processed",
                Code: 400,
            });
        }
        const employeeExists = await validateUserExistence(request.EMPNO);
        if (!employeeExists) {
            return res.status(404).json({
                Status: "Failed",
                Message: "Employee does not exist",
                Code: 404,
            });
        }
        const isGradeE3OrBelow = (employeeExists.GRADE <= 'E3');
        const lvYear = request.LVFRMDT.getFullYear().toString();

        request.STATUS = ACTION;
        request.REASON = REASON || "APPROVED FROM ADMIN";
        request.LVSANCBY = EMPNO || null;
        request.LVSANCDT = today;
        request.MODBY = EMPNO || "";
        request.MODDT = today;
        if(ADVANCEAMT){
            request.ADVANCEAMT = ADVANCEAMT;
        }
        await request.save();
        
        const travelId = await generateTravelId();

        if (ACTION === "APPROVED") {
            const travelDeskData = {
                travelId: travelId, 
                employee: employeeExists._id, 
                movement: request._id, 
                claim: null,
                accommodation: null, 
                brcode: employeeExists.BRCODE,
                status: "PENDING" 
            };
            const newTravelDeskEntry = new TravelDesk(travelDeskData);
            await newTravelDeskEntry.save();
        }

        return res.status(200).json({
            Status: "Success",
            Message: `Leave request ${ACTION} successfully`,
            Data: request,
            Code: 200,
        });
    } catch (error) {
        console.error("Error processing movement action:", error);
        return res.status(500).json({
            Status: "Failed",
            Message: "Internal Server Error",
            Code: 500
        });
    }
});

async function generateTravelId() {
    const count = await TravelDesk.countDocuments();
    return `T-${count + 1}`;
}


module.exports = router;
  
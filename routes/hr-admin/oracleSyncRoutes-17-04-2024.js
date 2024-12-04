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
const BalanceLeave = require('../../models/balanceLeaveModel');
const LeaveAttendanceMaster = require('../../models/leaveAttendanceMasterModel');
const LeaveDetail = require('../../models/leaveDetailModel');
const EmployeeAttendance = require('../../models/employeeAttendanceModel');
const BranchMaster = require('../../models/branchMasterModel');
const Holiday = require('../../models/holidayModel');

router.get('/sync-employees', async (req, res) => {
    try {
        const query = "SELECT * FROM PA_ALLEMP_VW WHERE STATUS = 'A' ";
        //const query = "SELECT * FROM (SELECT * FROM PA_ALLEMP_VW WHERE STATUS = 'A' AND BRCODE = 'TN01' ) WHERE ROWNUM <= 100";
        // const fiveDaysAgo = new Date();
        // fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 2);
        // const query = `SELECT * FROM PA_ALLEMP_VW WHERE CREATEDDATE >= :fiveDaysAgo`;
        // const bindParams = { fiveDaysAgo: new Date(fiveDaysAgo) };

        const bindParams = {};
        const result = await executeOracleQuery(query, bindParams);
        const employeesToCreate = [];

        const mergedResult1 = result.rows.map(row => {
            const mergedObject = {};
            result.metaData.forEach((meta, index) => {
              mergedObject[meta.name] = row[index];
            });
            return mergedObject;
        });
        for (const record of mergedResult1) {
            const ECODE = record.ECODE;
            const existingEmployee = await EmployeeMaster.findOne({ ECODE });
            if (existingEmployee) {
                const updateResult = await EmployeeMaster.updateOne(
                  { ECODE },
                  { $set: { 
                    BRCODE: record.BRCODE,
                    BRNAME: record.BRNAME,
                    SHIFTGRP: record.SHIFTGRP,
                    STATUS: record.STATUS,
                    REPMGR: record.APPMGR,
                  } }
                );
                if (updateResult.matchedCount > 0) {
                  console.log(`Employee ${ECODE} updated successfully.`);
                } else {
                  console.log(`Employee ${ECODE} update failed (no matching document).`); // Informative message
                }
              } else {
                if (!existingEmployee) {
                    const newEmployee = {
                        ECODE,
                        EMPNO: ECODE,
                        ENAME: record.ENAME,
                        PADR1: record.PADR1,
                        PADR2: record.PADR2,
                        PADR3: record.PADR3,
                        PADR4: record.PADR4,
                        EOFFICE: record.EOFFICE,
                        PPHONE: record.PPHONE,
                        DSGCODE: record.DSGCODE,
                        EDESIGN: record.EDESIGN,
                        GRADE: record.GRADE,
                        QUAL: record.QUAL,
                        DOJ: record.DOJ,
                        DOR: record.DOR,
                        BRCODE: record.BRCODE,
                        BRNAME: record.BRNAME,
                        SHIFTGRP: record.SHIFTGRP,
                        DEPT: record.DEPT,
                        DOB: record.DOB,
                        EMPTYPE: record.EMPTYPE,
                        EMPPIN: record.EMPPIN,
                        EMPCATG: record.EMPCATG,
                        EMPLEVEL: record.EMPLEVEL,
                        SEX: record.SEX,
                        CCCODE: record.CCCODE,
                        GRPCODE: record.GRPCODE,
                        LOCCODE: record.LOCCODE,
                        STATUS: record.STATUS,
                        REPMGR: record.APPMGR,
                        APPMGR: record.APPMGR,
                        ORIGINALPHOTO: "",
                        LOGINPHOTO: "",
                        CREATEDDATE: Date.now() 
                    };
                    employeesToCreate.push(newEmployee);
                }
            }
        }
        console.log("============employeesToCreate",employeesToCreate);
        if (employeesToCreate.length > 0) {
            await EmployeeMaster.insertMany(employeesToCreate);
        }

        res.json({ message: 'Employees synced successfully.' });
    } catch (error) {
        console.error('Error syncing employees:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get('/update-repmgr-status', async (req, res) => {
    try {
        const employees = await EmployeeMaster.find();
        for (const employee of employees) {
            if (employee.REPMGR && employee.REPMGR !== null) {
                await EmployeeMaster.updateOne({ ECODE: employee.REPMGR }, { REPMGRSTATUS: 'YES' });
            }
        }
        res.status(200).json({ message: 'REPMGRSTATUS updated successfully.' });
    } catch (error) {
        console.error('Error updating REPMGRSTATUS:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get('/update-repmgr', async (req, res) => {
    try {
        const employees = await EmployeeMaster.find({});

        for (const employee of employees) {
            const REPMGR = employee.REPMGR;
            console.log("=========employee.repMgr",REPMGR);
            if(REPMGR && REPMGR!=undefined){
                const repMgrEmployee = await EmployeeMaster.findOne({ EMPNO: REPMGR });
                console.log("========repMgrEmployee",repMgrEmployee);
                const repMgrName = repMgrEmployee ? repMgrEmployee.ENAME : '';
                employee.REPMGRNAME = repMgrName;
                console.log("======repMgrName===",repMgrName);
                console.log("======employee===",employee);
                await employee.save();
            }
        }

        return res.status(200).json({ Status: 'Success', Message: 'REPMGRNAME updated successfully', Code: 200 });
    } catch (error) {
        console.error('Error updating REPMGRNAME:', error);
        return res.status(500).json({ Status: 'Failed', Message: 'Internal Server Error', Code: 500 });
    }
});




router.get('/sync-balance-leaves', async (req, res) => {
    try {
        const query = "SELECT * FROM JLS_PA_LVATTSUM_VW WHERE PA_ELSTD_LVYR = :PA_ELSTD_LVYR";
        const bindParams = {
            PA_ELSTD_LVYR: 24
        };
        const result = await executeOracleQuery(query, bindParams);
        
        const mergedResult1 = result.rows.map(row => {
            const mergedObject = {};
            result.metaData.forEach((meta, index) => {
              mergedObject[meta.name] = row[index];
            });
            return mergedObject;
        });
        for (const record of mergedResult1) {
            const { PA_ELSTD_EMPNO, PA_ELSTD_LVYR, PA_ELSTD_LVCODE, PA_ELSTD_AVD, PA_ELSTD_BAL } = record;
            
            // Check if the leave entry already exists
            const existingLeave = await BalanceLeave.findOne({ PA_ELSTD_EMPNO, PA_ELSTD_LVCODE, PA_ELSTD_LVYR });

            if (existingLeave) {
                // If the leave entry exists, update PA_ELSTD_AVD and PA_ELSTD_BAL
                existingLeave.PA_ELSTD_AVD = PA_ELSTD_AVD;
                existingLeave.PA_ELSTD_BAL = PA_ELSTD_BAL;
                await existingLeave.save();
            } else {
                // If the leave entry doesn't exist, create a new one
                const newLeave = new BalanceLeave({
                    PA_ELSTD_EMPNO,
                    PA_ELSTD_LVYR,
                    PA_ELSTD_LVCODE,
                    PA_ELSTD_AVD,
                    PA_ELSTD_BAL
                });
                await newLeave.save();
            }
        }

        res.json({ message: 'Balance leaves synced successfully.' });
    } catch (error) {
        console.error('Error syncing balance leaves:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get('/sync-leaves-to-master-table', async (req, res) => {
    try {
        const startOfToday = moment().startOf('day');
        const endOfToday = moment().endOf('day');
        const leaveDetails = await LeaveDetail.find({
            $and: [
                { STATUS: 'APPROVED' },
                { TYPE: 'LEAVE' },
                { LVSANCDT: { $gte: startOfToday.toDate(), $lte: endOfToday.toDate() } }
            ] 
        });
        console.log("=============leaveDetails",leaveDetails);
        console.log("=============startOfToday",startOfToday);
        console.log("=============endOfToday",endOfToday);
        const leaveAttendanceRecords = [];
        for (const leave of leaveDetails) {
            const { LVFRMDT, LVTODT, LVYR, LVCODE, EMPNO, BRCODE, ISESLVCODE, IISESLVCODE, REASON, ENTRYBY, TYPE } = leave;
            const leaveDays = Math.floor((LVTODT - LVFRMDT) / (1000 * 60 * 60 * 24)) + 1;
            for (let i = 0; i < leaveDays; i++) {
                const LVDT = new Date(LVFRMDT);
                LVDT.setDate(LVDT.getDate() + i);
                const leaveAttendanceRecord = {
                    LVAPNO: leave.LVAPNO,
                    LVYR,
                    LVCODE,
                    LVDT,
                    EMPNO,
                    BRCODE,
                    ISESLVCODE,
                    IISESLVCODE,
                    REASON,
                    STATUS: leave.STATUS,
                    SOURCE: leave.SOURCE,
                    ENTRYBY,
                    ENTRYDT: leave.ENTRYDT,
                    MODBY: leave.MODBY,
                    MODDT: leave.MODDT,
                    LVSANCBY: leave.LVSANCBY,
                    LVSANCDT: leave.LVSANCDT,
                    TYPE
                };
                leaveAttendanceRecords.push(leaveAttendanceRecord);
            }
        }
        await LeaveAttendanceMaster.insertMany(leaveAttendanceRecords);
        return res.status(200).json({ Status: 'Success', Message: 'Leave details synced successfully', Code: 200 });
    } catch (error) {
        console.error('Error syncing leaves:', error);
        return res.status(500).json({ Status: 'Failed', Message: 'Internal Server Error', Code: 500 });
    }
});

async function processAndSyncAttendance(attendanceData, startDate, endDate) {
    for (const employeeData of attendanceData) {
        const { attendance } = employeeData;
        //const LVDT = moment().toDate();
        
        const today = moment();
        const yesterday = today.clone().subtract(1, 'day');
        const yesterdayDate = yesterday.toDate();
        const LVDT = yesterdayDate;

        console.log("==============LVDT",LVDT);
        
        const firstCheckin = attendance.find(record => record.CHECKINTIME);
        const lastCheckout = attendance.filter(record => record.CHECKOUTSTATUS)
        .sort((a, b) => new Date(b.CHECKOUTTIME) - new Date(a.CHECKOUTTIME)) 
        .pop();
        console.log("==============firstCheckin",firstCheckin);
        console.log("==============lastCheckout",lastCheckout);
    
        try {
            const branchRecord = await BranchMaster.findOne({ BRCODE: firstCheckin.BRCODE });
            if (!branchRecord) {
                console.log(`Branch with BRCODE ${firstCheckin.BRCODE} does not exist. Skipping synchronization.`);
                return;
            }
        
            const branchStartTime = moment(branchRecord.BRSTARTTIME, 'HH:mm');
            const branchEndTime = moment(branchRecord.BRENDTIME, 'HH:mm');
            let gracePeriodMinutes = 5;
            if (['TN01', 'TN11', 'TN13'].includes(branchRecord.BRCODE)) {
                gracePeriodMinutes = 30;
            }

            let checkinBeforeStart = false;
            let checkoutAfterEnd = false;
            
            const checkinTime = moment(firstCheckin.CHECKINTIME, 'HH:mm:ss');
            const gracePeriod = moment.duration(gracePeriodMinutes, 'minutes');
            checkinBeforeStart = checkinTime.isBefore(branchStartTime.add(gracePeriod));
            const checkinAfterEnd = checkinTime.isAfter(branchEndTime.subtract(gracePeriod));

            if(lastCheckout){
                const checkoutTime = moment(lastCheckout.CHECKOUTTIME, 'HH:mm:ss');
                checkoutAfterEnd = checkoutTime.isAfter(branchEndTime);
            }
        
            let ISESLVCODE = checkinBeforeStart ? 'PT' : 'AB';
            let IISESLVCODE = checkoutAfterEnd ? 'PT' : 'AB';
            const afternoonStart = moment('12:00', 'HH:mm');
            const afternoonSession = checkinTime.isAfter(afternoonStart);
        
            if (afternoonSession) {
                ISESLVCODE = 'AB';
                if (checkoutAfterEnd) {
                    IISESLVCODE = 'PT';
                } else {
                    IISESLVCODE = 'AB';
                }
            }

            let CHECKINTIME = (firstCheckin) ? firstCheckin.CHECKINTIME: "-";
            let CHECKOUTTIME = (lastCheckout) ? lastCheckout.CHECKOUTTIME: "-";
        
            const existingAttendanceMaster = await LeaveAttendanceMaster.findOne({ LVDT: { $gte: startDate, $lte: endDate }, EMPNO: firstCheckin.EMPNO });
            console.log("=============existingAttendanceMaster",existingAttendanceMaster,"=======");
            if (existingAttendanceMaster) {
                if (!("ISESLVCODE" in existingAttendanceMaster) || !("IISESLVCODE" in existingAttendanceMaster)) {
                    if (!firstCheckin) { // Update IISESLVCODE if firstCheckin is absent
                        existingAttendanceMaster.IISESLVCODE = IISESLVCODE;
                    } else if (!lastCheckout) { // Update ISESLVCODE if lastCheckout is absent
                        existingAttendanceMaster.ISESLVCODE = ISESLVCODE;
                    } else {
                        existingAttendanceMaster.ISESLVCODE = ISESLVCODE;
                        existingAttendanceMaster.IISESLVCODE = IISESLVCODE;
                    }
                    console.log("=============existingAttendanceMaster",existingAttendanceMaster);
                    await existingAttendanceMaster.save();
                }
            } else {
                const newAttendanceMaster = new LeaveAttendanceMaster({
                LVAPNO: 99999999,
                LVYR: moment(LVDT).format('YYYY'),
                LVDT,
                EMPNO: firstCheckin.EMPNO,
                EMPNAME: firstCheckin.EMPNAME,
                BRCODE: firstCheckin.BRCODE,
                ISESREASON : firstCheckin.REASON,
                ISESLVCODE,
                IISESLVCODE,
                ENTRYBY: firstCheckin.ENTRYBY,
                ENTRYDT: firstCheckin.ENTRYDT,
                MODBY: (lastCheckout) ? lastCheckout.ENTRYBY: "",
                MODDT: (lastCheckout) ? lastCheckout.LVDT: "",
                IISESREASON : (lastCheckout) ? lastCheckout.REASON : "",
                CHECKINTIME,
                CHECKOUTTIME,
                SOURCE: 'JLSMART',
                TYPE: 'ATTENDANCE'
                });
                console.log("==========newAttendanceMaster",newAttendanceMaster);
                await newAttendanceMaster.save();
            }
        } catch (error) {
            console.error('Error syncing attendance for', LVDT, error);
        }
    }
}
  
  
  // Function to Calculate Attendance Code (Reusable)
  function calculateCode(time, referenceTime) {
    const gracePeriodMinutes = 5; // Adjust as needed
    const gracePeriod = moment.duration(gracePeriodMinutes, 'minutes');
  
    const beforeStart = time.isBefore(referenceTime.add(gracePeriod));
    const afterEnd = time.isAfter(referenceTime.subtract(gracePeriod));
    return beforeStart || afterEnd ? 'PT' : 'AB';
  }


  async function processAndSyncAttendanceForAll(startDate, endDate) {
    try {
        const allEmployees = await EmployeeMaster.find({}, 'ECODE BRCODE ENAME');

        for (const employee of allEmployees) {
            const employeeData = await EmployeeAttendance.aggregate([
                {
                    $match: {
                        LVDT: { $gte: startDate, $lte: endDate },
                        EMPNO: employee.ECODE
                    }
                },
                {
                    $group: {
                        _id: '$EMPNO', 
                        attendance: { $push: '$$ROOT' } 
                    }
                }
            ]);
            console.log("=========employeeData",employeeData)
            if (employeeData.length > 0) {
                await processAndSyncAttendance(employeeData, startDate, endDate);
            } else {
                await createEmptyAttendanceEntry(employee, startDate, endDate);
            }
        }
    } catch (error) {
        console.error('Error processing attendance for all employees:', error);
    }
}

async function createEmptyAttendanceEntry(employee, startDate, endDate) {
    try {
        //const LVDT = moment().toDate();
        const today = moment();
        const yesterday = today.clone().subtract(1, 'day');
        const yesterdayDate = yesterday.toDate();
        const LVDT = yesterdayDate;
        console.log("=======employee",employee)
        const empNo = employee.ECODE;
        const BRCODE = employee.BRCODE;
        const EMPNAME = employee.ENAME;
        // Check if an entry already exists for the employee and date range
        const existingAttendanceMaster = await LeaveAttendanceMaster.findOne({
            LVDT: { $gte: startDate, $lte: endDate },
            EMPNO: empNo
        });

        if (existingAttendanceMaster) {
            console.log(`Attendance entry already exists for employee ${empNo} for the date range.`);
            return;
        }

        const newAttendanceMaster = new LeaveAttendanceMaster({
            LVAPNO: 99999999,
            LVYR: moment(LVDT).format('YYYY'),
            LVDT,
            EMPNO: empNo,
            EMPNAME,
            BRCODE,
            ISESLVCODE: 'AB',
            IISESLVCODE: 'AB',
            LVCODE: "LOP",
            ENTRYBY: '',
            ENTRYDT: LVDT,
            MODBY: '',
            MODDT: LVDT,
            SOURCE: 'JLSMART-AUTOLOGOUT',
            TYPE: 'ATTENDANCE'
        });
        await newAttendanceMaster.save();
    } catch (error) {
        console.error('Error creating empty attendance entry:', error);
    }
}

// Modify the router endpoint to call the new function
router.get('/sync-attendance-to-master-table', async (req, res) => {
    try {
        const today = new Date();
        // const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0); 
        // const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        const startDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0); 
        const endDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59);
        
        await processAndSyncAttendanceForAll(startDate, endDate);
        
        return res.status(200).json({ Status: 'Success', Message: 'Attendance synchronized successfully for all employees', Code: 200 });
    } catch (error) {
        console.error('Error syncing attendance for all employees:', error);
        return res.status(500).json({ Status: 'Failed', Message: 'Internal Server Error', Data: {}, Code: 500 });
    }
});


// router.get('/sync-attendance-to-master-table', async (req, res) => {
//     try {
//         const today = new Date();
//         const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0); 
//         const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
        
//         // const yesterday = new Date(today);
//         // yesterday.setDate(today.getDate() - 1);
//         // const startDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0); 
//         // const endDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59);

//         const attendanceRecords = await EmployeeAttendance.aggregate([
//         {
//             $match: {
//                 LVDT: { $gte: startDate, $lte: endDate }
//             }
//         },
//         {
//             $group: {
//             _id: '$EMPNO', 
//             attendance: { $push: '$$ROOT' } 
//             }
//         }
//         ]);  
//         console.log("===========attendanceRecords",attendanceRecords)        
//         await processAndSyncAttendance(attendanceRecords, startDate, endDate);
//         return res.status(200).json({ Status: 'Success', Message: 'Current date attendance retrieved and synchronized successfully (grouped by EMPNO)', Data: attendanceRecords, Code: 200 });
//     } catch (error) {
//         console.error('Error syncing attendance:', error);
//         return res.status(500).json({ Status: 'Failed', Message: 'Internal Server Error', Data: {}, Code: 500 });
//     }
// });

router.get('/sync-holidays', async (req, res) => {
    try {
        const query = 'SELECT * FROM PA_HOLDAY_VW WHERE HLDYYR IN (:year2)';
        const bindParams = { year2: 2024 };
        const result = await executeOracleQuery(query, bindParams);


        const holidays = result.rows.map(row => {
            const holidayData = {};
            result.metaData.forEach((meta, index) => {
                holidayData[meta.name] = row[index];
            });
            return holidayData;
        });

        await Holiday.deleteMany({}); 
        await Holiday.insertMany(holidays); 

        res.json({ message: 'Holidays synced successfully.' , holidays: holidays});
    } catch (error) {
        console.error('Error syncing holidays:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});



//CRON FOR ATTENDANCE & LEAVE DATA TO ORACLE SYNC

router.get('/sync-leave-attendance-oracle', async (req, res) => {
    try {
        const currentDate = moment().format('YYYY-MM-DD');
        const leaveAttendanceRecords = await LeaveAttendanceMaster.find({ LVDT: currentDate });
        const queries = [];
        const bindParamsList = [];
        leaveAttendanceRecords.forEach(record => {
            const bindParams = {
                JLS_PA_ELVTD_LVYR: record.LVYR,
                JLS_PA_ELVTD_EMPNO: record.EMPNO,
                JLS_PA_ELVTD_LVDT: moment(record.LVDT).format('YYYY-MM-DD'), // Format date for Oracle
                JLS_PA_ELVTD_ISESLVCODE: record.ISESLVCODE,
                JLS_PA_ELVTD_IISESLVCODE: record.IISESLVCODE,
                JLS_PA_ELVTD_BRCODE: record.BRCODE,
                JLS_PA_ELVTD_REASON: record.REASON,
                JLS_PA_ELVTD_ENTRYBY: record.ENTRYBY,
                JLS_PA_ELVTD_ENTRYDT: moment(record.ENTRYDT).format('YYYY-MM-DD HH:mm:ss'), // Format datetime for Oracle
                JLS_PA_ELVTD_MODBY: record.MODBY,
                JLS_PA_ELVTD_MODDT: moment(record.MODDT).format('YYYY-MM-DD HH:mm:ss'), // Format datetime for Oracle
                JLS_PA_ELVTD_LVSANCBY: record.LVSANCBY,
                JLS_PA_ELVTD_LVSANCDT: moment(record.LVSANCDT).format('YYYY-MM-DD HH:mm:ss'), // Format datetime for Oracle
                JLS_PA_ELVTD_STATUS: record.STATUS,
                JLS_PA_ELVTD_SOURCE: record.SOURCE
            };

            const query = "INSERT INTO JLS_PA_LVATTAVD_TRNDTL (JLS_PA_ELVTD_LVYR, JLS_PA_ELVTD_EMPNO, JLS_PA_ELVTD_LVDT, JLS_PA_ELVTD_ISESLVCODE, JLS_PA_ELVTD_IISESLVCODE, JLS_PA_ELVTD_BRCODE, JLS_PA_ELVTD_REASON, JLS_PA_ELVTD_ENTRYBY, JLS_PA_ELVTD_ENTRYDT, JLS_PA_ELVTD_MODBY, JLS_PA_ELVTD_MODDT, JLS_PA_ELVTD_LVSANCBY, JLS_PA_ELVTD_LVSANCDT, JLS_PA_ELVTD_STATUS, JLS_PA_ELVTD_SOURCE) VALUES (:JLS_PA_ELVTD_LVYR, :JLS_PA_ELVTD_EMPNO, :JLS_PA_ELVTD_LVDT, :JLS_PA_ELVTD_ISESLVCODE, :JLS_PA_ELVTD_IISESLVCODE, :JLS_PA_ELVTD_BRCODE, :JLS_PA_ELVTD_REASON, :JLS_PA_ELVTD_ENTRYBY, :JLS_PA_ELVTD_ENTRYDT, :JLS_PA_ELVTD_MODBY, :JLS_PA_ELVTD_MODDT, :JLS_PA_ELVTD_LVSANCBY, :JLS_PA_ELVTD_LVSANCDT, :JLS_PA_ELVTD_STATUS, :JLS_PA_ELVTD_SOURCE)";
            
            queries.push(query);
            bindParamsList.push(bindParams);
        });
        await executeOracleQueryWithTransaction(queries, bindParamsList);
        return res.status(200).json({ Status: 'Success', Message: 'Leave attendance data synced to Oracle successfully', Code: 200 });
    } catch (error) {
        console.error('Error syncing leave attendance data to Oracle:', error);
        return res.status(500).json({ Status: 'Failed', Message: 'Internal Server Error', Data: {}, Code: 500 });
    }
});


router.get('/update-employee-block-status', async (req, res) => {
    try {
        // Get the current date
        const today = moment().toDate();

        // Calculate the start and end dates for the last two days
        const endDate = moment(today).subtract(1, 'days').toDate();
        const startDate = moment(endDate).subtract(1, 'days').toDate();

        // Find employees with LOP status for the last two days
        const employeesWithLOP = await LeaveAttendanceMaster.aggregate([
            {
                $match: {
                    LVDT: { $gte: startDate, $lte: endDate },
                    $or: [
                        { ISESLVCODE: 'LOP' },
                        { IISESLVCODE: 'LOP' }
                    ]
                }
            },
            {
                $group: {
                    _id: '$EMPNO',
                    count: { $sum: 1 }
                }
            },
            {
                $match: {
                    count: { $gte: 2 } // Find employees with LOP status for both days
                }
            }
        ]);

        // Update BLOCKSTATUS to true for employees with LOP for the last two days
        const employeeIdsToUpdate = employeesWithLOP.map(employee => employee._id);
        if(employeeIdsToUpdate){
            await EmployeeMaster.updateMany({ ECODE: { $in: employeeIdsToUpdate } }, { BLOCKSTATUS: true });
        }

        return res.status(200).json({
            Status: 'Success',
            Message: 'Employee BLOCKSTATUS updated successfully for employees with LOP status for the last two days.',
            Data: employeeIdsToUpdate,
            Code: 200
        });
    } catch (error) {
        console.error('Error updating employee BLOCKSTATUS:', error);
        return res.status(500).json({ Status: 'Failed', Message: 'Internal Server Error', Code: 500 });
    }
});




module.exports = router;
  
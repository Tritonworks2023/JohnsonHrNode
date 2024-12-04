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
const { executeOracleQuery, executeOracleQueryWithTransaction } = require('../../config/oracle'); 
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
const Permission = require('../../models/permissionModel');
const CompensatoryOff = require('../../models/compensatoryOffModel');
const EmployeeTracking = require('../../models/employeeTrackingModel');

const gradeOrder = [
    'E8', 'E7', 'E6', 'E5', 'E4', 'E3', 
    'ES2', 'ES1', 
    'TE2', 'TE1', 
    'S1', 'S2', 'S3', 'S4', 'S5', 'S6'
];  
const getGradeIndex = (grade) => {
    const index = gradeOrder.indexOf(grade);
    return index !== -1 ? index : gradeOrder.length; 
};


router.get('/sync-employees', async (req, res) => {
    try {
        const query = "SELECT * FROM PA_ALLEMP_VW WHERE STATUS = 'A' ";
        const bindParams = {};
        //const query = "SELECT * FROM (SELECT * FROM PA_ALLEMP_VW WHERE STATUS = 'A' AND BRCODE = 'TN01' ) WHERE ROWNUM <= 100";
        // const fiveDaysAgo = new Date();
        // fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 2);
        // const query = `SELECT * FROM PA_ALLEMP_VW WHERE CREATEDDATE >= :fiveDaysAgo`;
        // const bindParams = { fiveDaysAgo: new Date(fiveDaysAgo) };
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
                    LOCCODE: record.LOCCODE,
                    SHIFTGRP: record.SHIFTGRP,
                    STATUS: record.STATUS,
                    REPMGR: record.APPMGR,
                    APPMGR: record.REPMGR,
                  } 
                });
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
                        APPMGR: record.REPMGR,
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
            if (employee.APPMGR && employee.APPMGR !== null) {
                await EmployeeMaster.updateOne({ ECODE: employee.APPMGR }, { APPMGRSTATUS: 'YES' });
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
            const { REPMGR, APPMGR } = employee;

            // Update REPMGRNAME if REPMGR exists
            if (REPMGR && REPMGR !== undefined) {
                const repMgrEmployee = await EmployeeMaster.findOne({ EMPNO: REPMGR });
                const repMgrName = repMgrEmployee ? repMgrEmployee.ENAME : '';
                employee.REPMGRNAME = repMgrName;
                console.log("======repMgrName===", repMgrName);
            }

            // Update APPMGRNAME if APPMGR exists
            if (APPMGR && APPMGR !== undefined) {
                const appMgrEmployee = await EmployeeMaster.findOne({ EMPNO: APPMGR });
                const appMgrName = appMgrEmployee ? appMgrEmployee.ENAME : '';
                employee.APPMGRNAME = appMgrName;
                console.log("======appMgrName===", appMgrName);
            }

            // Save the updated employee
            await employee.save();
            console.log("======employee===", employee);
        }

        return res.status(200).json({ Status: 'Success', Message: 'Manager names updated successfully', Code: 200 });
    } catch (error) {
        console.error('Error updating manager names:', error);
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
            const activeEmployee = await EmployeeMaster.findOne({ EMPNO: PA_ELSTD_EMPNO }).select('_id GRADE DEPT EMPNO ENAME BRCODE');
            // Check if the leave entry already exists
            console.log("========activeEmployee",activeEmployee);
            if(activeEmployee){
                let ENAME = activeEmployee.ENAME;
                let BRCODE = activeEmployee.BRCODE;
                let EMPID = activeEmployee._id;
                let GRADE = activeEmployee.GRADE;
                let DEPT = activeEmployee.DEPT;
                const existingLeave = await BalanceLeave.findOne({ PA_ELSTD_EMPNO, PA_ELSTD_LVCODE, PA_ELSTD_LVYR });

                if (existingLeave) {
                    existingLeave.PA_ELSTD_ENAME = ENAME;
                    existingLeave.EMPID = EMPID;
                    existingLeave.GRADE = GRADE;
                    existingLeave.DEPT = DEPT;
                    existingLeave.PA_ELSTD_BRCODE = BRCODE;
                    existingLeave.PA_ELSTD_AVD = PA_ELSTD_AVD;
                    existingLeave.PA_ELSTD_BAL = PA_ELSTD_BAL;
                    await existingLeave.save();
                } else {
                    // If the leave entry doesn't exist, create a new one
                    const newLeave = new BalanceLeave({
                        PA_ELSTD_ENAME:ENAME,
                        EMPID,
                        GRADE,
                        DEPT,
                        PA_ELSTD_BRCODE:BRCODE,
                        PA_ELSTD_EMPNO,
                        PA_ELSTD_LVYR,
                        PA_ELSTD_LVCODE,
                        PA_ELSTD_AVD,
                        PA_ELSTD_BAL
                    });
                    await newLeave.save();
                }
            }
        }

        res.json({ message: 'Balance leaves synced successfully.' });
    } catch (error) {
        console.error('Error syncing balance leaves:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// router.get('/sync-leaves-to-master-table', async (req, res) => {
//     try {
//         const startOfToday = moment().startOf('day');
//         const endOfToday = moment().endOf('day');
//         const leaveDetails = await LeaveDetail.find({
//             $and: [
//                 { STATUS: 'APPROVED' },
//                 { TYPE: 'LEAVE' },
//                 { LVSANCDT: { $gte: startOfToday.toDate(), $lte: endOfToday.toDate() } }
//             ] 
//         });
//         console.log("=============leaveDetails",leaveDetails);
//         console.log("=============startOfToday",startOfToday);
//         console.log("=============endOfToday",endOfToday);
//         const leaveAttendanceRecords = [];
//         for (const leave of leaveDetails) {
//             const { LVFRMDT, LVTODT, LVYR, LVCODE, EMPNO, BRCODE, ISESLVCODE, IISESLVCODE, REASON, ENTRYBY, TYPE } = leave;
//             const leaveDays = Math.floor((LVTODT - LVFRMDT) / (1000 * 60 * 60 * 24)) + 1;
//             for (let i = 0; i < leaveDays; i++) {
//                 const LVDT = new Date(LVFRMDT);
//                 LVDT.setDate(LVDT.getDate() + i);

//                 const leaveAttendanceRecord = {
//                     LVAPNO: leave.LVAPNO,
//                     LVYR,
//                     LVCODE,
//                     LVDT,
//                     EMPNO,
//                     BRCODE,
//                     ISESLVCODE,
//                     IISESLVCODE,
//                     REASON,
//                     STATUS: leave.STATUS,
//                     SOURCE: leave.SOURCE,
//                     ENTRYBY,
//                     ENTRYDT: leave.ENTRYDT,
//                     MODBY: leave.MODBY,
//                     MODDT: leave.MODDT,
//                     LVSANCBY: leave.LVSANCBY,
//                     LVSANCDT: leave.LVSANCDT,
//                     TYPE
//                 };
//                 leaveAttendanceRecords.push(leaveAttendanceRecord);
//             }
//         }
//         await LeaveAttendanceMaster.insertMany(leaveAttendanceRecords);
//         return res.status(200).json({ Status: 'Success', Message: 'Leave details synced successfully', Code: 200 });
//     } catch (error) {
//         console.error('Error syncing leaves:', error);
//         return res.status(500).json({ Status: 'Failed', Message: 'Internal Server Error', Code: 500 });
//     }
// });


  // Function to Calculate Attendance Code (Reusable)
function calculateCode(time, referenceTime) {
    const gracePeriodMinutes = 5; // Adjust as needed
    const gracePeriod = moment.duration(gracePeriodMinutes, 'minutes');

    const beforeStart = time.isBefore(referenceTime.add(gracePeriod));
    const afterEnd = time.isAfter(referenceTime.subtract(gracePeriod));
    return beforeStart || afterEnd ? 'PT' : 'AB';
}


router.get('/sync-leaves-to-master-table', async (req, res) => {
    try {
        const startOfToday = moment().startOf('day');
        const endOfToday = moment().endOf('day');
        const leaveDetails = await LeaveDetail.find({
            $and: [
                { STATUS: 'APPROVED' },
                { LVSANCDT: { $gte: startOfToday.toDate(), $lte: endOfToday.toDate() } }
            ] 
        });
        console.log("=============leaveDetails",leaveDetails);
        console.log("=============startOfToday",startOfToday);
        console.log("=============endOfToday",endOfToday);
        for (const leave of leaveDetails) {
            const { LVFRMDT, LVTODT, LVYR, LVCODE, EMPNO, BRCODE, ISESLVCODE, IISESLVCODE, REASON, ENTRYBY, TYPE } = leave;
            const employeeDetails = await EmployeeMaster.findOne({ ECODE:EMPNO }, '_id ENAME');
            const leaveDays = Math.floor((LVTODT - LVFRMDT) / (1000 * 60 * 60 * 24)) + 1;
            
            let EMPID = (leave.EMPID && leave.EMPID != undefined) ? leave.EMPID :  employeeDetails._id;
            let GRADE = leave.GRADE;
            let DEPT = leave.DEPT;

            // Find or create LeaveAttendanceMaster for the employee
            let leaveAttendanceMaster = await LeaveAttendanceMaster.findOne({ EMPNO, BRCODE });
            if (!leaveAttendanceMaster) {
                leaveAttendanceMaster = new LeaveAttendanceMaster({ EMPNO, BRCODE, EMPID , DEPT, GRADE });
            }
            
            for (let i = 0; i < leaveDays; i++) {
                const LVDT = new Date(LVFRMDT);
                LVDT.setDate(LVDT.getDate() + i);

                // Check if an attendance record for this day already exists
                const existingRecordIndex = leaveAttendanceMaster.attendanceRecords.findIndex(record => record.LVDT.getTime() === LVDT.getTime());
                if (existingRecordIndex === -1) {
                    const leaveAttendanceRecord = {
                        LVAPNO: leave.LVAPNO,
                        LVYR,
                        LVCODE,
                        LVDT,
                        EMPNAME: employeeDetails.ENAME,
                        EMPNO,
                        BRCODE,
                        ISESLVCODE: ISESLVCODE ? ISESLVCODE : LVCODE,
                        IISESLVCODE: IISESLVCODE ? IISESLVCODE : LVCODE,
                        ISESREASON: REASON,
                        IISESREASON: REASON,
                        SOURCE: leave.SOURCE,
                        ENTRYBY,
                        ENTRYDT: leave.ENTRYDT,
                        MODBY: leave.MODBY,
                        MODDT: leave.MODDT,
                        LVSANCBY: leave.LVSANCBY,
                        LVSANCDT: leave.LVSANCDT,
                        TYPE
                    };
                    leaveAttendanceMaster.attendanceRecords.push(leaveAttendanceRecord);
                }
            }
            await leaveAttendanceMaster.save();
        }
        return res.status(200).json({ Status: 'Success', Message: 'Leave details synced successfully', Code: 200 });
    } catch (error) {
        console.error('Error syncing leaves:', error);
        return res.status(500).json({ Status: 'Failed', Message: 'Internal Server Error', Code: 500 });
    }
});

async function checkPermission(empNo, brcode, permissionDate, fromTime, toTime) {
    try {
        const utcPermissionDate = moment(permissionDate, 'DD-MM-YYYY').startOf('day').toDate();
        console.log("===permissionDate",utcPermissionDate)
        console.log("===fromTime",fromTime);
        console.log("===toTime",toTime);
        const permission = await Permission.findOne({
            EMPNO: empNo,
            BRCODE: brcode,
            STATUS: 'APPROVED',
            PERMISSIONDATE: utcPermissionDate, 
            FROMTIME: { $lte: toTime }, 
            TOTIME: { $gte: fromTime } 
        });
        console.log("========permission",permission);
        return permission ? true : false; 
    } catch (error) {
      console.error('Error checking permission:', error);
      return false; // Return false on error (consider alternative error handling as needed)
    }
}

function calculateTotalWorkingHours(attendance) {
    let totalWorkingHours = 0;
    const checkinTimes = attendance.filter(record => record.CHECKINTIME).map(record => moment(record.CHECKINTIME, 'HH:mm:ss'));
    const checkoutTimes = attendance.filter(record => record.CHECKOUTTIME).map(record => moment(record.CHECKOUTTIME, 'HH:mm:ss'));
    if (checkinTimes.length > 0 && checkoutTimes.length > 0) {
        const earliestCheckin = moment.min(checkinTimes);
        const latestCheckout = moment.max(checkoutTimes);
        // console.log("======earliestCheckin", earliestCheckin);
        // console.log("======latestCheckout", latestCheckout);
        const duration = moment.duration(latestCheckout.diff(earliestCheckin));
        //console.log("======duration", duration);
        totalWorkingHours = duration.asHours();
    }
    totalWorkingHours = totalWorkingHours.toFixed(2);
    return totalWorkingHours;
}


// Function to calculate distance between two points using Haversine formula
function calculateDistance(point1, point2) {
    const earthRadius = 6371; // Earth's radius in km
    const { LATITUDE: lat1, LONGITUDE: lon1 } = point1;
    const { LATITUDE: lat2, LONGITUDE: lon2 } = point2;

    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = earthRadius * c;

    return distance;
}


async function calculateTotalKM(LVDT, EMPNO) {
    const currentDate = moment(LVDT).startOf("day").toDate();
    const endDate = moment(LVDT).endOf("day").toDate();
    let totalDistance = 0;
    const existingEmployee = await EmployeeMaster.findOne({ ECODE: EMPNO }).select('LOCCODE ENAME');
    if(existingEmployee && existingEmployee.LOCCODE == "FIELD"){
        const trackingRecords = await EmployeeTracking.find({ EMPNO: EMPNO, DATE: { $gte: currentDate, $lte: endDate } }).sort({ DATE: 1 });
        //console.log("========trackingRecords",trackingRecords);
        for (let i = 0; i < trackingRecords.length - 1; i++) {
            const currentRecord = trackingRecords[i];
            const nextRecord = trackingRecords[i + 1];
            const distance = calculateDistance(currentRecord, nextRecord);
            totalDistance += distance;
        }
        totalDistance = totalDistance.toFixed(2);
    }
    return totalDistance;
}

async function determineLeaveCodes(attendance, firstCheckin, lastCheckout, totalWorkingHours, checkinBeforeStart, checkoutAfterEnd, hasCheckinPermission, hasCheckoutPermission) {
    
    let ISESLVCODE = checkinBeforeStart ? 'PT' : 'AB';
    let IISESLVCODE = checkoutAfterEnd ? 'PT' : 'AB';
    console.log("=====checkinBeforeStart",checkinBeforeStart);
    
    if(lastCheckout && lastCheckout!=undefined) {
        if (firstCheckin.CHECKINTIME && lastCheckout.CHECKOUTTIME) {
            if (totalWorkingHours < 8) {
                if (firstCheckin.CHECKINTIME && checkinBeforeStart == false) {
                    ISESLVCODE = 'AB';
                } else if (lastCheckout.CHECKOUTTIME && checkoutAfterEnd == false) {
                    IISESLVCODE = 'AB';
                }
            }
        }
    }

    // LUNCH BREAK
    let startLunchTime = null;
    let startEntryDt = null;
    let endLunchTime = null;
    //console.log("=======attendance",attendance);

    if (firstCheckin) {
        const lunchCheckout = attendance.find(record => record.REASON == 'LUNCH BREAK' && record.CHECKOUTTIME);
        console.log("=======lunchCheckout",lunchCheckout);
        if (lunchCheckout) {
            startLunchTime = moment(lunchCheckout.CHECKOUTTIME, 'HH:mm:ss');
        }

        if (startLunchTime) {
            const sortedAttendance = attendance.sort((a, b) => moment(b.ENTRYDT).diff(moment(a.ENTRYDT))); 
            const lunchBreakIndex = sortedAttendance.findIndex(record => record.REASON === "LUNCH BREAK");
            const subsequentRecord = sortedAttendance[lunchBreakIndex - 1];
            //console.log("=======sortedAttendance",sortedAttendance);
           // console.log("=======lunchBreakIndex",lunchBreakIndex);
            //console.log("=======subsequentRecord",subsequentRecord);
            if (subsequentRecord) {
                endLunchTime = moment(subsequentRecord.CHECKINTIME, 'HH:mm:ss');
            }
        }
        console.log("===endLunchTime====",endLunchTime);
        console.log("===startLunchTime====",startLunchTime);
        if (endLunchTime && startLunchTime && endLunchTime.isAfter(startLunchTime)) {
            const lunchBreakDuration = moment.duration(endLunchTime.diff(startLunchTime));
            console.log("===lunchBreakDuration====",lunchBreakDuration.asMinutes());
            if (lunchBreakDuration.asMinutes() > 30) {
                IISESLVCODE = 'AB';
            }
        }
    }

    if (ISESLVCODE === 'AB') {
        if (hasCheckinPermission) {
            ISESLVCODE = 'PT';
        }
    }
    if (IISESLVCODE === 'AB') {
        if (hasCheckoutPermission) {
            IISESLVCODE = 'PT';
        }
    }

    
    console.log("===ISESLVCODE====",ISESLVCODE);
    console.log("===IISESLVCODE====",IISESLVCODE);
    console.log("===hasCheckinPermission====",hasCheckinPermission);
    console.log("===hasCheckoutPermission====",hasCheckoutPermission);

    return { ISESLVCODE, IISESLVCODE };
}


async function createCompensatoryOffEntry(employeeData, date, compOffHours, lastCheckout) {
    const { EMPNO, BRCODE } = employeeData;
    const entryDate = moment(date); 
    const validUntil = moment(entryDate).add(90, 'days');
    const existingEmployee = await EmployeeMaster.findOne({ ECODE: EMPNO }).select('_id GRADE DEPT REPMGR ENAME');
    const employeeGrade = existingEmployee.GRADE
    const isGradeE3OrBelow = (getGradeIndex(employeeGrade) >= getGradeIndex('E3'));
    if(isGradeE3OrBelow){
        const compensatoryOffEntry = new CompensatoryOff({
            EMPNO,
            EMPID : existingEmployee._id,
            GRADE : existingEmployee.GRADE,
            DEPT : existingEmployee.DEPT,
            EMPNAME: existingEmployee.ENAME,
            BRCODE,
            COMPOFFHOURS: compOffHours,
            APPROVER: existingEmployee.REPMGR,
            CHECKINTIME: employeeData.CHECKINTIME,
            CHECKOUTTIME: lastCheckout.CHECKOUTTIME,
            ENTRYDATE: entryDate.toDate(), 
            VALIDUNTIL: validUntil.toDate(), 
        });
        await compensatoryOffEntry.save();
    }
}

async function calculateExtraHours(attendance, totalWorkingHours, branchEndTime, isHoliday) {
    let extraHours = 0;
    if (totalWorkingHours > 8) {
        extraHours = totalWorkingHours - 8;
        if (isHoliday) {
            extraHours = totalWorkingHours;
        } else {
            const branchEnd = moment(branchEndTime, 'HH:mm:ss');
            console.log("========branchEnd",branchEnd);
            const latestCheckout = moment.max(attendance.filter(record => record.CHECKOUTTIME).map(record => moment(record.CHECKOUTTIME, 'HH:mm:ss')));
            console.log("========latestCheckout",latestCheckout);
            console.log("========isAfter",latestCheckout.isAfter(branchEnd));
            if (latestCheckout.isAfter(branchEnd)) {
                console.log("=====extraHours===latestCheckout",moment.duration(latestCheckout.diff(branchEnd)).asHours());
                extraHours = moment.duration(latestCheckout.diff(branchEnd)).asHours();
            }
        }
    }
    console.log("========extraHours",extraHours);
    return extraHours;
}

async function isHolidayDate(date,brcode,year) {
    const holiday = await Holiday.findOne({ HLDYDT: date, BRCODE: brcode, HLDYYR : year });
    //console.log("========holiday",holiday);
    return holiday;
}

async function processAndSyncAttendance(employeeDetails, attendanceData, date) {
    for (const employeeData of attendanceData) {
        const { attendance } = employeeData;

        const currentDate = moment(date).startOf('day'); 
        const LVDT = currentDate.toDate();
        console.log("=======currentDate",currentDate);
        console.log("=======LVDT",LVDT);
        const firstCheckin = attendance
            .filter(record => record.CHECKINTIME) 
            .sort((a, b) => new Date(a.ENTRYDT) - new Date(b.ENTRYDT)) 
            .shift(); 
        //console.log("=======firstCheckin",firstCheckin);
        const lastCheckout = attendance
            .filter(record => record.CHECKOUTTIME) // Filter out records without checkout time
            .sort((a, b) => new Date(b.ENTRYDT) - new Date(a.ENTRYDT)) // Sort by ENTRYDT in descending order
            [0];
        //console.log("=======lastCheckout",lastCheckout);

        try {
            if(firstCheckin){
                const { EMPNO, BRCODE, EMPNAME, BRSTARTTIME, BRENDTIME, EMPID, GRADE, DEPT } = firstCheckin;

                const branchRecord = await BranchMaster.findOne({ BRCODE });
                if (!branchRecord) {
                    //console.log(`Branch with BRCODE ${BRCODE} does not exist. Skipping synchronization.`);
                    return;
                }

                let brStart, brEnd;
                if(BRSTARTTIME && BRENDTIME){
                    brStart = BRSTARTTIME;
                    brEnd = BRENDTIME;
                } else {
                    brStart = branchRecord.BRSTARTTIME;
                    brEnd = branchRecord.BRENDTIME;
                }
                const branchStartTime = moment(brStart, 'HH:mm');
                const branchEndTime = moment(brEnd, 'HH:mm');

                let gracePeriodMinutes = 5;
                if (['TN01', 'TN11', 'TN13'].includes(branchRecord.BRCODE)) {
                    gracePeriodMinutes = 30;
                }
                const checkinTime = moment(firstCheckin.CHECKINTIME, 'HH:mm:ss');
                let checkinBeforeStart = false;
                let checkoutAfterEnd = false;

                const actualCheckinTime = checkinTime.isBefore(branchStartTime.add(gracePeriodMinutes, 'minutes')) ? branchStartTime.add(gracePeriodMinutes, 'minutes'): checkinTime;
                checkinBeforeStart = checkinTime.isBefore(branchStartTime.add(gracePeriodMinutes, 'minutes'));

                //console.log("======checkinTime",checkinTime);
                //console.log("======branchStartTime",branchStartTime);
                //console.log("======checkinBeforeStart",checkinBeforeStart);
                let hasCheckinPermission = false;
                let hasCheckoutPermission = false;

                if (checkinBeforeStart === false) {
                    hasCheckinPermission = await checkPermission(firstCheckin.EMPNO, firstCheckin.BRCODE, firstCheckin.LVDT, moment(branchStartTime).subtract(gracePeriodMinutes, 'minutes').format('HH:mm:ss'),actualCheckinTime.format('HH:mm:ss'));
                }

                if(lastCheckout){
                    let checkoutTime = moment(lastCheckout.CHECKOUTTIME, 'HH:mm:ss');
                    checkoutAfterEnd = checkoutTime.isAfter(branchEndTime);
                    //console.log("======checkoutTime",checkoutTime);
                    //console.log("======branchEndTime",branchEndTime);
                    //console.log("======checkoutAfterEnd",checkoutAfterEnd);
                    if (checkoutAfterEnd) {
                        hasCheckoutPermission = await checkPermission(
                            lastCheckout.EMPNO,
                            lastCheckout.BRCODE,
                            lastCheckout.LVDT, 
                            branchEndTime.format('HH:mm:ss'), 
                            checkoutTime.format('HH:mm:ss')
                        );
                    }
                }
                const totalWorkingHours = await calculateTotalWorkingHours(attendance);
                //console.log("=====totalWorkingHours",totalWorkingHours);

                const totalKM = await calculateTotalKM(LVDT, EMPNO);
                //console.log("=====totalKM",totalKM);
                
                const holidayDateCheck = moment(date, 'DD-MM-YYYY').toDate();
                const lvYear = holidayDateCheck.getFullYear().toString(); 
                const isHoliday = await isHolidayDate(holidayDateCheck, BRCODE, lvYear );
                
                console.log("=========date",date);
                console.log("=========holidayDateCheck, BRCODE, lvYear ",holidayDateCheck, BRCODE, lvYear );
                console.log("=========isHoliday",isHoliday);
                console.log("=========totalWorkingHours",totalWorkingHours);

                // Check if the employee is eligible for compensatory off
                if (totalWorkingHours > 8) {
                    // let extraHours = totalWorkingHours - 8;
                    // if (isHoliday) {
                    //     extraHours = totalWorkingHours;
                    // }
                    let extraHours = await calculateExtraHours(attendance, totalWorkingHours, branchEndTime, isHoliday);
                    console.log("=====extraHours----finall", extraHours);
                    while (extraHours >= 4) {
                        let compOffHours;
                        if (extraHours >= 8) {
                            compOffHours = 8;
                        } else if (extraHours >= 4) {
                            compOffHours = 4;
                        }
                        await createCompensatoryOffEntry(firstCheckin, date, compOffHours, lastCheckout);
                        extraHours -= compOffHours;
                        //console.log("=====remaining extraHours", extraHours);
                    }
                }
                
                let { ISESLVCODE, IISESLVCODE } = await determineLeaveCodes(attendance, firstCheckin, lastCheckout, totalWorkingHours, checkinBeforeStart, checkoutAfterEnd, hasCheckinPermission, hasCheckoutPermission);
                if(ISESLVCODE === undefined){
                    ISESLVCODE = 'AB'
                }
                if(IISESLVCODE === undefined){
                    IISESLVCODE = 'AB'
                }

                //console.log("===before holiday =check==ISESLVCODE, IISESLVCODE",ISESLVCODE, IISESLVCODE);
                
                if (isHoliday) {
                    ISESLVCODE = isHoliday.HLDYCD;
                    IISESLVCODE = isHoliday.HLDYCD;
                    LVCODE = isHoliday.HLDYCD;
                }

                //console.log("===after holiday==ISESLVCODE, IISESLVCODE",ISESLVCODE, IISESLVCODE);

                let CHECKINTIME = firstCheckin ? firstCheckin.CHECKINTIME : "-";
                let CHECKOUTTIME = lastCheckout ? lastCheckout.CHECKOUTTIME : "-";
                let CHECKINDTTIME = firstCheckin ? firstCheckin.LVDT : null;
                let CHECKOUTDTTIME = lastCheckout ? lastCheckout.LVDT : null;
                const existingAttendanceMaster = await LeaveAttendanceMaster.findOne({ EMPNO, BRCODE });
                //console.log("=========existingAttendanceMaster",existingAttendanceMaster);
                if (existingAttendanceMaster) {
                    const existingRecord = existingAttendanceMaster.attendanceRecords.find(record => moment(record.LVDT).isSame(currentDate, 'day'));
                    if (existingRecord) {
                        //console.log("====existingRecord",existingRecord);
                        if ( (existingRecord.ISESLVCODE =='' || existingRecord.ISESLVCODE ==null) && (firstCheckin) ) { 
                            existingRecord.ISESLVCODE = ISESLVCODE;
                            existingRecord.CHECKINTIME = CHECKINTIME;
                            existingRecord.BRSTARTTIME = brStart;
                            existingRecord.BRENDTIME = brEnd;
                            existingRecord.CHECKINDTTIME = CHECKINDTTIME;
                            existingRecord.ISESREASON = firstCheckin ? firstCheckin.REASON : "";
                            existingRecord.TOTWORKHOURS = totalWorkingHours,
                            existingRecord.TOTOLKM = totalKM,
                            await existingRecord.save();
                        } else if ( (existingRecord.IISESLVCODE =='' || existingRecord.IISESLVCODE ==null) && (lastCheckout) ) { 
                            console.log("====lastCheckout==innnnnnnn");

                            if(lastCheckout.BRSTARTTIME && lastCheckout.BRENDTIME){
                                brStart = lastCheckout.BRSTARTTIME;
                                brEnd = lastCheckout.BRENDTIME;
                            } else {
                                brStart = branchRecord.BRSTARTTIME;
                                brEnd = branchRecord.BRENDTIME;
                            }

                            existingRecord.BRSTARTTIME = brStart;
                            existingRecord.BRENDTIME = brEnd;
                            existingRecord.IISESLVCODE = IISESLVCODE;
                            existingRecord.CHECKOUTTIME = CHECKOUTTIME;
                            existingRecord.CHECKOUTDTTIME = CHECKOUTDTTIME;
                            existingRecord.MODBY = lastCheckout ? lastCheckout.ENTRYBY : "";
                            existingRecord.MODDT = lastCheckout ? lastCheckout.LVDT : "";
                            existingRecord.IISESREASON = lastCheckout ? lastCheckout.REASON : "";
                            existingRecord.TOTWORKHOURS = totalWorkingHours,
                            existingRecord.TOTOLKM = totalKM,
                            //console.log("====lastCheckout=existingRecord=innnnnnnn", existingRecord);
                            await existingAttendanceMaster.save();
                        }
                    } else {
                        existingAttendanceMaster.attendanceRecords.push({
                            LVAPNO: 99999999,
                            LVYR: moment(LVDT).format('YYYY'),
                            LVDT,
                            EMPNO,
                            EMPNAME,
                            BRCODE,
                            BRSTARTTIME: brStart,
                            BRENDTIME: brEnd,
                            ISESLVCODE,
                            IISESLVCODE,
                            ISESREASON: firstCheckin ? firstCheckin.REASON : '',
                            IISESREASON: lastCheckout ? lastCheckout.REASON : '',
                            SOURCE: 'JLSMART',
                            ENTRYBY: firstCheckin ? firstCheckin.ENTRYBY : '',
                            ENTRYDT: firstCheckin ? firstCheckin.ENTRYDT : '',
                            MODBY: lastCheckout ? lastCheckout.ENTRYBY : '',
                            MODDT: lastCheckout ? lastCheckout.LVDT : '',
                            CHECKINTIME,
                            CHECKOUTTIME,
                            CHECKINDTTIME,
                            CHECKOUTDTTIME,
                            TOTWORKHOURS:totalWorkingHours,
                            TOTOLKM:totalKM,
                            TYPE: 'ATTENDANCE'
                        });
                        await existingAttendanceMaster.save();
                    }
                } else {
                    const leaveAttendanceRecord = {
                        LVAPNO: 99999999,
                        LVYR: moment(LVDT).format('YYYY'),
                        LVDT,
                        EMPNO,
                        EMPNAME,
                        BRCODE,
                        BRSTARTTIME: brStart,
                        BRENDTIME: brEnd,
                        ISESLVCODE,
                        IISESLVCODE,
                        ISESREASON: firstCheckin ? firstCheckin.REASON : "",
                        IISESREASON: lastCheckout ? lastCheckout.REASON : "",
                        SOURCE: 'JLSMART',
                        ENTRYBY: firstCheckin ? firstCheckin.ENTRYBY : "",
                        ENTRYDT: firstCheckin ? firstCheckin.ENTRYDT : "",
                        MODBY: lastCheckout ? lastCheckout.ENTRYBY : "",
                        MODDT: lastCheckout ? lastCheckout.LVDT : "",
                        CHECKINTIME,
                        CHECKOUTTIME,
                        CHECKINDTTIME,
                        CHECKOUTDTTIME,
                        TOTWORKHOURS:totalWorkingHours,
                        TOTOLKM:totalKM,
                        TYPE: 'ATTENDANCE'
                    };
                    //console.log("==========leaveAttendanceRecord",leaveAttendanceRecord);
                    const newAttendanceMaster = new LeaveAttendanceMaster({
                        EMPNO,
                        EMPID,
                        GRADE, 
                        DEPT,
                        BRCODE,
                        attendanceRecords: [leaveAttendanceRecord]
                    });
                    await newAttendanceMaster.save();
                }
            } else {
                await createEmptyAttendanceEntry(employeeDetails, date);
            }
        } catch (error) {
            console.error('Error syncing attendance for', LVDT, error);
        }
    }
}


async function createEmptyAttendanceEntry(employee, date) {
    try {
        const currentDate = moment(date).startOf('day'); 
        const LVDT = currentDate.toDate();
        const { ECODE: empNo, BRCODE, ENAME, _id, GRADE, DEPT } = employee;
        
        const holidayDateCheck = moment(date, 'DD-MM-YYYY').toDate();
        const lvYear = holidayDateCheck.getFullYear().toString(); 
        const isHoliday = await isHolidayDate(holidayDateCheck, BRCODE, lvYear )
        console.log("==========ENAME",ENAME);
        console.log("=========isHoliday",isHoliday);

        const branchRecord = await BranchMaster.findOne({ BRCODE });
        if (!branchRecord) {
            console.log(`Branch with BRCODE ${BRCODE} does not exist. Skipping synchronization.`);
            return;
        }

        let ISESLVCODE = 'AB';
        let IISESLVCODE = 'AB';
        let LVCODE = 'LOP';

        if (isHoliday) {
            ISESLVCODE = isHoliday.HLDYCD;
            IISESLVCODE = isHoliday.HLDYCD;
            LVCODE = isHoliday.HLDYCD;
        }

        const existingAttendanceMaster = await LeaveAttendanceMaster.findOne({
            EMPNO: empNo,
            BRCODE,
        });
        if (existingAttendanceMaster) {
            const existingRecord = existingAttendanceMaster.attendanceRecords.find(record => moment(record.LVDT).isSame(currentDate, 'day'));
            //console.log("==========existingRecord",existingRecord);
            if (!existingRecord) {
                existingAttendanceMaster.attendanceRecords.push({
                    LVAPNO: 99999999,
                    LVYR: moment(LVDT).format('YYYY'),
                    LVDT,
                    EMPNO: empNo,
                    EMPNAME: ENAME,
                    BRCODE,
                    BRSTARTTIME: branchRecord.BRSTARTTIME,
                    BRENDTIME: branchRecord.BRENDTIME,
                    ISESLVCODE,
                    IISESLVCODE,
                    LVCODE,
                    ENTRYBY: '',
                    ENTRYDT: LVDT,
                    MODBY: '',
                    MODDT: LVDT,
                    SOURCE: 'JLSMART-AUTOLOGOUT',
                    TYPE: 'ATTENDANCE'
                });
                await existingAttendanceMaster.save();
            }
        } else {
            const newAttendanceMaster = new LeaveAttendanceMaster({
                EMPNO: empNo,
                EMPID: _id,
                GRADE, 
                DEPT,
                BRCODE,
                attendanceRecords: [{
                    LVAPNO: 99999999,
                    LVYR: moment(LVDT).format('YYYY'),
                    LVDT,
                    EMPNO: empNo,
                    EMPNAME: ENAME,
                    BRCODE,
                    BRSTARTTIME: branchRecord.BRSTARTTIME,
                    BRENDTIME: branchRecord.BRENDTIME,
                    ISESLVCODE,
                    IISESLVCODE,
                    LVCODE,
                    ENTRYBY: '',
                    ENTRYDT: LVDT,
                    MODBY: '',
                    MODDT: LVDT,
                    SOURCE: 'JLSMART-AUTOLOGOUT',
                    TYPE: 'ATTENDANCE'
                }]
            });
            await newAttendanceMaster.save();
        }
    } catch (error) {
        console.error('Error creating or updating empty attendance entry:', error);
    }
}

async function processAndSyncAttendanceForAll(startDate, endDate) {
    try {
      console.log("===processAndSyncAttendanceForAll=====startDate,endDate", startDate, endDate);
      const batchSize = 50;
      //const cursor = EmployeeMaster.find({  ECODE: "E8359", STATUS: 'A' }, '_id ECODE GRADE DEPT BRCODE ENAME').cursor({ batchSize });
      const cursor = EmployeeMaster.find({  STATUS: 'A' }, '_id ECODE GRADE DEPT BRCODE ENAME').cursor({ batchSize });
  
      for await (const employee of cursor) {
        const attendanceData = await EmployeeAttendance.aggregate([
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
  
        //console.log("=========attendanceData", attendanceData);
        if (attendanceData.length > 0) {
          await processAndSyncAttendance(employee, attendanceData, startDate);
        } else {
          await createEmptyAttendanceEntry(employee, startDate);
        }
      }
    } catch (error) {
      console.error('Error processing attendance for all employees:', error);
    }
}

// Modify the router endpoint to call the new function
router.post('/sync-attendance-to-master-table', async (req, res) => {
    try {
        let currentDate = moment().startOf('day'); 
        let startDate = currentDate.toDate(); 
        let endDate = moment().endOf('day').toDate(); 
        if(req.body.date && req.body.date!=undefined){
            let requestedDate = moment(req.body.date, "DD-MM-YYYY"); 
            startDate = requestedDate.startOf('day').toDate();
            endDate = requestedDate.endOf('day').toDate();
        }
        console.log("========startDate,endDate",startDate,endDate);
        await processAndSyncAttendanceForAll(startDate,endDate);
        return res.status(200).json({ Status: 'Success', Message: 'Attendance synchronized successfully for all employees', Code: 200 });
    } catch (error) {
        console.error('Error syncing attendance for all employees:', error);
        return res.status(500).json({ Status: 'Failed', Message: 'Internal Server Error', Data: {}, Code: 500 });
    }
});


// router.post('/sync-attendance-to-master-table', async (req, res) => {
//     try {
//         // Set initial startDate to May 1st of the current year
//         let startDate = moment().month(4).date(1).startOf('day'); 
//         // Set endDate to the current date
//         let endDate = moment().endOf('day'); 

//         console.log("========startDate, endDate", startDate.toISOString(), endDate.toISOString());

//         // Loop through each day from startDate to endDate
//         let currentProcessingDate = startDate.clone();
//         let finalProcessingDate = endDate.clone();

//         while (currentProcessingDate.isBefore(finalProcessingDate) || currentProcessingDate.isSame(finalProcessingDate)) {
//             let dayStartDate = currentProcessingDate.startOf('day').toDate();
//             let dayEndDate = currentProcessingDate.endOf('day').toDate();
//             console.log(`Start day: ${dayStartDate.toISOString()} to ${dayEndDate.toISOString()}`);
//             await processAndSyncAttendanceForAll(dayStartDate.toISOString(), dayEndDate.toISOString());
//             console.log(`End day: ${dayStartDate.toISOString()} to ${dayEndDate.toISOString()}`);
//             // Move currentProcessingDate to the next day
//             currentProcessingDate.add(1, 'day');
//         }

//         return res.status(200).json({ Status: 'Success', Message: 'Attendance synchronized successfully for all employees', Code: 200 });
//     } catch (error) {
//         console.error('Error syncing attendance for all employees:', error);
//         return res.status(500).json({ Status: 'Failed', Message: 'Internal Server Error', Data: {}, Code: 500 });
//     }
// });




let isSyncingAttendance = false;
router.post('/sync-attendance-to-master-table-lastday-month', async (req, res) => {
    try {
        if (isSyncingAttendance) {
            return res.status(409).json({ Status: 'Failed', Message: 'Attendance synchronization is already in progress', Code: 409 });
        }
        isSyncingAttendance = true;
        let currentDate = moment().startOf('day');
        let startDate = currentDate.toDate();
        let endDate = moment().endOf('day').toDate();
        if (req.body.date && req.body.date != undefined) {
            let requestedDate = moment(req.body.date, "DD-MM-YYYY");
            startDate = requestedDate.startOf('day').toDate();
            endDate = requestedDate.endOf('day').toDate();
        }

        // Check if the endDate (last day of the month) is a Sunday
        const isSunday = moment(endDate).day() === 0;
        console.log("========isSunday",isSunday);
        // Always sync attendance for the last day of the month
        await processAndSyncAttendanceForAllLastDate(endDate, endDate);
        // If the last day of the month is a Sunday, sync attendance for the day before as well
        if (isSunday) {
            const dayBeforeEndDate = moment(endDate).subtract(1, 'day').toDate();
            if (!isSyncingAttendance) {
                await processAndSyncAttendanceForAllLastDate(dayBeforeEndDate, dayBeforeEndDate);
            }
        }
        isSyncingAttendance = false;
        return res.status(200).json({ Status: 'Success', Message: 'Attendance synchronized successfully for all employees', Code: 200 });
    } catch (error) {
        isSyncingAttendance = false;
        console.error('Error syncing attendance for all employees:', error);
        return res.status(500).json({ Status: 'Failed', Message: 'Internal Server Error', Data: {}, Code: 500 });
    }
});



async function processAndSyncAttendanceForAllLastDate(startDate, endDate) {
    try {
      console.log("===processAndSyncAttendanceForAll=====startDate,endDate", startDate, endDate);
      const batchSize = 50;
      //const cursor = EmployeeMaster.find({}, 'ECODE BRCODE ENAME').cursor({ batchSize });
      const cursor = EmployeeMaster.find({ }, 'ECODE BRCODE ENAME').cursor({ batchSize });
  
      for await (const employee of cursor) {
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
  
        console.log("=========employeeData", employeeData);
        if (employeeData.length > 0) {
          await processAndSyncAttendanceLastDate(employeeData, startDate);
        } else {
          await createEmptyAttendanceEntry(employee, startDate);
        }
      }
    } catch (error) {
      console.error('Error processing attendance for all employees:', error);
    }
}

async function processAndSyncAttendanceLastDate(attendanceData, date) {
    for (const employeeData of attendanceData) {
        const { attendance } = employeeData;

        const currentDate = moment(date).startOf('day'); 
        const LVDT = currentDate.toDate();

        const firstCheckin = attendance.find(record => record.CHECKINTIME);
        const lastCheckout = attendance.filter(record => record.CHECKOUTSTATUS)
            .sort((a, b) => new Date(b.CHECKOUTTIME) - new Date(a.CHECKOUTTIME))
            .pop();

        try {
            const { EMPNO, BRCODE, EMPNAME } = firstCheckin;

            const branchRecord = await BranchMaster.findOne({ BRCODE });
            if (!branchRecord) {
                console.log(`Branch with BRCODE ${BRCODE} does not exist. Skipping synchronization.`);
                return;
            }

            const branchStartTime = moment(branchRecord.BRSTARTTIME, 'HH:mm');
            const branchEndTime = moment(branchRecord.BRENDTIME, 'HH:mm');
            let gracePeriodMinutes = 5;
            if (['TN01', 'TN11', 'TN13'].includes(branchRecord.BRCODE)) {
                gracePeriodMinutes = 30;
            }
            const checkinTime = moment(firstCheckin.CHECKINTIME, 'HH:mm:ss');
            const actualCheckinTime = checkinTime.isBefore(branchStartTime.add(gracePeriodMinutes, 'minutes')) ? branchStartTime.add(gracePeriodMinutes, 'minutes'): checkinTime;
            const checkinBeforeStart = checkinTime.isBefore(branchStartTime.add(gracePeriodMinutes, 'minutes'));

            let hasCheckinPermission = false;

            if (checkinBeforeStart) {
                hasCheckinPermission = await checkPermission(firstCheckin.EMPNO, firstCheckin.BRCODE, firstCheckin.LVDT, moment(branchStartTime).subtract(gracePeriodMinutes, 'minutes').format('HH:mm:ss'),
                    actualCheckinTime.format('HH:mm:ss')
                );
            }

            let ISESLVCODE = checkinBeforeStart ? 'PT' : 'AB';
            let IISESLVCODE = 'PT'; // Default PT for last checkout

            const afternoonStart = moment('12:00', 'HH:mm');
            const afternoonSession = checkinTime.isAfter(afternoonStart);

            if (afternoonSession) {
                ISESLVCODE = 'AB';
                IISESLVCODE = 'AB';
            }

            let CHECKINTIME = firstCheckin ? firstCheckin.CHECKINTIME : "-";
            let CHECKOUTTIME = lastCheckout ? lastCheckout.CHECKOUTTIME : "-";
            let CHECKINDTTIME = firstCheckin ? firstCheckin.LVDT : null;
            let CHECKOUTDTTIME = lastCheckout ? lastCheckout.LVDT : null;

            const existingAttendanceMaster = await LeaveAttendanceMaster.findOne({ EMPNO, BRCODE });

            if (existingAttendanceMaster) {
                const existingRecord = existingAttendanceMaster.attendanceRecords.find(record => moment(record.LVDT).isSame(currentDate, 'day'));
                if (existingRecord) {
                    existingRecord.ISESLVCODE = ISESLVCODE;
                    existingRecord.IISESLVCODE = IISESLVCODE;
                    existingRecord.CHECKINTIME = CHECKINTIME;
                    existingRecord.CHECKOUTTIME = CHECKOUTTIME;
                    existingRecord.CHECKINDTTIME = CHECKINDTTIME;
                    existingRecord.CHECKOUTDTTIME = CHECKOUTDTTIME;
                    existingRecord.MODBY = lastCheckout ? lastCheckout.ENTRYBY : "";
                    existingRecord.MODDT = lastCheckout ? lastCheckout.LVDT : "";
                    existingRecord.ISESREASON = firstCheckin ? firstCheckin.REASON : "";
                    existingRecord.IISESREASON = lastCheckout ? lastCheckout.REASON : "";
                    await existingAttendanceMaster.save();
                } else {
                    existingAttendanceMaster.attendanceRecords.push({
                        LVAPNO: 99999999,
                        LVYR: moment(LVDT).format('YYYY'),
                        LVDT,
                        EMPNO,
                        EMPNAME,
                        BRCODE,
                        ISESLVCODE,
                        IISESLVCODE,
                        ISESREASON: firstCheckin ? firstCheckin.REASON : '',
                        IISESREASON: lastCheckout ? lastCheckout.REASON : '',
                        SOURCE: 'JLSMART',
                        ENTRYBY: firstCheckin ? firstCheckin.ENTRYBY : '',
                        ENTRYDT: firstCheckin ? firstCheckin.ENTRYDT : '',
                        MODBY: lastCheckout ? lastCheckout.ENTRYBY : '',
                        MODDT: lastCheckout ? lastCheckout.LVDT : '',
                        CHECKINTIME,
                        CHECKOUTTIME,
                        CHECKINDTTIME,
                        CHECKOUTDTTIME,
                        TYPE: 'ATTENDANCE'
                    });
                    await existingAttendanceMaster.save();
                }
            } else {
                const leaveAttendanceRecord = {
                    LVAPNO: 99999999,
                    LVYR: moment(LVDT).format('YYYY'),
                    LVDT,
                    EMPNO,
                    EMPNAME,
                    BRCODE,
                    ISESLVCODE,
                    IISESLVCODE,
                    ISESREASON: firstCheckin ? firstCheckin.REASON : "",
                    IISESREASON: lastCheckout ? lastCheckout.REASON : "",
                    SOURCE: 'JLSMART',
                    ENTRYBY: firstCheckin ? firstCheckin.ENTRYBY : "",
                    ENTRYDT: firstCheckin ? firstCheckin.ENTRYDT : "",
                    MODBY: lastCheckout ? lastCheckout.ENTRYBY : "",
                    MODDT: lastCheckout ? lastCheckout.LVDT : "",
                    CHECKINTIME,
                    CHECKOUTTIME,
                    CHECKINDTTIME,
                    CHECKOUTDTTIME,
                    TYPE: 'ATTENDANCE'
                };
                const newAttendanceMaster = new LeaveAttendanceMaster({
                    EMPNO,
                    BRCODE,
                    attendanceRecords: [leaveAttendanceRecord]
                });
                await newAttendanceMaster.save();
            }
        } catch (error) {
            console.error('Error syncing attendance for', LVDT, error);
        }
    }
}


// LEAVE CLUPPING

async function updateLeaveBalance(EMPNO, BRCODE, leaveCode, adjustment) {
    let leaveBalance = await BalanceLeave.findOne({ PA_ELSTD_EMPNO: EMPNO, PA_ELSTD_BRCODE: BRCODE, PA_ELSTD_LVCODE: leaveCode });

    if (!leaveBalance) {
        // Try EL, SL, CL in order
        const priorityCodes = ['EL', 'SL', 'CL'];
        for (let code of priorityCodes) {
            leaveBalance = await BalanceLeave.findOne({ PA_ELSTD_EMPNO: EMPNO, PA_ELSTD_BRCODE: BRCODE, PA_ELSTD_LVCODE: code });
            if (leaveBalance) {
                break;
            }
        }
    }

    if (!leaveBalance) {
        // No leave balance available, set to AB (LOP)
        throw new Error('No leave balance available. Setting to AB (LOP).');
    } else {
        leaveBalance.PA_ELSTD_BAL += adjustment;
        await leaveBalance.save();
    }
}


async function handleLeaveClupping(EMPNO, BRCODE,date ){
    const currentDate = moment(date).startOf('day');
    const previousDay1 = moment(currentDate).subtract(1, 'days').format('YYYY-MM-DD');
    const previousDay2 = moment(currentDate).subtract(2, 'days').format('YYYY-MM-DD');

    const existingAttendanceMaster = await LeaveAttendanceMaster.findOne({ EMPNO, BRCODE });
    if(existingAttendanceMaster){
        const previousDay1Record = existingAttendanceMaster.attendanceRecords.find(
            record => moment(record.LVDT).format('YYYY-MM-DD') === previousDay1
        );

        const previousDay2Record = existingAttendanceMaster.attendanceRecords.find(
            record => moment(record.LVDT).format('YYYY-MM-DD') === previousDay2
        );

        const todayRecord = existingAttendanceMaster.attendanceRecords.find(
            record => moment(record.LVDT).isSame(currentDate, 'day')
        );
        // console.log("========previousDay1Record",previousDay1Record);
        // console.log("========previousDay2Record",previousDay2Record);
        // console.log("========todayRecord",todayRecord);
        
        if (previousDay1Record && previousDay2Record && todayRecord) {
            let needsUpdate = false;

            const scenario = `${previousDay2Record.ISESLVCODE}${previousDay2Record.IISESLVCODE}_${previousDay1Record.ISESLVCODE}${previousDay1Record.IISESLVCODE}_${todayRecord.ISESLVCODE}${todayRecord.IISESLVCODE}`;
            console.log("======scenario",scenario);

            switch (scenario) {
                case 'ABAB_WHWH_ABAB':
                    needsUpdate = true;
                    previousDay1Record.ISESLVCODE = 'AB';
                    previousDay1Record.IISESLVCODE = 'AB';

                    previousDay1Record.REASON = `LEAVE CLUBBING - ${scenario}`;
                    break;
                case 'ABAB_WHWH_ABPT':
                    needsUpdate = true;
                    previousDay1Record.ISESLVCODE = 'AB';
                    previousDay1Record.IISESLVCODE = 'AB';

                    previousDay1Record.REASON = `LEAVE CLUBBING - ${scenario}`;
                    break;
                case 'ABAB_WHWH_CLCL':
                    needsUpdate = true;
                    todayRecord.ISESLVCODE = 'AB';
                    todayRecord.IISESLVCODE = 'AB';
                    previousDay1Record.ISESLVCODE = 'AB';
                    previousDay1Record.IISESLVCODE = 'AB';

                    todayRecord.REASON = `LEAVE CLUBBING - ${scenario}`;
                    previousDay1Record.REASON = `LEAVE CLUBBING - ${scenario}`;

                    await updateLeaveBalance(EMPNO, BRCODE, 'CL', 1);  // Add 1 CL
                    break;
                case 'CLCL_WHWH_ELEL':
                    needsUpdate = true;
                    todayRecord.ISESLVCODE = 'EL';
                    todayRecord.IISESLVCODE = 'EL';
                    previousDay1Record.ISESLVCODE = 'EL';
                    previousDay1Record.IISESLVCODE = 'EL';
                    previousDay2Record.ISESLVCODE = 'EL';
                    previousDay2Record.IISESLVCODE = 'EL';

                    todayRecord.REASON = `LEAVE CLUBBING - ${scenario}`;
                    previousDay1Record.REASON = `LEAVE CLUBBING - ${scenario}`;
                    previousDay2Record.REASON = `LEAVE CLUBBING - ${scenario}`;
                    await updateLeaveBalance(EMPNO, BRCODE, 'CL', 1);  // Subtract 2 CL
                    await updateLeaveBalance(EMPNO, BRCODE, 'EL', -2);   // Add 2 EL
                    break;
                case 'ELEL_WHWH_ABAB':
                    needsUpdate = true;
                    previousDay1Record.ISESLVCODE = 'AB';
                    previousDay1Record.IISESLVCODE = 'AB';

                    previousDay1Record.REASON = `LEAVE CLUBBING - ${scenario}`;
                    break;
                case 'COCO_WHWH_COCO':
                    needsUpdate = true;
                    todayRecord.ISESLVCODE = 'EL';
                    todayRecord.IISESLVCODE = 'EL';
                    previousDay1Record.ISESLVCODE = 'EL';
                    previousDay1Record.IISESLVCODE = 'EL';
                    previousDay2Record.ISESLVCODE = 'EL';
                    previousDay2Record.IISESLVCODE = 'EL';

                    todayRecord.REASON = `LEAVE CLUBBING - ${scenario}`;
                    previousDay1Record.REASON = `LEAVE CLUBBING - ${scenario}`;
                    previousDay2Record.REASON = `LEAVE CLUBBING - ${scenario}`;
                    await updateLeaveBalance(EMPNO, BRCODE, 'EL', -3); 

                    break;
                case 'ELEL_WHWH_ELEL':
                    needsUpdate = true;
                    todayRecord.ISESLVCODE = 'EL';
                    todayRecord.IISESLVCODE = 'EL';
                    previousDay1Record.ISESLVCODE = 'EL';
                    previousDay1Record.IISESLVCODE = 'EL';
                    previousDay2Record.ISESLVCODE = 'EL';
                    previousDay2Record.IISESLVCODE = 'EL';

                    todayRecord.REASON = `LEAVE CLUBBING - ${scenario}`;
                    previousDay1Record.REASON = `LEAVE CLUBBING - ${scenario}`;
                    previousDay2Record.REASON = `LEAVE CLUBBING - ${scenario}`;
                    await updateLeaveBalance(EMPNO, BRCODE, 'EL', -1); 

                    break;
                case 'PTAB_WHWH_PTAB':
                    break;
                case 'ELEL_WHWH_PTCL':
                    break;
                case 'CLCL_WHWH_ABAB':
                    needsUpdate = true;
                    previousDay1Record.ISESLVCODE = 'AB';
                    previousDay1Record.IISESLVCODE = 'AB';

                    previousDay1Record.REASON = `LEAVE CLUBBING - ${scenario}`;
                    break;
                case 'SLSL_WHWH_SLSL':
                    needsUpdate = true;
                    previousDay1Record.ISESLVCODE = 'SL';
                    previousDay1Record.IISESLVCODE = 'SL';

                    previousDay1Record.REASON = `LEAVE CLUBBING - ${scenario}`;
                    await updateLeaveBalance(EMPNO, BRCODE, 'SL', -1); 
                    break;
                case 'SLSL_WHWH_PTCL':
                    break;
                case 'PTEL_WHWH_CLCL':
                    todayRecord.ISESLVCODE = 'AB';
                    todayRecord.IISESLVCODE = 'AB';
                    previousDay1Record.ISESLVCODE = 'EL';
                    previousDay1Record.IISESLVCODE = 'EL';

                    await updateLeaveBalance(EMPNO, BRCODE, 'EL', -1); 
                    await updateLeaveBalance(EMPNO, BRCODE, 'CL', 1); 

                    todayRecord.REASON = `LEAVE CLUBBING - ${scenario}`;
                    previousDay1Record.REASON = `LEAVE CLUBBING - ${scenario}`;
                    break;
                case 'COPT_WHWH_COPT':
                    break;
                case 'ABAB_DHDH_CLCL':
                    needsUpdate = true;
                    todayRecord.ISESLVCODE = 'AB';
                    todayRecord.IISESLVCODE = 'AB';
                    previousDay1Record.ISESLVCODE = 'AB';
                    previousDay1Record.IISESLVCODE = 'AB';

                    todayRecord.REASON = `LEAVE CLUBBING - ${scenario}`;
                    previousDay1Record.REASON = `LEAVE CLUBBING - ${scenario}`;
                    break;
                case 'CLCL_DHDH_ABAB':
                    needsUpdate = true;
                    todayRecord.ISESLVCODE = 'AB';
                    todayRecord.IISESLVCODE = 'AB';
                    previousDay1Record.ISESLVCODE = 'AB';
                    previousDay1Record.IISESLVCODE = 'AB';

                    todayRecord.REASON = `LEAVE CLUBBING - ${scenario}`;
                    previousDay1Record.REASON = `LEAVE CLUBBING - ${scenario}`;

                    break;
                case 'COCO_DHDH_DODO':
                    break;
                case 'ELEL_COCO_ELEL':
                    needsUpdate = true;
                    todayRecord.ISESLVCODE = 'EL';
                    todayRecord.IISESLVCODE = 'EL';
                    previousDay1Record.ISESLVCODE = 'EL';
                    previousDay1Record.IISESLVCODE = 'EL';
                    previousDay2Record.ISESLVCODE = 'EL';
                    previousDay2Record.IISESLVCODE = 'EL';

                    await updateLeaveBalance(EMPNO, BRCODE, 'EL', -1); 

                    todayRecord.REASON = `LEAVE CLUBBING - ${scenario}`;
                    previousDay1Record.REASON = `LEAVE CLUBBING - ${scenario}`;
                    previousDay2Record.REASON = `LEAVE CLUBBING - ${scenario}`;

                    break;
                case 'ABAB_DHDH_DODO':
                    break;
                case 'ELEL_DHDH_DODO':
                    break;
                case 'PTEL_DHDH_PTPT':
                    break;
                case 'ABAB_DHDH_ABAB':
                    needsUpdate = true;
                    todayRecord.ISESLVCODE = 'AB';
                    todayRecord.IISESLVCODE = 'AB';
                    previousDay1Record.ISESLVCODE = 'AB';
                    previousDay1Record.IISESLVCODE = 'AB';
                    previousDay2Record.ISESLVCODE = 'AB';
                    previousDay2Record.IISESLVCODE = 'AB';

                    todayRecord.REASON = `LEAVE CLUBBING - ${scenario}`;
                    previousDay1Record.REASON = `LEAVE CLUBBING - ${scenario}`;
                    previousDay2Record.REASON = `LEAVE CLUBBING - ${scenario}`;

                    break;
                case 'DHDH_ELEL_PTPT':
                    break;
                case 'DHDH_ABAB_ABAB':
                    break;
                case 'DHDH_PTAB_ABAB':
                    break;
                case 'COCO_DHDH_COCO':
                    needsUpdate = true;
                    todayRecord.ISESLVCODE = 'EL';
                    todayRecord.IISESLVCODE = 'EL';
                    previousDay1Record.ISESLVCODE = 'EL';
                    previousDay1Record.IISESLVCODE = 'EL';
                    previousDay2Record.ISESLVCODE = 'EL';
                    previousDay2Record.IISESLVCODE = 'EL';

                    await updateLeaveBalance(EMPNO, BRCODE, 'EL', -3); 

                    todayRecord.REASON = `LEAVE CLUBBING - ${scenario}`;
                    previousDay1Record.REASON = `LEAVE CLUBBING - ${scenario}`;
                    previousDay2Record.REASON = `LEAVE CLUBBING - ${scenario}`;

                    break;
                case 'ABAB_WHDH_COCO':
                    needsUpdate = true;
                    todayRecord.ISESLVCODE = 'AB';
                    todayRecord.IISESLVCODE = 'AB';
                    previousDay1Record.ISESLVCODE = 'AB';
                    previousDay1Record.IISESLVCODE = 'AB';
                    previousDay2Record.ISESLVCODE = 'AB';
                    previousDay2Record.IISESLVCODE = 'AB';

                    todayRecord.REASON = `LEAVE CLUBBING - ${scenario}`;
                    previousDay1Record.REASON = `LEAVE CLUBBING - ${scenario}`;
                    previousDay2Record.REASON = `LEAVE CLUBBING - ${scenario}`;

                    break;
                case 'COCO_WHDH_ABAB':
                    needsUpdate = true;
                    todayRecord.ISESLVCODE = 'AB';
                    todayRecord.IISESLVCODE = 'AB';
                    previousDay1Record.ISESLVCODE = 'AB';
                    previousDay1Record.IISESLVCODE = 'AB';

                    todayRecord.REASON = `LEAVE CLUBBING - ${scenario}`;
                    previousDay1Record.REASON = `LEAVE CLUBBING - ${scenario}`;
                    break;
                case 'SLSL_WHWH_CLCL':
                    console.log('Cannot be applied, SL/EL to be applied');
                    break;
                case 'PTEL_WHWH_ELEL':
                    needsUpdate = true;
                    previousDay1Record.ISESLVCODE = 'EL';
                    previousDay1Record.IISESLVCODE = 'EL';

                    await updateLeaveBalance(EMPNO, BRCODE, 'EL', -1); 
                    previousDay1Record.REASON = `LEAVE CLUBBING - ${scenario}`;
                    break;
                case 'ABPT_WHWH_ABPT':
                    break;
                case 'ELPT_WHWH_PTSL':
                    break;
                case 'SLSL_WHWH_ABAB':
                    needsUpdate = true;
                    todayRecord.ISESLVCODE = 'AB';
                    todayRecord.IISESLVCODE = 'AB';
                    previousDay1Record.ISESLVCODE = 'AB';
                    previousDay1Record.IISESLVCODE = 'AB';

                    todayRecord.REASON = `LEAVE CLUBBING - ${scenario}`;
                    previousDay1Record.REASON = `LEAVE CLUBBING - ${scenario}`;

                    break;
                case 'PTEL_WHWH_PTSL':
                    break;
                case 'PTAB_WHWH_ABPT':
                    needsUpdate = true;
                    previousDay1Record.ISESLVCODE = 'AB';
                    previousDay1Record.IISESLVCODE = 'AB';

                    previousDay1Record.REASON = `LEAVE CLUBBING - ${scenario}`;
                    break;
                case 'PTAB_WHWH_ABAB':
                    needsUpdate = true;
                    previousDay1Record.ISESLVCODE = 'AB';
                    previousDay1Record.IISESLVCODE = 'AB';

                    previousDay1Record.REASON = `LEAVE CLUBBING - ${scenario}`;
                    break;
                case 'PTAB_DHDH_ABPT':
                    needsUpdate = true;
                    previousDay1Record.ISESLVCODE = 'AB';
                    previousDay1Record.IISESLVCODE = 'AB';

                    previousDay1Record.REASON = `LEAVE CLUBBING - ${scenario}`;
                    break;
                case 'PTAB_DHDH_ABAB':
                    needsUpdate = true;
                    previousDay1Record.ISESLVCODE = 'AB';
                    previousDay1Record.IISESLVCODE = 'AB';

                    previousDay1Record.REASON = `LEAVE CLUBBING - ${scenario}`;
                    break;
                default:
                    console.log('Invalid scenario');
                    break;
            }

            console.log("========needsUpdate",needsUpdate);
            // console.log("========previousDay1Record",previousDay1Record);
            // console.log("========previousDay2Record",previousDay2Record);
            // console.log("========todayRecord",todayRecord);
            if (needsUpdate) {
                await existingAttendanceMaster.save();
            }
        } else {
            console.log('Missing attendance records for some days. Update failed.');
        }
    }
      
}

router.post('/sync-clubbing-to-master-table', async (req, res) => {
    try {
        let currentDate = moment().startOf('day'); 
        let startDate = currentDate.toDate(); 
        let endDate = moment().endOf('day').toDate(); 
        if(req.body.date && req.body.date!=undefined){
            let requestedDate = moment(req.body.date, "DD-MM-YYYY"); // Specify format as DD-MM-YYYY
            startDate = requestedDate.startOf('day').toDate();
            endDate = requestedDate.endOf('day').toDate();
        }
        console.log("========startDate,endDate",startDate,endDate);
        console.log("===processAndSyncAttendanceForAll=====startDate,endDate", startDate, endDate);
     
        const batchSize = 50;
        //const cursor = EmployeeMaster.find({ ECODE: "E13702" }, 'ECODE BRCODE ENAME').cursor({ batchSize });
        //const cursor = EmployeeMaster.find({ STATUS: 'A' }, 'ECODE BRCODE ENAME').cursor({ batchSize });
        
        const cursor = EmployeeMaster.find({ STATUS: 'A' }, 'ECODE BRCODE ENAME GRADE').cursor({ batchSize });
        for await (const employee of cursor) {
            const employeeGrade = employee.GRADE
            const isGradeE3OrBelow = (getGradeIndex(employeeGrade) >= getGradeIndex('E3'));
            
            const previousDay1 = moment(startDate).subtract(1, 'days').format('YYYY-MM-DD');
            const holidayDateCheck = moment(previousDay1, 'YYYY-MM-DD').toDate();
            const lvYear = holidayDateCheck.getFullYear().toString(); 
            // console.log("===startDate===",startDate);
            // console.log("===previousDay1===",previousDay1);
            console.log("===holidayDateCheck===",holidayDateCheck);
            // console.log("===lvYear===",lvYear);
            // console.log("===employee.BRCODE===",employee.BRCODE);
            const isHoliday = await isHolidayDate(holidayDateCheck, employee.BRCODE, lvYear );
            console.log("======isHoliday",isHoliday)
            if (isGradeE3OrBelow && isHoliday) {
                await handleLeaveClupping(employee.ECODE, employee.BRCODE, startDate);
            } else {
                console.log("=======Skip for Holiday not exists==============");
            }
        }
        return res.status(200).json({ Status: 'Success', Message: 'Attendance synchronized successfully for all employees', Code: 200 });
    } catch (error) {
        console.error('Error syncing attendance for all employees:', error);
        return res.status(500).json({ Status: 'Failed', Message: 'Internal Server Error', Data: {}, Code: 500 });
    }
});

router.get('/sync-holidays', async (req, res) => {
    try {
        const currentYear = new Date().getFullYear();
        const branches = await BranchMaster.find({}, 'BRCODE').lean(); // Use lean() for faster query
        const branchCodes = branches.map(branch => branch.BRCODE);
        const branchCodesString = branchCodes.map(code => `'${code}'`).join(',');

        const query = `SELECT * FROM PA_HOLDAY_VW WHERE HLDYYR = :year2 AND BRCODE IN (${branchCodesString})`;
        const bindParams = { 
            year2: currentYear
        };
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
        res.json({ message: 'Holidays synced successfully.', holidays: holidays });
    } catch (error) {
        console.error('Error syncing holidays:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


// router.get('/update-employee-block-status', async (req, res) => {
//     try {
//       const twoDaysAgo = moment().subtract(2, 'days').startOf('day').toDate();
//       const oneDayAgo = moment().subtract(1, 'days').endOf('day').toDate(); // End of the day for inclusive range
  
//       // Retrieve all employees
//       const allEmployees = await EmployeeMaster.find({}, { EMPNO: 1 }).lean();
//       const employeeIds = allEmployees.map(employee => employee.EMPNO);
  
//       // Retrieve attendance records for the last two days
//       const attendanceRecords = await EmployeeAttendance.find({
//         LVDT: {
//           $gte: twoDaysAgo,
//           $lte: oneDayAgo
//         }
//       }, { EMPNO: 1 }).lean();
  
//       const attendedEmployeeIds = new Set(attendanceRecords.map(record => record.EMPNO));
  
//       // Find employees without attendance records
//       const employeesWithoutCheckIn = employeeIds.filter(empNo => !attendedEmployeeIds.has(empNo));
  
//       // Update block status in bulk
//       if (employeesWithoutCheckIn.length > 0) {
//         await EmployeeMaster.updateMany(
//           { EMPNO: { $in: employeesWithoutCheckIn } },
//           { $set: { BLOCKSTATUS: true } }
//         );
//       }
  
//       return res.status(200).json({
//         employeesWithoutCheckIn,
//         Status: 'Success',
//         Message: 'Employee block status updated successfully',
//         Code: 200
//       });
//     } catch (error) {
//       console.error('Error updating employee block status:', error);
//       return res.status(500).json({
//         Status: 'Failed',
//         Message: 'Internal Server Error',
//         Code: 500
//       });
//     }
// });


// Function to get the previous working day for a given branch and year
const getPreviousWorkingDay = async (type, date, brcode, year) => {
    let previousDay = moment(date).subtract(1, 'days').startOf('day');
    while (await isHolidayDate(previousDay.toDate(), brcode, year)) {
        if(type == 'end'){
            previousDay = previousDay.subtract(1, 'days').endOf('day');
        } else{
            previousDay = previousDay.subtract(1, 'days').startOf('day');
        }
    }
    return previousDay.toDate();
};

async function hasAppliedLeave(empNo, startDate, endDate) {
    const leave = await LeaveDetail.findOne({
        EMPNO: empNo,
        STATUS: 'APPROVED',
        $or: [
            { LVFRMDT: { $lte: endDate }, LVTODT: { $gte: startDate } },
        ]
    });
    return leave;
}

router.get('/update-employee-block-status', async (req, res) => {
    try {
        // Calculate initial date range
        let twoDaysAgo = moment().subtract(2, 'days').startOf('day').toDate();
        let oneDayAgo = moment().subtract(1, 'days').endOf('day').toDate();
        const currentYear = moment().year();

        console.log("Initial Date Range:", twoDaysAgo, oneDayAgo);

        // Retrieve all employees with their EMPNO and BRCODE
        const allEmployees = await EmployeeMaster.find({ STATUS: 'A' }, { EMPNO: 1, BRCODE: 1 }).lean();
        const employeeIds = allEmployees.map(employee => employee.EMPNO);

        // Map to store attendance records by EMPNO
        const attendedEmployeeIds = new Set();

        // Check each employee's branch-specific holidays and adjust date range if necessary
        for (const employee of allEmployees) {
            const branchCode = employee.BRCODE;

            // Adjust date range if holidays for the employee's branch
            let startDate = twoDaysAgo;
            let endDate = oneDayAgo;
            if (await isHolidayDate(startDate, branchCode, currentYear)) {
                startDate = await getPreviousWorkingDay('start', startDate, branchCode, currentYear);
            }
            if (await isHolidayDate(endDate, branchCode, currentYear)) {
                endDate = await getPreviousWorkingDay('end', endDate, branchCode, currentYear);
            }

            console.log(`Adjusted Date Range for EMPNO ${employee.EMPNO}:`, startDate, endDate);

            // Retrieve attendance records for the adjusted date range
            const attendanceRecords = await EmployeeAttendance.find({
                EMPNO: employee.EMPNO,
                LVDT: {
                    $gte: startDate,
                    $lte: endDate
                }
            }, { EMPNO: 1 }).lean();

            // Add EMPNO to attendedEmployeeIds if attendance records found
            const leaveApplied = await hasAppliedLeave(employee.EMPNO, startDate, endDate);
            console.log("=========leaveApplied",leaveApplied);
            console.log("=========attendanceRecords.length",attendanceRecords.length);
            if (attendanceRecords.length > 0 || leaveApplied) {
                attendedEmployeeIds.add(employee.EMPNO);
            }
        }

        // Find employees without attendance records
        const employeesWithoutCheckIn = employeeIds.filter(empNo => !attendedEmployeeIds.has(empNo));

        // Update block status in bulk
        if (employeesWithoutCheckIn.length > 0) {
            await EmployeeMaster.updateMany(
                { EMPNO: { $in: employeesWithoutCheckIn } },
                { $set: { BLOCKSTATUS: true } }
            );
        }

        return res.status(200).json({
            employeesWithoutCheckIn,
            Status: 'Success',
            Message: 'Employee block status updated successfully',
            Code: 200
        });
    } catch (error) {
        console.error('Error updating employee block status:', error);
        return res.status(500).json({
            Status: 'Failed',
            Message: 'Internal Server Error',
            Code: 500
        });
    }
});



//CRON FOR ATTENDANCE & LEAVE DATA TO ORACLE SYNC

router.post('/sync-leave-attendance-oracle', async (req, res) => {
    try {
        const customDate = req.body.customDate ? moment(req.body.customDate, 'DD-MM-YYYY').startOf('day') : moment().startOf('day');
        const nextDay = customDate.clone().add(1, 'days');

        const batchSize = 100; // Number of records to process in each batch
        let skip = 0;
        let totalRecordsProcessed = 0;

        while (true) {
            const leaveAttendanceRecords = await LeaveAttendanceMaster.find({
                'attendanceRecords.LVDT': {
                    $gte: customDate.toDate(),
                    $lt: nextDay.toDate()
                }
            }).skip(skip).limit(batchSize);

            if (leaveAttendanceRecords.length === 0) break;

            const queries = [];
            const bindParamsList = [];

            leaveAttendanceRecords.forEach(record => {
                record.attendanceRecords.forEach(attendance => {
                    if (moment(attendance.LVDT).isSame(customDate, 'day')) {
                        const leaveYear = attendance.LVYR ? attendance.LVYR.slice(-2) : '';
                        let ENTRYDT = moment(attendance.ENTRYDT).format('DD-MM-YYYY');
                        let MODDT = (attendance.MODDT) ? moment(attendance.MODDT).format('DD-MM-YYYY') : ENTRYDT;
                        let LVSANCDT = (attendance.LVSANCDT) ? moment(attendance.LVSANCDT).format('DD-MM-YYYY') : ENTRYDT;
                        const bindParams = {
                            JLS_PA_ELVTD_LVAPNO: attendance.LVAPNO,
                            JLS_PA_ELVTD_LVYR: leaveYear,
                            JLS_PA_ELVTD_EMPNO: attendance.EMPNO,
                            JLS_PA_ELVTD_LVDT: moment(attendance.LVDT).format('DD-MM-YYYY'),
                            JLS_PA_ELVTD_ISESLVCODE: attendance.ISESLVCODE,
                            JLS_PA_ELVTD_IISESLVCODE: attendance.IISESLVCODE,
                            JLS_PA_ELVTD_BRCODE: attendance.BRCODE,
                            JLS_PA_ELVTD_REASON: attendance.REASON,
                            JLS_PA_ELVTD_ENTRYBY: attendance.ENTRYBY ? attendance.ENTRYBY.substring(0, 15) : '', 
                            JLS_PA_ELVTD_ENTRYDT: ENTRYDT,
                            JLS_PA_ELVTD_MODBY: attendance.MODBY ? attendance.MODBY.substring(0, 15) : '', 
                            JLS_PA_ELVTD_MODDT: MODDT,
                            JLS_PA_ELVTD_LVSANCBY: attendance.LVSANCBY ? attendance.LVSANCBY.substring(0, 15) : '', 
                            JLS_PA_ELVTD_LVSANCDT: LVSANCDT,
                            JLS_PA_ELVTD_STATUS: 'Y',
                            JLS_PA_ELVTD_SOURCE: attendance.SOURCE ? attendance.SOURCE.substring(0, 15) : '',
                        };

                        const query = `
                        MERGE INTO JLS_PA_LVATTAVD_TRNDTL tgt
                        USING (
                            SELECT :JLS_PA_ELVTD_LVAPNO AS LVAPNO,
                                   :JLS_PA_ELVTD_LVYR AS LVYR,
                                   :JLS_PA_ELVTD_EMPNO AS EMPNO,
                                   TO_DATE(:JLS_PA_ELVTD_LVDT, 'DD-MM-YYYY') AS LVDT,
                                   :JLS_PA_ELVTD_ISESLVCODE AS ISESLVCODE,
                                   :JLS_PA_ELVTD_IISESLVCODE AS IISESLVCODE,
                                   :JLS_PA_ELVTD_BRCODE AS BRCODE,
                                   :JLS_PA_ELVTD_REASON AS REASON,
                                   :JLS_PA_ELVTD_ENTRYBY AS ENTRYBY,
                                   TO_DATE(:JLS_PA_ELVTD_ENTRYDT, 'DD-MM-YYYY') AS ENTRYDT,
                                   :JLS_PA_ELVTD_MODBY AS MODBY,
                                   TO_DATE(:JLS_PA_ELVTD_MODDT, 'DD-MM-YYYY') AS MODDT,
                                   :JLS_PA_ELVTD_LVSANCBY AS LVSANCBY,
                                   TO_DATE(:JLS_PA_ELVTD_LVSANCDT, 'DD-MM-YYYY') AS LVSANCDT,
                                   :JLS_PA_ELVTD_STATUS AS STATUS,
                                   :JLS_PA_ELVTD_SOURCE AS SOURCE
                            FROM dual
                        ) src
                        ON (tgt.JLS_PA_ELVTD_LVYR = src.LVYR AND
                            tgt.JLS_PA_ELVTD_EMPNO = src.EMPNO AND
                            tgt.JLS_PA_ELVTD_LVDT = src.LVDT)
                        WHEN MATCHED THEN
                            UPDATE SET
                                tgt.JLS_PA_ELVTD_ISESLVCODE = src.ISESLVCODE,
                                tgt.JLS_PA_ELVTD_IISESLVCODE = src.IISESLVCODE,
                                tgt.JLS_PA_ELVTD_BRCODE = src.BRCODE,
                                tgt.JLS_PA_ELVTD_REASON = src.REASON,
                                tgt.JLS_PA_ELVTD_ENTRYBY = src.ENTRYBY,
                                tgt.JLS_PA_ELVTD_ENTRYDT = src.ENTRYDT,
                                tgt.JLS_PA_ELVTD_MODBY = src.MODBY,
                                tgt.JLS_PA_ELVTD_MODDT = src.MODDT,
                                tgt.JLS_PA_ELVTD_LVSANCBY = src.LVSANCBY,
                                tgt.JLS_PA_ELVTD_LVSANCDT = src.LVSANCDT,
                                tgt.JLS_PA_ELVTD_STATUS = src.STATUS,
                                tgt.JLS_PA_ELVTD_SOURCE = src.SOURCE
                        WHEN NOT MATCHED THEN
                            INSERT (JLS_PA_ELVTD_LVAPNO, JLS_PA_ELVTD_LVYR, JLS_PA_ELVTD_EMPNO, JLS_PA_ELVTD_LVDT,
                                    JLS_PA_ELVTD_ISESLVCODE, JLS_PA_ELVTD_IISESLVCODE, JLS_PA_ELVTD_BRCODE,
                                    JLS_PA_ELVTD_REASON, JLS_PA_ELVTD_ENTRYBY, JLS_PA_ELVTD_ENTRYDT,
                                    JLS_PA_ELVTD_MODBY, JLS_PA_ELVTD_MODDT, JLS_PA_ELVTD_LVSANCBY,
                                    JLS_PA_ELVTD_LVSANCDT, JLS_PA_ELVTD_STATUS, JLS_PA_ELVTD_SOURCE)
                            VALUES (
                                src.LVAPNO, src.LVYR, src.EMPNO, src.LVDT,
                                src.ISESLVCODE, src.IISESLVCODE, src.BRCODE,
                                src.REASON, src.ENTRYBY, src.ENTRYDT,
                                src.MODBY, src.MODDT, src.LVSANCBY,
                                src.LVSANCDT, src.STATUS, src.SOURCE
                            )
                        `;

                        queries.push(query);
                        bindParamsList.push(bindParams);
                    }
                });
            });

            await executeOracleQueryWithTransaction(queries, bindParamsList);

            totalRecordsProcessed += leaveAttendanceRecords.length;
            skip += batchSize;

            console.log(`Processed ${totalRecordsProcessed} records so far`);
        }

        return res.status(200).json({ Status: 'Success', Message: 'Leave attendance data synced to Oracle successfully', Code: 200 });
    } catch (error) {
        console.error('Error syncing leave attendance data to Oracle:', error);
        return res.status(500).json({ Status: 'Failed', Message: 'Internal Server Error', Data: {}, Code: 500 });
    }
});


module.exports = router;
  
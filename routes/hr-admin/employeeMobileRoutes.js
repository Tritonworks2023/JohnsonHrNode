const express = require("express");
const router = express.Router();
const bodyParser = require("body-parser");
router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());
const baseURL = process.env.BASE_URL;
const dates = require("date-and-time");
const request = require("request");
const path = require("path");
const fs = require("fs");
const { executeOracleQuery } = require("../../config/oracle");
const mongoose = require("mongoose");

const moment = require("moment");

// TABLES
const EmployeeMaster = require("../../models/employeeMasterModel");
const LeaveAttendanceMaster = require("../../models/leaveAttendanceMasterModel");
const LeaveDetail = require("../../models/leaveDetailModel");
const EmployeeAttendance = require("../../models/employeeAttendanceModel");
const BranchMaster = require("../../models/branchMasterModel");
const BalanceLeave = require("../../models/balanceLeaveModel");
const Holiday = require("../../models/holidayModel");
const Permission = require("../../models/permissionModel");
const EmployeeTracking = require("../../models/employeeTrackingModel");
const TrackingNotification = require("../../models/trackingNotificationModel");
const CompensatoryOff = require("../../models/compensatoryOffModel");
const UserManagement = require("../../models/user_managementModel");
const ServiceUserDetails = require("../../models/service_userdetailsModel");

var admin_accessModel = require("../../models/admin_accessModel");

const { createNotification } = require("./shareRoutes");

const gradeOrder = [
  "E8",
  "E7",
  "E6",
  "E5",
  "E4",
  "E3",
  "ES2",
  "ES1",
  "TE2",
  "TE1",
  "S1",
  "S2",
  "S3",
  "S4",
  "S5",
  "S6",
];
const getGradeIndex = (grade) => {
  const index = gradeOrder.indexOf(grade);
  return index !== -1 ? index : gradeOrder.length;
};

const leaveCodes = [
  { LVCODE: "CL", LVDESC: "Casual Leave" },
  { LVCODE: "EL", LVDESC: "Earned Leave" },
  { LVCODE: "SL", LVDESC: "Sick Leave" },
  { LVCODE: "CO", LVDESC: "Comp-off" },
  { LVCODE: "OD", LVDESC: "On Duty" },
  { LVCODE: "OS", LVDESC: "Out Station" },
];

const leaveSessions = {
  FN: 0.5, // Morning half-day
  AN: 0.5, // Afternoon half-day
  FD: 1, // Full-day
};

function convertTo24HourFormat(time) {
  const [timePart, period] = time.split(" ");
  const [hours, minutes] = timePart.split(":");
  let hour = parseInt(hours, 10);
  if (period.toUpperCase() === "PM" && hour !== 12) {
    hour += 12;
  }
  if (period.toUpperCase() === "AM" && hour === 12) {
    hour = 0;
  }
  const formattedHour = hour.toString().padStart(2, "0");
  const formattedMinutes = minutes.padStart(2, "0");
  const formattedTime = `${formattedHour}:${formattedMinutes}`;
  return formattedTime;
}

function isTimeWithinRange(time, startTime, endTime) {
  return (
    moment(time, "HH:mm").isSameOrAfter(moment(startTime, "HH:mm")) &&
    moment(time, "HH:mm").isSameOrBefore(moment(endTime, "HH:mm"))
  );
}

const formatDateMiddleware = (req, res, next) => {
  const originalJson = res.json;
  const recursiveFormatDates = (obj) => {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (obj[key] instanceof Date) {
          obj[key] = moment(obj[key]).format("DD-MM-YYYY");
        } else if (typeof obj[key] === "object") {
          recursiveFormatDates(obj[key]);
        }
      }
    }
  };
  res.json = function (body) {
    if (typeof body === "object") {
      recursiveFormatDates(body);
    }
    originalJson.call(this, body);
  };
  next();
};

router.use(formatDateMiddleware);

function calculateDistanceMeter(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180; // φ, λ in radians
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const d = R * c; // in metres
  return d;
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  // Haversine formula to calculate distance
  const R = 6371000; // Radius of the Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d * 1000; // Convert to meters

  //    return d;
}

function isWithinRadius(lat, lng, brlat, brlng, radius = 150) {
  const earthRadius = 6371000;
  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180;
  const brlatRad = (brlat * Math.PI) / 180;
  const brlngRad = (brlng * Math.PI) / 180;

  const dLat = brlatRad - latRad;
  const dLng = brlngRad - lngRad;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(latRad) *
      Math.cos(brlatRad) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = earthRadius * c;
  return distance <= radius;
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // radius of Earth in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // distance in meters
}

function isPointInPolygon(point, polygon, buffer = 0) {
  const x = point.lat,
    y = point.lng;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lat,
      yi = polygon[i].lng;
    const xj = polygon[j].lat,
      yj = polygon[j].lng;
    const intersect =
      yi > y != yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  if (inside) return true;

  for (let i = 0; i < polygon.length - 1; i++) {
    const start = polygon[i];
    const end = polygon[i + 1];
    const d = distanceToSegment(point, start, end);
    console.log("======d", d);
    console.log("======buffer", buffer);
    if (d <= buffer) return true;
  }

  return false;
}

function distanceToSegment(point, start, end) {
  const x0 = point.lat,
    y0 = point.lng;
  const x1 = start.lat,
    y1 = start.lng;
  const x2 = end.lat,
    y2 = end.lng;

  const A = x0 - x1;
  const B = y0 - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const len_sq = C * C + D * D;
  let param = -1;
  if (len_sq !== 0) param = dot / len_sq;

  let xx, yy;

  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  return haversineDistance(x0, y0, xx, yy);
}

// ******************************************************************************************************************************************************************************
// USER LOGIN MOBILE
// ******************************************************************************************************************************************************************************
router.post("/login", async (req, res) => {
  const { EMPNO, PASSWORD } = req.body;
  console.log("===========req.body", req.body);

  // return res.status(400).json({
  //   Status: "Failed",
  //   Message: "Your Login Will Be Enabled On 14-Nov-2024",
  //   Data: {},
  //   Code: 400,
  // });

  // default user
  if (EMPNO === "A00818" && PASSWORD === "12345") {
    const user = await EmployeeMaster.findOne({ EMPNO });
    res.status(200).json({
      Status: "Success",
      Message: "User authenticated successfully",
      Data: user,
      Code: 200,
    });
  }
  if (!EMPNO || !PASSWORD) {
    return res.status(400).json({
      Status: "Failed",
      Message: "EmpNo and password are required",
      Data: {},
      Code: 400,
    });
  }

  try {
    const user = await EmployeeMaster.findOne({ EMPNO });
    if (!user) {
      return res.status(404).json({
        Status: "Failed",
        Message: "User not found",
        Data: {},
        Code: 404,
      });
    }
    if (user.PASSWORD !== PASSWORD) {
      return res.status(400).json({
        Status: "Failed",
        Message: "Invalid credentials",
        Data: {},
        Code: 400,
      });
    }
    if (user.BLOCKSTATUS) {
      return res.status(400).json({
        Status: "Failed",
        Message: "Your account blocked contact branch HR",
        Data: {},
        Code: 400,
      });
    }
    if (user.STATUS == "I") {
      return res.status(400).json({
        Status: "Failed",
        Message: "Your account inactive contact branch HR",
        Data: {},
        Code: 400,
      });
    }
    if (user.LOCCODE == "NOLOC") {
      return res.status(400).json({
        Status: "Failed",
        Message:
          "Your location Should be Field/Non Field ,Kindly Contact Branch HR",
        Data: {},
        Code: 400,
      });
    }
    console.log("==========user.DEVICEID", user.DEVICEID);
    if (user.DEVICEID == "" || user.DEVICEID == undefined) {
      user.DEVICEID = req.body.device_id;
      await user.save();
      res.status(200).json({
        Status: "Success",
        Message: "User authenticated successfully",
        Data: user,
        Code: 200,
      });
    } else if (user.DEVICEID !== req.body.device_id) {
      res.json({
        Status: "Failed",
        Message: "Device Id Mismatching",
        Data: {},
        Code: 404,
      });
    } else if (user.DEVICEID == req.body.device_id) {
      res.status(200).json({
        Status: "Success",
        Message: "User authenticated successfully",
        Data: user,
        Code: 200,
      });
    }
    //res.status(200).json({ Status: 'Success', Message: 'User authenticated successfully', Data: user, Code: 200 });
  } catch (error) {
    console.error("Error authenticating user:", error);
    res.status(500).json({
      Status: "Failed",
      Message: "Internal Server Error",
      Data: {},
      Code: 500,
    });
  }
});

router.get("/leave-codes", (req, res) => {
  try {
    const leaveCodesList = [
      { LVCODE: "CL", LVDESC: "Casual Leave" },
      { LVCODE: "EL", LVDESC: "Earned Leave" },
      { LVCODE: "SL", LVDESC: "Sick Leave" },
      { LVCODE: "CO", LVDESC: "Comp-off" },
    ];
    res.status(200).json({
      Status: "Success",
      Message: "Leave codes",
      Data: leaveCodesList,
      Code: 200,
    });
  } catch (error) {
    console.error("Error retrieving leave codes:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// router.post('/apply-leave', async (req, res) => {
//     try {
//         const { LVFRMDT, LVTODT, EMPNO, LVCODE, FRMSESSION, TOSESSION, BRCODE, ENTRYBY, REASON } = req.body;
//         if (!LVFRMDT || !LVTODT || !EMPNO || !LVCODE || !BRCODE || !ENTRYBY  ) {
//             return res.status(400).json({ Status: 'Failed', Message: 'LVFRMDT, LVTODT, EMPNO, LVCODE, BRCODE, and ENTRYBY are required fields', Code: 400 });
//         }
//         const userExists = await EmployeeMaster.findOne({ ECODE: EMPNO });
//         if (!userExists) {
//             return res.status(404).json({ Status: 'Failed', Message: 'User with provided EMPNO does not exist', Data: {}, Code: 404 });
//         }
//         const parsedLVFRMDT = moment(LVFRMDT, 'DD-MM-YYYY').toDate();
//         const parsedLVTODT = moment(LVTODT, 'DD-MM-YYYY').toDate();
//         const lvYear = parsedLVFRMDT.getFullYear().toString().slice(2);
//         const lvToYear = parsedLVTODT.getFullYear().toString().slice(2);

//         const employeeGrade = userExists.GRADE;
//         const isGradeE3OrBelow = (employeeGrade <= 'E3');

//         // Check if parsing was successful
//         if (isNaN(parsedLVFRMDT.getTime()) || isNaN(parsedLVTODT.getTime())) {
//             return res.status(400).json({ Status: 'Failed', Message: 'LVFRMDT and LVTODT must be valid dates', Code: 400 });
//         }

//         if (parsedLVFRMDT > parsedLVTODT) {
//             return res.status(400).json({ Status: 'Failed', Message: 'LVFRMDT must be before or equal to LVTODT', Code: 400 });
//         }

//         console.log("=======parsedLVFRMDT",parsedLVFRMDT);
//         console.log("=======parsedLVTODT",parsedLVTODT);

//         const isHoliday = await isHolidayDate(parsedLVFRMDT, BRCODE, lvYear ) || await isHolidayDate(parsedLVTODT, BRCODE, lvToYear);
//         console.log("==isHoliday=====",isHoliday)
//         if (isHoliday) {
//             return res.status(400).json({ Status: 'Failed', Message: 'Leave from date or leave to date cannot be a holiday', Code: 400 });
//         }

//         //if (isGradeE3OrBelow) {
//             if (LVCODE != 'EL') {
//                 // Check leave balance available
//                 const leaveBalance = await BalanceLeave.findOne({
//                     PA_ELSTD_EMPNO: EMPNO,
//                     PA_ELSTD_LVCODE: LVCODE,
//                     PA_ELSTD_LVYR: lvYear
//                 });
//                 console.log("=======leaveBalance",leaveBalance);
//                 if (!leaveBalance || leaveBalance.PA_ELSTD_BAL <= 0) {
//                     return res.status(400).json({ Status: 'Failed', Message: 'Insufficient leave balance', Code: 400 });
//                 }

//                 // Check if leave balance is sufficient for the leave duration
//                 const leaveDuration = moment(parsedLVTODT).diff(moment(parsedLVFRMDT), 'days') + 1; // Add 1 to include both start and end dates
//                 if (leaveBalance.PA_ELSTD_BAL < leaveDuration) {
//                     return res.status(400).json({ Status: 'Failed', Message: 'Insufficient leave balance for the specified duration', Code: 400 });
//                 }
//                 console.log("=======leaveDuration",leaveDuration);
//             }
//             // Check if leave sandwich is applicable
//             if (isGradeE3OrBelow) {
//                 if (LVCODE === 'CL') {
//                     console.log("==========employeeGrade",employeeGrade);
//                     // Check for maximum consecutive CL days (applicable only for E3 and below)
//                     if (leaveDuration > 2) {
//                         return res.status(400).json({ Status: 'Failed', Message: 'Causal leave cannot be taken for more than 2 consecutive days', Code: 400 });
//                     }

//                     // Check for combining CL with other leave types
//                     const existingLeave = await LeaveDetail.find({
//                         EMPNO,
//                         STATUS: 'APPROVED',
//                         LVFRMDT: { $lt: parsedLVTODT },
//                         LVTODT: { $gt: parsedLVFRMDT }, // Overlapping leave with current request
//                     });
//                     console.log("==========existingLeave",existingLeave);
//                     if (existingLeave.length > 0 && existingLeave[0].LVCODE !== 'CL') {
//                         return res.status(400).json({ Status: 'Failed', Message: 'Causal leave cannot be combined with other leave types', Code: 400 });
//                     }

//                     // Handle combining CL with insufficient EL balance (deduction or loss of pay)
//                     if (existingLeave.length > 0 && existingLeave[0].LVCODE === 'CL' && leaveDuration > leaveBalance.PA_ELSTD_BAL) {
//                         const additionalDays = leaveDuration - leaveBalance.PA_ELSTD_BAL;
//                         // Implement logic to handle exceeding leave balance (deduct from EL or mark as loss of pay)
//                         console.warn(`Causal leave exceeds available balance by ${additionalDays} days. Handle deduction or loss of pay here.`);
//                     }
//                 }
//             }

//           console.log("===============succccccccccccccccccccccccccc")

//         // Sandwich leave validation (applicable only for WH/FH/DH and Grade <= E3)
//         if ( (LVCODE === 'WH' || LVCODE === 'FH' || LVCODE === 'DH') ) {
//             const potentialSandwichDays = await LeaveDetail.find({
//             EMPNO,
//             STATUS: 'APPROVED',
//             $or: [
//                 { LVFRMDT: { $lt: parsedLVFRMDT }, LVTODT: { $gt: parsedLVFRMDT } }, // Previous leave enclosing leave start date
//                 { LVFRMDT: { $lt: parsedLVTODT }, LVTODT: { $gt: parsedLVTODT } }, // Next leave enclosing leave end date
//             ],
//             });

//             if (potentialSandwichDays.length > 0) {
//             const isSandwich = potentialSandwichDays.some(leave =>
//                 leave.LVFRMDT.getDate() !== leave.LVTODT.getDate() // Check if leave is not a single day
//             );

//             if (isSandwich) {
//                 return res.status(400).json({ Status: 'Failed', Message: 'Leave Sandwich is not applicable in this case', Code: 400 });
//             }
//             }
//         }

//         let TYPE = "LEAVE";
//         if(LVCODE == 'OD' || LVCODE == 'OS'){
//             TYPE = "MOVEMENT";
//         }

//         let ISESLVCODE = LVCODE, IISESLVCODE = LVCODE;

//         if (FRMSESSION === 'FN') {
//             ISESLVCODE = LVCODE;
//         } else if (FRMSESSION === 'AN') {
//             IISESLVCODE = LVCODE;
//         }

//         if (TOSESSION === 'FN') {
//             ISESLVCODE = LVCODE;
//         } else if (TOSESSION === 'AN') {
//             IISESLVCODE = LVCODE;
//         }

//         const applicationCount = await LeaveDetail.countDocuments() + 1;
//         const LVAPNO = applicationCount;

//         const existingLeave = await LeaveDetail.findOne({
//             EMPNO,
//             STATUS: "APPROVED",
//             LVFRMDT: { $lte: moment(parsedLVTODT).toDate() },
//             LVTODT:  { $gte: moment(parsedLVFRMDT).toDate() }
//         });

//         if (existingLeave) {
//             return res.status(400).json({ Status: 'Failed', Message: 'Leave has already been applied for the specified date range', Code: 400 });
//         }

//         const newLeave = new LeaveDetail({
//             LVAPNO,
//             LVYR: parsedLVFRMDT.getFullYear().toString(),
//             LVCODE,
//             FRMSESSION,
//             TOSESSION,
//             LVFRMDT: parsedLVFRMDT,
//             LVTODT: parsedLVTODT,
//             EMPNO,
//             BRCODE,
//             ISESLVCODE,
//             IISESLVCODE,
//             REASON: REASON || '',
//             STATUS: 'PENDING',
//             SOURCE: 'JLSMART',
//             ENTRYBY,
//             ENTRYDT: moment().toDate(),
//             TYPE: TYPE,
//             APPROVER: userExists.REPMGR
//         });
//         await newLeave.save();

//         const employeeName = `${userExists.ENAME} - ${userExists.ECODE}` ;
//         const applicationNo = LVAPNO;

//         const notificationData = {
//             EMPNO: userExists.REPMGR,
//             BRCODE: userExists.BRCODE,
//             TITLE: 'Leave Application',
//             DESC: `You have received a leave application from ${employeeName} (Application No: ${applicationNo}) for your approval.`
//         };
//         createNotification(notificationData);
//         return res.status(200).json({ Status: 'Success', Message: 'Leave applied successfully', Code: 200 });
//     } catch (error) {
//         console.error('Error applying leave:', error);
//         return res.status(500).json({ Status: 'Failed', Message: 'Internal Server Error', Code: 500 });
//     }
// });

// async function isHolidayDate(date,brcode,year) {
//     const holiday = await Holiday.findOne({ HLDYDT: date, BRCODE: brcode, HLDYYR : year });
//     console.log("========holiday",holiday);
//     return !!holiday;
// }

router.post("/apply-leave", async (req, res) => {
  try {
    const {
      LVFRMDT,
      LVTODT,
      EMPNO,
      LVCODE,
      FRMSESSION,
      TOSESSION,
      BRCODE,
      ENTRYBY,
      REASON,
    } = req.body;
    console.log("=====", req.body);
    const requiredFieldsValidation = validateRequiredFields(
      LVFRMDT,
      LVTODT,
      EMPNO,
      LVCODE,
      BRCODE,
      ENTRYBY
    );
    if (requiredFieldsValidation) {
      return res.status(400).json({
        Status: "Failed",
        Message: requiredFieldsValidation,
        Code: 400,
      });
    }

    const userExists = await validateUserExistence(EMPNO);
    if (!userExists) {
      return res.status(404).json({
        Status: "Failed",
        Message: "User with provided EMPNO does not exist",
        Data: {},
        Code: 404,
      });
    }

    const parsedLVFRMDT = moment(LVFRMDT, "DD-MM-YYYY").toDate();
    const parsedLVTODT = moment(LVTODT, "DD-MM-YYYY").toDate();
    const lvYear = parsedLVFRMDT.getFullYear().toString();
    const lvToYear = parsedLVTODT.getFullYear().toString();

    if (isNaN(parsedLVFRMDT.getTime()) || isNaN(parsedLVTODT.getTime())) {
      return res.status(400).json({
        Status: "Failed",
        Message: "LVFRMDT and LVTODT must be valid dates",
        Code: 400,
      });
    }

    if (parsedLVFRMDT > parsedLVTODT) {
      return res.status(400).json({
        Status: "Failed",
        Message: "LVFRMDT must be before or equal to LVTODT",
        Code: 400,
      });
    }

    // const employeeGrade = userExists.GRADE;
    // const isGradeE3OrBelow = (employeeGrade <= 'E3');

    const employeeGrade = userExists.GRADE;
    const isGradeE3OrBelow =
      getGradeIndex(employeeGrade) >= getGradeIndex("E3");

    //const leaveDuration = moment(parsedLVTODT).diff(moment(parsedLVFRMDT), 'days') + 1;

    let leaveDuration = 0;

    // Calculate the leave duration based on the selected sessions
    if (moment(parsedLVFRMDT).isSame(parsedLVTODT, "day")) {
      console.log("===innnnnnnn");
      // Same date, calculate duration based on sessions
      if (FRMSESSION === "FN" && TOSESSION === "FN") {
        leaveDuration += leaveSessions["FN"];
      } else if (FRMSESSION === "FN" && TOSESSION === "AN") {
        leaveDuration += leaveSessions["FD"];
      } else if (FRMSESSION === "AN" && TOSESSION === "AN") {
        leaveDuration += leaveSessions["AN"];
      } else if (FRMSESSION === "FD" && TOSESSION === "FD") {
        leaveDuration += leaveSessions["FD"];
      }
    } else {
      leaveDuration +=
        moment(parsedLVTODT).diff(moment(parsedLVFRMDT), "days") + 1;
      console.log("===elseee", leaveDuration);

      if (FRMSESSION === "AN") {
        leaveDuration -= 0.5;
      }
      if (TOSESSION === "FN") {
        leaveDuration -= 0.5;
      }
    }
    console.log("======leaveDuration", leaveDuration);

    if (LVCODE === "CL") {
      // Check for maximum consecutive CL days
      if (leaveDuration > 2) {
        return res.status(400).json({
          Status: "Failed",
          Message:
            "Causal leave cannot be taken for more than 2 consecutive days",
          Code: 400,
        });
      }
    }

    const isHolidayValidation = await validateHolidayDate(
      parsedLVFRMDT,
      parsedLVTODT,
      BRCODE,
      lvYear,
      lvToYear
    );
    if (isHolidayValidation) {
      return res.status(400).json({
        Status: "Failed",
        Message: "Leave from date or leave to date cannot be a holiday",
        Code: 400,
      });
    }

    if (LVCODE != "OD" && LVCODE != "OS") {
      const leaveBalanceValidation = await validateLeaveBalance(
        EMPNO,
        LVCODE,
        lvYear,
        parsedLVTODT,
        parsedLVFRMDT,
        isGradeE3OrBelow,
        leaveDuration
      );
      console.log("=========leaveBalanceValidation", leaveBalanceValidation);
      if (leaveBalanceValidation) {
        return res.status(400).json({
          Status: "Failed",
          Message: leaveBalanceValidation,
          Code: 400,
        });
      }

      const leaveSandwichValidation = await validateLeaveSandwich(
        EMPNO,
        LVCODE,
        parsedLVFRMDT,
        parsedLVTODT,
        isGradeE3OrBelow
      );
      if (leaveSandwichValidation) {
        return res.status(400).json({
          Status: "Failed",
          Message: leaveSandwichValidation,
          Code: 400,
        });
      }
    }

    let TYPE = "LEAVE";
    let LVFROMTIME = req.body.LVFROMTIME ? req.body.LVFROMTIME : "";
    let LVTOTIME = req.body.LVTOTIME ? req.body.LVTOTIME : "";

    let ISESLVCODE, IISESLVCODE;

    if (LVCODE == "OD" || LVCODE == "OS") {
      TYPE = "MOVEMENT";
      ISESLVCODE = LVCODE;
      IISESLVCODE = LVCODE;
    }

    if (FRMSESSION === "FN") {
      ISESLVCODE = LVCODE;
    } else if (FRMSESSION === "AN") {
      IISESLVCODE = LVCODE;
    }

    if (TOSESSION === "FN") {
      ISESLVCODE = LVCODE;
    } else if (TOSESSION === "AN") {
      IISESLVCODE = LVCODE;
    }

    if (FRMSESSION === "FD") {
      IISESLVCODE = LVCODE;
    }
    if (TOSESSION === "FD") {
      IISESLVCODE = LVCODE;
    }

    const applicationCount = (await LeaveDetail.countDocuments()) + 1;
    const LVAPNO = applicationCount;

    const existingLeave = await LeaveDetail.findOne({
      EMPNO,
      STATUS: "APPROVED",
      LVFRMDT: { $lte: moment(parsedLVTODT).toDate() },
      LVTODT: { $gte: moment(parsedLVFRMDT).toDate() },
    });

    if (existingLeave) {
      return res.status(400).json({
        Status: "Failed",
        Message: "Leave has already been applied for the specified date range",
        Code: 400,
      });
    }

    const newLeave = new LeaveDetail({
      LVAPNO,
      EMPID: userExists._id,
      GRADE: userExists.GRADE,
      DEPT: userExists.DEPT,
      EMPNAME: userExists.ENAME,
      LVYR: parsedLVFRMDT.getFullYear().toString(),
      LVCODE,
      FRMSESSION,
      TOSESSION,
      LVFRMDT: parsedLVFRMDT,
      LVTODT: parsedLVTODT,
      EMPNO,
      BRCODE,
      ISESLVCODE,
      IISESLVCODE,
      REASON: REASON || "",
      STATUS: "PENDING",
      SOURCE: "JLSMART",
      ENTRYBY,
      ENTRYDT: moment().toDate(),
      TYPE: TYPE,
      LVFROMTIME,
      LVTOTIME,
      APPROVER: userExists.REPMGR,
    });
    await newLeave.save();

    const employeeName = `${userExists.ENAME} - ${userExists.ECODE}`;
    const applicationNo = LVAPNO;

    const notificationData = {
      LVAPNO:applicationNo,
      EMPNO: userExists.REPMGR,
      BRCODE: userExists.BRCODE,
      TITLE: "Leave Application",
      DESC: `You have received a leave application from ${employeeName} (Application No: ${applicationNo}) for your approval.`,
    };
    await createNotification(notificationData);
    return res.status(200).json({
      Status: "Success",
      Message: "Leave applied successfully",
      Code: 200,
    });
  } catch (error) {
    console.error("Error applying leave:", error);
    return res
      .status(500)
      .json({ Status: "Failed", Message: "Internal Server Error", Code: 500 });
  }
});

async function isHolidayDate(date, brcode, year) {
  console.log("========date, brcode, year", date, brcode, year);
  const holiday = await Holiday.findOne({
    HLDYDT: date,
    BRCODE: brcode,
    HLDYYR: year,
  });
  console.log("========holiday", holiday);
  return !!holiday;
}

async function validateHolidayDate(
  parsedLVFRMDT,
  parsedLVTODT,
  BRCODE,
  lvYear,
  lvToYear
) {
  const isHoliday =
    (await isHolidayDate(parsedLVFRMDT, BRCODE, lvYear)) ||
    (await isHolidayDate(parsedLVTODT, BRCODE, lvToYear));
  console.log("========isHoliday", isHoliday);
  return isHoliday;
}

async function validateLeaveBalance(
  EMPNO,
  LVCODE,
  lvYear,
  parsedLVTODT,
  parsedLVFRMDT,
  isGradeE3OrBelow,
  leaveDuration
) {
  const leaveBalance = await BalanceLeave.findOne({
    PA_ELSTD_EMPNO: EMPNO,
    PA_ELSTD_LVCODE: LVCODE,
    PA_ELSTD_LVYR: lvYear.slice(2),
  });
  console.log("=========EMPNO", EMPNO, LVCODE, lvYear.slice(2));
  console.log("=========leaveBalance", leaveBalance);
  if (!leaveBalance || leaveBalance.PA_ELSTD_BAL <= 0) {
    return "Insufficient leave balance";
  }

  // Check if leave balance is sufficient for the leave duration
  if (leaveDuration == undefined) {
    leaveDuration =
      moment(parsedLVTODT).diff(moment(parsedLVFRMDT), "days") + 1;
  }
  if (leaveBalance.PA_ELSTD_BAL < leaveDuration) {
    return "Insufficient leave balance for the specified duration";
  }

  return null;
}

async function validateLeaveSandwich(
  EMPNO,
  parsedLVFRMDT,
  parsedLVTODT,
  BRCODE,
  isGradeE3OrBelow
) {
  // Check if any of the days within the leave range are holidays
  if (isGradeE3OrBelow) {
    const leaveDays = [];
    let currentDate = new Date(parsedLVFRMDT);
    while (currentDate <= parsedLVTODT) {
      leaveDays.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const isAnyHolidayAsLeave = await Promise.all(
      leaveDays.map(async (date) => {
        const isHoliday = await isHolidayDate(
          date,
          BRCODE,
          date.getFullYear().toString()
        );
        return isHoliday;
      })
    );
    console.log("=========isAnyHolidayAsLeave", isAnyHolidayAsLeave);
    if (isAnyHolidayAsLeave.includes(true)) {
      return "Leave Sandwich is not applicable when intervening days are holidays";
    }
  }

  return null;
}

async function validateUserExistence(EMPNO) {
  const userExists = await EmployeeMaster.findOne({ ECODE: EMPNO });
  return userExists;
}

function validateRequiredFields(
  LVFRMDT,
  LVTODT,
  EMPNO,
  LVCODE,
  BRCODE,
  ENTRYBY
) {
  if (!LVFRMDT || !LVTODT || !EMPNO || !LVCODE || !BRCODE || !ENTRYBY) {
    return "LVFRMDT, LVTODT, EMPNO, LVCODE, BRCODE, and ENTRYBY are required fields";
  }
  return null;
}

router.post("/create-attendance", async (req, res) => {
  try {
    console.log("==========req.body", req.body);
    const {
      EMPNO,
      BRCODE,
      attendanceType,
      ENTRYBY,
      LAT,
      LNG,
      ADDRESS,
      REASON,
    } = req.body;
    const today = moment().toDate();

    console.log(
      req.body,
      "=================================== ios hr attendance ============================"
    );

    if (!EMPNO || !BRCODE || !attendanceType || !LAT || !LNG || !ADDRESS) {
      return res.status(400).json({
        Status: "Failed",
        Message: "EMPNO, BRCODE, and attendanceType are required fields",
        Data: {},
        Code: 400,
      });
    }
    if (attendanceType !== "CHECKIN" && attendanceType !== "CHECKOUT") {
      return res.status(400).json({
        Status: "Failed",
        Message: "Invalid attendanceType. It must be CHECKIN or CHECKOUT",
        Data: {},
        Code: 400,
      });
    }
    const userExists = await EmployeeMaster.findOne({ EMPNO });
    if (!userExists) {
      return res.status(404).json({
        Status: "Failed",
        Message: "User with provided EMPNO does not exist",
        Data: {},
        Code: 404,
      });
    }
    if (userExists.BLOCKSTATUS) {
      return res.status(400).json({
        Status: "Failed",
        Message: "Your account blocked contact branch HR",
        Data: {},
        Code: 400,
      });
    }
    if (userExists.STATUS == "I") {
      return res.status(400).json({
        Status: "Failed",
        Message: "Your account inactive contact branch HR",
        Data: {},
        Code: 400,
      });
    }
    if (userExists.EXIT_WITHDRAWAL_STATUS) {
      return res.status(400).json({
        Status: "Failed",
        Message: "Your account exit contact branch HR",
        Data: {},
        Code: 400,
      });
    }

    console.log("=========attendanceType", attendanceType);
    console.log("=========REASON", REASON);
    if (attendanceType === "CHECKOUT" && REASON === "LUNCH BREAK") {
      const currentDate = moment().startOf("day").format("YYYY-MM-DD");
      const existingLunchBreak = await EmployeeAttendance.findOne({
        EMPNO,
        LVDT: { $gte: currentDate, $lt: moment(today).endOf("day").toDate() },
        REASON: "LUNCH BREAK",
        CHECKOUTSTATUS: true,
      });
      console.log("=========today", today);
      console.log("=========today", moment(today).endOf("day").toDate());
      console.log("=========existingLunchBreak", existingLunchBreak);
      if (existingLunchBreak) {
        return res.status(400).json({
          Status: "Failed",
          Message: "Lunch break checkout already recorded for today",
          Data: {},
          Code: 400,
        });
      }
    }

    const year = moment(today).format("YYYY");
    const holiday = await Holiday.findOne({
      HLDYDT: today,
      BRCODE,
      HLDYYR: year,
    });
    if (holiday && !userExists.isHolidayCheckIn) {
      return res.status(400).json({
        Status: "Failed",
        Message:
          "Attendance cannot be recorded on a holiday: " + holiday.HLDYNAME,
        Data: {},
        Code: 400,
      });
    }

    const branchRecord = await BranchMaster.findOne({ BRCODE });
    if (!branchRecord) {
      return res.status(404).json({
        Status: "Failed",
        Message: "Branch with provided BRCODE does not exist",
        Data: {},
        Code: 404,
      });
    }

    //  if (userExists.LOCCODE == "NONFLD") {
    //     const { BRLAT, BRLNG, MEASUREMENT } = branchRecord;
    //     console.log(
    //       "===BRLAT, BRLNG, MEASUREMENT========",
    //       BRLAT,
    //       BRLNG,
    //       MEASUREMENT
    //     );
    //     if (MEASUREMENT && MEASUREMENT.points && MEASUREMENT.points.length > 0) {
    //       const { points } = MEASUREMENT;
    //       let isWithinBounds = false;

    //       const point = { lat: parseFloat(LAT), lng: parseFloat(LNG) };
    //       const bufferDistance = 1000;
    //       const isInside = isPointInPolygon(point, points, bufferDistance);
    //       console.log("===isInside====", isInside);

    //       // function isPointInPolygon(point, polygon) {
    //       //     const { lat, lng } = point;
    //       //     let inside = false;

    //       //     for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    //       //         const xi = polygon[i].lat, yi = polygon[i].lng;
    //       //         const xj = polygon[j].lat, yj = polygon[j].lng;

    //       //         const intersect = ((yi > lng) !== (yj > lng)) &&
    //       //         (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);

    //       //         if (intersect) inside = !inside;
    //       //     }
    //       //     return inside;
    //       // }
    //       // const polygonPoints = MEASUREMENT.points.map(point => ({ lat: point.lat, lng: point.lng }));
    //       // const pointToCheck = { lat: LAT, lng: LNG };
    //       // const isInside = isPointInPolygon(pointToCheck, polygonPoints);
    //       // console.log("==isInside=====",isInside);
    //       // console.log(`The point (${LAT}, ${LNG}) is ${isInside ? 'inside' : 'outside'} the branch location.`);

    //       // for (let i = 0; i < points.length - 1; i++) {
    //       //     const start = points[i];
    //       //     const end = points[i + 1];
    //       //     const distanceStart = await calculateDistance(LAT, LNG, start.lat, start.lng);
    //       //     const distanceEnd = await calculateDistance(LAT, LNG, end.lat, end.lng);
    //       //     const distanceSegment = await calculateDistance(start.lat, start.lng, end.lat, end.lng);

    //       //     console.log("===distanceStart========",distanceStart,distanceEnd, distanceSegment);
    //       //     console.log("===math.aps========", Math.abs(distanceStart + distanceEnd - distanceSegment) );
    //       //     if (Math.abs(distanceStart + distanceEnd - distanceSegment) < 150) {
    //       //         isWithinBounds = true;
    //       //         break;
    //       //     }
    //       // }
    //       if (!isInside) {
    //         console.log("==================== step 1========================")
    //         return res.status(400).json({
    //           Status: "Failed",
    //           Message: "You are away from the branch location",
    //           Data: {},
    //           Code: 400,
    //         });
    //       }
    //     } else {
    //       console.log("==================== step 2========================")

    //       let isWithinBounds = await isWithinRadius(LAT, LNG, BRLAT, BRLNG);
    //       if (isWithinBounds == false) {
    //         return res.status(400).json({
    //           Status: "Failed",
    //           Message: "You are away from the branch location",
    //           Data: {},
    //           Code: 400,
    //         });
    //       }
    //     }
    //   }

    if (userExists.LOCCODE == "NOLOC") {
      return res.status(400).json({
        Status: "Failed",
        Message:
          "Your location Should be Field/Non Field ,Kindly Contact Branch HR",
        Data: {},
        Code: 400,
      });
    }

    let BRSTARTTIME, BRENDTIME;
    if (userExists.BRSTARTTIME && userExists.BRENDTIME) {
      BRSTARTTIME = userExists.BRSTARTTIME;
      BRENDTIME = userExists.BRENDTIME;
    } else {
      BRSTARTTIME = branchRecord.BRSTARTTIME;
      BRENDTIME = branchRecord.BRENDTIME;
    }

    const newAttendance = new EmployeeAttendance({
      LVYR: moment(today).format("YYYY"),
      LVDT: today,
      EMPID: userExists._id,
      GRADE: userExists.GRADE,
      DEPT: userExists.DEPT,
      EMPNO,
      EMPNAME: userExists.ENAME,
      BRCODE,
      BRSTARTTIME,
      BRENDTIME,
      ENTRYBY: ENTRYBY || "",
      ENTRYDT: today,
      CHECKINSTATUS: attendanceType === "CHECKIN",
      CHECKINTIME:
        attendanceType === "CHECKIN" ? moment(today).format("HH:mm:ss") : null,
      CHECKINLAT: attendanceType === "CHECKIN" ? LAT : null,
      CHECKINLNG: attendanceType === "CHECKIN" ? LNG : null,
      CHECKINADDRESS: attendanceType === "CHECKIN" ? ADDRESS : "",
      MODBY: ENTRYBY || "",
      MODDT: today,
      CHECKOUTSTATUS: attendanceType === "CHECKOUT",
      CHECKOUTTIME:
        attendanceType === "CHECKOUT" ? moment(today).format("HH:mm:ss") : null,
      CHECKOUTLAT: attendanceType === "CHECKOUT" ? LAT : null,
      CHECKOUTLNG: attendanceType === "CHECKOUT" ? LNG : null,
      CHECKOUTADDRESS: attendanceType === "CHECKOUT" ? ADDRESS : "",
      REASON: REASON || "",
      PHOTO: req.body.PHOTO || "",
    });
    await newAttendance.save();
    console.log(
      newAttendance,
      "========================== newAttendance ========================"
    );
    if (attendanceType == "CHECKIN") {
      userExists.LASTLOGIN = today;
      await userExists.save();
    }
    if (attendanceType == "CHECKOUT") {
      userExists.LASTLOGOUT = today;
      await userExists.save();
    }

    const existAttendance = await EmployeeAttendance.find({
      LVYR: moment(today).format("YYYY"),
      LVDT: today,
    });

    // deduct permissions and leaves if Late checkin
    if (newAttendance.CHECKINSTATUS) {
      const time1 = moment(BRSTARTTIME, "HH:mm");
      const time2 = moment(newAttendance.CHECKINTIME, "HH:mm:ss");
      // Calculate the difference in milliseconds
      const difference = time2.diff(time1);

      // Convert the difference to a readable format
      const duration = moment.duration(difference);

      const hours = duration.hours(); // Difference in hours
      const minutes = duration.minutes(); // Remaining minutes
      const seconds = duration.seconds(); // Remaining seconds
      const startOfMonth = moment().startOf("M").toDate();
      const endOfMonth = moment().endOf("M").toDate();

      const existingPermissions = await Permission.find({
        EMPNO,
        PERMISSIONDATE: {
          $gte: new Date(startOfMonth),
          $lte: new Date(endOfMonth),
        },
      });
      console.log(
        existingPermissions,
        "====================== getPermissonCount ============================"
      );

      let permissionsDuration15 = 3;
      let permissionsDuration60 = 2;
      // let movementCount = 0;

      if (existingPermissions.length > 0) {
        // Count existing permissions for each duration
        const existingDuration15Count = await existingPermissions.filter(
          (permission) => permission.DURATION === "15"
        ).length;
        const existingDuration60Count = await existingPermissions.filter(
          (permission) => permission.DURATION === "60"
        ).length;

        // Update default counts by subtracting existing counts
        permissionsDuration15 -= existingDuration15Count;
        permissionsDuration60 -= existingDuration60Count;
      }
      console.log(
        `Difference: ${hours} hours, ${minutes} minutes, ${seconds} seconds`
      );
      let newPermission = {
        STATUS: "APPROVED",
        EMPID: userExists._id,
        EMPNAME: userExists.EMPNAME,
        GRADE: userExists.GRADE,
        DEPT: userExists.DEPT,
        EMPNO,
        BRCODE,
        REASON: "Auto Deduction By Late Checkin",
        PERMISSIONDATE: newAttendance.LVDT,
        FROMTIME: newAttendance.BRSTARTTIME,
        TOTIME: newAttendance.CHECKINTIME,
        // DURATION: "60",
        ENTRYBY,
        APPROVER: userExists.REPMGR,
      };
      let leavePayload = {
        EMPID: userExists._id,
        GRADE: userExists.GRADE,
        DEPT: userExists.DEPT,
        EMPNAME: userExists.ENAME,
        LVYR: newAttendance.LVDT.getFullYear().toString(),

        FRMSESSION: "FN",
        TOSESSION: "FN",
        LVFRMDT: newAttendance.LVDT,
        LVTODT: newAttendance.LVDT,
        EMPNO,
        BRCODE,

        REASON: "Auto Deducted due to no permission available",
        STATUS: "APPROVED",
        SOURCE: "JLSMART",
        ENTRYBY,
        ENTRYDT: moment().toDate(),
        TYPE: "LEAVE",
        LVFROMTIME: "",
        LVTOTIME: "",
        APPROVER: userExists.REPMGR,
      };
      const createPermission = async (payload) => {
        console.log(
          payload,
          "===================== permission payload ==========================="
        );
        await Permission.create(payload);
      };
      const createLeave = async (payload) => {
        console.log(
          payload,
          "===================== leave payload ==========================="
        );
        await LeaveDetail.create(payload);
      };
      if (hours === 2) {
        if (permissionsDuration60 === 2) {
          for (let i = 1; i <= 2; i++) {
            newPermission.DURATION = "60";
            // Save the new permission request
            createPermission(newPermission);
          }
        } else if (permissionsDuration60 === 1) {
          newPermission.DURATION = "60";
          // Save the new permission request
          createPermission(newPermission);
        } else {
          const balanceEL = await BalanceLeave.findOne({
            PA_ELSTD_LVYR: newAttendance.LVDT.getFullYear().toString(),
            PA_ELSTD_LVCODE: "EL",
          });
          const balanceCL = await BalanceLeave.findOne({
            PA_ELSTD_LVYR: newAttendance.LVDT.getFullYear().toString(),
            PA_ELSTD_LVCODE: "CL",
          });
          if (balanceEL?.PA_ELSTD_BAL > 0) {
            // CHECK IF EL AVAILABLE
            const applicationCount = (await LeaveDetail.countDocuments()) + 1;
            leavePayload.LVAPNO = applicationCount;
            (leavePayload.ISESLVCODE = "EL"),
              (leavePayload.IISESLVCODE = "EL"),
              (leavePayload.LVCODE = "EL"),
              createLeave(leavePayload); // CHANGE IF NEEDED USING APPLY LEAVE API USING AXIOS
            await BalanceLeave.findOneAndUpdate({
              PA_ELSTD_EMPNO,
              PA_ELSTD_LVYR: newAttendance.LVDT.getFullYear().toString(),
              PA_ELSTD_LVCODE: "EL",
              PA_ELSTD_BAL: balanceEL.PA_ELSTD_BAL - 1,
            });
          }
          //  else if (
          //   // CHECK IF CL AVAILABLE
          //   balanceEL.PA_ELSTD_BAL === 0 &&
          //   balanceCL.PA_ELSTD_BAL > 0
          // ) {
          //   const existingAttendanceMaster = await LeaveAttendanceMaster.findOne({
          //     EMPNO,
          //     BRCODE,
          // });
          // if (existingAttendanceMaster) {
          //     const existingRecord = existingAttendanceMaster.attendanceRecords.find(record => moment(record.LVDT).isSame(currentDate, 'day'));
          //     //console.log("==========existingRecord",existingRecord);
          //     if (!existingRecord) {
          //         existingAttendanceMaster.attendanceRecords.push({
          //             LVAPNO: 99999999,
          //             LVYR: moment(LVDT).format('YYYY'),
          //             LVDT,
          //             EMPNO,
          //             EMPNAME: ENAME,
          //             BRCODE,
          //             BRSTARTTIME: branchRecord.BRSTARTTIME,
          //             BRENDTIME: branchRecord.BRENDTIME,
          //             ISESLVCODE,
          //             IISESLVCODE,
          //             LVCODE,
          //             ENTRYBY: '',
          //             ENTRYDT: LVDT,
          //             MODBY: '',
          //             MODDT: LVDT,
          //             SOURCE: 'JLSMART-AUTOLOGOUT',
          //             TYPE: 'ATTENDANCE'
          //         });
          //         await existingAttendanceMaster.save();
          //     }
          // } else {
          //     const newAttendanceMaster = new LeaveAttendanceMaster({
          //         EMPNO,
          //         EMPID: userExists._id,
          //         GRADE:userExists.GRADE,
          //         DEPT:userExists.DEPT,
          //         BRCODE,
          //         attendanceRecords: [{
          //             LVAPNO: 99999999,
          //             LVYR: moment(LVDT).format('YYYY'),
          //             LVDT,
          //             EMPNO,
          //             EMPNAME: ENAME,
          //             BRCODE,
          //             BRSTARTTIME: branchRecord.BRSTARTTIME,
          //             BRENDTIME: branchRecord.BRENDTIME,
          //             ISESLVCODE,
          //             IISESLVCODE,
          //             LVCODE:"LOP",
          //             ENTRYBY: '',
          //             ENTRYDT: LVDT,
          //             MODBY: '',
          //             MODDT: LVDT,
          //             SOURCE: 'JLSMART-AUTOLOGOUT',
          //             TYPE: 'ATTENDANCE'
          //         }]
          //     });
          //     await newAttendanceMaster.save();
          // }
          // }
        }
      } else if (hours === 1) {
        newPermission.DURATION = "60";
        createPermission(newPermission);
      } else if (hours === 0 && minutes > 15 && minutes <= 30) {
        newPermission.DURATION = "15";
        createPermission(newPermission);
      } else if (hours === 0 && minutes > 30 && minutes <= 45) {
        for (let i = 1; i <= 2; i++) {
          newPermission.DURATION = "15";
          // Save the new permission request
          createPermission(newPermission);
        }
      } else if (hours === 0 && minutes > 45 && minutes <= 60) {
        for (let i = 1; i <= 3; i++) {
          newPermission.DURATION = "15";
          // Save the new permission request
          createPermission(newPermission);
        }
      }
    }

    return res.json({
      Status: "Success",
      Message: "Attendance recorded successfully",
      Data: newAttendance,
      Code: 200,
    });
  } catch (error) {
    console.error("Error recording attendance:", error);
    return res.status(500).json({
      Status: "Failed",
      Message: "Internal Server Error",
      Data: {},
      Code: 500,
    });
  }
});

router.post("/leave-list", async (req, res) => {
  try {
    const { EMPNO } = req.body;
    if (!EMPNO) {
      return res.status(400).json({
        Status: "Failed",
        Message: "EMPNO is required",
        Data: {},
        Code: 400,
      });
    }
    const leaveList = await LeaveDetail.find({ EMPNO });
    return res.status(200).json({
      Status: "Success",
      Message: "Leave list retrieved successfully",
      Data: leaveList,
      Code: 200,
    });
  } catch (error) {
    console.error("Error retrieving leave list:", error);
    return res.status(500).json({
      Status: "Failed",
      Message: "Internal Server Error",
      Data: {},
      Code: 500,
    });
  }
});

router.post("/cancel-leave", async (req, res) => {
  try {
    const { _id } = req.body;
    if (!_id) {
      return res.status(400).json({
        Status: "Failed",
        Message: "_id is required",
        Data: {},
        Code: 400,
      });
    }
    const leaveRequest = await LeaveDetail.findById(_id);
    if (!leaveRequest) {
      return res.status(404).json({
        Status: "Failed",
        Message: "Leave request not found",
        Data: {},
        Code: 404,
      });
    }
    if (leaveRequest.STATUS !== "PENDING") {
      return res.status(400).json({
        Status: "Failed",
        Message: "Only pending leave requests can be canceled",
        Data: {},
        Code: 400,
      });
    }
    leaveRequest.STATUS = "CANCELLED";
    leaveRequest.MODDT = moment().toDate();
    await leaveRequest.save();
    return res.status(200).json({
      Status: "Success",
      Message: "Leave request canceled successfully",
      Data: leaveRequest,
      Code: 200,
    });
  } catch (error) {
    console.error("Error canceling leave request:", error);
    return res.status(500).json({
      Status: "Failed",
      Message: "Internal Server Error",
      Data: {},
      Code: 500,
    });
  }
});

router.post("/available-leaves", async (req, res) => {
  try {
    const { EMPNO } = req.body;
    if (!EMPNO) {
      return res.status(400).json({
        Status: "Failed",
        Message: "EMPNO is required",
        Data: {},
        Code: 400,
      });
    }
    const currentYearLastTwoDigits = moment().format("YY");
    const leaveList = await BalanceLeave.find({
      PA_ELSTD_EMPNO: EMPNO,
      PA_ELSTD_LVYR: currentYearLastTwoDigits,
    });

    // Define the types of leave
    const leaveTypes = ["SL", "CL", "EL", "ML", "CO"];

    // Initialize availableLeaves object with default values as 0 for all leave types
    const availableLeaves = {};
    leaveTypes.forEach((type) => {
      availableLeaves[type] = 0;
    });

    let totalBalanceLeaves = 0;
    let totalUsedLeaves = 0;

    leaveList.forEach((leave) => {
      const { PA_ELSTD_LVCODE, PA_ELSTD_BAL, PA_ELSTD_AVD } = leave;
      if (PA_ELSTD_LVCODE in availableLeaves) {
        availableLeaves[PA_ELSTD_LVCODE] = PA_ELSTD_BAL;
      }
      totalBalanceLeaves += PA_ELSTD_BAL;
      totalUsedLeaves += PA_ELSTD_AVD;
    });

    const currentMonthStart = moment().startOf("month");
    const currentMonthEnd = moment().endOf("month");
    const existingPermissions = await Permission.find({
      EMPNO,
      STATUS: "APPROVED",
      PERMISSIONDATE: {
        $gte: currentMonthStart.toDate(),
        $lte: currentMonthEnd.toDate(),
      },
    });
    console.log("===========existingPermissions", existingPermissions);
    let permissionsDuration15 = 3;
    let permissionsDuration60 = 2;
    let movementCount = 0;

    if (existingPermissions.length > 0) {
      // Count existing permissions for each duration
      const existingDuration15Count = existingPermissions.filter(
        (permission) => permission.DURATION === "15"
      ).length;
      const existingDuration60Count = existingPermissions.filter(
        (permission) => permission.DURATION === "60"
      ).length;

      // Update default counts by subtracting existing counts
      permissionsDuration15 -= existingDuration15Count;
      permissionsDuration60 -= existingDuration60Count;
    }

    // Calculate movement count from LeaveAttendanceMaster
    const movementEntries = await LeaveDetail.find({
      EMPNO,
      ENTRYDT: {
        $gte: currentMonthStart.toDate(),
        $lte: currentMonthEnd.toDate(),
      },
      TYPE: "MOVEMENT",
    });

    if (movementEntries.length > 0) {
      movementCount = movementEntries.length;
    }

    availableLeaves["PermissionsDuration15"] = permissionsDuration15;
    availableLeaves["PermissionsDuration60"] = permissionsDuration60;
    availableLeaves["movementCount"] = movementCount;

    const employeeDetails = await EmployeeMaster.findOne({ EMPNO }).select(
      "ENAME"
    );
    console.log("========employeeDetails", employeeDetails, EMPNO);
    let totalLeaves = totalBalanceLeaves + totalUsedLeaves;
    return res.status(200).json({
      Status: "Success",
      Message: "Available leave details retrieved successfully",
      Data: {
        EMPNO,
        EMPNAME: employeeDetails.ENAME,
        ...availableLeaves,
        totalBalanceLeaves,
        totalUsedLeaves,
        totalLeaves,
      },
      Code: 200,
    });
  } catch (error) {
    console.error("Error retrieving available leave details:", error);
    return res.status(500).json({
      Status: "Failed",
      Message: "Internal Server Error",
      Data: {},
      Code: 500,
    });
  }
});

router.post("/check-status", async (req, res) => {
  try {
    const { EMPNO } = req.body;
    if (!EMPNO) {
      return res.status(400).json({
        Status: "Failed",
        Message: "EMPNO is required",
        Data: {},
        Code: 400,
      });
    }
    const employeeDetails = await EmployeeMaster.findOne({ EMPNO }).select(
      "LASTLOGIN BRCODE REPMGRSTATUS ORIGINALPHOTO LASTLOGOUT"
    );
    //console.log("========employeeDetails",employeeDetails, req.body);
    if (!employeeDetails) {
      return res.status(400).json({
        Status: "Failed",
        Message: "EmployeeDetails not found",
        Data: {},
        Code: 400,
      });
    }

    let LASTLOGINTIME;
    if (employeeDetails.LASTLOGIN && employeeDetails.LASTLOGIN != undefined) {
      LASTLOGINTIME = employeeDetails.LASTLOGIN;
    } else {
      LASTLOGINTIME = "  ";
    }

    let LASTLOGOUTTIME;
    if (employeeDetails.LASTLOGOUT && employeeDetails.LASTLOGOUT != undefined) {
      LASTLOGOUTTIME = new Date(employeeDetails.LASTLOGOUT).toLocaleString();
    } else {
      LASTLOGOUTTIME = "--";
    }
    console.log(
      LASTLOGOUTTIME,
      "=================== LASTLOGOUTTIME =================="
    );
    let HRNAME = "JOHNSON HR";
    let HRPHONE = "261520003";
    let HREMPNO = "";
    const branchAdminDetails = await admin_accessModel.find({
      type: "HRSUBADMIN",
    });
    //console.log("=========branchAdminDetails",branchAdminDetails);
    const filteredBranchAdminDetails = branchAdminDetails.find((details) => {
      return details.access_location.some(
        (location) => location.BRCODE === employeeDetails.BRCODE
      );
    });

    if (filteredBranchAdminDetails) {
      HRNAME = filteredBranchAdminDetails.firstname;
      HRPHONE = filteredBranchAdminDetails.mobile_no;
      HREMPNO = filteredBranchAdminDetails.user_name;
    }

    const today = moment().startOf("day");
    const tomorrow = moment(today).add(1, "days");
    const trackingCount = await TrackingNotification.countDocuments({
      EMPNO,
      TYPE: "REPORTINGUSER",
      DATE: {
        $gte: today.toDate(),
        $lt: tomorrow.toDate(),
      },
    });

    let responseData = {
      LASTLOGIN: new Date(LASTLOGINTIME).toLocaleString(),
      LASTLOGOUT: LASTLOGOUTTIME,
      ORIGINALPHOTO: employeeDetails.ORIGINALPHOTO,
      HRNAME: HRNAME,
      HRPHONE: HRPHONE,
      HREMPNO: HREMPNO ? HREMPNO : "",
      REPMGRSTATUS: employeeDetails.REPMGRSTATUS,
      PENDINGCOUNT: 0,
      TRACKINGCOUNT: trackingCount ? trackingCount : 0,
    };

    if (employeeDetails.REPMGRSTATUS == "YES") {
      const pendingPermissionsCount = await Permission.countDocuments({
        APPROVER: EMPNO,
        STATUS: "PENDING",
      });
      const pendingLeaveDetailsCount = await LeaveDetail.countDocuments({
        APPROVER: EMPNO,
        STATUS: "PENDING",
        //LVCODE: { $nin: ["OD", "OS"] }, // added recently
      });
      responseData.PENDINGCOUNT += pendingPermissionsCount;
      responseData.PENDINGCOUNT += pendingLeaveDetailsCount;
    }

    //const currentDate = moment().startOf('day').format('YYYY-MM-DD');
    const startOfDay = moment().startOf("day");
    const endOfDay = moment().endOf("day");

    const attendanceRecord = await EmployeeAttendance.findOne({
      EMPNO,
      LVDT: { $gte: startOfDay.toDate(), $lte: endOfDay.toDate() },
    }).sort({ ENTRYDT: -1 });
    console.log("=======startOfDay", startOfDay);
    console.log("=======endOfDay", endOfDay);
    console.log("=======attendanceRecord", attendanceRecord);
    if (!attendanceRecord) {
      responseData.CHECKINSTATUS = false;
      responseData.CHECKOUTSTATUS = false;
      return res.status(200).json({
        Status: "Success",
        Message: "Attendance record retrieved successfully",
        Data: responseData,
        Code: 200,
      });
    }

    const { CHECKINSTATUS, CHECKOUTSTATUS } = attendanceRecord;
    responseData.CHECKINSTATUS = CHECKINSTATUS;
    responseData.CHECKOUTSTATUS = CHECKOUTSTATUS;
    console.log("=======responseData", responseData);
    return res.status(200).json({
      Status: "Success",
      Message: "Attendance record retrieved successfully",
      Data: responseData,
      Code: 200,
    });
  } catch (error) {
    console.error("Error retrieving attendance record:", error);
    return res.status(500).json({
      Status: "Failed",
      Message: "Internal Server Error",
      Data: {},
      Code: 500,
    });
  }
});

router.post("/employee-image-validation", async (req, res) => {
  try {
    const { EMPNO, EMPIMAGE } = req.body;
    if (!EMPNO) {
      return res.status(400).json({
        Status: "Failed",
        Message: "EMPNO is required",
        Data: {},
        Code: 400,
      });
    }
    const userExists = await EmployeeMaster.findOne({ ECODE: EMPNO });
    if (!userExists) {
      return res.status(404).json({
        Status: "Failed",
        Message: "User with provided EMPNO does not exist",
        Data: {},
        Code: 404,
      });
    }
    return res.status(200).json({
      Status: "Success",
      Message: "Valid Employee",
      Data: {},
      Code: 200,
    });
  } catch (error) {
    console.error("Error retrieving attendance record:", error);
    return res.status(500).json({
      Status: "Failed",
      Message: "Internal Server Error",
      Data: {},
      Code: 500,
    });
  }
});

router.post("/update-employee-photo", async (req, res) => {
  try {
    const { ECODE, ORIGINALPHOTO } = req.body;
    if (!ECODE || !ORIGINALPHOTO) {
      return res.status(400).json({
        Status: "Failed",
        Message: "ECODE and ORIGINALPHOTO are required fields",
        Data: {},
        Code: 400,
      });
    }
    const employee = await EmployeeMaster.findOne({ ECODE });
    if (!employee) {
      return res.status(404).json({
        Status: "Failed",
        Message: "Employee with the provided ECODE does not exist",
        Data: {},
        Code: 404,
      });
    }
    employee.ORIGINALPHOTO = ORIGINALPHOTO;
    await employee.save();

    return res.status(200).json({
      Status: "Success",
      Message: "Employee photo updated successfully",
      Data: employee,
      Code: 200,
    });
  } catch (error) {
    console.error("Error updating employee photo:", error);
    return res.status(500).json({
      Status: "Failed",
      Message: "Internal Server Error",
      Data: {},
      Code: 500,
    });
  }
});

// Not in use we use leave-permission-action
// router.post("/leave-action", async (req, res) => {
//     try {
//       const { LEAVEID, ACTION, LVSANCBY } = req.body;
//       const today = moment().toDate();
//       const leaveRequest = await LeaveDetail.findById(LEAVEID);
//       if (!leaveRequest) {
//         return res.status(404).json({
//             Status: "Failed",
//             Message: "Leave request not found",
//             Code: 404,
//           });
//       }

//       if (leaveRequest.STATUS === "APPROVED" || leaveRequest.STATUS === "REJECTED") {
//         return res.status(400).json({
//           Status: "Failed",
//           Message: "Leave request has already been processed",
//           Code: 400,
//         });
//       }

//       if (ACTION === "APPROVED") {
//         const employeeExists = await validateUserExistence(leaveRequest.EMPNO);
//         if (!employeeExists) {
//             return res.status(404).json({
//                 Status: "Failed",
//                 Message: "Employee does not exist",
//                 Code: 404,
//             });
//         }

//         const isGradeE3OrBelow = (employeeExists.GRADE <= 'E3');
//         const lvYear = leaveRequest.LVFRMDT.getFullYear().toString();
//         const leaveBalanceValidation = await validateLeaveBalance(leaveRequest.EMPNO, leaveRequest.LVCODE, lvYear, leaveRequest.LVTODT, leaveRequest.LVFRMDT, isGradeE3OrBelow);
//         if (leaveBalanceValidation) {
//             return res.status(400).json({
//                 Status: "Failed",
//                 Message: leaveBalanceValidation,
//                 Code: 400,
//             });
//         }

//         const leaveSandwichValidation = await validateLeaveSandwich(leaveRequest.EMPNO, leaveRequest.LVCODE, leaveRequest.LVFRMDT, leaveRequest.LVTODT, isGradeE3OrBelow);
//         if (leaveSandwichValidation) {
//             return res.status(400).json({
//                 Status: "Failed",
//                 Message: leaveSandwichValidation,
//                 Code: 400,
//             });
//         }
//     }

//       leaveRequest.STATUS = ACTION;
//       leaveRequest.LVSANCBY = LVSANCBY || null;
//       leaveRequest.LVSANCDT = today;
//       leaveRequest.MODBY = LVSANCBY || "";
//       leaveRequest.MODDT = today;
//       await leaveRequest.save();

//       return res.status(200).json({
//           Status: "Success",
//           Message: `Leave request ${ACTION} successfully`,
//           Data: leaveRequest,
//           Code: 200,
//         });
//     } catch (error) {
//       console.error("Error processing leave action:", error);
//       return res.status(500).json({ Status: "Failed", Message: "Internal Server Error", Code: 500 });
//     }
// });

router.post("/getAllHolidays", async (req, res) => {
  try {
    const { BRCODE } = req.body;
    const currentyear = moment().year();
    const holidays = await Holiday.find({
      BRCODE: BRCODE,
      HLDYYR: currentyear,
    }).sort({ HLDYDT: 1 });
    return res.status(200).json({
      Status: "Success",
      Message: `Holidays list`,
      Data: holidays,
      Code: 200,
    });
  } catch (error) {
    console.error("Error filtering holidays:", error);
    return res
      .status(500)
      .json({ Status: "Failed", Message: "Internal Server Error", Code: 500 });
  }
});

router.post("/apply-permission", async (req, res) => {
  try {
    const {
      EMPNO,
      BRCODE,
      REASON,
      PERMISSIONDATE,
      FROMTIME,
      TOTIME,
      DURATION,
      ENTRYBY,
    } = req.body;
    console.log("=========req.body", req.body);

    // Check if all required fields are provided
    if (
      !EMPNO ||
      !BRCODE ||
      !PERMISSIONDATE ||
      !FROMTIME ||
      !TOTIME ||
      !DURATION ||
      !ENTRYBY
    ) {
      console.log(
        "=========ENTRYBY",
        EMPNO,
        BRCODE,
        REASON,
        PERMISSIONDATE,
        FROMTIME,
        TOTIME,
        DURATION,
        ENTRYBY
      );
      return res.status(400).json({
        Status: "Failed",
        Message: "Missing required fields in request body",
        Code: 400,
      });
    }
    const permissionDate = moment(PERMISSIONDATE, "DD-MM-YYYY").toDate();
    const userExists = await EmployeeMaster.findOne({ EMPNO });
    if (!userExists) {
      return res.status(404).json({
        Status: "Failed",
        Message: "User with provided EMPNO does not exist",
        Data: {},
        Code: 404,
      });
    }

    const branch = await BranchMaster.findOne({ BRCODE });
    if (!branch) {
      return res.status(404).json({
        Status: "Failed",
        Message: "Branch with provided BRCODE does not exist",
        Data: {},
        Code: 404,
      });
    }

    const branchWorkingHours = {
      start: branch.BRSTARTTIME,
      end: branch.BRENDTIME,
    };
    console.log(
      "==========",
      FROMTIME,
      branchWorkingHours.start,
      branchWorkingHours.end
    );
    console.log(
      "=====TOTIME=====",
      TOTIME,
      branchWorkingHours.start,
      branchWorkingHours.end,
      convertTo24HourFormat(FROMTIME)
    );
    if (
      !isTimeWithinRange(
        convertTo24HourFormat(FROMTIME),
        branchWorkingHours.start,
        branchWorkingHours.end
      ) ||
      !isTimeWithinRange(
        convertTo24HourFormat(TOTIME),
        branchWorkingHours.start,
        branchWorkingHours.end
      )
    ) {
      return res.status(400).json({
        Status: "Failed",
        Message: "Permission time must fall within branch working hours",
        Code: 400,
      });
    }

    // Validate DURATION
    if (DURATION !== "15" && DURATION !== "60" && DURATION !== "120") {
      return res.status(400).json({
        Status: "Failed",
        Message: 'Invalid Duration. Must be either "15" or "60"',
        Code: 400,
      });
    }

    // Validate FROMTIME and TOTIME based on DURATION
    const durationInMinutes = parseInt(DURATION);
    const fromTimeMoment = moment(FROMTIME, "HH:mm");
    const toTimeMoment = moment(TOTIME, "HH:mm");
    const diffMinutes = toTimeMoment.diff(fromTimeMoment, "minutes");

    if (diffMinutes > durationInMinutes) {
      return res.status(400).json({
        Status: "Failed",
        Message: `Invalid Start Time and To Time. The duration must be ${DURATION} minutes`,
        Code: 400,
      });
    }
    const currentMonthStart = moment().startOf("month");
    const currentMonthEnd = moment().endOf("month");
    // const existingPermissions = await Permission.countDocuments({
    //     EMPNO,
    //     STATUS: 'APPROVED',
    //     PERMISSIONDATE: {
    //         $gte: currentMonthStart.toDate(),
    //         $lte: currentMonthEnd.toDate()
    //     }
    // });
    const existingPermissions = await Permission.find({
      EMPNO,
      STATUS: "APPROVED",
      PERMISSIONDATE: {
        $gte: currentMonthStart.toDate(),
        $lte: currentMonthEnd.toDate(),
      },
    });

    console.log("============existingPermissions", existingPermissions);
    let totalApprovedDuration = 0;
    const filteredPermissions = existingPermissions.filter(
      (perm) => perm.DURATION !== "15"
    );
    if (existingPermissions) {
      totalApprovedDuration = filteredPermissions.reduce(
        (total, perm) => total + parseInt(perm.DURATION),
        0
      );
    }
    if (
      (DURATION === "15" &&
        existingPermissions.filter((perm) => perm.DURATION === "15").length >=
          3) ||
      (DURATION === "60" &&
        existingPermissions.filter((perm) => perm.DURATION === "60").length >=
          2) ||
      (DURATION === "120" &&
        existingPermissions.filter((perm) => perm.DURATION === "120").length >=
          1) ||
      (DURATION === "60" &&
        existingPermissions.filter((perm) => perm.DURATION === "120").length >=
          1) ||
      (DURATION === "120" &&
        existingPermissions.filter((perm) => perm.DURATION === "60").length >=
          1) ||
      totalApprovedDuration + durationInMinutes > 120
    ) {
      return res.status(400).json({
        Status: "Failed",
        Message:
          "Employee has already applied for the maximum number of permissions for the current month",
        Code: 400,
      });
    }
    console.log("============DURATION", DURATION);
    const overlappingPermission = await Permission.findOne({
      EMPNO,
      PERMISSIONDATE: permissionDate,
      $or: [
        {
          $and: [
            { FROMTIME: { $lte: FROMTIME } },
            { TOTIME: { $gte: FROMTIME } },
          ],
        },
        {
          $and: [{ FROMTIME: { $lte: TOTIME } }, { TOTIME: { $gte: TOTIME } }],
        },
        {
          $and: [
            { FROMTIME: { $gte: FROMTIME } },
            { TOTIME: { $lte: TOTIME } },
          ],
        },
      ],
    });

    if (overlappingPermission) {
      return res.status(400).json({
        Status: "Failed",
        Message: "Permission time overlaps with an existing permission",
        Code: 400,
      });
    }

    const newPermission = new Permission({
      EMPID: userExists._id,
      EMPNAME: userExists.EMPNAME,
      GRADE: userExists.GRADE,
      DEPT: userExists.DEPT,
      EMPNO,
      BRCODE,
      REASON,
      PERMISSIONDATE: permissionDate,
      FROMTIME,
      TOTIME,
      DURATION,
      ENTRYBY,
      APPROVER: userExists.REPMGR,
    });

    // Save the new permission request
    await newPermission.save();

    // Return success response
    return res.status(200).json({
      Status: "Success",
      Message: "Permission request created successfully",
      Data: newPermission,
      Code: 200,
    });
  } catch (error) {
    console.error("Error creating permission request:", error);
    return res.status(500).json({
      Status: "Failed",
      Message: "Internal Server Error",
      Data: {},
      Code: 500,
    });
  }
});

router.post("/permission-durations", async (req, res) => {
  try {
    const { EMPNO } = req.body;

    const permissions = await Permission.find({
      EMPNO,
      STATUS: "APPROVED",
      PERMISSIONDATE: {
        $gte: moment().startOf("month").toDate(),
        $lte: moment().endOf("month").toDate(),
      },
    });

    let durations = [
      { DURATION: "15", DESCRIPTION: "15 Min" },
      { DURATION: "15", DESCRIPTION: "15 Min" },
      { DURATION: "15", DESCRIPTION: "15 Min" },
      { DURATION: "60", DESCRIPTION: "1 Hr" },
      { DURATION: "60", DESCRIPTION: "1 Hr" },
      {
        DURATION: "120",
        DESCRIPTION: "2 Hr (You can avail 2 * 1 Hr Or 1 * 2 Hr)",
      },
    ];

    if (permissions.length === 0) {
      return res.status(200).json({
        Status: "Success",
        Message:
          "No approved permissions found for the current month. Showing all durations.",
        Data: durations,
        Code: 200,
      });
    }

    permissions.forEach((permission) => {
      const index = durations.findIndex(
        (duration) => duration.DURATION === permission.DURATION
      );
      if (index !== -1) {
        durations.splice(index, 1);
      }
    });

    return res.status(200).json({
      Status: "Success",
      Message: "Available permission durations retrieved successfully",
      Data: durations,
      Code: 200,
    });
  } catch (error) {
    console.error("Error retrieving available permission durations:", error);
    return res.status(500).json({
      Status: "Failed",
      Message: "Internal Server Error",
      Data: [],
      Code: 500,
    });
  }
});

// Not in use we use leave-permission-action
// router.post("/permission-action", async (req, res) => {
//     try {
//         const { PERMISSIONID, ACTION, REPMGR } = req.body;
//         const today = moment().toDate();

//         const permissionRequest = await Permission.findById(PERMISSIONID);
//         if (!permissionRequest) {
//             return res.status(404).json({
//                 Status: "Failed",
//                 Message: "Permission request not found",
//                 Code: 404,
//             });
//         }
//         if (permissionRequest.STATUS === "APPROVED" || permissionRequest.STATUS === "REJECTED") {
//             return res.status(400).json({
//                 Status: "Failed",
//                 Message: "Permission request has already been processed",
//                 Code: 400,
//             });
//         }
//         permissionRequest.STATUS = ACTION;
//         permissionRequest.SANCBY = REPMGR;
//         permissionRequest.SANCDT = today;
//         permissionRequest.MODBY = REPMGR || "";
//         permissionRequest.MODDT = today;

//         Save the updated permission request
//         await permissionRequest.save();

//         return res.status(200).json({
//             Status: "Success",
//             Message: `Permission request ${ACTION} successfully`,
//             Data: permissionRequest,
//             Code: 200,
//         });
//     } catch (error) {
//         console.error("Error processing permission action:", error);
//         return res.status(500).json({
//             Status: "Failed",
//             Message: "Internal Server Error",
//             Code: 500
//         });
//     }
// });

router.post("/permission-list", async (req, res) => {
  try {
    const { EMPNO } = req.body;
    if (!EMPNO) {
      return res.status(400).json({
        Status: "Failed",
        Message: "EMPNO is required",
        Data: {},
        Code: 400,
      });
    }
    const leaveList = await Permission.find({ EMPNO });
    return res.status(200).json({
      Status: "Success",
      Message: "Leave list retrieved successfully",
      Data: leaveList,
      Code: 200,
    });
  } catch (error) {
    console.error("Error retrieving leave list:", error);
    return res.status(500).json({
      Status: "Failed",
      Message: "Internal Server Error",
      Data: {},
      Code: 500,
    });
  }
});

router.post("/movement-list", async (req, res) => {
  try {
    const { EMPNO } = req.body;
    if (!EMPNO) {
      return res.status(400).json({
        Status: "Failed",
        Message: "EMPNO is required",
        Data: {},
        Code: 400,
      });
    }
    const leaveList = await LeaveDetail.find({ EMPNO, TYPE: "MOVEMENT" });
    return res.status(200).json({
      Status: "Success",
      Message: "Leave list retrieved successfully",
      Data: leaveList,
      Code: 200,
    });
  } catch (error) {
    console.error("Error retrieving leave list:", error);
    return res.status(500).json({
      Status: "Failed",
      Message: "Internal Server Error",
      Data: {},
      Code: 500,
    });
  }
});

router.get("/logoutReason", function (req, res) {
  var StateList = [
    {
      logout_reason: "LUNCH BREAK",
    },
    {
      logout_reason: "DAY OUT",
    },
  ];
  res.json({
    Status: "Success",
    Message: "LOGOUT REASON",
    Data: StateList,
    Code: 200,
  });
});

router.post("/approver-list", async (req, res) => {
  try {
    const { EMPNO } = req.body;
    if (!EMPNO) {
      return res.status(400).json({
        Status: "Failed",
        Message: "EMPNO is required",
        Data: [],
        Code: 400,
      });
    }
    const leaveListPromise = LeaveDetail.find({
      APPROVER: EMPNO,
      //LVCODE: { $nin: ["OD", "OS"] },
    });
    const permissionListPromise = Permission.find({ APPROVER: EMPNO });

    const [leaveList, permissionList] = await Promise.all([
      leaveListPromise,
      permissionListPromise,
    ]);

    if (leaveList.length === 0 && permissionList.length === 0) {
      return res.status(200).json({
        Status: "Success",
        Message: "No records found for the approver",
        Data: [],
        Code: 200,
      });
    }

    const responseData = [];

    // Process leaveList
    await Promise.all(
      leaveList.map(async (leave) => {
        const type =
          leaveCodes.find((code) => code.LVCODE === leave.LVCODE)?.LVDESC ||
          "Leave";
        const employee = await EmployeeMaster.findOne({ EMPNO: leave.EMPNO });
        let employeeName = "";
        if (employee) {
          employeeName = employee.ENAME;
        }
        const formattedLeave = {
          TYPE: type,
          _id: leave._id,
          EMPNO: leave.EMPNO,
          EMPNAME: employeeName,
          LVCODE: leave.LVCODE,
          LVDESC: leave.LVDESC,
          LVAPNO: leave.LVAPNO,
          LVYR: leave.LVYR,
          LVFRMDT: leave.LVFRMDT,
          LVTODT: leave.LVTODT,
          FRMSESSION: leave.FRMSESSION,
          TOSESSION: leave.TOSESSION,
          REASON: leave.REASON,
          STATUS: leave.STATUS,
          APPROVER: leave.APPROVER,
          createdAt: leave.createdAt,
          updatedAt: leave.updatedAt,
        };
        responseData.push(formattedLeave);
      })
    );

    // Process permissionList
    await Promise.all(
      permissionList.map(async (permission) => {
        const employee = await EmployeeMaster.findOne({
          EMPNO: permission.EMPNO,
        });
        let employeeName = "";
        if (employee) {
          employeeName = employee.ENAME;
        }
        const formattedPermission = {
          TYPE: "Permission",
          _id: permission._id,
          EMPNO: permission.EMPNO,
          EMPNAME: employeeName,
          PERMISSIONDATE: permission.PERMISSIONDATE,
          FROMTIME: permission.FROMTIME,
          TOTIME: permission.TOTIME,
          DURATION: permission.DURATION,
          REASON: permission.REASON,
          STATUS: permission.STATUS,
          APPROVER: permission.APPROVER,
          createdAt: permission.createdAt,
          updatedAt: permission.updatedAt,
        };
        responseData.push(formattedPermission);
      })
    );
    responseData.sort((a, b) => {
      if (a.STATUS === "PENDING" && b.STATUS !== "PENDING") {
        return -1;
      } else if (a.STATUS !== "PENDING" && b.STATUS === "PENDING") {
        return 1;
      } else {
        return 0;
      }
    });
    return res.status(200).json({
      Status: "Success",
      Message: "Approver records retrieved successfully",
      Data: responseData,
      Code: 200,
    });
  } catch (error) {
    console.error("Error retrieving approver records:", error);
    return res.status(500).json({
      Status: "Failed",
      Message: "Internal Server Error",
      Data: [],
      Code: 500,
    });
  }
});

router.post("/leave-permission-action", async (req, res) => {
  try {
    const { TYPE, ID, ACTION, EMPLOYEE_ID } = req.body;
    const today = moment().toDate();
    console.log("====request", req.body);
    let request;
    if (TYPE === "Permission") {
      request = await Permission.findById(ID);
      if (!request) {
        return res.status(404).json({
          Status: "Failed",
          Message: "Permission request not found",
          Code: 404,
        });
      }
    } else {
      request = await LeaveDetail.findById(ID);
      if (!request) {
        return res.status(404).json({
          Status: "Failed",
          Message: "Leave request not found",
          Code: 404,
        });
      }
    }
    console.log("====request", request);
    // Check if the request has already been approved or rejected
    if (request.STATUS === "APPROVED" || request.STATUS === "REJECTED") {
      return res.status(400).json({
        Status: "Failed",
        Message: "Request has already been processed",
        Code: 400,
      });
    }

    // Update request details based on type
    if (TYPE === "Permission") {
      request.STATUS = ACTION;
      request.SANCBY = EMPLOYEE_ID;
      request.SANCDT = today;
      request.MODBY = EMPLOYEE_ID || "";
      request.MODDT = today;
    } else {
      if (
        ACTION === "APPROVED" &&
        request.LVCODE != "OD" &&
        request.LVCODE != "OS"
      ) {
        const employeeExists = await validateUserExistence(request.EMPNO);
        if (!employeeExists) {
          return res.status(404).json({
            Status: "Failed",
            Message: "Employee does not exist",
            Code: 404,
          });
        }
        const isGradeE3OrBelow = employeeExists.GRADE <= "E3";
        const lvYear = request.LVFRMDT.getFullYear().toString();
        const leaveBalanceValidation = await validateLeaveBalance(
          request.EMPNO,
          request.LVCODE,
          lvYear,
          request.LVTODT,
          request.LVFRMDT,
          isGradeE3OrBelow
        );
        if (leaveBalanceValidation) {
          return res.status(400).json({
            Status: "Failed",
            Message: leaveBalanceValidation,
            Code: 400,
          });
        }

        const leaveSandwichValidation = await validateLeaveSandwich(
          request.EMPNO,
          request.LVCODE,
          request.LVFRMDT,
          request.LVTODT,
          isGradeE3OrBelow
        );
        if (leaveSandwichValidation) {
          return res.status(400).json({
            Status: "Failed",
            Message: leaveSandwichValidation,
            Code: 400,
          });
        }
      }
      request.STATUS = ACTION;
      request.LVSANCBY = EMPLOYEE_ID || null;
      request.LVSANCDT = today;
      request.MODBY = EMPLOYEE_ID || "";
      request.MODDT = today;
    }

    // Save the updated request
    await request.save();

    return res.status(200).json({
      Status: "Success",
      Message: `${TYPE} request ${ACTION} successfully`,
      Data: request,
      Code: 200,
    });
  } catch (error) {
    console.error(`Error processing ${TYPE} action:`, error);
    return res.status(500).json({
      Status: "Failed",
      Message: "Internal Server Error",
      Code: 500,
    });
  }
});

router.post("/compensatoryOffEntriesByApprover", async (req, res) => {
  try {
    // Validate approverId
    const { approverId } = req.body;
    if (!approverId) {
      return res.status(400).json({
        Status: "Failed",
        Message: "Approver ID is required",
        Code: 400,
      });
    }
    const compensatoryOffEntries = await CompensatoryOff.find({
      APPROVER: approverId,
    });
    res.json({
      Status: "Success",
      Code: 200,
      Message: "Compensatory off entries retrieved successfully",
      Data: compensatoryOffEntries,
    });
  } catch (error) {
    // Handle errors
    console.error("Error fetching compensatory off entries:", error);
    res.status(500).json({
      Status: "Failed",
      Message: "Internal Server Error",
      Code: 500,
    });
  }
});

router.post("/compensatoryOffAction", async (req, res) => {
  try {
    // Validate request parameters
    const { entryId, action, approverId } = req.body;
    if (!entryId || !action) {
      return res.status(400).json({
        Status: "Failed",
        Message: "Entry ID and Action are required",
        Code: 400,
      });
    }

    // Check if the action is valid
    if (action !== "APPROVED" && action !== "REJECTED") {
      return res.status(400).json({
        Status: "Failed",
        Message: "Invalid action. Valid actions are APPROVED or REJECTED",
        Code: 400,
      });
    }

    const compensatoryOffEntry = await CompensatoryOff.findById(entryId);
    if (!compensatoryOffEntry) {
      return res.status(404).json({
        Status: "Failed",
        Message: "Compensatory off entry not found",
        Code: 404,
      });
    }
    compensatoryOffEntry.STATUS = action;
    compensatoryOffEntry.SANCBY = approverId;
    compensatoryOffEntry.SANCDT = moment().toDate();
    await compensatoryOffEntry.save();
    res.json({
      Status: "Success",
      Code: 200,
      Message: `Compensatory off entry ${action.toLowerCase()} successfully`,
      Data: compensatoryOffEntry,
    });
  } catch (error) {
    // Handle errors
    console.error("Error handling compensatory off action:", error);
    res.status(500).json({
      Status: "Failed",
      Message: "Internal Server Error",
      Code: 500,
    });
  }
});

router.post("/getimage", async (req, res) => {
  try {
    // Validate approverId

    res.json({
      Status: "Success",
      Code: 200,
      Message: "retrieved successfully",
      Data: "https://smart.johnsonliftsltd.com:3000/api/johnson.jpeg",
    });
  } catch (error) {
    // Handle errors
    console.error("Error fetching:", error);
    res.status(500).json({
      Status: "Failed",
      Message: "Internal Server Error",
      Code: 500,
    });
  }
});

router.post("/hidecheckin", async (req, res) => {
  try {
    const serviceUsers = await ServiceUserDetails.findOne({
      user_id: req.body.EMPNO,
      emp_type: {
        $in: [
          "Engineer",
          "JIC Tech",
          "Mechanic",
          "Repair Engineer",
          "Repair Mechanic",
          "SESA (Service Sales)",
          "Service Head",
          "Van User",
        ],
      },
    });
    const operationUsers = await UserManagement.findOne({
      agent_code: req.body.EMPNO,
      user_designation: { $in: ["Mobile User", "Oper Tech"] },
    });

    if (serviceUsers || operationUsers) {
      res.json({
        Status: "Success",
        Code: 200,
        Message: "retrieved successfully",
        Data: false,
      });
    } else {
      res.json({
        Status: "Success",
        Code: 200,
        Message: "retrieved successfully",
        Data: true,
      });
    }
  } catch (error) {
    // Handle errors
    console.error("Error fetching:", error);
    res.status(500).json({
      Status: "Failed",
      Message: "Internal Server Error",
      Code: 500,
    });
  }
});

router.post("/holidayCheckin", async (req, res) => {
  try {
    const data = await EmployeeMaster.findOneAndUpdate(
      {
        EMPNO: req.body.EMPNO,
      },
      { $set: { isHolidayCheckIn: req.body.status } }
    );

    res.json({
      Status: "Success",
      Code: 200,
      Message: "Updated SuccessFully",
      Data: {},
    });
  } catch (error) {
    // Handle errors
    console.error("Error fetching:", error);
    res.status(500).json({
      Status: "Failed",
      Message: "Internal Server Error",
      Code: 500,
    });
  }
});

router.post("/cancel-request", async (req, res) => {
  try {
    const { TYPE, ID, ACTION, EMPLOYEE_ID } = req.body;
    const today = moment().startOf("day").toDate();
    const today_endDate = moment().endOf("day").toDate();
    const startOfTomorrow = moment().add(1, "day").startOf("day").toISOString();
    console.log(
      startOfTomorrow,
      "================= startOfTomorrow =================="
    );
    console.log(
      req.body,
      "======================= req.body =========================="
    );
    console.log(
      new Date(startOfTomorrow),
      "==================new Date(startOfTomorrow)=============="
    );
    const request_future = await LeaveDetail.findOne({
      _id: new mongoose.Types.ObjectId(ID),
      LVFRMDT: { $gte: new Date(startOfTomorrow) },
    });
    // const request_today = await LeaveDetail.findOne({
    //   _id: new mongoose.Types.ObjectId(ID),
    //   LVFRMDT: { $gte: new Date(today),$lte:new Date(today_endDate) },
    //   STATUS:"PENDING"
    // });
    console.log(
      request_future,
      "================== request_future =================="
    );
    if (!request_future) {
      return res.status(404).json({
        Status: "Failed",
        Message: "Can't Cancel Leave request",
        Data: [],
        Code: 404,
      });
    }
    console.log(ID, "================= ID ==================");
    console.log(
      startOfTomorrow,
      "================= startOfTomorrow =================="
    );
    data = await LeaveDetail.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(ID),
        LVFRMDT: { $gte: new Date(startOfTomorrow) },
      },
      {
        $set: { STATUS: "CANCELLED" },
      }
    );
    return res.status(200).json({
      Status: "Success",
      Message: "Leave Cancelled Successfully",
      Data: {},
      Code: 200,
    });
  } catch (error) {
    console.log(error, "error");
  }
});

module.exports = router;

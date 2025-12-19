const express = require("express");
const router = express.Router();
const bodyParser = require("body-parser");
router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());
const baseURL = process.env.BASE_URL;
const googleMapKey = process.env.GOOGLE_MAP_KEY;
const dates = require("date-and-time");
const request = require("request");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
const { executeOracleQuery } = require("../../config/oracle");
const mongoose = require("mongoose");
const { generateTravelSummaryPDF } = require("./generate_pdf");
const { generateTravelDetailSummaryPDF } = require("../travel-desk/detail_pdf");
const qrcode = require("qrcode");

const moment = require("moment");

// TABLES
const EmployeeMaster = require("../../models/employeeMasterModel");
const LeaveDetail = require("../../models/leaveDetailModel");
const BranchMaster = require("../../models/branchMasterModel");
const Holiday = require("../../models/holidayModel");
const { TravelDesk, Expense } = require("../../models/travelDeskModel");

const { createNotification } = require("../hr-admin/shareRoutes");
const Permission = require("../../models/permissionModel");
//    'E3': { mode: 'Car', class: ['Car', 'III AC', 'CC', 'AC Bus'], conveyance: 'Taxi/Auto', remarks: 'By Car if travel is more than 16 hrs' },
//    'E7': { mode: 'Car', class: ['Car', 'II/III AC', 'CC', 'AC Bus'], conveyance: 'Taxi', remarks: 'By Car if travel is more than 10 hrs' },
//    'E6': { mode: 'Car', class: ['Car', 'II/III AC', 'CC', 'AC Bus'], conveyance: 'Taxi', remarks: 'By Car if travel is more than 10 hrs' },
//    'E4': { mode: 'Car', class: ['Car', 'III AC', 'CC', 'AC Bus'], conveyance: 'Taxi/Auto', remarks: 'By Car if travel is more than 14 hrs' },
//    'E5': { mode: 'Car', class: ['Car', 'III AC', 'CC', 'AC Bus'], conveyance: 'Taxi/Auto', remarks: 'By Car if travel is more than 14 hrs' },

const travelEligibility = {
  E8: { mode: "Actual", class: "Actual", conveyance: "Actual", remarks: "-" },
  E7: {
    mode: "Air",
    class: ["Air", "II/III AC", "CC", "AC Bus"],
    conveyance: "Taxi",
    remarks: "By Air if travel is more than 10 hrs",
  },
  E6: {
    mode: "Air",
    class: ["Air", "II/III AC", "CC", "AC Bus"],
    conveyance: "Taxi",
    remarks: "By Air if travel is more than 10 hrs",
  },
  E5: {
    mode: "Air",
    class: ["Air", "III AC", "CC", "AC Bus"],
    conveyance: "Taxi/Auto",
    remarks: "By Air if travel is more than 14 hrs",
  },
  E4: {
    mode: "Air",
    class: ["Air", "III AC", "CC", "AC Bus"],
    conveyance: "Taxi/Auto",
    remarks: "By Air if travel is more than 14 hrs",
  },
  E3: {
    mode: "Air",
    class: ["Air", "III AC", "CC", "AC Bus"],
    conveyance: "Taxi/Auto",
    remarks: "By Air if travel is more than 16 hrs",
  },
  TE1: {
    mode: "Train",
    class: ["III AC", "AC CC", "AC Bus"],
    conveyance: "Auto",
    remarks: "-",
  },
  TE2: {
    mode: "Train",
    class: ["III AC", "AC CC", "AC Bus"],
    conveyance: "Auto",
    remarks: "-",
  },
  ES1: {
    mode: "Train",
    class: ["III AC", "AC CC", "AC Bus"],
    conveyance: "Auto",
    remarks: "-",
  },
  ES2: {
    mode: "Train",
    class: ["III AC", "AC CC", "AC Bus"],
    conveyance: "Auto",
    remarks: "-",
  },
  S1: {
    mode: "Train",
    class: ["II Sleeper", "CC", "Bus"],
    conveyance: "Bus/Auto",
    remarks: "Auto where public transport is not available.",
  },
  S2: {
    mode: "Train",
    class: ["II Sleeper", "CC", "Bus"],
    conveyance: "Bus/Auto",
    remarks: "Auto where public transport is not available.",
  },
  S3: {
    mode: "Train",
    class: ["II Sleeper", "CC", "Bus"],
    conveyance: "Bus/Auto",
    remarks: "Auto where public transport is not available.",
  },
  S4: {
    mode: "Train",
    class: ["II Sleeper", "CC", "Bus"],
    conveyance: "Bus/Auto",
    remarks: "Auto where public transport is not available.",
  },
  S5: {
    mode: "Train",
    class: ["II Sleeper", "CC", "Bus"],
    conveyance: "Bus/Auto",
    remarks: "Auto where public transport is not available.",
  },
  S6: {
    mode: "Train",
    class: ["II Sleeper", "CC", "Bus"],
    conveyance: "Bus/Auto",
    remarks: "Auto where public transport is not available.",
  },
  Trainee: {
    mode: "Train",
    class: ["II Sleeper", "CC", "Bus"],
    conveyance: "Bus/Auto",
    remarks: "Auto where public transport is not available.",
  },
};

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

const formatDateMiddleware = (req, res, next) => {
  const originalJson = res.json;
  const recursiveFormatDates = (obj) => {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (obj[key] instanceof Date) {
          if (key === "CHECKINDTTIME" || key === "CHECKOUTDTTIME") {
            obj[key] = moment(obj[key]).format("hh:mm A"); // Format as HH:mm AM/PM
          } else {
            obj[key] = moment(obj[key]).format("DD-MM-YYYY");
          }
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

// APPLY MOVEMENT (OUT STATION , ON DUTY)

// router.post('/apply-movement', async (req, res) => {
//     try {
//         const { EMPNO, LVCODE, BRCODE, ENTRYBY, LVFRMDT, LVTODT, LVFROMTIME, LVTOTIME, FROMLOC, FROMLOCLAT, FROMLOCLNG, TOLOC, TOLOCLAT, TOLOCLNG, JOURNEYMODE, ADVANCEAMT, ADVANCEAMTFLG, REASON, DEPARTUREDT, RETURNDT, ARRANGEMENTS, TRAVELMODE } = req.body;
//         console.log("=====",req.body);
//         const requiredFieldsValidation = validateRequiredFields(LVFRMDT, LVTODT, EMPNO, LVCODE, BRCODE, ENTRYBY);
//         if (requiredFieldsValidation) {
//             return res.status(400).json({ Status: 'Failed', Message: requiredFieldsValidation, Code: 400 });
//         }

//         const userExists = await validateUserExistence(EMPNO);
//         if (!userExists) {
//             return res.status(404).json({ Status: 'Failed', Message: 'User with provided EMPNO does not exist', Data: {}, Code: 404 });
//         }

//         const parsedLVFRMDT = moment(LVFRMDT, 'DD-MM-YYYY').toDate();
//         const parsedLVTODT = moment(LVTODT, 'DD-MM-YYYY').toDate();
//         const lvYear = parsedLVFRMDT.getFullYear().toString();
//         const lvToYear = parsedLVTODT.getFullYear().toString();

//         if (isNaN(parsedLVFRMDT.getTime()) || isNaN(parsedLVTODT.getTime())) {
//             return res.status(400).json({ Status: 'Failed', Message: 'LVFRMDT and LVTODT must be valid dates', Code: 400 });
//         }

//         if (parsedLVFRMDT > parsedLVTODT) {
//             return res.status(400).json({ Status: 'Failed', Message: 'LVFRMDT must be before or equal to LVTODT', Code: 400 });
//         }

//         const employeeGrade = userExists.GRADE;
//         const isGradeE3OrBelow = (getGradeIndex(employeeGrade) >= getGradeIndex('E3'));

//         const isHolidayValidation = await validateHolidayDate(parsedLVFRMDT, parsedLVTODT, BRCODE, lvYear, lvToYear);
//         if (isHolidayValidation) {
//             return res.status(400).json({ Status: 'Failed', Message: 'Leave from date or leave to date cannot be a holiday', Code: 400 });
//         }

//         let TYPE = "MOVEMENT";
//         let ISESLVCODE, IISESLVCODE;
//         ISESLVCODE = LVCODE;
//         IISESLVCODE = LVCODE;
//         const applicationCount = await LeaveDetail.countDocuments() + 1;
//         const LVAPNO = applicationCount;
//         const existingLeave = await LeaveDetail.findOne({
//             EMPNO,
//             STATUS: "APPROVED",
//             LVFRMDT: { $lte: moment(parsedLVTODT).toDate() },
//             LVTODT:  { $gte: moment(parsedLVFRMDT).toDate() }
//         });

//         if (existingLeave) {
//             return res.status(400).json({ Status: 'Failed', Message: 'Leave/Movement has already been applied for the specified date range', Code: 400 });
//         }

//         let insertObj = {
//             LVAPNO,
//             LVYR: parsedLVFRMDT.getFullYear().toString(),
//             LVCODE,
//             LVFRMDT: parsedLVFRMDT,
//             LVTODT: parsedLVTODT,
//             LVFROMTIME,
//             LVTOTIME,
//             EMPNO,
//             EMPID : userExists._id,
//             GRADE : userExists.GRADE,
//             DEPT : userExists.DEPT,
//             EMPNAME : userExists.ENAME,
//             BRCODE,
//             ISESLVCODE,
//             IISESLVCODE,
//             REASON: REASON || '',
//             STATUS: 'PENDING',
//             SOURCE: 'JLSMART',
//             ENTRYBY,
//             ENTRYDT: moment().toDate(),
//             TYPE: TYPE,
//             FROMLOC,
//             FROMLOCLAT,
//             FROMLOCLNG,
//             TOLOC,
//             TOLOCLAT,
//             TOLOCLNG,
//             ADVANCEAMT,
//             ADVANCEAMTFLG,
//             APPROVER: userExists.REPMGR
//         }
//         if(LVCODE == 'OS') {
//             insertObj.JOURNEYMODE = JOURNEYMODE;
//             insertObj.TRAVELMODE = TRAVELMODE;
//             insertObj.ARRANGEMENTS = ARRANGEMENTS;
//             insertObj.DEPARTUREDT = moment(DEPARTUREDT, 'DD-MM-YYYY').toDate();
//             insertObj.RETURNDT = moment(RETURNDT, 'DD-MM-YYYY').toDate();
//         }
//         const newLeave = new LeaveDetail(insertObj);
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

const getTravelTime = async (fromLat, fromLng, toLat, toLng, transit_mode) => {
  try {
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/distancematrix/json`,
      {
        params: {
          origins: `${fromLat},${fromLng}`,
          destinations: `${toLat},${toLng}`,
          // mode: "transit",
          // transit_mode: transit_mode.toLowerCase(),
          key: googleMapKey,
        },
      }
    );
    console.log("=========response", response);
    if (response.data.status === "OK") {
      const element = response.data.rows[0].elements[0];
      console.log("===========elements data=======================", element);
      if (element.status === "OK") {
        return element.duration.value / 3600; // Convert seconds to hours
      }
    }
    throw new Error("Unable to calculate travel time");
  } catch (error) {
    console.error("Error calculating travel time:", error);
    throw error;
  }
};

router.post("/apply-movement", async (req, res) => {
  try {
    console.log(
      "======req.body apply-movement =======================",
      req.body
    );
    const {
      EMPNO,
      LVCODE,
      BRCODE,
      ENTRYBY,
      LVFRMDT,
      LVTODT,
      LVFROMTIME,
      LVTOTIME,
      FROMLOC,
      FROMLOCLAT,
      FROMLOCLNG,
      TOLOC,
      TOLOCLAT,
      TOLOCLNG,
      JOURNEYMODE,
      ADVANCEAMT,
      ADVANCEAMTFLG,
      REASON,
      DEPARTUREDT,
      RETURNDT,
      LARRANGEMENTS,
      TRAVELMODE,
      DEVIATION,
      FRMSESSION,
      TOSESSION,
      PREFERREDTIME,
      CARRANGEMENTS,
      DEVIATIONDESC,
      LODGINGPAIDBY,
      JOBSPECIFIC,
      APPNAME,
    } = req.body;

    if (APPNAME !== "MYTRAVEL") {
      //&& LVCODE === "OS" removed the validation to not allow any records from hr app
      return res.status(200).json({
        Status: "Success",
        Message: "Movement applied successfully",
        Data: {},
        Code: 200,
      });
    }

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

    // can't apply movement for more than 90 days

    const ninetyDaysAgo = moment().subtract(90, "days");

    if (moment(LVFRMDT, "DD-MM-YYYY").isBefore(ninetyDaysAgo)) {
      console.log("Date is older than 90 days.");
      return res.status(400).json({
        Status: "Failed",
        Message: "Cant Apply Movement for more than 90 days",
        Code: 400,
      });
    } else {
      console.log("Date is within the last 90 days.");
    }

    let DEVIATIONDATA = {};
    let travelTimeInHours = 0;
    if (LVCODE === "OS") {
      const employeeGrade = userExists.GRADE;
      console.log(
        "========FROMLOCLAT, FROMLOCLNG, TOLOCLAT, TOLOCLNG",
        FROMLOCLAT,
        FROMLOCLNG,
        TOLOCLAT,
        TOLOCLNG
      );
      /*
      travelTimeInHours = (
        await getTravelTime(
          FROMLOCLAT,
          FROMLOCLNG,
          TOLOCLAT,
          TOLOCLNG,
          JOURNEYMODE
        )
      ).toFixed(2);
      console.log("========travelTimeInHours", travelTimeInHours);
      */
      const gradeEligibility =
        travelEligibility[employeeGrade] || travelEligibility["Trainee"]; // Default to 'Trainee' if grade not found

      let isValidJourney = true;

      console.log(
        "===================================employeeGrade=====================",
        employeeGrade
      );
      console.log(
        "===================================gradeEligibility=====================",
        gradeEligibility
      );

      if ((employeeGrade === "E7" || employeeGrade === "E6") && !DEVIATION) {
        if (
          gradeEligibility.mode === "Air" &&
          // travelTimeInHours < 10 &&    // commented due to map key replacement issue  on 17-12-2025 by pradeep
          JOURNEYMODE !== "BUS" &&
          JOURNEYMODE !== "TRAIN" &&
          JOURNEYMODE !== "CAR"
        ) {
          isValidJourney = false;
        }
      } else if (
        (employeeGrade === "E5" || employeeGrade === "E4") &&
        !DEVIATION
      ) {
        let JOURNEYMODE1;
        if (JOURNEYMODE === "AIR") {
          JOURNEYMODE1 = "Air";
        } else {
          JOURNEYMODE1 = JOURNEYMODE;
        }
        if (gradeEligibility.mode === JOURNEYMODE1)
          //travelTimeInHours < 14 &&
          // JOURNEYMODE --- "Air"
          isValidJourney = false;
      } else if (employeeGrade === "E3" && !DEVIATION) {
        if (
          // travelTimeInHours < 16 &&
          gradeEligibility.mode === "Air" &&
          JOURNEYMODE !== "BUS" &&
          JOURNEYMODE !== "TRAIN" &&
          JOURNEYMODE !== "CAR"
        )
          isValidJourney = false;
      } else if (
        employeeGrade === "TE1" ||
        employeeGrade === "TE2" ||
        employeeGrade === "ES1" ||
        employeeGrade === "ES2" ||
        employeeGrade === "S1" ||
        employeeGrade === "S2" ||
        employeeGrade === "S3" ||
        employeeGrade === "S4" ||
        employeeGrade === "S5" ||
        employeeGrade === "S6" ||
        employeeGrade === "Trainee"
      ) {
        if (JOURNEYMODE === "AIR" || (JOURNEYMODE === "CAR" && !DEVIATION)) {
          isValidJourney = false;
        }
      }
      console.log("======isValidJourney", isValidJourney);
      if (DEVIATION) {
        if (!isValidJourney) {
          DEVIATIONDATA.GRADE = employeeGrade;
          // DEVIATIONDATA.travelTimeInHours = travelTimeInHours;
          DEVIATIONDATA.gradeEligibility = gradeEligibility;
          DEVIATIONDATA.MODE = JOURNEYMODE;
        }
      } else {
        if (!isValidJourney) {
          return res.status(400).json({
            Status: "Failed",
            Message:
              "Travel mode is not permitted based on the grade and travel time, if you want make sure to enable DEVIATION",
            Code: 400,
          });
        }
      }
    }

    const isHolidayValidation = await validateHolidayDate(
      parsedLVFRMDT,
      parsedLVTODT,
      BRCODE
    );

    if (isHolidayValidation) {
      return res.status(400).json({
        Status: "Failed",
        Message: "Leave from date or leave to date cannot be a holiday",
        Code: 400,
      });
    }

    // modified condition to apply OD in finance app even it applied in HR app 24-07-2025 by SP

    const existingLeave = await LeaveDetail.findOne({
      EMPNO,
      STATUS: "APPROVED",
      LVFRMDT: { $lte: moment(parsedLVTODT).toDate() },
      LVTODT: { $gte: moment(parsedLVFRMDT).toDate() },
    });

    if (existingLeave && APPNAME === "MYTRAVEL") {
      // ADDED THIS ON 24-07-2025 BY SP AS PER SUTHIR INSTRUCTION
      return res.status(400).json({
        Status: "Failed",
        Message:
          "Leave/Movement has already been applied for the specified date range",
        Code: 400,
      });
    }

    // block movement if the employee is on leave

    const checkLeave = await LeaveDetail.findOne({
      EMPNO,
      // STATUS: "APPROVED",
      LVCODE: { $in: ["CL", "CO", "EL", "SL"] },
      LVFRMDT: { $lte: moment(parsedLVTODT).toDate() },
      LVTODT: { $gte: moment(parsedLVFRMDT).toDate() },
    });
    if (checkLeave) {
      return res.status(400).json({
        Status: "Failed",
        Message: "Movement cannot be applied as the employee is on leave",
        Code: 400,
      });
    }
    const applicationCount = (await LeaveDetail.countDocuments()) + 1;
    const LVAPNO = applicationCount;

    // create sequence for movement number

    const timestamp = moment().format("YYYYMM");

    const lastRecord = await LeaveDetail.findOne({
      TYPE: "MOVEMENT",
      LVCODE: "OS",
    }).sort({ _id: -1 });

    let lastSeqNo = 0;

    if (
      lastRecord &&
      lastRecord.MOVEMENTID &&
      lastRecord.MOVEMENTID.toString().length >= 10
    ) {
      const lastId = lastRecord.MOVEMENTID.toString();
      const lastTimestamp = lastId.slice(0, 6);
      const lastNumber = parseInt(lastId.slice(6), 10);

      if (lastTimestamp === timestamp && !isNaN(lastNumber)) {
        lastSeqNo = lastNumber;
      }
    }

    // Increment and format
    const incrementStr = (lastSeqNo + 1).toString().padStart(4, "0");
    const uniqueCode = `${timestamp}${incrementStr}`;

    const code = await qrcode.toDataURL(
      JSON.stringify({ MOVEMENTID: uniqueCode, EMPNO: EMPNO })
    );

    let insertObj = {
      LVAPNO,
      LVYR: parsedLVFRMDT.getFullYear().toString(),
      LVCODE,
      LVFRMDT: parsedLVFRMDT,
      LVTODT: parsedLVTODT,
      LVFROMTIME,
      LVTOTIME,
      EMPNO,
      EMPID: userExists._id,
      GRADE: userExists.GRADE,
      DEPT: userExists.DEPT,
      EMPNAME: userExists.ENAME,
      BRCODE,
      ISESLVCODE: LVCODE,
      IISESLVCODE: LVCODE,
      REASON: REASON,
      STATUS: req.body.ACTION ? req.body.ACTION : "PENDING",
      SOURCE: "JLSMART",
      ENTRYBY,
      ENTRYDT: moment().toDate(),
      TYPE: "MOVEMENT",
      FROMLOC,
      FROMLOCLAT,
      FROMLOCLNG,
      TOLOC,
      TOLOCLAT,
      TOLOCLNG,
      ADVANCEAMT,
      ADVANCEAMTFLG,
      APPROVER: userExists.REPMGR,
      JOBSPECIFIC,
      MOVEMENTID: uniqueCode,
      FRMSESSION, // added for DO
      TOSESSION,
      APPNAME: APPNAME,
      qrcode: code,
    };
    if (LVCODE === "OS") {
      insertObj.FRMSESSION = FRMSESSION;
      insertObj.TOSESSION = TOSESSION;
      insertObj.PREFERREDTIME = PREFERREDTIME;
      insertObj.JOURNEYMODE = JOURNEYMODE;
      insertObj.TRAVELMODE = TRAVELMODE;
      insertObj.LARRANGEMENTS = LARRANGEMENTS;
      if (CARRANGEMENTS) {
        insertObj.CARRANGEMENTS = CARRANGEMENTS;
      }
      insertObj.TRAVELTIME = 0; //travelTimeInHours;
      insertObj.DEPARTUREDT = moment(DEPARTUREDT, "DD-MM-YYYY").toDate();
      insertObj.RETURNDT = moment(RETURNDT, "DD-MM-YYYY").toDate();
      insertObj.DEVIATION = DEVIATION;
      insertObj.DEVIATIONDESC = DEVIATIONDESC;
      insertObj.DEVIATIONDATA = DEVIATIONDATA;
      insertObj.LODGINGPAIDBY = LODGINGPAIDBY;
    }
    // CHECK DUPLICATE MOVEMENTID
    const duplicateMovement = await LeaveDetail.findOne({
      MOVEMENTID: uniqueCode,
    });
    if (duplicateMovement) {
      return res.status(500).json({
        Status: "Failed",
        Message: "High Traffic!!, please try again",
        Data: {},
        Code: 500,
      });
    }
    const newLeave = new LeaveDetail(insertObj);
    await newLeave.save();
    const notificationData = {
      EMPNO: userExists.REPMGR,
      BRCODE: userExists.BRCODE,
      TITLE: "Leave Application",
      DESC: `You have received a leave application from ${userExists.ENAME} (Application No: ${LVAPNO}) for your approval.`,
    };
    createNotification(notificationData);

    return res.status(200).json({
      Status: "Success",
      Message: "Movement applied successfully",
      Data: newLeave,
      Code: 200,
    });
  } catch (error) {
    console.error("Error applying leave:", error);
    return res
      .status(500)
      .json({ Status: "Failed", Message: "Internal Server Error", Code: 500 });
  }
});

router.post("/my-movements-list", async (req, res) => {
  try {
    const { EMPNO, APPNAME } = req.body;
    console.log(req.body, "========req.body my-movements-list");
    if (!EMPNO) {
      return res.status(400).json({
        Status: "Failed",
        Message: "EMPNO is required",
        Data: {},
        Code: 400,
      });
    }
    let leaveList;
    if (APPNAME) {
      leaveList = await LeaveDetail.find({
        EMPNO,
        TYPE: "MOVEMENT",
        APPNAME: { $in: APPNAME },
      }).sort({ ENTRYDT: -1 });
    } else {
      leaveList = await LeaveDetail.find({ EMPNO, TYPE: "MOVEMENT" }).sort({
        ENTRYDT: -1,
      });
    }
    //  leaveList = await LeaveDetail.find({ EMPNO, TYPE: "MOVEMENT" }).sort({
    //   ENTRYDT: -1,
    // });
    const formattedLeaveList = [];
    for (const item of leaveList) {
      const getdDataFromExpense = await Expense.find({
        travelId: item.travelId,
      });
      const formattedItem = {
        ...item.toObject(),
        OS_STATUS:
          getdDataFromExpense.length > 0
            ? getdDataFromExpense[0].finalApproval.status
            : "PENDING",
      };
      formattedLeaveList.push(formattedItem);
    }
    return res.status(200).json({
      Status: "Success",
      Message: "Leave list retrieved successfully",
      Data: formattedLeaveList, // MODIFIED ON 17-12-2025 BY PRADEEP
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

router.post("/movement-data", async (req, res) => {
  try {
    const movementId = req.body.movementId;
    const leaveRequest = await LeaveDetail.findById(movementId);
    if (!leaveRequest) {
      return res.status(404).json({
        Status: "Failed",
        Message: "Leave request not found",
        Data: {},
      });
    }
    res.json({
      Status: "Success",
      Message: "Leave request retrieved",
      Data: leaveRequest,
      Code: 200,
    });
  } catch (error) {
    console.error(error.message);
    res
      .status(500)
      .json({ Status: "Failed", Message: error.message, Data: {}, Code: 500 });
  }
});

router.post("/approvals-list", async (req, res) => {
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
      TYPE: "MOVEMENT",
    });
    const [leaveList] = await Promise.all([leaveListPromise]);

    if (leaveList.length === 0) {
      return res.status(200).json({
        Status: "Success",
        Message: "No records found for the approver",
        Data: [],
        Code: 200,
      });
    }
    const responseData = [];
    await Promise.all(
      leaveList.map(async (leave) => {
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
          JOURNEYMODE: leave.JOURNEYMODE,
          TRAVELMODE: leave.TRAVELMODE,
          BARRANGEMENTS: leave.BARRANGEMENTS,
          LARRANGEMENTS: leave.LARRANGEMENTS,
          ADVANCEAMT: leave.ADVANCEAMT,
          ADVANCEAMTFLG: leave.ADVANCEAMTFLG,
          DEPARTUREDT: leave.DEPARTUREDT,
          RETURNDT: leave.RETURNDT,
          ENTRYBY: leave.ENTRYBY,
          createdAt: leave.createdAt,
          updatedAt: leave.updatedAt,
          BRCODE: leave.BRCODE,
          JOBSPECIFIC: leave.JOBSPECIFIC,
        };
        responseData.push(formattedLeave);
      })
    );

    responseData.sort((a, b) => {
      if (a.STATUS === "PENDING" && b.STATUS !== "PENDING") {
        return -1;
      } else if (a.STATUS !== "PENDING" && b.STATUS === "PENDING") {
        return 1;
      } else if (a.STATUS === "PENDING" && b.STATUS === "PENDING") {
        return new Date(a.LVFRMDT) - new Date(b.LVFRMDT);
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

router.post("/approvals-summary", async (req, res) => {
  try {
    const { EMPNO, STATUS } = req.body;
    if (!EMPNO) {
      return res.status(400).json({
        Status: "Failed",
        Message: "EMPNO is required",
        Data: [],
        Code: 400,
      });
    }
    const leaveList = await LeaveDetail.find({
      APPROVER: EMPNO,
      TYPE: "MOVEMENT",
      STATUS: STATUS,
    });
    if (leaveList.length === 0) {
      return res.status(200).json({
        Status: "Success",
        Message: `No ${STATUS.toLowerCase()} records found for the approver`,
        Data: [],
        Code: 200,
      });
    }
    return res.status(200).json({
      Status: "Success",
      Message: `${STATUS} records retrieved successfully`,
      Data: leaveList,
      Code: 200,
    });
  } catch (error) {
    console.error(`Error retrieving ${STATUS.toLowerCase()} records:`, error);
    return res.status(500).json({
      Status: "Failed",
      Message: "Internal Server Error",
      Data: [],
      Code: 500,
    });
  }
});

router.post("/approval-action", async (req, res) => {
  try {
    const { ID, ACTION, EMPNO, ADVANCEAMT, REASON } = req.body;
    const today = moment().toDate();
    console.log("====request", req.body);

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
    const isGradeE3OrBelow = employeeExists.GRADE <= "E3";
    const lvYear = request.LVFRMDT.getFullYear().toString();

    request.STATUS = ACTION;
    request.REASON = REASON;
    request.LVSANCBY = EMPNO || null;
    request.LVSANCDT = today;
    request.MODBY = EMPNO || "";
    request.MODDT = today;
    if (ADVANCEAMT) {
      request.ADVANCEAMT = ADVANCEAMT;
    }

    const travelId = await generateTravelId();

    if (ACTION === "APPROVED") {
      const travelDeskData = {
        travelId: travelId,
        employee: employeeExists._id,
        movement: request._id,
        claim: null,
        accommodation: null,
        brcode: employeeExists.BRCODE,
        status: "PENDING",
      };
      const newTravelDeskEntry = new TravelDesk(travelDeskData);
      console.log("========newTravelDeskEntry", newTravelDeskEntry);
      request.travelId = newTravelDeskEntry._id;
      await newTravelDeskEntry.save();
    }
    console.log("========request", request);
    await request.save();

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
      Code: 500,
    });
  }
});

router.post("/approval-action-finance", async (req, res) => {
  try {
    const { ID, ACTION, EMPNO, ADVANCEAMT, REASON } = req.body;
    const today = moment().toDate();
    console.log("====request", req.body);

    const request = await LeaveDetail.findById(ID);
    if (!request) {
      return res.status(404).json({
        Status: "Failed",
        Message: "Leave request not found",
        Code: 404,
      });
    }

    // Check if the request has already been rejected
    if (request.STATUS === "REJECTED") {
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
    const isGradeE3OrBelow = employeeExists.GRADE <= "E3";
    const lvYear = request.LVFRMDT.getFullYear().toString();

    request.STATUS = ACTION;
    request.REASON = REASON;
    request.LVSANCBY = EMPNO || null;
    request.LVSANCDT = today;
    request.MODBY = EMPNO || "";
    request.MODDT = today;
    if (ADVANCEAMT) {
      request.ADVANCEAMT = ADVANCEAMT;
    }

    const travelId = await generateTravelId();

    if (ACTION === "APPROVED") {
      const travelDeskData = {
        travelId: travelId,
        employee: employeeExists._id,
        movement: request._id,
        claim: null,
        accommodation: null,
        brcode: employeeExists.BRCODE,
        status: "PENDING",
      };
      const newTravelDeskEntry = new TravelDesk(travelDeskData);
      console.log("========newTravelDeskEntry", newTravelDeskEntry);
      request.travelId = newTravelDeskEntry._id;
      await newTravelDeskEntry.save();
    }
    console.log("========request", request);
    await request.save();

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
      Code: 500,
    });
  }
});

async function generateTravelId() {
  const count = await TravelDesk.countDocuments();
  return `T-${count + 1}`;
}

// generate pdf summary for submitted claim
router.post("/claim-summary", async (req, res) => {
  try {
    const { movement_id, EMPNO, endDate, startDate } = req.body;
    console.log(req.body, "=====================req.body===================");
    const result = await TravelDesk.aggregate([
      {
        $match: {
          // EMPNO: EMPNO,
          _id: new mongoose.Types.ObjectId(movement_id),
        },
      },
      {
        $lookup: {
          from: "expenses",
          localField: "_id",
          foreignField: "travelId",
          as: "expenceDetails",
        },
      },
      {
        $unwind: {
          path: "$expenceDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match:
          endDate && startDate
            ? {
                // "expenceDetails.firstApproval.status": "PENDING",  removed on 05-08-2025 to get claim summary for approved claims
                // "expenceDetails.finalApproval.status": "PENDING",
                // "expenceDetails.amountSettled.status": "PENDING",
                "expenceDetails.createdAt": {
                  $gte: new Date(startDate),
                  $lte: new Date(endDate),
                },
              }
            : {
                // "expenceDetails.firstApproval.status": "PENDING",
                // "expenceDetails.finalApproval.status": "PENDING",
                // "expenceDetails.amountSettled.status": "PENDING",
              },
      },
      {
        $lookup: {
          from: "employeemasters",
          localField: "employee",
          foreignField: "_id",
          as: "employee",
        },
      },
      {
        $lookup: {
          from: "leavedetails",
          localField: "movement",
          foreignField: "_id",
          as: "movement",
        },
      },
      {
        $lookup: {
          from: "accommodations",
          localField: "accommodation",
          foreignField: "_id",
          as: "accommodation",
        },
      },
      {
        $addFields: {
          employee: {
            $arrayElemAt: ["$employee", 0],
          },
        },
      },
      {
        $unwind: {
          path: "$movement",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: "$_id",
          expenceDetails: {
            $push: "$expenceDetails",
          },
          accommodation: {
            $first: "$accommodation",
          },
          brcode: {
            $first: "$brcode",
          },
          movement: {
            $first: "$movement",
          },
          employee: {
            $first: "$employee",
          },
          travelId: {
            $first: "$travelId",
          },
          accommodationDocuments: {
            $first: "$accommodationDocuments",
          },
          ticketDocuments: {
            $first: "$ticketDocuments",
          },
          travelId: {
            $first: "$travelId",
          },
          status: {
            $first: "$status",
          },
          __v: {
            $first: "$__v",
          },
        },
      },
    ]);

    console.log(
      result,
      "================================&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&"
    );

    if (!result.length) {
      return res.status(404).json({
        Status: "Failed",
        Message: "No movement found",
        Code: 404,
      });
    }

    let movement = result[0].movement;

    // ✅ Generate QR code if missing
    if (movement && !movement.qrcode && movement.MOVEMENTID) {
      // Get current timestamp YYYYMM
      const timestamp = moment().format("YYYYMM");

      // Extract last sequence from MOVEMENTID
      let lastSeqNo = 0;
      const lastId = movement.MOVEMENTID.toString();
      const lastTimestamp = lastId.slice(0, 6);
      const lastNumber = parseInt(lastId.slice(6), 10);

      if (lastTimestamp === timestamp && !isNaN(lastNumber)) {
        lastSeqNo = lastNumber;
      }

      // Increment and format
      const incrementStr = (lastSeqNo + 1).toString().padStart(4, "0");
      const uniqueCode = `${timestamp}${incrementStr}`;

      // Generate QR code
      const qrDataUrl = await qrcode.toDataURL(
        JSON.stringify({ MOVEMENTID: uniqueCode })
      );

      // Save to DB
      await LeaveDetail.updateOne(
        { _id: movement._id },
        { $set: { qrcode: qrDataUrl } }
      );

      // Attach to object for PDF generation
      movement.qrcode = qrDataUrl;
    }

    const summaryData = await generateTravelSummaryPDF(result[0]);

    // generateTravelDetailSummaryPDF(result[0]);

    // axios
    //   .post(
    //     "https://smarthr.johnsonliftsltd.com:3001/api/travel-desk/movement/claim-detail-summary",
    //     { movement_id: movement_id },
    //     { headers: { "Content-Type": "application/json" } }
    //   )
    //   .then((data) => {
    //     console.log(
    //       data,
    //       "=============================== data detail summary ==============="
    //     );
    //   });

    res.status(200).json({
      Status: "Success",
      Message: "Summary Retrived",
      Code: 200,
      Data: summaryData,
      result: result[0],
    });
  } catch (error) {
    console.error("Error retrieving claim:", error);
    res.status(500).json({
      Status: "Failed",
      Message: "Internal Server Error",
      Code: 500,
    });
  }
});

// generate pdf summary for submitted claim
router.post("/claim-detail-summary", async (req, res) => {
  try {
    const { movement_id, EMPNO, endDate, startDate } = req.body;
    console.log(req.body, "=====================req.body===================");
    const result = await TravelDesk.aggregate([
      {
        $match: {
          // EMPNO: EMPNO,
          _id: new mongoose.Types.ObjectId(movement_id),
        },
      },
      {
        $lookup: {
          from: "expenses",
          localField: "_id",
          foreignField: "travelId",
          as: "expenceDetails",
        },
      },
      {
        $unwind: {
          path: "$expenceDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match:
          endDate && startDate
            ? {
                // "expenceDetails.firstApproval.status": "PENDING",  removed on 05-08-2025 to get claim summary for approved claims
                // "expenceDetails.finalApproval.status": "PENDING",
                // "expenceDetails.amountSettled.status": "PENDING",
                "expenceDetails.createdAt": {
                  $gte: new Date(startDate),
                  $lte: new Date(endDate),
                },
              }
            : {
                // "expenceDetails.firstApproval.status": "PENDING",
                // "expenceDetails.finalApproval.status": "PENDING",
                // "expenceDetails.amountSettled.status": "PENDING",
              },
      },
      {
        $lookup: {
          from: "employeemasters",
          localField: "employee",
          foreignField: "_id",
          as: "employee",
        },
      },
      {
        $lookup: {
          from: "leavedetails",
          localField: "movement",
          foreignField: "_id",
          as: "movement",
        },
      },
      {
        $lookup: {
          from: "accommodations",
          localField: "accommodation",
          foreignField: "_id",
          as: "accommodation",
        },
      },
      {
        $addFields: {
          employee: {
            $arrayElemAt: ["$employee", 0],
          },
        },
      },
      {
        $unwind: {
          path: "$movement",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: "$_id",
          expenceDetails: {
            $push: "$expenceDetails",
          },
          accommodation: {
            $first: "$accommodation",
          },
          brcode: {
            $first: "$brcode",
          },
          movement: {
            $first: "$movement",
          },
          employee: {
            $first: "$employee",
          },
          travelId: {
            $first: "$travelId",
          },
          accommodationDocuments: {
            $first: "$accommodationDocuments",
          },
          ticketDocuments: {
            $first: "$ticketDocuments",
          },
          travelId: {
            $first: "$travelId",
          },
          status: {
            $first: "$status",
          },
          __v: {
            $first: "$__v",
          },
        },
      },
    ]);

    console.log(
      result,
      "================================&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&"
    );

    const summaryData = await generateTravelDetailSummaryPDF(result[0]);

    res.status(200).json({
      Status: "Success",
      Message: "Summary Retrived",
      Code: 200,
      Data: summaryData,
      result: result[0],
    });
  } catch (error) {
    console.error("Error retrieving claim:", error);
    res.status(500).json({
      Status: "Failed",
      Message: "Internal Server Error",
      Code: 500,
    });
  }
});

// acknowledgment to collect claim data

// router.post("/ack-claim", async (req, res) => {
//   try {
//     const { MOVEMENTID, status } = req.body;
//     const leaveRequest = await LeaveDetail.findOne({ MOVEMENTID: MOVEMENTID });
//     if (!leaveRequest) {
//       return res.status(404).json({
//         Status: "Failed",
//         Message: "Leave request not found",
//         Data: {},
//       });
//     }

//     const updateMovement = await LeaveDetail.findOneAndUpdate(
//       { MOVEMENTID: leaveRequest.MOVEMENTID },
//       { $set: { is_document_collected: status } }
//     );

//     return res.json({
//       Status: "Success",
//       Message: "Documents Received",
//       Data: leaveRequest,
//       Code: 200,
//     });
//   } catch (error) {
//     console.error(error.message);
//     res
//       .status(500)
//       .json({ Status: "Failed", Message: error.message, Data: {}, Code: 500 });
//   }
// });

router.post("/ack-claim", async (req, res) => {
  try {
    const { MOVEMENTID, status, document_submitted_by } = req.body;

    const leaveRequest = await LeaveDetail.findOne({ MOVEMENTID });
    if (!leaveRequest) {
      return res.status(404).json({
        Status: "Failed",
        Message: "Leave request not found",
        Data: {},
        Code: 404,
      });
    }

    // 🚨 Already collected → stop here
    if (leaveRequest.is_document_collected === true) {
      return res.status(400).json({
        Status: "Failed",
        Message: `Documents already collected on ${
          moment(leaveRequest?.document_submitted_at).format(
            "DD-MM-YYYY HH:mm"
          ) || ""
        }`,
        Data: leaveRequest,
        Code: 400,
      });
    }

    // ✅ Update if not already true
    const updateMovement = await LeaveDetail.findOneAndUpdate(
      { MOVEMENTID: leaveRequest.MOVEMENTID },
      {
        $set: {
          is_document_collected: status,
          document_submitted_at: new Date(),
          document_submitted_by: document_submitted_by,
        },
      },
      { new: true }
    );

    return res.json({
      Status: "Success",
      Message: "Documents Received",
      Data: updateMovement,
      Code: 200,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      Status: "Failed",
      Message: error.message,
      Data: {},
      Code: 500,
    });
  }
});

module.exports = router;

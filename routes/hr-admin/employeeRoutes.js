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
const Permission = require("../../models/permissionModel");
const CompensatoryOff = require("../../models/compensatoryOffModel");
const BalanceLeave = require("../../models/balanceLeaveModel");
const Holiday = require("../../models/holidayModel");

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

// router.post("/dashboard", async (req, res) => {
//   try {
//     const branches = await BranchMaster.find({}, "BRCODE BRNAME");
//     const branchEmployeeCounts = await EmployeeMaster.aggregate([
//         {
//             $match: {
//                 STATUS: "A",
//             },
//         },
//         {
//             $group: {
//             _id: "$BRCODE",
//             totalEmployees: { $sum: 1 },
//             },
//         },
//     ]);
//     const currentDate = moment().startOf("day").toDate();
//     console.log("===========currentDate", currentDate);

//     const attendanceCounts = await EmployeeAttendance.aggregate([
//       {
//         $match: {
//           LVDT: { $gte: currentDate },
//         },
//       },
//       {
//         $addFields: {
//           datePart: { $dateToString: { format: "%Y-%m-%d", date: "$LVDT" } },
//         },
//       },
//       {
//         $group: {
//           _id: { datePart: "$datePart", BRCODE: "$BRCODE", EMPNO: "$EMPNO" }, // Group by date, BRCODE, and EMPNO
//           checkins: {
//             $addToSet: {
//               $cond: [{ $eq: ["$CHECKINSTATUS", true] }, "$$ROOT", null],
//             },
//           }, // Accumulate unique check-ins
//           checkouts: {
//             $addToSet: {
//               $cond: [{ $eq: ["$CHECKOUTSTATUS", true] }, "$$ROOT", null],
//             },
//           }, // Accumulate unique check-outs
//         },
//       },
//       {
//         $project: {
//           _id: "$_id.BRCODE", // Project only BRCODE as _id
//           datePart: "$_id.datePart",
//           checkinCount: {
//             $size: {
//               $filter: { input: "$checkins", cond: { $ne: ["$$this", null] } },
//             },
//           }, // Count unique check-ins
//           checkoutCount: {
//             $size: {
//               $filter: { input: "$checkouts", cond: { $ne: ["$$this", null] } },
//             },
//           }, // Count unique check-outs
//         },
//       },
//     ]);

//     console.log("=========attendanceCounts", attendanceCounts);
//     const dashboardData = branches.map((branch) => {
//       const branchCode = branch.BRCODE;
//       const branchName = branch.BRNAME;

//       // Find employee count for the branch
//       const branchEmployeeCount =
//         branchEmployeeCounts.find((count) => count._id === branchCode)
//           ?.totalEmployees || 0;

//       // Find attendance count for the branch
//       const branchAttendance = attendanceCounts.find(
//         (attendance) => attendance._id === branchCode
//       );
//       const checkinCount = branchAttendance ? branchAttendance.checkinCount : 0;
//       const checkoutCount = branchAttendance
//         ? branchAttendance.checkoutCount
//         : 0;
//       const noLoginCount = branchEmployeeCount - (checkinCount + checkoutCount);

//       return {
//         branchCode,
//         branchName,
//         totalEmployees: branchEmployeeCount,
//         checkinCount,
//         checkoutCount,
//         noLoginCount,
//       };
//     });

//     // Calculate total counts across all branches
//     const totalEmployeesCount = dashboardData.reduce(
//       (total, branchData) => total + branchData.totalEmployees,
//       0
//     );
//     const totalCheckinCount = dashboardData.reduce(
//       (total, branchData) => total + branchData.checkinCount,
//       0
//     );
//     const totalCheckoutCount = dashboardData.reduce(
//       (total, branchData) => total + branchData.checkoutCount,
//       0
//     );
//     const totalNotLoginCount = dashboardData.reduce(
//       (total, branchData) => total + branchData.noLoginCount,
//       0
//     );

//     // Add total counts to the dashboard data
//     const dashboardDataWithTotal = {
//       totalEmployeesCount,
//       totalCheckinCount,
//       totalCheckoutCount,
//       totalNotLoginCount,
//       branches: dashboardData,
//     };

//     // Return the dashboard data with total counts as a response
//     return res
//       .status(200)
//       .json({
//         Status: "Success",
//         Message: "Dashboard data retrieved successfully",
//         Data: dashboardDataWithTotal,
//         Code: 200,
//       });
//   } catch (error) {
//     console.error("Error fetching dashboard data:", error);
//     return res
//       .status(500)
//       .json({
//         Status: "Failed",
//         Message: "Internal Server Error",
//         Data: {},
//         Code: 500,
//       });
//   }
// });

// router.post("/dashboard", async (req, res) => {
//   try {
//     const { BRCODE } = req.body;

//     const branches = await BranchMaster.find(
//       BRCODE ? { BRCODE: { $in: BRCODE } } : {}, // Filter branches by requested BRCODE if provided
//       "BRCODE BRNAME"
//     );

//     const branchEmployeeCounts = await EmployeeMaster.aggregate([
//       {
//         $match: {
//           STATUS: "A",
//         },
//       },
//       {
//         $group: {
//           _id: "$BRCODE",
//           totalEmployees: { $sum: 1 },
//         },
//       },
//     ]);

//     const currentDate = moment().startOf("day").toDate();
//     const endDate = moment().endOf("day").toDate();

//     const attendanceCounts = await EmployeeAttendance.aggregate([
//       {
//         $match: {
//           LVDT: { $gte: currentDate, $lte: endDate },
//         },
//       },
//       {
//         $addFields: {
//           datePart: { $dateToString: { format: "%Y-%m-%d", date: "$LVDT" } },
//         },
//       },
//       {
//         $group: {
//           _id: { BRCODE: "$BRCODE", datePart: "$datePart" },
//           checkinCount: {
//             $sum: { $cond: [{ $eq: ["$CHECKINSTATUS", true] }, 1, 0] },
//           },
//           checkoutCount: {
//             $sum: { $cond: [{ $eq: ["$CHECKOUTSTATUS", true] }, 1, 0] },
//           },
//         },
//       },
//       {
//         $project: {
//           _id: "$_id.BRCODE",
//           datePart: "$_id.datePart",
//           checkinCount: 1,
//           checkoutCount: 1,
//         },
//       },
//     ]);

//     console.log("========attendanceCounts", attendanceCounts);
//     const dashboardData = branches.map((branch) => {
//       const branchCode = branch.BRCODE;
//       const branchName = branch.BRNAME;

//       const branchEmployeeCount =
//         branchEmployeeCounts.find((count) => count._id === branchCode)
//           ?.totalEmployees || 0;

//       const branchAttendance = attendanceCounts.find(
//         (attendance) => attendance._id === branchCode
//       );
//       console.log("========branchAttendance", branchAttendance);
//       const checkinCount = branchAttendance ? branchAttendance.checkinCount : 0;
//       const checkoutCount = branchAttendance
//         ? branchAttendance.checkoutCount
//         : 0;
//       const noLoginCount = branchEmployeeCount - (checkinCount + checkoutCount);

//       return {
//         branchCode,
//         branchName,
//         totalEmployees: branchEmployeeCount,
//         checkinCount,
//         checkoutCount,
//         noLoginCount,
//       };
//     });
//     console.log("========dashboardData", dashboardData);
//     const totalEmployeesCount = dashboardData.reduce(
//       (total, branchData) => total + branchData.totalEmployees,
//       0
//     );
//     const totalCheckinCount = dashboardData.reduce(
//       (total, branchData) => total + branchData.checkinCount,
//       0
//     );
//     const totalCheckoutCount = dashboardData.reduce(
//       (total, branchData) => total + branchData.checkoutCount,
//       0
//     );
//     const totalNotLoginCount = dashboardData.reduce(
//       (total, branchData) => total + branchData.noLoginCount,
//       0
//     );

//     const dashboardDataWithTotal = {
//       totalEmployeesCount,
//       totalCheckinCount,
//       totalCheckoutCount,
//       totalNotLoginCount,
//       branches: dashboardData,
//     };

//     return res.status(200).json({
//       Status: "Success",
//       Message: "Dashboard data retrieved successfully",
//       Data: dashboardDataWithTotal,
//       Code: 200,
//     });
//   } catch (error) {
//     console.error("Error fetching dashboard data:", error);
//     return res.status(500).json({
//       Status: "Failed",
//       Message: "Internal Server Error",
//       Data: {},
//       Code: 500,
//     });
//   }
// });

// router.post("/dashboard", async (req, res) => {
//   try {
//       const { BRCODE } = req.body;

//       // Fetch branches
//       const branches = await BranchMaster.find(
//           BRCODE ? { BRCODE: { $in: BRCODE } } : {}, // Filter branches by requested BRCODE if provided
//           "BRCODE BRNAME"
//       );

//       // Fetch branch employee counts
//       const branchEmployeeCounts = await EmployeeMaster.aggregate([
//           {
//               $match: {
//                   STATUS: "A",
//               },
//           },
//           {
//               $group: {
//                   _id: "$BRCODE",
//                   totalEmployees: { $sum: 1 },
//               },
//           },
//       ]);

//       const currentDate = moment().startOf("day").toDate();
//       const endDate = moment().endOf("day").toDate();

//       // Fetch attendance counts
//       const attendanceCounts = await EmployeeAttendance.aggregate([
//           {
//               $match: {
//                   LVDT: { $gte: currentDate, $lte: endDate },
//               },
//           },
//           {
//               $addFields: {
//                   datePart: { $dateToString: { format: "%Y-%m-%d", date: "$LVDT" } },
//               },
//           },
//           {
//               $group: {
//                   _id: {
//                       BRCODE: "$BRCODE",
//                       EMPNO: "$EMPNO",
//                       datePart: "$datePart"
//                   },
//                   checkinCount: {
//                       $sum: {
//                           $cond: [{ $eq: ["$CHECKINSTATUS", true] }, 1, 0]
//                       }
//                   },
//                   checkoutCount: {
//                       $sum: {
//                           $cond: [{ $eq: ["$CHECKOUTSTATUS", true] }, 1, 0]
//                       }
//                   }
//               }
//           },
//           {
//               $group: {
//                   _id: "$_id.BRCODE",
//                   checkinCount: { $sum: { $cond: [{ $gt: ["$checkinCount", 0] }, 1, 0] } },
//                   checkoutCount: { $sum: { $cond: [{ $gt: ["$checkoutCount", 0] }, 1, 0] } }
//               }
//           }
//       ]);

//       console.log("========attendanceCounts", attendanceCounts);

//       // Process the dashboard data
//       const dashboardData = branches.map((branch) => {
//           const branchCode = branch.BRCODE;
//           const branchName = branch.BRNAME;

//           const branchEmployeeCount =
//               branchEmployeeCounts.find((count) => count._id === branchCode)
//                   ?.totalEmployees || 0;

//           const branchAttendance = attendanceCounts.find(
//               (attendance) => attendance._id === branchCode
//           );

//           console.log("========branchAttendance", branchAttendance);
//           const checkinCount = branchAttendance ? branchAttendance.checkinCount : 0;
//           const checkoutCount = branchAttendance ? branchAttendance.checkoutCount : 0;
//           const noLoginCount = branchEmployeeCount - checkinCount;

//           return {
//               branchCode,
//               branchName,
//               totalEmployees: branchEmployeeCount,
//               checkinCount,
//               checkoutCount,
//               noLoginCount,
//           };
//       });

//       console.log("========dashboardData", dashboardData);

//       // Calculate total counts
//       const totalEmployeesCount = dashboardData.reduce(
//           (total, branchData) => total + branchData.totalEmployees,
//           0
//       );
//       const totalCheckinCount = dashboardData.reduce(
//           (total, branchData) => total + branchData.checkinCount,
//           0
//       );
//       const totalCheckoutCount = dashboardData.reduce(
//           (total, branchData) => total + branchData.checkoutCount,
//           0
//       );
//       const totalNotLoginCount = dashboardData.reduce(
//           (total, branchData) => total + branchData.noLoginCount,
//           0
//       );

//       // Prepare final response
//       const dashboardDataWithTotal = {
//           totalEmployeesCount,
//           totalCheckinCount,
//           totalCheckoutCount,
//           totalNotLoginCount,
//           branches: dashboardData,
//       };

//       return res.status(200).json({
//           Status: "Success",
//           Message: "Dashboard data retrieved successfully",
//           Data: dashboardDataWithTotal,
//           Code: 200,
//       });
//   } catch (error) {
//       console.error("Error fetching dashboard data:", error);
//       return res.status(500).json({
//           Status: "Failed",
//           Message: "Internal Server Error",
//           Data: {},
//           Code: 500,
//       });
//   }
// });

router.post("/dashboard", async (req, res) => {
  try {
    const { BRCODE } = req.body;

    // Fetch branches
    const branches = await BranchMaster.find(
      BRCODE ? { BRCODE: { $in: BRCODE } } : {}, // Filter branches by requested BRCODE if provided
      "BRCODE BRNAME"
    );

    // Fetch branch employee counts
    const branchEmployeeCounts = await EmployeeMaster.aggregate([
      {
        $match: {
          STATUS: "A",
        },
      },
      {
        $group: {
          _id: "$BRCODE",
          totalEmployees: { $sum: 1 },
        },
      },
    ]);

    const currentDate = moment().startOf("day").toDate();
    const endDate = moment().endOf("day").toDate();
    // const endDate = moment().endOf("day").toDate();
    //let requestedDate = moment("07-06-2024", "DD-MM-YYYY");
    // currentDate = requestedDate.startOf('day').toDate();
    // endDate = requestedDate.endOf('day').toDate();

    const attendanceData = await EmployeeAttendance.aggregate([
      {
        $match: {
          LVDT: { $gte: currentDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: {
            BRCODE: "$BRCODE",
            EMPNO: "$EMPNO",
          },
          firstCheckIn: { $first: "$$ROOT" },
          lastCheckOut: { $last: "$$ROOT" },
        },
      },
    ]);

    // Process the dashboard data

    const dashboardData = branches.map((branch) => {
      const branchCode = branch.BRCODE;
      const branchName = branch.BRNAME;

      const branchEmployeeCount =
        branchEmployeeCounts.find((count) => count._id === branchCode)
          ?.totalEmployees || 0;

      const branchAttendance = attendanceData.filter(
        (attendance) => attendance._id.BRCODE === branchCode
      );

      const checkinEmployees = new Set();
      const checkoutEmployees = new Set();
      let checkinCount = 0;
      let checkoutCount = 0;
      branchAttendance.forEach((record) => {
        const empNo = record._id.EMPNO;
        if (record.firstCheckIn.CHECKINSTATUS && !checkinEmployees.has(empNo)) {
          //console.log("=======innnnnnnnnnnnn===")
          checkinCount += 1;
          checkinEmployees.add(empNo);
        }

        if (
          record.lastCheckOut.CHECKOUTSTATUS &&
          !checkoutEmployees.has(empNo)
        ) {
          checkoutCount += 1;
          checkoutEmployees.add(empNo);
        }
      });

      checkinCount = checkinEmployees.size;
      checkoutCount = checkoutEmployees.size;
      const noLoginCount = branchEmployeeCount - checkinCount;

      return {
        branchCode,
        branchName,
        totalEmployees: branchEmployeeCount,
        checkinCount,
        checkoutCount,
        noLoginCount,
      };
    });

    // Calculate total counts
    const totalEmployeesCount = dashboardData.reduce(
      (total, branchData) => total + branchData.totalEmployees,
      0
    );
    const totalCheckinCount = dashboardData.reduce(
      (total, branchData) => total + branchData.checkinCount,
      0
    );
    const totalCheckoutCount = dashboardData.reduce(
      (total, branchData) => total + branchData.checkoutCount,
      0
    );
    const totalNotLoginCount = dashboardData.reduce(
      (total, branchData) => total + branchData.noLoginCount,
      0
    );

    // Prepare final response
    const dashboardDataWithTotal = {
      totalEmployeesCount,
      totalCheckinCount,
      totalCheckoutCount,
      totalNotLoginCount,
      branches: dashboardData,
    };

    return res.status(200).json({
      Status: "Success",
      Message: "Dashboard data retrieved successfully",
      Data: dashboardDataWithTotal,
      Code: 200,
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return res.status(500).json({
      Status: "Failed",
      Message: "Internal Server Error",
      Data: {},
      Code: 500,
    });
  }
});

router.post("/getAllEmployees", async (req, res) => {
  try {
    let filter = { BRCODE: { $nin: ["MH03", "TN05", "TN10", "TN25"] } };
    if (req.body.BRCODE && Array.isArray(req.body.BRCODE)) {
      filter.BRCODE = { $in: req.body.BRCODE };
    }
    if (req.body.STATUS) {
      filter.STATUS = req.body.STATUS;
    }

    console.log(
      filter,
      "============================ filter ======================="
    );
    const employees = await EmployeeMaster.find(filter);
    res.json({
      Status: "Success",
      Message: "Employees retrieved successfully",
      Data: employees,
      Code: 200,
    });
  } catch (error) {
    console.error("Error retrieving employees:", error);
    res.json({
      Status: "Failed",
      Message: "Internal Server Error",
      Data: {},
      Code: 200,
    });
  }
});

router.post("/getEmployeeById", async (req, res) => {
  try {
    if (!req.body.userId) {
      return res.json({
        Status: "Failed",
        Message: "UserId Is Required",
        Data: {},
        Code: 200,
      });
    }
    const employee = await EmployeeMaster.findById(req.body.userId);
    if (!employee) {
      return res.json({
        Status: "Failed",
        Message: "Employee not found",
        Data: {},
        Code: 200,
      });
    }
    res.json({
      Status: "Success",
      Message: "Employees retrieved successfully",
      Data: employee,
      Code: 200,
    });
  } catch (error) {
    console.error("Error fetching employee:", error);
    res.json({
      Status: "Failed",
      Message: "Internal Server Error",
      Data: {},
      Code: 200,
    });
  }
});

router.post("/getAllEmployeesProjection", async (req, res) => {
  try {
    let filter = {};
    if (req.body.BRCODE && Array.isArray(req.body.BRCODE)) {
      filter.BRCODE = { $in: req.body.BRCODE };
    }
    if (req.body.STATUS) {
      filter.STATUS = req.body.STATUS;
    }
    //const employees = await EmployeeMaster.find(filter).select("ENAME _id BRCODE");
    const employees = await EmployeeMaster.aggregate([
      { $match: filter },
      {
        $project: {
          _id: 1,
          BRCODE: 1,
          ECODE: 1,
          EMPNO: 1,
          ENAME: 1,
          EMPNAMECODE: { $concat: ["$ENAME", "-", "$ECODE"] },
        },
      },
    ]);

    // const employees = await EmployeeMaster.find(filter).select(
    //   "ENAME _id BRCODE ECODE EMPNO"
    // );

    res.json({
      Status: "Success",
      Message: "Employees retrieved successfully",
      Data: employees,
      Code: 200,
    });
  } catch (error) {
    console.error("Error retrieving employees:", error);
    res.json({
      Status: "Failed",
      Message: "Internal Server Error",
      Data: {},
      Code: 500,
    });
  }
});

router.post("/leave-list", async (req, res) => {
  try {
    let filter = {
      LVCODE: { $nin: ["OD", "OS"] },
    };
    if (req.body.BRCODE && Array.isArray(req.body.BRCODE)) {
      filter.BRCODE = { $in: req.body.BRCODE };
    }
    const leaveList = await LeaveDetail.find(filter).sort({ createdAt: -1 });
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
    let filter = {
      LVCODE: { $in: ["OD", "OS"] },
    };
    if (req.body.BRCODE && Array.isArray(req.body.BRCODE)) {
      filter.BRCODE = { $in: req.body.BRCODE };
    }
    const leaveList = await LeaveDetail.find(filter).sort({ createdAt: -1 });
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

router.post("/attendance-list", async (req, res) => {
  try {
    let filter = {};
    if (req.body.from_date && req.body.to_date) {
      let fromDateParts = req.body.from_date.split("/");
      let toDateParts = req.body.to_date.split("/");
      let fromDate = new Date(
        fromDateParts[2],
        fromDateParts[1] - 1,
        fromDateParts[0]
      ); // Year, month (0 indexed), day
      let toDate = new Date(toDateParts[2], toDateParts[1] - 1, toDateParts[0]); // Year, month (0 indexed), day
      fromDate.setHours(0, 0, 0, 0);
      toDate.setHours(23, 59, 59, 999);
      filter.LVDT = { $gte: fromDate, $lte: toDate };
    } else {
      const startOfDay = moment().startOf("day");
      const endOfDay = moment().endOf("day");
      filter.LVDT = { $gte: startOfDay.toDate(), $lte: endOfDay.toDate() };
    }
    if (req.body.BRCODE && Array.isArray(req.body.BRCODE)) {
      filter.BRCODE = { $in: req.body.BRCODE };
    }
    console.log("===============req.body", req.body);
    console.log("===============filter", filter);
    const attendanceList = await EmployeeAttendance.find(filter);

    return res.status(200).json({
      Status: "Success",
      Message: "Attendance list retrieved successfully",
      Data: attendanceList,
      Code: 200,
    });
  } catch (error) {
    console.error("Error retrieving attendance list:", error);
    return res.status(500).json({
      Status: "Failed",
      Message: "Internal Server Error",
      Data: {},
      Code: 500,
    });
  }
});

router.post("/leave-action", async (req, res) => {
  try {
    const { LEAVEID, ACTION, LVSANCBY } = req.body;
    const today = moment().toDate();
    const leaveRequest = await LeaveDetail.findById(LEAVEID);
    if (!leaveRequest) {
      return res.status(404).json({
        Status: "Failed",
        Message: "Leave request not found",
        Code: 404,
      });
    }

    // Check if the leave request has already been approved or rejected
    if (
      leaveRequest.STATUS === "APPROVED" ||
      leaveRequest.STATUS === "REJECTED"
    ) {
      return res.status(400).json({
        Status: "Failed",
        Message: "Leave request has already been processed",
        Code: 400,
      });
    }

    leaveRequest.STATUS = ACTION;
    leaveRequest.LVSANCBY = LVSANCBY || null;
    leaveRequest.LVSANCDT = today;
    leaveRequest.MODBY = LVSANCBY || "";
    leaveRequest.MODDT = today;
    console.log("==============leaveRequest", leaveRequest);
    await leaveRequest.save();
    return res.status(200).json({
      Status: "Success",
      Message: `Leave request ${ACTION} successfully`,
      Data: leaveRequest,
      Code: 200,
    });
  } catch (error) {
    console.error("Error processing leave action:", error);
    return res
      .status(500)
      .json({ Status: "Failed", Message: "Internal Server Error", Code: 500 });
  }
});

router.post("/create-attendance", async (req, res) => {
  try {
    const { userid, EMPNO, BRCODE, attendanceType, ENTRYBY, TIME } = req.body;
    if (!EMPNO || !BRCODE || !attendanceType) {
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
    const userExists = await EmployeeMaster.findById(userid);
    if (!userExists) {
      return res.status(404).json({
        Status: "Failed",
        Message: "User with provided EMPNO does not exist",
        Data: {},
        Code: 404,
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
    console.log("====================== step 0 ============================");
    let BRSTARTTIME, BRENDTIME;
    if (userExists.BRSTARTTIME && userExists.BRENDTIME) {
      BRSTARTTIME = userExists.BRSTARTTIME;
      BRENDTIME = userExists.BRENDTIME;
    } else {
      BRSTARTTIME = branchRecord.BRSTARTTIME;
      BRENDTIME = branchRecord.BRENDTIME;
    }
    const today = moment().toDate();
    const existAttendance = await EmployeeAttendance.find({
      LVYR: moment(today).format("YYYY"),
      LVDT: today,
    });

    // deduct permissions and leaves if Late checkin
    if (attendanceType === "CHECKIN" && existAttendance.length === 0) {
      const time1 = moment(BRSTARTTIME, "HH:mm");
      const time2 = moment(TIME, "HH:mm:ss");
      // Calculate the difference in milliseconds
      const difference = time2.diff(time1);

      // Convert the difference to a readable format
      const duration = moment.duration(difference);

      const hours = duration.hours(); // Difference in hours
      const minutes = duration.minutes(); // Remaining minutes
      const seconds = duration.seconds(); // Remaining seconds
      const startOfMonth = moment().startOf("M").toDate();
      const endOfMonth = moment().endOf("M").toDate();

      // const getPermissonCount = await Permission.find({
      //   PERMISSIONDATE: {
      //     $gte: new Date(startOfMonth),
      //     $lte: new Date(endOfMonth),
      //   },
      // }).countDocument();
      // console.log(
      //   getPermissonCount,
      //   "====================== getPermissonCount ============================"
      // );
      // if (hours > 2) {
      // }
    }
    const startOfMonth = moment().startOf("M").toDate();
    const endOfMonth = moment().endOf("M").toDate();
    console.log("====================== step 1 ============================");
    const getPermissonCount = await Permission.find({
      PERMISSIONDATE: {
        $gte: new Date(startOfMonth),
        $lte: new Date(endOfMonth),
      },
    }).count();
    console.log(
      getPermissonCount,
      "====================== getPermissonCount ============================"
    );

    const newAttendance = new EmployeeAttendance({
      LVYR: moment(today).format("YYYY"),
      LVDT: today,
      EMPNO,
      EMPID: userExists._id,
      GRADE: userExists.GRADE,
      DEPT: userExists.DEPT,
      EMPNAME: userExists.ENAME,
      BRCODE,
      BRSTARTTIME,
      BRENDTIME,
      ENTRYBY: attendanceType === "CHECKIN" ? ENTRYBY || "" : "",
      ENTRYDT: attendanceType === "CHECKIN" ? today : null,
      CHECKINSTATUS: attendanceType === "CHECKIN",
      CHECKINTIME: attendanceType === "CHECKIN" ? TIME : null,
      CHECKINLAT: attendanceType === "CHECKIN" ? branchRecord.LAT : null,
      CHECKINLNG: attendanceType === "CHECKIN" ? branchRecord.LNG : null,
      CHECKINADDRESS: attendanceType === "CHECKIN" ? branchRecord.ADDRESS : "",
      MODBY: attendanceType === "CHECKOUT" ? ENTRYBY || "" : "",
      MODDT: attendanceType === "CHECKOUT" ? today : null,
      CHECKOUTSTATUS: attendanceType === "CHECKOUT",
      CHECKOUTTIME: attendanceType === "CHECKOUT" ? TIME : null,
      CHECKOUTLAT: attendanceType === "CHECKOUT" ? branchRecord.LAT : null,
      CHECKOUTLNG: attendanceType === "CHECKOUT" ? branchRecord.LNG : null,
      CHECKOUTADDRESS:
        attendanceType === "CHECKOUT" ? branchRecord.ADDRESS : "",
    });
    await newAttendance.save();

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

router.get("/attendance/:id", async (req, res) => {
  try {
    const attendanceId = req.params.id;
    const attendanceRecord = await EmployeeAttendance.findById(attendanceId);

    if (!attendanceRecord) {
      return res.status(404).json({
        Status: "Failed",
        Message: "Attendance record not found",
        Code: 404,
      });
    }

    return res.status(200).json({
      Status: "Success",
      Message: "Attendance record found",
      Data: attendanceRecord,
      Code: 200,
    });
  } catch (error) {
    console.error("Error fetching attendance record:", error);
    return res.status(500).json({
      Status: "Failed",
      Message: "Internal Server Error",
      Data: {},
      Code: 500,
    });
  }
});

router.post("/update-attendance", async (req, res) => {
  try {
    const { attendanceId, attendanceType, MODBY, TIME } = req.body;
    if (!attendanceId || !attendanceType || !MODBY || !TIME) {
      return res.status(400).json({
        Status: "Failed",
        Message:
          "attendanceId, EMPNO, BRCODE, attendanceType, MODBY, and TIME are required fields",
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
    const today = moment().toDate();
    const attendanceRecord = await EmployeeAttendance.findById(attendanceId);
    if (!attendanceRecord) {
      return res.status(404).json({
        Status: "Failed",
        Message: "Attendance record not found",
        Code: 404,
      });
    }
    if (attendanceType === "CHECKIN") {
      attendanceRecord.CHECKINTIME = TIME;
      attendanceRecord.MODBY = MODBY;
      attendanceRecord.MODDT = today;
    } else if (attendanceType === "CHECKOUT") {
      attendanceRecord.CHECKOUTTIME = TIME;
      attendanceRecord.MODBY = MODBY;
      attendanceRecord.MODDT = today;
    }

    await attendanceRecord.save();

    return res.status(200).json({
      Status: "Success",
      Message: "Attendance record updated successfully",
      Data: attendanceRecord,
      Code: 200,
    });
  } catch (error) {
    console.error("Error updating attendance record:", error);
    return res
      .status(500)
      .json({ Status: "Failed", Message: "Internal Server Error", Code: 500 });
  }
});

router.post("/permission-list", async (req, res) => {
  try {
    let filter = {};
    if (req.body.BRCODE && Array.isArray(req.body.BRCODE)) {
      filter.BRCODE = { $in: req.body.BRCODE };
    }
    const leaveList = await Permission.find(filter);
    return res.status(200).json({
      Status: "Success",
      Message: "Permission list retrieved successfully",
      Data: leaveList,
      Code: 200,
    });
  } catch (error) {
    console.error("Error retrieving permission list:", error);
    return res.status(500).json({
      Status: "Failed",
      Message: "Internal Server Error",
      Data: {},
      Code: 500,
    });
  }
});

router.post("/permission-action", async (req, res) => {
  try {
    const { PERMISSIONID, ACTION, REPMGR } = req.body;
    const today = moment().toDate();

    // Find the permission request by ID
    const permissionRequest = await Permission.findById(PERMISSIONID);

    // Check if the permission request exists
    if (!permissionRequest) {
      return res.json({
        Status: "Failed",
        Message: "Permission request not found",
        Code: 404,
      });
    }

    // Check if the permission request has already been approved or rejected
    if (
      permissionRequest.STATUS === "APPROVED" ||
      permissionRequest.STATUS === "REJECTED"
    ) {
      return res.json({
        Status: "Failed",
        Message: "Permission request has already been processed",
        Code: 400,
      });
    }

    let EMPNO = permissionRequest.EMPNO;
    let DURATION = permissionRequest.DURATION;
    const durationInMinutes = parseInt(DURATION);

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
      return res.json({
        Status: "Failed",
        Message:
          "Employee has already applied for the maximum number of permissions for the current month",
        Code: 400,
      });
    }

    // Update permission request status and other details
    permissionRequest.STATUS = ACTION;
    permissionRequest.SANCBY = REPMGR;
    permissionRequest.SANCDT = today;
    permissionRequest.MODBY = REPMGR || "";
    permissionRequest.MODDT = today;

    // Save the updated permission request
    await permissionRequest.save();

    return res.status(200).json({
      Status: "Success",
      Message: `Permission request ${ACTION} successfully`,
      Data: permissionRequest,
      Code: 200,
    });
  } catch (error) {
    console.error("Error processing permission action:", error);
    return res.status(500).json({
      Status: "Failed",
      Message: "Internal Server Error",
      Code: 500,
    });
  }
});

router.post("/update-status", async (req, res) => {
  const {
    EMPNO,
    exitWithdrawalStatus,
    exitDate,
    holdReleaseStatus,
    activeInactiveStatus,
    DEPUTATION_WITHDRAWAL_STATUS,
    DEPU_FROM_DATE,
    DEPU_TO_DATE,
    RESIGN_WITHDRAWAL_STATUS,
    RESIGN_LETTER,
    BLOCKSTATUS,
    DOR,
  } = req.body;
  console.log(
    "=====exitWithdrawalStatus, holdReleaseStatus, activeInactiveStatus",
    req.body
  );
  try {
    const employee = await EmployeeMaster.findOne({ EMPNO: EMPNO });
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }
    if (BLOCKSTATUS !== undefined) {
      employee.BLOCKSTATUS = BLOCKSTATUS;
    }
    if (exitWithdrawalStatus !== undefined) {
      employee.EXIT_WITHDRAWAL_STATUS = exitWithdrawalStatus;
      employee.EXITDATE = exitDate;
    }
    if (holdReleaseStatus !== undefined) {
      employee.HOLD_RELEASE_STATUS = holdReleaseStatus;
    }
    if (activeInactiveStatus !== undefined) {
      employee.STATUS = activeInactiveStatus;
    }
    if (DEPUTATION_WITHDRAWAL_STATUS !== undefined) {
      employee.DEPUTATION_WITHDRAWAL_STATUS = DEPUTATION_WITHDRAWAL_STATUS;
      employee.DEPU_FROM_DATE = DEPU_FROM_DATE;
      employee.DEPU_TO_DATE = DEPU_TO_DATE;
    }
    if (RESIGN_WITHDRAWAL_STATUS !== undefined) {
      employee.RESIGN_WITHDRAWAL_STATUS = RESIGN_WITHDRAWAL_STATUS;
      employee.RESIGN_LETTER = RESIGN_LETTER;
      employee.DOR = DOR;
    }
    console.log("=====employeeactiveInactiveStatus", employee);
    await employee.save();
    return res.status(200).json({ message: "Status updated successfully" });
  } catch (error) {
    console.error("Error updating status:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

router.post("/update-deviceid", async (req, res) => {
  try {
    const { EMPNO } = req.body;
    let filter = {};
    if (EMPNO) {
      filter = { EMPNO };
    }
    await EmployeeMaster.updateMany(filter, { $set: { DEVICEID: "" } });
    return res.status(200).json({
      Status: "Success",
      Message: "DEVICEID updated successfully",
      Code: 200,
    });
  } catch (error) {
    console.error("Error updating DEVICEID:", error);
    return res
      .status(500)
      .json({ Status: "Failed", Message: "Internal Server Error", Code: 500 });
  }
});

router.post("/leave-attendance-master-list", async (req, res) => {
  try {
    const { selectedMonth, selectedYear, BRCODE } = req.body || {};
    let filter = {};
    if (req.body.BRCODE && Array.isArray(req.body.BRCODE)) {
      filter.BRCODE = { $in: req.body.BRCODE };
    }

    // const currentDate = new Date();
    // let currentYear = currentDate.getFullYear();
    // let currentMonth = currentDate.getMonth();

    // if (req.body.selectedMonth && req.body.selectedYear) {
    //   currentYear = req.body.selectedYear;
    //   currentMonth = req.body.selectedMonth - 1;
    // }
    // const firstDayOfCurrentMonth = new Date(currentYear, currentMonth, 1);
    // const lastDayOfCurrentMonth = new Date(currentYear, currentMonth + 1, 0);

    const currentMonth = selectedMonth ? selectedMonth : moment().month() + 1;
    const currentYear = selectedYear ? selectedYear : moment().year();

    const firstDayOfCurrentMonth = moment(`${currentYear}-${currentMonth}-01`)
      .startOf("month")
      .toDate();
    const lastDayOfCurrentMonth = moment(`${currentYear}-${currentMonth}-01`)
      .endOf("month")
      .toDate();

    console.log("=currentMonth=====", currentMonth);
    console.log("=firstDayOfCurrentMonth=====", firstDayOfCurrentMonth);
    console.log("=lastDayOfCurrentMonth=====", lastDayOfCurrentMonth);

    filter["attendanceRecords.LVDT"] = {
      $gte: firstDayOfCurrentMonth,
      $lt: lastDayOfCurrentMonth,
    };

    let aggregationPipeline = [];
    aggregationPipeline.push({ $match: filter });
    aggregationPipeline.push({ $unwind: "$attendanceRecords" });
    aggregationPipeline.push({
      $match: { "attendanceRecords.LVDT": filter["attendanceRecords.LVDT"] },
    });
    aggregationPipeline.push({ $sort: { "attendanceRecords.LVDT": 1 } });
    aggregationPipeline.push({
      $project: {
        _id: 0,
        EMPNO: 1,
        GRADE: 1,
        DEPT: 1,
        BRCODE: 1,
        attendanceRecords: 1,
      },
    });
    aggregationPipeline.push({ $sort: { "attendanceRecords.LVDT": 1 } }); // Add the sort again
    const leaveAttendanceRecords = await LeaveAttendanceMaster.aggregate(
      aggregationPipeline
    ).allowDiskUse(true);

    //const leaveAttendanceRecords = await LeaveAttendanceMaster.find(filter).lean();
    return res.status(200).json({
      Status: "Success",
      Message: "Attendance list retrieved successfully",
      Data: leaveAttendanceRecords,
      Code: 200,
    });
  } catch (error) {
    console.error("Error retrieving attendance list:", error);
    return res.status(500).json({
      Status: "Failed",
      Message: "Internal Server Error",
      Data: {},
      Code: 500,
    });
  }
});

// router.post("/export-attendance-list", async (req, res) => {
//   try {
//     let filter = {};
//     if (req.body.BRCODE && Array.isArray(req.body.BRCODE)) {
//       filter.BRCODE = { $in: req.body.BRCODE };
//     }

//     if (req.body.from_date && req.body.to_date) {
//       const fromDate = moment(req.body.from_date, "DD/MM/YYYY").startOf('day').toDate();
//       const toDate = moment(req.body.to_date, "DD/MM/YYYY").endOf('day').toDate();
//       filter.LVDT = { $gte: fromDate, $lte: toDate };
//     } else {
//       const startOfDay = moment().startOf("day");
//       const endOfDay = moment().endOf("day");
//       filter.LVDT = { $gte: startOfDay.toDate(), $lte: endOfDay.toDate() };
//     }

//     console.log("===filter.LVDT=====",filter.LVDT)
//     const attendanceRecords = await EmployeeAttendance.aggregate([
//       {
//         $match: filter,
//       },
//       {
//         $group: {
//           _id: {
//             EMPNO: "$EMPNO",
//             EMPNAME: "$EMPNAME",
//             GRADE: "$GRADE",
//             DEPT: "$DEPT",
//             LVDT: "$LVDT",
//           },
//           AttendanceRecords: {
//             $push: {
//               time: "$CHECKINTIME",
//               EMPNO: "$EMPNO",
//               EMPNAME: "$EMPNAME",
//               LVDT: "$LVDT",
//               CHECKINSTATUS: "$CHECKINSTATUS",
//               CHECKINTIME: "$CHECKINTIME",
//               CHECKINLAT: "$CHECKINLAT",
//               CHECKINLNG: "$CHECKINLNG",
//               CHECKINADDRESS: "$CHECKINADDRESS",
//               CHECKOUTSTATUS: "$CHECKOUTSTATUS",
//               CHECKOUTTIME: "$CHECKOUTTIME",
//               CHECKOUTLAT: "$CHECKOUTLAT",
//               CHECKOUTLNG: "$CHECKOUTLNG",
//               CHECKOUTADDRESS: "$CHECKOUTADDRESS",
//               REASON: "$REASON",
//               STATUS: "$STATUS",
//               SOURCE: "$SOURCE",
//               ENTRYBY: "$ENTRYBY",
//               ENTRYDT: "$ENTRYDT",
//               MODBY: "$MODBY",
//               MODDT: "$MODDT",
//               TYPE: "$TYPE",
//               PHOTO: "$PHOTO",
//               GRADE: "$GRADE",
//               DEPT: "$DEPT",
//             },
//           },
//         },
//       },
//       {
//         $sort: { "_id.LVDT": 1, "AttendanceRecords.time": 1 }, // Sort by date and time
//       },
//     ]);

//     // Send the attendance data to the frontend
//     return res
//       .status(200)
//       .json({
//         Status: "Success",
//         Data: attendanceRecords,
//         Message: "Attendance data retrieved successfully",
//         Code: 200,
//       });
//   } catch (error) {
//     console.error("Error retrieving attendance data:", error);
//     return res
//       .status(500)
//       .json({
//         Status: "Failed",
//         Message: "Internal Server Error",
//         Data: {},
//         Code: 500,
//       });
//   }
// });

router.post("/export-attendance-list", async (req, res) => {
  try {
    let filter = {};

    if (req.body.BRCODE && Array.isArray(req.body.BRCODE)) {
      filter.BRCODE = { $in: req.body.BRCODE };
    }

    if (req.body.from_date && req.body.to_date) {
      const fromDate = moment(req.body.from_date, "DD/MM/YYYY")
        .startOf("day")
        .toDate();
      const toDate = moment(req.body.to_date, "DD/MM/YYYY")
        .endOf("day")
        .toDate();
      filter.LVDT = { $gte: fromDate, $lte: toDate };
    } else {
      const startOfDay = moment().startOf("day");
      const endOfDay = moment().endOf("day");
      filter.LVDT = { $gte: startOfDay.toDate(), $lte: endOfDay.toDate() };
    }

    const attendanceRecords = await EmployeeAttendance.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            EMPNO: "$EMPNO",
            EMPNAME: "$EMPNAME",
            GRADE: "$GRADE",
            DEPT: "$DEPT",
            LVDT: { $dateToString: { format: "%Y-%m-%d", date: "$LVDT" } },
          },
          firstCheckIn: { $first: "$$ROOT" },
          lastCheckOut: { $last: "$$ROOT" },
        },
      },
      { $sort: { "_id.LVDT": 1, "firstCheckIn.CHECKINTIME": 1 } },
    ]);

    return res.status(200).json({
      Status: "Success",
      Data: attendanceRecords,
      Message: "Attendance data retrieved successfully",
      Code: 200,
    });
  } catch (error) {
    console.error("Error retrieving attendance data:", error);
    return res.status(500).json({
      Status: "Failed",
      Message: "Internal Server Error",
      Data: {},
      Code: 500,
    });
  }
});

router.post("/update-employee-shifttime", async (req, res) => {
  try {
    const { empId, BRSTARTTIME, BRENDTIME } = req.body;
    const result = await EmployeeMaster.updateOne(
      { _id: empId },
      { $set: { BRSTARTTIME: BRSTARTTIME, BRENDTIME: BRENDTIME } }
    );
    if (result.nModified === 0) {
      return res.json({
        Status: "Success",
        Message: "Shift time not updated",
        Data: {},
        Code: 200,
      });
    }
    return res.json({
      Status: "Success",
      Message: `Shift time updated successfully`,
      Data: {},
      Code: 200,
    });
  } catch (error) {
    console.error("Error updating employee shift time:", error);
    return res.json({
      Status: "Failed",
      Message: "Internal Server Error",
      Data: {},
      Code: 500,
    });
  }
});

// COMP-OFF DATA

router.post("/compensatoryOffEntries", async (req, res) => {
  try {
    let filter = {};
    if (req.body.BRCODE && Array.isArray(req.body.BRCODE)) {
      filter.BRCODE = { $in: req.body.BRCODE };
    }
    const compensatoryOffEntries = await CompensatoryOff.find(filter).sort({
      createdAt: -1,
    });
    res.json({
      Status: "Success",
      Code: 200,
      Message: "Compensatory off entries retrieved successfully",
      Data: compensatoryOffEntries,
    });
  } catch (error) {
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

router.post("/allemployee-available-leaves", async (req, res) => {
  try {
    const currentYearLastTwoDigits = moment().format("YY");
    const filter = { PA_ELSTD_LVYR: currentYearLastTwoDigits };

    if (req.body.BRCODE && Array.isArray(req.body.BRCODE)) {
      filter.PA_ELSTD_BRCODE = { $in: req.body.BRCODE };
    }

    // Fetch all employees from EmployeeMaster
    const employees = await EmployeeMaster.find(
      {},
      { EMPNO: 1, ENAME: 1, BRCODE: 1 }
    );
    const empMap = employees.reduce((acc, emp) => {
      acc[emp.EMPNO] = emp;
      return acc;
    }, {});

    const leaveList = await BalanceLeave.find(filter);
    const availableLeavesByEmployee = {};

    // Loop through each leave record
    leaveList.forEach((record) => {
      const empNo = record.PA_ELSTD_EMPNO;

      // Skip record if employee not found in EmployeeMaster
      if (!empMap[empNo]) {
        console.log(`Skipping record for EMPNO ${empNo}: Employee not found`);
        return;
      }

      const empName = record.PA_ELSTD_ENAME;
      const GRADE = record.GRADE;
      const DEPT = record.DEPT;
      const brcode = record.PA_ELSTD_BRCODE;
      const leaveCode = record.PA_ELSTD_LVCODE;
      const leaveBalance = record.PA_ELSTD_BAL;

      // If the employee doesn't exist in availableLeavesByEmployee, initialize it with an empty object
      if (!availableLeavesByEmployee[empNo]) {
        availableLeavesByEmployee[empNo] = {
          EMPNO: empNo,
          EMPNAME: empName,
          BRCODE: brcode,
          GRADE: GRADE,
          DEPT: DEPT,
        };
      }

      // Update the available leave count for the current leave type for the current employee
      availableLeavesByEmployee[empNo][leaveCode] =
        (availableLeavesByEmployee[empNo][leaveCode] || 0) + leaveBalance;
    });

    // Convert the available leaves per employee object to an array
    const availableLeavesArray = Object.values(availableLeavesByEmployee);

    res.status(200).json({
      Status: "Success",
      Message: "Available leave details retrieved successfully",
      Data: availableLeavesArray,
      Code: 200,
    });
  } catch (error) {
    console.error("Error retrieving available leave details:", error);
    res.status(500).json({
      Status: "Failed",
      Message: "Internal Server Error",
      Data: {},
      Code: 500,
    });
  }
});

router.post("/update-attendance-data", async (req, res) => {
  try {
    const {
      EMPNO,
      fromDate,
      toDate,
      fromDateSessionI,
      fromDateSessionII,
      toDateSessionI,
      toDateSessionII,
    } = req.body;
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    console.log("=====req.body===", req.body);
    if (
      currentYear !== new Date(fromDate).getFullYear() ||
      currentYear !== new Date(toDate).getFullYear()
    ) {
      return res.status(400).json({
        Status: "Error",
        Message:
          "Invalid date range. From date and to date must be within the current month.",
        Code: 400,
      });
    }

    const existingAttendanceMaster = await LeaveAttendanceMaster.findOne({
      EMPNO,
    });
    if (!existingAttendanceMaster) {
      return res.status(404).json({
        Status: "Error",
        Message: "Attendance master record not found",
        Code: 404,
      });
    }

    existingAttendanceMaster.attendanceRecords.forEach((record) => {
      const recordDate = moment(record.LVDT).startOf("day");
      const fromDateMoment = moment(fromDate).startOf("day");
      const toDateMoment = moment(toDate).startOf("day");
      console.log("==recordDate===", recordDate);
      if (
        recordDate.isSameOrAfter(fromDateMoment) &&
        recordDate.isSameOrBefore(toDateMoment)
      ) {
        // Your logic for updating the sessions
        console.log("==innnnnnnn===", recordDate);
        if (
          recordDate.isSame(fromDateMoment) &&
          recordDate.isSame(toDateMoment)
        ) {
          // If fromDate and toDate are the same date
          console.log("==innnnnnnn=first==", recordDate);
          record.ISESLVCODE = fromDateSessionI;
          record.IISESLVCODE = fromDateSessionII;
        } else if (recordDate.isSame(fromDateMoment)) {
          // If it's the fromDate
          console.log("==innnnnnnn=second==", recordDate);
          record.ISESLVCODE = fromDateSessionI;
          record.IISESLVCODE = fromDateSessionII;
          console.log("==innnnnnnn=second==", record);
        } else if (recordDate.isSame(toDateMoment)) {
          // If it's the toDate
          console.log("==innnnnnnn=thirud==", recordDate);
          record.ISESLVCODE = toDateSessionI;
          record.IISESLVCODE = toDateSessionII;
          console.log("==innnnnnnn=thirud==", record);
        } else {
          // For other dates within the range, set the session as per fromDate
          console.log("==innnnnnnn=fourth==", recordDate);
          record.ISESLVCODE = fromDateSessionI;
          record.IISESLVCODE = fromDateSessionII;
        }
      }
    });

    console.log("=========existingAttendanceMaster", existingAttendanceMaster);
    await existingAttendanceMaster.save();

    return res.status(200).json({
      Status: "Success",
      Message: "Attendance data updated successfully",
      Code: 200,
    });
  } catch (error) {
    console.error("Error updating attendance data:", error);
    return res.status(500).json({
      Status: "Error",
      Message: "Internal Server Error",
      Code: 500,
    });
  }
});

// Function to get date range between fromDate and toDate
function getDateRange(fromDate, toDate) {
  const startDate = new Date(fromDate);
  const endDate = new Date(toDate);
  const dateRange = [];
  for (
    let date = startDate;
    date <= endDate;
    date.setDate(date.getDate() + 1)
  ) {
    dateRange.push(new Date(date));
  }
  return dateRange;
}

// TO UNBLOCK/BLOCK ALL USERS

router.post("/unblockAll", async (req, res) => {
  try {
    await EmployeeMaster.updateMany(
      {},
      { $set: { BLOCKSTATUS: req.body.status } }
    );
    return res.status(200).json({
      Status: "Success",
      Message: "Block Status Updated Successfully",
      Code: 200,
    });
  } catch (error) {
    console.error("Error updating attendance data:", error);
    return res.status(500).json({
      Status: "Error",
      Message: "Internal Server Error",
      Code: 500,
    });
  }
});

module.exports = router;

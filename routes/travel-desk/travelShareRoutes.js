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
const PushNotification = require("../../models/pushNotificationModel");

const getGrade = (grade) => {
  const gradeMapping = {
    E8: "E8",
    E7: "E7",
    E6: "E6",
    E5: "E5",
    E4: "E4",
    E3: "E3",
    TE2: "TE2",
    TE1: "TE1",
    ES2: "ES2",
    ES1: "ES1",
    S1: "S",
    S2: "S",
    S3: "S",
    S4: "S",
    S5: "S",
    S6: "S",
    S7: "S",
    S8: "S",
    Trainee: "Trainee",
  };
  return gradeMapping[grade] || "Trainee";
};

const eligibilityData = {
  METROS: {
    TRAVEL: "Actuals",
    BOARDING: {
      E8: Infinity,
      E7: 1500,
      E6: 1500,
      E5: 1100,
      E4: 950,
      E3: 950,
      TE2: 625,
      TE1: 625,
      ES2: 625,
      ES1: 625,
      S: 500,
      Trainee: 500,
    },
    LODGING: {
      E8: Infinity,
      E7: 4500,
      E6: 4500,
      E5: 3150,
      E4: 2800,
      E3: 2800,
      TE2: 1875,
      TE1: 1875,
      ES2: 1875,
      ES1: 1875,
      S: 1500,
      Trainee: 1500,
    },
    COMPOSITE: {
      E8: Infinity,
      E7: 6000,
      E6: 6000,
      E5: 4250,
      E4: 3750,
      E3: 3750,
      TE2: 2500,
      TE1: 2500,
      ES2: 2500,
      ES1: 2500,
      S: 2000,
      Trainee: 2000,
    },
    CONVEYANCE: "Actuals",
  },
  CLASS_A: {
    TRAVEL: "Actuals",
    LODGING: {
      E8: Infinity,
      E7: 4150,
      E6: 4150,
      E5: 2800,
      E4: 2600,
      E3: 2600,
      TE2: 1750,
      TE1: 1750,
      ES2: 1750,
      ES1: 1750,
      S: 1250,
      Trainee: 1250,
    },
    BOARDING: {
      E8: Infinity,
      E7: 1350,
      E6: 1350,
      E5: 950,
      E4: 850,
      E3: 850,
      TE2: 550,
      TE1: 550,
      ES2: 550,
      ES1: 550,
      S: 450,
      Trainee: 450,
    },
    COMPOSITE: {
      E8: Infinity,
      E7: 5500,
      E6: 5500,
      E5: 3750,
      E4: 3450,
      E3: 3450,
      TE2: 2300,
      TE1: 2300,
      ES2: 2300,
      ES1: 2300,
      S: 1700,
      Trainee: 1700,
    },
    CONVEYANCE: "Actuals",
  },
  CLASS_B: {
    TRAVEL: "Actuals",
    LODGING: {
      E8: Infinity,
      E7: 3750,
      E6: 3750,
      E5: 2650,
      E4: 2450,
      E3: 2450,
      TE2: 1500,
      TE1: 1500,
      ES2: 1500,
      ES1: 1500,
      S: 1100,
      Trainee: 1100,
    },
    BOARDING: {
      E8: Infinity,
      E7: 1250,
      E6: 1250,
      E5: 850,
      E4: 800,
      E3: 800,
      TE2: 500,
      TE1: 500,
      ES2: 500,
      ES1: 500,
      S: 400,
      Trainee: 400,
    },
    COMPOSITE: {
      E8: Infinity,
      E7: 5000,
      E6: 5000,
      E5: 3500,
      E4: 3250,
      E3: 3250,
      TE2: 2000,
      TE1: 2000,
      ES2: 2000,
      ES1: 2000,
      S: 1500,
      Trainee: 1500,
    },
    CONVEYANCE: "Actuals",
  },
};

let cityClassification = {
  Metros: [
    "Chennai",
    "Bangalore",
    "Hyderabad",
    "Delhi",
    "Mumbai",
    "Kolkata",
    "Pune",
    "Gurgaon",
    "NCR",
  ],
  ClassA: [
    "Vijayawada",
    "Mysore",
    "Mangalore",
    "Coorg",
    "Coimbatore",
    "Ooty",
    "Kodaikanal",
    "Port Blair",
    "Pondicherry",
    "Cochin",
    "Munnar",
    "Jammu",
    "Srinagar",
    "Manali",
    "Kulu",
    "Simla",
    "Ludhiana",
    "Amritsar",
    "Jalandhar",
    "Udaipur",
    "Jodhpur",
    "Mount Abu",
    "Faridabad",
    "Lucknow",
    "Kanpur",
    "Agra",
    "Varanasi",
    "Ghaziabad",
    "Allahabad",
    "Nainital",
    "Mussoorie",
    "Dehradun",
    "Nagpur",
    "Nasik",
    "Indore",
    "Bhopal",
    "Jabalpur",
    "Gwalior",
    "Surat",
    "Baroda",
    "Rajkot",
    "Ahmedabad",
    "Siliguri",
    "Darjeeling",
    "Malda",
    "Cuttack",
    "Jamshedpur",
    "Guwahati",
  ],
  ClassB: [], // This represents the rest of India
};

const stateCapitals = [
  "Agartala",
  "Aizawl",
  "Amaravati",
  "Bangalore",
  "Bhopal",
  "Bhubaneswar",
  "Bengaluru",
  "Chandigarh",
  "Chennai",
  "Dehradun",
  "Gairsain",
  "Dispur",
  "Daman",
  "Port Blair",
  "Kavaratti",
  "New Delhi",
  "Gandhinagar",
  "Gangtok",
  "Hyderabad",
  "Imphal",
  "Itanagar",
  "Jaipur",
  "Kohima",
  "Kolkata",
  "Lucknow",
  "Leh",
  "Kargil",
  "Mumbai",
  "Panaji",
  "Patna",
  "Puducherry",
  "Raipur",
  "Ranchi",
  "Shillong",
  "Shimla",
  "Srinagar",
  "Jammu",
  "Thiruvananthapuram",
];

// Combine ClassA and state capitals
const classAWithCapitals = [
  ...new Set([...cityClassification.ClassA, ...stateCapitals]),
];
cityClassification.ClassA = classAWithCapitals;

const getCityClassification = (city) => {
  const normalizedCity = city.trim().toLowerCase();
  if (
    cityClassification.Metros.some(
      (c) => c.trim().toLowerCase() === normalizedCity
    )
  ) {
    return "METROS";
  } else if (
    cityClassification.ClassA.some(
      (c) => c.trim().toLowerCase() === normalizedCity
    )
  ) {
    return "CLASS_A";
  } else {
    return "CLASS_B";
  }
};

// const getCityClassification = (city) => {
//     if (cityClassification.Metros.includes(city)) {
//         return 'METROS';
//     } else if (cityClassification.ClassA.includes(city)) {
//         return 'CLASS_A';
//     } else {
//         return 'CLASS_B';
//     }
// };

const getGradeKey = (grade) => {
  const sGrades = ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"];
  const tGrades = ["T1", "T2", "T3", "T4", "T5", "T6"];
  if (sGrades.includes(grade)) return "S";
  if (tGrades.includes(grade)) return "T";
  return grade;
};

// const validateExpense = (city, grade, amount, type, attachments, duration) => {
//     console.log("===========city, grade, amount, type, attachments, duration", city, grade, amount, type, attachments, duration)
//     const cityClass = getCityClassification(city);
//     const gradeKey = getGradeKey(grade);
//     console.log("===cityClass====",cityClass);
//     console.log("===type====",type);
//     console.log("===grade====",grade);
//     console.log("===gradeKey====",gradeKey);
//     let maxAmount = eligibilityData[cityClass][type][gradeKey];
//     console.log("===maxAmount====",maxAmount);
//     // Validation for Boarding expenses without bills
//     if (type === 'BOARDING' && attachments.length === 0) {
//         if (['S', 'T'].includes(gradeKey) && amount <= 100) return true;
//         if (['E1', 'E2'].includes(gradeKey) && amount <= 200) return true;
//         if (!['S', 'T', 'E1', 'E2'].includes(gradeKey) && amount <= 100) return true;
//     }

//     if (type === 'TRAVEL') {
//         return true;
//     }

//     if (type === 'BOARDING') {
//         if(maxAmount != undefined){
//             if (attachments.length === 0) {
//                 if (amount <= maxAmount * 0.5) {
//                     return true;
//                 }
//             } else if (amount <= maxAmount) {
//                 return true;
//             }
//         } else {
//             return true;
//         }
//     }

//     // Validation for LODGING expenses
//     if (type === 'LODGING') {
//         if (attachments.length === 0) {
//             // Apply duration-based limits for LODGING expenses without bills
//             let allowedAmount = 0;
//             if (duration > 24) {
//                 allowedAmount = 400;
//             } else if (duration > 15) {
//                 allowedAmount = 250;
//             } else if (duration > 6) {
//                 allowedAmount = 150;
//             }
//             if (amount <= allowedAmount) {
//                 return true;
//             }
//         } else if (amount <= maxAmount) {
//             return true;
//         }
//     }

//     // Validation for COMPOSITE expenses
//     if (type === 'COMPOSITE') {

//         if (attachments.length === 0) {
//             // If no attachments (no bills), allow up to 50% of the max amount
//             let allowedAmount = maxAmount * 0.5;
//             if (duration > 24) {
//                 allowedAmount = 400;
//             } else if (duration > 15) {
//                 allowedAmount = 250;
//             } else if (duration > 6) {
//                 allowedAmount = 150;
//             }
//             if (amount <= allowedAmount) {
//                 return true;
//             }
//         } else if (amount <= maxAmount) {
//             return true;
//         }
//     }

//     return false;
// };

const validateTravelExpense = (city, grade, amount, totalDuration) => {
  const cityClass = getCityClassification(city);
  const maxAmount = eligibilityData[cityClass]["TRAVEL"];
  if (maxAmount === "Actuals") {
    return true;
  }
  return false;
};

const validateBoardingExpense = (
  city,
  grade,
  amount,
  attachments,
  totalDuration
) => {
  const cityClass = getCityClassification(city);
  const gradeKey = getGradeKey(grade);
  const maxAmount = eligibilityData[cityClass]["BOARDING"][gradeKey];
  console.log("=======gradeKey", gradeKey);
  console.log("=======cityClass", cityClass);
  console.log("=======maxAmount", maxAmount);
  // if (attachments.length === 0) {
  // if (['S', 'T'].includes(gradeKey) && amount <= 100) return true;
  // if (['E1', 'E2'].includes(gradeKey) && amount <= 200) return true;
  // if (!['S', 'T', 'E1', 'E2'].includes(gradeKey) && amount <= 100) return true;
  //     if (maxAmount !== undefined) {
  //         console.log("========amount",amount)
  //         console.log("========maxAmount",maxAmount * 0.5)
  //         if (amount <= maxAmount * 0.5) {
  //             return true;
  //         }
  //     }
  // } else {
  //     if (amount <= maxAmount ) {
  //         return true;
  //     }
  // }
  if (amount <= maxAmount) {
    return true;
  }
  return false;
};

const validateLodgingExpense = (
  city,
  grade,
  amount,
  attachments,
  totalDuration
) => {
  const cityClass = getCityClassification(city);
  const gradeKey = getGradeKey(grade);
  const maxAmount = eligibilityData[cityClass]["LODGING"][gradeKey];
  console.log(
    "=======eligibilityData-=====",
    eligibilityData[cityClass]["LODGING"][gradeKey]
  );
  console.log("=======gradeKey", gradeKey);
  console.log("=======cityClass", cityClass);
  console.log("=======maxAmount", maxAmount);

  if (attachments.length === 0 && +amount > 0) {
    return false;
  } else {
    if (amount <= maxAmount) {
      return true;
    }
  }
  return false;
};

const validateCompositeExpense = (
  city,
  grade,
  amount,
  attachments,
  totalDuration
) => {
  const cityClass = getCityClassification(city);
  const gradeKey = getGradeKey(grade);
  const maxAmount = eligibilityData[cityClass]["COMPOSITE"][gradeKey];
  console.log(
    "=======eligibilityData-=====",
    eligibilityData[cityClass]["COMPOSITE"][gradeKey]
  );
  console.log("=======gradeKey", gradeKey);
  console.log("=======cityClass", cityClass);
  console.log("=======maxAmount", maxAmount);
  // if (attachments.length === 0 && +amount > 0) {
  //     let allowedAmount = maxAmount * 0.5;
  //     if (amount <= allowedAmount) {
  //         return true;
  //     }
  // } else {
  //     if (amount <= maxAmount) {
  //         return true;
  //     }
  // }
  // return false;
  return true;
};

const validateConveyanceExpense = (
  city,
  grade,
  amount,
  attachments,
  totalDuration
) => {
  let maxAmount;

  const gradeKey = getGradeKey(grade);

  if (["S", "T"].includes(gradeKey)) {
    maxAmount = 100;
  } else {
    maxAmount = 200;
  }
  // if (['E1', 'E2'].includes(gradeKey)) {
  //     maxAmount = 200 * totalDuration;
  // }
  console.log("=======maxAmount", maxAmount);
  if (amount <= maxAmount) {
    return {
      bool: true,
      max: false,
    };
  }

  if (+amount > maxAmount) {
    return {
      bool: true,
      max: +amount > maxAmount,
    };
  }
  return {
    bool: false,
    max: false,
  };
};

const maxAmountOfBoading = (city, grade) => {
  const cityClass = getCityClassification(city);
  const gradeKey = getGradeKey(grade);
  const maxAmount = eligibilityData[cityClass]["BOARDING"][gradeKey];

  if (maxAmount) {
    return maxAmount;
  }
  return -1;
};

const maxAmountOfLoading = (city, grade) => {
  const cityClass = getCityClassification(city);
  const gradeKey = getGradeKey(grade);
  const maxAmount = eligibilityData[cityClass]["LODGING"][gradeKey];

  if (maxAmount) {
    return maxAmount;
  }
  return -1;
};

const maxAmountComposite = (city, grade) => {
  const cityClass = getCityClassification(city);
  const gradeKey = getGradeKey(grade);
  const maxAmount = eligibilityData[cityClass]["COMPOSITE"][gradeKey];
  if (maxAmount) {
    return maxAmount;
  }
  return -1;
};

module.exports = {
  validateTravelExpense,
  validateBoardingExpense,
  validateLodgingExpense,
  validateCompositeExpense,
  validateConveyanceExpense,
  maxAmountOfLoading,
  maxAmountOfBoading,
  maxAmountComposite,
};

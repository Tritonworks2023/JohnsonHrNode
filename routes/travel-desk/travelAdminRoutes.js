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
const LeaveDetail = require("../../models/leaveDetailModel");
const BranchMaster = require("../../models/branchMasterModel");
const Holiday = require("../../models/holidayModel");
const {
  Expense,
  Accommodation,
  Claim,
  TravelDesk,
} = require("../../models/travelDeskModel");

const { createNotification } = require("../hr-admin/shareRoutes");
const { init } = require("../../app");

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

// router.use(formatDateMiddleware);

router.post("/travel-lists", async (req, res) => {
  try {
    const {
      travel_from_date,
      travel_to_date,
      submit_from_date,
      submit_to_date,
      searchKey,
    } = req.body;

    let travelStartDate;
    let travelEndDate;
    let submitStartDate;
    let submitEndDate;
    // Ensure both from_date and to_date are provided
    if (travel_from_date && travel_to_date) {
      const [day, month, year] = travel_from_date.toString().split("/");
      const [endday, endmonth, endyear] = travel_to_date.toString().split("/");

      // Convert to ISO format and set start/end times
      const tr_startDate = new Date(`${year}-${month}-${day}`);
      console.log(
        tr_startDate,
        "====================== tr_startDate ===================="
      );
      const tr_endDate = new Date(`${endyear}-${endmonth}-${endday}`);
      console.log(
        tr_endDate,
        "====================== tr_endDate ===================="
      );
      travelStartDate = moment(tr_startDate).startOf("days");
      travelEndDate = moment(tr_endDate).endOf("days");
    } else if (submit_from_date && submit_to_date) {
      const [day, month, year] = submit_from_date.toString().split("/");
      const [endday, endmonth, endyear] = submit_to_date.toString().split("/");

      // Convert to ISO format and set start/end times
      const mov_startDate = new Date(`${year}-${month}-${day}`);
      const mov_endDate = new Date(`${endyear}-${endmonth}-${endday}`);
      submitStartDate = moment(mov_startDate).startOf("days");
      submitEndDate = moment(mov_endDate).endOf("days");
    }

    const searchRegex = new RegExp(["^.*", searchKey, ".*$"].join(""), "i");

    const travelLists = await LeaveDetail.aggregate([
      {
        $match:
          travel_from_date && travel_to_date
            ? {
                LVFRMDT: {
                  $gte: new Date(travelStartDate),
                  $lte: new Date(travelEndDate),
                },
              }
            : {},
      },
      {
        $match:
          submit_from_date && submit_to_date
            ? {
                createdAt: {
                  $gte: new Date(submitStartDate),
                  $lte: new Date(submitEndDate),
                },
              }
            : {},
      },
      {
        $match: searchKey
          ? {
              $or: [
                { BRCODE: searchRegex },
                { EMPNO: searchRegex },
                { JOURNEYMODE: searchRegex },
              ],
            }
          : {},
      },
      {
        $sort: { createdAt: -1 },
      },
    ]);

    if (!travelLists || travelLists.length === 0) {
      return res.status(404).json({
        Status: "Failed",
        Message: "No travel lists found for the specified employee",
        Data: [],
        Code: 404,
      });
    }

    return res.status(200).json({
      Status: "Success",
      Message: "Travel lists retrieved successfully",
      Data: travelLists,
      Code: 200,
    });
  } catch (error) {
    console.error("Error retrieving travel lists:", error);
    return res.status(500).json({
      Status: "Failed",
      Message: "Internal Server Error",
      Data: [],
      Code: 500,
    });
  }
});

router.post("/deviation-travel-lists", async (req, res) => {
  try {
    // Use aggregate to find TravelDesk documents with DEVIATION in movement and populate other fields
    const travelLists = await TravelDesk.aggregate([
      {
        $lookup: {
          from: "leavedetails", // Assuming the collection name for LeaveDetail is 'leavedetails'
          localField: "movement",
          foreignField: "_id",
          as: "movement",
        },
      },
      { $unwind: "$movement" },
      { $match: { "movement.DEVIATION": true } },
      {
        $lookup: {
          from: "employeemasters", // Assuming the collection name for EmployeeMaster is 'employeemasters'
          localField: "employee",
          foreignField: "_id",
          as: "employee",
        },
      },
      { $unwind: "$employee" },
      {
        $lookup: {
          from: "claims", // Assuming the collection name for Claim is 'claims'
          localField: "claim",
          foreignField: "_id",
          as: "claim",
        },
      },
      { $unwind: { path: "$claim", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "accommodations", // Assuming the collection name for Accommodation is 'accommodations'
          localField: "accommodation",
          foreignField: "_id",
          as: "accommodation",
        },
      },
      { $unwind: { path: "$accommodation", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "expenses", // Assuming the collection name for Expense is 'expenses'
          localField: "movement.travelExpenses",
          foreignField: "_id",
          as: "movement.travelExpenses",
        },
      },
      {
        $lookup: {
          from: "expenses",
          localField: "movement.boardingLodgingExpenses",
          foreignField: "_id",
          as: "movement.boardingLodgingExpenses",
        },
      },
      {
        $lookup: {
          from: "expenses",
          localField: "movement.conveyanceExpenses",
          foreignField: "_id",
          as: "movement.conveyanceExpenses",
        },
      },
    ]);

    if (!travelLists || travelLists.length === 0) {
      return res.status(200).json({
        Status: "Failed",
        Message: "No travel lists found for deviations",
        Data: [],
        Code: 404,
      });
    }

    return res.status(200).json({
      Status: "Success",
      Message: "Travel lists retrieved successfully (deviations only)",
      Data: travelLists,
      Code: 200,
    });
  } catch (error) {
    console.error("Error retrieving travel lists:", error);
    return res.status(500).json({
      Status: "Failed",
      Message: "Internal Server Error",
      Data: [],
      Code: 500,
    });
  }
});

router.post("/travel-data", async (req, res) => {
  try {
    const { id } = req.body;
    const travelData = await TravelDesk.findById(id).populate({
      path: "employee movement claim accommodation",
      populate: {
        path: "travelExpenses boardingLodgingExpenses conveyanceExpenses",
        model: "Expense",
      },
    });
    if (!travelData) {
      return res.status(200).json({
        Status: "Failed",
        Message: "Travel data not found",
        Data: {},
        Code: 404,
      });
    }

    return res.status(200).json({
      Status: "Success",
      Message: "Travel data retrieved successfully",
      Data: travelData,
      Code: 200,
    });
  } catch (error) {
    console.error("Error retrieving travel data:", error);
    return res.status(500).json({
      Status: "Failed",
      Message: "Internal Server Error",
      Data: {},
      Code: 500,
    });
  }
});

router.post("/travel-data-update", async (req, res) => {
  try {
    const { id, ticketDocuments, accommodationDocuments } = req.body;
    let updateData = {};
    if (ticketDocuments) {
      updateData.ticketDocuments = ticketDocuments;
    }
    if (accommodationDocuments) {
      updateData.accommodationDocuments = accommodationDocuments;
    }
    const travelData = await TravelDesk.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );

    if (!travelData) {
      return res.status(200).json({
        Status: "Failed",
        Message: "Travel data not found",
        Data: {},
        Code: 404,
      });
    }

    return res.status(200).json({
      Status: "Success",
      Message: "Travel data updated successfully",
      Data: travelData,
      Code: 200,
    });
  } catch (error) {
    console.error("Error updating travel data:", error);
    return res.status(500).json({
      Status: "Failed",
      Message: "Internal Server Error",
      Data: {},
      Code: 500,
    });
  }
});

router.post("/approve-expense", async (req, res) => {
  try {
    const { expenseId, action, approver } = req.body;
    const expense = await Expense.findById(expenseId);
    if (!expense) {
      return res.status(200).json({
        Status: "Failed",
        Message: "Expense not found",
        Code: 404,
      });
    }

    // Check if the expense has already been approved or rejected
    if (expense.finalApproval.status !== "PENDING") {
      return res.status(400).json({
        Status: "Failed",
        Message: "Expense has already been processed",
        Code: 400,
      });
    }

    if (action === "APPROVED") {
      expense.finalApproval.approver = approver;
      expense.finalApproval.status = "APPROVED";
    } else if (action === "REJECTED") {
      expense.finalApproval.approver = approver;
      expense.finalApproval.status = "REJECTED";
    } else {
      return res.status(400).json({
        Status: "Failed",
        Message: "Invalid action",
        Code: 400,
      });
    }

    if (expense.finalApproval.status !== "APPROVED") {
      return res.status(400).json({
        Status: "Failed",
        Message:
          "Both first and final approvals are required before creating or updating a claim",
        Code: 400,
      });
    }
    await expense.save();
    let claim = await Claim.findOne({ travelId: expense.travelId });
    if (claim) {
      switch (expense.type) {
        case "TRAVEL":
          const travelIndex = claim.travelExpenses.findIndex((e) =>
            e._id.equals(expense._id)
          );
          if (travelIndex !== -1) {
            claim.travelExpenses[travelIndex] = expense;
          } else {
            claim.travelExpenses.push(expense);
          }
          break;
        case "BOARDING":
          const boardingIndex = claim.boardingExpenses.findIndex((e) =>
            e._id.equals(expense._id)
          );
          if (boardingIndex !== -1) {
            claim.boardingExpenses[boardingIndex] = expense;
          } else {
            claim.boardingExpenses.push(expense);
          }
          break;
        case "LODGING":
          const lodgingIndex = claim.lodgingExpenses.findIndex((e) =>
            e._id.equals(expense._id)
          );
          if (lodgingIndex !== -1) {
            claim.lodgingExpenses[lodgingIndex] = expense;
          } else {
            claim.lodgingExpenses.push(expense);
          }
          break;
        case "COMPOSITE":
          const compositeIndex = claim.compositeExpenses.findIndex((e) =>
            e._id.equals(expense._id)
          );
          if (compositeIndex !== -1) {
            claim.compositeExpenses[compositeIndex] = expense;
          } else {
            claim.compositeExpenses.push(expense);
          }
          break;
        case "CONVEYANCE":
          const conveyanceIndex = claim.conveyanceExpenses.findIndex((e) =>
            e._id.equals(expense._id)
          );
          if (conveyanceIndex !== -1) {
            claim.conveyanceExpenses[conveyanceIndex] = expense;
          } else {
            claim.conveyanceExpenses.push(expense);
          }
          break;
        default:
          return res.status(400).json({
            Status: "Failed",
            Message: "Invalid expense type",
            Code: 400,
          });
      }
      await claim.save();
    } else {
      const claimExpenses = {
        TRAVEL: [],
        BOARDING: [],
        LODGING: [],
        COMPOSITE: [],
        CONVEYANCE: [],
      };
      claimExpenses[expense.type].push(expense);

      claim = new Claim({
        travelId: expense.travelId,
        travelExpenses: claimExpenses.TRAVEL,
        boardingExpenses: claimExpenses.BOARDING,
        lodgingExpenses: claimExpenses.LODGING,
        compositeExpenses: claimExpenses.COMPOSITE,
        conveyanceExpenses: claimExpenses.CONVEYANCE,
      });
      await claim.save();
    }

    res.json({
      Status: "Success",
      Message: `Expense ${action.toLowerCase()} successfully`,
      Data: expense,
      Code: 200,
    });
  } catch (error) {
    console.error("Error processing expense approval:", error);
    res.status(500).json({
      Status: "Failed",
      Message: "Internal Server Error",
      Code: 500,
    });
  }
});

router.post("/multi-approve-expense", async (req, res) => {
  try {
    const { expenseIds, action, approver } = req.body;

    if (!Array.isArray(expenseIds) || expenseIds.length === 0) {
      return res.status(400).json({
        Status: "Failed",
        Message: "Expense IDs must be a non-empty array",
        Code: 400,
      });
    }

    if (!["APPROVED", "REJECTED"].includes(action)) {
      return res.status(400).json({
        Status: "Failed",
        Message: "Invalid action",
        Code: 400,
      });
    }
    const updatedExpenses = [];

    for (const expenseId of expenseIds) {
      console.log(
        expenseIds,
        "+++++++++++++++++++++++++++++++++++expenseIds+++++++++++++++++++++++++++++++++++++++++++++++"
      );

      // Find the expense with the specific nested expense ID
      const expense = await Expense.findOne({ "expenses._id": expenseId });

      if (!expense) {
        continue; // Skip invalid expense IDs
      }

      // Find the specific expense entry within the 'expenses' array
      const specificExpense = expense.expenses.find(
        (exp) => exp._id.toString() === expenseId
      );

      // Check if the expense has already been approved or rejected
      if (specificExpense.expenseApproval.status !== "PENDING") {
        continue; // Skip already processed expenses
      }
      console.log(
        expenseIds,
        "+++++++++++++++++++++++++++++++++++expenseIds+++++++++++++++++++++++++++++++++++++++++++++++"
      );

      // Update the approver and status for this specific expense
      specificExpense.expenseApproval.approver = approver;
      specificExpense.expenseApproval.status = action;
      expense.expenseDeviationTDA.approver = approver;
      expense.expenseDeviationTDA.status = action;
      // Ensure firstApproval and finalApproval status are not empty or invalid
      if (!expense.firstApproval.status) {
        expense.firstApproval.status = "PENDING";
      }

      if (!expense.finalApproval.status) {
        expense.finalApproval.status = "PENDING";
      }

      // Save the updated expense
      await expense.save();

      updatedExpenses.push(expense._id);
    }

    // Remove duplicate expense IDs
    const uniqueUpdatedExpenses = [...new Set(updatedExpenses)];

    for (let ids of uniqueUpdatedExpenses) {
      const expense = await Expense.findById(ids);

      if (!expense) {
        continue; // Skip if expense doesn't exist
      }

      let isPending = false;

      // Check if any of the nested expenses are still pending or rejected
      for (let expDetls of expense.expenses) {
        if (
          expDetls.expenseApproval.status === "PENDING" ||
          expDetls.expenseApproval.status === "REJECTED"
        ) {
          isPending = true;
          break;
        }
      }

      // If no pending expenses, update the final approval
      if (!isPending) {
        const now = new Date();

        // Convert the current time to IST by adding 5 hours and 30 minutes
        const istOffset = 5 * 60 * 60 * 1000 + 30 * 60 * 1000; // IST is UTC+5:30
        const istTime = new Date(now.getTime() + istOffset);
        expense.finalApproval.approver = approver;
        expense.finalApproval.status = action;
        expense.finalApproval.claimApprovedAt = istTime.toString();
        // Save the updated final approval
        await expense.save();
      }
      isPending = false;
    }

    if (updatedExpenses.length === 0) {
      return res.status(404).json({
        Status: "Failed",
        Message:
          "No valid expenses found or all expenses have already been processed",
        Code: 404,
      });
    }

    res.json({
      Status: "Success",
      Message: `Expenses ${action.toLowerCase()} successfully`,
      Data: updatedExpenses,
      Code: 200,
    });
  } catch (error) {
    console.error("Error processing expense approval:", error);
    res.status(500).json({
      Status: "Failed",
      Message: "Internal Server Error",
      Code: 500,
    });
  }
});

router.post("/expense-listby-travel", async (req, res) => {
  try {
    const travelId = req.body.travelId;

    const expenseData = await Expense.find({ travelId }).populate({
      path: "travelId",
      populate: {
        path: "movement",
        model: "LeaveDetail",
      },
    });

    if (!expenseData || expenseData.length === 0) {
      return res.status(404).json({
        Status: "Failed",
        Message: "No expense found for the specified travelId",
        Code: 404,
      });
    }
    // Check for LARRANGEMENTS and CARRANGEMENTS in the travel desk data if needed
    const travelDeskData = await TravelDesk.findById(travelId)
      .populate("movement", "LARRANGEMENTS CARRANGEMENTS")
      .exec();
    console.log(
      travelDeskData,
      "===================== travelDeskData ======================"
    );

    const { LARRANGEMENTS, CARRANGEMENTS } = travelDeskData?.movement || {};

    // Check if any expense includes BOARDING or LODGING types
    const BLFLAG = expenseData.some((expense) => {
      return Object.keys(expense.expenses).some((key) =>
        ["BOARDING", "LODGING"].includes(key)
      );
    });

    // Check if any expense includes COMPOSITE type
    const CFLAG = expenseData.some((expense) => {
      return Object.keys(expense.expenses).includes("COMPOSITE");
    });

    const groupData = new Map();

    expenseData.forEach((e) => {
      if (groupData.has(e.travelId._id)) {
        groupData.get(e.travelId._id).push(e);
      } else {
        groupData.set(e.travelId._id._id, [e]);
      }
    });

    const groupedDataObject = Object.fromEntries(groupData);

    // Initialize the result array
    let result = [];
    // Iterate over each claimId in groupedDataObject
    for (let claimId in groupedDataObject) {
      const claimsDetailsArray = groupedDataObject[claimId]; // Access array of claims for each claimId

      if (Array.isArray(claimsDetailsArray)) {
        // Check each detail in the claimsDetailsArray
        for (let details of claimsDetailsArray) {
          if (
            details.finalApproval.status === "PENDING" ||
            details.finalApproval.status === "REJECTED"
          ) {
            result.push(claimsDetailsArray);
            break; // Exit loop to avoid pushing the same array multiple times
          }
        }
      } else {
        console.error(
          `Error: claimsDetailsArray is not an array for claimId: ${claimId}`
        );
      }
    }

    res.status(200).json({
      Status: "Success",
      Message: "Expense retrieved successfully",
      Code: 200,
      LARRANGEMENTS,
      CARRANGEMENTS,
      BLFLAG,
      CFLAG,
      Data: result.flat(),
    });
  } catch (error) {
    console.error("Error retrieving expense:", error);
    res.status(500).json({
      Status: "Failed",
      Message: "Internal Server Error",
      Code: 500,
    });
  }
});

router.post("/expense-data", async (req, res) => {
  try {
    const { expenseId } = req.body;

    if (!expenseId) {
      return res.status(400).json({
        Status: "Failed",
        Message: "Expense ID is required",
        Code: 400,
      });
    }

    // Step 1: Fetch expense data by ID
    const expenseData = await Expense.findById(expenseId).lean();

    if (!expenseData) {
      return res.status(404).json({
        Status: "Failed",
        Message: "No expense found for the specified expenseId",
        Code: 404,
      });
    }

    // Step 2: Fetch travel data using travelId from expense data
    const travelData = await TravelDesk.findById(expenseData.travelId)
      .select("movement")
      .lean();

    if (!travelData) {
      return res.status(404).json({
        Status: "Failed",
        Message: "No travel data found for the specified travelId",
        Code: 404,
      });
    }

    const movementData = await LeaveDetail.findById(travelData.movement)
      .select("DEPARTUREDT RETURNDT")
      .lean();

    if (!movementData) {
      return res.status(404).json({
        Status: "Failed",
        Message: "No movement data found for the specified movement ID",
        Code: 404,
      });
    }

    // Combine data
    const responseData = {
      ...expenseData,
      movement: movementData,
    };

    res.status(200).json({
      Status: "Success",
      Message: "Expense retrieved successfully",
      Code: 200,
      Data: responseData,
    });
  } catch (error) {
    console.error("Error retrieving expense:", error);
    res.status(500).json({
      Status: "Failed",
      Message: "Internal Server Error",
      Code: 500,
    });
  }
});

router.post("/accommodation-listby-travel", async (req, res) => {
  try {
    const travelId = req.body.travelId;
    const accommodations = await Accommodation.find({ travelId });
    if (!accommodations || accommodations.length === 0) {
      return res.status(200).json({
        Status: "Failed",
        Message: "No accommodations found for the specified travelId",
        Code: 404,
      });
    }
    res.status(200).json({
      Status: "Success",
      Message: "Accommodations retrieved successfully",
      Code: 200,
      Data: accommodations,
    });
  } catch (error) {
    console.error("Error retrieving accommodations:", error);
    res.status(500).json({
      Status: "Failed",
      Message: "Internal Server Error",
      Code: 500,
    });
  }
});

router.post("/accommodation-approval-action", async (req, res) => {
  try {
    const { ACTION, APPROVER, accommodationId } = req.body;
    const accommodation = await Accommodation.findById(accommodationId);

    if (!accommodation) {
      return res.status(200).json({
        Status: "Failed",
        Message: "Accommodation not found",
        Code: 404,
      });
    }
    if (
      accommodation.approvals.status === "APPROVED" ||
      accommodation.approvals.status === "REJECTED"
    ) {
      return res.status(400).json({
        Status: "Failed",
        Message: "Accommodation request has already been processed",
        Code: 400,
      });
    }
    accommodation.approvals = {
      approver: APPROVER,
      status: ACTION,
    };
    await accommodation.save();

    if (ACTION === "APPROVED") {
      const travelDesk = await TravelDesk.findOneAndUpdate(
        { travelId: accommodation.travelId },
        { accommodation: accommodationId },
        { new: true }
      );
    }
    return res.status(200).json({
      Status: "Success",
      Message: `Accommodation request ${ACTION} successfully`,
      Data: accommodation,
      Code: 200,
    });
  } catch (error) {
    console.error("Error processing accommodation action:", error);
    return res.status(500).json({
      Status: "Failed",
      Message: "Internal Server Error",
      Code: 500,
    });
  }
});
router.post("/claim_approved", async (req, res) => {
  try {
    const travelId = req.body.travelId;
    const expenseData = await Expense.find({ travelId }).populate({
      path: "travelId",
      select: "_id",
      populate: {
        path: "movement",
        select: "LVCODE",
        model: "LeaveDetail",
      },
    });

    if (!expenseData || expenseData.length === 0) {
      return res.status(404).json({
        Status: "Failed",
        Message: "No expense found for the specified travelId",
        Code: 404,
      });
    }

    // Loop through expenseData
    for (let dtl of expenseData) {
      const td = dtl["expenseDeviationTDA"];
      const exp = dtl["expenses"];

      // Loop through TDA and expenses to update the amounts
      for (let tda of td) {
        exp.forEach((e) => {
          console.log(
            "=============================enter into date if out side ===============================",
            tda.date
          );
          const expd = new Date(e.date);
          const expyear = expd.getFullYear();
          const expmonth = String(expd.getMonth() + 1).padStart(2, "0");
          const expday = String(expd.getDate()).padStart(2, "0");
          let expDate = `${expyear}-${expmonth}-${expday}`;

          const tdad = new Date(tda.date);
          const tdayear = tdad.getFullYear();
          const tdamonth = String(tdad.getMonth() + 1).padStart(2, "0");
          const tdaday = String(tdad.getDate()).padStart(2, "0");
          let tdaDate = `${tdayear}-${tdamonth}-${tdaday}`;

          if (expDate === tdaDate) {
            if (+tda["BOARDING"].amount > 0) {
              e["BOARDING"].amount =
                e["BOARDING"].amount + +tda["BOARDING"].amount;
            }
            if (+tda["COMPOSITE"].amount > 0) {
              e["COMPOSITE"].amount =
                e["COMPOSITE"].amount + +tda["COMPOSITE"].amount;
            }
          }
        });
      }
    }

    // Return the modified expenseData without saving it
    res.status(200).json({
      Status: "Success",
      Message: "Claim approved details retrieved successfully",
      Code: 200,
      Data: expenseData,
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

router.post("/multi-settlemnt-expense", async (req, res) => {
  try {
    const { expenseIds, action, approver } = req.body;

    if (!Array.isArray(expenseIds) || expenseIds.length === 0) {
      return res.status(400).json({
        Status: "Failed",
        Message: "Expense IDs must be a non-empty array",
        Code: 400,
      });
    }

    if (!["SETTLED", "REJECTED"].includes(action)) {
      return res.status(400).json({
        Status: "Failed",
        Message: "Invalid action",
        Code: 400,
      });
    }
    const updatedExpenses = [];
    for (const expenseId of expenseIds) {
      console.log(expenseIds);
      const expense = await Expense.findById(expenseId);

      if (!expense) {
        continue; // Skip invalid expense IDs
      }

      // Check if the expense has already been approved or rejected
      if (expense.amountSettled.status !== "PENDING") {
        continue; // Skip already processed expenses
      }

      const now = new Date();

      // Convert the current time to IST by adding 5 hours and 30 minutes
      const istOffset = 5 * 60 * 60 * 1000 + 30 * 60 * 1000; // IST is UTC+5:30
      const istTime = new Date(now.getTime() + istOffset);

      expense.amountSettled.approver = approver;
      expense.amountSettled.status = action;
      expense.amountSettled.claimSettledAt = istTime.toString();

      await expense.save();

      updatedExpenses.push(expense);
    }

    if (updatedExpenses.length === 0) {
      return res.status(404).json({
        Status: "Failed",
        Message:
          "No valid expenses found or all expenses have already been processed",
        Code: 404,
      });
    }

    res.json({
      Status: "Success",
      Message: `Expenses ${action.toLowerCase()} successfully`,
      Data: updatedExpenses,
      Code: 200,
    });
  } catch (error) {
    console.error("Error processing expense approval:", error);
    res.status(500).json({
      Status: "Failed",
      Message: "Internal Server Error",
      Code: 500,
    });
  }
});

router.post("/approved_travel-lists_claim", async (req, res) => {
  try {
    const { isSettlement, from_date, to_date } = req.body;

    let startDate;
    let endDate;
    if (from_date && to_date) {
      const [day, month, year] = from_date.toString().split("/");
      const [endday, endmonth, endyear] = to_date.toString().split("/");

      startDate = moment(`${year}-${month}-${day}`).startOf("days");
      endDate = moment(`${endyear}-${endmonth}-${endday}`).endOf("days");
    }

    console.log(
      "=======================startDate and endDate ==============================",
      startDate,
      endDate,
      new Date(startDate),
      new Date(endDate)
    );
    let obj;
    if (isSettlement) {
      obj = {
        $match:
          endDate && startDate
            ? {
                "expenceDetails.amountSettled.status": "SETTLED",
                "expenceDetails.amountSettled.claimSettledAt": {
                  $gte: new Date(startDate),
                  $lte: new Date(endDate),
                },
              }
            : {
                "expenceDetails.amountSettled.status": "SETTLED",
              },
      };
    } else {
      obj = {
        $match:
          endDate && startDate
            ? {
                "expenceDetails.finalApproval.status": "APPROVED",
                "expenceDetails.amountSettled.status": "PENDING",
                "expenceDetails.finalApproval.claimApprovedAt": {
                  $gte: new Date(startDate),
                  $lte: new Date(endDate),
                },
              }
            : {
                "expenceDetails.finalApproval.status": "APPROVED",
                "expenceDetails.amountSettled.status": "PENDING",
              },
      };
    }
    const travelLists = await TravelDesk.aggregate([
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
      obj,
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

    // const result = [];

    // for (let exp of travelLists) {
    //   const expDetails = exp["expenseDetails"];
    //   let isPendingOrRejected = false;

    //   for (let dtls of expDetails) {
    //     if (isSettlement) {
    //       if (
    //         dtls.finalApproval.status === "PENDING" ||
    //         dtls.finalApproval.status === "REJECTED" ||
    //         (dtls.amountSettled && dtls.amountSettled.status === "PENDING")
    //       ) {
    //         isPendingOrRejected = true;
    //         break;
    //       }
    //     } else {
    //       if (
    //         dtls.finalApproval.status === "PENDING" ||
    //         dtls.finalApproval.status === "REJECTED"
    //       ) {
    //         isPendingOrRejected = true;
    //         break;
    //       }
    //     }
    //   }

    //   if (!isPendingOrRejected && expDetails.length > 0) {
    //     result.push(exp);
    //   }
    // }

    res.status(200).json({
      Status: "Success",
      Message: "Claim settlement details retrieved successfully",
      Code: 200,
      Data: travelLists,
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

router.post("/submitted_travel-lists_claim", async (req, res) => {
  try {
    const { from_date, to_date } = req.body;

    let startDate;
    let endDate;

    // Ensure both from_date and to_date are provided
    if (from_date && to_date) {
      const [day, month, year] = from_date.toString().split("/");
      const [endday, endmonth, endyear] = to_date.toString().split("/");

      // Convert to ISO format and set start/end times
      startDate = moment(`${year}-${month}-${day}`).startOf("days");
      endDate = moment(`${endyear}-${endmonth}-${endday}`).endOf("days");
    }

    console.log(
      "============================================",
      startDate,
      endDate
    );
    // const travelLists = await TravelDesk.aggregate([
    //   {
    //     $match:
    //       startDate && endDate
    //         ? {
    //             "firstApproval.status": "PENDING",
    //             createdAt: {
    //               $gte: new Date(startDate),
    //               $lte: new Date(endDate),
    //             },
    //           }
    //         : { "firstApproval.status": "PENDING" },
    //   },
    //   {
    //     $lookup: {
    //       from: "expenses",
    //       localField: "_id",
    //       foreignField: "travelId",
    //       as: "expenseDetails",
    //     },
    //   },
    //   {
    //     $lookup: {
    //       from: "accommodations",
    //       localField: "accommodation",
    //       foreignField: "_id",
    //       as: "accommodation",
    //     },
    //   },
    //   {
    //     $lookup: {
    //       from: "leavedetails",
    //       localField: "movement",
    //       foreignField: "_id",
    //       as: "movement",
    //     },
    //   },
    //   {
    //     $unwind: "$movement",
    //   },
    //   {
    //     $lookup: {
    //       from: "employeemasters",
    //       localField: "employee",
    //       foreignField: "_id",
    //       as: "employee",
    //     },
    //   },
    //   {
    //     $addFields: {
    //       employee: { $arrayElemAt: ["$employee", 0] },
    //     },
    //   },
    // ]);
    const result = await TravelDesk.aggregate([
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
                "expenceDetails.firstApproval.status": "PENDING",
                "expenceDetails.finalApproval.status": "PENDING",
                "expenceDetails.amountSettled.status": "PENDING",
                "expenceDetails.createdAt": {
                  $gte: new Date(startDate),
                  $lte: new Date(endDate),
                },
              }
            : {
                "expenceDetails.firstApproval.status": "PENDING",
                "expenceDetails.finalApproval.status": "PENDING",
                "expenceDetails.amountSettled.status": "PENDING",
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
    // const result = [];

    // for (let exp of travelLists) {
    //   const expDetails = exp["expenseDetails"];
    //   let isPendingOrRejected = false;

    //   for (let dtls of expDetails) {
    //     if (
    //       dtls.finalApproval.status === "PENDING" ||
    //       dtls.finalApproval.status === "REJECTED"
    //     ) {
    //       isPendingOrRejected = true;
    //       break;
    //     }
    //   }

    //   if (isPendingOrRejected) {
    //     result.push(exp);
    //   } else if (from_date && to_date) {
    //     result.push(exp);
    //   }
    // }
    res.status(200).json({
      Status: "Success",
      Message: "Claim settlement details retrieved successfully",
      Code: 200,
      Data: result,
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

// dashboard count

router.post("/dashboard", async (req, res) => {
  try {
    const { from_date, to_date, filter } = req.body;

    let date;
    let fromDate;
    let toDate;

    switch (filter) {
      case "TODAY":
        date = moment().startOf("day");
        break;
      case "WEEKLY":
        date = moment().startOf("week");
        break;
      case "MONTHLY":
        date = moment().startOf("month");
        break;
      case "QUARTERLY":
        date = moment().startOf("quarter");
        break;
      case "ANNUAL":
        date = moment().startOf("year");
        break;
    }

    if (from_date && to_date) {
      fromDate = moment(from_date).startOf("day");
      toDate = moment(to_date).endOf("day");
    }
    console.log(
      new Date(date),
      "================================= date filter ========================="
    );
    const pendingCount = await Expense.aggregate([
      { $match: filter ? { createdAt: { $gte: new Date(date) } } : {} },
      {
        $match:
          from_date && to_date
            ? {
                createdAt: {
                  $gte: new Date(fromDate),
                  $lte: new Date(toDate),
                },
              }
            : {},
      },
      {
        $match: {
          "firstApproval.status": "PENDING",
          "finalApproval.status": "PENDING",
        },
      },
      { $count: "pendingCount" },
    ]);

    const pendingAmount = await Expense.aggregate([
      { $match: filter ? { createdAt: { $gte: new Date(date) } } : {} },
      {
        $match:
          from_date && to_date
            ? {
                createdAt: {
                  $gte: new Date(fromDate),
                  $lte: new Date(toDate),
                },
              }
            : {},
      },
      {
        $match: {
          "firstApproval.status": "PENDING",
          "finalApproval.status": "PENDING",
        },
      },
    ]);
    const approvedCount = await Expense.aggregate([
      {
        $match: filter
          ? { "finalApproval.claimApprovedAt": { $gte: new Date(date) } }
          : {},
      },
      {
        $match:
          from_date && to_date
            ? {
                "finalApproval.claimApprovedAt": {
                  $gte: new Date(fromDate),
                  $lte: new Date(toDate),
                },
              }
            : {},
      },
      {
        $match: {
          "finalApproval.status": "APPROVED",
        },
      },
      { $count: "approvedCount" },
    ]);

    const approvedAmount = await Expense.aggregate([
      {
        $match: filter
          ? { "finalApproval.claimApprovedAt": { $gte: new Date(date) } }
          : {},
      },
      {
        $match:
          from_date && to_date
            ? {
                "finalApproval.claimApprovedAt": {
                  $gte: new Date(fromDate),
                  $lte: new Date(toDate),
                },
              }
            : {},
      },
      {
        $match: {
          "finalApproval.status": "APPROVED",
        },
      },
    ]);

    const settledCount = await Expense.aggregate([
      {
        $match: filter
          ? { "amountSettled.claimSettledAt": { $gte: new Date(date) } }
          : {},
      },
      {
        $match:
          from_date && to_date
            ? {
                "amountSettled.claimSettledAt": {
                  $gte: new Date(fromDate),
                  $lte: new Date(toDate),
                },
              }
            : {},
      },
      {
        $match: {
          "amountSettled.status": "SETTLED",
        },
      },
      { $count: "settledCount" },
    ]);

    const settledAmount = await Expense.aggregate([
      {
        $match: filter
          ? { "amountSettled.claimSettledAt": { $gte: new Date(date) } }
          : {},
      },
      {
        $match:
          from_date && to_date
            ? {
                "amountSettled.claimSettledAt": {
                  $gte: new Date(fromDate),
                  $lte: new Date(toDate),
                },
              }
            : {},
      },
      {
        $match: {
          "amountSettled.status": "SETTLED",
        },
      },
    ]);

    const movementCount = await LeaveDetail.aggregate([
      {
        $match: filter ? { createdAt: { $gte: new Date(date) } } : {},
      },
      {
        $match:
          from_date && to_date
            ? {
                createdAt: {
                  $gte: new Date(fromDate),
                  $lte: new Date(toDate),
                },
              }
            : {},
      },
      { $count: "movementCount" },
    ]);
    console.log(
      pendingCount,
      "========================= pendingCount ============================"
    );

    // amount

    const e4AboveExpenseRecords = await LeaveDetail.aggregate([
      { $match: { GRADE: { $in: ["E4", "E5", "E6", "E7", "E8"] } } },
      {
        $lookup: {
          from: "expenses",
          localField: "travelId",
          foreignField: "travelId",
          as: "expenseList",
        },
      },
      {
        $unwind: {
          path: "$expenseList",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          expenseList: 1,
        },
      },
    ]);

    const e4BelowExpenseRecords = await LeaveDetail.aggregate([
      {
        $match: {
          GRADE: {
            $in: [
              "E3",
              "TE1",
              "TE2",
              "ES1",
              "ES2",
              "S1",
              "S2",
              "S3",
              "S4",
              "S5",
              "S6",
              "S7",
            ],
          },
        },
      },
      {
        $lookup: {
          from: "expenses",
          localField: "travelId",
          foreignField: "travelId",
          as: "expenseList",
        },
      },
      {
        $unwind: {
          path: "$expenseList",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          expenseList: 1,
        },
      },
    ]);

    const travelAmount = [];
    const boardingAmount = [];
    const lodgingAmount = [];
    const conveyanceAmount = [];
    const compositeAmount = [];
    const e4Belowtravel = [];
    const e4Belowboarding = [];
    const e4Belowlodging = [];
    const e4Belowconveyance = [];
    const e4Belowcomposite = [];
    console.log(
      e4AboveExpenseRecords,
      "============================= e4AboveExpenseRecords =========================="
    );
    e4AboveExpenseRecords.forEach((e) => {
      e.expenseList?.expenses.forEach((el) => {
        el.TRAVEL.amount.forEach((tr) => {
          travelAmount.push(tr.amount ? tr.amount : 0);
        });
        el.CONVEYANCE.amount.forEach((tr) => {
          conveyanceAmount.push(tr.amount ? tr.amount : 0);
        });
        compositeAmount.push(el.COMPOSITE.amount ? el.COMPOSITE.amount : 0);
        boardingAmount.push(el.BOARDING.amount ? el.BOARDING.amount : 0);
        lodgingAmount.push(el.LODGING.amount ? el.LODGING.amount : 0);
      });
    });

    // expenses below E4 level

    e4BelowExpenseRecords.forEach((e) => {
      e.expenseList?.expenses.forEach((el) => {
        el.TRAVEL.amount.forEach((tr) => {
          e4Belowtravel.push(tr.amount ? tr.amount : 0);
        });
        el.CONVEYANCE.amount.forEach((tr) => {
          e4Belowconveyance.push(tr.amount ? tr.amount : 0);
        });
        e4Belowcomposite.push(el.COMPOSITE.amount ? el.COMPOSITE.amount : 0);
        e4Belowboarding.push(el.BOARDING.amount ? el.BOARDING.amount : 0);
        e4Belowlodging.push(el.LODGING.amount ? el.LODGING.amount : 0);
      });
    });
    const e4TravelExpense = await travelAmount.reduce(
      (acc, cur) => acc + cur,
      0
    );

    const e4boardingExpense = await boardingAmount.reduce(
      (acc, cur) => acc + cur,
      0
    );
    const e4LodgingExpense = await lodgingAmount.reduce(
      (acc, cur) => acc + cur,
      0
    );
    const e4CompositeExpense = await compositeAmount.reduce(
      (acc, cur) => acc + cur,
      0
    );
    const e4ConveyanceExpense = await conveyanceAmount.reduce(
      (acc, cur) => acc + cur,
      0
    );

    // below E4
    const e4BelowTravelExpense = await e4Belowtravel.reduce(
      (acc, cur) => acc + cur,
      0
    );

    const e4BelowboardingExpense = await e4Belowboarding.reduce(
      (acc, cur) => acc + cur,
      0
    );
    const e4BelowLodgingExpense = await e4Belowlodging.reduce(
      (acc, cur) => acc + cur,
      0
    );
    const e4BelowCompositeExpense = await e4Belowcomposite.reduce(
      (acc, cur) => acc + cur,
      0
    );
    const e4BelowConveyanceExpense = await e4Belowconveyance.reduce(
      (acc, cur) => acc + cur,
      0
    );

    // dashboard total amount
    const dashboardtravelAmount = [];
    const dashboardconveyanceAmount = [];
    const dashboardcompositeAmount = [];
    const dashboardboardingAmount = [];
    const dashboardlodgingAmount = [];

    const totalPendingDashboard = [];
    const totalApprovedDashboard = [];
    const totalSettledDashboard = [];

    pendingAmount.forEach((e) => {
      e.expenses.forEach((el) => {
        el.TRAVEL.amount.forEach((tr) => {
          totalPendingDashboard.push(tr.amount ? tr.amount : 0);
        });
        el.CONVEYANCE.amount.forEach((tr) => {
          totalPendingDashboard.push(tr.amount ? tr.amount : 0);
        });
        totalPendingDashboard.push(
          el.COMPOSITE.amount ? el.COMPOSITE.amount : 0
        );
        totalPendingDashboard.push(el.BOARDING.amount ? el.BOARDING.amount : 0);
        totalPendingDashboard.push(el.LODGING.amount ? el.LODGING.amount : 0);
      });
    });

    approvedAmount.forEach((e) => {
      e.expenses.forEach((el) => {
        el.TRAVEL.amount.forEach((tr) => {
          totalApprovedDashboard.push(tr.amount ? tr.amount : 0);
        });
        el.CONVEYANCE.amount.forEach((tr) => {
          totalApprovedDashboard.push(tr.amount ? tr.amount : 0);
        });
        totalApprovedDashboard.push(
          el.COMPOSITE.amount ? el.COMPOSITE.amount : 0
        );
        totalApprovedDashboard.push(
          el.BOARDING.amount ? el.BOARDING.amount : 0
        );
        totalApprovedDashboard.push(el.LODGING.amount ? el.LODGING.amount : 0);
      });
    });

    settledAmount.forEach((e) => {
      e.expenses.forEach((el) => {
        el.TRAVEL.amount.forEach((tr) => {
          totalSettledDashboard.push(tr.amount ? tr.amount : 0);
        });
        el.CONVEYANCE.amount.forEach((tr) => {
          totalSettledDashboard.push(tr.amount ? tr.amount : 0);
        });
        totalSettledDashboard.push(
          el.COMPOSITE.amount ? el.COMPOSITE.amount : 0
        );
        totalSettledDashboard.push(el.BOARDING.amount ? el.BOARDING.amount : 0);
        totalSettledDashboard.push(el.LODGING.amount ? el.LODGING.amount : 0);
      });
    });

    console.log(
      totalPendingDashboard,
      "============================ totalPendingDashboard ===================================="
    );
    const pendingAmountDash = await totalPendingDashboard.reduce(
      (acc, cur) => acc + cur,
      0
    );
    const approvedAmountDash = await totalApprovedDashboard.reduce(
      (acc, cur) => acc + cur,
      0
    );
    const settledAmountDash = await totalSettledDashboard.reduce(
      (acc, cur) => acc + cur,
      0
    );
    res.status(200).json({
      Status: "Success",
      Message: "Dashboard retrieved successfully",
      Code: 200,
      Data: {
        movementCount: movementCount[0]?.movementCount ?? 0,
        pendingCount: pendingCount[0]?.pendingCount ?? 0,
        approvedCount: approvedCount[0]?.approvedCount ?? 0,
        settledCount: settledCount[0]?.settledCount ?? 0,
        e4AboveExpenseTotal:
          e4TravelExpense +
          e4boardingExpense +
          e4LodgingExpense +
          e4CompositeExpense +
          e4ConveyanceExpense,
        e4AboveExpense: {
          travelExpense: e4TravelExpense,
          boardingExpense: e4boardingExpense,
          lodgingExpense: e4LodgingExpense,
          compositeExpense: e4CompositeExpense,
          conveyanceExpense: e4ConveyanceExpense,
        },
        e4BelowExpenseTotal:
          e4BelowTravelExpense +
          e4BelowboardingExpense +
          e4BelowLodgingExpense +
          e4BelowCompositeExpense +
          e4BelowConveyanceExpense,
        e4BelowExpense: {
          travelExpense: e4BelowTravelExpense,
          boardingExpense: e4BelowboardingExpense,
          lodgingExpense: e4BelowLodgingExpense,
          compositeExpense: e4BelowCompositeExpense,
          conveyanceExpense: e4BelowConveyanceExpense,
        },
        totalPendingAmount: pendingAmountDash,
        totalSettledAmount: settledAmountDash,
        totalApprovedAmount: approvedAmountDash,
      },
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

//login

router.post("/login", async (req, res) => {
  try {
    const emploeeExist = await EmployeeMaster.findOne({
      EMPNO: req.body.EMPNO,
      PASSWORD: req.body.PASSWORD,
    });
    if (!emploeeExist) {
      res.status(404).json({
        Status: "Failed",
        Message: "User Not Found, Check User No and Password",
        Code: 404,
      });
    }
    res.status(200).json({
      Status: "Success",
      Message: "User Logged In successfully",
      Code: 200,
      Data: emploeeExist,
    });
  } catch (error) {
    console.error("Error on loogin:", error);
    res.status(500).json({
      Status: "Failed",
      Message: "Internal Server Error",
      Code: 500,
    });
  }
});

module.exports = router;

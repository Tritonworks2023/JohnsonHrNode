const mongoose = require("mongoose");

// Schema for Expense
const ExpenseSchema = new mongoose.Schema({
  travelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "TravelDesk",
    required: true,
  },
  totalAmount: { type: Number, required: true },
  description: { type: String },
  city: { type: String },
  totalDuration: { type: String },
  expenseDeviationTDA: [
    {
      date: { type: Date, required: true },
      COMPOSITE: {
        amount: { type: Number, required: true },
        fromLoc: { type: String },
        toLoc: { type: String },
        modified_amount: {
          type: Number,
        },
      },
      BOARDING: {
        amount: { type: Number, required: true },
        fromLoc: { type: String },
        toLoc: { type: String },
        modified_amount: {
          type: Number,
        },
      },
    },
  ],
  expenses: [
    {
      date: { type: Date, required: true },
      TRAVEL: {
        amount: {
          type: [
            {
              amount: {
                type: Number,
                required: true,
              },
              modified_amount: {
                type: Number,
              },
              modified_reason: {
                type: String,
              },
              fromLoc: {
                type: String,
                required: true,
              },
              toLoc: {
                type: String,
                required: true,
              },
            },
          ],
          required: true,
        },
        receipt: { type: [String], required: true },
        description: { type: String },
        city: { type: String },
      },
      COMPOSITE: {
        amount: { type: Number },
        modified_amount: {
          type: Number,
        },
        modified_reason: {
          type: String,
        },
        receipt: { type: [String] },
        fromLoc: { type: String },
        toLoc: { type: String },
        description: { type: String },
        city: { type: String },
      },
      BOARDING: {
        amount: { type: Number },
        modified_amount: {
          type: Number,
        },
        modified_reason: {
          type: String,
        },
        receipt: { type: [String] },
        fromLoc: { type: String },
        toLoc: { type: String },
        description: { type: String },
        city: { type: String },
      },
      LODGING: {
        amount: { type: Number },
        modified_amount: {
          type: Number,
        },
        modified_reason: {
          type: String,
        },
        receipt: { type: [String] },
        fromLoc: { type: String },
        toLoc: { type: String },
        description: { type: String },
        city: { type: String },
        gst: { type: Boolean, default: false },
        gst_info: {
          supply_type: { type: String },
          input_credit: { type: String },
          branch: { type: String },
          branch_gst_no: { type: String },
          supplier: { type: String },
          supplier_gst: { type: String },
          br_no: { type: String },
          date: { type: Date },
          bill_amount: { type: Number },
          hsn_sac_code: { type: String, maxlength: 10 },
          taxable_amount: { type: Number },
          sgst_percent: { type: Number },
          cgst_percent: { type: Number },
          igst_percent: { type: Number },
          sgst: { type: Number },
          cgst: { type: Number },
          igst: { type: Number },
          total_tax_amount: { type: Number },
          round_off_amount: { type: Number },
        },
      },
      CONVEYANCE: {
        amount: {
          type: [
            {
              amount: {
                type: Number,
                required: true,
              },
              modified_amount: {
                type: Number,
              },
              modified_reason: {
                type: String,
              },
              fromLoc: {
                type: String,
                required: true,
              },
              toLoc: {
                type: String,
                required: true,
              },
            },
          ],
          required: true,
        },
        receipt: { type: [String], required: true },
        description: { type: String },
        city: { type: String },
      },
      expenseApproval: {
        approver: { type: String },
        status: {
          type: String,
          enum: ["PENDING", "APPROVED", "REJECTED", "CANCELLED"],
          default: "PENDING",
        },
      },
    },
  ],
  firstApproval: {
    approver: { type: String },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "CANCELLED"],
      default: "PENDING",
    },
  },
  finalApproval: {
    approver: { type: String },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "CANCELLED"],
      default: "PENDING",
    },
    claimApprovedAt: { type: Date },
  },
  amountSettled: {
    approver: { type: String },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "SETTLED", "CANCELLED"],
      default: "PENDING",
    },
    claimSettledAt: { type: Date },
  },
  tda: { type: Number },
  createdAt: { type: Date, default: new Date() },
  updatedAt: { type: Date, default: new Date() },
});

const Expense = mongoose.model("Expense", ExpenseSchema);

// Schema for Accommodation
const AccommodationSchema = new mongoose.Schema({
  travelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "TravelDesk",
    required: true,
  },
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "EmployeeMaster",
    required: true,
  },
  approvals: {
    approver: { type: String },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "CANCELLED"],
      default: "PENDING",
    },
  },
  checkInDate: { type: Date, required: true },
  checkInTime: String,
  checkOutDate: { type: Date, required: true },
  checkOutTime: String,
  placeVisited: String,
  city: String,
  hotelName: String,
  description: String,
});

const Accommodation = mongoose.model("Accommodation", AccommodationSchema);

const TravelDeskSchema = new mongoose.Schema(
  {
    travelId: { type: String, unique: true, required: true },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EmployeeMaster",
      required: true,
    },
    movement: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeaveDetail",
      required: true,
    },
    accommodation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Accommodation",
      required: false,
    },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "CANCELLED"],
      default: "PENDING",
    },
    brcode: { type: String, ref: "BranchMaster", required: true },
    ticketDocuments: { type: Array },
    accommodationDocuments: { type: Array },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const TravelDesk = mongoose.model("TravelDesk", TravelDeskSchema);

module.exports = { Expense, Accommodation, TravelDesk };

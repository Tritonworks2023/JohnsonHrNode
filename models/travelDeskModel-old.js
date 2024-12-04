const mongoose = require('mongoose');

// Schema for Expense
const ExpenseSchema = new mongoose.Schema({
    travelId: { type: mongoose.Schema.Types.ObjectId, ref: 'TravelDesk', required: true },
    totalAmount: { type: Number, required: true },
    description: { type: String },
    city: { type: String },
    totalDuration: { type: String },
    expenseDeviationData: { type: Array },
    expenseDeviationTDA: { type: Array },
    type: { type: String, enum: ['TRAVEL','BOARDING', 'LODGING', 'COMPOSITE' , 'CONVEYANCE'], required: true },
    firstApproval: {
        approver: { type: String },
        status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' }
    },
    finalApproval: {
        approver: { type: String },
        status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' }
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const Expense = mongoose.model('Expense', ExpenseSchema);

// Schema for Claim
const ClaimSchema = new mongoose.Schema({
    travelId: { type: mongoose.Schema.Types.ObjectId, ref: 'TravelDesk', required: true },
    travelExpenses: [ExpenseSchema],
    boardingExpenses: [ExpenseSchema],
    lodgingExpenses: [ExpenseSchema],
    compositeExpenses: [ExpenseSchema],
    conveyanceExpenses: [ExpenseSchema]
});

const Claim = mongoose.model('Claim', ClaimSchema);

// Schema for Accommodation
const AccommodationSchema = new mongoose.Schema({
    travelId: { type: mongoose.Schema.Types.ObjectId, ref: 'TravelDesk', required: true },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'EmployeeMaster', required: true },
    approvals: {
        approver: { type: String},
        status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' }
    },
    checkInDate: { type: Date, required: true },
    checkInTime: String,
    checkOutDate: { type: Date, required: true },
    checkOutTime: String,
    placeVisited: String,
    city: String,
    hotelName: String,
    description: String
});

const Accommodation = mongoose.model('Accommodation', AccommodationSchema);

const TravelDeskSchema = new mongoose.Schema({
    travelId: { type: String, unique: true, required: true },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'EmployeeMaster', required: true },
    movement: { type: mongoose.Schema.Types.ObjectId, ref: 'LeaveDetail', required: true },
    claim: { type: mongoose.Schema.Types.ObjectId, ref: 'Claim', required: false },
    accommodation: { type: mongoose.Schema.Types.ObjectId, ref: 'Accommodation', required: false },
    status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
    brcode: { type: String, ref: 'BranchMaster', required: true },
    ticketDocuments: { type: Array },
    accommodationDocuments: { type: Array },
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

TravelDeskSchema.virtual('totalAmount').get(function() {
    const claim = this.claim || { travelExpenses: [], boardingExpenses: [], lodgingExpenses: [], compositeExpenses: [], conveyanceExpenses: [] };
  
    const totalTravelExpenses = claim.travelExpenses.reduce((total, expense) => total + expense.amount, 0);
    const totalBoardingExpenses = claim.boardingExpenses.reduce((total, expense) => total + expense.amount, 0);
    const totalLodgingExpenses = claim.lodgingExpenses.reduce((total, expense) => total + expense.amount, 0);
    const totalCompositeExpenses = claim.compositeExpenses.reduce((total, expense) => total + expense.amount, 0);
    const totalConveyanceExpenses = claim.conveyanceExpenses.reduce((total, expense) => total + expense.amount, 0);
    return totalTravelExpenses + totalBoardingExpenses + totalLodgingExpenses + totalCompositeExpenses + totalConveyanceExpenses;
  });
  
const TravelDesk = mongoose.model('TravelDesk', TravelDeskSchema);

module.exports = { Expense, Accommodation, Claim, TravelDesk };

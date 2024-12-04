const mongoose = require('mongoose');
const mongooseTimestamp = require('mongoose-timestamp');

const branchMasterSchema = new mongoose.Schema({
    BRCODE: { type: String, required: true , index: true},
    BRNAME: { type: String, required: true },
    BRADDRESS: { type: String, required: true },
    BRLAT: { type: String, required: true },
    BRLNG: { type: String, required: true },
    MARKEDLAT: { type: String },
    MARKEDLNG: { type: String },
    MARKEDAREA: { type: Number, default: 100 },
    MEASUREMENT: {},
    CREATEDDATE: { type: Date, default: Date.now },
    MODIFIEDDATE: { type: Date },
    BRSTATUS: { type: String },
    BRSTARTTIME: { type: String, default: '08:30' }, 
    BRENDTIME: { type: String, default: '17:30' },   
});

branchMasterSchema.plugin(mongooseTimestamp);
const BranchMaster = mongoose.model("BranchMaster", branchMasterSchema);
module.exports = BranchMaster;
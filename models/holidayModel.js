const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema({
    HLDYYR: { type: Number, required: true , index: true},
    HLDYDT: { type: Date, required: true , index: true},
    BRCODE: { type: String, required: true , index: true},
    HLDYCD: { type: String, required: true },
    HLCODE: { type: String },
    HLDYNAME: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

holidaySchema.index({ HLDYDT: 1, BRCODE: 1, HLDYYR: 1 });

// Create a model using the schema
const Holiday = mongoose.model('Holiday', holidaySchema);

module.exports = Holiday;

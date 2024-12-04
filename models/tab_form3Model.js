var mongoose = require('mongoose');
const Schema = mongoose.Schema; 
const tab_form_three_managementSchema = new mongoose.Schema({  
    collection_type : String,
    current_date : String,
    uploaded_file : Array,
    Agent_code : String,
    cheq_no : String,
    rtgs_no : String,
    cheq_amount : Number,
    cheq_date : String, 
    bank_name : String,
    ifsc_code : String,
    third_party_chq : String,
    ded_it : Number,
    ded_gst : Number,
    JLS_SD : Number,
    ded_other_one_type :  String,
    ded_other_one_value : Number,
    ded_other_two_type :  String,
    ded_other_two_value : Number,
    total : Number,
    job_details : Array,
    remarks : String,
    created_by : String,
    sequenceNo: String,
    JLS_VCHBANKCODE: String,
    JLS_BRCODE: String,
    JLS_USERCODE: String,
    JLS_UTRCUSNAME: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

tab_form_three_managementSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

mongoose.model('tab_form_three_management', tab_form_three_managementSchema);
module.exports = mongoose.model('tab_form_three_management');
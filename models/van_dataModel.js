var mongoose = require('mongoose');
const Schema = mongoose.Schema; 
var timestamps = require('mongoose-timestamp');
var van_dataSchema = new mongoose.Schema({  


  issue_Number : String,
  job_id :  String,
  user_mobile_no : String,
  material_id : String,
  qr_bar_code : Array,
  mat_list : Array,
  JLS_MRD_MRSEQNO : Number,
  signature : String,
  emp_no : String,
  submitted_on : String,
  actual_qty : Number



});
mongoose.model('van_data', van_dataSchema);
van_dataSchema.plugin(timestamps);
module.exports = mongoose.model('van_data');
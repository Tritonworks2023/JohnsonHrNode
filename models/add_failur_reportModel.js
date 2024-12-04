var mongoose = require('mongoose');
const Schema = mongoose.Schema; 
var timestamps = require('mongoose-timestamp');
var add_failure_reportSchema = new mongoose.Schema({  

  report_date : String,
  branch_name : String,
  job_id : String,
  site_name : String,
  department_name : String,
  type_of_ser : String,
  device_name : String,
  model_no : String,
  rating : String,
  serial_no : String,
  device_ins_date : String,
  date_of_failure : String,
  failure_obs : String,
  incom_suppy_voltage : String,
  comments : String,
  env_condition : String,
  mech_name : String,
  mech_signature : String,
  eng_name : String,
  eng_signature : String,
  
  submitted_by_emp_code : String,
  submitted_by_num : String,
  submitted_by_name : String,
  submitted_by_on : String,
  delete_status : Boolean
  
});
mongoose.model('add_failure_report', add_failure_reportSchema);
add_failure_reportSchema.plugin(timestamps);
module.exports = mongoose.model('add_failure_report');
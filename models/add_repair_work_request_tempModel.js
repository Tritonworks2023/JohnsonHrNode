var mongoose = require('mongoose');
const Schema = mongoose.Schema; 
var timestamps = require('mongoose-timestamp');
var add_repair_work_request_tempSchema = new mongoose.Schema({  


  request_on :  String,
  job_id : String,
  site_name : String,
  br_code : String,
  route : String,
  status : String,
  mat_available_sts : String,
  remarks : String,
  tech_name : String,
  tech_code :  String,
  submitted_by_emp_code : String,
  submitted_by_num : String,
  submitted_by_name : String,
  submitted_by_on : String,
  repair_work_eng_id : String,
  repair_work_eng_phone : String,
  repair_work_eng_name : String,
  repair_work_eng_date : String,
  delete_status : Boolean,
  file_image : Array,
  JOB_STATUS : String,
  JOB_VIEW_STATUS : String,
  LAST_UPDATED_TIME : String,
  JOB_START_TIME :  String,
  JOB_END_TIME :  String,

  
});
mongoose.model('add_repair_work_request_temp', add_repair_work_request_tempSchema);
add_repair_work_request_tempSchema.plugin(timestamps);
module.exports = mongoose.model('add_repair_work_request_temp');
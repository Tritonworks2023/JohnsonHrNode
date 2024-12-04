var mongoose = require('mongoose');
const Schema = mongoose.Schema; 
var timestamps = require('mongoose-timestamp');
var add_repair_work_job_hazadSchema = new mongoose.Schema({  
  
  pref_id : String,
  rb_no : String,
  report_date :  String,
  job_no : String,
  br_code : String,
  site_name : String,
  nature_of_work : String,

  GRW01:  String,
  GRW02:  String,
  GRW03:  String,
  GRW04:  String,
  GRW05:  String,
  GRW06:  String,
  GRW07:  String,
  GRW08:  String,

  MRW01:  String,
  MRW02:  String,
  MRW03:  String,
  MRW04:  String,
  MRW05:  String,
  MRW06:  String,

  CRW01:  String,
  CRW02:  String,
  CRW03:  String,
  CRW04:  String,
  CRW05:  String,
  CRW06:  String,
  CRW07:  String,
  CRW08:  String,
  
  HRW01:  String,
  HRW02:  String,
  HRW03:  String,

  PRW01:  String,
  PRW02:  String,
  PRW03:  String,
  PRW04:  String,
  PRW05:  String,
  PRW06:  String,
  PRW07:  String,

  remarks:  String,
  mech_name : String,
  mech_emp_id : String,
  date_of_sub : String,
  mech_signature : String,
  eng_signature : String,
  eng_sign_date : String,

  submitted_by_num:  String,
  submitted_by_name:  String,
  submitted_by_emp_code:  String,
  submitted_by_on:  String,
  
  delete_status : Boolean

  
});
mongoose.model('add_repair_work_job_hazad',add_repair_work_job_hazadSchema);
add_repair_work_job_hazadSchema.plugin(timestamps);
module.exports = mongoose.model('add_repair_work_job_hazad');






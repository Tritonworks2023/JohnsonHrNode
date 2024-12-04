var mongoose = require('mongoose');
const Schema = mongoose.Schema; 
var timestamps = require('mongoose-timestamp');
var add_failur_report_tempSchema = new mongoose.Schema({  


  matl_return_type :  String,
  qr_bar_code : String,
  barCodeNo : String,
  status : String,
  matl_id : String,
  bar_code_job_no : String,
  fr_no : String,
  seq_no : String,
  br_code : String,
  job_id : String,
  comp_device_name : String,
  comp_device_no: String,
  depart_name : String,
  serv_type : String,
  model_make : String,
  rating: String,
  serial_no : String,
  failure_date : String,
  observation : String,
  supply_vol : String,
  inst_date : String,
  phys_cond : String,
  curr_status : String,
  tech_comment : String,
  mech_code : String,
  mech_name : String,
  eng_code : String,
  eng_name : String,
  reason_code : String,
  route_code : String,
  curlss_no : String,
  prvlss_no : String,
  nature_failure: String,
  vvf_remarks : String,
  vvf_item : String,
  vvvf_trip_while : String,
  vvvf_trip_type : String,
  encoder_checked : String,
  load_inside_lift : String,
  electric_supply : String,
  electric_volt : String,
  bat_check_status : String,
  bat_warranty_status : String,
  ins_address : String,
  customer_address : String,
  file_image : Array,
  app_status : String,
  submitted_by_emp_code : String,
  submitted_by_num : String,
  submitted_by_name : String,
  submitted_by_on : String,
  barcode_type: String,
  JLS_FLH_STATUS: String,
  delete_status : Boolean,
  deleteStatus: {
    type: Boolean,
    default: false
  },


  
});
mongoose.model('add_failur_report_temp', add_failur_report_tempSchema);
add_failur_report_tempSchema.plugin(timestamps);
module.exports = mongoose.model('add_failur_report_temp');
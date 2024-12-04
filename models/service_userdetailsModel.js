var mongoose = require('mongoose');
const Schema = mongoose.Schema; 
var timestamps = require('mongoose-timestamp');
var service_user_managementSchema = new mongoose.Schema({  
  
  user_mobile_no:  String,
  user_id : String,
  user_password :String,
  user_per_mob : String,
  user_name : String,
  user_email : String,
  user_introduced_by : String,
  user_location : String,
  user_mob_model : String,
  user_mob_os : String,
  user_mob_make : String,
  device_no : String,
  device_id : String,
  organisation_name : String,
  status : String,
  mobile_issue_date : Date,
  Documents : String,
  delete_status : Boolean,
  last_login_time : Date,
  last_logout_time: Date,
  user_token : String,
  user_type : String,
  emp_type : String,
  
  login_lat : String,
  login_long : String,
  login_address : String,
  logout_lat : String,
  logout_long : String,
  logout_address : String,



});

mongoose.model('service_user_management', service_user_managementSchema);
service_user_managementSchema.plugin(timestamps);
module.exports = mongoose.model('service_user_management');
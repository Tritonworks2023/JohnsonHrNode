var mongoose = require('mongoose');
const Schema = mongoose.Schema; 
var timestamps = require('mongoose-timestamp');
var audit_user_managementSchema = new mongoose.Schema({  
  user_id:  String,
  user_email_id : String,
  user_password : String,
  user_name : String,
  user_designation : String,
  user_role : String,
  user_type : String,
  user_status : String,
  reg_date_time : String,
  delete_status : Boolean,
  activity_access : Array,
});



mongoose.model('audit_user_management', audit_user_managementSchema);
audit_user_managementSchema.plugin(timestamps);
module.exports = mongoose.model('audit_user_management');
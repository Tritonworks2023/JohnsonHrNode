var mongoose = require('mongoose');
const Schema = mongoose.Schema; 
var timestamps = require('mongoose-timestamp');
var service_sub_adminSchema = new mongoose.Schema({  

  firstname : String,
  lastname : String,
  status : String,
  email_id : String,
  mobile_no :  String,
  user_name :  String,
  password :  String,
  confirm_password :  String,
  access_live : Array,
  employee_detail :  Array,
  delete_status : String,
  last_login : Date


});
mongoose.model('service_sub_admin', service_sub_adminSchema);
service_sub_adminSchema.plugin(timestamps);
module.exports = mongoose.model('service_sub_admin');
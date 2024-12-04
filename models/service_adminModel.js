var mongoose = require('mongoose');
const Schema = mongoose.Schema; 
var timestamps = require('mongoose-timestamp');
var service_adminSchema = new mongoose.Schema({  
  first_name :  String,
  last_name : String,
  status : String,
  email_id : String,
  mobile_no : String,
  user_name : String,
  password : String,
  confirm_password : String,
  access_menu : Array,
  access_employee : Array,
  date_and_time : String
});

mongoose.model('service_admin', service_adminSchema);
service_adminSchema.plugin(timestamps);
module.exports = mongoose.model('service_admin');

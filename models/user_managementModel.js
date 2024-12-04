var mongoose = require('mongoose');
const Schema = mongoose.Schema; 
var timestamps = require('mongoose-timestamp');

var user_managementSchema = new mongoose.Schema({  
  user_id:  String,
  user_email_id : String,
  user_password : String,
  user_name : String,
  user_designation : String,
  user_role : String,
  user_type : String,
  user_status : String,
  reg_date_time : String,
  user_token : String,
  last_login_time : String,
  last_logout_time: String,
  delete_status : Boolean,
  imie_code : String,
  agent_code : String,
  location: String,
  device_id : String,
  login_lat : String,
  login_long : String,
  login_address : String,
  logout_lat : String,
  logout_long : String,
  logout_address : String,
  checkInStatus: String
  

});
mongoose.model('user_management', user_managementSchema);
user_managementSchema.plugin(timestamps);
module.exports = mongoose.model('user_management');
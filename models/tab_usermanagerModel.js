var mongoose = require('mongoose');
const Schema = mongoose.Schema; 
var timestamps = require('mongoose-timestamp');
var tab_user_managementSchema = new mongoose.Schema({  

  user_id:  String,
  user_password : String,
  user_name : String,
  user_location : String,
  user_agent_code : String,
  user_status : String,
  user_status_us_on_date : String,
  user_imei_no : String,
  delete_status : Boolean,

});
mongoose.model('tab_user_management', tab_user_managementSchema);
tab_user_managementSchema.plugin(timestamps);

module.exports = mongoose.model('tab_user_management');
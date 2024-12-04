var mongoose = require('mongoose');
const Schema = mongoose.Schema; 
var timestamps = require('mongoose-timestamp');
var admin_accessSchema = new mongoose.Schema({  

  firstname : String,
  lastname : String,
  status : String,
  email_id : String,
  mobile_no :  String,
  user_name :  String,
  password :  String,
  confirm_password :  String,
  access_location : Array,
  delete_status : String,
  last_login : Date,
  type: { type: String, default: "SERVICE" }, 


});
mongoose.model('admin_access', admin_accessSchema);
admin_accessSchema.plugin(timestamps);
module.exports = mongoose.model('admin_access');
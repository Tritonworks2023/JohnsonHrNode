var mongoose = require('mongoose');
const Schema = mongoose.Schema; 
var timestamps = require('mongoose-timestamp');
var service_attendanceSchema = new mongoose.Schema({  
  user_mobile_no : String,
  user_name : String,
  att_date : String,
  att_start_time : String,
  att_end_time : String,
  att_status : String,
  att_reason : String,
  att_start_lat: String,
  att_start_long: String,
  att_end_lat : String,
  att_end_long : String,
  att_no_of_hrs : String,
  attendance_data : Array,
});
mongoose.model('service_attendance', service_attendanceSchema);
service_attendanceSchema.plugin(timestamps);
module.exports = mongoose.model('service_attendance');
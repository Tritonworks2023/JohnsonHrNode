var mongoose = require('mongoose');
const Schema = mongoose.Schema; 
var timestamps = require('mongoose-timestamp');
var attendanceSchema = new mongoose.Schema({  
  attendance_name :  String,
  attendance_start_date : String,
  attendance_start_date_time : String,
  attendance_end_date : String,
  attendance_end_time : String,
  attendance_start_lat : Number,
  attendance_start_long : Number,
  attendance_end_lat : Number,
  attendance_end_long : Number,
  attendance_created_at : String,
  distance_start_range : Number,
  distance_end_range : Number,
  user_id : String,
  attendance_created_by : String,
});
mongoose.model('attendance', attendanceSchema);
attendanceSchema.plugin(timestamps);
module.exports = mongoose.model('attendance');
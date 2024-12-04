var mongoose = require('mongoose');
const Schema = mongoose.Schema; 
var timestamps = require('mongoose-timestamp');
var location_tracking_job_wiseSchema = new mongoose.Schema({  

  job_no : String,
  complaint_no : String,
  user_mobile_no : String,
  location_text : String,
  loc_lat : String,
  loc_long : String,
  date : Date,
  km : String,
  service_name : String,
  remarks : String,
  action : Number,

});
mongoose.model('location_tracking_job_wise', location_tracking_job_wiseSchema);
location_tracking_job_wiseSchema.plugin(timestamps);
module.exports = mongoose.model('location_tracking_job_wise');
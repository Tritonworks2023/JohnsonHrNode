var mongoose = require('mongoose');
const Schema = mongoose.Schema; 
var timestamps = require('mongoose-timestamp');
var errorlog_dataSchema = new mongoose.Schema({  

  job_no : String,
  service_type : String, // operation or service
  activity : String, //ESPD ACT
  follow_detail : String, //ESPD ACT
  url : String, //ESPD ACT
  date_time : Date, 
  data : Array,
  error_detail : Array,
  user_no : String,
  
});
mongoose.model('errorlog_data', errorlog_dataSchema);
errorlog_dataSchema.plugin(timestamps);
module.exports = mongoose.model('errorlog_data');
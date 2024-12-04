var mongoose = require('mongoose');

const Schema = mongoose.Schema; 

var resume_detailsSchema = new mongoose.Schema({  
  emp_id :  String,
  emp_email_id : String,
  emp_details : Array,
  emp_status : String,
  emp_verification: String,
  date_and_time : String
});
mongoose.model('resume_details', resume_detailsSchema);

module.exports = mongoose.model('resume_details');
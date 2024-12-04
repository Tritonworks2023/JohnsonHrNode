var mongoose = require('mongoose');

const Schema = mongoose.Schema; 

var projectdetailSchema = new mongoose.Schema({  
  company_id:  String,
  project_icon : String,
  project_name : String,
  type : String,
  start_date : String,
  end_date  : String,
  client_details : Array,
  employee_details : Array,
  date_and_time : String
});
mongoose.model('projectdetail', projectdetailSchema);

module.exports = mongoose.model('projectdetail');
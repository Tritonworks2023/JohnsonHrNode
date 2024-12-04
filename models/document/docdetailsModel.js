var mongoose = require('mongoose');

const Schema = mongoose.Schema; 

var docdetailSchema = new mongoose.Schema({  
  company_id:  String,
  project_id : String,
  file_name : String,
  file_type : String,
  file_link : String,
  access_status  : String,
  addi_info : String,
  date_and_time : String
});
mongoose.model('docdetail', docdetailSchema);

module.exports = mongoose.model('docdetail');
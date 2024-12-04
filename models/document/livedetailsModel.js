var mongoose = require('mongoose');

const Schema = mongoose.Schema; 

var livedetailSchema = new mongoose.Schema({  
  company_id:  String,
  project_id : String,
  catagories : String,
  file_name : String,
  file_type : String,
  file_link : String,
  access_status  : String,
  addi_info : String,
  date_and_time : String
});
mongoose.model('livedetail', livedetailSchema);

module.exports = mongoose.model('livedetail');
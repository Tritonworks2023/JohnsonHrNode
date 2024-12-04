var mongoose = require('mongoose');

const Schema = mongoose.Schema; 

var apidocdetailSchema = new mongoose.Schema({  
  
  company_id : String,
  project_id : String,
  model_type:  String,
  screen_name : String,
  title : String,
  url : String,
  method : String,
  bodytype  : String,
  params_and_types : Array,
  params_with_Test : String,
  successrep : String,
  failedrep : String,
  info : String,
  date_and_time : String
});
mongoose.model('apidocdetail', apidocdetailSchema);

module.exports = mongoose.model('apidocdetail');
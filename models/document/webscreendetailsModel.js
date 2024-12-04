var mongoose = require('mongoose');

const Schema = mongoose.Schema; 

var webscreenSchema = new mongoose.Schema({  
  company_id :  String,
  project_id :  String,
  screen_name : String,
  screen_path : String,
  access : String,
  additional_info : String,
  date_and_time : String
});
mongoose.model('webscreen', webscreenSchema);

module.exports = mongoose.model('webscreen');
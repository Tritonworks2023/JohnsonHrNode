var mongoose = require('mongoose');

const Schema = mongoose.Schema; 

var iosscreenSchema = new mongoose.Schema({  
  company_id :  String,
  project_id :  String,
  screen_name : String,
  screen_path : String,
  access : String,
  additional_info : String,
  date_and_time : String
});
mongoose.model('iosscreen', iosscreenSchema);

module.exports = mongoose.model('iosscreen');
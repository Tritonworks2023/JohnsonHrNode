var mongoose = require('mongoose');

const Schema = mongoose.Schema; 

var jobdetailsSchema = new mongoose.Schema({  
  first_name:  String,
  last_name : String,
  email_id : String,
  residential_address : String,
  date : String,
  month : String,
  year : String,
  gender : String,
  employer_name : String,
  designation_role : String,
  key_skills : String,
  B_degree : String,
  course : String,
  area_of_spec : String,
  file_path : String,

});
mongoose.model('jobdetails', jobdetailsSchema);

module.exports = mongoose.model('jobdetails');

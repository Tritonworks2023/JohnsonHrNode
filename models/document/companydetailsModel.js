var mongoose = require('mongoose');

const Schema = mongoose.Schema; 

var companydetailSchema = new mongoose.Schema({  
  company_log:  String,
  company_name : String,
  company_type : String,
  no_of_emp : Number,
  subscriber_type : String,
  package_end_date : String,
  about_company : String,
  create_at : String,
  status : String,
  email : String,
  password : String,
  company_id : String,
  date_of_create : String,
});
mongoose.model('companydetail', companydetailSchema);

module.exports = mongoose.model('companydetail');
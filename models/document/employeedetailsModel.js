var mongoose = require('mongoose');

const Schema = mongoose.Schema; 

var employeedetailSchema = new mongoose.Schema({  
  company_id:  String,
  fullname : String,
  email_id : String,
  password : Number,
  avator : String,
  designations : String,
  handling : String,
  noofexp : Number,
  access : String,
  add_info : String,
  date_of_create : String,
});
mongoose.model('employeedetail', employeedetailSchema);

module.exports = mongoose.model('employeedetail');
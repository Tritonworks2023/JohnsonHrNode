var mongoose = require('mongoose');

const Schema = mongoose.Schema; 

var companytypeSchema = new mongoose.Schema({  
  company_type:  String,
  date_and_time : String
});
mongoose.model('companytype', companytypeSchema);

module.exports = mongoose.model('companytype');
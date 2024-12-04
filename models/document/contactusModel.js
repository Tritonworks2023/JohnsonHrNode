var mongoose = require('mongoose');

const Schema = mongoose.Schema; 

var contactusSchema = new mongoose.Schema({  
  name :  String,
  mobile :  String,
  country : String,
  catagories : String,
  email : String,
  help_text : String,
  date_and_time : String
});
mongoose.model('contactus', contactusSchema);
module.exports = mongoose.model('contactus');
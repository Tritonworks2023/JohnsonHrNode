var mongoose = require('mongoose');
var timestamps = require('mongoose-timestamp');
const Schema = mongoose.Schema; 

var roll_managementSchema = new mongoose.Schema({  

  roll_name :  String,
  roll_access_data : Array,
  date_of_create : String,
  last_updated_at : String,
  created_by : String,
  last_updated_by : String

});
mongoose.model('roll_management', roll_managementSchema);
roll_managementSchema.plugin(timestamps);
module.exports = mongoose.model('roll_management');
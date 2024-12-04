var mongoose = require('mongoose');
const Schema = mongoose.Schema; 
var timestamps = require('mongoose-timestamp');
var service_temp_dataSchema = new mongoose.Schema({  
  user_mobile_no : String,
  jobId :  String,
  data_store : Array,
  key_value : String,
  page_number: String
});
mongoose.model('service_temp_data', service_temp_dataSchema);
service_temp_dataSchema.plugin(timestamps);
module.exports = mongoose.model('service_temp_data');
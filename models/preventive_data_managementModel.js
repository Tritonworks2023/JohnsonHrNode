var mongoose = require('mongoose');
var timestamps = require('mongoose-timestamp');
const Schema = mongoose.Schema; 

var preventive_data_managementSchema = new mongoose.Schema({  

SMU_SCH_COMPNO :  String,
SMU_SCH_SERTYPE  :  String,
  action_req_customer:  String,
  customer_name : String,
  customer_number : String,
  customer_signature : String,
  field_value : Array,
  job_id : String,
  job_status_type : String,
  mr_1 : String,
  mr_2 : String,
  mr_3 : String,
  mr_4 : String,
  mr_5 : String,
  mr_6 : String,
  mr_7 : String,
  mr_8 : String,
  mr_9 : String,
  mr_10 : String,
  mr_status : String,
  pm_status : String,
  preventive_check : String,
  tech_signature : String,
  user_mobile_no : String,


});
mongoose.model('preventive_data_management', preventive_data_managementSchema);
preventive_data_managementSchema.plugin(timestamps);
module.exports = mongoose.model('preventive_data_management');

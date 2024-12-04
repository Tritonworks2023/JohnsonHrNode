var mongoose = require('mongoose');
var timestamps = require('mongoose-timestamp');
const Schema = mongoose.Schema; 

var service_employee_activity_allocationSchema = new mongoose.Schema({  
  employee_no:  String,
  activity_code : String,
  activity_name : String,
  date_and_time : String
});
mongoose.model('service_employee_activity_allocation', service_employee_activity_allocationSchema);
service_employee_activity_allocationSchema.plugin(timestamps);

module.exports = mongoose.model('service_employee_activity_allocation');

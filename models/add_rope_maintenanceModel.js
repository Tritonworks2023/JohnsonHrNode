var mongoose = require('mongoose');
const Schema = mongoose.Schema; 
var timestamps = require('mongoose-timestamp');
var add_rope_maintenanceSchema = new mongoose.Schema({  

  job_id : String,
  building_name : String,
  machine_type : String,
  main_rope_dia : String,
  osg_rope_dia : String,
  activity_code : String,
  activity_code_list : Array,
  tech_name : String,
  tech_code : String,
  activity_date : String,
  remarks : String,
  
  submitted_by_emp_code : String,
  submitted_by_num : String,
  submitted_by_name : String,
  submitted_by_on : String,
  delete_status : Boolean,
  file_image : Array
  
});
mongoose.model('add_rope_maintenance', add_rope_maintenanceSchema);
add_rope_maintenanceSchema.plugin(timestamps);
module.exports = mongoose.model('add_rope_maintenance');
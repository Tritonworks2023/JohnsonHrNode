var mongoose = require('mongoose');
const Schema = mongoose.Schema; 
var timestamps = require('mongoose-timestamp');
var add_ervice_visibilitySchema = new mongoose.Schema({ 
  job_id : String,
  building_name : String,
  cat_type : String,
  images_ary : Array,
  cus_name : String,
  submitted_by_emp_code : String,
  submitted_by_num : String,
  submitted_by_name : String,
  submitted_by_on : String,
  program_date : String,
  delete_status : Boolean,
  nextDueDate: String,
});
mongoose.model('add_service_visibility', add_ervice_visibilitySchema);
add_ervice_visibilitySchema.plugin(timestamps);
module.exports = mongoose.model('add_service_visibility');
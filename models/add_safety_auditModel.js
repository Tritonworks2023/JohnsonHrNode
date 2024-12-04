var mongoose = require('mongoose');
const Schema = mongoose.Schema; 
var timestamps = require('mongoose-timestamp');

var dynamicFields = {
  job_id: String,
  remarks: String,
  Total_marks: String,
  submitted_by_num: String,
  submitted_by_name: String,
  submitted_by_emp_code: String,
  submitted_by_on: String,
  observation_a: String,
  observation_b: String,
  observation_c: String,
  observation_d: String,
  general_comment: String,
  engineer_name: String,
  conducted_on: String,
  engineer_signature: String,
  delete_status: Boolean,
  file_image: Array,
  deleteStatus: {
    type: Boolean,
    default: false
  },
  sa_fields: Object, // Store dynamic SA fields in an object
};

var add_safety_auditSchema = new mongoose.Schema(dynamicFields);

mongoose.model('add_safety_audit', add_safety_auditSchema);
add_safety_auditSchema.plugin(timestamps);
module.exports = mongoose.model('add_safety_audit');

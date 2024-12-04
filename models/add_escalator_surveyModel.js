var mongoose = require('mongoose');
const Schema = mongoose.Schema; 
var timestamps = require('mongoose-timestamp');
var add_escalator_surveySchema = new mongoose.Schema({  

  job_id : String,
  building_name : String,
  machine_type : String,
  cus_address : String,
  controller_type : String,
  installed_on : String,
  survey_no : String,
  date : String,
  machine : String,
  gear : String,
  motor : String,
  brake_motor : String,
  micro_process : String,
  relays : String,
  contractor : String,
  controller_inspec : String,
  controller_colling_fan : String,
  vvvf_conducation : String,
  
  all_pcbs : String,
  ss_balustrade : String,

  main_shaft : String,
  step_roller: String,
  step_chain_roller : String,
  handrail_con : String,
  handrail_tension : String,
  comb_teeth : String,
  steps_conducation : String,
  skirting_brush: String,
  glass : String,
  end_revesable_bear : String,
  sub_roller : String,
  handrail_ped : String,

  main_drive : String,
  pinion_wheel : String,
  drive_chain_slider : String,
  tangent_rail : String,


  all_safety_switchs : String,
  cable_conducation : String,
  smps_board : String,
  eme_stop_button : String,
  key_switch : String,
  
  sensors : String,
  inspec_plugs : String,

  step_gap_light : String,
  skirting_light : String,
  pit_light : String,
  comb_light : String,
  traffic_light : String,
  handrail_light : String,
  escaltor_safe_op : String,
  major_concern : String,
  recommendation: String,
  cus_name : String,
  cus_desg : String,
  cus_contract : String,
  cus_survey_conducted : String,
  cus_survey_by_signature : String,
  submitted_by_num : String,
  submitted_by_name : String,
  submitted_by_emp_code : String,
  submitted_by_on : String,
  delete_status : Boolean,
  file_image: Array,
  branch_code: String
});
mongoose.model('add_escalator_survey', add_escalator_surveySchema);
add_escalator_surveySchema.plugin(timestamps);
module.exports = mongoose.model('add_escalator_survey');
var mongoose = require('mongoose');
const Schema = mongoose.Schema; 
var timestamps = require('mongoose-timestamp');
var add_elevator_surveySchema = new mongoose.Schema({  

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
  sheave : String,
  ropes : String,
  motor : String,

  rope_hole_cutout : String,
  rescue_switch : String,



  controller_drive : String,
  relays : String,
  controller_inspec : String,
  governor_rope : String,

  osg_gaurd : String,
  ard : String,

  ard_battery_box : String,


  car_type : String,
  fan: String,
  eme_light : String,
  buttons : String,
  car_op_panel : String,
  car_top_sheave : String,

  car_top_barricade : String,


  car_inspec_box: String,
  retiring_cam : String,
  mechanical_safe : String,
  car_gate_switch : String,

  additional_car_stop_switch : String,

  sub_roller : String,

  pit_switch_positioning : String,
  pit_ladder : String,

  

  buffer : String,
  gov_tension_pulley : String,
  
  cwt_guard : String,

  pti_condition : String,
  travelling_cable : String,
  door_lock : String,
  limit_switch : String,
  magnet_vanes : String,
  counter_weight : String,
  eme_alarm : String,
  door_closer : String,
  hall_button : String,
  door_Vf : String,
  type_of_entrance : String,
  elevator_safe_op: String,
  major_concern: String,
  recommendation : String,
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





mongoose.model('add_elevator_survey', add_elevator_surveySchema);
add_elevator_surveySchema.plugin(timestamps);
module.exports = mongoose.model('add_elevator_survey');
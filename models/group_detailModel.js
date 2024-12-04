var mongoose = require('mongoose');
const Schema = mongoose.Schema; 
var timestamps = require('mongoose-timestamp');
var group_detail_managementSchema = new mongoose.Schema({  

  activity_id : String,
  job_detail_id : String,
  index : Number,
  sub_group_status : String,
  group_detail_name :  String,
  group_detail_created_at : String,
  group_detail_update_at : String,
  group_detail_created_by : String,
  group_detail_updated_by : String,
  form_type : String,
  delete_status : Boolean,


});
mongoose.model('group_detail_management', group_detail_managementSchema);
group_detail_managementSchema.plugin(timestamps);
module.exports = mongoose.model('group_detail_management');
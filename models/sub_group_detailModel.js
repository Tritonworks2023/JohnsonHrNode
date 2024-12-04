var mongoose = require('mongoose');
const Schema = mongoose.Schema; 
var timestamps = require('mongoose-timestamp');
var sub_group_detail_managementSchema = new mongoose.Schema({  

  group_id : String,
  sub_group_detail_name :  String,
  sub_group_detail_created_at : String,
  sub_group_detail_update_at : String,
  sub_group_detail_created_by : String,
  sub_group_detail_updated_by : String,
  form_type : String


});
mongoose.model('sub_group_detail_management', sub_group_detail_managementSchema);
sub_group_detail_managementSchema.plugin(timestamps);
module.exports = mongoose.model('sub_group_detail_management');
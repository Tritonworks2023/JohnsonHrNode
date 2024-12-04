var mongoose = require('mongoose');
var timestamps = require('mongoose-timestamp');
const Schema = mongoose.Schema; 

var field_managementSchema = new mongoose.Schema({  
  cat_id :  String,
  index : Number,
  field_name : String,
  field_type : String,
  field_length : String,
  field_comments : String,
  field_value : String,
  drop_down : Array,
  lift_list : Array,
  field_update_reason : String,
  date_of_create : String,
  date_of_update : String,
  created_by : String,
  updated_by : String,
  group_id : String,
  sub_group_id : String,
  delete_status : Boolean,
  field_required: Boolean
});
mongoose.model('field_management', field_managementSchema);
field_managementSchema.plugin(timestamps);
module.exports = mongoose.model('field_management');
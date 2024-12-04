var mongoose = require('mongoose');
const Schema = mongoose.Schema; 
var timestamps = require('mongoose-timestamp');
var joininspectionSchema = new mongoose.Schema({  
user_id :  {  
       type: Schema.Types.ObjectId,
       ref: 'user_management',
      },
activity_id : String,
job_id : String,
group_id : String,
sub_group_id : {  type: Schema.Types.ObjectId, ref: 'sub_group_detail_management' },
work_status : String,
data_store : Array,
  start_time : String,
  pause_time : String,
  stop_time : String,
  work_time : Array,
  total_work_time : Number,
  storage_status : String,
  date_of_create : String,
  date_of_update : String,
  created_by : String,
  updated_by : String,
  update_reason : String,
  remarks : String,

});
mongoose.model('joininspection', joininspectionSchema);
joininspectionSchema.plugin(timestamps);
module.exports = mongoose.model('joininspection');
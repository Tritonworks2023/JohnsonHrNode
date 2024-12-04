var mongoose = require('mongoose');
const Schema = mongoose.Schema; 
var data_store_managementSchema = new mongoose.Schema({  
  user_id :  String,
  activity_id : String,
  job_id : String,
  group_id : String,
  sub_group_id : String,
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
  job_lat : Number,
  job_long : Number,
  createdAt: { type: Date, default: Date.now }
});
mongoose.model('data_store_management', data_store_managementSchema);
module.exports = mongoose.model('data_store_management');
var mongoose = require('mongoose');
var timestamps = require('mongoose-timestamp');
const Schema = mongoose.Schema; 
const moment = require('moment');

var service_tab_submit_data_brSchema = new mongoose.Schema({     
  user_mobile_number : String,
  upload_status : String,
  submitted_date_sys : Date,
  serv_type : String,
  job_id : String,
  comp_id : String,
  data : Array,
  oracle_exists: { type: String, default: 'Y' },
  repush_check: { type: String, default: 'N' },
  current_date: { type: Date, default: moment().toDate() },
});
mongoose.model('service_tab_submit_data_br', service_tab_submit_data_brSchema);
service_tab_submit_data_brSchema.plugin(timestamps);
module.exports = mongoose.model('service_tab_submit_data_br');

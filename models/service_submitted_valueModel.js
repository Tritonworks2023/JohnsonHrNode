var mongoose = require('mongoose');

const Schema = mongoose.Schema; 
var timestamps = require('mongoose-timestamp');
var service_submitted_valueSchema = new mongoose.Schema({  
  user_id:  String,
  job_id  :  String,
  type : String,
  date : Date,
  datas : Array,
  oracle_exists: { type: String, default: 'Y' },
  repush_check: { type: String, default: 'N' },
});
mongoose.model('service_submitted_value', service_submitted_valueSchema);
service_submitted_valueSchema.plugin(timestamps);
module.exports = mongoose.model('service_submitted_value');

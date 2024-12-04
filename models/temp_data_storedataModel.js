var mongoose = require('mongoose');
var timestamps = require('mongoose-timestamp');
const Schema = mongoose.Schema; 

var temp_data_storeSchema = new mongoose.Schema({  
  job_id:  String,
  group_id : String,
  user_id : String,
  datas : Array,
});
mongoose.model('temp_data_store', temp_data_storeSchema);
temp_data_storeSchema.plugin(timestamps);
module.exports = mongoose.model('temp_data_store');

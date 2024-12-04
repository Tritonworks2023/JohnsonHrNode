var mongoose = require('mongoose');
const Schema = mongoose.Schema; 
var timestamps = require('mongoose-timestamp');
var bd_data_storesSchema = new mongoose.Schema({  


  Type:  String,
  Person_id : String,
  Email_id : String,
  Activity_title : String,
  Activity_description : String,
  Date_and_Time : String

  

});

mongoose.model('bd_data_stores', bd_data_storesSchema);
bd_data_storesSchema.plugin(timestamps);
module.exports = mongoose.model('bd_data_stores');

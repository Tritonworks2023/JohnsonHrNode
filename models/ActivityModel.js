var mongoose = require('mongoose');

const Schema = mongoose.Schema; 
var timestamps = require('mongoose-timestamp');
var ActivitySchema = new mongoose.Schema({  

  Type:  String,
  Person_id : String,
  Email_id : String,
  Activity_title : String,
  Activity_description : String,
  Date_and_Time : String

});
mongoose.model('Activity', ActivitySchema);
ActivitySchema.plugin(timestamps);
module.exports = mongoose.model('Activity');
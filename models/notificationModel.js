var mongoose = require('mongoose');
const Schema = mongoose.Schema; 
var timestamps = require('mongoose-timestamp');
var notificationSchema = new mongoose.Schema({  
  
  notification_title : String,
  notification_desc : String,
  user_mobile_no : String,
  date_and_time : String,
  read_status : String,
  date_value : String,

});


mongoose.model('notification', notificationSchema);
notificationSchema.plugin(timestamps);
module.exports = mongoose.model('notification');
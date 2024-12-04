var mongoose = require('mongoose');
const Schema = mongoose.Schema; 
var timestamps = require('mongoose-timestamp');
var pop_notificationSchema = new mongoose.Schema({  

  user_mobile_no:  String,
  code : String,
  status : String,
  image_path : String,
  date_of_create : String,


});
mongoose.model('pop_notification', pop_notificationSchema);
pop_notificationSchema.plugin(timestamps);
module.exports = mongoose.model('pop_notification');
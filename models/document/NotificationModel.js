var mongoose = require('mongoose');
const Schema = mongoose.Schema;

var NotificationSchema = new mongoose.Schema({  
  
  user_id: String,
  message: String,
  name : String,
  title : String,
  message_status: String,
  status : String,
  Date: String,

});
mongoose.model('Notification', NotificationSchema);

module.exports = mongoose.model('Notification');
var mongoose = require('mongoose');
const Schema = mongoose.Schema;

var EmailsSchema = new mongoose.Schema({  
  
  email_id : String,
  user_id: String,
  user_name : String,
  user_email : String,
  message: String,
  name : String,
  subject : String,
  message_status: String,
  status : String,
  send_by_id : String,
  send_by_name : String,
  send_by_email : String,
  created_by : String,
  attach : String,
  start_by : Number,
  Date: String,

});
mongoose.model('Emails', EmailsSchema);

module.exports = mongoose.model('Emails');
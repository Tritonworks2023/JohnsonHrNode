var mongoose = require('mongoose');
const Schema = mongoose.Schema;

var catagroiesemailSchema = new mongoose.Schema({  
  
  user_id : String,
  user_email : String,
  user_type : String,
  email_id : String,
  message: String,
  name : String,
  subject : String,
  message_status: String,
  Date: String,
  send_to : String,

});
mongoose.model('catagroiesemail', catagroiesemailSchema);

module.exports = mongoose.model('catagroiesemail');
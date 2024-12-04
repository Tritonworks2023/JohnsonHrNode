var mongoose = require('mongoose');

const Schema = mongoose.Schema; 

var subscribertypeSchema = new mongoose.Schema({  
  subscriber_type:  String,
  date_and_time : String
});
mongoose.model('subscribertype', subscribertypeSchema);

module.exports = mongoose.model('subscribertype');
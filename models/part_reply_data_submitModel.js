var mongoose = require('mongoose');
const Schema = mongoose.Schema; 
var timestamps = require('mongoose-timestamp');
var part_reply_data_submitSchema = new mongoose.Schema({  
  
    SMU_ACK_COMPNO:  String,
    customerAcknowledgement:  String,
    jobId:  String,
    serviceType:  String,
    techSignature:  String,
    userId:  String,
            
});
mongoose.model('part_reply_data_submit', part_reply_data_submitSchema);
part_reply_data_submitSchema.plugin(timestamps);
module.exports = mongoose.model('part_reply_data_submit');

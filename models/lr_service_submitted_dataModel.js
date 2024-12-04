var mongoose = require('mongoose');
const Schema = mongoose.Schema; 
var timestamps = require('mongoose-timestamp');
var lr_service_submitted_dataSchema = new mongoose.Schema({  

  SMU_SCQH_QUOTENO : String,
  customerAcknowledgement: String,
  customerName : String,
  customerNo : String,
  jobId :  String,
  remarks : String,
  serviceType : String,
  techSignature : String,
  userId : String,

});
mongoose.model('lr_service_submitted_data', lr_service_submitted_dataSchema);
lr_service_submitted_dataSchema.plugin(timestamps);
module.exports = mongoose.model('lr_service_submitted_data');
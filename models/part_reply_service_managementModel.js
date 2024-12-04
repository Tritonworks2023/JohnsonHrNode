var mongoose = require('mongoose');
const Schema = mongoose.Schema; 
var timestamps = require('mongoose-timestamp');
var part_reply_service_managementSchema = new mongoose.Schema({  
  
  SMU_ACK_BRID:  String,
  SMU_ACK_MRSEQNO:  String,
  SMU_ACK_ISSEQNO:  String,
  SMU_ACK_COMPNO:  String,
  SMU_ACK_JOBNO:  String,
  SMU_ACK_REQNO:  String,
  SMU_ACK_SERTYPE:  String,
  SMU_ACK_ECODE:  String,
  SMU_ACK_MRMATLID :  String,
  SMU_ACK_ISSMATLID :  String,
  SMU_ACK_PARTNAME :  String,
  SMU_ACK_DCNO :  String,
  SMU_ACK_DCDT :  String,
  SMU_ACK_ENGRNAME :  String,
  SMU_ACK_ADDRESS1 :  String,
  SMU_ACK_ADDRESS2 :  String,
  SMU_ACK_ADDRESS3 :  String,
  SMU_ACK_ADDRESS4 :  String,
  SMU_ACK_APINCODE :  String,
  SMU_ACK_MOBILENO :  String,
  SMU_ACK_STATUS :  String,
  SMU_ACK_VANID :  String,
  SMU_ACK_ISSQTY :  String,
  SMU_ACK_ERRDESC :  String,
  SMU_ACK_BRCODE :  String,

  JOB_STATUS : String,
  JOB_VIEW_STATUS : String,
  LAST_UPDATED_TIME : String,
  JOB_START_TIME :  String,
  JOB_END_TIME :  String,
  
JOB_LOCATION : String,
JOB_START_LAT : String,
JOB_START_LONG : String,
current_and_last_update_time : Date,
deleteStatus: {
  type: Boolean,
  default: false
}
});

mongoose.model('part_reply_service_management', part_reply_service_managementSchema);
part_reply_service_managementSchema.plugin(timestamps);
module.exports = mongoose.model('part_reply_service_management');

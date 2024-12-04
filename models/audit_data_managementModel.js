var mongoose = require('mongoose');
const Schema = mongoose.Schema; 
var timestamps = require('mongoose-timestamp');
var audit_service_managementSchema = new mongoose.Schema({  
  OM_OSA_SEQNO:  String,
  OM_OSA_AUDDATE:  String,
  OM_OSA_BRCODE:  String,
  OM_OSA_JOBNO:  String,
  OM_OSA_CUSNAME:  String,
  OM_OSA_COMPNO:  String,
  OM_OSA_MECHCODE:  String,
  OM_OSA_ENGRCODE:  String,
  OM_OSA_MOBILE:  String,
  OM_OSA_MATLREQD:  String,
  OM_OSA_MATLREMARK:  String,
  OM_OSA_STATUS:  String,
  OM_OSA_PREPBY:  String,
  OM_OSA_PREPDT:  String,
  OM_OSA_MODBY:  String,
  OM_OSA_MODDT:  String,
  OM_OSA_APPBY:  String,
  OM_OSA_APPDT:  String,
  OM_OSA_ERRDESC:  String,
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
  },
  file_image: Array,
  mrData: Array,
  fieldValueData: Array,
  mrExists: {
    type: Boolean,
    default: false
  },
  customerSignature: String
});
mongoose.model('audit_service_management', audit_service_managementSchema);
audit_service_managementSchema.plugin(timestamps);
module.exports = mongoose.model('audit_service_management');

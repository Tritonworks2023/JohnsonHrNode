var mongoose = require('mongoose');
const Schema = mongoose.Schema; 
var timestamps = require('mongoose-timestamp');
var lr_service_managementSchema = new mongoose.Schema({  
  

  SMU_SCQH_BRCODE:  String,
  SMU_SCQH_QUOTENO : String,
  SMU_SCQH_QUOTEDT : String,
  SMU_SCQH_CSCHPNO : String,
  SMU_SCQH_JOBNO : String,
  SMU_SCQH_LRNO : String,
  SMU_SCQH_LRDT : String,
  SMU_SCAH_SMNO :String,
  SMU_SCQH_STATUS : String,
  SMU_SCAH_ROUTECODE : String,
  SMU_SCAH_MECHANIC : String,
  SMU_SED_NAME : String,
  SMU_SED_ADDRESS1 : String,
  SMU_SED_ADDRESS2 : String,
  SMU_SED_ADDRESS3 : String,
  SMU_SED_ADDRESS4 : String,
  SMU_SED_PINCODE : String,
  SMU_SEN_MOBILENO :  String,

  SMU_SED_SERTYPE :  String,
  SMU_SCH_JOBSTARTTIME :  String,
  SMU_SCH_JOBENDIME :  String,
  SMU_VANID :  String,
  SMU_SCQH_ERRDESC :  String,

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
  oldJobStatus : String, 
  PDF_PATH: String,
  PDF_NAME: String,
  insentiveData: {}
});
mongoose.model('lr_service_management', lr_service_managementSchema);
lr_service_managementSchema.plugin(timestamps);
module.exports = mongoose.model('lr_service_management');

var mongoose = require('mongoose');
const Schema = mongoose.Schema; 
var timestamps = require('mongoose-timestamp');
var breakdown_managementSchema = new mongoose.Schema({  
SMU_SCH_COMPNO : String, 
SMU_SCH_COMPDT : String, 
SMU_SCH_JOBNO : String, 
SMU_SCH_BRCODE : String, 
SMU_SCH_REPORTBY : String, 
SMU_SCH_REPORTCELL : String, 
SMU_SCH_BRKDOWNTYPE : String, 
SMU_SCH_BRKDOWNDESC : String, 
SMU_SCH_ROUTECODE : String, 
SMU_SCH_MECHANIC : String, 
SMU_SCH_DEPUTEDDT : String, 
SMU_SCH_CRTDT  : String, 
SMU_SCH_STATUS : String, 
SMU_SCH_EMPCODE : String, 
SMU_SCH_SERTYPE : String, 
SMU_SCH_CONTNO : String, 
SMU_SCH_DWNFLAG : String, 
SMU_SCH_CANCFLAG : String, 
SMU_SCH_DWNFLAGDATE : String, 
SMU_SCH_CUSCODE : String, 
SMU_SCH_CUSNAME : String, 
SMU_SCH_CUSADD1  : String, 
SMU_SCH_CUSADD2  : String, 
SMU_SCH_CUSADD3 : String, 
SMU_SCH_CUSADD4  : String, 
SMU_SCH_CUSPIN : String, 
SMU_SCH_MECHCELL : String, 
SMU_SCH_AMCTYPE  : String, 
SMU_SCH_AMCTODT : String, 
SMU_SCH_VANID  : String, 
SSM_SCH_APPTO : String, 
SMU_SCH_SUPCELLNO : String, 
SMU_SCH_JOBCURSTATUS : String, 
SMU_SCH_MODDT : String, 
SMU_SCH_ERRDESC : String, 
SMU_SCH_DOORTYPE : String, 
SMU_SCH_CHKLIST : String, 
JOB_STATUS : String, 
JOB_VIEW_STATUS : String, 
LAST_UPDATED_TIME : String, 
JOB_START_TIME : String,
JOB_END_TIME : String, 
JOB_LOCATION : String,
JOB_START_LAT : String,
JOB_START_LONG : String,
current_and_last_update_time : Date,
file_image: Array,
deleteStatus: {
    type: Boolean,
    default: false
},
remarks : String,
oldJobStatus : String, 

});

mongoose.model('breakdown_management', breakdown_managementSchema);
breakdown_managementSchema.plugin(timestamps);

module.exports = mongoose.model('breakdown_management');
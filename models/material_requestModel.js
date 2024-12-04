var mongoose = require('mongoose');
const Schema = mongoose.Schema; 
var timestamps = require('mongoose-timestamp');
var material_requestSchema = new mongoose.Schema({  


"SMU_MRSEQNO": String,
"SMU_MRSLNO": String,
"SMU_VANID": String,
"SMU_JOBNO": String,
"SMU_CUSCODE": String,
"SMU_CUSTNAME": String,
"SMU_ADDRESS1": String,
"SMU_ADDRESS2": String,
"SMU_ADDRESS3": String,
"SMU_ADDRESS4": String,
"SMU_CUSTPIN": String,
"SMU_MATLID": String,
"SMU_MATLNAME": String,
"SMU_QTY":String,
"SMU_TECHNAME": String,
"SMU_TECHMOBNO": String,
"SMU_DWNFLAG": String,
"SMU_MATLDN_FLAG": String,
"SMU_CANCFLAG": String,
"SMU_ROUTE": String,
"SMU_MRDT": String,
"SMU_DWNFLAGDATE": String,
"SMU_ERRDESC": String,
"JOB_STATUS" : String,
"JOB_VIEW_STATUS" : String,
"LAST_UPDATED_TIME" : String,
"JOB_START_TIME" :  String,
"JOB_END_TIME" :  String,
"JOB_LOCATION" : String,
"JOB_START_LAT" : String,
"JOB_START_LONG" : String,
deleteStatus: {
    type: Boolean,
    default: false
}
});
mongoose.model('material_request', material_requestSchema);
material_requestSchema.plugin(timestamps);
module.exports = mongoose.model('material_request');

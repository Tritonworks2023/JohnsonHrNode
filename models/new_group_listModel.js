var mongoose = require('mongoose');
const Schema = mongoose.Schema; 
var timestamps = require('mongoose-timestamp');
var new_group_detail_managementSchema = new mongoose.Schema({  




// "SMU_SEQNO": 1,
//             "SMU_ACTIVITYNO": 1,
//             "SMU_UKEY": "ESPD-ACT1",
//             "SMU_UKEY_DESCRIPTION": " Lift Well Details Entry(Site details upload )\r\n",
//             "SMU_DEPT": "ESPD",
//             "SMU_FORMTYPE": 2,
//             "SMU_FORMTYPE_DESC": "TABLE",
//             "SMU_DWNFLAG": "N",
//             "SMU_CHILD": null,
//             "SMU_CANCFLAG": null,
//             "SMU_ROUTE": null,
//             "SMU_UPFLAGDATE": null,
//             "SMU_DWNFLAGDATE": null,
//             "SMU_ERRDESC": null



  SMU_SEQNO : Number,
  SMU_ACTIVITYNO : Number,
  SMU_UKEY : String,
  SMU_UKEY_DESCRIPTION : String,
  SMU_DEPT : String,
  SMU_FORMTYPE :  Number,
  SMU_FORMTYPE_DESC : String,
  SMU_DWNFLAG : String,
  SMU_CHILD : String,
  SMU_CANCFLAG : String,
  SMU_ROUTE : String,
  SMU_UPFLAGDATE : String,
  SMU_DWNFLAGDATE : String,
  SMU_ERRDESC : String,
  DATEOFFETCH : Date


});
mongoose.model('new_group_detail_management', new_group_detail_managementSchema);
new_group_detail_managementSchema.plugin(timestamps);
module.exports = mongoose.model('new_group_detail_management');

    const mongoose = require('mongoose');
    const { Schema } = mongoose;
    
    const sercallHdrMRSchema = new Schema({
      JLS_SCHM_COMPNO: String,
  JLS_SCHM_JOBNO: String,
  JLS_SCHM_SERTYPE: String,
  JLS_SCHM_PREP_DATE: Date,
  JLS_SCHM_VAN_ID: String,
  JLS_SCHM_STATUS: String,
  JLS_SCHM_ORCL_STATUS: String,
  JLS_SCHM_ENGR_PHONE: Number,
  JLS_SCHM_ENGR_FLAG: String,
  JLS_SCHM_ERRDESC: String,
  JLS_SCHM_AGENT_NAME: String,
  JLS_SCHM_CUSTOMER_NAME: String,
  JLS_SCHM_DWNFLAG: String,
  JLS_SCHM_BRCODE: String,
  JLS_SCHM_INSERTBY: String,
    });
    module.exports = mongoose.model('JLS_SERCALL_HDR_MR', sercallHdrMRSchema);
    
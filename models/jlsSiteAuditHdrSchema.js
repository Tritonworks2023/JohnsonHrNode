
    const mongoose = require('mongoose');
    const { Schema } = mongoose;
    
    const jlsSiteAuditHdrSchema = new Schema({
      OM_OSA_SEQNO: Number,
  OM_OSA_AUDDATE: Date,
  OM_OSA_BRCODE: String,
  OM_OSA_JOBNO: String,
  OM_OSA_CUSNAME: String,
  OM_OSA_COMPNO: String,
  OM_OSA_MECHCODE: String,
  OM_OSA_ENGRCODE: String,
  OM_OSA_MOBILE: Number,
  OM_OSA_MATLREQD: String,
  OM_OSA_MATLREMARK: String,
  OM_OSA_STATUS: String,
  OM_OSA_PREPBY: String,
  OM_OSA_PREPDT: Date,
  OM_OSA_MODBY: String,
  OM_OSA_MODDT: Date,
  OM_OSA_APPBY: String,
  OM_OSA_APPDT: Date,
  OM_OSA_ERRDESC: String,
    });
    module.exports = mongoose.model('JLS_SITEAUDIT_HDR', jlsSiteAuditHdrSchema);
    
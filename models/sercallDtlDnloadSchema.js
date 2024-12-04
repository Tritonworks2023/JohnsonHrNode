
    const mongoose = require('mongoose');
    const { Schema } = mongoose;
    
    const sercallDtlDnloadSchema = new Schema({
      JLS_SCH_COMPNO: String,
  JLS_SCH_JOBNO: String,
  JLS_SCH_SERTYPE: Mixed,
  JLS_SCH_JOBSTARTTIME: Date,
  JLS_SCH_JOBENDTIME: Date,
  JLS_SCH_COMPSTATUS: String,
  JLS_SCH_TYP_BRKDWN: String,
  JLS_SCH_FEEDBACK: String,
  JLS_SCH_REMARKS: String,
  JLS_SCH_MRTAG: String,
    });
    module.exports = mongoose.model('JLS_SERCALL_HDR_DNLOAD', sercallDtlDnloadSchema);
    
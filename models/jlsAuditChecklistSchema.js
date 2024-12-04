
    const mongoose = require('mongoose');
    const { Schema } = mongoose;
    
    const jlsAuditChecklistSchema = new Schema({
      PAR_CODE: String,
  GROUP_NAME: String,
  ACTIVITY_CODE: String,
  ACTIVITY_NAME: String,
  SLNO: Number,
  DOOR_TYPE: String,
  VAL_TYPE: String,
    });
    module.exports = mongoose.model('JLS_AUDIT_CHECKLIST', jlsAuditChecklistSchema);
    
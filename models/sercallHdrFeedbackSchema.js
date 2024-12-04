
    const mongoose = require('mongoose');
    const { Schema } = mongoose;
    
    const sercallHdrFeedbackSchema = new Schema({
      JLS_SCHF_RECTREMARKS: String,
  JLS_SCHF_COMPNO: String,
  JLS_SCHF_JOBNO: String,
  JLS_SCHF_SERTYPE: Mixed,
  JLS_SCHF_CHKLISTTYPE: String,
  JLS_SCHF_PARCODE: String,
  JLS_SCHF_ACTCODE: String,
  JLS_SCHF_FDBK_RMRKS: String,
  JLS_SCHF_PMRMRKS: String,
  JLS_SCHF_ORCL_STATUS: String,
    });
    module.exports = mongoose.model('JLS_SERCALLHDR_FEEDBK', sercallHdrFeedbackSchema);
    

    const mongoose = require('mongoose');
    const { Schema } = mongoose;
    
    const sercallDtlMRSchema = new Schema({
      JLS_SCDM_COMPNO: String,
  JLS_SCDM_JOBNO: String,
  JLS_SCDM_SERTYPE: Mixed,
  JLS_SCDM_SLNO: String,
  JLS_SCDM_DESC: String,
  JLS_SCDM_MR_QTY: Number,
    });
    module.exports = mongoose.model('JLS_SERCALL_DTL_MR', sercallDtlMRSchema);
    
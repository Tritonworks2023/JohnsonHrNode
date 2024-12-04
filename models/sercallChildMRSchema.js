
    const mongoose = require('mongoose');
    const { Schema } = mongoose;
    
    const sercallChildMRSchema = new Schema({
      JLS_SCCM_COMPNO: String,
  JLS_SCCM_JOBNO: String,
  JLS_SCCM_SERTYPE: String,
  JLS_SCCM_SEQNO: String,
  JLS_SCCM_MATLID: Number,
  JLS_SCCM_QTY: Number,
  JLS_SCCM_MRSEQNO: Number,
    });
    module.exports = mongoose.model('JLS_SERCALL_CHILD_MR', sercallChildMRSchema);
    
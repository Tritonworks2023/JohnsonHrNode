
    const mongoose = require('mongoose');
    const { Schema } = mongoose;
    
    const jlsMatreqDnloadSchema = new Schema({
      JLS_MRD_ISSUENO: String,
  JLS_MRD_MRSEQNO: Number,
  JLS_MRD_MRSLNO: Number,
  JLS_MRD_MATLID: Number,
  JLS_MRD_ISTAT: String,
  JLS_MRD_PREPDT: Date,
  JLS_MRD_QTY: Number,
    });
    module.exports = mongoose.model('JLS_MATREQ_DNLOAD', jlsMatreqDnloadSchema);
    
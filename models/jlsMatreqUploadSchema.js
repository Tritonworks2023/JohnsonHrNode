
    const mongoose = require('mongoose');
    const { Schema } = mongoose;
    
    const jlsMatreqUploadSchema = new Schema({
      SMU_MRSEQNO: Number,
  SMU_MRSLNO: Number,
  SMU_VANID: String,
  SMU_JOBNO: String,
  SMU_CUSCODE: String,
  SMU_CUSTNAME: String,
  SMU_ADDRESS1: String,
  SMU_ADDRESS2: String,
  SMU_ADDRESS3: String,
  SMU_ADDRESS4: String,
  SMU_CUSTPIN: Number,
  SMU_MATLID: Number,
  SMU_MATLNAME: String,
  SMU_QTY: Number,
  SMU_TECHNAME: String,
  SMU_TECHMOBNO: String,
  SMU_DWNFLAG: String,
  SMU_CANCFLAG: String,
  SMU_ROUTE: String,
  SMU_MRDT: Date,
  SMU_DWNFLAGDATE: Date,
  SMU_ERRDESC: String,
  SMU_MATLDN_FLAG: String,
    });
    module.exports = mongoose.model('JLS_MATREQ_UPLOAD', jlsMatreqUploadSchema);
    
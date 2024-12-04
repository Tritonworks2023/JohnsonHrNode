
    const mongoose = require('mongoose');
    const { Schema } = mongoose;
    
    const jlsAckUploadSchema = new Schema({
      SMU_ACK_BRID: Number,
  SMU_ACK_MRSEQNO: Number,
  SMU_ACK_ISSEQNO: Number,
  SMU_ACK_COMPNO: String,
  SMU_ACK_JOBNO: String,
  SMU_ACK_REQNO: String,
  SMU_ACK_SERTYPE: String,
  SMU_ACK_ECODE: String,
  SMU_ACK_MRMATLID: Number,
  SMU_ACK_ISSMATLID: Number,
  SMU_ACK_PARTNAME: String,
  SMU_ACK_DCNO: String,
  SMU_ACK_DCDT: Date,
  SMU_ACK_ENGRNAME: String,
  SMU_ACK_ADDRESS1: String,
  SMU_ACK_ADDRESS2: String,
  SMU_ACK_ADDRESS3: String,
  SMU_ACK_ADDRESS4: String,
  SMU_ACK_APINCODE: Number,
  SMU_ACK_MOBILENO: String,
  SMU_ACK_STATUS: String,
  SMU_ACK_VANID: String,
  SMU_ACK_ISSQTY: Number,
  SMU_ACK_ERRDESC: String,
  SMU_ACK_BRCODE: String,
    });
    module.exports = mongoose.model('JLS_ACK_UPLOAD', jlsAckUploadSchema);
    

    const mongoose = require('mongoose');
    const { Schema } = mongoose;
    
    const jlsQuotelrUploadSchema = new Schema({
      SMU_SCQH_BRCODE: String,
  SMU_SCQH_QUOTENO: String,
  SMU_SCQH_QUOTEDT: Date,
  SMU_SCQH_CSCHPNO: String,
  SMU_SCQH_JOBNO: String,
  SMU_SCQH_LRNO: String,
  SMU_SCQH_LRDT: Date,
  SMU_SCAH_SMNO: String,
  SMU_SCQH_STATUS: String,
  SMU_SCAH_ROUTECODE: String,
  SMU_SCAH_MECHANIC: String,
  SMU_SED_NAME: String,
  SMU_SED_ADDRESS1: String,
  SMU_SED_ADDRESS2: String,
  SMU_SED_ADDRESS3: String,
  SMU_SED_ADDRESS4: String,
  SMU_SED_PINCODE: String,
  SMU_SEN_MOBILENO: Number,
  SMU_SED_SERTYPE: String,
  SMU_SCH_JOBSTARTTIME: Date,
  SMU_SCH_JOBENDIME: Date,
  SMU_VANID: String,
  SMU_SCQH_ERRDESC: String,
    });
    module.exports = mongoose.model('JLS_QUOTELR_UPLOAD', jlsQuotelrUploadSchema);
    
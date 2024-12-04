
    const mongoose = require('mongoose');
    const { Schema } = mongoose;
    
    const smartAttnMstSchema = new Schema({
      OM_SM_BRCODE: String,
  OM_SM_LOC: String,
  OM_SM_EMPID: String,
  OM_SM_EMPNAME: String,
  OM_SM_MOBILE: String,
  OM_SM_AGENTID: Number,
  OM_SM_STATUS: String,
  OM_SM_STATUSASON: Date,
  OM_SM_IMEI: String,
  OM_SM_BRCODE: String,
  OM_SM_LOC: String,
  OM_SM_EMPID: String,
  OM_SM_EMPNAME: String,
  OM_SM_MOBILE: String,
  OM_SM_AGENTID: Number,
  OM_SM_STATUS: String,
  OM_SM_STATUSASON: Date,
  OM_SM_IMEI: String,
    });
    module.exports = mongoose.model('OM_SMARTATTN_MST', smartAttnMstSchema);
    
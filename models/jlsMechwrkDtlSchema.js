
    const mongoose = require('mongoose');
    const { Schema } = mongoose;
    
    const jlsMechwrkDtlSchema = new Schema({
      JLS_MWK_JOBNO: String,
  JLS_MWK_SITENAME: String,
  JLS_MWK_TYPMC: String,
  JLS_MWK_PREPBY: String,
  JLS_MWK_PREPDT: Date,
  JLS_MWK_MAINROPE: String,
  JLS_MWK_OSGROPE: String,
  JLS_MWK_ACTCODE1: String,
  JLS_MWK_ACTCODE2: String,
  JLS_MWK_ACTCODE3: String,
  JLS_MWK_TECHNAME: String,
  JLS_MWK_ACTDATE: Date,
  JLS_MWK_REMARK: String,
    });
    module.exports = mongoose.model('JLS_MECHWRK_DTL', jlsMechwrkDtlSchema);
    
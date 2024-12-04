
    const mongoose = require('mongoose');
    const { Schema } = mongoose;
    
    const jlsSercallIsoDocSchema = new Schema({
      ISO_DRH_MODULE: String,
  ISO_DRH_LETYPE: String,
  ISO_DRH_DOCNO: String,
  ISO_DRH_EFF_FROM: Date,
  ISO_DRH_PREPBY: String,
  ISO_DRH_PREPDATE: Date,
    });
    module.exports = mongoose.model('JLS_SERCALL_ISO_DOCREF', jlsSercallIsoDocSchema);
    
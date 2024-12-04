const mongoose = require('mongoose');

const escCadHDRSchema = new mongoose.Schema({
  OM_EGH_SEQNO: { type: Number, required: true },
  OM_EGH_FLRTYPE: { type: String, required: true, maxlength: 1 },
  OM_EGH_NOFLOORS: { type: Number, required: true },
  OM_EGH_ESCTYPE: { type: String, required: true, maxlength: 1 },
  OM_EGH_PREPBY: { type: String, maxlength: 15 },
  OM_EGH_PREPDT: { type: Date },
  OM_EGH_MODBY: { type: String, maxlength: 15 },
  OM_EGH_MODDT: { type: Date },
  OM_EGH_APPBY: { type: String, maxlength: 15 },
  OM_EGH_APPDT: { type: Date },
  OM_EGH_STATUS: { type: String, maxlength: 1 },
  OM_EGH_REVNO: { type: Number },
  OM_EGH_REVDT: { type: Date },
  OM_EGH_FACPREPBY: { type: String, maxlength: 15 },
  OM_EGH_FACPREPDT: { type: Date }
});

const EscCadHDR = mongoose.model('EscCadHDR', escCadHDRSchema);
module.exports = EscCadHDR;

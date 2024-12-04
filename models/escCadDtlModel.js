var mongoose = require('mongoose');

const escCadDtlSchema = new mongoose.Schema({
    OM_EGD_SEQNO: { type: Number, required: true },
    OM_EGD_SLNO: { type: Number, required: true },
    OM_EGD_JOBNO: { type: String, required: true, maxlength: 20 },
    OM_EGD_FLOORNO: { type: Number, required: true },
    OM_EGD_FLRHEIGHT: { type: Number, required: true },
    OM_EGD_INCLINATION: { type: Number, required: true },
    OM_EGD_HORIZONSTEPS: { type: Number, required: true },
    OM_EGD_STEPWIDTH: { type: Number, required: true },
    OM_EGD_HORIZONSTEPS1: { type: Number },
    OM_EGD_STEPWIDTH1: { type: Number },
    OM_EGD_EXTRED: { type: String },
    OM_EGD_EXTTOPFIX: { type: Number },
    OM_EGD_EXTBOTFIX: { type: Number },
    OM_EGD_REDBOTFIX: { type: Number },
    OM_EGD_CRISCROSDIREC: { type: String },
    OM_EGD_GAPBTESC: { type: Number },
    OM_EGD_REVNO: { type: Number},
    OM_EGD_REVDT: { type: Date },
    OM_EGD_FLRPLTTAG: { type: String  }
});

const escCadDtl = mongoose.model('escCadDtl', escCadDtlSchema);
module.exports = escCadDtl;
  

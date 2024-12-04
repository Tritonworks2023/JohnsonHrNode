const mongoose = require('mongoose');

const ssalesChecklistReqHdrSchema = new mongoose.Schema({
    JLS_COM_CDH_SEQNO: Number,
    JLS_COM_CDH_DEPT: String,
    JLS_COM_CDH_TYPE: String,
    JLS_COM_CDH_SUBTYPE: String,
    JLS_COM_CDH_DOCNO: String,
    JLS_COM_CDH_DOCDT: Date,
    JLS_COM_CDH_BRCODE: String,
    JLS_COM_CDH_BRID: String,
    JLS_COM_CDH_TITLE: String,
    JLS_COM_CDH_REMARKS: String,
    JLS_COM_CDH_STATUS: String,
    JLS_COM_CDH_PROCNAME: String,
    JLS_COM_CDH_PREPBY: String,
    JLS_COM_CDH_PREPDT: Date,
    JLS_COM_CDH_APPLEVEL: Number,
    JLS_COM_CDH_JOBNO: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const SsalesChecklistReqHdrModel = mongoose.model('ssalesChecklistReqHdr', ssalesChecklistReqHdrSchema);

module.exports = SsalesChecklistReqHdrModel;

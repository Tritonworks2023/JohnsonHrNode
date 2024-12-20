const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ssalesChecklistSchema = new Schema({
  JLS_SED_CONTRACTNO: String,
  JLS_SED_SEQNO: { type: Number, unique: true },
  JLS_SED_JOBNO: String,
  JLS_SED_SLNO: String,
  JLS_SED_PREV_SER: String,
  JLS_SED_REQ_SER: String,
  JLS_SED_CONT_TYPE: String,
  JLS_SED_BULDGNAME: String,
  JLS_SED_CUST_CTG: String,
  JLS_SED_LAST_AMCFRDT: Date,
  JLS_SED_LAST_AMCTODT: Date,
  JLS_SED_LAST_YRPRICE: Number,
  JLS_SED_STATUS: String,
  JLS_SED_HO_PROP_PRICE: Number,
  JLS_SED_HO_DEVIATION_RATE: Number,
  JLS_SED_HO_PA: Number,
  JLS_SED_DISCOUNT: Number,
  JLS_SED_MODEL: String,
  JLS_SED_NO_FLOORS: String,
  JLS_SED_LOAD: String,
  JLS_SED_VALUE: Number,
  JLS_SED_UNITS: Number,
  JLS_SED_NEW_CUST_CTG: String,
  JLS_SED_CURR_AMCFRDT: Date,
  JLS_SED_CURR_AMCTODT: Date,
  JLS_SED_ADD_INCLU: String,
  JLS_SED_REQ_PRICE: Number,
  JLS_SED_TERMS_PAY: String,
  JLS_SED_MODE_PAY: String,
  JLS_SED_PAY_CHQ_NO: String,
  JLS_SED_PAY_CHQ_DT: Date,
  JLS_SED_PAY_CHQ_AMT: Number,
  JLS_SED_PAY_TDS: Number,
  JLS_SED_PAY_BANK: String,
  JLS_SED_RTGS_DTL: String,
  JLS_SED_REMARK: String,
  JLS_SED_GRA_SER_DN: String,
  JLS_SED_GRA_SER_FLAG: String,
  JLS_SED_GRA_SER_AMT: Number,
  JLS_SED_OLD_OUTSTD_REMARK: String,
  JLS_SED_LR_FLAG: String,
  JLS_SED_LR_AMT: Number,
  JLS_SED_CANC_PERIOD: String,
  JLS_SED_OLD_OS_AMT: Number,
  JLS_SED_REQUEST_BY: String,
  JLS_SED_FSM_EXTN_GIVEN: String,
  JLS_SED_FSM_EXTN_PERIOD: String,
  JLS_SED_ACTIVITY_NAME: String,
  JLS_SED_ACTIVITY_KEY: String,
  JLS_SED_CANC_REMARK: String,
  COM_CDH_SUBTYPE: String,
  COM_CDH_TITLE: String,
  JLS_SED_IMAGE: Array,
  JLS_CHEQUE_LIST: Array,
  JLS_RTGS_LIST: Array,
  PDF_PATH: String,
  OUTPUT_PATH: String,
  PDF_NAME: String,
  JLS_SED_EXIXTS_CONT_TYPE: String,
  JLS_SED_GRP_JOB: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
const ssalesChecklist = mongoose.model('ssalesChecklist', ssalesChecklistSchema);
module.exports = ssalesChecklist;

var mongoose = require('mongoose');
const Schema = mongoose.Schema; 
var timestamps = require('mongoose-timestamp');
var scanned_qr_detailSchema = new mongoose.Schema({  

  JOBNO : String,
  MATL_ID : String,
  QRCODE : String,
  SCANNEDBY : String,
  SCANNED_ON :  String,
  SUBMITTTED_STATUS : String,
  REMARKSTATUS : String,
  delete_status : Boolean,

});
mongoose.model('scanned_qr_detail', scanned_qr_detailSchema);
scanned_qr_detailSchema.plugin(timestamps);
module.exports = mongoose.model('scanned_qr_detail');
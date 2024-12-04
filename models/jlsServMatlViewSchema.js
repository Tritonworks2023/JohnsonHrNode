
    const mongoose = require('mongoose');
    const { Schema } = mongoose;
    
    const jlsServMatlViewSchema = new Schema({
      SERTYPE: String,
  PARTNAME: String,
  COMPART: String,
  PARTNO: Number,
  UOM: String,
    });
    module.exports = mongoose.model('JLS_SERVMATL_VIEW', jlsServMatlViewSchema);
    
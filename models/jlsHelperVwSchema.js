
    const mongoose = require('mongoose');
    const { Schema } = mongoose;
    
    const jlsHelperVwSchema = new Schema({
      PGRCODE: String,
  ENGCODE: String,
  ENGNAME: String,
  FRDT: Date,
  TODT: Date,
  TEAMCD: String,
  AEMPCODE: String,
  AEMPNAME: String,
  HTYP: String,
    });
    module.exports = mongoose.model('JLS_HELPER_VW', jlsHelperVwSchema);
    
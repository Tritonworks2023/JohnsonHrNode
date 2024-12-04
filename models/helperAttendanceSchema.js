
    const mongoose = require('mongoose');
    const { Schema } = mongoose;
    
    const helperAttendanceSchema = new Schema({
      JLS_HA_REMARKS: String,
  JLS_HA_ENGGCODE: String,
  JLS_HA_ENGGNAME: String,
  JLS_HA_HELPERCODE: String,
  JLS_HA_HELPERNAME: String,
  JLS_HA_ROUTECD: String,
  JLS_HA_ATTDATE: Date,
  JLS_HA_STATUS: String,
  JLS_HA_FROMTIME: Date,
  JLS_HA_TOTIME: Date,
  JLS_HA_SUBMITDATE: Date,
    });
    module.exports = mongoose.model('JLS_HELPER_ATTENDANCE', helperAttendanceSchema);
    
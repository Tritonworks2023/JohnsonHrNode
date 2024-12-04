
    const mongoose = require('mongoose');
    const { Schema } = mongoose;
    
    const agentAttendanceSchema = new Schema({
      AGENTID: String,
      AGENTNAME: String,
      INTIME: Date,
      OUTTIME: Date,
      LOGOUTREASON: String,
      TIME_DIFFERENCE: String,
      LOCATION: String,
      EMPLOYEE_ID: String,
      LOGIN_LOCATION: String,
      AGENT_START_JOB_LOCATION: String,
      CORRECT_START_JOB_LOCATION: String,
      START_JOBID: String,
      LOGOUT_LOCATION: String,
      AGENT_STOP_JOB_LOCATION: String,
      CORRECT_STOP_JOB_LOCATION: String,
      STOP_JOBID: String,
    });
    module.exports = mongoose.model('AGENTATTENDANCE', agentAttendanceSchema);
    
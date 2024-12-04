
    const mongoose = require('mongoose');
    const { Schema } = mongoose;
    
    const pauseResumetTimeSchema = new Schema({
      SERVICE_NAME: String,
  JOB_NO: String,
  COMPLAINT_NO: String,
  AGENT_NAME: String,
  EMP_ID: String,
  ACTIVITY_TIME: Date,
  ACTION: Number,
  AGENT_ID: String,
  ACTION_LOCATION: String,
  JOB_LOCATION: String,
    });
    module.exports = mongoose.model('PAUSE_RESUME_TIME', pauseResumetTimeSchema);
    
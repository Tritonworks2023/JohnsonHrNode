var mongoose = require('mongoose');
const Schema = mongoose.Schema; 
var timestamps = require('mongoose-timestamp');
var failed_jobs_repush_dataSchema = new mongoose.Schema({  
    job_no : String,
    compno : String,
    user_no : String,
    service_type : String, // operation or service
    activity : String, //ESPD ACT
    follow_detail : String, //ESPD ACT
    url : String, //ESPD ACT
    date_time : Date, 
    reqbody : Schema.Types.Mixed,
    tableName: String,
    bindParams: Schema.Types.Mixed,
    query: String,
    error_detail : Schema.Types.Mixed,
    result: Schema.Types.Mixed,
    repush_status: { type: String, default: 'N' }
});
mongoose.model('failed_jobs_repush_data', failed_jobs_repush_dataSchema);
failed_jobs_repush_dataSchema.plugin(timestamps);
module.exports = mongoose.model('failed_jobs_repush_data');
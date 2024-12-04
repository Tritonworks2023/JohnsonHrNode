var mongoose = require('mongoose');
var timestamps = require('mongoose-timestamp');
const Schema = mongoose.Schema; 

const errorLogSchema = new Schema({
    timestamp: { type: Date, default: Date.now },
    error: String,
    query: String,
    tableName: String,
    jobNo: String,
    bindParams: Schema.Types.Mixed,
    result: Array,
    errorType: String
});

mongoose.model('ErrorLog', errorLogSchema);
errorLogSchema.plugin(timestamps);
module.exports = mongoose.model('ErrorLog');
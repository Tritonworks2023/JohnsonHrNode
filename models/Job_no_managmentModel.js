var mongoose = require('mongoose');

const Schema = mongoose.Schema; 
var timestamps = require('mongoose-timestamp');
var job_no_managmentSchema = new mongoose.Schema({  

  activedetail_id:  {  
       type: Schema.Types.ObjectId,
       ref: 'activedetail_management',
  },
  activedetail__id  : String,
  job_detail_no : String,
  job_detail_created_at : String,
  job_detail_update_at : String,
  job_detail_created_by : String,
  job_detail_updated_by : String,
  update_reason : String,


  
});
mongoose.model('job_no_managment', job_no_managmentSchema);
job_no_managmentSchema.plugin(timestamps);
module.exports = mongoose.model('job_no_managment');

var mongoose = require('mongoose');
const Schema = mongoose.Schema; 
var timestamps = require('mongoose-timestamp');
var diagram_dataSchema = new mongoose.Schema({  
  activedetail_id : String,
  job_no_id : String,
  user_id : String,
  group_id : String,
  sub_group_id : String,
  submitted_date : String,
  diagram_id : String,
  dimx_one: String,
  dimx_two: String,
  dimx_three: String,
  dimy_one: String,
  dimy_two: String,
  dimy_three: String,
  remarks : String,
  update_id : String,
  update_date: String,
  update_reason : String,
});
mongoose.model('diagram_data', diagram_dataSchema);
diagram_dataSchema.plugin(timestamps);
module.exports = mongoose.model('diagram_data');
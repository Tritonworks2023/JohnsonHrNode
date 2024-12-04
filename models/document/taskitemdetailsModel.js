var mongoose = require('mongoose');

const Schema = mongoose.Schema; 

var taskitemdetailSchema = new mongoose.Schema({  
  
  company_id : String,
  project_id : String,
  taskcat_id : String,
  task_type : String,
  task_title : String,
  group_by:  String,
  task_descri : String,
  task_assignee : {  
       type: Schema.Types.ObjectId,
       ref: 'employeedetail',
      },
  task_status : String,
  task_est : String,
  task_val : String,
  due_date : String,
  attach_file : String,
  attach_link : String,
  check_list : Array,
  assignee_update_date : String,
  assignee_comments : String,
  follower_id : {  
       type: Schema.Types.ObjectId,
       ref: 'employeedetail',
      },
  follower_update_date : String,
  follower_comments : String,
  follower_status : String,
  date_and_time : String
  
});
mongoose.model('taskitemdetail', taskitemdetailSchema);

module.exports = mongoose.model('taskitemdetail');
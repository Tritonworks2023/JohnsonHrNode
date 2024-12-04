
    const mongoose = require('mongoose');
    const { Schema } = mongoose;
    
    const jlsEmployeeDtlSchema = new Schema({
      TELENO: Number,
  EMPID: String,
  EMPNAME: String,
  BRANCH: String,
  DEPT: String,
  INSTNO: String,
  FROMDATE: Date,
    });
    module.exports = mongoose.model('JLS_EMPLOYEESIM_DTL', jlsEmployeeDtlSchema);
    
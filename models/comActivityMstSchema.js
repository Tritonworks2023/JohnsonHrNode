
    const mongoose = require('mongoose');
    const { Schema } = mongoose;
    
    const comActivityMstSchema = new Schema({
      CAM_ATY_PTAG: String,
      CAM_ATY_PTYPE: String,
      CAM_ATY_PCODE: String,
      CAM_ATY_STATUS: String,
      CAM_ATY_SEQNO: Number,
      CAM_ATY_ATTRIBUTE: String,
      CAM_ATY_ATTRIBUTE_0: String,
      CAM_ATY_ATTRIBUTE_1: String,
      CAM_ATY_ATTRIBUTE_2: String,
      CAM_ATY_ATTRIBUTE_3: String,
      CAM_ATY_ATTRIBUTE_4: String,
      CAM_ATY_EFFRDT: Date,
      CAM_ATY_EFTODT: Date,
      CAM_ATY_PREPBY: String,
      CAM_ATY_PREPDT: Date,
      CAM_ATY_MODBY: String,
      CAM_ATY_MODDT: Date,
      CAM_ATY_TYPE: String,
      CAM_ATY_CODE: String,
      CAM_ATY_DESC: String,
    });
    
    module.exports = mongoose.model('COM_ACTIVITY_MST', comActivityMstSchema);
    
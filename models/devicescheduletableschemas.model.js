const mongoose = require('mongoose');


var conn = mongoose.createConnection('mongodb://192.168.1.107:27017/siragoEtuDb');
const Schema = mongoose.Schema;


const schema = new Schema({
    deviceId: { type: String, trim: true, },
    liftId: { type: String, trim: true, },
    scheduleServerTimestamp: { type: Number },
    schedulePacketTimestamp: { type: Number },
    scheduleDeviceTimestamp: { type: Number },
    //Dynamic Key
    processorOutputStatusValue: { type: String },
    processorInputStatusValue: { type: String },
    floorAndDoorStatusValue: { type: String },
    // floorAndDoorStatusValue: { type: String },
    floorDesignationStatusValue: { type: String },
    modesAndEventsValue: { type: String },
    

}, {
    collection: 'devicescheduletableschemas'
});

schema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function (doc, ret) {

    }
});


const UserInfo = conn.model('devicescheduletableschemas', schema);

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', function callback() {
  console.log("MongoDb connected", db.db.databaseName);
});

module.exports = UserInfo;
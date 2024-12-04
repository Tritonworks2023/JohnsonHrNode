const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const jicSpecificationSchema = new Schema({
    // user_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    // activity_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    // job_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    // group_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    // sub_group_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    // jic_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    activityId: String,
    jobId: String,
    groupId: { type: mongoose.Schema.Types.ObjectId, required: true },
    subGroupId: String,
    jicId: String,
    customerName: String,
    verticalRise: String,
    capacity: String,
    angleOfInclination: String,
    ratedSpeed: String,
    stepWidth: String,
    flatSteps: String,
    installedBy: String,
    testedBy: String,
    routeEngineer: String,
    zonalEngineer: String,
    operationHead: String,
    serviceHead: String,
    serviceRecordDate: String,
    motorMakeType: String,
    motorSlNo: String,
    motorKW: String,
    motorVoltage: String,
    motorCurrent: String,
    motorRPM: String,
    gearBoxMakeType: String,
    gearBoxSlNo: String,
    gearBoxOilGrade: String,
    gearBoxOilCapacity: String,
    brakeMakeType: String,
    brakeSlNo: String,
    brakeTravel: String,
    brakeVoltage: String,
    brakeCurrent: String,
    controllerType: String,
    controllerSlNo: String,
    starDelta: String,
    makeSlNo: String,
    v3fCapacity: String,
    contactorsMake: String,
    contactorsRating: String,
    amps: String,
    wiringDiagramNo: String,
    plcMicroProcesser: String,
    plcMakeType: String,
    transformerMakeType: String,
    trfVACapacity: String,
    voltageIP: String,
    voltageOP: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const Jicspecification = mongoose.model('Jicspecification', jicSpecificationSchema);
module.exports = Jicspecification;

const mongoose = require("mongoose");
const Schema = mongoose.Schema;
var timestamps = require("mongoose-timestamp");

const schema = new Schema(
  {
    customername: { type: String, trim: true, uppercase: true },
    location: { type: String },
    building_block_name: { type: String, trim: true },
    lift_num_sec: { type: String, uppercase: true },
    total_num_of_lifts: { type: String, required: false },
    number_of_lifts_perdisplay: { type: String, uppercase: true },
    liftArray: { type: [], trim: true, uppercase: true },
    createdDate: { type: Date, trim: true },
    updatedDate: { type: Date, trim: true },
    isActive: { type: String, trim: true, uppercase: true },
    remark: { type: String, trim: true, uppercase: true },
    email: { type: String, trim: true },
    password: { type: String, trim: true },
    userType: { type: String, default: "User" },
    lift_door_open: { type: Boolean, default: false },
    door_close: { type: Boolean, default: false },
    emergency: { type: Boolean, default: false },
    breakdown: { type: Boolean, default: false },
    entrapment: { type: Boolean, default: false },
  },
  {
    collection: "user_Deatils",
  }
);

schema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    // remove these props when object is serialized
    // delete ret.password;
  },
});

module.exports = mongoose.model("user_Deatils", schema);

// db.user_Deatils.insert({
//     "firstName" : "ADMIN",
//     "email" : "admin@gmail.com",
//     "password" : "admin",
//     "userType" : "ADMIN",
//     "userId" : "USER-001"
// })

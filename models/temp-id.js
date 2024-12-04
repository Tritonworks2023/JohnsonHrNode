const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
    temp_id: { type: String, trim: true, },
}, {
    collection: 'tempID'
});

schema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function (doc, ret) {

    }
});

module.exports = mongoose.model('tempID', schema);
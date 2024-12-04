var mongoose = require('mongoose');

const errorQuerySchema = new mongoose.Schema({
    query: {
      type: String,
      required: true
    },
    bindParams: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  });

const ErrorQueryModel = mongoose.model('ErrorQuery', errorQuerySchema);
module.exports = ErrorQueryModel;

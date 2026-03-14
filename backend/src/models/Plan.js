const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  currency: {
    type: String,
    required: true,
    default: 'usd',
    uppercase: true,
  },
  interval: {
    type: String,
    enum: ['day', 'week', 'month', 'year'],
    required: true,
  },
  intervalCount: {
    type: Number,
    required: true,
    default: 1,
    min: 1,
  },
  stripePriceId: {
    type: String,
    required: true,
    unique: true,
  },
  stripeProductId: {
    type: String,
    required: true,
    unique: true,
  },
  features: [{
    type: String,
    required: true,
  }],
  isActive: {
    type: Boolean,
    default: true,
  },
  trialPeriodDays: {
    type: Number,
    default: 0,
    min: 0,
  },
  metadata: {
    type: Map,
    of: String,
    default: {},
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

planSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Plan', planSchema);

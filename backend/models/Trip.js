const mongoose = require('mongoose');

const latLngSchema = new mongoose.Schema({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true }
}, { _id: false });

const tripSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  origin: { type: String, required: true, trim: true },
  destination: { type: String, required: true, trim: true },
  originCoords: latLngSchema,
  destinationCoords: latLngSchema,
  routeCoordinates: { type: [latLngSchema], default: [] },
  routeDistanceMeters: { type: Number, default: 0 },
  routeDurationSeconds: { type: Number, default: 0 },
  destinationAlertRadiusMeters: { type: Number, min: 100, max: 50000, default: 1000 },
  startTime: { type: Date, required: true },
  status: { type: String, enum: ['planned', 'active', 'completed', 'canceled'], default: 'planned' },
  monitoringStartedAt: Date,
  completedAt: Date,
  lastLocation: latLngSchema,
  lastLocationAt: Date,
  lastLocationAccuracy: Number,
  deviationDistanceMeters: { type: Number, default: 0 },
  deviationStreak: { type: Number, default: 0 },
  arrivalAlertedAt: Date,
  safety: {
    state: { type: String, enum: ['normal', 'checking', 'escalated'], default: 'normal' },
    incidentStartedAt: Date,
    reminderCount: { type: Number, default: 0 },
    lastReminderAt: Date,
    nextReminderAt: Date,
    acknowledgedAt: Date,
    escalatedAt: Date,
    escalationNotifiedAt: Date
  }
}, { timestamps: true });

module.exports = mongoose.model('Trip', tripSchema);

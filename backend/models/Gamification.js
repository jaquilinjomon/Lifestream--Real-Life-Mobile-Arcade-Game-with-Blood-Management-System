const mongoose = require('mongoose');

const gamificationSchema = new mongoose.Schema({
  donorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Donor', required: true },
  points: { type: Number, default: 0 },
  badges: { type: [String], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('Gamification', gamificationSchema);

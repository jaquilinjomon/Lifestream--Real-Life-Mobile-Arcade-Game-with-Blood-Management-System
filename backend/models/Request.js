const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
  hospitalName: String,
  bloodGroup: String,
  units: Number,
  status: { type: String, default: "Pending" }
}, { timestamps: true });

module.exports = mongoose.model('Request', requestSchema);

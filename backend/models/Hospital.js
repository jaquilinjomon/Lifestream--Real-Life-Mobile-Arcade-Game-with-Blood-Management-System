const mongoose = require('mongoose');

const hospitalSchema = new mongoose.Schema({
  name: { type: String, required: true },
  contactPerson: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  location: { type: String, required: true },
  password: { type: String, required: true }   // ✅ new field
}, { timestamps: true });

module.exports = mongoose.model('Hospital', hospitalSchema);

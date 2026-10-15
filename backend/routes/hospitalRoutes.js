const express = require('express');
const router = express.Router();
const Hospital = require('../models/Hospital');
const bcrypt = require('bcrypt');

// ➤ Register hospital
router.post('/register', async (req, res) => {
  try {
    const { name, contactPerson, phone, email, password } = req.body;

    // Basic validation
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required" });
    }

    // Check duplicate email
    const existing = await Hospital.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: "Hospital already registered with this email" });
    }

    // Hash password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    const hospital = new Hospital({
      name,
      contactPerson,
      phone,
      email,
      location: 'Ernakulam',
      password: hashedPassword
    });

    const savedHospital = await hospital.save();

    res.json({
      message: "✅ Hospital registered successfully",
      hospital: savedHospital
    });
  } catch (err) {
    console.error("Registration error:", err.message);
    res.status(500).json({ error: "Server error: " + err.message });
  }
});

// ➤ Hospital login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const hospital = await Hospital.findOne({ email });
    if (!hospital) {
      return res.status(400).json({ error: "Hospital not found" });
    }

    const valid = await bcrypt.compare(password, hospital.password);
    if (!valid) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    res.json({
      message: "✅ Login successful",
      hospitalId: hospital._id,
      hospitalName: hospital.name
    });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ error: "Server error: " + err.message });
  }
});

// ➤ Get hospital by ID
router.get('/:id', async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id);
    if (!hospital) {
      return res.status(404).json({ error: "Hospital not found" });
    }
    res.json(hospital);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

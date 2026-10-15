const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const Donor = require('../models/Donor');

// Register donor
router.post('/register', async (req, res) => {
  try {
    const { name, bloodGroup, location, password } = req.body;

    if (!name || !bloodGroup || !location || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const donor = new Donor({ name, bloodGroup, location, password: hashedPassword });
    await donor.save();

    res.status(201).json({ message: 'Registration successful', donor });
  } catch (error) {
  console.error("Error registering donor:", error);
  res.status(500).json({ message: 'Error registering donor', error: error.message });
}

});

// Login donor
router.post('/login', async (req, res) => {
  try {
    const { name, password } = req.body;

    const donor = await Donor.findOne({ name });
    if (!donor) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, donor.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    res.status(200).json({ message: 'Login successful', donor });
  } catch (error) {
    res.status(500).json({ message: 'Error logging in', error });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Request = require('../models/Request');

// Create a new blood request
router.post('/register', async (req, res) => {
  try {
    const request = new Request(req.body);
    const savedRequest = await request.save();
    res.json({
      message: "Blood request submitted successfully",
      request: savedRequest
    });
  } catch (err) {
    console.error("Request error:", err.message);
    res.status(500).json({ error: "Server error: " + err.message });
  }
});

// Get all blood requests with hospital details
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.hospitalId) {
      if (!mongoose.Types.ObjectId.isValid(req.query.hospitalId)) {
        return res.status(400).json({ error: "Invalid hospital ID" });
      }
      filter.hospitalId = req.query.hospitalId;
    }

    const requests = await Request.find(filter).populate('hospitalId', 'name email');
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const hospitalId = req.query.hospitalId || req.body?.hospitalId;
    if (!mongoose.Types.ObjectId.isValid(req.params.id) || !mongoose.Types.ObjectId.isValid(hospitalId)) {
      return res.status(400).json({ error: "Valid request and hospital IDs are required" });
    }

    const deletedRequest = await Request.findOneAndDelete({
      _id: req.params.id,
      hospitalId
    });

    if (!deletedRequest) {
      return res.status(404).json({ error: "Request not found for this hospital" });
    }

    res.json({ message: "Request deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Server error: " + err.message });
  }
});

router.put('/:id/units', async (req, res) => {
  try {
    const { hospitalId, units } = req.body;
    const updatedUnits = Number(units);

    if (
      !mongoose.Types.ObjectId.isValid(req.params.id) ||
      !mongoose.Types.ObjectId.isValid(hospitalId) ||
      !Number.isInteger(updatedUnits) ||
      updatedUnits < 1
    ) {
      return res.status(400).json({ error: "Valid request, hospital, and positive whole-number units are required" });
    }

    const request = await Request.findOneAndUpdate(
      { _id: req.params.id, hospitalId },
      { units: updatedUnits },
      { new: true, runValidators: true }
    ).populate('hospitalId', 'name email');

    if (!request) {
      return res.status(404).json({ error: "Request not found for this hospital" });
    }

    res.json({ message: "Request units updated successfully", request });
  } catch (err) {
    res.status(500).json({ error: "Server error: " + err.message });
  }
});

// Update request status (Approve/Reject)
router.put('/:id', async (req, res) => {
  try {
    const { status } = req.body;
    const request = await Request.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    res.json({
      message: `Request ${status} successfully`,
      request
    });
  } catch (err) {
    res.status(500).json({ error: "Server error: " + err.message });
  }
});


module.exports = router;

const express = require('express');
const Trip = require('../models/Trip');
const auth = require('../middleware/auth');
const router = express.Router();

// Create a new trip
router.post('/', auth, async (req, res) => {
  try {
    const { origin, destination, startTime, originLat, originLng, destinationLat, destinationLng } = req.body;

    if (!origin || !destination || !startTime) {
      return res.status(400).json({ msg: 'origin, destination, startTime required' });
    }

    const tripData = {
      userId: req.userId,
      origin,
      destination,
      startTime
    };

    // include coords if provided (strings -> numbers)
    if (originLat && originLng) {
      tripData.originCoords = { lat: Number(originLat), lng: Number(originLng) };
    }
    if (destinationLat && destinationLng) {
      tripData.destinationCoords = { lat: Number(destinationLat), lng: Number(destinationLng) };
    }

    const trip = new Trip(tripData);
    await trip.save();
    res.status(201).json({ msg: 'Trip created successfully', trip });
  } catch (err) {
    console.error('Trip create error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get all trips of logged-in user
router.get('/', auth, async (req, res) => {
  try {
    const trips = await Trip.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json(trips);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single trip by ID (must own it)
router.get('/:id', auth, async (req, res) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.id, userId: req.userId });
    if (!trip) return res.status(404).json({ msg: 'Trip not found' });
    res.json(trip);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Update a trip (only fields provided will be updated)
router.put('/:id', auth, async (req, res) => {
  try {
    // Ensure the trip belongs to the logged-in user
    const trip = await Trip.findOne({ _id: req.params.id, userId: req.userId });
    if (!trip) return res.status(404).json({ msg: 'Trip not found' });

    const {
      origin,
      destination,
      startTime,
      status,
      originLat,
      originLng,
      destinationLat,
      destinationLng
    } = req.body;

    // Build updates object only from provided fields
    const updates = {};

    if (origin) updates.origin = origin;
    if (destination) updates.destination = destination;
    if (startTime) updates.startTime = new Date(startTime);
    if (status) updates.status = status;

    // Coordinates (if provided as plain numbers/strings)
    if (originLat !== undefined && originLng !== undefined) {
      updates.originCoords = { lat: Number(originLat), lng: Number(originLng) };
    }
    if (destinationLat !== undefined && destinationLng !== undefined) {
      updates.destinationCoords = { lat: Number(destinationLat), lng: Number(destinationLng) };
    }

    const updated = await Trip.findByIdAndUpdate(trip._id, updates, { new: true });
    return res.json(updated);
  } catch (err) {
    console.error('Trip update error:', err);
    return res.status(500).json({ error: err.message });
  }
});
// Delete a trip
router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await Trip.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!deleted) return res.status(404).json({ msg: 'Trip not found' });
    return res.json({ msg: 'Trip deleted successfully' });
  } catch (err) {
    console.error('Trip delete error:', err);
    return res.status(500).json({ error: err.message });
  }
});


module.exports = router;
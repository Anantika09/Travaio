const express = require('express');
const bcrypt = require('bcryptjs'); // using bcryptjs
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();



// Signup route
router.post('/signup', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ msg: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, phone, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ msg: 'User registered successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Login route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, user: { name: user.name, email: user.email, phone: user.phone } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Get current user (requires valid token)
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) return res.status(404).json({ msg: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.get('/health', (req, res) => {
  res.json({ msg: 'Auth service running' });
});

module.exports = router;

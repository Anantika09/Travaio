const express = require('express');
const router = express.Router();
const ContactMessage = require('../models/ContactMessage');

router.post('/', async (req, res) => {
  try {
    const { name, email, phone, concern } = req.body;

    if (!name || !email || !concern) {
      return res.status(400).json({ success: false, message: 'Name, email, and concern are required.' });
    }

    const newMessage = await ContactMessage.create({
      name,
      email,
      phone,
      concern
    });

    res.status(201).json({ success: true, message: 'Message saved', id: newMessage._id });
  } catch (error) {
    console.error('Error saving contact message:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;

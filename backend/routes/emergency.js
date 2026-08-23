const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();

// Get all emergency contacts
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('emergencyContacts');
    if (!user) return res.status(404).json({ msg: 'User not found' });
    res.json(user.emergencyContacts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add new contact
router.post('/', auth, async (req, res) => {
  try {
    const { name, phone, email } = req.body;
    if (!name) return res.status(400).json({ msg: 'Name required' });

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    user.emergencyContacts.push({ name, phone, email });
    await user.save();

    res.status(201).json({ msg: 'Contact added', emergencyContacts: user.emergencyContacts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Update an existing contact by index
router.put('/:index', auth, async (req, res) => {
  try {
    const index = parseInt(req.params.index);
    const { name, phone, email } = req.body;

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ msg: 'User not found' });
    if (index < 0 || index >= user.emergencyContacts.length)
      return res.status(400).json({ msg: 'Invalid contact index' });

    const contact = user.emergencyContacts[index];
    if (name) contact.name = name;
    if (phone) contact.phone = phone;
    if (email) contact.email = email;

    await user.save();
    res.json({ msg: 'Contact updated', emergencyContacts: user.emergencyContacts });
  } catch (err) {
    console.error('Emergency contact update error:', err);
    res.status(500).json({ error: err.message });
  }
});


// Delete a contact by index
// Delete a contact by index
router.delete('/:index', auth, async (req, res) => {
  try {
    const index = parseInt(req.params.index);
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    if (index < 0 || index >= user.emergencyContacts.length)
      return res.status(400).json({ msg: 'Invalid contact index' });

    // Remove the contact and persist
    user.emergencyContacts = user.emergencyContacts.filter((_, i) => i !== index);
    await user.save();

    res.json({ msg: 'Contact removed', emergencyContacts: user.emergencyContacts });
  } catch (err) {
    console.error('Emergency contact delete error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
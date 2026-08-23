const mongoose = require('mongoose');

const contactMessageSchema = new mongoose.Schema(
  {
    name:    { type: String, required: true, trim: true },
    email:   { type: String, required: true, trim: true, lowercase: true },
    phone:   { type: String, trim: true },
    company: { type: String, trim: true }, // optional (only if you collect it)
    concern: { type: String, required: true, trim: true, maxlength: 5000 },
    submittedAt: { type: Date, default: Date.now }
  },
  { collection: 'contact_messages' }
);

module.exports = mongoose.model('ContactMessage', contactMessageSchema);

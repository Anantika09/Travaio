const mongoose = require('mongoose');

const emergencyContactSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String },
  email: { type: String }
}, { _id: false });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  password: { type: String, required: true },
  emergencyContacts: [emergencyContactSchema]
});

module.exports = mongoose.model('User', userSchema);
// const mongoose = require('mongoose');

// const userSchema = new mongoose.Schema({
//   name: { type: String, required: true },
//   email: { type: String, required: true, unique: true },
//   phone: { type: String, required: true },
//   password: { type: String, required: true }
// });

// module.exports = mongoose.model('User', userSchema);
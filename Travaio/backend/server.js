const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const tripRoutes = require('./routes/trip');
const authRoutes = require('./routes/auth');
const contactRoutes = require('./routes/contact');
const emergencyRoutes = require('./routes/emergency');
// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: '*', // Or your frontend port
}));
app.use(express.json());

// Health Check Route
app.get('/health', (req, res) => {
  res.send('Server is running');
});

// Routes
app.use('/auth', authRoutes);
app.use('/trip', tripRoutes);
app.use('/api/contact', contactRoutes);
app.use('/emergency', emergencyRoutes);

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    // Start the server only after MongoDB connection is established
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => console.error('MongoDB connection error:', err));
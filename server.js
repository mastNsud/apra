require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDB } = require('./src/db');
const chatRoutes = require('./src/routes/chat');
const whatsappRoutes = require('./src/routes/whatsapp');
const appointmentRoutes = require('./src/routes/appointments');
const serviceRoutes = require('./src/routes/services');

// Initialize Express
const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/chat', chatRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/services', serviceRoutes);

// Config Endpoint for frontend dynamically rendering social links
app.get('/api/config', (req, res) => {
  res.json({
    SOCIAL_INSTAGRAM: process.env.SOCIAL_INSTAGRAM || 'https://instagram.com/apramakeup',
    SOCIAL_FACEBOOK: process.env.SOCIAL_FACEBOOK || 'https://facebook.com/apramakeup',
    SOCIAL_TELEGRAM: process.env.SOCIAL_TELEGRAM || 'https://t.me/apramakeup',
    SOCIAL_YOUTUBE: process.env.SOCIAL_YOUTUBE || 'https://youtube.com/@apramakeup'
  });
});

// Initialize DB and start server
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    // Initialize Telegram Bot logic here so it starts polling
    require('./src/telegramBot');
  });
});

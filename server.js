require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDB } = require('./src/db');
const chatRoutes = require('./src/routes/chat');
const whatsappRoutes = require('./src/routes/whatsapp');

// Initialize Express
const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/chat', chatRoutes);
app.use('/api/whatsapp', whatsappRoutes);

// Initialize DB and start server
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    // Initialize Telegram Bot logic here so it starts polling
    require('./src/telegramBot');
  });
});

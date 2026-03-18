const express = require('express');
const router = express.Router();
const { logChat, upsertLead } = require('../leadService');
const { askAI, parseAIResponse } = require('../botEngine');
const crypto = require('crypto');

// In-memory session store (In production, use Redis or Postgres)
const sessions = {};

router.post('/start', async (req, res) => {
  const sessionId = crypto.randomUUID();
  sessions[sessionId] = {
    history: [],
    collectedData: {}
  };
  
  const initialGreeting = "Hello! Welcome to Apra Makeup Studio. How can I assist you today? Are you looking for Bridal or Party makeup?";
  const { cleanMessage, buttons } = parseAIResponse(initialGreeting);
  
  sessions[sessionId].history.push({ role: 'assistant', content: initialGreeting });
  await logChat(sessionId, 'assistant', initialGreeting);
  
  res.json({ sessionId, message: cleanMessage, buttons });
});

router.post('/message', async (req, res) => {
  const { sessionId, message } = req.body;
  if (!sessions[sessionId]) {
    return res.status(400).json({ error: 'Invalid or missing session ID' });
  }
  
  const session = sessions[sessionId];
  session.history.push({ role: 'user', content: message });
  await logChat(sessionId, 'user', message);
  
  // Super simple static extraction for demo purposes
  if (message.includes('@')) session.collectedData.email = message;
  const phoneMatch = message.match(/\b\d{10}\b/);
  if (phoneMatch) session.collectedData.phone = phoneMatch[0];

  try {
    const aiRawResponse = await askAI(session.history);
    session.history.push({ role: 'assistant', content: aiRawResponse });
    await logChat(sessionId, 'assistant', aiRawResponse);
    
    // Save lead periodically or based on AI completing the form
    await upsertLead(sessionId, session.collectedData, 'web');
    
    const { cleanMessage, buttons } = parseAIResponse(aiRawResponse);
    res.json({ message: cleanMessage, buttons });
  } catch (err) {
    res.status(500).json({ error: 'AI processing failed' });
  }
});

module.exports = router;

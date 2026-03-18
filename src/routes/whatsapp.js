const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const { askAI, parseAIResponse } = require('../botEngine');
const { logChat, upsertLead } = require('../leadService');

const WAHA_URL = process.env.WAHA_URL || 'http://localhost:3000';
const WAHA_API_KEY = process.env.WAHA_API_KEY || '';

const sessions = {};

router.post('/webhook', async (req, res) => {
  // Acknowledge receipt quickly
  res.status(200).send('OK');

  const { event, payload } = req.body;
  if (event !== 'message' || !payload.id || payload.from === payload.to) return; // ignore self messages or non-messages
  
  const senderId = payload.from;
  const messageText = payload.body;
  
  if (!sessions[senderId]) {
    sessions[senderId] = { history: [], collectedData: {} };
  }
  
  const session = sessions[senderId];
  session.history.push({ role: 'user', content: messageText });
  await logChat(senderId, 'user', messageText);

  try {
    const aiRawResponse = await askAI(session.history);
    session.history.push({ role: 'assistant', content: aiRawResponse });
    await logChat(senderId, 'assistant', aiRawResponse);

    // Save Lead data
    await upsertLead(senderId, session.collectedData, 'whatsapp');

    const { cleanMessage, buttons } = parseAIResponse(aiRawResponse);
    
    // Send back to WAHA
    await sendToWaha(senderId, cleanMessage, buttons);
  } catch (err) {
    console.error('WAHA Webhook error:', err);
  }
});

async function sendToWaha(chatId, text, buttons) {
  let endpoint = '/api/sendText';
  let body = { chatId: chatId, text: text, session: 'default' };

  if (buttons.length > 0 && buttons.length <= 3) {
    endpoint = '/api/sendButtons';
    body = {
      chatId: chatId,
      text: text,
      buttons: buttons.map((btn, idx) => ({ id: `btn_${idx}`, text: btn })),
      session: 'default'
    };
  } else if (buttons.length > 3) {
    endpoint = '/api/sendList';
    body = {
      chatId: chatId,
      text: text,
      buttonText: 'Options',
      sections: [{
        title: 'Choose an option',
        rows: buttons.map((btn, idx) => ({ id: `row_${idx}`, title: btn }))
      }],
      session: 'default'
    };
  }
  
  try {
    await fetch(`${WAHA_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': WAHA_API_KEY
      },
      body: JSON.stringify(body)
    });
  } catch (error) {
    console.error('Error sending message to WAHA:', error);
  }
}

module.exports = router;

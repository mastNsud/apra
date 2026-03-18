const fs = require('fs');
const path = require('path');

const knowledgeFile = path.join(__dirname, 'knowledge.txt');
let knowledgeText = '';

try {
  knowledgeText = fs.readFileSync(knowledgeFile, 'utf8');
} catch (err) {
  console.error('Error reading knowledge.txt:', err);
}

const SYSTEM_PROMPT = `
You are the Omni-channel Lead Generation AI Bot for Apra Makeup Studio.
Here is your knowledge base:
---
${knowledgeText}
---
Your AGENDA is to collect: 
1. Name
2. Event Date
3. Makeup Type (Bridal/Party)
4. Venue Location
5. Phone Number

Do not ask for all details at once. Have a natural conversation.
Remember to enforce the strict rule: output interactive options as buttons using the format '[BUTTON: Option Name]'.
`;

async function askAI(chatHistory, retryWithFallback = false) {
  const model = retryWithFallback ? 'openrouter/free' : 'mistralai/mistral-7b-instruct:free';
  
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...chatHistory
  ];

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages: messages
      })
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (data && data.choices && data.choices.length > 0) {
      return data.choices[0].message.content;
    } else {
      throw new Error("Invalid response structure from OpenRouter.");
    }
  } catch (error) {
    console.error(`AI Engine Error (Model: ${model}):`, error);
    // If primary model fails, fallback once
    if (!retryWithFallback) {
      console.log('Falling back to openrouter/free model...');
      return askAI(chatHistory, true);
    } else {
      return "I'm currently facing some technical difficulties. Please try again later or reach out to us directly.";
    }
  }
}

// Helper to extract buttons and clean the message
function parseAIResponse(aiText) {
  const buttonRegex = /\[BUTTON:\s*(.*?)\]/g;
  const buttons = [];
  let match;
  while ((match = buttonRegex.exec(aiText)) !== null) {
    buttons.push(match[1].trim());
  }
  
  const cleanMessage = aiText.replace(buttonRegex, '').trim();
  
  return { cleanMessage, buttons };
}

module.exports = { askAI, parseAIResponse };

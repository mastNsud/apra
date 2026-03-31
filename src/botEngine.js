const fs = require('fs');
const path = require('path');

const KNOWLEDGE_FILE = path.join(__dirname, 'knowledge.txt');
let KNOWLEDGE_BASE = '';

try {
    KNOWLEDGE_BASE = fs.readFileSync(KNOWLEDGE_FILE, 'utf8');
} catch (err) {
    console.error('Error reading knowledge.txt:', err);
    KNOWLEDGE_BASE = 'APRA Makeup Studio in Delhi. Focused on Bridal and Party makeup.';
}

const HF_MODELS = [
    "meta-llama/Llama-3.2-1B-Instruct",
    "Qwen/Qwen2.5-1.5B-Instruct",
    "microsoft/Phi-3.5-mini-instruct",
    "zai-org/GLM-4.7-Flash"
];

const delay = ms => new Promise(res => setTimeout(res, ms));

async function fetchFromHF(messages, modelIndex = 0, retries = 0) {
    if (modelIndex >= HF_MODELS.length) {
        console.error("CRITICAL: All fallback models exhausted on Router API.");
        return null;
    }
    
    const token = process.env.HUGGINGFACE_TOKEN;
    const model = HF_MODELS[modelIndex];
    const url = "https://router.huggingface.co/v1/chat/completions";

    const body = {
        model: model,
        messages: messages,
        max_tokens: 250,
        temperature: 0.7
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(15000) // 15s total for the actual model response
        });

        if (response.status === 503 || response.status === 429) {
            if (retries < 2) {
                console.log(`[HF-Router] Model ${model} busy (${response.status}). Retrying...`);
                await delay(2000 * Math.pow(2, retries));
                return fetchFromHF(messages, modelIndex, retries + 1);
            } else {
                return fetchFromHF(messages, modelIndex + 1, 0);
            }
        }

        if (response.status === 410 || !response.ok) {
            console.log(`[HF-Router] Model ${model} failed (${response.status}). Enacting Fallback...`);
            return fetchFromHF(messages, modelIndex + 1, 0);
        }

        const data = await response.json();
        if (data && data.choices && data.choices.length > 0) {
            return data.choices[0].message.content.trim();
        }
        
        return fetchFromHF(messages, modelIndex + 1, 0);

    } catch (err) {
        console.error(`[HF-Router] Exception for ${model}:`, err.message);
        return fetchFromHF(messages, modelIndex + 1, 0); 
    }
}

function evaluateValueAdd(query) {
    const q = query.toLowerCase();
    if (q.includes('book') || q.includes('appointment') || q.includes('consultation') || q.includes('visit')) {
        return "I'd love to help you book an appointment! Please call us at +91-9876543210. Our booking process is simple and requires a quick verbal confirmation!";
    }
    if (q.includes('where') || q.includes('location') || q.includes('address') || q.includes('metro')) {
        return "Our studio is near Hemraj Jain Hospital, Pushpanjali Enclave, Pitampura, Delhi. You can easily spot us right opposite Metro Pillar 345, very close to the Pitampura Metro Station!";
    }
    if (q.includes('price') || q.includes('cost') || q.includes('charges') || q.includes('kitne') || q.includes('paisa')) {
        if (q.includes('bridal') || q.includes('wedding')) return "Our Premium Bridal packages range from ₹15,000 to ₹35,000, which includes an extensive trial session!";
    }
    return null;
}

async function askAI(chatHistory) {
    const recentHistory = chatHistory.slice(-7); 
    const lastUserMsgObj = recentHistory.filter(m => m.role === 'user').pop();
    const lastUserMsg = lastUserMsgObj ? lastUserMsgObj.content : "";

    const directResponse = evaluateValueAdd(lastUserMsg);
    if (directResponse) return directResponse;

    if (!process.env.HUGGINGFACE_TOKEN) {
        return "Server configuration missing. Please contact our APRA Pitampura Studio desk at +91-9876543210.";
    }

    // Modern OpenAI-Compatible Messages Array
    const messages = [
        { 
            role: "system", 
            content: `You are the APRA Makeup Studio & Academy assistant in Pitampura, Delhi.
            Be trendy, professional, and friendly to young female clients.
            Knowledge: [${KNOWLEDGE_BASE}]
            Rules:
            1. Keep responses concise (under 3 sentences).
            2. Suggest specific services based on user keywords.
            3. FOR IMPRESSIVE MOBILE UI: You MUST include interactive prompt buttons for common actions at the end of your message using the format: [BUTTON: Text].
            Examples:
            - If user asks about prices: "Our bridal packages range from 15k to 35k. [BUTTON: See Bridal Packages] [BUTTON: Book Trial]"
            - If user says hi: "Welcome to APRA! Are you looking for a wedding makeover or joined our academy? [BUTTON: Bridal Makeup] [BUTTON: Hair Styling] [BUTTON: Academy Courses]"`
        },
        ...recentHistory.map(m => ({
            role: m.role,
            content: m.content
        }))
    ];

    try {
        const rawOutput = await fetchFromHF(messages);
        if (!rawOutput) {
            return "I'm currently busy assisting other brides. Please call our Pitampura studio directly at +91-9876543210 to book your slot! [BUTTON: Call Studio]";
        }
        return rawOutput;
    } catch(err) {
        console.error("AI Router Exhaustion:", err);
        return "I'm currently facing some technical difficulties. Please call our Pitampura studio directly at +91-9876543210! [BUTTON: Call Studio]";
    }
}

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

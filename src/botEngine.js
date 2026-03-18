const KNOWLEDGE_BASE = `
Studio: APRA Makeup Studio & Academy
Location: Near Hemraj Jain Hospital, Pushpanjali Enclave, Pitampura, Delhi (Opposite Metro Pillar 345, near Pitampura Metro Station).
Hours: 10AM-8PM, closed Tuesday.
Services: Bridal (₹15,000-35,000 with trial session), Hair (Moroccan Oil ₹3,500+, Keratin, coloring), Academy (Courses 3-12 months, ₹45K-1.5L), Skincare (Facials ₹2,000+, clean-up ₹1,200).
FAQs: Home services? Yes +₹1,000-2,000 travel. Products? MAC, Bobbi Brown, Huda, Kryolan. Parking? Free available.
`;

const HF_MODELS = [
    "TinyLlama/TinyLlama-1.1B-Chat-v1.0",
    "microsoft/DialoGPT-medium",
    "google/flan-t5-base",
    "HuggingFaceH4/zephyr-7b-beta"
];

// Exponential Backoff Delay Generator
const delay = ms => new Promise(res => setTimeout(res, ms));

async function fetchFromHF(prompt, modelIndex = 0, retries = 0) {
    if (modelIndex >= HF_MODELS.length) {
        throw new Error("All fallback models exhausted.");
    }
    
    const token = process.env.HUGGINGFACE_TOKEN;
    const model = HF_MODELS[modelIndex];
    const url = `https://api-inference.huggingface.co/models/${model}`;

    const body = {
        inputs: prompt,
        parameters: { max_new_tokens: 250, temperature: 0.7, return_full_text: false }
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(9000) // Fallback limit matching success criteria (<8s ideal)
        });

        // Handle Overload / Rate Limits
        if (response.status === 503 || response.status === 429) {
            if (retries < 3) {
                console.log(`[HF] Model ${model} rate-limited/loading (${response.status}). Retrying...`);
                await delay(2000 * Math.pow(2, retries)); // Exponential Extender: 2s, 4s, 8s
                return fetchFromHF(prompt, modelIndex, retries + 1);
            } else {
                console.log(`[HF] Model ${model} failed after retries. Enacting Fallback Chain...`);
                return fetchFromHF(prompt, modelIndex + 1, 0);
            }
        }

        if (!response.ok) {
            console.log(`[HF] Model ${model} returned ${response.status}. Enacting Fallback Chain...`);
            return fetchFromHF(prompt, modelIndex + 1, 0);
        }

        const data = await response.json();
        
        // Extract Generated Output based on distinct output shapes of HuggingFace inferences
        if (Array.isArray(data) && data.length > 0 && data[0].generated_text) {
            return data[0].generated_text.trim();
        } else if (data.generated_text) {
            return data.generated_text.trim();
        } else if (typeof data === 'string') {
            return data.trim();
        } else {
            console.log(`[HF] Unrecognized output structure from ${model}. Enacting Fallback Chain...`);
            return fetchFromHF(prompt, modelIndex + 1, 0);
        }

    } catch (err) {
        console.error(`[HF] Request exception for ${model}:`, err.message);
        return fetchFromHF(prompt, modelIndex + 1, 0); 
    }
}

// Intent Parsing & Quick Lookups
function evaluateValueAdd(query) {
    const q = query.toLowerCase();
    
    if (q.includes('book') || q.includes('appointment') || q.includes('consultation') || q.includes('visit')) {
        return "I'd love to help you book an appointment! Please call us at +91-9876543210. Our booking process is simple and requires a quick verbal confirmation!";
    }
    if (q.includes('where') || q.includes('location') || q.includes('address') || q.includes('metro')) {
        return "Our studio is near Hemraj Jain Hospital, Pushpanjali Enclave, Pitampura, Delhi. You can easily spot us right opposite Metro Pillar 345, very close to the Pitampura Metro Station!";
    }
    if (q.includes('price') || q.includes('cost') || q.includes('charges') || q.includes('kitne') || q.includes('paisa')) {
        if (q.includes('bridal') || q.includes('wedding') || q.includes('shaadi')) return "Our Premium Bridal packages range from ₹15,000 to ₹35,000, which includes an extensive trial session!";
        if (q.includes('hair') || q.includes('moroccan') || q.includes('keratin')) return "Luxurious Moroccan Oil treatments start at ₹3,500+. We also execute Keratin and coloring!";
        if (q.includes('course') || q.includes('academy') || q.includes('learn')) return "APRA Academy courses run from 3 to 12 months, with fees ranging from ₹45K to 1.5 Lakhs depending on the Tier.";
        if (q.includes('facial') || q.includes('clean up') || q.includes('cleanup')) return "Exquisite Skincare Facials start at ₹2,000+, and a deep clean-up is ₹1,200.";
    }
    if (q.includes('wedding') || q.includes('shaadi') || q.includes('shadi')) {
        return "Congratulations on the upcoming wedding! I highly recommend checking out our Bridal makeup packages. Would you like to know our bridal pricing?";
    }
    return null;
}

// Main AI Integration
async function askAI(chatHistory) {
    // 1. Session Memory Context Extraction (last 6 items = 3 User, 3 System pairs max)
    const recentHistory = chatHistory.slice(-7); 
    const lastUserMsgObj = recentHistory.filter(m => m.role === 'user').pop();
    const lastUserMsg = lastUserMsgObj ? lastUserMsgObj.content : "";

    // 2. Intent Detection Trapper
    const directResponse = evaluateValueAdd(lastUserMsg);
    if (directResponse) {
        return directResponse;
    }

    // 3. String Prompt Assembly (Unified for multi-model compat)
    let promptStr = `System: You are APRA Makeup Studio assistant in Delhi. Be friendly, professional. Answer based on knowledge base. If unsure, offer to connect with human.\n`;
    
    if (recentHistory.length > 1) {
        promptStr += `\nPrevious Conversation:\n`;
        recentHistory.slice(0, -1).forEach(m => {
             // Omit raw strict formatting logs from front-end passing
            if(m.role !== 'system') {
                promptStr += `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}\n`;
            }
        });
    }

    promptStr += `\nHere's what I know: [${KNOWLEDGE_BASE}].\nUser asked: [${lastUserMsg}]\nAssistant:`;

    // 4. Remote Execution
    try {
        if (!process.env.HUGGINGFACE_TOKEN) {
            console.warn("CRITICAL: HUGGINGFACE_TOKEN missing from Env Keys.");
            return "Server configuration missing. Please contact our APRA Pitampura Studio desk at +91-9876543210.";
        }
        
        const rawOutput = await fetchFromHF(promptStr);
        // Stripping Model Hallucinations / Echoing
        let cleanText = rawOutput.replace(/<\|.*?\|>/g, '').trim();
        cleanText = cleanText.split('User:')[0].trim(); // Prevent DialoGPT user-echo loop 
        
        return cleanText || "I'm a bit overwhelmed right now, could you please call our studio direct at +91-9876543210?";
    } catch(err) {
        console.error("AI Exhaustion Flow:", err);
        return "I'm currently facing some technical difficulties. Please call our Pitampura studio directly at +91-9876543210 to safely book!";
    }
}

// Parser retained identically to avoid frontend breakage
function parseAIResponse(aiText) {
  const buttonRegex = /\\[BUTTON:\\s*(.*?)\\]/g;
  const buttons = [];
  let match;
  while ((match = buttonRegex.exec(aiText)) !== null) {
    buttons.push(match[1].trim());
  }
  const cleanMessage = aiText.replace(buttonRegex, '').trim();
  return { cleanMessage, buttons };
}

module.exports = { askAI, parseAIResponse };

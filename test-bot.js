require('dotenv').config();
const { askAI } = require('./src/botEngine');

const testQueries = [
    "What services do you offer?",
    "Bridal makeup price?",
    "Where is your studio located?",
    "Bridal makeup ka price kya hai? (Hindi mix)",
    "I want to book an appointment",
    "Do you have Moroccan oil treatment?",
    "What courses do you teach?"
];

async function runTests() {
    console.log("=== APRA CHATBOT HARNESS TEST ===\\n");
    for (let i = 0; i < testQueries.length; i++) {
        const query = testQueries[i];
        console.log(`[USER]: ${query}`);
        
        // Mock a fresh chat history for each
        const history = [
            { role: 'user', content: query }
        ];

        try {
            const response = await askAI(history);
            console.log(`[APRA AI]: ${response}\\n`);
        } catch(err) {
            console.error(`[ERROR]: ${err.message}\\n`);
        }
    }
}

runTests();

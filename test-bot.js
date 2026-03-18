require('dotenv').config();
const { askAI } = require('./src/botEngine');

const testQueries = [
    "What services does APRA offer?",
    "Bridal makeup price?",
    "Location in Pitampura?",
    "Do you have Moroccan oil treatment?",
    "I want to book an appointment"
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

require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

console.log("=== AgroMeteo AI Connection Validator ===");
console.log("Checking API Key setup...");

if (!process.env.GEMINI_API_KEY) {
    console.error("❌ ERROR: GEMINI_API_KEY is not defined in your environment!");
    console.error("Please ensure you have a .env file containing: GEMINI_API_KEY=your_key");
    process.exit(1);
} else {
    console.log("✅ API Key found in environment variables (Starts with: " + process.env.GEMINI_API_KEY.substring(0, 7) + "...)");
}

// Initialize the client
const ai = new GoogleGenAI({});

async function runDiagnostic() {
    console.log("\nAttempting to connect to Google Gen AI Cloud (gemini-2.5-flash)...");
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: 'Respond with exactly two words: Connection Successful.',
        });
        
        console.log("\n📡 --- SERVER RESPONSE RECEIVED ---");
        console.log("Raw Output:", response.text.trim());
        console.log("----------------------------------\n");
        console.log("🎉 SUCCESS! Your computer can communicate with the Gemini API perfectly.");
        
    } catch (error) {
        console.error("\n❌ CONNECTION FAILED!");
        console.error("Error Message:", error.message);
        console.error("\nPossible reasons:");
        console.error("1. Your API key might be invalid or copied incorrectly.");
        console.error("2. A network firewall/proxy or local Wamp64 configuration block is stopping outbound SSL requests.");
    }
}

runDiagnostic();
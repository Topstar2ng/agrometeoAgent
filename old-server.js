require('dotenv').config();
const express = require('express');
const axios = require('axios');
const { GoogleGenAI, Type } = require('@google/genai');


const app = express();
const PORT = process.env.PORT || 3000;

// Initialize the Google Gen AI SDK (automatically uses process.env.GEMINI_API_KEY)
//const ai = new GoogleGenAI();
// Fix: Pass an empty configuration object so the constructor initializes properly
const ai = new GoogleGenAI({});

app.use(express.json());

// strict JSON structure Gemini to return
const advisorySchema = {
    type: Type.OBJECT,
    properties: {
        riskLevel: { 
            type: Type.STRING, 
            description: "Overall environmental risk category for the crop. Choose from: Low, Moderate, High, Critical." 
        },
        summary: { 
            type: Type.STRING, 
            description: "A brief, 2-sentence summary explaining the current climate status and how it affects this specific crop." 
        },
        dos: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "List of highly actionable, direct instructions on what the farmer SHOULD do right now (e.g., irrigation, pest monitoring)."
        },
        donts: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "List of strict instructions on what the farmer SHOULD NOT do right away (e.g., do not apply fertilizer before heavy rain)."
        }
    },
    required: ["riskLevel", "summary", "dos", "donts"],
};

app.get('/api/agri-climate', async (req, res) => {
    // Read parameters from frontend query (defaulting to a Maize crop in a tropical region)
    const lat = req.query.lat || '12.00'; 
    const lon = req.query.lon || '8.50';
    const crop = req.query.crop || 'Maize';

    try {
        // 1. Fetch live climate metrics from Open-Meteo
        const openMeteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation&hourly=soil_temperature_0_to_7cm,soil_moisture_0_to_7cm,et0_fao_evapotranspiration&timezone=auto`;
        const weatherResponse = await axios.get(openMeteoUrl);
        
        const rawClimateData = {
            current: weatherResponse.data.current,
            hourly_trends: {
                time: weatherResponse.data.hourly.time.slice(0, 24),
                soil_moisture: weatherResponse.data.hourly.soil_moisture_0_to_7cm.slice(0, 24),
                soil_temp: weatherResponse.data.hourly.soil_temperature_0_to_7cm.slice(0, 24),
                evapotranspiration: weatherResponse.data.hourly.et0_fao_evapotranspiration.slice(0, 24)
            }
        };

        // 2. Instruct Gemini via a system instruction to act as an expert Agronomist
        const systemInstruction = `
            You are AgroMeteo AI, an expert digital agronomist and climate scientist assisting smallholder farmers. 
            Your goal is to translate raw climate and soil metrics into direct, practical agricultural advice.
            Be scientifically accurate but keep instructions extremely clear and simple. Never tell a farmer raw mathematical metrics without context; instead, explain what those metrics mean for their crop.
        `;

        // 3. Prompt containing the user's specific crop context and raw sensor/weather data
        const prompt = `
            Analyze the following real-time environmental metrics for a farmer growing ${crop}:
            
            Raw Sensor Data:
            ${JSON.stringify(rawClimateData, null, 2)}
            
            Evaluate crop risks, irrigation needs based on evapotranspiration rates, and soil parameters. Output an actionable advisory matching the requested schema.
        `;

        // 4. Call the Gemini API using the recommended gemini-2.5-flash model
        const aiResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: 'application/json',
                responseSchema: advisorySchema,
                temperature: 0.2 // Lower temperature for consistent, structured data
            }
        });

        // 5. Parse Gemini's structured response string back into a JSON object
        // Bulletproof JSON cleaner and parser
        let rawText = aiResponse.text.trim();
        if (rawText.startsWith("```json")) {
            rawText = rawText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
        } else if (rawText.startsWith("```")) {
            rawText = rawText.replace(/^```\s*/, "").replace(/\s*```$/, "");
        }
        const structuredAdvisory = JSON.parse(rawText);

        // Send both the raw data (for frontend charts) and the AI advisory together
        res.json({
            success: true,
            crop: crop,
            climateMetrics: rawClimateData,
            aiAdvisory: structuredAdvisory
        });

    } catch (error) {
        console.error("Error in AgroMeteo pipeline:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`AgroMeteo Backend running on port ${PORT}`);
});
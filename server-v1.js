// 1. Load environment flags at the very top
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const { GoogleGenAI, Type } = require('@google/genai');

const app = express();
// Changed to port 3500 to completely bypass background process caching
const PORT = 3500; 

// 2. Initialize the Gen AI SDK with an options wrapper
const ai = new GoogleGenAI({});

app.use(express.json());

// 3. Define the structural schema mapping for Gemini JSON enforcement
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
            description: "List of highly actionable instructions on what the farmer SHOULD do right now."
        },
        donts: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "List of strict instructions on what the farmer SHOULD NOT do right away."
        }
    },
    required: ["riskLevel", "summary", "dos", "donts"],
};

app.use(express.static('public'));


// 4. Core Endpoint Pipeline
app.get('/api/agri-climate', async (req, res) => {
    const lat = req.query.lat || '12.00'; 
    const lon = req.query.lon || '8.50';
    const crop = req.query.crop || 'Maize';

    try {
        // A. Ingest live Open-Meteo physical matrices
        const openMeteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation&hourly=soil_temperature_0_to_7cm,soil_moisture_0_to_7cm,et0_fao_evapotranspiration&timezone=auto`;
        const weatherResponse = await axios.get(openMeteoUrl);
        
        const cleanClimateData = {
            current: weatherResponse.data.current,
            hourly_trends: {
                time: weatherResponse.data.hourly.time.slice(0, 24),
                soil_moisture: weatherResponse.data.hourly.soil_moisture_0_to_7cm.slice(0, 24),
                soil_temp: weatherResponse.data.hourly.soil_temperature_0_to_7cm.slice(0, 24),
                evapotranspiration: weatherResponse.data.hourly.et0_fao_evapotranspiration.slice(0, 24)
            }
        };

        // B. Context persona assembly
        const systemInstruction = `
            You are AgroMeteo AI, an expert digital agronomist and climate scientist assisting smallholder farmers. 
            Your goal is to translate raw climate and soil metrics into direct, practical agricultural advice.
            Be scientifically accurate but keep instructions extremely clear and simple. Never tell a farmer raw mathematical metrics without context; instead, explain what those metrics mean for their crop. 
            Always provide a clear risk level, actionable dos and don'ts and alternative suggestions based on the current and forecasted environmental conditions.
        `;

        const prompt = `
            Analyze the following real-time environmental metrics for a farmer growing "${crop}":
            
            Raw Sensor Data:
            ${JSON.stringify(cleanClimateData, null, 2)}
            
            Evaluate crop risks, immediate irrigation needs matching evapotranspiration rates, soil moisture,and other soil parameters. 
            Output an actionable advisory matching the requested schema.
        `;

        // C. Generation query execution
        const aiResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: 'application/json',
                responseSchema: advisorySchema,
                temperature: 0.2
            }
        });

        // D. Clean markdown blocks from string output if present
        let rawText = aiResponse.text.trim();
        if (rawText.startsWith("```json")) {
            rawText = rawText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
        } else if (rawText.startsWith("```")) {
            rawText = rawText.replace(/^```\s*/, "").replace(/\s*```$/, "");
        }

        const structuredAdvisory = JSON.parse(rawText);

        // E. Deliver combined payload package
        res.json({
            success: true,
            crop: crop,
            climateMetrics: cleanClimateData,
            aiAdvisory: structuredAdvisory
        });

    } catch (error) {
        console.error("Pipeline Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 AgroMeteo Live API Engine spinning on port ${PORT}`);
});
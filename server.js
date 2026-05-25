/**
 * AGROMETEO AGENT - SERVER CORE
 * Version: 1.0.0
 * Description: Backend orchestrator for climate data processing, AI-driven agricultural 
 * insights, and secure farmer authentication using MySQL.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodeCache = require('node-cache');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const SERVER_PORT = process.env.PORT || 3200;
const JWT_SECRET = process.env.JWT_SECRET || "agrometeo_super_secure_vector_key_2026";

// ==========================================
// 1. GLOBAL MIDDLEWARE & SUBSYSTEMS
// ==========================================

// Enable Cross-Origin Resource Sharing
app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parse incoming JSON payloads
app.use(express.json());

// Initialize Gemini AI Engine
const aiEngine = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Initialize Server-side Cache (5-minute TTL)
const aiCache = new nodeCache({ stdTTL: 300 });

// ==========================================
// 2. DATABASE CONFIGURATION (MySQL)
// ==========================================

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '', 
    database: process.env.DB_NAME || 'agrometeo_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// ==========================================
// 3. AI & DIAGNOSTIC API ROUTES
// ==========================================

const apiRouter = express.Router();
apiRouter.post('/consult', async (req, res) => {
    console.log("📨 [Hit Detected] Processing incoming diagnostic payload for crop:", req.body?.crop);
    
    try {
        const { locationName, crop, currentTemp, currentHumidity, currentPrecipitation } = req.body;
        const cacheKey = `${locationName}-${crop}-${currentTemp}-${currentHumidity}-${currentPrecipitation}`;

        const agriculturalPrompt = `
            You are AgroMeteo AI, an expert digital agronomist assisting smallholder farmers. 
            Analyze these raw climate parameters:
            - Context: ${locationName || 'Unknown Region'}
            - Crop Target: ${crop || 'Maize'}
            - Temperature: ${currentTemp || 25}°C
            - Humidity: ${currentHumidity || 60}%
            - Rainfall Context: ${currentPrecipitation || 0}mm

            CRITICAL INSTRUCTION: You must respond ONLY with a valid JSON object. Do not include markdown code blocks, backticks, or any extra conversational text.

            The JSON structure must look EXACTLY like this:
            {
                "statusTitle": "Short high-contrast status phrase (e.g., Extreme Heat Warning)",
                "currentSituation": "1-2 sentence plain-language explanation of what these numbers mean for this specific plant.",
                "overallRisk": "HIGH",
                "dos": [
                    {"title": "IRRIGATE DEEPLY", "description": "Water thoroughly in early morning or late evening when it is cool to prevent rapid evaporation."}
                ],
                "donts": [
                    {"title": "DON'T PLANT NOW", "description": "Seeds will struggle to germinate in dry soil and hot weather."}
                ],
                "metrics": {
                    "suitability": "POOR",
                    "irrigation": "CRITICAL",
                    "pestThreat": "HIGH",
                    "threatReason": "Spider mites and fall armyworms thrive in dry, hot conditions."
                },
                "futureTip": "For your next cycle, look into drought-tolerant seed varieties."
            }
        `;

        // Check cache
        if (aiCache.has(cacheKey)) {
            console.log("💾 Returning cached result");
            return res.json(aiCache.get(cacheKey));
        }

        // Execute AI Generation
        const modelInstance = aiEngine.getGenerativeModel({ 
            model: "gemini-3.5-flash", // Updated to stable flash model
            generationConfig: { responseMimeType: "application/json", temperature: 0.2 }
        });

        const predictionResult = await modelInstance.generateContent(agriculturalPrompt);
        const cleanJsonString = predictionResult.response.text();
        const parsedResult = JSON.parse(cleanJsonString);
        
        console.log("✅ Gemini 3.5 Flash JSON Structure Derived Safely!");
        
        // Cache the successful result
        aiCache.set(cacheKey, parsedResult);
        
        res.json(parsedResult);

    } catch (error) {
        console.error("❌ Gemini API Processing Error:", error);
        
        if (error.status === 429) {
            res.status(429).json({ 
                error: "Rate limit exceeded. Please try again in a few minutes.",
                recommendation: "API Quota Exceeded - Please wait a few minutes"
            });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

// 4. ADDITIONAL AI-POWERED CHAT ENDPOINT FOR FARMER INQUIRIES
apiRouter.post('/chat', async (req, res) => {
    try {
        const { message, currentTemp, currentHumidity, currentPrecipitation, crop } = req.body;

        const chatPrompt = `
            You are AgroMeteo Assistant, an empathetic digital agronomist chatting directly with a farmer.
            
            CONTEXT PARAMETERS:
            - Selected Crop Context: ${crop || 'General Crops'}
            - Current Weather: Temp ${currentTemp || 25}°C, Humidity ${currentHumidity || 60}%, Rain ${currentPrecipitation || 0}mm

            FARMER'S QUESTION: "${message}"

            CRITICAL DIRECTIVE: Answer the question clearly, concisely (max 3-4 sentences), and link it directly to their current weather values if relevant. Do not output markdown lists, titles, or JSON structures. Keep it looking like a natural text message conversation from a helpful human advisor.
        `;

        const modelInstance = aiEngine.getGenerativeModel({ model: "gemini-3.5-flash" });
        const chatResult = await modelInstance.generateContent(chatPrompt);
        
        res.json({ reply: chatResult.response.text() });
    } catch (error) {
        console.error("❌ Chat Subsystem Error:", error);
        res.status(500).json({ error: error.message });
    }
});

app.use('/api/ai', apiRouter);

// ==========================================
// 4. AUTHENTICATION SYSTEM (JWT + MySQL)
// ==========================================

const authRouter = express.Router();

async function initializeDatabaseSchema() {
    try {
        const connection = await pool.getConnection();
        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        connection.release();
        console.log("💾 MySQL Database Core Schema Synchronized and Operational!");
    } catch (err) {
        console.error("❌ MySQL Schema Synchronization Failure:", err);
    }
}
initializeDatabaseSchema();

authRouter.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        if (!username || !email || !password) {
            return res.status(400).json({ error: "All account fields are required." });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const sql = `INSERT INTO users (username, email, password) VALUES (?, ?, ?)`;
        const [result] = await pool.execute(sql, [username, email, hashedPassword]);
        
        console.log(`👤 New Farmer Registered via MySQL! User ID: ${result.insertId}`);
        res.status(201).json({ message: "Farmer account compiled successfully! Proceed to Login." });

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY' || error.message.includes("Duplicate entry")) {
            return res.status(400).json({ error: "Username or Email address is already registered." });
        }
        res.status(500).json({ error: "Internal registration fault." });
    }
});

// LOGIN ENDPOINT (MySQL Variant)
authRouter.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required." });
        }

        const sql = `SELECT * FROM users WHERE email = ?`;
        const [rows] = await pool.execute(sql, [email]);
        
        if (rows.length === 0) {
            return res.status(400).json({ error: "Invalid login credentials." });
        }

        const user = rows[0];
        const isMatch = await bcrypt.compare(password, user.password);
        
        if (!isMatch) {
            return res.status(400).json({ error: "Invalid login credentials." });
        }
        // Generate dynamic secure JWT token session
        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });

        console.log(`🔓 Farmer ${user.username} successfully authorized via MySQL Node Core.`);
        res.json({
            message: "Authentication cleared.",
            token: token,
            user: { id: user.id, username: user.username, email: user.email }
        });

    } catch (error) {
        console.error("❌ Login Pipeline Error:", error);
        res.status(500).json({ error: "Internal execution matrix block error." });
    }
});

authRouter.get('/verify', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: "No token provided" });
        }
        
        const decoded = jwt.verify(token, JWT_SECRET);
        
        const sql = `SELECT id, username, email FROM users WHERE id = ?`;
        const [rows] = await pool.execute(sql, [decoded.id]);
        
        if (rows.length === 0) {
            return res.status(401).json({ error: "User not found" });
        }
        
        res.json({ valid: true, user: rows[0] });
    } catch (error) {
        res.status(401).json({ error: "Invalid token" });
    }
});

app.use('/api/auth', authRouter);

// ==========================================
// 5. STATIC ASSETS & SPA ROUTING
// ==========================================

app.use(express.static(path.join(__dirname, 'public'))); 

app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ==========================================
// 6. SERVER INITIALIZATION
// ==========================================

app.listen(SERVER_PORT, () => {
    console.log(`\n==================================================`);
    console.log(`🤖 AgroMeteo Agent online on port ${SERVER_PORT}!`);
    console.log(`==================================================\n`);
});
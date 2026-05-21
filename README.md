# 🌱 AgroMeteo AI: A Farmer’s Intelligent Climate Assistant

AgroMeteo AI is a full-stack, AI-driven precision agriculture decision-support platform built for hackathons. It bridges the gap between deep climate intelligence and practical, everyday farming by transforming raw real-time meteorological and sub-surface soil metrics into highly localized, actionable crop advisories.

## 💡 The Inspiration
Agriculture remains one of the most climate-sensitive sectors in the world, especially in developing regions where smallholder farmers depend heavily on unpredictable seasonal weather patterns. Many farmers still rely on guesswork or delayed broad-spectrum forecasts when deciding when to irrigate, plant, or apply fertilizers. 

**AgroMeteo AI** was built to eliminate this guesswork. By combining hyperlocal real-time weather and advanced earth-layer soil analytics with artificial intelligence, it delivers structured, bite-sized "DOs" and "DONTs" tailored to specific crops, preventing costly losses and optimizing yields.

---

## 🚀 Key Features
- **Hyperlocal Ingestion:** Pulls real-time atmospheric variables (temperature, relative humidity, precipitation) based on exact geospatial coordinates.
- **Precision Earth Metrics:** Tracks sub-surface physics trends including soil moisture (0–7cm volumetric ratio), soil temperature, and Evapotranspiration rates ($ET_0$).
- **Structured GenAI Reasoning:** Feeds raw data directly into Google's Gemini API, enforcing strict JSON schemas to output reliable, context-specific agricultural advisories.
- **Dynamic Visualizations:** Features an interactive dashboard charting upcoming 24-hour microclimate anomalies and environmental trends using Chart.js.

---

## 🛠️ Architecture & Tech Stack

```text
[Frontend: Vue.js & Chart.js] 🖥️
       ▲                 │  (1) Selects Location & Crop
       │ (4) Returns     ▼
[Backend Server: Node.js / Express] ⚙️
       │                 │
       │ (2) Fetches Data│ (3) Pipes Context + Sensor Metrics
       ▼                 ▼
[Open-Meteo API] 🌦️    [Google Gemini API (gemini-2.5-flash)] 🧠
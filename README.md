# 🌱 AgroMeteo AI: Your Smart Farming Companion

## What is AgroMeteo AI?

Imagine having a friendly farming expert in your pocket who knows exactly what your crops need based on the weather right where you're standing. That's AgroMeteo AI!

This web app helps farmers make smarter decisions by combining:
- **Real-time weather data** from your exact location
- **AI-powered advice** that's specific to your crop
- **Easy-to-follow recommendations** - just "Do this" and "Don't do that"

Built for hackathons but designed for real farmers, AgroMeteo AI takes complex weather data and turns it into simple, actionable farming advice.

---

## 🎯 Why I Built This

Farmers, especially smallholders in developing regions, face a big challenge: they depend on weather patterns that are becoming more unpredictable every year. Most don't have access to localized, timely advice.

**AgroMeteo AI fixes this by:**
- Using your phone's GPS to get weather data for your exact field
- Giving you specific advice for your crop (maize, rice, tomatoes, and more)
- Speaking in plain language, not technical jargon
- Working offline when possible and syncing when you're back online

No more guessing when to water, plant, or protect your crops!

---

## ✨ What It Can Do

### For Farmers:
- **Get instant crop advice** - Tell the app what you're growing, get personalized recommendations
- **See your local weather** - Temperature, humidity, rainfall, wind speed - all for your exact location
- **Receive alerts** - Get warned about extreme weather, disease risks, or drought conditions
- **Chat with AI** - Ask questions like "Should I fertilize today?" and get helpful answers
- **Detect crop diseases** - Based on weather patterns, the app warns you about potential disease outbreaks

### For Developers:
- **Clean, modular code** - Easy to extend and customize
- **RESTful API** - All AI features available through simple endpoints
- **MySQL database** - User authentication and data persistence
- **Mobile-first design** - Works great on phones, tablets, and desktops

---

## 🛠️ How It Works (Simple Version)

1. **You open the app** on your phone or computer
2. **The app finds your location** (or you can type it in)
3. **It fetches current weather data** from Open-Meteo (a free weather API)
4. **You select your crop** (maize, rice, tomatoes, etc.)
5. **The AI analyzes everything** - weather + your crop = personalized advice
6. **You get clear recommendations** - what to do, what to avoid, and why

All of this happens in seconds!

---

## 🏗️ The Technology Behind It

### Frontend (What you see and interact with)
- **Vue.js 3** - Makes the app feel snappy and responsive
- **Tailwind CSS** - Makes it look good on any device
- **Leaflet** - Interactive maps showing weather layers
- **ApexCharts** - Beautiful graphs of weather trends

### Backend (The brain)
- **Node.js + Express** - Handles requests and serves the app
- **Google Gemini AI** - Generates the smart farming advice
- **MySQL** - Stores user accounts (optional, you can use without logging in)
- **JWT** - Secure authentication

### External Services
- **Open-Meteo API** - Free, hyperlocal weather data
- **Google Gemini API** - Powers the AI advice engine
- **Web Speech API** - Reads advice out loud (great for farmers who prefer listening)

---

## 📂 Project Structure (Made Simple)

```
agrometeoAgent/
├── 📁 public/           # What the user sees
│   ├── index.html      # The main page
│   ├── app.js          # All the frontend magic
│   ├── custom.css      # My custom styles
│   └── tailwind.css    # Generated styles (don't edit this)
│
├── 📁 src/             # Source files
│   └── input.css       # Tailwind source (edit this)
│
├── 📄 server.js        # Backend server (what runs the app)
├── 📄 package.json     # List of dependencies
├── 📄 .env             # Secret keys
│
└── 📄 README.md        # You are here!
```

---

## 🚀 Getting Started (For Developers)

### Prerequisites
- Node.js (version 18 or higher)
- MySQL (for user accounts - optional)
- A free API key from Google AI Studio

### Quick Setup

1. **Clone the project**
   ```bash
   git clone https://github.com/Topstar2ng/agrometeoAgent.git
   cd agrometeoAgent
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file with:
   ```env
   GEMINI_API_KEY=your_api_key_here
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=agrometeo_db
   JWT_SECRET=your_secret_key
   ```

4. **Build the CSS**
   ```bash
   npm run build:css
   ```

5. **Start the server**
   ```bash
   npm start
   ```

6. **Open your browser** and go to `http://localhost:3200`

---

## 🌍 Deployment (Putting It Online)

### Option 1: cPanel Shared Hosting (Easiest)
1. Zip your project folder (excluding `node_modules`)
2. Upload to your subdomain's `public_html` folder
3. Create a Node.js app in cPanel's "Setup Node.js App"
4. Set application root to `/public`
5. Run NPM install from cPanel
6. Start the app - done! 🎉

### Option 2: VPS (More Control)
- Use PM2 to keep the app running
- Set up Nginx as a reverse proxy
- Install SSL with Let's Encrypt

Detailed deployment guides are available in my project wiki.

---

## 📱 Features in Detail

### 🌤️ Weather Dashboard
- Live temperature, humidity, precipitation, wind speed
- 7-day forecast with rainfall predictions
- Interactive map with weather overlays (rainfall, temperature, wind, vegetation health)

### 🤖 AI Crop Advisor
- Select from 11+ crops
- Get structured advice: status, risks, DOs and DON'Ts
- Listen to advice with text-to-speech
- Translate to 9 languages (Yoruba, Hausa, Igbo, French, Spanish, etc.)

### 🦠 Disease Detection
- Weather-based disease risk assessment
- Pest infestation warnings
- Prevention recommendations

### 🔔 Alert System
- Extreme heat warnings
- Frost alerts
- Heavy rainfall/flooding risks
- Drought conditions

### 👤 User Accounts (Optional)
- Register/login with email
- JWT authentication
- Session persistence

---

## 🧪 Testing the App

### Test the API directly:
```bash
# Check if server is running
curl https://agrometeoagent.tecspectratechnologies.com/api/ai/test

# Get AI advice (replace with your data)
curl -X POST https://agrometeoagent.tecspectratechnologies.com/api/ai/consult \
  -H "Content-Type: application/json" \
  -d '{"crop":"Maize","currentTemp":28,"currentHumidity":65,"currentPrecipitation":0}'
```

### Test locally:
```bash
npm test  # Coming soon!
```

---

## ❓ Common Questions

**Do I need to create an account?**
Nope! You can use all core features without logging in. Accounts are only for saving preferences.

**Is the AI advice really accurate?**
The AI uses real weather data and known agricultural science. But always combine AI advice with local knowledge, experience and real time advice from approved government Agency like NiMet!

**What if I don't have internet?**
The app works offline for basic features and syncs when you're back online.

**How much does this cost to use?**
The weather API is free, and the AI API has a generous free tier. For most farmers, it's completely free!

---

## 🤝 Contributing

Love what you see? Want to make it better?

1. Fork the project
2. Create your feature branch (`git checkout -b feature/CoolNewFeature`)
3. Commit your changes (`git commit -m 'Add some cool feature'`)
4. Push to the branch (`git push origin feature/CoolNewFeature`)
5. Open a Pull Request

Ideas for contributions:
- Add more crops and disease models
- Integrate soil sensors (hardware!)
- Add SMS notifications for farmers without smartphones
- Translate to more Nigerian languages

---

## 📄 License

This project is open source under the MIT license. Use it, modify it, share it - just keep the attribution!

---

## 🙏 Acknowledgments

- **Open-Meteo** for the incredible weather API
- **Google Gemini** for powering the AI advice
- **My community of farmers** who tested and provided feedback
- **Hackathon organizers** for pushing me to build this

---

## 📞 Contact & Support

- **Live Demo**: [agrometeoagent.tecspectratechnologies.com](https://agrometeoagent.tecspectratechnologies.com)
- **GitHub**: [github.com/Topstar2ng/agrometeoAgent](https://github.com/Topstar2ng/agrometeoAgent)
- **Issues**: Found a bug? [Open an issue](https://github.com/Topstar2ng/agrometeoAgent/issues)

---

## ⭐ Show Your Support

If this project helped you or inspired you:
- Star it on GitHub ⭐
- Share it with a farmer 👨‍🌾
- Contribute to making agriculture smarter 🌾

**Built by Temitope O. [https://portfolio.tecspectratechnologies.com](https://portfolio.tecspectratechnologies.com)**
*Making farming smarter, one field at a time.*
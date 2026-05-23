const { createApp, ref, onMounted, onUnmounted, computed } = Vue;

createApp({
    setup() {
        const activeTab = ref('weather');
        
        // NEW LOCATION METHOD STATE DECLARATIONS
        const locationMode = ref('auto'); // Options: 'auto' | 'manual'
        
        const liveCoords = ref({ lat: 9.0765, lon: 7.3986 }); // Defaults to Abuja context
        const manualCoords = ref({ lat: 6.5244, lon: 3.3792 }); // Defaults to Lagos context

        const selectedLocationIndex = ref(0);

        const activeView = ref('7day');
        const weatherData = ref(null);
        const loading = ref(true);
        const error = ref(null);
        
        // Auth States
        const showAuthModal = ref(false);
        const authMode = ref('login');
        const isAuthenticated = ref(false);
        const currentUser = ref(null);
        const authForm = ref({ name: '', email: '', password: '' });
        const authMessage = ref({ text: '', isError: false });
        const registeredUsersStore = ref([
            { name: 'Chief Operator Admin', email: 'admin@agriclimate.io', password: 'password123' }
        ]);
        
        let chartInstance = null;
        let mapInstance = null;
        let mapMarker = null;

        // COMPUTED PROPERTIES TO STREAMLINE TARGET COORDINATES
        const activeCoordinates = computed(() => {
            if (locationMode.value === 'manual') {
                return { lat: manualCoords.value.lat, lon: manualCoords.value.lon };
            }
            return { lat: liveCoords.value.lat, lon: liveCoords.value.lon };
        });

        const activeLatLonString = computed(() => {
            return `${activeCoordinates.value.lat.toFixed(4)}, ${activeCoordinates.value.lon.toFixed(4)}`;
        });

        const activeLocationName = computed(() => {
            if (locationMode.value === 'auto') return "Detected Device GPS";
            if (locationMode.value === 'manual') return "Custom Coordinate Intercept";
        });

        // FIX: Add a proper method to change active tab
        const setActiveTab = (tabName) => {
            activeTab.value = tabName;
            console.log(`🔄 Active tab changed to: ${tabName}`);
            
            // Optional: Save to localStorage for persistence
            localStorage.setItem('activeTab', tabName);
            
            // Optional: Trigger actions based on tab change
            if (tabName === 'reports' && !aiReport.value && weatherData.value?.current) {
                // Auto-generate report when switching to reports tab if none exists
                // Uncomment if you want auto-generation
                // generateFarmAIInsight();
            }
        };

        // GEOLOCATION AUTOMATIC SCAN ENGINE
        const detectLiveLocation = () => {
            if (!navigator.geolocation) {
                alert("Geolocation engine not supported by this web node browser architecture.");
                return;
            }
            loading.value = true;
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    liveCoords.value.lat = position.coords.latitude;
                    liveCoords.value.lon = position.coords.longitude;
                    fetchOpenMeteoTelemetry();
                    
                },
                (err) => {
                    console.warn(`GPS Access Error: ${err.message}. Using placeholder metrics.`);
                    // Fallback to avoid breaking interface flow
                    fetchOpenMeteoTelemetry();
                },
                { enableHighAccuracy: true, timeout: 8000 }
            );
        };

        const applyManualCoordinates = () => {
            fetchOpenMeteoTelemetry();
        };

        // MAIN WEATHER FETCHER UTILITY USING DYNAMIC COMPUTE COORDINATES
        const fetchOpenMeteoTelemetry = async () => {
            loading.value = true;
            error.value = null;
            try {
                const { lat, lon } = activeCoordinates.value;
                const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;
                
                const response = await fetch(url);
                if (!response.ok) throw new Error("Satellite transmission sync lost.");
                const data = await response.json();
                weatherData.value = data;
                
                updateLeafletMap();
                setTimeout(() => { renderEngineAnalyticsPlot(); }, 50);
            } catch (err) {
                error.value = err.message;
            } finally {
                loading.value = false;
            }
        };

        const updateLeafletMap = () => {
            const { lat, lon } = activeCoordinates.value;
            const temp = weatherData.value?.current?.temperature_2m || '--';
            const rain = weatherData.value?.current?.precipitation || '0';

            if (!mapInstance) {
                const mapContainer = document.getElementById('map-pane');
                if (!mapContainer) return;
                
                mapInstance = L.map('map-pane').setView([lat, lon], 10);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap'
                }).addTo(mapInstance);
                
                mapMarker = L.marker([lat, lon]).addTo(mapInstance);
            } else {
                mapInstance.setView([lat, lon], 10);
                mapMarker.setLatLng([lat, lon]);
            }

            mapMarker.bindPopup(`
                <div class="font-mono text-xs">
                    <b class="text-emerald-500">Current Node:</b><br>
                    Temp: ${temp}°C | Rain: ${rain}mm
                </div>
            `).openPopup();
        };

        const executeAuthSubmit = () => {
            authMessage.value = { text: '', isError: false };
            if (authMode.value === 'login') {
                const matchedUser = registeredUsersStore.value.find(u => u.email === authForm.value.email && u.password === authForm.value.password);
                if (matchedUser) {
                    isAuthenticated.value = true;
                    currentUser.value = { name: matchedUser.name, email: matchedUser.email };
                    authMessage.value = { text: 'Cryptographic link active. Telemetry permissions unlocked.', isError: false };
                    setTimeout(() => { closeAuthWorkspace(); }, 1000);
                } else {
                    authMessage.value = { text: 'Authentication signature rejected. Access denied.', isError: true };
                }
            } else {
                const exists = registeredUsersStore.value.some(u => u.email === authForm.value.email);
                if (exists) {
                    authMessage.value = { text: 'Email ID already registered as a secure node point.', isError: true };
                    return;
                }
                const newAccount = { name: authForm.value.name, email: authForm.value.email, password: authForm.value.password };
                registeredUsersStore.value.push(newAccount);
                isAuthenticated.value = true;
                currentUser.value = { name: newAccount.name, email: newAccount.email };
                authMessage.value = { text: 'Secure node created.', isError: false };
                setTimeout(() => { closeAuthWorkspace(); }, 1000);
            }
        };

        const closeAuthWorkspace = () => {
            showAuthModal.value = false;
            authForm.value = { name: '', email: '', password: '' };
            authMessage.value = { text: '', isError: false };
        };

        const logoutSession = () => {
            isAuthenticated.value = false;
            currentUser.value = null;
        };

        const renderEngineAnalyticsPlot = () => {
            const chartDom = document.querySelector("#engine-macro-chart");
            if (!chartDom || !weatherData.value) return;

            let seriesData = [];
            let categoriesData = [];

            if (activeView.value === '7day') {
                categoriesData = weatherData.value.daily.time.map(t => formatDayName(t));
                seriesData = [
                    { name: 'Rainfall Projection (mm)', type: 'column', data: weatherData.value.daily.precipitation_sum },
                    { name: 'Max Canopy Temp (°C)', type: 'line', data: weatherData.value.daily.temperature_2m_max }
                ];
            } else {
                categoriesData = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                seriesData = [
                    { name: 'Projected Rainfall Normal (mm)', type: 'column', data: [110, 145, 180, 130, 95, 40, 12] },
                    { name: 'Macro Seasonal Temperature Median (°C)', type: 'line', data: [29.5, 28.1, 27.4, 28.9, 30.2, 31.8, 33.1] }
                ];
            }

            const options = {
                series: seriesData,
                chart: { height: '100%', type: 'line', toolbar: { show: false }, background: 'transparent' },
                colors: ['#0284c7', '#10b981'],
                stroke: { width: [0, 3], curve: 'smooth' },
                theme: { mode: 'dark' },
                grid: { borderColor: '#1f293d', strokeDashArray: 4 },
                xaxis: { categories: categoriesData, labels: { style: { colors: '#9ca3af', fontFamily: 'JetBrains Mono' } } },
                yaxis: [
                    { title: { text: 'Precipitation (mm)', style: { color: '#0284c7' } }, labels: { style: { colors: '#0284c7' } } },
                    { opposite: true, title: { text: 'Temperature (°C)', style: { color: '#10b981' } }, labels: { style: { colors: '#10b981' } } }
                ],
                legend: { position: 'top', horizontalAlign: 'right', fontFamily: 'JetBrains Mono' },
                dataLabels: { enabled: false }
            };

            if (chartInstance) chartInstance.destroy();
            chartInstance = new ApexCharts(chartDom, options);
            chartInstance.render();
        };

        const switchEngineView = (viewType) => { activeView.value = viewType; renderEngineAnalyticsPlot(); };
        const refreshTelemetry = () => { fetchOpenMeteoTelemetry(); };
        const formatDayName = (dateStr) => { return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' }); };
        const getForecastIconClass = (rain) => { return rain === 0 ? 'fa-sun text-amber-400' : rain <= 4 ? 'fa-cloud-sun text-emerald-400' : 'fa-cloud-showers-heavy text-blue-400'; };

        // TRIGGER AN INITIAL LIVE DETECTION SEQUENCE UPON ACCESS UNLOCK
        onMounted(() => { 
            detectLiveLocation();
            
            // Load saved tab preference from localStorage
            const savedTab = localStorage.getItem('activeTab');
            if (savedTab && ['weather', 'alerts', 'reports'].includes(savedTab)) {
                activeTab.value = savedTab;
            }
        });

        // AI REPORTING STATES
        const aiReport = ref(null);
        const generatingReport = ref(false);
        const cropSelection = ref('Maize'); // Default focus

        const parseMarkdownToHtml = (text) => {
            if (!text) return '';
            
            return text
                // Format bold text elements safely
                .replace(/\*\*(.*?)\*\*/g, '<strong class="text-amber-400 font-bold">$1</strong>')
                // Format standard markdown bullets to structured UI flex boxes
                .replace(/^\s*[\*\-]\s+(.*?)$/gm, '<div class="flex items-start gap-2 my-2 text-gray-200"><i class="fa-solid fa-angle-right text-[10px] text-emerald-400 mt-1.5 shrink-0"></i><span>$1</span></div>')
                // Format headers into clear layout section strips
                .replace(/^###\s+(.*?)$/gm, '<h4 class="text-sm font-bold uppercase tracking-wider text-white mt-5 mb-2 font-mono border-b border-gray-800 pb-1 flex items-center gap-2">$1</h4>')
                // Ensure proper line-breaks map into readable blocks
                .replace(/\n/g, '<br>');
        };

        // Function to call your Express backend AI agent route
        const generateFarmAIInsight = async () => {
            generatingReport.value = true;
            aiReport.value = null;
            
            try {
                const currentData = weatherData.value?.current;
                const payload = {
                    locationName: activeLocationName.value,
                    crop: cropSelection.value,
                    currentTemp: currentData ? currentData.temperature_2m : 25,
                    currentHumidity: currentData ? currentData.relative_humidity_2m : 60,
                    currentPrecipitation: currentData ? currentData.precipitation : 0
                };

                const response = await fetch('/api/ai/consult', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) throw new Error("AI Processing Node Offline");
                
                // Handle API rate limiting scenario
                if (response.status === 429) {
                    aiReport.value = {
                        statusTitle: "API Throttled",
                        currentSituation: "The system received too many sequential requests. Please wait 10 seconds before polling the climate engine again.",
                        overallRisk: "LOW",
                        dos: [], donts: [], metrics: { suitability: "FAIR", irrigation: "DELAYED", pestThreat: "LOW", threatReason: "" }, futureTip: ""
                    };
                } else {
                    const data = await response.json();
                    aiReport.value = data;
                }

            } catch (err) {
                console.error("AI Communication Error:", err);
                aiReport.value = {
                    statusTitle: "Subsystem Error",
                    currentSituation: "Unable to parse intelligence matrix. Confirm server connectivity or try again later.",
                    overallRisk: "HIGH",
                    dos: [], donts: [], metrics: { suitability: "POOR", irrigation: "UNKNOWN", pestThreat: "UNKNOWN", threatReason: "" }, futureTip: ""
                };
            } finally {
                generatingReport.value = false;
            }
        };

        // BASIC INTERACTIVE CHAT STATES AND METHODS FOR ON-DEMAND AI CONSULTATIONS
        const isChatOpen = ref(false);
        const chatMessage = ref('');
        const isChatTyping = ref(false);
        const chatMessages = ref([
            { sender: 'ai', text: "Hello farmer! 👋 I'm your on-field companion. Ask me any situational weather or crop questions based on today's dashboard data!" }
        ]);

        const toggleChat = () => {
            isChatOpen.value = !isChatOpen.value;
        };

        // Quick-fill presets
        const setChatPreset = (text) => {
            chatMessage.value = text;
        };

        const sendChatMessage = async () => {
            if (!chatMessage.value.trim() || isChatTyping.value) return;

            const userText = chatMessage.value;
            chatMessages.value.push({ sender: 'user', text: userText });
            chatMessage.value = '';
            
            isChatTyping.value = true;

            setTimeout(() => scrollChatBottom(), 50);

            try {
                const currentData = weatherData.value?.current;
                const response = await fetch('/api/ai/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: userText,
                        crop: cropSelection.value,
                        currentTemp: currentData ? currentData.temperature_2m : 25,
                        currentHumidity: currentData ? currentData.relative_humidity_2m : 60,
                        currentPrecipitation: currentData ? currentData.precipitation : 0
                    })
                });

                if (!response.ok) throw new Error();
                const data = await response.json();
                
                chatMessages.value.push({ sender: 'ai', text: data.reply });
            } catch (err) {
                chatMessages.value.push({ sender: 'ai', text: "Sorry, my diagnostic uplink dropped out. Verify your backend server configuration." });
            } finally {
                isChatTyping.value = false;
                setTimeout(() => scrollChatBottom(), 50);
            }
        };

        const scrollChatBottom = () => {
            const box = document.getElementById('chat-scroll-container');
            if (box) box.scrollTop = box.scrollHeight;
        };

        // This reactive variable will hold our auto-generated alerts
        const activeAlerts = computed(() => {
            const list = [];
            const current = weatherData.value?.current;
            
            if (!current) return list;

            const temp = current.temperature_2m;
            const humidity = current.relative_humidity_2m;
            const rain = current.precipitation;

            if (temp <= 5) {
                list.push({
                    id: 'frost',
                    title: 'CRITICAL FROST WARNING',
                    type: 'critical',
                    icon: 'fa-snowflake text-blue-400',
                    message: `Temperatures have dropped to ${temp}°C. Active cell damage risk discovered for young crops. Deploy thermal blankets or heaters immediately.`
                });
            }

            if (temp >= 33) {
                list.push({
                    id: 'heat',
                    title: 'EXTREME HEAT WARNING',
                    type: 'danger',
                    icon: 'fa-temperature-high text-red-400',
                    message: `Extreme heat detected at ${temp}°C. Transpiration rates are dangerously high. Deep soil moisture tracking is heavily recommended.`
                });
            }

            if (rain >= 15) {
                list.push({
                    id: 'flood',
                    title: 'FLASH FLOOD ALERT',
                    type: 'warning',
                    icon: 'fa-cloud-showers-heavy text-cyan-400',
                    message: `Heavy rainfall detected (${rain}mm). Inspect drainage channels immediately to prevent root drowning or topsoil erosion metrics.`
                });
            }

            if (humidity < 45 && rain === 0) {
                list.push({
                    id: 'drought',
                    title: 'ATMOSPHERIC DROUGHT DISCOVERED',
                    type: 'warning',
                    icon: 'fa-droplet-slash text-amber-500',
                    message: `Air moisture content is extremely low (${humidity}%). Soil moisture is evaporating rapidly. Adjust scheduled irrigation loops upward.`
                });
            }

            return list;
        });

        // Network monitoring bindings
        const isOnline = ref(navigator.onLine);
        const lastOnlineCheck = ref(null);
        const connectionType = ref('unknown');
        const networkQuality = ref('good');
        const showOfflineBanner = ref(false);
        
        const updateNetworkState = () => {
            isOnline.value = navigator.onLine;
            lastOnlineCheck.value = new Date().toISOString();
            console.log(`🌐 Network status changed: ${isOnline.value ? 'ONLINE' : 'OFFLINE'}`);
            
            if (!isOnline.value) {
                showOfflineBanner.value = true;
            } else {
                showOfflineBanner.value = false;
            }
        };
        
        const updateConnectionQuality = () => {
            if (navigator.connection) {
                const conn = navigator.connection;
                connectionType.value = conn.effectiveType || 'unknown';
                
                if (conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g') {
                    networkQuality.value = 'poor';
                } else if (conn.effectiveType === '3g') {
                    networkQuality.value = 'fair';
                } else if (conn.effectiveType === '4g') {
                    networkQuality.value = 'good';
                }
            }
        };
        
        const handleOnline = () => {
            updateNetworkState();
            if (weatherData.value === null) {
                fetchOpenMeteoTelemetry();
            }
        };
        
        const handleOffline = () => {
            updateNetworkState();
        };
        
        const initConnectionMonitoring = () => {
            if (navigator.connection) {
                navigator.connection.addEventListener('change', updateConnectionQuality);
            }
        };
        
        const cleanupConnectionMonitoring = () => {
            if (navigator.connection) {
                navigator.connection.removeEventListener('change', updateConnectionQuality);
            }
        };
        
        // Modified onMounted
        onMounted(() => {
            // Network event listeners
            window.addEventListener('online', handleOnline);
            window.addEventListener('offline', handleOffline);
            
            // Initialize network monitoring
            updateNetworkState();
            initConnectionMonitoring();
            updateConnectionQuality();
            
            // Load saved tab preference
            const savedTab = localStorage.getItem('activeTab');
            if (savedTab && ['weather', 'alerts', 'reports'].includes(savedTab)) {
                activeTab.value = savedTab;
            }
            
            // detectLocation function
            detectLiveLocation();
        });
        
        // onUnmounted is defined
        onUnmounted(() => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            cleanupConnectionMonitoring();
        });

        return {
            activeTab, 
            setActiveTab,
            locationMode, 
            liveCoords, 
            manualCoords, 
            selectedLocationIndex, 
            activeCoordinates, 
            activeLatLonString, 
            activeLocationName, 
            activeView, 
            weatherData, 
            loading, 
            error,
            showAuthModal, 
            authMode, 
            isAuthenticated, 
            currentUser, 
            authForm, 
            authMessage, 
            executeAuthSubmit, 
            closeAuthWorkspace, 
            logoutSession, 
            switchEngineView, 
            refreshTelemetry, 
            formatDayName, 
            getForecastIconClass, 
            detectLiveLocation, 
            applyManualCoordinates, 
            generateFarmAIInsight, 
            aiReport, 
            generatingReport, 
            cropSelection, 
            parseMarkdownToHtml,
            isChatOpen, 
            chatMessage, 
            chatMessages, 
            isChatTyping,
            toggleChat, 
            sendChatMessage, 
            setChatPreset, 
            activeAlerts, 
            scrollChatBottom, 
            isOnline, 
            networkQuality, 
            connectionType, 
            showOfflineBanner
        };
    }
}).mount('#app');
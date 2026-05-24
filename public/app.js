/**
 * AGROMETEO AGENT - FRONTEND CORE
 * Version: 1.1.0
 * Description: Vue.js application handling real-time weather telemetry, 
 * Leaflet map visualizations, AI-driven agricultural insights, and authentication.
 */

const { createApp, ref, onMounted, onUnmounted, computed, watch, nextTick } = Vue;

createApp({
    setup() {
        // ==========================================
        // 1. STATE MANAGEMENT & REACTIVE REFS
        // ==========================================
        const activeTab = ref('weather');
        const diseaseReport = ref(null);
        const diseaseCropSelection = ref('Maize');

        const authLoading = ref(false);
        const showPassword = ref(false);
        
        // Map Layers State
        const activeMapLayers = ref({
            rainfall: true,
            temperature: false,
            wind: false,
            vegetation: false,
            heatIndex: false,
            soilMoisture: false
        });
        
        const locationMode = ref('auto');
        const liveCoords = ref({ lat: 9.0765, lon: 7.3986 });
        const manualCoords = ref({ lat: 6.5244, lon: 3.3792 });
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

        // Mobile user menu state
        const showMobileUserMenu = ref(false);

        const toggleMobileUserMenu = () => {
            event.stopPropagation(); // Prevent event bubbling
            showMobileUserMenu.value = !showMobileUserMenu.value;
        };

        // Close menu when clicking outside
        const closeMobileUserMenu = () => {
            showMobileUserMenu.value = false;
        };

        // Add event listener for clicks outside the mobile user menu
        const handleClickOutside = (event) => {
            const userMenu = document.querySelector('.mobile-user-menu');
            if (userMenu && !userMenu.contains(event.target) && showMobileUserMenu.value) {
                showMobileUserMenu.value = false;
            }
        };

        
        // Non-reactive instances for performance
        let chartInstance = null;
        let mapInstance = null;
        let mapMarker = null;
        let activeLayers = {};

        // ==========================================
        // 2. COMPUTED PROPERTIES (LOGIC DERIVATION)
        // ==========================================
        
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
            return "Selected Sector";
        });

        // ==========================================
        // 3. NAVIGATION & UI METHODS
        // ==========================================

        const setActiveTab = (tabName) => {
            activeTab.value = tabName;
            console.log(`🔄 Active tab changed to: ${tabName}`);
            localStorage.setItem('activeTab', tabName);
            
            // Re-initialize map if switching to weather tab
            if (tabName === 'weather' && mapInstance) {
                nextTick(() => {
                    setTimeout(() => {
                        mapInstance.invalidateSize();
                    }, 100);
                });
            }
        };

        // ==========================================
        // 4. GEOSPATIAL ENGINE (LEAFLET & LAYERS)
        // ==========================================

        const toggleLayer = (layerName) => {
            activeMapLayers.value[layerName] = !activeMapLayers.value[layerName];
            updateMapLayers();
        };

        const updateMapLayers = () => {
            if (!mapInstance) return;
            
            const { lat, lon } = activeCoordinates.value;
            const temp = weatherData.value?.current?.temperature_2m || 25;
            const humidity = weatherData.value?.current?.relative_humidity_2m || 60;
            const windSpeed = weatherData.value?.current?.wind_speed_10m || 10;
            const rainfall = weatherData.value?.current?.precipitation || 0;
            
            // Calculate heat index
            const heatIndex = calculateHeatIndex(temp, humidity);
            // Update or create layers based on active toggles
            if (activeMapLayers.value.rainfall && !activeLayers.rainfall) {
                activeLayers.rainfall = createRainfallLayer(lat, lon, rainfall);
                activeLayers.rainfall.addTo(mapInstance);
            } else if (!activeMapLayers.value.rainfall && activeLayers.rainfall) {
                mapInstance.removeLayer(activeLayers.rainfall);
                activeLayers.rainfall = null;
            }
            
            if (activeMapLayers.value.temperature && !activeLayers.temperature) {
                activeLayers.temperature = createTemperatureLayer(lat, lon, temp);
                activeLayers.temperature.addTo(mapInstance);
            } else if (!activeMapLayers.value.temperature && activeLayers.temperature) {
                mapInstance.removeLayer(activeLayers.temperature);
                activeLayers.temperature = null;
            }
            
            if (activeMapLayers.value.wind && !activeLayers.wind) {
                activeLayers.wind = createWindLayer(lat, lon, windSpeed);
                activeLayers.wind.addTo(mapInstance);
            } else if (!activeMapLayers.value.wind && activeLayers.wind) {
                mapInstance.removeLayer(activeLayers.wind);
                activeLayers.wind = null;
            }
            
            if (activeMapLayers.value.vegetation && !activeLayers.vegetation) {
                activeLayers.vegetation = createVegetationLayer(lat, lon);
                activeLayers.vegetation.addTo(mapInstance);
            } else if (!activeMapLayers.value.vegetation && activeLayers.vegetation) {
                mapInstance.removeLayer(activeLayers.vegetation);
                activeLayers.vegetation = null;
            }
            
            if (activeMapLayers.value.heatIndex && !activeLayers.heatIndex) {
                activeLayers.heatIndex = createHeatIndexLayer(lat, lon, heatIndex);
                activeLayers.heatIndex.addTo(mapInstance);
            } else if (!activeMapLayers.value.heatIndex && activeLayers.heatIndex) {
                mapInstance.removeLayer(activeLayers.heatIndex);
                activeLayers.heatIndex = null;
            }
            
            if (activeMapLayers.value.soilMoisture && !activeLayers.soilMoisture) {
                activeLayers.soilMoisture = createSoilMoistureLayer(lat, lon);
                activeLayers.soilMoisture.addTo(mapInstance);
            } else if (!activeMapLayers.value.soilMoisture && activeLayers.soilMoisture) {
                mapInstance.removeLayer(activeLayers.soilMoisture);
                activeLayers.soilMoisture = null;
            }
        };

        const calculateHeatIndex = (temp, humidity) => {
            // Simplified heat index calculation
            return temp + (humidity / 100) * 5;
        };

        const createRainfallLayer = (lat, lon, rainfall) => {
            const rainfallIntensity = rainfall > 20 ? 'Heavy' : rainfall > 5 ? 'Moderate' : 'Light';
            const circle = L.circle([lat, lon], {
                color: '#3b82f6',
                fillColor: '#3b82f6',
                fillOpacity: 0.3 + (rainfall / 100),
                radius: 5000,
                weight: 2,
                className: 'rainfall-layer'
            });
            circle.bindPopup(`
                <div class="font-mono text-xs">
                    <b class="text-blue-400">🌧️ Rainfall Layer</b><br>
                    Intensity: ${rainfallIntensity}<br>
                    Current: ${rainfall}mm<br>
                    Status: ${rainfall > 0 ? 'Active Precipitation' : 'Dry Conditions'}
                </div>
            `);
            
            // Add animated dots for rainfall
            if (rainfall > 0) {
                const animatedLayer = L.layerGroup();
                for (let i = 0; i < 20; i++) {
                    const offsetLat = lat + (Math.random() - 0.5) * 0.1;
                    const offsetLon = lon + (Math.random() - 0.5) * 0.1;
                    const drop = L.circleMarker([offsetLat, offsetLon], {
                        radius: 2,
                        color: '#60a5fa',
                        fillColor: '#60a5fa',
                        fillOpacity: 0.8,
                        weight: 1
                    });
                    animatedLayer.addLayer(drop);
                    
                    // Animate the drop
                    setInterval(() => {
                        const newLat = drop.getLatLng().lat + (Math.random() - 0.5) * 0.01;
                        const newLng = drop.getLatLng().lng + (Math.random() - 0.5) * 0.01;
                        drop.setLatLng([newLat, newLng]);
                    }, 2000);
                }
                circle.addLayer(animatedLayer);
            }
            
            return circle;
        };

        const createTemperatureLayer = (lat, lon, temp) => {
            let color, description;
            if (temp > 35) { color = '#ef4444'; description = 'Extreme Heat'; }
            else if (temp > 30) { color = '#f97316'; description = 'High Temperature'; }
            else if (temp > 20) { color = '#22c55e'; description = 'Moderate'; }
            else if (temp > 10) { color = '#3b82f6'; description = 'Cool'; }
            else { color = '#8b5cf6'; description = 'Cold'; }
            
            const circle = L.circle([lat, lon], {
                color: color,
                fillColor: color,
                fillOpacity: 0.4,
                radius: 8000,
                weight: 3,
                className: 'temperature-layer'
            });
            circle.bindPopup(`
                <div class="font-mono text-xs">
                    <b class="text-orange-400">🌡️ Temperature Layer</b><br>
                    Current: ${temp}°C<br>
                    Condition: ${description}<br>
                    ${temp > 30 ? '⚠️ Heat stress risk for crops' : 'Optimal conditions'}
                </div>
            `);
            
            // Add heat wave animation
            if (temp > 30) {
                let opacity = 0.4;
                setInterval(() => {
                    opacity = opacity === 0.4 ? 0.6 : 0.4;
                    circle.setStyle({ fillOpacity: opacity });
                }, 1000);
            }
            
            return circle;
        };

        const createWindLayer = (lat, lon, windSpeed) => {
            let color, risk;
            if (windSpeed > 40) { color = '#ef4444'; risk = 'Severe'; }
            else if (windSpeed > 25) { color = '#f97316'; risk = 'High'; }
            else if (windSpeed > 15) { color = '#eab308'; risk = 'Moderate'; }
            else { color = '#22c55e'; risk = 'Low'; }
            
            const circle = L.circle([lat, lon], {
                color: color,
                fillColor: color,
                fillOpacity: 0.3,
                radius: 6000,
                weight: 2,
                className: 'wind-layer'
            });
            circle.bindPopup(`
                <div class="font-mono text-xs">
                    <b class="text-yellow-400">💨 Wind Layer</b><br>
                    Speed: ${windSpeed} km/h<br>
                    Risk Level: ${risk}<br>
                    ${windSpeed > 25 ? '⚠️ Strong winds may damage crops' : 'Normal conditions'}
                </div>
            `);
            
            // Add wind direction indicators
            const windGroup = L.layerGroup();
            for (let i = 0; i < 8; i++) {
                const angle = (i * 45) * Math.PI / 180;
                const radius = 3000;
                const x = lat + (Math.cos(angle) * radius / 111000);
                const y = lon + (Math.sin(angle) * radius / (111000 * Math.cos(lat * Math.PI / 180)));
                const arrow = L.polygon([
                    [x, y],
                    [x + (Math.cos(angle) * 500 / 111000), y + (Math.sin(angle) * 500 / (111000 * Math.cos(lat * Math.PI / 180)))],
                    [x + (Math.cos(angle + 2.5) * 300 / 111000), y + (Math.sin(angle + 2.5) * 300 / (111000 * Math.cos(lat * Math.PI / 180)))]
                ], { color: '#eab308', weight: 2 });
                windGroup.addLayer(arrow);
            }
            circle.addLayer(windGroup);
            
            return circle;
        };

        const createVegetationLayer = (lat, lon) => {
            const ndvi = Math.random() * 0.6 + 0.2; // Simulated NDVI value
            let color, health;
            if (ndvi > 0.6) { color = '#22c55e'; health = 'Excellent'; }
            else if (ndvi > 0.4) { color = '#84cc16'; health = 'Good'; }
            else if (ndvi > 0.2) { color = '#eab308'; health = 'Fair'; }
            else { color = '#ef4444'; health = 'Poor'; }
            
            const circle = L.circle([lat, lon], {
                color: color,
                fillColor: color,
                fillOpacity: 0.5,
                radius: 10000,
                weight: 2,
                className: 'vegetation-layer'
            });
            circle.bindPopup(`
                <div class="font-mono text-xs">
                    <b class="text-green-400">🌿 Vegetation Health</b><br>
                    NDVI: ${ndvi.toFixed(2)}<br>
                    Status: ${health}<br>
                    ${ndvi < 0.3 ? '⚠️ Vegetation stress detected' : 'Healthy vegetation'}
                </div>
            `);
            
            return circle;
        };

        const createHeatIndexLayer = (lat, lon, heatIndex) => {
            let color, risk;
            if (heatIndex > 40) { color = '#dc2626'; risk = 'Danger'; }
            else if (heatIndex > 32) { color = '#f97316'; risk = 'Extreme Caution'; }
            else if (heatIndex > 27) { color = '#eab308'; risk = 'Caution'; }
            else { color = '#22c55e'; risk = 'Normal'; }
            
            const circle = L.circle([lat, lon], {
                color: color,
                fillColor: color,
                fillOpacity: 0.35,
                radius: 7000,
                weight: 3,
                className: 'heatindex-layer'
            });
            circle.bindPopup(`
                <div class="font-mono text-xs">
                    <b class="text-red-400">🔥 Heat Index</b><br>
                    Index: ${heatIndex.toFixed(1)}°C<br>
                    Risk: ${risk}<br>
                    ${heatIndex > 32 ? '⚠️ High heat stress on crops' : 'Acceptable range'}
                </div>
            `);
            
            return circle;
        };

        const createSoilMoistureLayer = (lat, lon) => {
            const moisture = Math.random() * 100; // Simulated soil moisture
            let color, status;
            if (moisture > 70) { color = '#2563eb'; status = 'Saturated'; }
            else if (moisture > 50) { color = '#3b82f6'; status = 'Adequate'; }
            else if (moisture > 30) { color = '#eab308'; status = 'Moderate'; }
            else { color = '#ef4444'; status = 'Dry'; }
            
            const circle = L.circle([lat, lon], {
                color: color,
                fillColor: color,
                fillOpacity: 0.4,
                radius: 9000,
                weight: 2,
                className: 'soilmoisture-layer'
            });
            circle.bindPopup(`
                <div class="font-mono text-xs">
                    <b class="text-blue-400">💧 Soil Moisture</b><br>
                    Moisture: ${moisture.toFixed(1)}%<br>
                    Status: ${status}<br>
                    ${moisture < 30 ? '⚠️ Irrigation needed urgently' : moisture > 70 ? '⚠️ Risk of waterlogging' : 'Optimal moisture'}
                </div>
            `);
            
            return circle;
        };

        // ==========================================
        // 5. TELEMETRY & DATA ACQUISITION
        // ==========================================

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
                    fetchOpenMeteoTelemetry();
                },
                { enableHighAccuracy: true, timeout: 8000 }
            );
        };

        const applyManualCoordinates = () => {
            fetchOpenMeteoTelemetry();
        };

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
                
                // Wait for next tick to ensure DOM is ready
                await nextTick();
                
                // Only initialize map if weather tab is active or will be visible
                if (activeTab.value === 'weather') {
                    setTimeout(() => {
                        initializeLeafletMap();
                    }, 100);
                }
                
                setTimeout(() => { renderEngineAnalyticsPlot(); }, 50);
            } catch (err) {
                error.value = err.message;
            } finally {
                loading.value = false;
            }
        };

        const initializeLeafletMap = () => {
            // Wait for DOM to be fully ready
            nextTick(() => {
                const mapContainer = document.getElementById('map-pane');
                
                if (!mapContainer) {
                    console.warn("Map container not found, retrying in 500ms...");
                    setTimeout(() => initializeLeafletMap(), 500);
                    return;
                }
                
                // Check if container is visible (not hidden by tab)
                const isVisible = mapContainer.offsetParent !== null;
                if (!isVisible) {
                    console.log("Map container is not visible yet (likely in inactive tab)");
                    // Don't initialize now, wait for tab switch
                    return;
                }
                
                const { lat, lon } = activeCoordinates.value;
                
                // Destroy existing map if it exists
                if (mapInstance) {
                    mapInstance.remove();
                    mapInstance = null;
                }
                
                try {
                    // Initialize new map
                    mapInstance = L.map('map-pane', {
                        center: [lat, lon],
                        zoom: 8,
                        zoomControl: true,
                        fadeAnimation: true,
                        zoomAnimation: true
                    });
                    
                    // Add base tile layer with better styling
                    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; CartoDB',
                        subdomains: 'abcd',
                        maxZoom: 19,
                        minZoom: 3
                    }).addTo(mapInstance);
                    
                    // Add custom marker for current location
                    const customIcon = L.divIcon({
                        className: 'custom-marker',
                        html: '<div class="w-4 h-4 bg-emerald-500 rounded-full border-2 border-white shadow-lg animate-pulse"></div>',
                        iconSize: [16, 16],
                        iconAnchor: [8, 8]
                    });
                    
                    mapMarker = L.marker([lat, lon], { icon: customIcon }).addTo(mapInstance);
                    
                    // Update popup content
                    const temp = weatherData.value?.current?.temperature_2m || '--';
                    const rain = weatherData.value?.current?.precipitation || '0';
                    const humidity = weatherData.value?.current?.relative_humidity_2m || '--';
                    const wind = weatherData.value?.current?.wind_speed_10m || '--';
                    
                    mapMarker.bindPopup(`
                        <div class="font-mono text-xs bg-gray-900/90 p-2 rounded-lg border border-emerald-500/30">
                            <b class="text-emerald-500 block mb-1">📍 Current Location</b>
                            <div class="space-y-1 text-gray-300">
                                <div>🌡️ Temp: ${temp}°C</div>
                                <div>💧 Humidity: ${humidity}%</div>
                                <div>🌧️ Rain: ${rain}mm</div>
                                <div>💨 Wind: ${wind} km/h</div>
                            </div>
                        </div>
                    `).openPopup();
                    
                    // Handle map resize
                    mapInstance.on('load', () => {
                        setTimeout(() => {
                            if (mapInstance) mapInstance.invalidateSize();
                        }, 100);
                    });
                    
                    // Also invalidate size when the tab becomes visible
                    const observer = new ResizeObserver(() => {
                        if (mapInstance && mapContainer.offsetParent !== null) {
                            mapInstance.invalidateSize();
                        }
                    });
                    observer.observe(mapContainer);
                    
                    console.log("Leaflet map initialized successfully");
                    
                    // Update layers if any are active
                    updateMapLayers();
                    
                } catch (error) {
                    console.error("Error initializing map:", error);
                }
            });
        };

        const updateLeafletMap = () => {
            if (!mapInstance) {
                // Try to initialize if map doesn't exist
                initializeLeafletMap();
                return;
            }
            
            const { lat, lon } = activeCoordinates.value;
            mapInstance.setView([lat, lon], 10);
            
            if (mapMarker) {
                mapMarker.setLatLng([lat, lon]);
                const temp = weatherData.value?.current?.temperature_2m || '--';
                const rain = weatherData.value?.current?.precipitation || '0';
                const humidity = weatherData.value?.current?.relative_humidity_2m || '--';
                const wind = weatherData.value?.current?.wind_speed_10m || '--';
                
                mapMarker.bindPopup(`
                    <div class="font-mono text-xs bg-gray-900/90 p-2 rounded-lg border border-emerald-500/30">
                        <b class="text-emerald-500 block mb-1">📍 Current Location</b>
                        <div class="space-y-1 text-gray-300">
                            <div>🌡️ Temp: ${temp}°C</div>
                            <div>💧 Humidity: ${humidity}%</div>
                            <div>🌧️ Rain: ${rain}mm</div>
                            <div>💨 Wind: ${wind} km/h</div>
                        </div>
                    </div>
                `);
            }
            
            // Invalidate map size to ensure proper rendering
            setTimeout(() => {
                if (mapInstance) mapInstance.invalidateSize();
            }, 100);
            
            updateMapLayers();
        };

        // ==========================================
        // 6. AGRICULTURAL DIAGNOSTICS (DISEASES)
        // ==========================================

        const generateDiseaseReport = async () => {
            generatingReport.value = true;
            diseaseReport.value = null;
            
            try {
                const currentData = weatherData.value?.current;
                const temp = currentData ? currentData.temperature_2m : 25;
                const humidity = currentData ? currentData.relative_humidity_2m : 60;
                const rainfall = currentData ? currentData.precipitation : 0;
                
                // Disease patterns database (simplified)
                const diseasePatterns = {
                    Maize: {
                        diseases: [
                            { name: "Maize Rust", tempRange: [18, 28], humidityRange: [75, 95], severity: "HIGH" },
                            { name: "Gray Leaf Spot", tempRange: [22, 30], humidityRange: [80, 100], severity: "HIGH" }
                        ],
                        pests: [{ name: "Fall Armyworm", tempRange: [20, 35], humidityRange: [40, 80], severity: "HIGH" }]
                    },
                    Rice: {
                        diseases: [{ name: "Rice Blast", tempRange: [22, 28], humidityRange: [85, 100], severity: "CRITICAL" }],
                        pests: [{ name: "Rice Stem Borer", tempRange: [25, 35], humidityRange: [60, 85], severity: "HIGH" }]
                    },
                    Tomato: {
                        diseases: [{ name: "Late Blight", tempRange: [10, 22], humidityRange: [85, 100], severity: "CRITICAL" }],
                        pests: [{ name: "Tomato Leaf Miner", tempRange: [20, 35], humidityRange: [40, 80], severity: "MEDIUM" }]
                    }
                };
                
                const cropData = diseasePatterns[diseaseCropSelection.value] || diseasePatterns.Maize;
                
                let detectedDiseases = [];
                let detectedPests = [];
                
                cropData.diseases.forEach(disease => {
                    if (temp >= disease.tempRange[0] && temp <= disease.tempRange[1] &&
                        humidity >= disease.humidityRange[0] && humidity <= disease.humidityRange[1]) {
                        detectedDiseases.push(disease);
                    }
                });
                
                cropData.pests.forEach(pest => {
                    if (temp >= pest.tempRange[0] && temp <= pest.tempRange[1] &&
                        humidity >= pest.humidityRange[0] && humidity <= pest.humidityRange[1]) {
                        detectedPests.push(pest);
                    }
                });
                
                let overallHealth = "GOOD";
                let diseasePresence = "LOW";
                let infectionSpread = "LOW";
                let pestInfestation = "LOW";
                
                if (detectedDiseases.length > 0 || detectedPests.length > 0) {
                    const hasCritical = detectedDiseases.some(d => d.severity === "CRITICAL");
                    if (hasCritical) {
                        overallHealth = "CRITICAL";
                        diseasePresence = "CRITICAL";
                        infectionSpread = "CRITICAL";
                    } else {
                        overallHealth = "POOR";
                        diseasePresence = "HIGH";
                        infectionSpread = "HIGH";
                    }
                    if (detectedPests.length > 0) pestInfestation = "HIGH";
                }
                
                const diseaseNames = detectedDiseases.map(d => d.name).join(", ");
                const pestNames = detectedPests.map(p => p.name).join(", ");
                
                diseaseReport.value = {
                    statusTitle: detectedDiseases.length > 0 ? "⚠️ DISEASE THREAT DETECTED" : "CROP HEALTH OPTIMAL",
                    statusDescription: detectedDiseases.length > 0 ? 
                        `Detected ${diseaseNames} threatening your ${diseaseCropSelection.value} crop.` :
                        `Current conditions for ${diseaseCropSelection.value} are favorable with minimal disease pressure.`,
                    overallHealth: overallHealth,
                    metrics: {
                        diseasePresence: diseasePresence,
                        infectionSpread: infectionSpread,
                        pestInfestation: pestInfestation,
                        pestInfestationDescription: pestNames || "No significant pest activity"
                    }
                };
                
            } catch (err) {
                console.error("Disease detection error:", err);
                diseaseReport.value = {
                    statusTitle: "Diagnostic System Error",
                    statusDescription: "Unable to complete disease analysis.",
                    overallHealth: "UNKNOWN",
                    metrics: {
                        diseasePresence: "UNKNOWN",
                        infectionSpread: "UNKNOWN",
                        pestInfestation: "UNKNOWN",
                        pestInfestationDescription: "System error during analysis"
                    }
                };
            } finally {
                generatingReport.value = false;
            }
        };

        // ==========================================
        // 7. AUTHENTICATION SYSTEM (JWT & MYSQL)
        // ==========================================

        const executeAuthSubmit = async () => {
            authLoading.value = true;
            authMessage.value = { text: '', isError: false };
            
            try {
                if (authMode.value === 'login') {
                    // LOGIN - Call your backend MySQL endpoint
                    const response = await fetch('/api/auth/login', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            email: authForm.value.email,
                            password: authForm.value.password
                        })
                    });
                    
                    const data = await response.json();
                    
                    if (response.ok) {
                        // Successful login
                        isAuthenticated.value = true;
                        currentUser.value = {
                            name: data.user.username,
                            email: data.user.email,
                            id: data.user.id
                        };
                        
                        // Store JWT token in localStorage for persistence
                        localStorage.setItem('authToken', data.token);
                        localStorage.setItem('currentUser', JSON.stringify(currentUser.value));
                        
                        authMessage.value = {
                            text: '✅ Authentication successful! Telemetry permissions unlocked.',
                            isError: false
                        };
                        
                        setTimeout(() => {
                            closeAuthWorkspace();
                        }, 1500);
                    } else {
                        // Login failed
                        authMessage.value = {
                            text: data.error || '❌ Authentication failed. Invalid credentials.',
                            isError: true
                        };
                    }
                } else {
                    // REGISTER - Call your backend MySQL endpoint
                    const response = await fetch('/api/auth/register', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            username: authForm.value.name,
                            email: authForm.value.email,
                            password: authForm.value.password
                        })
                    });
                    
                    const data = await response.json();
                    
                    if (response.ok) {
                        // Successful registration
                        authMessage.value = {
                            text: '✅ Account created successfully! Please login.',
                            isError: false
                        };
                        
                        // Switch to login mode after successful registration
                        setTimeout(() => {
                            authMode.value = 'login';
                            authForm.value.password = ''; // Clear password field
                            authMessage.value = { text: '', isError: false };
                        }, 1500);
                    } else {
                        // Registration failed
                        authMessage.value = {
                            text: data.error || '❌ Registration failed. Please try again.',
                            isError: true
                        };
                    }
                }
            } catch (error) {
                console.error('Authentication error:', error);
                authMessage.value = {
                    text: '⚠️ Network error. Please check your connection and try again.',
                    isError: true
                };
            } finally {
                authLoading.value = false;
            }
        };

        const closeAuthWorkspace = () => {
            showAuthModal.value = false;
            authForm.value = { name: '', email: '', password: '' };
            authMessage.value = { text: '', isError: false };
        };

        const logoutSession = () => {
            // Clear localStorage
            localStorage.removeItem('authToken');
            localStorage.removeItem('currentUser');
            
            // Clear Vue state
            isAuthenticated.value = false;
            currentUser.value = null;
            
            // Optional: Show a logout message
            authMessage.value = {
                text: '🔓 Session terminated. See you next time!',
                isError: false
            };
            
            setTimeout(() => {
                authMessage.value = { text: '', isError: false };
            }, 2000);
        };

        // Add this function to check authentication on app load
        const checkAuthStatus = () => {
            const token = localStorage.getItem('authToken');
            const savedUser = localStorage.getItem('currentUser');
            
            if (token && savedUser) {
                isAuthenticated.value = true;
                currentUser.value = JSON.parse(savedUser);
            }
        };

        // ==========================================
        // 8. ANALYTICS ENGINE (CHARTS)
        // ==========================================

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

        // ==========================================
        // 9. AI AGENT & CHAT SUBSYSTEM
        // ==========================================

        const aiReport = ref(null);
        const generatingReport = ref(false);
        const cropSelection = ref('Maize');

        const parseMarkdownToHtml = (text) => {
            if (!text) return '';
            return text
                .replace(/\*\*(.*?)\*\*/g, '<strong class="text-amber-400 font-bold">$1</strong>')
                .replace(/^\s*[\*\-]\s+(.*?)$/gm, '<div class="flex items-start gap-2 my-2 text-gray-200"><i class="fa-solid fa-angle-right text-[10px] text-emerald-400 mt-1.5 shrink-0"></i><span>$1</span></div>')
                .replace(/^###\s+(.*?)$/gm, '<h4 class="text-sm font-bold uppercase tracking-wider text-white mt-5 mb-2 font-mono border-b border-gray-800 pb-1 flex items-center gap-2">$1</h4>')
                .replace(/\n/g, '<br>');
        };

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
                
                const data = await response.json();
                aiReport.value = data;

            } catch (err) {
                console.error("AI Communication Error:", err);
                aiReport.value = {
                    statusTitle: "Subsystem Error",
                    currentSituation: "Unable to parse intelligence matrix.",
                    overallRisk: "HIGH",
                    dos: [], donts: [], metrics: { suitability: "POOR", irrigation: "UNKNOWN", pestThreat: "UNKNOWN", threatReason: "" }, futureTip: ""
                };
            } finally {
                generatingReport.value = false;
            }
        };

        const isChatOpen = ref(false);
        const chatMessage = ref('');
        const isChatTyping = ref(false);
        const chatMessages = ref([
            { sender: 'ai', text: "Hello farmer! 👋 I'm your on-field companion. Ask me anything!" }
        ]);

        const toggleChat = () => { isChatOpen.value = !isChatOpen.value; };
        const setChatPreset = (text) => { chatMessage.value = text; };

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
                chatMessages.value.push({ sender: 'ai', text: "Sorry, connection dropped out." });
            } finally {
                isChatTyping.value = false;
                setTimeout(() => scrollChatBottom(), 50);
            }
        };

        const scrollChatBottom = () => {
            const box = document.getElementById('chat-scroll-container');
            if (box) box.scrollTop = box.scrollHeight;
        };

        // ==========================================
        // 10. ALERTING & NETWORK MONITORING
        // ==========================================

        const activeAlerts = computed(() => {
            const list = [];
            const current = weatherData.value?.current;
            if (!current) return list;

            const temp = current.temperature_2m;
            const humidity = current.relative_humidity_2m;
            const rain = current.precipitation;

            if (temp <= 5) {
                list.push({ id: 'frost', title: 'CRITICAL FROST WARNING', type: 'critical', icon: 'fa-snowflake text-blue-400', message: `Temperatures dropped to ${temp}°C.` });
            }
            if (temp >= 33) {
                list.push({ id: 'heat', title: 'EXTREME HEAT WARNING', type: 'danger', icon: 'fa-temperature-high text-red-400', message: `Extreme heat at ${temp}°C.` });
            }
            if (rain >= 15) {
                list.push({ id: 'flood', title: 'FLASH FLOOD ALERT', type: 'warning', icon: 'fa-cloud-showers-heavy text-cyan-400', message: `Heavy rainfall (${rain}mm).` });
            }
            if (humidity < 45 && rain === 0) {
                list.push({ id: 'drought', title: 'ATMOSPHERIC DROUGHT', type: 'warning', icon: 'fa-droplet-slash text-amber-500', message: `Low humidity (${humidity}%).` });
            }
            return list;
        });

        const isOnline = ref(navigator.onLine);
        const connectionType = ref('unknown');
        const networkQuality = ref('good');
        const showOfflineBanner = ref(false);
        
        const updateNetworkState = () => {
            isOnline.value = navigator.onLine;
            showOfflineBanner.value = !isOnline.value;
        };
        
        const updateConnectionQuality = () => {
            if (navigator.connection) {
                const conn = navigator.connection;
                connectionType.value = conn.effectiveType || 'unknown';
                if (conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g') networkQuality.value = 'poor';
                else if (conn.effectiveType === '3g') networkQuality.value = 'fair';
                else if (conn.effectiveType === '4g') networkQuality.value = 'good';
            }
        };
        
        const handleOnline = () => {
            updateNetworkState();
            if (weatherData.value === null) fetchOpenMeteoTelemetry();
        };
        
        const handleOffline = () => updateNetworkState();
        
        const initConnectionMonitoring = () => {
            if (navigator.connection) navigator.connection.addEventListener('change', updateConnectionQuality);
        };
        
        const cleanupConnectionMonitoring = () => {
            if (navigator.connection) navigator.connection.removeEventListener('change', updateConnectionQuality);
        };
        
        // Watch for coordinate changes to update map
        watch(() => activeCoordinates.value, () => {
            if (mapInstance) {
                updateLeafletMap();
            }
        }, { deep: true });
        
        // ==========================================
        // 11. LIFECYCLE HOOKS
        // ==========================================

        onMounted(async () => {
            window.addEventListener('online', handleOnline);
            window.addEventListener('offline', handleOffline);
            // Close mobile user menu when clicking outside (for better UX on small screens)
            document.addEventListener('click', closeMobileUserMenu);

            updateNetworkState();
            initConnectionMonitoring();
            updateConnectionQuality();
            
            checkAuthStatus();
            
            const savedTab = localStorage.getItem('activeTab');
            if (savedTab && ['weather', 'alerts', 'reports', 'diseases'].includes(savedTab)) {
                activeTab.value = savedTab;
            }
            
            detectLiveLocation();
            
            if (activeTab.value === 'weather') {
                setTimeout(() => {
                    if (weatherData.value) {
                        initializeLeafletMap();
                    }
                }, 500);
            }
        });
        
        onUnmounted(() => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);

            // Clean up mobile menu listener
            document.removeEventListener('click', closeMobileUserMenu);

            cleanupConnectionMonitoring();
            if (mapInstance) {
                mapInstance.remove();
                mapInstance = null;
            }
        });

        // ==========================================
        // 12. EXPOSED INTERFACE
        // ==========================================
        return {
            activeTab, setActiveTab, locationMode, liveCoords, manualCoords, selectedLocationIndex, showMobileUserMenu, toggleMobileUserMenu,
            activeCoordinates, activeLatLonString, activeLocationName, activeView, weatherData, 
            loading, error, showAuthModal, authMode, isAuthenticated, currentUser, authForm, 
            authMessage, authLoading, executeAuthSubmit, closeAuthWorkspace, logoutSession, switchEngineView, 
            refreshTelemetry, formatDayName, getForecastIconClass, detectLiveLocation, 
            applyManualCoordinates, generateFarmAIInsight, aiReport, generatingReport, cropSelection,
            parseMarkdownToHtml, isChatOpen, chatMessage, chatMessages, isChatTyping, toggleChat, 
            sendChatMessage, setChatPreset, activeAlerts, scrollChatBottom, isOnline, networkQuality, 
            connectionType, showOfflineBanner,
            diseaseReport, diseaseCropSelection, generateDiseaseReport,
            activeMapLayers, toggleLayer, showPassword
        };
    }
}).mount('#app');
const CONFIG = {
    weatherConditions: {
        Clear: {
            day: "videos/clear-day.mp4",
            night: "videos/clear-night.mp4",
            icon: "01"
        },
        Clouds: {
            day: "videos/cloudy-day.mp4",
            night: "videos/cloudy-night.mp4",
            icon: "02"
        },
        Rain: {
            day: "videos/rain-day.mp4",
            night: "videos/rain-night.mp4",
            icon: "10"
        },
        Thunderstorm: {
            day: "videos/storm-day.mp4",
            night: "videos/storm-night.mp4",
            icon: "11"
        },
        Snow: {
            day: "videos/snow-day.mp4",
            night: "videos/snow-night.mp4",
            icon: "13"
        },
        Mist: {
            day: "videos/fog-day.mp4",
            night: "videos/fog-night.mp4",
            icon: "50"
        }
    },
    apiConfig: {
        baseUrl: "https://api.openweathermap.org/data/2.5",
        iconUrl: "https://openweathermap.org/img/wn/",
        apiKey: "ac30b80ccc177687aaf5b9c4e5fa6b32"
    }
};

const elements = {

    citySearch: document.getElementById('city-search'),
    searchBtn: document.getElementById('search-btn'),
    geoBtn: document.getElementById('use-location'),
    cityName: document.getElementById('city-name'),
    dateTime: document.getElementById('date-time'),
    weatherIcon: document.getElementById('weather-icon-img'),
    temperature: document.getElementById('temperature'),
    feelsLike: document.getElementById('feels-like'),
    weatherCondition: document.getElementById('weather-condition'),
    humidity: document.getElementById('humidity'),
    windSpeed: document.getElementById('wind-speed'),
    pressure: document.getElementById('pressure'),
    sunriseSunset: document.getElementById('sunrise-sunset'),
    forecastCards: document.getElementById('forecast-cards'),
    cityTabs: document.getElementById('city-tabs'),
    loadingIndicator: document.getElementById('loading-indicator'),
    weatherContent: document.getElementById('weather-content'),
    errorMessage: document.getElementById('error-message'),
    errorText: document.getElementById('error-text')
};

class WeatherApp {
    constructor() {
        this.cities = [];
        this.currentCity = null;
        this.unit = 'metric';
        this.init();
    }

    init() {

        this.setupEventListeners();
        document.getElementById('unit-toggle').addEventListener('click', () => this.toggleUnits());
        this.addCity({ name: "Mumbai", lat: 19.0144, lon: 72.8479 });
        this.preloadVideos();
    }
    preloadVideos() {
        const videos = [
            "clear-day", "clear-night", "cloudy-day", "cloudy-night",
            "rain-day", "rain-night", "storm-day", "storm-night",
            "snow-day", "snow-night", "fog-day", "fog-night"
        ];

        videos.forEach(name => {
            fetch(`videos/${name}.mp4`)
                .then(res => {
                    if (!res.ok) throw new Error(`${name} not found`);
                    return res.blob(); // Forces cache
                })
                .then(() => console.log(`${name} preloaded`))
                .catch(err => console.error(err.message));
        });
    }
    setupEventListeners() {
        elements.searchBtn.addEventListener('click', () => this.handleCitySearch());
        elements.geoBtn.addEventListener('click', () => this.getUserLocation());
        elements.citySearch.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleCitySearch();
        });
    }

    async handleCitySearch() {
        const cityName = elements.citySearch.value.trim();
        if (!cityName) return;

        this.showLoading();
        try {
            const res = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(cityName)}&limit=1&appid=${CONFIG.apiConfig.apiKey}`);
            const data = await res.json();

            if (!data.length) {
                this.showError(`City "${cityName}" not found.`);
                return;
            }

            const { name, lat, lon } = data[0];
            this.addCity({ name, lat, lon });
            elements.citySearch.value = '';
        } catch (err) {
            this.showError('Error fetching city data.');
        }
    }

    getUserLocation() {
        this.showLoading();
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(async (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                try {
                    const res = await fetch(`https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${CONFIG.apiConfig.apiKey}`);
                    const data = await res.json();
                    const name = data[0]?.name || 'Your Location';
                    this.addCity({ name, lat, lon });
                } catch (err) {
                    this.showError('Unable to determine city name from coordinates.');
                }
            }, () => {
                this.showError('Geolocation permission denied.');
            });
        } else {
            this.showError('Geolocation not supported.');
        }
    }

    addCity(city) {
        const existing = this.cities.find(c => c.name === city.name);
        if (!existing) this.cities.push(city);
        this.updateCityTabs();
        this.loadWeatherData(city);
    }

    async loadWeatherData(city) {
        this.currentCity = city;
        this.showLoading();
        try {
            const weatherRes = await fetch(`${CONFIG.apiConfig.baseUrl}/weather?lat=${city.lat}&lon=${city.lon}&appid=${CONFIG.apiConfig.apiKey}&units=${this.unit}`);
            const forecastRes = await fetch(`${CONFIG.apiConfig.baseUrl}/forecast?lat=${city.lat}&lon=${city.lon}&appid=${CONFIG.apiConfig.apiKey}&units=${this.unit}`);

            const weatherData = await weatherRes.json();
            const forecastData = await forecastRes.json();

            this.updateWeatherUI(weatherData, forecastData);
            this.updateCityTabs();
            this.showWeatherContent();
        } catch (error) {
            console.error("City search failed:", err);
            this.showError('Error fetching weather data.');
        }
    }

    updateWeatherUI(weatherData, forecastData) {
        elements.cityName.textContent = `${weatherData.name}, ${weatherData.sys.country}`;
        elements.dateTime.textContent = this.formatDateTime(new Date());
        elements.weatherIcon.src = `${CONFIG.apiConfig.iconUrl}${weatherData.weather[0].icon}@2x.png`;
        const tempUnit = this.unit === 'metric' ? '°C' : '°F';
        const windUnit = this.unit === 'metric' ? 'm/s' : 'mph';
        elements.temperature.textContent = `${Math.round(weatherData.main.temp)}${tempUnit}`;
        elements.feelsLike.textContent = `Feels like: ${Math.round(weatherData.main.feels_like)}${tempUnit}`;
        elements.weatherCondition.textContent = weatherData.weather[0].description;
        elements.humidity.textContent = `Humidity: ${weatherData.main.humidity}%`;
        elements.windSpeed.textContent = `Wind: ${weatherData.wind.speed} ${windUnit}`;
        elements.pressure.textContent = `Pressure: ${weatherData.main.pressure} hPa`;

        const sunrise = new Date(weatherData.sys.sunrise * 1000);
        const sunset = new Date(weatherData.sys.sunset * 1000);
        elements.sunriseSunset.textContent = `Sunrise: ${this.formatTime(sunrise)} | Sunset: ${this.formatTime(sunset)}`;

        this.updateForecast(forecastData);
        this.updateBackgroundVideo(weatherData);
    }

    updateForecast(forecastData) {
        elements.forecastCards.innerHTML = '';
        const daily = forecastData.list.filter((_, i) => i % 8 === 0).slice(0, 5);

        daily.forEach(item => {
            const date = new Date(item.dt * 1000);
            const temp = Math.round(item.main.temp);
            const icon = item.weather[0].icon;

            const tempUnit = this.unit === 'metric' ? '°C' : '°F';
            const card = document.createElement('div');
            card.className = 'forecast-card';
            card.innerHTML = `
                <div class="forecast-day">${date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                <img class="forecast-icon" src="${CONFIG.apiConfig.iconUrl}${icon}.png" alt="${item.weather[0].description}">
                <div class="forecast-temp">${temp}${tempUnit}</div>
            `;
            elements.forecastCards.appendChild(card);
        });
    }

    getNormalizedCondition(main) {
        switch (main) {
            case 'Clear':
                return 'Clear';
            case 'Clouds':
                return 'Cloudy';
            case 'Rain':
            case 'Drizzle':
                return 'Rain';
            case 'Thunderstorm':
                return 'Storm';
            case 'Snow':
                return 'Snow';
            case 'Mist':
            case 'Fog':
            case 'Smoke':
            case 'Haze':
            case 'Dust':
            case 'Sand':
            case 'Ash':
            case 'Squall':
            case 'Tornado':
                return 'Mist';
            default:
                return 'Clear'; // fallback
        }
    }




    updateBackgroundVideo(weatherData) {
        this.currentVideoPath = null;
        const now = new Date();
        const isDay = now > new Date(weatherData.sys.sunrise * 1000) && now < new Date(weatherData.sys.sunset * 1000);
        const time = isDay ? 'day' : 'night';

        const main = this.getNormalizedCondition(weatherData.weather[0].main);
        const videoUrl = `videos/${main.toLowerCase()}-${time}.mp4`;

        if (this.currentVideoPath === videoUrl) return;

        const videoElement = document.getElementById('bg-video');
        const sourceElement = document.getElementById('bg-video-source');

        // Fade out first
        videoElement.style.opacity = 0;

        setTimeout(() => {
            sourceElement.src = videoUrl;
            videoElement.load();

            videoElement.oncanplay = () => {
                videoElement.play().then(() => {
                    videoElement.style.opacity = 1;
                    this.currentVideoPath = videoUrl;
                }).catch(console.error);
            };
        }, 500); // allow fade out before switching
    }






    updateCityTabs() {
        elements.cityTabs.innerHTML = '';
        this.cities.forEach(city => {
            const tab = document.createElement('div');
            tab.className = 'city-tab' + ((this.currentCity && this.currentCity.name === city.name) ? ' active' : '');
            tab.innerHTML = `<span>${city.name}</span><button class="city-tab-close">×</button>`;
            tab.querySelector('span').addEventListener('click', () => this.loadWeatherData(city));
            tab.querySelector('button').addEventListener('click', () => this.removeCity(city));
            elements.cityTabs.appendChild(tab);
        });
    }

    removeCity(city) {
        this.cities = this.cities.filter(c => c.name !== city.name);
        this.updateCityTabs();
        if (this.currentCity.name === city.name) {
            if (this.cities.length) this.loadWeatherData(this.cities[0]);
            else this.getUserLocation();
        }
    }

    showLoading() {
        elements.loadingIndicator.classList.remove('hidden');
        elements.weatherContent.classList.add('hidden');
        elements.errorMessage.classList.add('hidden');
    }

    showWeatherContent() {
        elements.loadingIndicator.classList.add('hidden');
        elements.weatherContent.classList.remove('hidden');
        elements.errorMessage.classList.add('hidden');
    }

    showError(message) {
        elements.loadingIndicator.classList.add('hidden');
        elements.weatherContent.classList.add('hidden');
        elements.errorMessage.classList.remove('hidden');
        elements.errorText.textContent = message;
    }

    formatDateTime(date) {
        return date.toLocaleString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    }


    toggleUnits() {
        this.unit = this.unit === 'metric' ? 'imperial' : 'metric';
        document.getElementById('unit-toggle').textContent = `Switch to ${this.unit === 'metric' ? '°F' : '°C'}`;
        if (this.currentCity) this.loadWeatherData(this.currentCity);
    }

    formatTime(date) {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit', minute: '2-digit'
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new WeatherApp();
});

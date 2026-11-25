import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sun, 
  CloudSun, 
  CloudRain, 
  CloudSnow, 
  CloudLightning, 
  CloudFog, 
  Wind, 
  Droplets, 
  MapPin, 
  Cloud 
} from 'lucide-react';

interface WeatherData {
  temp: number;
  weatherCode: number;
  humidity: number;
  windSpeed: number;
  tempMax: number;
  tempMin: number;
  forecast: Array<{
    day: string;
    code: number;
    max: number;
    min: number;
  }>;
}

// Helper to translate WMO weather codes to icon and label
function getWeatherDetails(code: number) {
  if (code === 0) {
    return { icon: Sun, label: 'Sunny', color: 'text-amber-500 fill-amber-300/60' };
  } else if (code >= 1 && code <= 3) {
    return { icon: CloudSun, label: 'Partly Cloudy', color: 'text-sky-500' };
  } else if (code === 45 || code === 48) {
    return { icon: CloudFog, label: 'Foggy', color: 'text-slate-400' };
  } else if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
    return { icon: CloudRain, label: 'Rainy', color: 'text-blue-500' };
  } else if ((code >= 71 && code <= 77) || code === 85 || code === 86) {
    return { icon: CloudSnow, label: 'Snowy', color: 'text-indigo-400' };
  } else if (code >= 95 && code <= 99) {
    return { icon: CloudLightning, label: 'Thunderstorm', color: 'text-amber-600' };
  }
  return { icon: Cloud, label: 'Cloudy', color: 'text-slate-400' };
}

export function HeaderWeatherWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [locationName, setLocationName] = useState('Valencia');
  const [isGeolocated, setIsGeolocated] = useState(false);
  const [weather, setWeather] = useState<WeatherData>({
    temp: 24,
    weatherCode: 0,
    humidity: 58,
    windSpeed: 14,
    tempMax: 26,
    tempMin: 17,
    forecast: [
      { day: 'Today', code: 0, max: 26, min: 17 },
      { day: 'Tomorrow', code: 1, max: 25, min: 16 },
      { day: 'In 2 days', code: 0, max: 27, min: 18 }
    ]
  });

  const containerRef = useRef<HTMLDivElement>(null);

  // Helper to fetch weather for specific coordinates
  const fetchWeatherForCoords = async (lat: number, lng: number, cityLabel: string, geolocated: boolean) => {
    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Europe%2FMadrid`
      );
      if (!response.ok) throw new Error('Failed to fetch weather');
      const data = await response.json();
      
      if (data.current && data.daily) {
        const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        const forecastData = (data.daily.time || []).slice(0, 3).map((timeStr: string, idx: number) => {
          const date = new Date(timeStr);
          let dayLabel = daysOfWeek[date.getDay()];
          if (idx === 0) dayLabel = 'Today';
          if (idx === 1) dayLabel = 'Tomorrow';
          
          return {
            day: dayLabel,
            code: data.daily.weather_code[idx] ?? 0,
            max: Math.round(data.daily.temperature_2m_max[idx] ?? 24),
            min: Math.round(data.daily.temperature_2m_min[idx] ?? 16)
          };
        });

        setWeather({
          temp: Math.round(data.current.temperature_2m),
          weatherCode: data.current.weather_code,
          humidity: Math.round(data.current.relative_humidity_2m),
          windSpeed: Math.round(data.current.wind_speed_10m),
          tempMax: Math.round(data.daily.temperature_2m_max[0] ?? data.current.temperature_2m),
          tempMin: Math.round(data.daily.temperature_2m_min[0] ?? data.current.temperature_2m - 5),
          forecast: forecastData
        });
        setLocationName(cityLabel);
        setIsGeolocated(geolocated);
      }
    } catch (err) {
      console.warn('Weather fetch error, using fallback Valencia weather data:', err);
    }
  };

  // Determine user geolocation inside Valencian Community or default to Valencia
  useEffect(() => {
    let isCancelled = false;

    const initWeather = async () => {
      const DEFAULT_LAT = 39.4699;
      const DEFAULT_LNG = -0.3763;

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            if (isCancelled) return;
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;

            const isInsideValencianCommunity = (lat >= 37.84 && lat <= 40.80) && (lng >= -1.55 && lng <= 0.70);

            if (isInsideValencianCommunity) {
              let detectedCity = 'Valencia';
              try {
                const geoRes = await fetch(
                  `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
                );
                if (geoRes.ok) {
                  const geoData = await geoRes.json();
                  const placeName = geoData.locality || geoData.city || geoData.principalSubdivision;
                  if (placeName && placeName.trim()) {
                    detectedCity = placeName.trim();
                  }
                }
              } catch {
                detectedCity = 'Valencia';
              }

              if (!isCancelled) {
                fetchWeatherForCoords(lat, lng, detectedCity, true);
              }
            } else {
              if (!isCancelled) {
                fetchWeatherForCoords(DEFAULT_LAT, DEFAULT_LNG, 'Valencia', false);
              }
            }
          },
          () => {
            if (!isCancelled) {
              fetchWeatherForCoords(DEFAULT_LAT, DEFAULT_LNG, 'Valencia', false);
            }
          },
          { timeout: 8000, maximumAge: 600000 }
        );
      } else {
        fetchWeatherForCoords(DEFAULT_LAT, DEFAULT_LNG, 'Valencia', false);
      }
    };

    initWeather();
    return () => {
      isCancelled = true;
    };
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const currentDetails = getWeatherDetails(weather.weatherCode);
  const CurrentIcon = currentDetails.icon;

  return (
    <div className="relative inline-block text-left z-40" ref={containerRef}>
      {/* Compact Minimal Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl hover:bg-slate-50 active:scale-95 transition-all cursor-pointer select-none shrink-0"
        title={`${locationName} Weather`}
        aria-label={`${locationName} Weather`}
      >
        <CurrentIcon className={`w-5 h-5 sm:w-6 sm:h-6 ${currentDetails.color} shrink-0`} />
        <div className="flex flex-col items-start leading-none">
          <span className="text-sm sm:text-base font-bold font-display text-brand-navy tabular-nums">
            {weather.temp}°C
          </span>
          <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 flex items-center gap-0.5 max-w-[78px] sm:max-w-[96px] truncate mt-0.5">
            {isGeolocated && <MapPin className="w-2.5 h-2.5 text-emerald-500 shrink-0" />}
            <span className="truncate">{locationName}</span>
          </span>
        </div>
      </button>

      {/* Clean White Dropdown Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="absolute left-1/2 -translate-x-[60%] sm:-translate-x-1/2 lg:left-auto lg:translate-x-0 lg:right-0 top-full mt-2 z-50"
          >
            <motion.div
              initial={{ y: 6, scale: 0.97 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 4, scale: 0.97 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              className="w-[280px] max-w-[calc(100vw-2rem)] sm:w-[316px] rounded-2xl bg-white border border-slate-100 shadow-xl p-4.5 sm:p-5 text-slate-800 space-y-4"
            >
            {/* Header: Location & Current Temperature */}
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-sm font-bold text-brand-navy truncate">
                  <MapPin className="w-3.5 h-3.5 text-brand-blue shrink-0" />
                  <span className="truncate">{locationName}</span>
                </div>
                <p className="text-xs font-medium text-slate-400 mt-0.5">
                  {currentDetails.label} · H:{weather.tempMax}° L:{weather.tempMin}°
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <CurrentIcon className={`w-7 h-7 ${currentDetails.color}`} />
                <span className="text-2xl sm:text-[26px] font-bold font-display text-brand-navy tabular-nums leading-none">
                  {weather.temp}°
                </span>
              </div>
            </div>

            {/* Compact Metrics Row */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-100">
                <Droplets className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                <div className="leading-tight">
                  <span className="text-[10px] text-slate-400 block">Humidity</span>
                  <span className="text-xs font-bold text-brand-navy tabular-nums">{weather.humidity}%</span>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-100">
                <Wind className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                <div className="leading-tight">
                  <span className="text-[10px] text-slate-400 block">Wind</span>
                  <span className="text-xs font-bold text-brand-navy tabular-nums">{weather.windSpeed} km/h</span>
                </div>
              </div>
            </div>

            {/* 3-Day Forecast */}
            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100">
              {weather.forecast.map((f, i) => {
                const details = getWeatherDetails(f.code);
                const IconComp = details.icon;
                return (
                  <div
                    key={i}
                    className={`flex flex-col items-center gap-1.5 py-2 px-1.5 rounded-xl text-center ${
                      i === 0 ? 'bg-brand-blue/5' : 'bg-slate-50/70'
                    }`}
                  >
                    <span className={`text-[10px] font-bold truncate max-w-full ${
                      i === 0 ? 'text-brand-blue' : 'text-slate-500'
                    }`}>
                      {f.day}
                    </span>
                    <IconComp className={`w-4 h-4 ${details.color}`} />
                    <div className="text-[11px] font-bold text-brand-navy tabular-nums">
                      {f.max}° <span className="font-medium text-slate-400">{f.min}°</span>
                    </div>
                  </div>
                );
              })}
            </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

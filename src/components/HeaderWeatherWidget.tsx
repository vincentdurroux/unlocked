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
  ChevronDown, 
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

// Helper to translate WMO weather codes to icon and soft warm English label
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

  // Fetch Valencia live weather from Open-Meteo
  useEffect(() => {
    let isMounted = true;
    async function fetchWeather() {
      try {
        const response = await fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=39.4699&longitude=-0.3763&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Europe%2FMadrid'
        );
        if (!response.ok) throw new Error('Failed to fetch weather');
        const data = await response.json();
        
        if (isMounted && data.current && data.daily) {
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
        }
      } catch (err) {
        console.warn('Weather fetch error, using fallback Valencia weather data:', err);
      }
    }

    fetchWeather();
    return () => { isMounted = false; };
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
      {/* Seamless Clean Header Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group flex items-center gap-1.5 py-1 px-2.5 rounded-xl transition-all duration-200 cursor-pointer select-none shrink-0 text-slate-800 hover:text-slate-950 hover:bg-slate-100/70"
        title="Valencia Weather"
        aria-label="Valencia Weather"
      >
        <div className="flex flex-col items-center leading-tight">
          <div className="flex items-center gap-1.5">
            <CurrentIcon className={`w-4.5 h-4.5 sm:w-5 sm:h-5 ${currentDetails.color} shrink-0 transition-transform group-hover:scale-110`} />
            <span className="font-black text-slate-900 tracking-tight text-sm sm:text-base">
              {weather.temp}°C
            </span>
          </div>
          <span className="font-extrabold text-slate-600 text-[10px] sm:text-[11px] tracking-tight -mt-0.5">
            Valencia
          </span>
        </div>

        <ChevronDown 
          className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-amber-900' : 'group-hover:text-slate-600'}`} 
        />
      </button>

      {/* Soft Warm Minimal Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-white border border-[#EFE5D5] shadow-xl p-3.5 z-50 text-slate-800"
          >
            {/* Soft Warm Header Bar */}
            <div className="flex items-center justify-between pb-2.5 border-b border-[#F4EDE0]">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <MapPin className="w-3.5 h-3.5 text-amber-500" />
                <span>Valencia</span>
              </div>
              <span className="text-[10px] font-semibold text-amber-800/80 bg-[#FFF7E8] px-2 py-0.5 rounded-full border border-[#F3E5C8]">
                {currentDetails.label}
              </span>
            </div>

            {/* Main Temperature Display */}
            <div className="py-3 flex items-center justify-between">
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-slate-900 font-display tracking-tight">
                    {weather.temp}°C
                  </span>
                </div>
                <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                  High {weather.tempMax}° • Low {weather.tempMin}°
                </p>
              </div>

              <div className="p-2.5 rounded-2xl bg-[#FFFBF0] border border-[#F5EAD4] shrink-0">
                <CurrentIcon className={`w-8 h-8 ${currentDetails.color}`} />
              </div>
            </div>

            {/* Soft Metrics */}
            <div className="grid grid-cols-2 gap-2 py-2 px-2.5 bg-[#FAF7F0]/80 rounded-xl border border-[#F0E8D8] text-xs text-center mb-3">
              <div>
                <span className="text-[10px] text-slate-400 font-medium block">Humidity</span>
                <span className="font-bold text-slate-800 flex items-center justify-center gap-1 mt-0.5">
                  <Droplets className="w-3 h-3 text-sky-500" />
                  {weather.humidity}%
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-medium block">Wind</span>
                <span className="font-bold text-slate-800 flex items-center justify-center gap-1 mt-0.5">
                  <Wind className="w-3 h-3 text-teal-600" />
                  {weather.windSpeed} km/h
                </span>
              </div>
            </div>

            {/* 3-Day Forecast */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                Forecast
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {weather.forecast.map((f, i) => {
                  const details = getWeatherDetails(f.code);
                  const IconComp = details.icon;
                  return (
                    <div 
                      key={i} 
                      className="p-1.5 rounded-xl bg-[#FAF8F3] border border-[#F0E6D5] flex flex-col items-center text-center"
                    >
                      <span className="text-[10px] font-bold text-slate-600">{f.day}</span>
                      <IconComp className={`w-3.5 h-3.5 ${details.color} my-1`} />
                      <span className="text-[10px] font-extrabold text-slate-800">{f.max}°</span>
                      <span className="text-[9px] font-medium text-slate-400">{f.min}°</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

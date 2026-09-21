import React, { useState, useEffect } from 'react';
import { 
  Sun, 
  CloudSun, 
  Cloud, 
  CloudRain, 
  CloudLightning, 
  Snowflake, 
  CloudFog, 
  Wind, 
  Droplets, 
  RefreshCw, 
  MapPin, 
  ChevronDown, 
  ChevronUp
} from 'lucide-react';

interface WeatherData {
  city: string;
  current: {
    tempC: number;
    feelsLikeC: number;
    humidity: number;
    windSpeedKmH: number;
    weatherCode: number;
  };
  daily: {
    date: string;
    dayName: string;
    tempMaxC: number;
    tempMinC: number;
    weatherCode: number;
  }[];
}

// Map WMO Weather Codes to labels and icons
function getWeatherInfo(code: number) {
  switch (code) {
    case 0:
      return { label: 'Ensoleillé', icon: Sun, color: 'text-amber-500', bg: 'bg-amber-50 border-amber-200' };
    case 1:
    case 2:
      return { label: 'Partiellement nuageux', icon: CloudSun, color: 'text-amber-500', bg: 'bg-sky-50 border-sky-200' };
    case 3:
      return { label: 'Couvert', icon: Cloud, color: 'text-slate-500', bg: 'bg-slate-50 border-slate-200' };
    case 45:
    case 48:
      return { label: 'Brouillard', icon: CloudFog, color: 'text-slate-400', bg: 'bg-slate-50 border-slate-200' };
    case 51:
    case 53:
    case 55:
    case 56:
    case 57:
      return { label: 'Bruine légère', icon: CloudRain, color: 'text-blue-500', bg: 'bg-blue-50 border-blue-200' };
    case 61:
    case 63:
    case 65:
    case 66:
    case 67:
      return { label: 'Pluie', icon: CloudRain, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' };
    case 71:
    case 73:
    case 75:
    case 77:
      return { label: 'Neige', icon: Snowflake, color: 'text-indigo-400', bg: 'bg-indigo-50 border-indigo-200' };
    case 80:
    case 81:
    case 82:
      return { label: 'Averses', icon: CloudRain, color: 'text-blue-500', bg: 'bg-blue-50 border-blue-200' };
    case 95:
    case 96:
    case 99:
      return { label: 'Orage', icon: CloudLightning, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200' };
    default:
      return { label: 'Beau temps', icon: Sun, color: 'text-amber-500', bg: 'bg-amber-50 border-amber-200' };
  }
}

// Default initial weather to prevent initial flickering/skeleton blinking
const INITIAL_WEATHER: WeatherData = {
  city: 'Valencia',
  current: {
    tempC: 24,
    feelsLikeC: 25,
    humidity: 55,
    windSpeedKmH: 12,
    weatherCode: 0
  },
  daily: [
    { date: '2026-09-21', dayName: 'Aujourd\'hui', tempMaxC: 26, tempMinC: 18, weatherCode: 0 },
    { date: '2026-09-22', dayName: 'Mar.', tempMaxC: 25, tempMinC: 17, weatherCode: 1 },
    { date: '2026-09-23', dayName: 'Mer.', tempMaxC: 24, tempMinC: 18, weatherCode: 2 },
    { date: '2026-09-24', dayName: 'Jeu.', tempMaxC: 26, tempMinC: 19, weatherCode: 0 }
  ]
};

export function WeatherWidget({ 
  variant = 'card',
  className = '' 
}: { 
  variant?: 'card' | 'pill' | 'header';
  className?: string;
}) {
  const [weather, setWeather] = useState<WeatherData>(INITIAL_WEATHER);
  const [refreshing, setRefreshing] = useState(false);
  const [unit, setUnit] = useState<'C' | 'F'>('C');
  const [expanded, setExpanded] = useState(false);

  const fetchWeather = async () => {
    setRefreshing(true);
    try {
      const lat = 39.4699;
      const lng = -0.3763;
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Europe%2FMadrid`;
      
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const daysOfWeek = ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.'];

        const dailyForecast = (data.daily?.time || []).slice(0, 4).map((timeStr: string, idx: number) => {
          const d = new Date(timeStr);
          const dayName = idx === 0 ? 'Aujourd\'hui' : daysOfWeek[d.getDay()];
          return {
            date: timeStr,
            dayName,
            tempMaxC: Math.round(data.daily.temperature_2m_max[idx]),
            tempMinC: Math.round(data.daily.temperature_2m_min[idx]),
            weatherCode: data.daily.weather_code[idx]
          };
        });

        setWeather({
          city: 'Valencia',
          current: {
            tempC: Math.round(data.current.temperature_2m),
            feelsLikeC: Math.round(data.current.apparent_temperature),
            humidity: Math.round(data.current.relative_humidity_2m),
            windSpeedKmH: Math.round(data.current.wind_speed_10m),
            weatherCode: data.current.weather_code
          },
          daily: dailyForecast
        });
      }
    } catch (err) {
      console.warn('Could not refresh weather:', err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWeather();
  }, []);

  const toF = (c: number) => Math.round((c * 9) / 5 + 32);
  const formatTemp = (c: number) => (unit === 'C' ? `${c}°C` : `${toF(c)}°F`);

  const info = getWeatherInfo(weather.current.weatherCode);
  const WeatherIcon = info.icon;

  // Render Pill Variant (compact horizontal badge)
  if (variant === 'pill' || variant === 'header') {
    return (
      <div className={`relative inline-block ${className}`}>
        <div 
          onClick={() => setExpanded(!expanded)}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-xs hover:border-[#00C2A8]/50 hover:shadow-sm transition-all cursor-pointer group select-none"
          title="Cliquer pour afficher la météo"
        >
          <WeatherIcon className={`w-4 h-4 ${info.color} group-hover:scale-110 transition-transform`} />
          <span className="text-xs font-bold text-slate-800">
            {weather.city} {formatTemp(weather.current.tempC)}
          </span>
          <span className="text-[10px] font-semibold text-slate-500 hidden sm:inline">
            • {info.label}
          </span>
          {expanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#00C2A8]" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#00C2A8]" />
          )}
        </div>

        {/* Expandable Dropdown */}
        {expanded && (
          <div 
            className="absolute top-full left-0 sm:left-auto sm:right-0 mt-2 w-72 p-4 bg-white rounded-2xl border border-slate-150 shadow-xl z-50 text-left space-y-3 transition-all duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-1.5 text-xs font-black text-slate-800 uppercase tracking-wider">
                <MapPin className="w-3.5 h-3.5 text-[#00C2A8]" />
                <span>Météo à {weather.city}</span>
              </div>
              <button 
                onClick={() => setUnit(unit === 'C' ? 'F' : 'C')}
                className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 hover:bg-[#00C2A8] hover:text-white transition-colors cursor-pointer"
              >
                °{unit}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-black text-slate-900 font-display">
                  {formatTemp(weather.current.tempC)}
                </div>
                <div className="text-xs font-bold text-slate-500">
                  {info.label} • Ressenti {formatTemp(weather.current.feelsLikeC)}
                </div>
              </div>
              <WeatherIcon className={`w-10 h-10 ${info.color}`} />
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-100">
              <div className="flex items-center gap-1.5 text-slate-600">
                <Droplets className="w-3.5 h-3.5 text-blue-500" />
                <span>Humidité: <strong>{weather.current.humidity}%</strong></span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600">
                <Wind className="w-3.5 h-3.5 text-slate-400" />
                <span>Vent: <strong>{weather.current.windSpeedKmH} km/h</strong></span>
              </div>
            </div>

            {/* 4-Day Forecast */}
            <div className="grid grid-cols-4 gap-1 pt-2 border-t border-slate-100 text-center">
              {weather.daily.map((day, idx) => {
                const dayInfo = getWeatherInfo(day.weatherCode);
                const DayIcon = dayInfo.icon;
                return (
                  <div key={idx} className="p-1.5 rounded-xl bg-slate-50/80 space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 block truncate">{day.dayName}</span>
                    <DayIcon className={`w-3.5 h-3.5 mx-auto ${dayInfo.color}`} />
                    <span className="text-[10px] font-black text-slate-800 block">
                      {unit === 'C' ? `${day.tempMaxC}°` : `${toF(day.tempMaxC)}°`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Render Expandable Card Variant (Collapsible on click, zero flickering)
  return (
    <div className={`rounded-3xl bg-gradient-to-br from-white via-sky-50/20 to-emerald-50/10 border border-slate-150/80 shadow-xs hover:shadow-md transition-all text-left overflow-hidden select-none ${className}`}>
      
      {/* Clickable Header Bar */}
      <div 
        onClick={() => setExpanded(!expanded)}
        className="p-4 sm:p-5 flex items-center justify-between gap-3 cursor-pointer group hover:bg-white/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-2xl ${info.bg} shrink-0 group-hover:scale-105 transition-transform`}>
            <WeatherIcon className={`w-6 h-6 ${info.color}`} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-900">
                Météo locale à {weather.city}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100/80 text-emerald-700">
                {info.label}
              </span>
            </div>
            
            <div className="text-sm font-extrabold text-slate-800 mt-0.5 flex items-center gap-2">
              <span>{formatTemp(weather.current.tempC)}</span>
              <span className="text-xs text-slate-400 font-medium">
                ({formatTemp(weather.daily[0]?.tempMaxC || 0)} / {formatTemp(weather.daily[0]?.tempMinC || 0)})
              </span>
            </div>
          </div>
        </div>

        {/* Right Action Icons & Toggle Chevron */}
        <div className="flex items-center gap-2">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setUnit(unit === 'C' ? 'F' : 'C');
            }}
            className="px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-slate-700 hover:border-[#00C2A8] text-xs font-bold shadow-2xs transition-all active:scale-95 cursor-pointer"
            title="Basculer °C / °F"
          >
            °{unit}
          </button>

          <button 
            onClick={(e) => {
              e.stopPropagation();
              fetchWeather();
            }}
            className="p-1.5 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-[#00C2A8] hover:border-[#00C2A8]/30 text-xs shadow-2xs transition-all active:scale-95 cursor-pointer"
            title="Actualiser la météo"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#00C2A8]' : ''}`} />
          </button>

          <div className="p-1.5 rounded-xl bg-slate-100/80 text-slate-500 group-hover:bg-[#00C2A8] group-hover:text-white transition-all ml-1">
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </div>
      </div>

      {/* Accordion Smooth Dropdown Content */}
      {expanded && (
        <div className="px-5 pb-5 pt-2 border-t border-slate-100/80 space-y-4 animate-in fade-in duration-200">
          {/* Weather Stats Grid */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="p-3 rounded-2xl bg-white/80 border border-slate-100 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ressenti</span>
              <span className="font-extrabold text-slate-800 text-sm">
                {formatTemp(weather.current.feelsLikeC)}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-white/80 border border-slate-100 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Humidité</span>
              <span className="font-extrabold text-slate-800 text-sm flex items-center gap-1">
                <Droplets className="w-3.5 h-3.5 text-blue-500" />
                {weather.current.humidity}%
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-white/80 border border-slate-100 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Vent</span>
              <span className="font-extrabold text-slate-800 text-sm flex items-center gap-1">
                <Wind className="w-3.5 h-3.5 text-slate-400" />
                {weather.current.windSpeedKmH} km/h
              </span>
            </div>
          </div>

          {/* 4-Day Forecast Grid */}
          <div className="space-y-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500 block">
              Prévisions météo sur 4 jours
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {weather.daily.map((day, idx) => {
                const dayInfo = getWeatherInfo(day.weatherCode);
                const DayIcon = dayInfo.icon;
                return (
                  <div key={idx} className="p-3 rounded-2xl bg-white border border-slate-100/90 shadow-2xs text-center space-y-1.5">
                    <span className="text-xs font-extrabold text-slate-700 block">{day.dayName}</span>
                    <DayIcon className={`w-5 h-5 mx-auto ${dayInfo.color}`} />
                    <div className="text-xs font-black text-slate-900">
                      {formatTemp(day.tempMaxC)} <span className="text-slate-400 font-normal text-[11px]">{formatTemp(day.tempMinC)}</span>
                    </div>
                    <span className="text-[10px] font-medium text-slate-400 block truncate">{dayInfo.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

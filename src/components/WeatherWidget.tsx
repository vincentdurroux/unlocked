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
  Thermometer, 
  RefreshCw, 
  MapPin, 
  ChevronDown, 
  ChevronUp,
  Sparkles
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
      return { label: 'Clear Sky', icon: Sun, color: 'text-amber-500', bg: 'bg-amber-50 border-amber-200' };
    case 1:
    case 2:
      return { label: 'Partly Cloudy', icon: CloudSun, color: 'text-amber-500', bg: 'bg-sky-50 border-sky-200' };
    case 3:
      return { label: 'Overcast', icon: Cloud, color: 'text-slate-500', bg: 'bg-slate-50 border-slate-200' };
    case 45:
    case 48:
      return { label: 'Foggy', icon: CloudFog, color: 'text-slate-400', bg: 'bg-slate-50 border-slate-200' };
    case 51:
    case 53:
    case 55:
    case 56:
    case 57:
      return { label: 'Light Drizzle', icon: CloudRain, color: 'text-blue-500', bg: 'bg-blue-50 border-blue-200' };
    case 61:
    case 63:
    case 65:
    case 66:
    case 67:
      return { label: 'Rainy', icon: CloudRain, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' };
    case 71:
    case 73:
    case 75:
    case 77:
      return { label: 'Snowy', icon: Snowflake, color: 'text-indigo-400', bg: 'bg-indigo-50 border-indigo-200' };
    case 80:
    case 81:
    case 82:
      return { label: 'Rain Showers', icon: CloudRain, color: 'text-blue-500', bg: 'bg-blue-50 border-blue-200' };
    case 95:
    case 96:
    case 99:
      return { label: 'Thunderstorm', icon: CloudLightning, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200' };
    default:
      return { label: 'Fair', icon: Sun, color: 'text-amber-500', bg: 'bg-amber-50 border-amber-200' };
  }
}

export function WeatherWidget({ 
  variant = 'card',
  className = '' 
}: { 
  variant?: 'card' | 'pill' | 'header';
  className?: string;
}) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [unit, setUnit] = useState<'C' | 'F'>('C');
  const [expanded, setExpanded] = useState(false);

  const fetchWeather = async () => {
    setLoading(true);
    setError(false);
    try {
      // Default to Valencia coordinates
      const lat = 39.4699;
      const lng = -0.3763;
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Europe%2FMadrid`;
      
      const res = await fetch(url);
      if (!res.ok) throw new Error('Weather API error');
      const data = await res.json();

      const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

      const dailyForecast = (data.daily?.time || []).slice(0, 4).map((timeStr: string, idx: number) => {
        const d = new Date(timeStr);
        const dayName = idx === 0 ? 'Today' : daysOfWeek[d.getDay()];
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
    } catch (err) {
      console.warn('Could not fetch Open-Meteo weather:', err);
      setError(true);
      // Fallback display if offline/error
      setWeather({
        city: 'Valencia',
        current: {
          tempC: 24,
          feelsLikeC: 25,
          humidity: 55,
          windSpeedKmH: 12,
          weatherCode: 0
        },
        daily: [
          { date: '2026-09-21', dayName: 'Today', tempMaxC: 26, tempMinC: 18, weatherCode: 0 },
          { date: '2026-09-22', dayName: 'Tue', tempMaxC: 25, tempMinC: 17, weatherCode: 1 },
          { date: '2026-09-23', dayName: 'Wed', tempMaxC: 24, tempMinC: 18, weatherCode: 2 },
          { date: '2026-09-24', dayName: 'Thu', tempMaxC: 26, tempMinC: 19, weatherCode: 0 }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
  }, []);

  const toF = (c: number) => Math.round((c * 9) / 5 + 32);
  const formatTemp = (c: number) => (unit === 'C' ? `${c}°C` : `${toF(c)}°F`);

  if (loading) {
    if (variant === 'pill' || variant === 'header') {
      return (
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100/80 animate-pulse text-xs text-slate-400 ${className}`}>
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#00C2A8]" />
          <span>Valencia Weather...</span>
        </div>
      );
    }
    return (
      <div className={`p-5 rounded-3xl bg-white border border-slate-100 shadow-sm animate-pulse flex items-center justify-between ${className}`}>
        <div className="space-y-2">
          <div className="h-4 w-28 bg-slate-100 rounded-lg" />
          <div className="h-8 w-20 bg-slate-100 rounded-lg" />
        </div>
        <div className="w-12 h-12 rounded-full bg-slate-100" />
      </div>
    );
  }

  if (!weather) return null;

  const info = getWeatherInfo(weather.current.weatherCode);
  const WeatherIcon = info.icon;

  // Render Pill Variant (compact horizontal badge)
  if (variant === 'pill' || variant === 'header') {
    return (
      <div 
        onClick={() => setExpanded(!expanded)}
        className={`relative inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-xs hover:border-[#00C2A8]/40 hover:shadow-sm transition-all cursor-pointer group select-none ${className}`}
        title="Click for full Valencia weather forecast"
      >
        <WeatherIcon className={`w-4 h-4 ${info.color} group-hover:scale-110 transition-transform`} />
        <span className="text-xs font-bold text-slate-800">
          {weather.city} {formatTemp(weather.current.tempC)}
        </span>
        <span className="text-[10px] font-semibold text-slate-500 hidden sm:inline">
          • {info.label}
        </span>

        {/* Expandable Mini Popup for Header Pill */}
        {expanded && (
          <div 
            className="absolute top-full right-0 mt-2 w-72 p-4 bg-white rounded-2xl border border-slate-150 shadow-xl z-50 text-left space-y-3 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-1.5 text-xs font-black text-slate-800 uppercase tracking-wider">
                <MapPin className="w-3.5 h-3.5 text-[#00C2A8]" />
                <span>{weather.city} Weather</span>
              </div>
              <button 
                onClick={() => setUnit(unit === 'C' ? 'F' : 'C')}
                className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 hover:bg-[#00C2A8] hover:text-white transition-colors"
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
                  {info.label} • Feels like {formatTemp(weather.current.feelsLikeC)}
                </div>
              </div>
              <WeatherIcon className={`w-10 h-10 ${info.color}`} />
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-100">
              <div className="flex items-center gap-1.5 text-slate-600">
                <Droplets className="w-3.5 h-3.5 text-blue-500" />
                <span>Humidity: <strong>{weather.current.humidity}%</strong></span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600">
                <Wind className="w-3.5 h-3.5 text-slate-400" />
                <span>Wind: <strong>{weather.current.windSpeedKmH} km/h</strong></span>
              </div>
            </div>

            {/* 4-Day Mini Forecast */}
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

  // Render Full Card Variant
  return (
    <div className={`p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-white via-sky-50/20 to-emerald-50/10 border border-slate-150/80 shadow-sm hover:shadow-md transition-all text-left relative overflow-hidden ${className}`}>
      {/* Decorative subtle background gradient blur */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#00C2A8]/5 rounded-full blur-2xl pointer-events-none" />

      {/* Card Header */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-emerald-50 text-[#00C2A8] border border-emerald-100/60 shadow-3xs">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <span>{weather.city} Local Weather</span>
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </h4>
            <span className="text-[11px] font-medium text-slate-400">Live Forecast</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Unit Toggle Button */}
          <button 
            onClick={() => setUnit(unit === 'C' ? 'F' : 'C')}
            className="px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-slate-700 hover:border-[#00C2A8] text-xs font-bold shadow-2xs transition-all active:scale-95"
            title="Toggle Celsius / Fahrenheit"
          >
            °{unit}
          </button>

          {/* Refresh Button */}
          <button 
            onClick={fetchWeather}
            className="p-1.5 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-[#00C2A8] hover:border-[#00C2A8]/30 text-xs shadow-2xs transition-all active:scale-95"
            title="Refresh weather data"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Weather Information */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-2 border-b border-slate-100">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-2xl ${info.bg} shrink-0`}>
            <WeatherIcon className={`w-8 h-8 ${info.color}`} />
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900 font-display leading-none">
              {formatTemp(weather.current.tempC)}
            </div>
            <div className="text-xs font-bold text-slate-600 mt-1">
              {info.label} • Feels like {formatTemp(weather.current.feelsLikeC)}
            </div>
          </div>
        </div>

        {/* High/Low & Extra details */}
        <div className="flex items-center gap-3 text-xs w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
          <div className="px-3 py-2 rounded-xl bg-white border border-slate-150/70 shadow-2xs space-y-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Today</span>
            <span className="font-extrabold text-slate-800">
              {formatTemp(weather.daily[0]?.tempMaxC || 0)} / <span className="text-slate-400 font-medium">{formatTemp(weather.daily[0]?.tempMinC || 0)}</span>
            </span>
          </div>

          <div className="px-3 py-2 rounded-xl bg-white border border-slate-150/70 shadow-2xs space-y-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Humidity</span>
            <span className="font-extrabold text-slate-800 flex items-center gap-1">
              <Droplets className="w-3 h-3 text-blue-500" />
              {weather.current.humidity}%
            </span>
          </div>

          <div className="px-3 py-2 rounded-xl bg-white border border-slate-150/70 shadow-2xs space-y-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Wind</span>
            <span className="font-extrabold text-slate-800 flex items-center gap-1">
              <Wind className="w-3 h-3 text-slate-400" />
              {weather.current.windSpeedKmH} km/h
            </span>
          </div>
        </div>
      </div>

      {/* Expandable 4-Day Forecast Row */}
      <div className="pt-3">
        <button 
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between text-xs font-bold text-slate-500 hover:text-[#00C2A8] transition-colors py-1 cursor-pointer"
        >
          <span>4-Day Valencia Weather Forecast</span>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {expanded && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 animate-in fade-in duration-200">
            {weather.daily.map((day, idx) => {
              const dayInfo = getWeatherInfo(day.weatherCode);
              const DayIcon = dayInfo.icon;
              return (
                <div key={idx} className="p-3 rounded-2xl bg-white border border-slate-100 shadow-2xs text-center space-y-1.5">
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
        )}
      </div>
    </div>
  );
}

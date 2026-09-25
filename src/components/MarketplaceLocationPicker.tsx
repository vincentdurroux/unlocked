import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MapPin,
  Search,
  Navigation,
  Loader2,
  X,
  Crosshair,
  Sparkles,
  Check
} from 'lucide-react';
import { APIProvider, Map, AdvancedMarker, Pin, useMapsLibrary, useMap } from '@vis.gl/react-google-maps';
import { cn } from '../lib/utils';

const GOOGLE_MAPS_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';
const VALENCIA_CENTER = { lat: 39.4699, lng: -0.3763 };

interface MarketplaceLocationPickerProps {
  location: string;
  exactAddress: string;
  precision: 'approximate' | 'exact';
  lat: number | null;
  lng: number | null;
  onChangeLocation: (location: string) => void;
  onChangeExactAddress: (address: string) => void;
  onChangePrecision: (precision: 'approximate' | 'exact') => void;
  onChangeCoordinates: (lat: number, lng: number) => void;
}

const POPULAR_AREAS = [
  { name: 'Ruzafa', lat: 39.4624, lng: -0.3732 },
  { name: 'El Carmen', lat: 39.4774, lng: -0.3802 },
  { name: 'Eixample / Gran Vía', lat: 39.4660, lng: -0.3690 },
  { name: 'Benimaclet', lat: 39.4862, lng: -0.3582 },
  { name: 'Cabañal / Beach', lat: 39.4680, lng: -0.3280 },
  { name: 'Paterna', lat: 39.5298, lng: -0.4496 },
  { name: "L'Eliana", lat: 39.5662, lng: -0.5284 },
  { name: 'Bétera', lat: 39.5910, lng: -0.4590 }
];

// Inner component to control map panning and clicks
function MapController({
  coords,
  onMapClick
}: {
  coords: { lat: number; lng: number };
  onMapClick: (lat: number, lng: number) => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (map && coords.lat && coords.lng) {
      map.panTo(coords);
    }
  }, [map, coords.lat, coords.lng]);

  const handleContainerClick = useCallback((e: any) => {
    const latLng = e.detail?.latLng || e.latLng;
    if (latLng) {
      const lat = typeof latLng.lat === 'function' ? latLng.lat() : latLng.lat;
      const lng = typeof latLng.lng === 'function' ? latLng.lng() : latLng.lng;
      if (lat !== undefined && lng !== undefined) {
        onMapClick(lat, lng);
      }
    }
  }, [onMapClick]);

  return (
    <Map
      defaultCenter={coords}
      center={coords}
      defaultZoom={14}
      zoom={14}
      mapId="MARKETPLACE_LOCATION_PICKER_MAP"
      disableDefaultUI={false}
      zoomControl={true}
      mapTypeControl={false}
      streetViewControl={false}
      fullscreenControl={false}
      onClick={handleContainerClick}
      className="w-full h-full"
    >
      <AdvancedMarker
        position={coords}
        draggable={true}
        onDragEnd={(e) => {
          if (e.latLng) {
            onMapClick(e.latLng.lat(), e.latLng.lng());
          }
        }}
      >
        <Pin background="#059669" glyphColor="#ffffff" borderColor="#047857" />
      </AdvancedMarker>
    </Map>
  );
}

export function MarketplaceLocationPicker({
  location,
  exactAddress,
  precision,
  lat,
  lng,
  onChangeLocation,
  onChangeExactAddress,
  onChangePrecision,
  onChangeCoordinates
}: MarketplaceLocationPickerProps) {
  const [query, setQuery] = useState(exactAddress || location || '');
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocatingUser, setIsLocatingUser] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentCoords = {
    lat: lat || VALENCIA_CENTER.lat,
    lng: lng || VALENCIA_CENTER.lng
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync internal query input when props change from outside
  useEffect(() => {
    if (exactAddress) {
      setQuery(exactAddress);
    } else if (location && !query) {
      setQuery(location);
    }
  }, [exactAddress, location]);

  // Handle Google Places Autocomplete search
  const handleQueryChange = (val: string) => {
    setQuery(val);
    if (precision === 'exact') {
      onChangeExactAddress(val);
    } else {
      onChangeLocation(val);
    }

    if (!val || val.length < 2 || typeof google === 'undefined' || !google.maps || !google.maps.places) {
      setPredictions([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    try {
      const autocompleteService = new google.maps.places.AutocompleteService();
      autocompleteService.getPlacePredictions(
        {
          input: val,
          locationBias: { radius: 25000, center: VALENCIA_CENTER },
          componentRestrictions: { country: 'es' }
        },
        (results, status) => {
          setIsSearching(false);
          if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            setPredictions(results);
            setShowDropdown(true);
          } else {
            setPredictions([]);
            setShowDropdown(false);
          }
        }
      );
    } catch {
      setIsSearching(false);
    }
  };

  // Select place from Google Maps Places predictions
  const handleSelectPrediction = (prediction: google.maps.places.AutocompletePrediction) => {
    setShowDropdown(false);
    setQuery(prediction.description);

    if (typeof google === 'undefined' || !google.maps || !google.maps.places) {
      onChangeLocation(prediction.structured_formatting?.main_text || prediction.description);
      return;
    }

    const placesService = new google.maps.places.PlacesService(document.createElement('div'));
    placesService.getDetails(
      {
        placeId: prediction.place_id,
        fields: ['formatted_address', 'geometry', 'address_components', 'name']
      },
      (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
          const placeLat = place.geometry.location.lat();
          const placeLng = place.geometry.location.lng();
          const formatted = place.formatted_address || prediction.description;
          
          const components = place.address_components || [];
          const neighborhood = components.find(c => 
            c.types.includes('neighborhood') || 
            c.types.includes('sublocality_level_1') || 
            c.types.includes('sublocality')
          )?.long_name;
          const locality = components.find(c => c.types.includes('locality'))?.long_name;
          
          let detectedLocation = neighborhood || locality || formatted.split(',')[0];
          if (locality && locality.toLowerCase() !== 'valència' && locality.toLowerCase() !== 'valencia') {
            detectedLocation = neighborhood ? `${neighborhood} (${locality})` : locality;
          }

          onChangeCoordinates(placeLat, placeLng);
          onChangeExactAddress(formatted);
          onChangeLocation(detectedLocation);
        }
      }
    );
  };

  // Reverse geocode when clicking or dragging marker on map
  const handleMapClick = (clickLat: number, clickLng: number) => {
    onChangeCoordinates(clickLat, clickLng);

    if (typeof google !== 'undefined' && google.maps && google.maps.Geocoder) {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ location: { lat: clickLat, lng: clickLng } }, (results, status) => {
        if (status === 'OK' && results && results.length > 0) {
          const first = results[0];
          const formatted = first.formatted_address;
          const components = first.address_components || [];
          const neighborhood = components.find(c => 
            c.types.includes('neighborhood') || 
            c.types.includes('sublocality_level_1') || 
            c.types.includes('sublocality')
          )?.long_name;
          const locality = components.find(c => c.types.includes('locality'))?.long_name;

          let detectedLoc = neighborhood || locality || formatted.split(',')[0];
          if (locality && locality.toLowerCase() !== 'valència' && locality.toLowerCase() !== 'valencia') {
            detectedLoc = neighborhood ? `${neighborhood} (${locality})` : locality;
          }

          onChangeExactAddress(formatted);
          onChangeLocation(detectedLoc);
          setQuery(formatted);
        }
      });
    }
  };

  // Device geolocation
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    setIsLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocatingUser(false);
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;
        handleMapClick(userLat, userLng);
      },
      () => {
        setIsLocatingUser(false);
        alert('Could not access current location. Please type an address or pick on the map.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Quick preset area button click
  const handleSelectArea = (area: typeof POPULAR_AREAS[0]) => {
    onChangeCoordinates(area.lat, area.lng);
    onChangeLocation(area.name);
    onChangeExactAddress(`${area.name}, Valencia, Spain`);
    setQuery(area.name);
  };

  return (
    <div className="space-y-3 p-4 bg-slate-50/90 rounded-2xl border border-slate-200" ref={containerRef}>
      {/* Header & Precision Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-emerald-600" />
          Location & Google Maps in Valencia <span className="text-emerald-600">*</span>
        </label>
        
        <div className="inline-flex p-0.5 bg-slate-200/80 rounded-xl text-xs font-semibold self-start sm:self-auto">
          <button
            type="button"
            onClick={() => onChangePrecision('approximate')}
            className={cn(
              "px-2.5 py-1 rounded-lg transition-all cursor-pointer text-[11px]",
              precision === 'approximate'
                ? "bg-white text-emerald-800 shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            🌐 Approximate Area
          </button>
          <button
            type="button"
            onClick={() => onChangePrecision('exact')}
            className={cn(
              "px-2.5 py-1 rounded-lg transition-all cursor-pointer text-[11px]",
              precision === 'exact'
                ? "bg-white text-emerald-800 shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            🎯 Exact Address
          </button>
        </div>
      </div>

      {/* Google Maps Search Bar */}
      <div className="relative">
        <div className="relative flex items-center">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onFocus={() => {
              if (predictions.length > 0) setShowDropdown(true);
            }}
            placeholder={
              precision === 'exact'
                ? "Search exact address, street or meeting spot (e.g. Carrer de Colón 14, Metro Ruzafa)..."
                : "Search neighborhood, area or town (e.g. Ruzafa, Benimaclet, Paterna, L'Eliana)..."
            }
            className="w-full pl-10 pr-24 py-2.5 bg-white rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none text-xs sm:text-sm font-medium text-slate-900 transition-all placeholder:text-slate-400"
          />
          
          <div className="absolute right-2 flex items-center gap-1">
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  onChangeLocation('');
                  onChangeExactAddress('');
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
                title="Clear"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            
            <button
              type="button"
              onClick={handleLocateMe}
              disabled={isLocatingUser}
              className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[11px] rounded-lg border border-emerald-200 flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
              title="Use current GPS location"
            >
              {isLocatingUser ? (
                <Loader2 className="w-3 h-3 animate-spin text-emerald-600" />
              ) : (
                <Crosshair className="w-3 h-3 text-emerald-600" />
              )}
              <span className="hidden sm:inline">My GPS</span>
            </button>
          </div>
        </div>

        {/* Google Places Dropdown Predictions */}
        {showDropdown && predictions.length > 0 && (
          <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden max-h-56 overflow-y-auto">
            <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Google Maps Results in Valencia</span>
              <span className="text-emerald-600 font-medium">Click to place pin</span>
            </div>
            {predictions.map((p) => (
              <button
                key={p.place_id}
                type="button"
                onClick={() => handleSelectPrediction(p)}
                className="w-full px-3.5 py-2.5 text-left hover:bg-emerald-50/60 transition-colors border-b border-slate-50 last:border-0 group flex items-start gap-2.5 cursor-pointer"
              >
                <MapPin className="w-4 h-4 text-slate-400 mt-0.5 group-hover:text-emerald-600 shrink-0 transition-colors" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {p.structured_formatting?.main_text || p.description}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {p.structured_formatting?.secondary_text || ''}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Interactive Mini Google Map */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-2xs bg-slate-100 h-44 sm:h-52">
        <APIProvider apiKey={GOOGLE_MAPS_KEY}>
          <MapController coords={currentCoords} onMapClick={handleMapClick} />
        </APIProvider>

        {/* Floating Hint Overlay on Map */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none">
          <div className="px-2.5 py-1 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-medium rounded-lg shadow-sm flex items-center gap-1.5">
            <Navigation className="w-3 h-3 text-emerald-400" />
            <span>Click or drag the green pin on map to adjust</span>
          </div>
          {lat && lng && (
            <div className="hidden sm:inline-flex px-2 py-0.5 bg-white/90 backdrop-blur-xs text-slate-700 text-[10px] font-mono rounded-md shadow-xs border border-slate-200">
              {lat.toFixed(4)}, {lng.toFixed(4)}
            </div>
          )}
        </div>
      </div>

      {/* Auto-detected District / Neighborhood Preview */}
      {location && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-emerald-50/80 rounded-xl border border-emerald-200/80 text-xs">
          <div className="flex items-center gap-1.5 text-emerald-900 font-semibold truncate">
            <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-100/90 px-1.5 py-0.5 rounded">
              Detected Area
            </span>
            <span className="truncate">{location}</span>
          </div>
          <span className="text-[10px] text-emerald-600 shrink-0 font-medium">✓ Auto-filled from Google Maps</span>
        </div>
      )}

      {/* Privacy Notice */}
      <p className="text-[11px] text-slate-500">
        {precision === 'exact' ? (
          <span className="text-emerald-700 font-medium">
            🎯 <strong>Exact Location</strong>: Buyers will see the pin at your chosen street/meeting spot for item pickup.
          </span>
        ) : (
          <span>
            🛡️ <strong>Approximate Area</strong>: Protects your privacy. Only the district/neighborhood name is shown publicly.
          </span>
        )}
      </p>

      {/* Quick Area Suggestion Chips */}
      <div className="space-y-1.5 pt-1 border-t border-slate-200/70">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-[11px]">
          <span className="text-slate-400 font-bold shrink-0 text-[10px] uppercase tracking-wider">
            Quick Valencia Areas:
          </span>
          {POPULAR_AREAS.map((area) => {
            const isCurrent = location.toLowerCase().includes(area.name.toLowerCase());
            return (
              <button
                key={area.name}
                type="button"
                onClick={() => handleSelectArea(area)}
                className={cn(
                  "px-2.5 py-1 rounded-lg border text-xs font-medium shrink-0 transition-all cursor-pointer flex items-center gap-1",
                  isCurrent
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs font-bold"
                    : "bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border-slate-200"
                )}
              >
                {isCurrent && <Check className="w-3 h-3 stroke-[3]" />}
                <span>{area.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

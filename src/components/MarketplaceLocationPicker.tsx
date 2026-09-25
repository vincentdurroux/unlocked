import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MapPin,
  Search,
  Check,
  X,
  Building2,
  Navigation,
  MousePointer2
} from 'lucide-react';
import { cn } from '../lib/utils';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
  MapMouseEvent
} from '@vis.gl/react-google-maps';

const VALENCIA_CENTER = { lat: 39.4699, lng: -0.3763 };
const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

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

const VALENCIA_AREAS = [
  { name: 'Ruzafa', lat: 39.4624, lng: -0.3732 },
  { name: 'El Carmen', lat: 39.4774, lng: -0.3802 },
  { name: 'Eixample / Gran Vía', lat: 39.4660, lng: -0.3690 },
  { name: 'Benimaclet', lat: 39.4862, lng: -0.3582 },
  { name: 'Cabañal / Beach', lat: 39.4680, lng: -0.3280 },
  { name: 'Campanar', lat: 39.4812, lng: -0.3955 },
  { name: 'Paterna', lat: 39.5298, lng: -0.4496 },
  { name: "L'Eliana", lat: 39.5662, lng: -0.5284 },
  { name: 'Bétera', lat: 39.5910, lng: -0.4590 }
];

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
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync with outer address changes
  useEffect(() => {
    if (precision === 'exact') {
      if (exactAddress) setQuery(exactAddress);
    } else {
      if (location) setQuery(location);
    }
  }, [exactAddress, location, precision]);

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

  // Google Places search
  const handleAddressInputChange = (val: string) => {
    setQuery(val);
    onChangeExactAddress(val);

    if (!val || val.length < 2 || typeof google === 'undefined' || !google.maps || !google.maps.places) {
      setPredictions([]);
      setShowDropdown(false);
      return;
    }

    try {
      const autocompleteService = new google.maps.places.AutocompleteService();
      autocompleteService.getPlacePredictions(
        {
          input: val,
          locationBias: { radius: 30000, center: VALENCIA_CENTER },
          componentRestrictions: { country: 'es' }
        },
        (results, status) => {
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
      setPredictions([]);
      setShowDropdown(false);
    }
  };

  // User selects an address prediction from Google
  const handleSelectPrediction = (prediction: google.maps.places.AutocompletePrediction) => {
    setShowDropdown(false);
    const fullText = prediction.description;
    setQuery(fullText);
    onChangeExactAddress(fullText);

    if (typeof google === 'undefined' || !google.maps || !google.maps.places) {
      onChangeLocation(prediction.structured_formatting?.main_text || fullText);
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
          const formatted = place.formatted_address || fullText;
          
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

  const handleSelectArea = (area: typeof VALENCIA_AREAS[0]) => {
    onChangeCoordinates(area.lat, area.lng);
    onChangeLocation(area.name);
    onChangeExactAddress(`${area.name}, Valencia`);
    setQuery(area.name);
  };

  const handleMapClick = useCallback((e: MapMouseEvent) => {
    if (!e.detail.latLng) return;
    const newLat = e.detail.latLng.lat;
    const newLng = e.detail.latLng.lng;
    
    onChangeCoordinates(newLat, newLng);
    
    // Reverse geocode to get address
    if (typeof google !== 'undefined' && google.maps && google.maps.Geocoder) {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ location: { lat: newLat, lng: newLng } }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const address = results[0].formatted_address;
          onChangeExactAddress(address);
          setQuery(address);
          
          // Detect neighborhood
          const components = results[0].address_components;
          const neighborhood = components.find(c => 
            c.types.includes('neighborhood') || 
            c.types.includes('sublocality_level_1') || 
            c.types.includes('sublocality')
          )?.long_name;
          const locality = components.find(c => c.types.includes('locality'))?.long_name;
          
          let detected = neighborhood || locality || address.split(',')[0];
          onChangeLocation(detected);
        }
      });
    }
  }, [onChangeCoordinates, onChangeExactAddress, onChangeLocation]);

  return (
    <div className="space-y-3 p-4 bg-slate-50/80 rounded-2xl border border-slate-200" ref={containerRef}>
      {/* Title & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-purple-600 shrink-0" />
          <span>Location <span className="text-purple-600">*</span></span>
        </label>

        {/* 2 Simple Tabs */}
        <div className="inline-flex p-1 bg-slate-200/80 rounded-xl text-xs font-semibold self-start sm:self-auto gap-1">
          <button
            type="button"
            onClick={() => {
              onChangePrecision('approximate');
              if (!location && exactAddress) {
                onChangeLocation(exactAddress.split(',')[0]);
              }
            }}
            className={cn(
              "px-3 py-1.5 rounded-lg transition-all cursor-pointer text-xs flex items-center gap-1.5",
              precision === 'approximate'
                ? "bg-white text-purple-800 shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Building2 className="w-3.5 h-3.5 text-purple-600" />
            <span>Neighborhood / Area</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onChangePrecision('exact');
            }}
            className={cn(
              "px-3 py-1.5 rounded-lg transition-all cursor-pointer text-xs flex items-center gap-1.5",
              precision === 'exact'
                ? "bg-white text-purple-800 shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Navigation className="w-3.5 h-3.5 text-purple-600" />
            <span>Exact Spot (Map)</span>
          </button>
        </div>
      </div>

      {/* MODE 1: APPROXIMATE NEIGHBORHOOD */}
      {precision === 'approximate' ? (
        <div className="space-y-3">
          {/* Quick Selection Chips */}
          <div>
            <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Choose your neighborhood or area:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {VALENCIA_AREAS.map((area) => {
                const isSelected = location.trim().toLowerCase() === area.name.toLowerCase();
                return (
                  <button
                    key={area.name}
                    type="button"
                    onClick={() => handleSelectArea(area)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5",
                      isSelected
                        ? "bg-purple-600 text-white border-purple-600 shadow-2xs font-bold"
                        : "bg-white hover:bg-purple-50 text-slate-700 hover:text-purple-800 border-slate-200"
                    )}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                    <span>{area.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Or Type Custom Neighborhood */}
          <div className="pt-1">
            <div className="relative">
              <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-600" />
              <input
                type="text"
                value={location}
                onChange={(e) => {
                  onChangeLocation(e.target.value);
                  onChangeExactAddress(e.target.value ? `${e.target.value}, Valencia` : '');
                }}
                placeholder="Or type another area (e.g. Benimaclet, Torrent, Alboraya...)"
                className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none text-xs sm:text-sm font-medium text-slate-900 transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          <p className="text-[11px] text-slate-500">
            🛡️ <strong>Privacy Protected</strong>: Only the neighborhood or town name will be visible on your ad.
          </p>
        </div>
      ) : (
        /* MODE 2: EXACT ADDRESS WITH GOOGLE MAP & AUTOCOMPLETE fallback */
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-600 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => handleAddressInputChange(e.target.value)}
              onFocus={() => {
                if (predictions.length > 0) setShowDropdown(true);
              }}
              placeholder="Search street, building or square..."
              className="w-full pl-10 pr-10 py-2.5 bg-white rounded-xl border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none text-xs sm:text-sm font-medium text-slate-900 transition-all placeholder:text-slate-400"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  onChangeExactAddress('');
                  onChangeLocation('');
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Google Places Dropdown Results */}
            {showDropdown && predictions.length > 0 && (
              <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden max-h-56 overflow-y-auto">
                <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Google Maps Suggestions
                </div>
                {predictions.map((p) => (
                  <button
                    key={p.place_id}
                    type="button"
                    onClick={() => handleSelectPrediction(p)}
                    className="w-full px-3.5 py-2.5 text-left hover:bg-purple-50/70 transition-colors border-b border-slate-100 last:border-0 group flex items-start gap-2.5 cursor-pointer"
                  >
                    <MapPin className="w-4 h-4 text-slate-400 mt-0.5 group-hover:text-purple-600 shrink-0 transition-colors" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {p.structured_formatting?.main_text || p.description}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {p.structured_formatting?.secondary_text || ''}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Interactive Map Picker */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <MousePointer2 className="w-3 h-3" />
                Click on the map to set the exact spot:
              </span>
              {lat && lng && (
                <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
                  Location Set
                </span>
              )}
            </div>
            
            <div className="h-48 sm:h-56 rounded-2xl overflow-hidden border border-slate-200 shadow-inner relative group">
              <APIProvider apiKey={GOOGLE_MAPS_KEY} libraries={['places', 'marker']}>
                <Map
                  defaultCenter={lat && lng ? { lat, lng } : VALENCIA_CENTER}
                  defaultZoom={13}
                  gestureHandling={'greedy'}
                  disableDefaultUI={true}
                  onClick={handleMapClick}
                  mapId="marketplace_picker_map"
                >
                  {lat && lng && (
                    <AdvancedMarker 
                      position={{ lat, lng }} 
                      draggable={true}
                      onDragEnd={(e) => {
                        if (e.latLng) {
                          handleMapClick({ detail: { latLng: { lat: e.latLng.lat(), lng: e.latLng.lng() } } } as any);
                        }
                      }}
                    >
                      <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white animate-bounce">
                        <MapPin className="w-4 h-4 text-white" />
                      </div>
                    </AdvancedMarker>
                  )}
                </Map>
              </APIProvider>
              {!lat && (
                <div className="absolute inset-0 pointer-events-none bg-slate-900/5 backdrop-blur-[1px] flex items-center justify-center">
                   <div className="bg-white/90 px-4 py-2 rounded-full shadow-lg border border-slate-200 text-xs font-bold text-slate-700 flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-purple-600" />
                      Select location on map
                   </div>
                </div>
              )}
            </div>
          </div>

          {location && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 rounded-xl border border-purple-200/80 text-xs text-purple-900 font-medium">
              <Check className="w-3.5 h-3.5 text-purple-600 shrink-0 stroke-[2.5]" />
              <span className="truncate">Area detected: <strong>{location}</strong></span>
            </div>
          )}

          <p className="text-[11px] text-slate-500">
            🎯 <strong>Exact Location</strong>: Perfect for setting a meeting point for pickup. 
            Search above or click anywhere on the map.
          </p>
        </div>
      )}
    </div>
  );
}


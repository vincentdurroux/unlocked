import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MapPin,
  Search,
  Check,
  X,
  MousePointer2,
  LocateFixed,
  Loader2,
  AlertCircle,
  ShieldCheck,
  Building2
} from 'lucide-react';
import { cn } from '../lib/utils';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  MapMouseEvent
} from '@vis.gl/react-google-maps';

export const VALENCIA_CENTER = { lat: 39.4699, lng: -0.3763 };
export const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

export interface LocationItem {
  name: string;
  category: 'neighborhood' | 'suburb';
  zone?: string;
  lat: number;
  lng: number;
  description?: string;
}

// Exhaustive Valencia City Neighborhoods (Quartiers)
export const VALENCIA_CITY_NEIGHBORHOODS: LocationItem[] = [
  // Ciutat Vella
  { name: 'Ruzafa (Russafa)', category: 'neighborhood', zone: 'Eixample', lat: 39.4624, lng: -0.3732, description: 'Trendy, cafés, boutiques' },
  { name: 'El Carmen', category: 'neighborhood', zone: 'Ciutat Vella', lat: 39.4774, lng: -0.3802, description: 'Historic center, nightlife, arts' },
  { name: 'El Mercat', category: 'neighborhood', zone: 'Ciutat Vella', lat: 39.4740, lng: -0.3790, description: 'Central Market, Lonja' },
  { name: 'El Pilar', category: 'neighborhood', zone: 'Ciutat Vella', lat: 39.4735, lng: -0.3830, description: 'Near Guillén de Castro' },
  { name: 'La Seu', category: 'neighborhood', zone: 'Ciutat Vella', lat: 39.4760, lng: -0.3755, description: 'Cathedral, Plaza de la Virgen' },
  { name: 'La Xerea', category: 'neighborhood', zone: 'Ciutat Vella', lat: 39.4745, lng: -0.3715, description: 'Calle de la Paz, Glorieta' },
  { name: 'Sant Francesc', category: 'neighborhood', zone: 'Ciutat Vella', lat: 39.4695, lng: -0.3768, description: 'Town Hall Square, Colón shopping' },
  
  // Eixample & Gran Vía
  { name: 'Eixample / Gran Vía', category: 'neighborhood', zone: 'Eixample', lat: 39.4660, lng: -0.3690, description: 'Gran Vía Marqués del Turia' },
  { name: 'El Pla del Remei', category: 'neighborhood', zone: 'Eixample', lat: 39.4685, lng: -0.3705, description: 'Mercado de Colón, high street' },

  // Extramurs
  { name: 'Arrancapins / Extramurs', category: 'neighborhood', zone: 'Extramurs', lat: 39.4650, lng: -0.3830, description: 'Near Plaza España, Gran Vía Ramón y Cajal' },
  { name: 'El Botànic', category: 'neighborhood', zone: 'Extramurs', lat: 39.4740, lng: -0.3860, description: 'Botanic Gardens, Torres de Quart' },
  { name: 'La Petxina', category: 'neighborhood', zone: 'Extramurs', lat: 39.4715, lng: -0.3900, description: 'Paseo de la Petxina, Turia' },
  { name: 'La Roqueta', category: 'neighborhood', zone: 'Extramurs', lat: 39.4670, lng: -0.3800, description: 'San Vicente Mártir, Estación del Norte' },

  // University & North-East
  { name: 'Benimaclet', category: 'neighborhood', zone: 'North', lat: 39.4862, lng: -0.3582, description: 'Bohemian village vibe, student life' },
  { name: 'Mestalla', category: 'neighborhood', zone: 'El Pla del Real', lat: 39.4746, lng: -0.3582, description: 'Stadium, Blasco Ibáñez' },
  { name: 'Exposició', category: 'neighborhood', zone: 'El Pla del Real', lat: 39.4780, lng: -0.3640, description: 'Alameda, Palau de la Música' },
  { name: 'Jaume Roig / Viveros', category: 'neighborhood', zone: 'El Pla del Real', lat: 39.4830, lng: -0.3620, description: 'Jardines del Real' },
  { name: 'Ciutat Universitària', category: 'neighborhood', zone: 'El Pla del Real', lat: 39.4785, lng: -0.3520, description: 'Universitat de València campuses' },
  
  // Algirós & Maritime
  { name: 'El Cabañal (Cabanyal-Canyamelar)', category: 'neighborhood', zone: 'Poblats Marítims', lat: 39.4680, lng: -0.3280, description: 'Fishermen quarter, beach, gastronomy' },
  { name: 'La Malvarrosa', category: 'neighborhood', zone: 'Poblats Marítims', lat: 39.4780, lng: -0.3250, description: 'Beachfront, promenade' },
  { name: 'El Grau / Marina de Valencia', category: 'neighborhood', zone: 'Poblats Marítims', lat: 39.4600, lng: -0.3320, description: 'Marina, Port, Las Naves' },
  { name: 'Beteró', category: 'neighborhood', zone: 'Poblats Marítims', lat: 39.4720, lng: -0.3360, description: 'Between Blasco Ibáñez & beach' },
  { name: 'Nazaret (Natzaret)', category: 'neighborhood', zone: 'Poblats Marítims', lat: 39.4470, lng: -0.3340, description: 'Southern maritime district' },
  { name: 'Ayora (Aiora) / Algirós', category: 'neighborhood', zone: 'Algirós / Camins al Grau', lat: 39.4680, lng: -0.3470, description: 'Jardí d’Ayora, Santos Justo y Pastor' },
  { name: 'L’Amistat / Ciutat Jardí', category: 'neighborhood', zone: 'Algirós', lat: 39.4725, lng: -0.3470, description: 'Near Metro Amistat & CEDES' },
  { name: 'Penya-roja / Alameda', category: 'neighborhood', zone: 'Camins al Grau', lat: 39.4610, lng: -0.3490, description: 'Near Aqua, El Corte Inglés França' },
  { name: 'La Creu del Grau', category: 'neighborhood', zone: 'Camins al Grau', lat: 39.4605, lng: -0.3520, description: 'Avenida del Puerto' },

  // Arts & Sciences / South-East
  { name: 'Ciutat de les Arts i les Ciències', category: 'neighborhood', zone: 'Quatre Carreres', lat: 39.4550, lng: -0.3530, description: 'Calatrava complex, Oceanogràfic' },
  { name: 'Monteolivete (Montolivet)', category: 'neighborhood', zone: 'Quatre Carreres', lat: 39.4580, lng: -0.3620, description: 'Adjoining Ruzafa & Turia park' },
  { name: 'Malilla', category: 'neighborhood', zone: 'Quatre Carreres', lat: 39.4510, lng: -0.3780, description: 'Near Hospital La Fe & Central Park' },
  { name: 'En Corts / Fonteta de Sant Lluís', category: 'neighborhood', zone: 'Quatre Carreres', lat: 39.4530, lng: -0.3680, description: 'Near Roig Arena & Peris y Valero' },
  { name: 'La Punta', category: 'neighborhood', zone: 'Quatre Carreres', lat: 39.4420, lng: -0.3450, description: 'Traditional Huerta near port' },

  // Campanar & North-West
  { name: 'Campanar (Pueblo & Nou Campanar)', category: 'neighborhood', zone: 'Campanar', lat: 39.4812, lng: -0.3955, description: 'Historic Campanar & Bioparc area' },
  { name: 'Sant Pau / Cortes Valencianas', category: 'neighborhood', zone: 'Campanar', lat: 39.4890, lng: -0.4010, description: 'Modern residential, Palacio de Congresos' },
  { name: 'Les Tendetes / El Calvari', category: 'neighborhood', zone: 'Campanar', lat: 39.4840, lng: -0.3910, description: 'Near Av. de Campanar' },

  // Patraix & Jesús
  { name: 'Patraix', category: 'neighborhood', zone: 'Patraix', lat: 39.4600, lng: -0.3950, description: 'Charming Plaza de Patraix, family area' },
  { name: 'Sant Isidre / Safranar', category: 'neighborhood', zone: 'Patraix', lat: 39.4520, lng: -0.4000, description: 'Metro Sant Isidre, modern parks' },
  { name: 'Jesús / La Raiosa', category: 'neighborhood', zone: 'Jesús', lat: 39.4570, lng: -0.3870, description: 'Mercado de Jesús, Giorgeta' },
  { name: 'San Marcelino (Sant Marcel·lí)', category: 'neighborhood', zone: 'Jesús', lat: 39.4450, lng: -0.3910, description: 'Parque de la Rambleta' },
  { name: 'La Creu Coberta', category: 'neighborhood', zone: 'Jesús', lat: 39.4490, lng: -0.3850, description: 'Near San Vicente Mártir' },

  // Olivereta & Saïdia
  { name: 'Nou Moles (L’Olivereta)', category: 'neighborhood', zone: 'L’Olivereta', lat: 39.4680, lng: -0.4010, description: 'Near Parque de Cabecera' },
  { name: 'Tres Forques / La Llum', category: 'neighborhood', zone: 'L’Olivereta', lat: 39.4630, lng: -0.4100, description: 'Hospital General area' },
  { name: 'Marxalenes / Morvedre (La Saïdia)', category: 'neighborhood', zone: 'La Saïdia', lat: 39.4830, lng: -0.3760, description: 'Parque de Marxalenes, Sagunto street' },
  { name: 'Trinitat / Tormos (La Saïdia)', category: 'neighborhood', zone: 'La Saïdia', lat: 39.4810, lng: -0.3700, description: 'Pont de Fusta, Museo San Pío V' },

  // North & West Districts
  { name: 'Benicalap / Ciutat Fallera', category: 'neighborhood', zone: 'Benicalap', lat: 39.4930, lng: -0.3920, description: 'Parque de Benicalap, Fallas museum' },
  { name: 'Torrefiel / Els Orriols (Rascanya)', category: 'neighborhood', zone: 'Rascanya', lat: 39.4930, lng: -0.3710, description: 'Near Ronda Norte & Arena Stadium' },
  { name: 'Sant Llorenç (Rascanya)', category: 'neighborhood', zone: 'Rascanya', lat: 39.4910, lng: -0.3590, description: 'Alfahuir boulevard area' },
  { name: 'Benimàmet / Beniferri', category: 'neighborhood', zone: 'Pobles de l’Oest', lat: 39.5020, lng: -0.4240, description: 'Feria Valencia, quiet suburban feel' },
  { name: 'Pobles del Nord (Carpesa, Borbotó, Benifaraig)', category: 'neighborhood', zone: 'Pobles del Nord', lat: 39.5150, lng: -0.3800, description: 'Massarrojos, Casas de Bárcena' },
  { name: 'Pobles del Sud (El Saler, Pinedo, El Palmar)', category: 'neighborhood', zone: 'Pobles del Sud', lat: 39.3850, lng: -0.3320, description: 'El Perellonet, Castellar, Albufera' },
];

// Exhaustive Valencia Suburbs & Surrounding Towns (Banlieues & Villes alentours)
export const VALENCIA_SUBURBS: LocationItem[] = [
  // Horta Nord (North suburbs)
  { name: 'Alboraya (Alboraia / Port Saplaya / Patacona)', category: 'suburb', zone: 'Horta Nord', lat: 39.5000, lng: -0.3520, description: 'Horchata capital, Port Saplaya & Patacona beach' },
  { name: 'Godella (inc. Campolivar)', category: 'suburb', zone: 'Horta Nord', lat: 39.5180, lng: -0.4130, description: 'Campolivar luxury villas, international schools' },
  { name: 'Rocafort (inc. Santa Bárbara)', category: 'suburb', zone: 'Horta Nord', lat: 39.5310, lng: -0.4100, description: 'Santa Bárbara urbanization, prestigious suburb' },
  { name: 'Moncada (Montcada / Masies)', category: 'suburb', zone: 'Horta Nord', lat: 39.5450, lng: -0.3950, description: 'CEU University, Metro connection' },
  { name: 'Tavernes Blanques', category: 'suburb', zone: 'Horta Nord', lat: 39.5070, lng: -0.3630, description: 'Lladró museum, directly borders North Valencia' },
  { name: 'Almàssera', category: 'suburb', zone: 'Horta Nord', lat: 39.5120, lng: -0.3550, description: 'Traditional Huerta town, Metro line 3' },
  { name: 'Meliana (inc. Roca-Cúper)', category: 'suburb', zone: 'Horta Nord', lat: 39.5280, lng: -0.3490, description: 'Gastronomy, Huerta, Metro line 3' },
  { name: 'Foios', category: 'suburb', zone: 'Horta Nord', lat: 39.5390, lng: -0.3570, description: 'Metro line 3, quiet town' },
  { name: 'Albalat dels Sorells', category: 'suburb', zone: 'Horta Nord', lat: 39.5440, lng: -0.3470, description: 'Near Mercadona HQ, Metro' },
  { name: 'Museros', category: 'suburb', zone: 'Horta Nord', lat: 39.5650, lng: -0.3420, description: 'Metro line 3, residential' },
  { name: 'Massamagrell', category: 'suburb', zone: 'Horta Nord', lat: 39.5700, lng: -0.3320, description: 'Major Horta Nord hub' },
  { name: 'La Pobla de Farnals (Pueblo & Playa)', category: 'suburb', zone: 'Horta Nord', lat: 39.5780, lng: -0.3260, description: 'Marina, beaches & lively town center' },
  { name: 'El Puig de Santa Maria (Pueblo & Playa)', category: 'suburb', zone: 'Horta Nord', lat: 39.5890, lng: -0.3030, description: 'Historic Monastery & coastal villas' },
  { name: 'Puçol (Puzol / Los Monasterios / Alfinach)', category: 'suburb', zone: 'Horta Nord', lat: 39.6170, lng: -0.3030, description: 'Los Monasterios & Alfinach luxury gated communities' },
  { name: 'Alfara del Patriarca', category: 'suburb', zone: 'Horta Nord', lat: 39.5380, lng: -0.3860, description: 'Adjacent to Moncada & CEU' },
  { name: 'Vinalesa', category: 'suburb', zone: 'Horta Nord', lat: 39.5270, lng: -0.3700, description: 'Charming Huerta village' },
  { name: 'Bonrepòs i Mirambell', category: 'suburb', zone: 'Horta Nord', lat: 39.5180, lng: -0.3640, description: 'Close to Tavernes & Almàssera' },
  { name: 'Massalfassar', category: 'suburb', zone: 'Horta Nord', lat: 39.5580, lng: -0.3250, description: 'Coastal railway station' },

  // Camp de Túria & North-West
  { name: "L'Eliana (La Eliana / Montesol / Entrepinos)", category: 'suburb', zone: 'Camp de Túria', lat: 39.5662, lng: -0.5284, description: 'Family-friendly expat hub, villas & garden estates' },
  { name: 'Bétera (Torre en Conill / Mas Camarena)', category: 'suburb', zone: 'Camp de Túria', lat: 39.5910, lng: -0.4590, description: 'Scorpion Golf Club, gated golf villas & schools' },
  { name: 'San Antonio de Benagéber (Colinas / Montesano)', category: 'suburb', zone: 'Camp de Túria', lat: 39.5610, lng: -0.4990, description: 'Direct highway access to Valencia, modern chalets' },
  { name: 'La Cañada (Paterna - El Plantío / Montecañada)', category: 'suburb', zone: 'Camp de Túria / Paterna', lat: 39.5298, lng: -0.4730, description: 'Pinewood residential suburb, international schools' },
  { name: 'Paterna (Centro, Valterna, Campamento, La Coma)', category: 'suburb', zone: 'Metropolitan West', lat: 39.5020, lng: -0.4400, description: 'Heron City, Kinepolis & Valterna' },
  { name: 'La Pobla de Vallbona', category: 'suburb', zone: 'Camp de Túria', lat: 39.5920, lng: -0.5530, description: 'El Osito commercial center, expanding residential' },
  { name: 'Riba-roja de Túria (inc. Santa Mónica / Reva)', category: 'suburb', zone: 'Camp de Túria', lat: 39.5470, lng: -0.5690, description: 'Turia river park, industrial and residential' },
  { name: 'Llíria', category: 'suburb', zone: 'Camp de Túria', lat: 39.6250, lng: -0.5960, description: 'City of music, historical capital of Camp de Túria' },
  { name: 'Benaguasil', category: 'suburb', zone: 'Camp de Túria', lat: 39.5940, lng: -0.5840, description: 'Metro line 2 connection' },
  { name: 'Vilamarxant', category: 'suburb', zone: 'Camp de Túria', lat: 39.5670, lng: -0.6220, description: 'Parque Natural del Túria' },
  { name: 'Náquera (Nàquera / Corral Nou / Mont-Ros)', category: 'suburb', zone: 'Sierra Calderona', lat: 39.6580, lng: -0.4230, description: 'Foothills of Sierra Calderona, summer villas' },
  { name: 'Serra', category: 'suburb', zone: 'Sierra Calderona', lat: 39.6860, lng: -0.4290, description: 'Heart of Sierra Calderona mountains' },

  // Horta Oest (Western Suburbs)
  { name: 'Mislata', category: 'suburb', zone: 'Horta Oest', lat: 39.4750, lng: -0.4170, description: 'Parque de Cabecera, dense urban extension' },
  { name: 'Quart de Poblet', category: 'suburb', zone: 'Horta Oest', lat: 39.4830, lng: -0.4430, description: 'Metro lines 3, 5, 9' },
  { name: 'Manises (Centro / Aeropuerto)', category: 'suburb', zone: 'Horta Oest', lat: 39.4930, lng: -0.4570, description: 'Valencia Airport & ceramic traditions' },
  { name: 'Xirivella (Chirivella)', category: 'suburb', zone: 'Horta Oest', lat: 39.4650, lng: -0.4260, description: 'Next to riverbed and motorway' },
  { name: 'Alaquàs (Alacuás)', category: 'suburb', zone: 'Horta Oest', lat: 39.4580, lng: -0.4610, description: 'Castell d’Alaquàs' },
  { name: 'Aldaia (Aldaya / Bonaire)', category: 'suburb', zone: 'Horta Oest', lat: 39.4640, lng: -0.4610, description: 'Bonaire Shopping Mall' },

  // Horta Sud (Southern Suburbs)
  { name: 'Torrent (Centro, El Vedat, Santa Apolonia)', category: 'suburb', zone: 'Horta Sud', lat: 39.4350, lng: -0.4650, description: 'Largest satellite city, El Vedat hill & pine villas' },
  { name: 'Picanya', category: 'suburb', zone: 'Horta Sud', lat: 39.4360, lng: -0.4350, description: 'Green residential municipality, Metro lines 1, 2, 7' },
  { name: 'Paiporta', category: 'suburb', zone: 'Horta Sud', lat: 39.4280, lng: -0.4180, description: 'Connected by Metro lines 1, 2, 7' },
  { name: 'Sedaví', category: 'suburb', zone: 'Horta Sud', lat: 39.4250, lng: -0.3860, description: 'Commercial furniture district' },
  { name: 'Alfafar (Centro / MN4 / IKEA area)', category: 'suburb', zone: 'Horta Sud', lat: 39.4210, lng: -0.3900, description: 'IKEA & MN4 shopping zone' },
  { name: 'Benetússer (Benetúser)', category: 'suburb', zone: 'Horta Sud', lat: 39.4230, lng: -0.3970, description: 'Renfe Cercanías connection' },
  { name: 'Massanassa', category: 'suburb', zone: 'Horta Sud', lat: 39.4100, lng: -0.3990, description: 'Cercanías train station' },
  { name: 'Catarroja (Port de Catarroja)', category: 'suburb', zone: 'Horta Sud', lat: 39.4030, lng: -0.4030, description: 'All i pebre birthplace, Albufera harbor' },
  { name: 'Albal', category: 'suburb', zone: 'Horta Sud', lat: 39.3970, lng: -0.4150, description: 'Near Santa Anna hermitage' },
  { name: 'Beniparrell', category: 'suburb', zone: 'Horta Sud', lat: 39.3810, lng: -0.4100, description: 'Agricultural & industrial zone' },
  { name: 'Silla', category: 'suburb', zone: 'Horta Sud', lat: 39.3620, lng: -0.4120, description: 'Port of Silla, Albufera gate' },
  { name: 'Picassent (inc. Tancat de l’Alter / El Pinar)', category: 'suburb', zone: 'Horta Sud', lat: 39.3620, lng: -0.4600, description: 'Tancat de l’Alter gated community & Metro line 1' },
  { name: 'Alcàsser (Alcácer)', category: 'suburb', zone: 'Horta Sud', lat: 39.3700, lng: -0.4440, description: 'Horta Sud agricultural & residential' },

  // Sagunto & North Coast
  { name: 'Sagunto / Puerto de Sagunto', category: 'suburb', zone: 'Camp de Morvedre', lat: 39.6800, lng: -0.2790, description: 'Roman Castle, theatre, port & beaches' },
  { name: "Canet d'en Berenguer", category: 'suburb', zone: 'Camp de Morvedre', lat: 39.6820, lng: -0.2230, description: 'Famous wide golden sand beach' },

  // Albufera Coast & South
  { name: 'El Saler (Albufera)', category: 'suburb', zone: 'Coast South', lat: 39.3840, lng: -0.3320, description: 'Natural dunes, pine forest & golf' },
  { name: 'El Perelló / El Perellonet', category: 'suburb', zone: 'Coast South', lat: 39.2800, lng: -0.2780, description: 'Seaside village, beach flats & tomato farmland' },
  { name: 'Cullera', category: 'suburb', zone: 'Ribera Baixa / Coast', lat: 39.1640, lng: -0.2540, description: 'Castle, mountain, bay and beaches' },
  { name: 'Sueca (inc. Mareny de Barraquetes)', category: 'suburb', zone: 'Ribera Baixa', lat: 39.2020, lng: -0.3120, description: 'Rice fields of Valencia, Paella capital' },
  { name: 'Sollana', category: 'suburb', zone: 'Ribera Baixa', lat: 39.2780, lng: -0.3810, description: 'Albufera shore, Renfe train' },
  { name: 'Alzira', category: 'suburb', zone: 'Ribera Alta', lat: 39.1510, lng: -0.4340, description: 'Capital of Ribera Alta, Hospital, mountains' },
  { name: 'Algemesí', category: 'suburb', zone: 'Ribera Alta', lat: 39.2190, lng: -0.4370, description: 'Muixeranga UNESCO heritage' },
  { name: 'Carlet', category: 'suburb', zone: 'Ribera Alta', lat: 39.2260, lng: -0.5200, description: 'Metro line 1 terminus' },

  // Western Corridor (A-3)
  { name: 'Chiva (inc. Calicanto / El Bosque)', category: 'suburb', zone: 'Hoya de Buñol', lat: 39.4720, lng: -0.7180, description: 'El Bosque golf resort & Calicanto mountain villas' },
  { name: 'Cheste', category: 'suburb', zone: 'Hoya de Buñol', lat: 39.4940, lng: -0.6650, description: 'Ricardo Tormo MotoGP Circuit' },
  { name: 'Godelleta', category: 'suburb', zone: 'Hoya de Buñol', lat: 39.4220, lng: -0.6870, description: 'Vineyards & rural chalets' },
  { name: 'Buñol (La Tomatina)', category: 'suburb', zone: 'Hoya de Buñol', lat: 39.4190, lng: -0.7910, description: 'La Tomatina festival, historic castle & rivers' },
  { name: 'Turís', category: 'suburb', zone: 'Ribera Alta', lat: 39.3900, lng: -0.7120, description: 'Country villas, wineries' },
];

// Complete list for backward compatibility
export const VALENCIA_AREAS: { name: string; lat: number; lng: number }[] = [
  ...VALENCIA_CITY_NEIGHBORHOODS.map(n => ({ name: n.name, lat: n.lat, lng: n.lng })),
  ...VALENCIA_SUBURBS.map(s => ({ name: s.name, lat: s.lat, lng: s.lng }))
];

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
  const [isLocating, setIsLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync with outer address changes
  useEffect(() => {
    if (exactAddress) {
      setQuery(exactAddress);
    } else if (location) {
      setQuery(location);
    }
  }, [exactAddress, location]);

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
          locationBias: { radius: 35000, center: VALENCIA_CENTER },
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

  // Place/Move marker directly from Map click, GPS or drag
  const handleMapPinpoint = useCallback((newLat: number, newLng: number) => {
    onChangeCoordinates(newLat, newLng);

    // Reverse geocode to get address & area name
    if (typeof google !== 'undefined' && google.maps && google.maps.Geocoder) {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ location: { lat: newLat, lng: newLng } }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const address = results[0].formatted_address;
          onChangeExactAddress(address);
          setQuery(address);
          
          const components = results[0].address_components || [];
          const neighborhood = components.find(c => 
            c.types.includes('neighborhood') || 
            c.types.includes('sublocality_level_1') || 
            c.types.includes('sublocality')
          )?.long_name;
          const locality = components.find(c => c.types.includes('locality'))?.long_name;
          
          const detected = neighborhood || locality || address.split(',')[0];
          onChangeLocation(detected);
        }
      });
    }
  }, [onChangeCoordinates, onChangeExactAddress, onChangeLocation]);

  const handleMapClick = useCallback((e: MapMouseEvent) => {
    if (!e.detail.latLng) return;
    handleMapPinpoint(e.detail.latLng.lat, e.detail.latLng.lng);
  }, [handleMapPinpoint]);

  // GPS / Geolocation "Locate Me" handler
  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;
        setIsLocating(false);
        handleMapPinpoint(userLat, userLng);
      },
      (err) => {
        setIsLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError('Location access was denied. Please allow GPS permission in your browser or search your address.');
        } else {
          setGeoError('Could not fetch GPS location. Please type your address or click on the map.');
        }
        setTimeout(() => setGeoError(null), 6000);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }, [handleMapPinpoint]);

  // Current center coordinates for map display
  const mapCenter = lat && lng ? { lat, lng } : VALENCIA_CENTER;
  const isApproximate = precision === 'approximate';

  return (
    <div className="space-y-3 p-4 bg-slate-50/90 rounded-2xl border border-slate-200" ref={containerRef}>
      {/* Title */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-purple-600 shrink-0" />
          <span>Location <span className="text-purple-600">*</span></span>
        </label>
        {lat && lng && (
          <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
            📍 Pinpoint Set
          </span>
        )}
      </div>

      {/* SINGLE UNIFIED SEARCH WITH AUTOCOMPLETE & LOCATE ME */}
      <div className="space-y-3">
        {/* Search input with Locate Me GPS button */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-600 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => handleAddressInputChange(e.target.value)}
              onFocus={() => {
                if (predictions.length > 0) setShowDropdown(true);
              }}
              placeholder="Search exact street, area or landmark in Valencia..."
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

          {/* GPS Locate Me Button */}
          <button
            type="button"
            onClick={handleLocateMe}
            disabled={isLocating}
            className="px-3.5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95"
            title="Detect my current location using GPS"
          >
            {isLocating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LocateFixed className="w-4 h-4 stroke-[2.5]" />
            )}
            <span className="hidden sm:inline">{isLocating ? 'Locating...' : 'Locate Me'}</span>
          </button>
        </div>

        {/* Geolocation Error Alert if any */}
        {geoError && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="flex-1">{geoError}</span>
            <button 
              type="button" 
              onClick={() => setGeoError(null)} 
              className="p-0.5 hover:bg-rose-100 rounded text-rose-500 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Interactive Google Map with Pinpoint */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <MousePointer2 className="w-3.5 h-3.5 text-purple-600" />
              Click on the map or drag the pin to adjust position:
            </span>
          </div>
          
          <div className="h-44 sm:h-52 rounded-2xl overflow-hidden border border-slate-200 shadow-inner relative group">
            <APIProvider apiKey={GOOGLE_MAPS_KEY} libraries={['places', 'marker']}>
              <Map
                defaultCenter={mapCenter}
                center={mapCenter}
                defaultZoom={lat && lng ? 15 : 13}
                gestureHandling={'greedy'}
                disableDefaultUI={true}
                onClick={handleMapClick}
                mapId="marketplace_picker_map_single"
                className="w-full h-full cursor-crosshair"
              >
                {lat && lng && (
                  <AdvancedMarker 
                    position={{ lat, lng }} 
                    draggable={true}
                    onDragEnd={(e) => {
                      if (e.latLng) {
                        handleMapPinpoint(e.latLng.lat(), e.latLng.lng());
                      }
                    }}
                  >
                    <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white animate-bounce cursor-grab active:cursor-grabbing">
                      <MapPin className="w-4 h-4 text-white" />
                    </div>
                  </AdvancedMarker>
                )}
              </Map>
            </APIProvider>
            {!lat && (
              <div 
                onClick={() => handleMapPinpoint(VALENCIA_CENTER.lat, VALENCIA_CENTER.lng)}
                className="absolute inset-0 bg-slate-900/10 backdrop-blur-[1px] flex items-center justify-center cursor-pointer hover:bg-slate-900/5 transition-colors"
              >
                 <div className="bg-white/95 px-4 py-2 rounded-full shadow-lg border border-slate-200 text-xs font-bold text-slate-700 flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-purple-600" />
                    Click anywhere on the map to place your pin
                 </div>
              </div>
            )}
          </div>
        </div>

        {/* Real-time Address & Detected Area Display */}
        {(exactAddress || location) && (
          <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Check className="w-4 h-4 text-purple-600 shrink-0 stroke-[2.5]" />
                <span className="text-xs font-semibold text-slate-800 truncate">
                  {exactAddress || location}
                </span>
              </div>
              {location && (
                <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-lg text-[10px] font-bold border border-purple-200 shrink-0">
                  {location}
                </span>
              )}
            </div>
          </div>
        )}

        {/* PRIVACY CHECKBOX: HIDE EXACT ADDRESS & SHOW APPROXIMATE NEIGHBORHOOD */}
        <div className={cn(
          "p-3.5 rounded-xl border transition-all select-none cursor-pointer",
          isApproximate 
            ? "bg-emerald-50/70 border-emerald-200" 
            : "bg-white border-slate-200"
        )}>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isApproximate}
              onChange={(e) => onChangePrecision(e.target.checked ? 'approximate' : 'exact')}
              className="mt-0.5 w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300 cursor-pointer accent-purple-600"
            />
            <div className="flex-1 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-slate-900">
                {isApproximate ? (
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <Building2 className="w-4 h-4 text-slate-500 shrink-0" />
                )}
                <span>Hide exact street address (show only approximate area on listing)</span>
              </div>
              <p className="text-[11px] mt-1 leading-relaxed text-slate-600">
                {isApproximate ? (
                  <span>
                    🛡️ <strong>Privacy protected</strong>: Buyers will only see your approximate area/neighborhood (<strong>{location || 'Valencia'}</strong>) on the public listing.
                  </span>
                ) : (
                  <span className="text-purple-700">
                    🎯 <strong>Exact address visible</strong>: Buyers will see the full street address on the listing.
                  </span>
                )}
              </p>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}

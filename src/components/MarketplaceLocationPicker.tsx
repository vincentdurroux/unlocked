import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  MapPin,
  Search,
  Check,
  X,
  Building2,
  Navigation,
  MousePointer2,
  ChevronRight,
  Compass,
  TreePine,
  Home
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
  const [filterSearch, setFilterSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'neighborhoods' | 'suburbs'>('all');
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

  // Filtered Neighborhoods & Suburbs based on user search query
  const filteredNeighborhoods = useMemo(() => {
    if (!filterSearch.trim()) return VALENCIA_CITY_NEIGHBORHOODS;
    const q = filterSearch.toLowerCase();
    return VALENCIA_CITY_NEIGHBORHOODS.filter(n =>
      n.name.toLowerCase().includes(q) ||
      (n.zone && n.zone.toLowerCase().includes(q)) ||
      (n.description && n.description.toLowerCase().includes(q))
    );
  }, [filterSearch]);

  const filteredSuburbs = useMemo(() => {
    if (!filterSearch.trim()) return VALENCIA_SUBURBS;
    const q = filterSearch.toLowerCase();
    return VALENCIA_SUBURBS.filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.zone && s.zone.toLowerCase().includes(q)) ||
      (s.description && s.description.toLowerCase().includes(q))
    );
  }, [filterSearch]);

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

  const handleSelectLocationItem = (item: LocationItem) => {
    onChangeCoordinates(item.lat, item.lng);
    onChangeLocation(item.name);
    const suffix = item.category === 'neighborhood' ? ', Valencia' : ', Valencia (Comunidad Valenciana)';
    onChangeExactAddress(`${item.name}${suffix}`);
    setQuery(item.name);
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
          
          const detected = neighborhood || locality || address.split(',')[0];
          onChangeLocation(detected);
        }
      });
    }
  }, [onChangeCoordinates, onChangeExactAddress, onChangeLocation]);

  const isCurrentSelection = (name: string) => {
    if (!location) return false;
    const normA = location.trim().toLowerCase().split('(')[0].trim();
    const normB = name.trim().toLowerCase().split('(')[0].trim();
    return normA === normB || location.trim().toLowerCase() === name.trim().toLowerCase();
  };

  return (
    <div className="space-y-3.5 p-4 bg-slate-50/90 rounded-2xl border border-slate-200" ref={containerRef}>
      {/* Title & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-purple-600 shrink-0" />
          <span>Location <span className="text-purple-600">*</span></span>
        </label>

        {/* 2 Clear Tabs */}
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
            <span>Select from List</span>
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
            <span>Address & Map</span>
          </button>
        </div>
      </div>

      {/* MODE 1: EXHAUSTIVE SEPARATED LIST OF NEIGHBORHOODS & SUBURBS */}
      {precision === 'approximate' ? (
        <div className="space-y-3">
          {/* Quick Filter Search & Category Tabs */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-600 pointer-events-none" />
              <input
                type="text"
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                placeholder="Filter neighborhoods or suburbs (e.g. Ruzafa, L'Eliana, Bétera, Benimaclet, Torrent...)"
                className="w-full pl-10 pr-9 py-2.5 bg-white rounded-xl border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none text-xs sm:text-sm font-medium text-slate-900 transition-all placeholder:text-slate-400"
              />
              {filterSearch && (
                <button
                  type="button"
                  onClick={() => setFilterSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Sub-tabs: All / Quartiers (City) / Suburbs (Périphérie) */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={cn(
                  "px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 border shrink-0",
                  activeTab === 'all'
                    ? "bg-purple-600 text-white border-purple-600 shadow-2xs font-bold"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                )}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>All Locations ({VALENCIA_CITY_NEIGHBORHOODS.length + VALENCIA_SUBURBS.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('neighborhoods')}
                className={cn(
                  "px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 border shrink-0",
                  activeTab === 'neighborhoods'
                    ? "bg-purple-600 text-white border-purple-600 shadow-2xs font-bold"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                )}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>🏙️ Quartiers de Valencia ({VALENCIA_CITY_NEIGHBORHOODS.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('suburbs')}
                className={cn(
                  "px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 border shrink-0",
                  activeTab === 'suburbs'
                    ? "bg-purple-600 text-white border-purple-600 shadow-2xs font-bold"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                )}
              >
                <TreePine className="w-3.5 h-3.5" />
                <span>🏡 Suburbs & Localités ({VALENCIA_SUBURBS.length})</span>
              </button>
            </div>
          </div>

          {/* Quick HTML Dropdown Select for Instant Keyboard / Direct Access */}
          <div className="relative">
            <select
              value={location}
              onChange={(e) => {
                const val = e.target.value;
                if (!val) return;
                const found = [...VALENCIA_CITY_NEIGHBORHOODS, ...VALENCIA_SUBURBS].find(i => i.name === val);
                if (found) {
                  handleSelectLocationItem(found);
                } else {
                  onChangeLocation(val);
                  onChangeExactAddress(`${val}, Valencia`);
                }
              }}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 cursor-pointer"
            >
              <option value="">-- Choose or scroll to your neighborhood / suburb --</option>
              <optgroup label="🏙️ Quartiers de Valencia (City Neighborhoods)">
                {VALENCIA_CITY_NEIGHBORHOODS.map(n => (
                  <option key={n.name} value={n.name}>
                    {n.name} {n.zone ? `(${n.zone})` : ''}
                  </option>
                ))}
              </optgroup>
              <optgroup label="🏡 Suburbs & Localités autour de Valencia (Surrounding Towns)">
                {VALENCIA_SUBURBS.map(s => (
                  <option key={s.name} value={s.name}>
                    {s.name} {s.zone ? `(${s.zone})` : ''}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Selected Location Pill */}
          {location && (
            <div className="flex items-center justify-between px-3.5 py-2 bg-purple-50 rounded-xl border border-purple-200 text-xs text-purple-900 font-medium">
              <div className="flex items-center gap-2 truncate">
                <Check className="w-4 h-4 text-purple-600 shrink-0 stroke-[2.5]" />
                <span className="truncate">Selected area: <strong className="text-purple-950 font-bold">{location}</strong></span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onChangeLocation('');
                  onChangeExactAddress('');
                }}
                className="text-[11px] font-bold text-purple-700 hover:text-purple-900 hover:underline cursor-pointer shrink-0 ml-2"
              >
                Change
              </button>
            </div>
          )}

          {/* Structured Scrollable List with Headers separating Quartiers & Suburbs */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs max-h-72 overflow-y-auto divide-y divide-slate-100">
            {/* SECTION 1: VALENCIA CITY NEIGHBORHOODS */}
            {(activeTab === 'all' || activeTab === 'neighborhoods') && filteredNeighborhoods.length > 0 && (
              <div>
                <div className="sticky top-0 z-10 px-3.5 py-2 bg-slate-100/95 backdrop-blur-xs border-b border-slate-200/80 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-purple-600" />
                    Quartiers de Valencia (City Neighborhoods)
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                    {filteredNeighborhoods.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:gap-px sm:bg-slate-100">
                  {filteredNeighborhoods.map((area) => {
                    const isSelected = isCurrentSelection(area.name);
                    return (
                      <button
                        key={area.name}
                        type="button"
                        onClick={() => handleSelectLocationItem(area)}
                        className={cn(
                          "w-full text-left px-3.5 py-2.5 transition-colors flex items-center justify-between gap-2 cursor-pointer bg-white",
                          isSelected
                            ? "bg-purple-50/90 text-purple-900 font-bold"
                            : "hover:bg-slate-50 text-slate-800"
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold truncate">{area.name}</span>
                            {area.zone && (
                              <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 shrink-0">
                                {area.zone}
                              </span>
                            )}
                          </div>
                          {area.description && (
                            <p className="text-[10px] text-slate-400 truncate mt-0.5">{area.description}</p>
                          )}
                        </div>
                        {isSelected ? (
                          <Check className="w-4 h-4 text-purple-600 shrink-0 stroke-[2.5]" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SECTION 2: SUBURBS & SURROUNDING LOCALITIES */}
            {(activeTab === 'all' || activeTab === 'suburbs') && filteredSuburbs.length > 0 && (
              <div>
                <div className="sticky top-0 z-10 px-3.5 py-2 bg-emerald-50/95 backdrop-blur-xs border-y border-emerald-100 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                    <TreePine className="w-3.5 h-3.5 text-emerald-600" />
                    Suburbs & Localités autour de Valencia (Surroundings)
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-full border border-emerald-200">
                    {filteredSuburbs.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:gap-px sm:bg-slate-100">
                  {filteredSuburbs.map((area) => {
                    const isSelected = isCurrentSelection(area.name);
                    return (
                      <button
                        key={area.name}
                        type="button"
                        onClick={() => handleSelectLocationItem(area)}
                        className={cn(
                          "w-full text-left px-3.5 py-2.5 transition-colors flex items-center justify-between gap-2 cursor-pointer bg-white",
                          isSelected
                            ? "bg-emerald-50 text-emerald-950 font-bold"
                            : "hover:bg-slate-50 text-slate-800"
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold truncate">{area.name}</span>
                            {area.zone && (
                              <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-emerald-100/70 text-emerald-800 shrink-0">
                                {area.zone}
                              </span>
                            )}
                          </div>
                          {area.description && (
                            <p className="text-[10px] text-slate-400 truncate mt-0.5">{area.description}</p>
                          )}
                        </div>
                        {isSelected ? (
                          <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {filteredNeighborhoods.length === 0 && filteredSuburbs.length === 0 && (
              <div className="p-6 text-center text-slate-500">
                <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">No locality found matching "{filterSearch}"</p>
                <p className="text-[11px] text-slate-400 mt-0.5">You can type any custom neighborhood name below.</p>
              </div>
            )}
          </div>

          {/* Or Type Custom Neighborhood */}
          <div className="pt-0.5">
            <div className="relative">
              <Home className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-600 pointer-events-none" />
              <input
                type="text"
                value={location}
                onChange={(e) => {
                  onChangeLocation(e.target.value);
                  onChangeExactAddress(e.target.value ? `${e.target.value}, Valencia` : '');
                }}
                placeholder="Or type a specific urbanization or custom area (e.g. Torre en Conill, El Vedat...)"
                className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none text-xs sm:text-sm font-medium text-slate-900 transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <span>🛡️</span>
            <span><strong>Privacy Protected</strong>: Only the neighborhood or town name is visible publicly on your ad.</span>
          </p>
        </div>
      ) : (
        /* MODE 2: EXACT ADDRESS WITH GOOGLE MAP & AUTOCOMPLETE */
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
              placeholder="Search address or landmark with Google autocomplete..."
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
                Click on the map to place your marker:
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

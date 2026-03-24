'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, useMap } from 'react-leaflet';
import L from 'leaflet';

export interface Site {
  id: number;
  address: string;
  county: string;
  municipality: string;
  township: string;
  acreage: number | null;
  sewer: string;
  dev_types: string;
  zoning: string;
  status: 'yes' | 'no' | 'undecided';
  notes: string;
  lat: number | null;
  lng: number | null;
  nj_property_records_url: string;
  polygon_coords: string;
  pipeline_stage: string;
  created_at: string;
  updated_at: string;
}

function createIcon(status: string) {
  const colors = { yes: '#22c55e', no: '#ef4444', undecided: '#9ca3af' };
  const color = colors[status as keyof typeof colors] || colors.undecided;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="24" height="36">
    <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="${color}" stroke="white" stroke-width="1.5"/>
    <circle cx="12" cy="12" r="5" fill="white" opacity="0.9"/>
  </svg>`;
  return L.divIcon({
    html: svg,
    iconSize: [24, 36],
    iconAnchor: [12, 36],
    popupAnchor: [0, -36],
    className: '',
  });
}

function FlyTo({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, 14, { duration: 1.2 });
  }, [center, map]);
  return null;
}

interface Props {
  sites: Site[];
  selectedId: number | null;
  onSelect: (site: Site) => void;
  flyTo: [number, number] | null;
}

export default function SiteMap({ sites, selectedId, onSelect, flyTo }: Props) {
  const mapRef = useRef(null);

  return (
    <MapContainer
      center={[40.1, -74.7]}
      zoom={8}
      className="w-full h-full"
      ref={mapRef}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        maxZoom={19}
      />
      <FlyTo center={flyTo} />
      {sites.map(site => {
        if (!site.lat || !site.lng) return null;
        const icon = createIcon(site.status);
        const isSelected = site.id === selectedId;

        let polygon: [number, number][] = [];
        try {
          const raw = typeof site.polygon_coords === 'string' ? JSON.parse(site.polygon_coords) : site.polygon_coords;
          if (Array.isArray(raw) && raw.length > 0) {
            polygon = raw.map((c: number[]) => [c[1], c[0]] as [number, number]);
          }
        } catch {}

        const polyColor = site.status === 'yes' ? '#22c55e' : site.status === 'no' ? '#ef4444' : '#9ca3af';

        return (
          <div key={site.id}>
            <Marker
              position={[site.lat, site.lng]}
              icon={icon}
              zIndexOffset={isSelected ? 1000 : 0}
              eventHandlers={{ click: () => onSelect(site) }}
            >
              <Popup>
                <div className="text-sm font-medium">{site.address}</div>
                {site.acreage && <div className="text-xs opacity-70">{site.acreage} acres</div>}
              </Popup>
            </Marker>
            {polygon.length > 2 && (
              <Polygon
                positions={polygon}
                pathOptions={{
                  color: polyColor,
                  fillColor: polyColor,
                  fillOpacity: isSelected ? 0.35 : 0.15,
                  weight: isSelected ? 2 : 1,
                }}
                eventHandlers={{ click: () => onSelect(site) }}
              />
            )}
          </div>
        );
      })}
    </MapContainer>
  );
}

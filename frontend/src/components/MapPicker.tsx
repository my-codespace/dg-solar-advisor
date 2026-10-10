// ── Roof Area Map (Leaflet + OpenStreetMap, no paid keys) ─────────────────────

import { useEffect, useRef, useState } from 'react';
import { Map as MapIcon, Edit3, Trash2 } from 'lucide-react';

// Dynamic import to avoid SSR issues
let L: typeof import('leaflet') | null = null;

interface MapPickerProps {
  lat: number;
  lon: number;
  roofAreaM2: number;
  onAreaChange: (area: number) => void;
  onLocationChange: (lat: number, lon: number) => void;
}

export function RoofMapPicker({ lat, lon, roofAreaM2, onAreaChange, onLocationChange }: MapPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<import('leaflet').Map | null>(null);
  const polygonRef = useRef<import('leaflet').Polygon | null>(null);
  const [drawing, setDrawing] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [points, setPoints] = useState<[number, number][]>([]);
  const [area, setArea] = useState(roofAreaM2);
  const [mapReady, setMapReady] = useState(false);

  // Compute polygon area in m² using shoelace + lat/lon → meters conversion
  function computeArea(pts: [number, number][]): number {
    if (pts.length < 3) return 0;
    let total = 0;
    const R = 6371000; // Earth radius in meters
    for (let i = 0; i < pts.length; i++) {
      const j = (i + 1) % pts.length;
      const lat1 = (pts[i][0] * Math.PI) / 180;
      const lat2 = (pts[j][0] * Math.PI) / 180;
      const dLon = ((pts[j][1] - pts[i][1]) * Math.PI) / 180;
      total += dLon * (2 + Math.sin(lat1) + Math.sin(lat2));
    }
    return Math.abs((total * R * R) / 2);
  }

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    import('leaflet').then((leaflet) => {
      L = leaflet;

      // Fix Leaflet default icon path in Vite
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      const map = L.map(mapRef.current!, {
        center: [lat, lon],
        zoom: 18,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 22,
      }).addTo(map);

      // Also add satellite-ish layer option (ESRI)
      const satellite = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { attribution: '© ESRI', maxZoom: 22 }
      );

      const baseMaps = {
        'Street': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap',
        }),
        'Satellite': satellite,
      };
      L.control.layers(baseMaps).addTo(map);
      satellite.addTo(map); // Default to satellite for roof drawing

      // Map click → add polygon point
      map.on('click', (e: import('leaflet').LeafletMouseEvent) => {
        setDrawing(true);
        setPoints(prev => {
          const newPts = [...prev, [e.latlng.lat, e.latlng.lng] as [number, number]];

          // Update or create polygon
          if (polygonRef.current) {
            polygonRef.current.remove();
          }
          if (newPts.length >= 2 && mapInstance.current) {
            polygonRef.current = L!.polygon(newPts, {
              color: '#fbbf24',
              fillColor: '#fbbf24',
              fillOpacity: 0.25,
              weight: 2,
            }).addTo(mapInstance.current);
          }

          const a = computeArea(newPts);
          setArea(Math.round(a));
          onAreaChange(Math.round(a));
          onLocationChange(newPts[0][0], newPts[0][1]);
          return newPts;
        });
      });

      mapInstance.current = map;
      setMapReady(true);
    });

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetPolygon() {
    setPoints([]);
    setDrawing(false);
    if (polygonRef.current) {
      polygonRef.current.remove();
      polygonRef.current = null;
    }
    setArea(0);
    onAreaChange(0);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <MapIcon size={14} />
          <span>Click on the map to draw your rooftop polygon</span>
        </div>
        <div className="flex gap-2">
          {drawing && (
            <button
              type="button"
              onClick={resetPolygon}
              className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors px-2 py-1 rounded-lg hover:bg-red-400/10"
            >
              <Trash2 size={12} /> Reset
            </button>
          )}
          {!drawing && (
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <Edit3 size={11} /> Click map to start
            </span>
          )}
        </div>
      </div>

      <div
        ref={mapRef}
        className="w-full h-72 rounded-xl border border-white/10 overflow-hidden"
        id="roof-map"
      />

      {area > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-solar-500/10 border border-solar-400/25">
          <span className="text-sm text-solar-300 font-medium">
            Drawn area: {area.toLocaleString('en-IN')} m²
          </span>
          <span className="text-xs text-slate-500">
            (usable ≈ {Math.round(area * 0.6).toLocaleString('en-IN')} m² at 60%)
          </span>
        </div>
      )}
      {!mapReady && (
        <div className="w-full h-72 rounded-xl border border-white/10 bg-slate-800 flex items-center justify-center">
          <span className="text-slate-500 text-sm">Loading map…</span>
        </div>
      )}
    </div>
  );
}

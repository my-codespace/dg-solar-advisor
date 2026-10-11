// ── Roof Area Map (Leaflet + OpenStreetMap, no paid keys) ─────────────────────
// Fix: Use polyline while drawing; close to polygon only on double-click / Finish button.
// This prevents the auto-close-at-3-points triangle bug.

import { useEffect, useRef, useState } from 'react';
import { Map as MapIcon, Edit3, Trash2, CheckSquare } from 'lucide-react';

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
  const polylineRef = useRef<import('leaflet').Polyline | null>(null);   // open line while drawing
  const polygonRef = useRef<import('leaflet').Polygon | null>(null);     // closed polygon after Finish
  const markersRef = useRef<import('leaflet').CircleMarker[]>([]);       // dot markers per click
  const ptsRef = useRef<[number, number][]>([]);                         // current point list

  const [drawing, setDrawing] = useState(false);
  const [finished, setFinished] = useState(false);
  const [ptCount, setPtCount] = useState(0);
  const [area, setArea] = useState(roofAreaM2);
  const [mapReady, setMapReady] = useState(false);

  // Spherical excess area formula (accurate for small areas on Earth)
  function computeArea(pts: [number, number][]): number {
    if (pts.length < 3) return 0;
    let total = 0;
    const R = 6371000;
    for (let i = 0; i < pts.length; i++) {
      const j = (i + 1) % pts.length;
      const lat1 = (pts[i][0] * Math.PI) / 180;
      const lat2 = (pts[j][0] * Math.PI) / 180;
      const dLon = ((pts[j][1] - pts[i][1]) * Math.PI) / 180;
      total += dLon * (2 + Math.sin(lat1) + Math.sin(lat2));
    }
    return Math.abs((total * R * R) / 2);
  }

  // Close the open polyline into a filled polygon
  function finishPolygon() {
    const pts = ptsRef.current;
    if (pts.length < 3 || !L || !mapInstance.current) return;

    // Remove open polyline
    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }
    // Remove dot markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Draw closed polygon
    polygonRef.current = L.polygon(pts, {
      color: '#fbbf24',
      fillColor: '#fbbf24',
      fillOpacity: 0.30,
      weight: 2.5,
    }).addTo(mapInstance.current);

    const a = computeArea(pts);
    setArea(Math.round(a));
    onAreaChange(Math.round(a));
    setFinished(true);
  }

  function resetPolygon() {
    ptsRef.current = [];
    setPtCount(0);
    setDrawing(false);
    setFinished(false);
    if (polylineRef.current) { polylineRef.current.remove(); polylineRef.current = null; }
    if (polygonRef.current) { polygonRef.current.remove(); polygonRef.current = null; }
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    setArea(0);
    onAreaChange(0);
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
        doubleClickZoom: false,   // disable so double-click can finish polygon
      });

      // Base layers
      const street = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 22,
      });
      const satellite = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { attribution: '© ESRI', maxZoom: 22 }
      );
      L.control.layers({ 'Street': street, 'Satellite': satellite }).addTo(map);
      satellite.addTo(map);

      // Single-click → add a point (only if not yet finished)
      map.on('click', (e: import('leaflet').LeafletMouseEvent) => {
        if (ptsRef.current.length > 0 && polygonRef.current) return; // already finished

        const pt: [number, number] = [e.latlng.lat, e.latlng.lng];
        ptsRef.current = [...ptsRef.current, pt];
        const pts = ptsRef.current;

        setDrawing(true);
        setPtCount(pts.length);

        // Draw dot at each clicked point
        const dot = L!.circleMarker([pt[0], pt[1]], {
          radius: 5,
          color: '#fbbf24',
          fillColor: '#fbbf24',
          fillOpacity: 1,
          weight: 1,
        }).addTo(map);
        markersRef.current.push(dot);

        // Update or create the open polyline (NOT a polygon — won't auto-close)
        if (polylineRef.current) {
          polylineRef.current.remove();
        }
        polylineRef.current = L!.polyline(pts, {
          color: '#fbbf24',
          weight: 2,
          dashArray: '6 4',
        }).addTo(map);

        // Update location from first point
        if (pts.length === 1) {
          onLocationChange(pt[0], pt[1]);
        }
      });

      // Double-click → close and finish polygon
      map.on('dblclick', () => {
        finishPolygon();
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

  return (
    <div className="space-y-3">
      {/* Instructions bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <MapIcon size={14} />
          {!drawing && <span>Click corners of your rooftop to start drawing</span>}
          {drawing && !finished && (
            <span>
              <span className="text-solar-400 font-medium">{ptCount} points</span>
              {ptCount < 3
                ? ` — add ${3 - ptCount} more point${3 - ptCount > 1 ? 's' : ''} to finish`
                : ' — double-click or press Finish to close'}
            </span>
          )}
          {finished && <span className="text-emerald-400">✓ Polygon complete</span>}
        </div>
        <div className="flex gap-2">
          {drawing && !finished && ptCount >= 3 && (
            <button
              type="button"
              onClick={finishPolygon}
              className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors px-3 py-1.5 rounded-lg bg-emerald-400/10 hover:bg-emerald-400/20 font-medium"
            >
              <CheckSquare size={13} /> Finish Polygon
            </button>
          )}
          {(drawing || finished) && (
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
              <Edit3 size={11} /> Click rooftop corners on map
            </span>
          )}
        </div>
      </div>

      {/* Map container */}
      <div className="relative">
        <div
          ref={mapRef}
          className="w-full h-72 rounded-xl border border-white/10 overflow-hidden"
          id="roof-map"
        />
        {!mapReady && (
          <div className="absolute inset-0 rounded-xl border border-white/10 bg-slate-800 flex items-center justify-center">
            <span className="text-slate-500 text-sm">Loading satellite map…</span>
          </div>
        )}
      </div>

      {/* Area display */}
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
      {drawing && !finished && area === 0 && ptCount >= 3 && (
        <p className="text-xs text-slate-500">Press "Finish Polygon" above or double-click to close the shape and calculate area.</p>
      )}
    </div>
  );
}

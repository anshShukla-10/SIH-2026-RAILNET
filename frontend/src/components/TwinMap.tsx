// TwinMap — OpenRailwayMap-inspired railway digital twin.
//
// Three-tier base map priority (always renders SOMETHING):
//   1. CartoDB Dark Matter tiles  — dark base map
//   2. OpenRailwayMap overlay      — railway infrastructure tiles
//   3. Local railway GeoJSON       — always available fallback
//
// RAILNET-specific data (signals, OHE, defects, work orders, trains) is
// overlaid as vector GeoJSON from the synthetic dataset.

import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import {
  stations as netStations, segments as netSegments,
  signalPoints as netSignals, oheMasts as netOheMasts,
  bridges as netBridges, levelCrossings as netLevelCrossings,
  yards as netYards, switches as netSwitches,
  defectPoints as netDefects, inspectionPoints as netInspections,
  workOrderPoints as netWorkOrders, blockSegments as netBlocks,
} from '../lib/railwayNetwork';

export interface LayerState {
  baseMap: boolean;
  osm: boolean;
  opnv: boolean;
  tracks: boolean;
  stations: boolean;
  halts: boolean;
  junctions: boolean;
  yd: boolean;
  levelCrossings: boolean;
  bridges: boolean;
  signals: boolean;
  ohe: boolean;
  switches: boolean;
  defects: boolean;
  inspections: boolean;
  workOrders: boolean;
  blocks: boolean;
  trains: boolean;
}

export const DEFAULT_LAYERS: LayerState = {
  baseMap: true,
  osm: true,
  opnv: true,
  tracks: true,
  stations: true,
  halts: true,
  junctions: true,
  yd: true,
  levelCrossings: true,
  bridges: true,
  signals: true,
  ohe: true,
  switches: true,
  defects: true,
  inspections: false,
  workOrders: true,
  blocks: true,
  trains: true,
};

export type MapStatus = 'LOADING' | 'CONNECTED' | 'FALLBACK';

interface PopupData { type: string; id: string; props: any; }

interface SelectedRoute {
  trainId: string;
  trainName: string;
  trainNumber: string;
  color: string;
  routePolyline: [number, number][];
  trackedPolyline: [number, number][];
  remainingPolyline: [number, number][];
  currentPos: { lat: number; lng: number; km: number };
  stops: { code: string; name: string; lng: number; lat: number; km: number; arrive: string; depart: string; passed: boolean; isCurrent: boolean }[];
  direction: 'UP' | 'DOWN';
}

interface Props {
  layers: LayerState;
  selectedTrainId?: string | null;
  selectedTrainData?: SelectedRoute | null;
  selectedStationCode?: string | null;
  selectedAssetId?: string | null;
  selectedKm?: string | null;
  zoomToTrainOnSelect?: boolean;
  onSelectTrain?: (trainId: string) => void;
  onSelectStation?: (code: string) => void;
  onSelectAsset?: (assetId: string) => void;
  onPopup?: (p: PopupData | null) => void;
  onMapStatus?: (status: MapStatus, info?: string) => void;
}

// Local fallback GeoJSON — Delhi/Haryana/Uttar Pradesh outline + Delhi region
const FALLBACK_GEOJSON: any = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { kind: 'region' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [76.85, 28.40], [77.10, 28.40], [77.35, 28.38], [77.55, 28.42],
          [77.65, 28.55], [77.70, 28.72], [77.55, 28.85], [77.30, 28.90],
          [77.00, 28.88], [76.80, 28.75], [76.75, 28.55], [76.85, 28.40],
        ]],
      },
    },
    {
      type: 'Feature',
      properties: { kind: 'delhi' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [77.05, 28.50], [77.30, 28.48], [77.50, 28.55], [77.45, 28.75],
          [77.25, 28.80], [77.00, 28.75], [76.95, 28.60], [77.05, 28.50],
        ]],
      },
    },
  ],
};

export default function TwinMap({
  layers, selectedTrainId, selectedTrainData, selectedStationCode,
  selectedAssetId, selectedKm, zoomToTrainOnSelect = true,
  onSelectTrain, onSelectStation, onSelectAsset, onPopup,
  onMapStatus,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupsRef = useRef<maplibregl.Popup[]>([]);
  const [ready, setReady] = useState(false);
  const [mapStatus, setMapStatus] = useState<MapStatus>('LOADING');
  const baseFallbackActive = useRef(false);

  // ---------- INIT ----------
  useEffect(() => {
    if (!ref.current || mapRef.current) return;

    // Style with a resilient map stack:
    //   - osm:       CartoDB Dark Matter base map
    //   - osm-fallback: OpenStreetMap standard tiles as a second base source
    //   - opnv:      OpenRailwayMap railway infrastructure overlay
    //   - fallback:  local GeoJSON used when external tiles fail
    const baseStyle: any = {
      version: 8,
      glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
      sources: {
        'osm': {
          type: 'raster',
          tiles: [
            'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
            'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
            'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
            'https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
          ],
          tileSize: 256,
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · © <a href="https://carto.com/attributions">CARTO</a>',
          maxzoom: 20,
        },
        'osm-fallback': {
          type: 'raster',
          tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
          maxzoom: 19,
        },
        'opnv': {
          type: 'raster',
          tiles: ['https://tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '© <a href="https://www.openrailwaymap.org/">OpenRailwayMap</a>',
          maxzoom: 19,
        },
        'fallback': { type: 'geojson', data: FALLBACK_GEOJSON },
      },
      layers: [
        // Background — always visible, matches dark theme
        { id: 'bg-fallback', type: 'background', paint: { 'background-color': '#0d1c36' } },
        // India fallback outline (below tiles)
        { id: 'fallback-region', type: 'fill', source: 'fallback',
          filter: ['==', ['get', 'kind'], 'region'],
          paint: { 'fill-color': '#112347', 'fill-outline-color': '#2a3650', 'fill-opacity': 0.8 } },
        { id: 'fallback-delhi', type: 'fill', source: 'fallback',
          filter: ['==', ['get', 'kind'], 'delhi'],
          paint: { 'fill-color': '#1e40af', 'fill-opacity': 0.35, 'fill-outline-color': '#5fb1ff' } },
        // Base map tiles on top
        { id: 'osm-base', type: 'raster', source: 'osm',
          paint: { 'raster-opacity': 0.88 } },
        { id: 'osm-fallback-base', type: 'raster', source: 'osm-fallback',
          layout: { visibility: 'none' },
          paint: { 'raster-opacity': 0.82 } },
        // OpenRailwayMap overlay — official tile endpoint
        { id: 'opnv-overlay', type: 'raster', source: 'opnv',
          paint: { 'raster-opacity': 0.82 } },
      ],
    };

    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: ref.current,
        style: baseStyle,
        center: [77.2300, 28.6500],
        zoom: 10.5,
        attributionControl: { compact: true, customAttribution: 'RailNet AI · Demo · OSM · OpenRailwayMap · CARTO' },
        pitchWithRotate: false,
        dragRotate: false,
        minZoom: 7,
        maxZoom: 18,
      });
    } catch (e) {
      console.error('[TwinMap] Map init failed:', e);
      setMapStatus('FALLBACK');
      onMapStatus?.('FALLBACK', 'MapLibre failed to initialise');
      return;
    }

    map.addControl(new maplibregl.NavigationControl({ showCompass: false, visualizePitch: false }), 'top-right');
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric', maxWidth: 80 }), 'bottom-left');

    // Watch tile loads and recover gracefully if a tile provider fails.
    let osmLoadCount = 0;
    let osmFallbackLoadCount = 0;
    let opnvLoadCount = 0;
    const failedSources = new Set<string>();

    map.on('data', (e: any) => {
      if (e.sourceId === 'osm' && e.tile && e.tile.state === 'loaded') osmLoadCount++;
      if (e.sourceId === 'osm-fallback' && e.tile && e.tile.state === 'loaded') osmFallbackLoadCount++;
      if (e.sourceId === 'opnv' && e.tile && e.tile.state === 'loaded') opnvLoadCount++;
    });
    map.on('error', (e: any) => {
      const sourceId = e?.sourceId || e?.error?.sourceId;
      if (!sourceId || failedSources.has(sourceId)) return;
      failedSources.add(sourceId);
      if (sourceId === 'osm') {
        baseFallbackActive.current = true;
        try {
          if (map.getLayer('osm-base')) map.setLayoutProperty('osm-base', 'visibility', 'none');
          if (map.getLayer('osm-fallback-base')) map.setLayoutProperty('osm-fallback-base', 'visibility', 'visible');
        } catch {}
      }
      if (sourceId === 'opnv') {
        try { if (map.getLayer('opnv-overlay')) map.setLayoutProperty('opnv-overlay', 'visibility', 'none'); } catch {}
      }
    });

    // Mark CONNECTED early if first tiles load within 1.5s, otherwise FALLBACK after 3s
    let statusSet = false;
    const setStatusOnce = (s: MapStatus, info: string) => {
      if (statusSet) return;
      statusSet = true;
      setMapStatus(s);
      onMapStatus?.(s, info);
    };

    const fallbackTimer = window.setTimeout(() => {
      if (osmLoadCount === 0 && osmFallbackLoadCount === 0) {
        setStatusOnce('FALLBACK', 'External base tiles unavailable — local railway geometry remains visible');
        try {
          if (map.getLayer('osm-base')) map.setLayoutProperty('osm-base', 'visibility', 'none');
          if (map.getLayer('osm-fallback-base')) map.setLayoutProperty('osm-fallback-base', 'visibility', 'none');
          if (map.getLayer('opnv-overlay')) map.setLayoutProperty('opnv-overlay', 'visibility', 'none');
        } catch {}
      }
    }, 3000);

    const connectedCheck = window.setInterval(() => {
      if (osmLoadCount + osmFallbackLoadCount > 0) {
        setStatusOnce('CONNECTED', `Base tiles: ${osmLoadCount + osmFallbackLoadCount} · OpenRailwayMap: ${opnvLoadCount}`);
        window.clearInterval(connectedCheck);
      }
    }, 400);

    map.on('load', () => {
      setReady(true);
      window.clearTimeout(fallbackTimer);
      window.clearInterval(connectedCheck);

      // Mark CONNECTED if we have any tile loads, otherwise FALLBACK
      if (osmLoadCount + osmFallbackLoadCount > 0) {
        setStatusOnce('CONNECTED', `Base tiles: ${osmLoadCount + osmFallbackLoadCount} · OpenRailwayMap: ${opnvLoadCount}`);
      } else {
        setStatusOnce('FALLBACK', 'External base tiles unavailable — local railway geometry remains visible');
        try {
          if (map.getLayer('osm-base')) map.setLayoutProperty('osm-base', 'visibility', 'none');
          if (map.getLayer('osm-fallback-base')) map.setLayoutProperty('osm-fallback-base', 'visibility', 'none');
          if (map.getLayer('opnv-overlay')) map.setLayoutProperty('opnv-overlay', 'visibility', 'none');
        } catch {}
      }

      buildRailwayLayers(map);
      buildInteractionHandlers(map, {
        onSelectTrain, onSelectStation, onSelectAsset, onPopup,
      }, popupsRef);
    });

    mapRef.current = map;
    return () => {
      window.clearTimeout(fallbackTimer);
      window.clearInterval(connectedCheck);
      popupsRef.current.forEach(p => p.remove());
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- LAYER VISIBILITY ----------
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const m = mapRef.current;
    const apply = (id: string, on: boolean) => {
      if (m.getLayer(id)) m.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none');
    };
    apply('osm-base', layers.osm && layers.baseMap && !baseFallbackActive.current);
    apply('osm-fallback-base', layers.osm && layers.baseMap && baseFallbackActive.current);
    apply('opnv-overlay', layers.opnv && layers.baseMap);
    apply('fallback-region', !layers.osm || !layers.baseMap);
    apply('fallback-delhi', !layers.osm || !layers.baseMap);
    apply('trk-main-casing', layers.tracks);
    apply('trk-main-inner',  layers.tracks);
    apply('trk-br-casing',  layers.tracks);
    apply('trk-br-inner',   layers.tracks);
    apply('trk-loop-casing', layers.tracks);
    apply('trk-loop-inner',  layers.tracks);
    apply('stations-junction-halo', layers.junctions);
    apply('stations-junction',      layers.junctions);
    apply('stations-terminal',      layers.stations);
    apply('stations-halt',          layers.halts);
    apply('stations-cabin',         layers.halts);
    apply('stations-label',         layers.stations || layers.halts || layers.junctions);
    apply('yard-labels-text',       layers.yd);
    apply('yards-casing', layers.yd);
    apply('yards-inner',  layers.yd);
    apply('lc-halo', layers.levelCrossings);
    apply('lc-dot',  layers.levelCrossings);
    apply('bridges-casing', layers.bridges);
    apply('bridges-line',   layers.bridges);
    apply('signals-glow', layers.signals);
    apply('signals-dot',  layers.signals);
    apply('ohe-dot',      layers.ohe);
    apply('switches-glow', layers.switches);
    apply('switches-dot',  layers.switches);
    apply('defects-halo',   layers.defects);
    apply('defects-sym', layers.defects);
    apply('inspections-sym', layers.inspections);
    apply('wo-halo',   layers.workOrders);
    apply('wo-sym', layers.workOrders);
    apply('blocks-line', layers.blocks);
    apply('trains-glow', layers.trains);
    apply('trains',      layers.trains);
    apply('trains-num',  layers.trains);
    apply('selected-train-ring',  !!selectedTrainData);
    apply('selected-km-ring', !!selectedKm);
    apply('selected-asset-ring', !!selectedAssetId);
    apply('selected-train-arrow', !!selectedTrainData);
    apply('route-all-halo',   !!selectedTrainData);
    apply('route-all',        !!selectedTrainData);
    apply('route-tracked',    !!selectedTrainData);
    apply('route-remaining',  !!selectedTrainData);
    apply('selected-stops-halo',  !!selectedTrainData);
    apply('selected-stops-dot',   !!selectedTrainData);
    apply('selected-stops-label', !!selectedTrainData);
  }, [layers, ready, selectedTrainData, selectedKm, selectedAssetId]);

  // ---------- SELECTED TRAIN ROUTE ----------
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const m = mapRef.current;
    const src = (id: string) => m.getSource(id) as maplibregl.GeoJSONSource | undefined;

    if (selectedTrainData) {
      src('route-all')?.setData({
        type: 'FeatureCollection',
        features: selectedTrainData.routePolyline.length > 1 ? [{
          type: 'Feature', properties: {},
          geometry: { type: 'LineString', coordinates: selectedTrainData.routePolyline },
        }] : [],
      });
      src('route-tracked')?.setData({
        type: 'FeatureCollection',
        features: selectedTrainData.trackedPolyline.length > 1 ? [{
          type: 'Feature', properties: {},
          geometry: { type: 'LineString', coordinates: selectedTrainData.trackedPolyline },
        }] : [],
      });
      src('route-remaining')?.setData({
        type: 'FeatureCollection',
        features: selectedTrainData.remainingPolyline.length > 1 ? [{
          type: 'Feature', properties: {},
          geometry: { type: 'LineString', coordinates: selectedTrainData.remainingPolyline },
        }] : [],
      });
      src('selected-stops')?.setData({
        type: 'FeatureCollection',
        features: selectedTrainData.stops.map((s, i) => ({
          type: 'Feature',
          properties: { code: s.code, name: s.name, seq: String(i + 1), km: s.km, arrive: s.arrive, depart: s.depart, passed: s.passed },
          geometry: { type: 'Point', coordinates: [s.lng, s.lat] },
        })),
      });
      src('selected-train')?.setData({
        type: 'FeatureCollection',
        features: [{
          type: 'Feature', properties: { direction: selectedTrainData.direction },
          geometry: { type: 'Point', coordinates: [selectedTrainData.currentPos.lng, selectedTrainData.currentPos.lat] },
        }],
      });

      if (zoomToTrainOnSelect) {
        const lats = selectedTrainData.routePolyline.map(p => p[1]);
        const lngs = selectedTrainData.routePolyline.map(p => p[0]);
        if (lats.length > 1) {
          const minLat = Math.min(...lats), maxLat = Math.max(...lats);
          const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
          m.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 80, duration: 900, maxZoom: 12.5 });
        } else {
          m.flyTo({ center: [selectedTrainData.currentPos.lng, selectedTrainData.currentPos.lat], zoom: 13 });
        }
      }
    } else {
      src('route-all')?.setData({ type: 'FeatureCollection', features: [] });
      src('route-tracked')?.setData({ type: 'FeatureCollection', features: [] });
      src('route-remaining')?.setData({ type: 'FeatureCollection', features: [] });
      src('selected-stops')?.setData({ type: 'FeatureCollection', features: [] });
      src('selected-train')?.setData({ type: 'FeatureCollection', features: [] });
    }
  }, [selectedTrainData, ready, zoomToTrainOnSelect]);

  // ---------- TRAINS DATA ----------
  useEffect(() => {
    if (!ready) return;
    const handler = (e: any) => {
      const m = mapRef.current;
      if (!m) return;
      const src = m.getSource('trains') as maplibregl.GeoJSONSource | undefined;
      if (src) src.setData(e.detail);
    };
    window.addEventListener('twinmap-trains', handler);
    return () => window.removeEventListener('twinmap-trains', handler);
  }, [ready]);

  // ---------- SELECTED STATION ----------
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const m = mapRef.current;
    const src = m.getSource('selected-station') as maplibregl.GeoJSONSource | undefined;
    if (!src) return;
    if (selectedStationCode) {
      const st = netStations.find(s => s.code === selectedStationCode);
      if (st) {
        src.setData({ type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [st.lng, st.lat] } }] });
        m.flyTo({ center: [st.lng, st.lat], zoom: 13 });
        return;
      }
    }
    src.setData({ type: 'FeatureCollection', features: [] });
  }, [selectedStationCode, ready]);

  // ---------- SELECTED ASSET ----------
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const m = mapRef.current;
    const src = m.getSource('selected-asset') as maplibregl.GeoJSONSource | undefined;
    if (!src) return;

    if (selectedAssetId) {
      const allAssets: any[] = [
        ...netDefects, ...netInspections, ...netWorkOrders,
        ...netSignals, ...netSwitches, ...netOheMasts, ...netBridges,
      ];
      const asset = allAssets.find(a => a.id === selectedAssetId || a.assetId === selectedAssetId);
      if (asset && Number.isFinite(asset.lng) && Number.isFinite(asset.lat)) {
        const point: [number, number] = [asset.lng, asset.lat];
        src.setData({ type: 'FeatureCollection', features: [{
          type: 'Feature', properties: { id: selectedAssetId, km: asset.km ?? '' },
          geometry: { type: 'Point', coordinates: point },
        }] });
        m.flyTo({ center: point, zoom: 14, duration: 700 });
        return;
      }
    }
    src.setData({ type: 'FeatureCollection', features: [] });
  }, [selectedAssetId, ready]);

  // ---------- SELECTED KM ----------
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const m = mapRef.current;
    const src = m.getSource('selected-km') as maplibregl.GeoJSONSource | undefined;
    if (!src) return;
    if (selectedKm) {
      const kmVal = parseFloat(selectedKm.split('/')[0]) + (parseFloat(selectedKm.split('/')[1]?.split('-')?.[0] || '0')) / 10;
      let best: typeof netSegments[0] | null = null;
      let bestDiff = Infinity;
      for (const s of netSegments) {
        const mid = (s.kmStart + s.kmEnd) / 2;
        const d = Math.abs(mid - kmVal);
        if (d < bestDiff) { bestDiff = d; best = s; }
      }
      if (best) {
        const coords = best.geometry[Math.floor(best.geometry.length / 2)];
        src.setData({ type: 'FeatureCollection', features: [{ type: 'Feature', properties: { km: selectedKm }, geometry: { type: 'Point', coordinates: coords } }] });
        m.flyTo({ center: coords, zoom: 14 });
      }
    } else {
      src.setData({ type: 'FeatureCollection', features: [] });
    }
  }, [selectedKm, ready]);

  return <div ref={ref} className="w-full h-full bg-[#0d1c36]" />;
}

// ============================================================================
//  Layer / source / handler builders — extracted so map.on('load') stays tidy
// ============================================================================

function buildRailwayLayers(map: maplibregl.Map) {
  // ---------- TRACKS ----------
  const mainFeatures: any[] = [];
  const branchFeatures: any[] = [];
  const loopFeatures: any[] = [];

  for (const seg of netSegments) {
    const target = seg.type === 'main' ? mainFeatures
                 : seg.type === 'branch' ? branchFeatures
                 : loopFeatures;
    if (seg.upGeometry && seg.tracks.includes('UP')) {
      target.push({
        type: 'Feature', properties: { segId: seg.id, kind: seg.type, track: 'UP' },
        geometry: { type: 'LineString', coordinates: seg.upGeometry },
      });
    }
    if (seg.downGeometry && seg.tracks.includes('DOWN')) {
      target.push({
        type: 'Feature', properties: { segId: seg.id, kind: seg.type, track: 'DOWN' },
        geometry: { type: 'LineString', coordinates: seg.downGeometry },
      });
    }
    if (seg.type === 'loop' || seg.type === 'yard' || seg.type === 'siding') {
      target.push({
        type: 'Feature', properties: { segId: seg.id, kind: seg.type, track: 'SINGLE' },
        geometry: { type: 'LineString', coordinates: seg.geometry },
      });
    }
  }

  map.addSource('tracks-main', { type: 'geojson', data: { type: 'FeatureCollection', features: mainFeatures } });
  map.addSource('tracks-branch', { type: 'geojson', data: { type: 'FeatureCollection', features: branchFeatures } });
  map.addSource('tracks-loop', { type: 'geojson', data: { type: 'FeatureCollection', features: loopFeatures } });

  const addTrackLayers = (srcId: string, prefix: string, casingColor: string, innerColor: string, baseWidth: number) => {
    map.addLayer({
      id: `${prefix}-casing`, type: 'line', source: srcId,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': casingColor, 'line-width': ['interpolate', ['linear'], ['zoom'], 9, baseWidth + 1.8, 13, baseWidth + 3.2, 16, baseWidth + 5], 'line-opacity': 0.95 },
    });
    map.addLayer({
      id: `${prefix}-inner`, type: 'line', source: srcId,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': innerColor, 'line-width': ['interpolate', ['linear'], ['zoom'], 9, baseWidth * 0.55, 13, baseWidth * 0.85, 16, baseWidth * 1.1] },
    });
  };
  addTrackLayers('tracks-main', 'trk-main', '#0a1428', '#e3ecff', 2.2);
  addTrackLayers('tracks-branch', 'trk-br', '#1a2438', '#a3b0cc', 1.7);
  addTrackLayers('tracks-loop', 'trk-loop', '#112347', '#6b7a98', 1.1);

  // ---------- STATIONS ----------
  const stationFeatures = netStations.map(s => ({
    type: 'Feature',
    properties: { id: s.id, code: s.code, name: s.name, km: s.km, type: s.type, platforms: s.platforms, zone: s.zone, hasLoop: s.hasLoop },
    geometry: { type: 'Point', coordinates: [s.lng, s.lat] },
  }));
  map.addSource('stations', { type: 'geojson', data: { type: 'FeatureCollection', features: stationFeatures } });
  map.addLayer({ id: 'stations-junction-halo', type: 'circle', source: 'stations', filter: ['==', ['get', 'type'], 'junction'], paint: { 'circle-radius': 11, 'circle-color': '#dc2626', 'circle-opacity': 0.4 } });
  map.addLayer({ id: 'stations-junction', type: 'circle', source: 'stations', filter: ['==', ['get', 'type'], 'junction'], paint: { 'circle-radius': 6, 'circle-color': '#dc2626', 'circle-stroke-color': '#fff', 'circle-stroke-width': 1.6 } });
  map.addLayer({ id: 'stations-terminal', type: 'circle', source: 'stations', filter: ['==', ['get', 'type'], 'terminal'], paint: { 'circle-radius': 8, 'circle-color': '#dc2626', 'circle-stroke-color': '#fff', 'circle-stroke-width': 1.8 } });
  map.addLayer({ id: 'stations-halt', type: 'circle', source: 'stations', filter: ['==', ['get', 'type'], 'halt'], paint: { 'circle-radius': 3.2, 'circle-color': '#ef4444', 'circle-stroke-color': '#fbbf24', 'circle-stroke-width': 0.9 } });
  map.addLayer({ id: 'stations-cabin', type: 'circle', source: 'stations', filter: ['==', ['get', 'type'], 'cabin'], paint: { 'circle-radius': 2.4, 'circle-color': '#a3b0cc', 'circle-stroke-color': '#fff', 'circle-stroke-width': 0.7 } });
  map.addLayer({
    id: 'stations-label', type: 'symbol', source: 'stations',
    layout: { 'text-field': ['concat', ['get', 'code'], '\n', ['get', 'name']], 'text-size': 10, 'text-offset': [0, 1.1], 'text-anchor': 'top', 'text-font': ['Open Sans Regular'], 'text-letter-spacing': 0.04 },
    paint: { 'text-color': '#e3ecff', 'text-halo-color': '#050b1a', 'text-halo-width': 1.4 },
  });

  // ---------- YARDS ----------
  const yardLineFeatures: any[] = [];
  for (const yard of netYards) {
    for (const tr of yard.tracks) {
      yardLineFeatures.push({
        type: 'Feature', properties: { id: `${yard.id}-${tr.id}`, yard: yard.name },
        geometry: { type: 'LineString', coordinates: [[yard.lng, yard.lat], [tr.lng, tr.lat]] },
      });
    }
  }
  map.addSource('yards', { type: 'geojson', data: { type: 'FeatureCollection', features: yardLineFeatures } });
  map.addLayer({ id: 'yards-casing', type: 'line', source: 'yards', paint: { 'line-color': '#1a2438', 'line-width': 3 } });
  map.addLayer({ id: 'yards-inner',  type: 'line', source: 'yards', paint: { 'line-color': '#4a5568', 'line-width': 1.4 } });
  const yardLabels = netYards.map(y => ({
    type: 'Feature', properties: { name: y.name, code: y.id },
    geometry: { type: 'Point', coordinates: [y.lng, y.lat] },
  }));
  map.addSource('yard-labels', { type: 'geojson', data: { type: 'FeatureCollection', features: yardLabels } });
  map.addLayer({
    id: 'yard-labels-text', type: 'symbol', source: 'yard-labels',
    layout: { 'text-field': ['get', 'name'], 'text-size': 9, 'text-offset': [0, -0.8], 'text-anchor': 'bottom', 'text-font': ['Open Sans Regular'] },
    paint: { 'text-color': '#a3b0cc', 'text-halo-color': '#050b1a', 'text-halo-width': 1 },
  });

  // ---------- LEVEL CROSSINGS ----------
  const lcFeatures = netLevelCrossings.map(lc => ({
    type: 'Feature', properties: { id: lc.id, name: lc.name, km: lc.km, status: lc.status },
    geometry: { type: 'Point', coordinates: [lc.lng, lc.lat] },
  }));
  map.addSource('level-crossings', { type: 'geojson', data: { type: 'FeatureCollection', features: lcFeatures } });
  map.addLayer({ id: 'lc-halo', type: 'circle', source: 'level-crossings', paint: { 'circle-radius': 6, 'circle-color': '#fbbf24', 'circle-opacity': 0.35 } });
  map.addLayer({ id: 'lc-dot',  type: 'circle', source: 'level-crossings', paint: { 'circle-radius': 3.2, 'circle-color': '#fbbf24', 'circle-stroke-color': '#0a1428', 'circle-stroke-width': 1 } });

  // ---------- BRIDGES ----------
  const bridgeFeatures = netBridges.map(b => {
    const perp = 0.0010;
    return {
      type: 'Feature', properties: { id: b.id, name: b.name, km: b.km, spans: b.spans, length: b.length, type: b.type },
      geometry: { type: 'LineString', coordinates: [[b.lng - perp, b.lat], [b.lng + perp, b.lat]] },
    };
  });
  map.addSource('bridges', { type: 'geojson', data: { type: 'FeatureCollection', features: bridgeFeatures } });
  map.addLayer({ id: 'bridges-casing', type: 'line', source: 'bridges', layout: { 'line-cap': 'round' }, paint: { 'line-color': '#0a1428', 'line-width': 7 } });
  map.addLayer({ id: 'bridges-line',   type: 'line', source: 'bridges', layout: { 'line-cap': 'round' }, paint: { 'line-color': '#f5a623', 'line-width': 4 } });

  // ---------- SIGNALS ----------
  const sigFeatures = netSignals.map(s => ({
    type: 'Feature', properties: { id: s.id, km: s.km, type: s.type, direction: s.direction, aspect: s.aspect, assetId: s.assetId },
    geometry: { type: 'Point', coordinates: [s.lng, s.lat] },
  }));
  map.addSource('signals', { type: 'geojson', data: { type: 'FeatureCollection', features: sigFeatures } });
  map.addLayer({ id: 'signals-glow', type: 'circle', source: 'signals', paint: {
    'circle-radius': 7,
    'circle-color': ['match', ['get', 'aspect'], 'red', '#e53935', 'yellow', '#f5a623', 'green', '#2ecc71', 'double-yellow', '#fbbf24', '#2196f3'],
    'circle-opacity': 0.55, 'circle-blur': 0.5,
  } });
  map.addLayer({ id: 'signals-dot', type: 'circle', source: 'signals', paint: {
    'circle-radius': 3,
    'circle-color': ['match', ['get', 'aspect'], 'red', '#e53935', 'yellow', '#f5a623', 'green', '#2ecc71', 'double-yellow', '#fbbf24', '#2196f3'],
    'circle-stroke-color': '#0a1428', 'circle-stroke-width': 1,
  } });

  // ---------- OHE MASTS ----------
  const oheFeatures = netOheMasts.map(o => ({
    type: 'Feature', properties: { id: o.id, mastNo: o.mastNo, km: o.km, type: o.type, voltage: o.voltage },
    geometry: { type: 'Point', coordinates: [o.lng, o.lat] },
  }));
  map.addSource('ohe', { type: 'geojson', data: { type: 'FeatureCollection', features: oheFeatures } });
  map.addLayer({ id: 'ohe-dot', type: 'circle', source: 'ohe', paint: { 'circle-radius': 1.4, 'circle-color': '#00bcd4', 'circle-opacity': 0.7 } });

  // ---------- SWITCHES ----------
  const swFeatures = netSwitches.map(s => ({
    type: 'Feature', properties: { id: s.id, assetId: s.assetId, km: s.km, type: s.type },
    geometry: { type: 'Point', coordinates: [s.lng, s.lat] },
  }));
  map.addSource('switches', { type: 'geojson', data: { type: 'FeatureCollection', features: swFeatures } });
  map.addLayer({ id: 'switches-glow', type: 'circle', source: 'switches', paint: { 'circle-radius': 5, 'circle-color': '#00bcd4', 'circle-opacity': 0.25 } });
  map.addLayer({ id: 'switches-dot',  type: 'circle', source: 'switches', paint: { 'circle-radius': 2.6, 'circle-color': '#00bcd4', 'circle-stroke-color': '#0a1428', 'circle-stroke-width': 0.8 } });

  // ---------- DEFECTS ----------
  const defFeatures = netDefects.map(d => ({
    type: 'Feature', properties: { id: d.id, assetId: d.assetId, km: d.km, severity: d.severity, assetType: d.assetType, category: d.category },
    geometry: { type: 'Point', coordinates: [d.lng, d.lat] },
  }));
  map.addSource('defects', { type: 'geojson', data: { type: 'FeatureCollection', features: defFeatures } });
  map.addLayer({ id: 'defects-halo', type: 'circle', source: 'defects', paint: { 'circle-radius': 9, 'circle-color': ['match', ['get', 'severity'], 'critical', '#e53935', 'warning', '#f5a623', '#2196f3'], 'circle-opacity': 0.3 } });
  map.addSource('defects-sym', { type: 'geojson', data: { type: 'FeatureCollection', features: netDefects.map(d => ({
    type: 'Feature', properties: { id: d.id, severity: d.severity, km: d.km, assetType: d.assetType, category: d.category, assetId: d.assetId },
    geometry: { type: 'Point', coordinates: [d.lng, d.lat] },
  })) } });
  map.addLayer({ id: 'defects-sym', type: 'symbol', source: 'defects-sym', layout: { 'text-field': '▲', 'text-size': 12, 'text-allow-overlap': true },
    paint: { 'text-color': ['match', ['get', 'severity'], 'critical', '#ff6b66', 'warning', '#fbbf24', '#5fb1ff'], 'text-halo-color': '#050b1a', 'text-halo-width': 1 } });

  // ---------- INSPECTIONS ----------
  const insFeatures = netInspections.map(i => ({
    type: 'Feature', properties: { id: i.id, assetId: i.assetId, km: i.km, status: i.status, assetType: i.assetType },
    geometry: { type: 'Point', coordinates: [i.lng, i.lat] },
  }));
  map.addSource('inspections', { type: 'geojson', data: { type: 'FeatureCollection', features: insFeatures } });
  map.addLayer({ id: 'inspections-sym', type: 'symbol', source: 'inspections', layout: { 'text-field': '◆', 'text-size': 11, 'text-allow-overlap': true },
    paint: { 'text-color': ['match', ['get', 'status'], 'CRITICAL', '#e53935', 'OVERDUE', '#e53935', 'DUE', '#f5a623', 'UPCOMING', '#2196f3', '#2ecc71'], 'text-halo-color': '#050b1a', 'text-halo-width': 1 } });

  // ---------- WORK ORDERS ----------
  const woFeatures = netWorkOrders.map(w => ({
    type: 'Feature', properties: { id: w.id, assetId: w.assetId, km: w.km, status: w.status, priority: w.priority, assetType: w.assetType },
    geometry: { type: 'Point', coordinates: [w.lng, w.lat] },
  }));
  map.addSource('workorders', { type: 'geojson', data: { type: 'FeatureCollection', features: woFeatures } });
  map.addLayer({ id: 'wo-halo', type: 'circle', source: 'workorders', paint: { 'circle-radius': 8, 'circle-color': ['match', ['get', 'priority'], 'P1', '#e53935', 'P2', '#f5a623', 'P3', '#2196f3', '#2ecc71'], 'circle-opacity': 0.25 } });
  map.addSource('wo-sym', { type: 'geojson', data: { type: 'FeatureCollection', features: netWorkOrders.map(w => ({
    type: 'Feature', properties: { id: w.id, status: w.status, priority: w.priority, km: w.km, assetId: w.assetId, assetType: w.assetType },
    geometry: { type: 'Point', coordinates: [w.lng, w.lat] },
  })) } });
  map.addLayer({ id: 'wo-sym', type: 'symbol', source: 'wo-sym', layout: { 'text-field': '■', 'text-size': 12, 'text-allow-overlap': true },
    paint: { 'text-color': ['match', ['get', 'priority'], 'P1', '#ff6b66', 'P2', '#fbbf24', 'P3', '#5fb1ff', '#5fe09a'], 'text-halo-color': '#050b1a', 'text-halo-width': 1 } });

  // ---------- BLOCKS ----------
  const blockFeatures: any[] = [];
  for (const blk of netBlocks) {
    for (const segId of blk.segmentIds) {
      const seg = netSegments.find(s => s.id === segId);
      if (seg) {
        const baseColor = blk.status === 'ACTIVE' ? '#e53935' : blk.status === 'APPROVED' ? '#f5a623' : '#2196f3';
        blockFeatures.push({
          type: 'Feature', properties: { id: blk.id, status: blk.status, workType: blk.workType, baseColor },
          geometry: { type: 'LineString', coordinates: seg.geometry },
        });
      }
    }
  }
  map.addSource('blocks', { type: 'geojson', data: { type: 'FeatureCollection', features: blockFeatures } });
  map.addLayer({ id: 'blocks-line', type: 'line', source: 'blocks', paint: { 'line-color': ['get', 'baseColor'], 'line-width': 6, 'line-opacity': 0.55, 'line-dasharray': [2, 2] } });

  // ---------- ROUTES / TRAINS / SELECTED ----------
  map.addSource('route-all', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addSource('route-tracked', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addSource('route-remaining', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addSource('selected-stops', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addSource('trains', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });

  map.addLayer({ id: 'route-all-halo', type: 'line', source: 'route-all', paint: { 'line-color': '#f5a623', 'line-width': 14, 'line-opacity': 0.32, 'line-blur': 4 } });
  map.addLayer({ id: 'route-all',       type: 'line', source: 'route-all', paint: { 'line-color': '#f5a623', 'line-width': 4.5, 'line-opacity': 1 } });
  map.addLayer({ id: 'route-tracked',   type: 'line', source: 'route-tracked', paint: { 'line-color': '#5fe09a', 'line-width': 5, 'line-opacity': 1 } });
  map.addLayer({ id: 'route-remaining', type: 'line', source: 'route-remaining', paint: { 'line-color': '#f5a623', 'line-width': 3.5, 'line-opacity': 0.85, 'line-dasharray': [5, 3] } });

  map.addLayer({ id: 'selected-stops-halo', type: 'circle', source: 'selected-stops', paint: { 'circle-radius': 11, 'circle-color': '#f5a623', 'circle-opacity': 0.3 } });
  map.addLayer({ id: 'selected-stops-dot',  type: 'circle', source: 'selected-stops', paint: { 'circle-radius': 5.5, 'circle-color': '#0a1428', 'circle-stroke-color': '#f5a623', 'circle-stroke-width': 2.2 } });
  map.addLayer({ id: 'selected-stops-label', type: 'symbol', source: 'selected-stops', layout: { 'text-field': ['get', 'seq'], 'text-size': 10, 'text-allow-overlap': true, 'text-font': ['Open Sans Bold'] }, paint: { 'text-color': '#f5a623' } });

  map.addLayer({ id: 'trains-glow', type: 'circle', source: 'trains', paint: {
    'circle-radius': 14,
    'circle-color': [
      'case',
      ['==', ['get', 'status'], 'critical'], '#e53935',
      ['==', ['get', 'status'], 'warning'], '#f5a623',
      ['==', ['get', 'priority'], 'RAJDHANI'], '#5fb1ff',
      ['==', ['get', 'priority'], 'SHATABDI'], '#00bcd4',
      ['==', ['get', 'priority'], 'FREIGHT'], '#a3b0cc',
      '#2ecc71',
    ],
    'circle-opacity': 0.3, 'circle-blur': 0.5,
  } });
  map.addLayer({ id: 'trains', type: 'circle', source: 'trains', paint: {
    'circle-radius': 7,
    'circle-color': [
      'case',
      ['==', ['get', 'status'], 'critical'], '#e53935',
      ['==', ['get', 'status'], 'warning'], '#f5a623',
      ['==', ['get', 'priority'], 'RAJDHANI'], '#5fb1ff',
      ['==', ['get', 'priority'], 'SHATABDI'], '#00bcd4',
      ['==', ['get', 'priority'], 'FREIGHT'], '#a3b0cc',
      '#2ecc71',
    ],
    'circle-stroke-color': '#0a1428', 'circle-stroke-width': 2,
  } });
  map.addLayer({ id: 'trains-num', type: 'symbol', source: 'trains', layout: { 'text-field': ['get', 'number'], 'text-size': 9, 'text-offset': [0, -1.4], 'text-anchor': 'bottom', 'text-font': ['Open Sans Bold'] },
    paint: { 'text-color': '#e3ecff', 'text-halo-color': '#050b1a', 'text-halo-width': 1 } });

  map.addSource('selected-train', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addLayer({ id: 'selected-train-ring', type: 'circle', source: 'selected-train', paint: { 'circle-radius': 24, 'circle-color': '#f5a623', 'circle-opacity': 0.2, 'circle-stroke-color': '#f5a623', 'circle-stroke-width': 2.5 } });
  map.addLayer({
    id: 'selected-train-arrow', type: 'symbol', source: 'selected-train',
    layout: {
      'text-field': ['case', ['==', ['get', 'direction'], 'UP'], '▲', '▼'],
      'text-size': 18, 'text-allow-overlap': true,
      'text-offset': [0, 0.5],
    },
    paint: { 'text-color': '#f5a623', 'text-halo-color': '#050b1a', 'text-halo-width': 1.6 },
  });

  map.addSource('selected-station', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addLayer({ id: 'selected-station-ring', type: 'circle', source: 'selected-station', paint: { 'circle-radius': 14, 'circle-color': '#5fb1ff', 'circle-opacity': 0.12, 'circle-stroke-color': '#5fb1ff', 'circle-stroke-width': 1.8 } });

  map.addSource('selected-km', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addLayer({ id: 'selected-km-ring', type: 'circle', source: 'selected-km', paint: { 'circle-radius': 18, 'circle-color': '#f5a623', 'circle-opacity': 0, 'circle-stroke-color': '#f5a623', 'circle-stroke-width': 1.8 } });

  map.addSource('selected-asset', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addLayer({ id: 'selected-asset-ring', type: 'circle', source: 'selected-asset', paint: { 'circle-radius': 20, 'circle-color': '#00bcd4', 'circle-opacity': 0.08, 'circle-stroke-color': '#00bcd4', 'circle-stroke-width': 2.2 } });
}

function buildInteractionHandlers(
  map: maplibregl.Map,
  handlers: { onSelectTrain?: any; onSelectStation?: any; onSelectAsset?: any; onPopup?: any; },
  popupsRef: React.MutableRefObject<maplibregl.Popup[]>,
) {
  const showPopup = (lngLat: [number, number], html: string) => {
    popupsRef.current.forEach(p => p.remove());
    popupsRef.current = [];
    const popup = new maplibregl.Popup({ closeButton: true, closeOnClick: false, offset: 12, maxWidth: '320px' })
      .setLngLat(lngLat).setHTML(html).addTo(map);
    popupsRef.current.push(popup);
    popup.on('close', () => { if (handlers.onPopup) handlers.onPopup(null); });
  };

  const clickableLayers = [
    'trk-main-inner', 'trk-br-inner', 'stations-junction', 'stations-terminal',
    'stations-halt', 'stations-cabin', 'signals-dot', 'lc-dot', 'bridges-line',
    'switches-dot', 'defects-sym', 'inspections-sym', 'wo-sym', 'trains',
  ];
  clickableLayers.forEach(layer => {
    map.on('click', layer, (e) => {
      const f = e.features?.[0];
      if (!f) return;
      const p = f.properties as any;
      const coords = (f.geometry as any).coordinates;
      const lngLat: [number, number] = [coords[0], coords[1]];

      if (layer === 'trains') { handlers.onSelectTrain?.(p.id); return; }
      if (layer === 'stations-junction' || layer === 'stations-terminal' || layer === 'stations-halt' || layer === 'stations-cabin') {
        handlers.onSelectStation?.(p.code); return;
      }
      if (layer === 'defects-sym' || layer === 'inspections-sym' || layer === 'wo-sym') {
        handlers.onSelectAsset?.(p.id); return;
      }

      let html = '';
      if (layer === 'trk-main-inner' || layer === 'trk-br-inner') {
        html = `<div style="font-family:Menlo,Consolas,monospace;font-size:11px;line-height:1.5;color:#c7d3e6;">
          <div style="font-size:13px;font-weight:bold;color:#e3ecff;">Track Segment · ${p.segId}</div>
          <div>Track: ${p.track}</div><div>Kind: ${p.kind}</div>
          <div style="color:#6b7a98;margin-top:4px;border-top:1px solid #1e2a44;padding-top:3px;">Synthetic demonstration data</div></div>`;
      } else if (layer === 'signals-dot') {
        html = `<div style="font-family:Menlo,Consolas,monospace;font-size:11px;line-height:1.5;color:#c7d3e6;">
          <div style="font-size:13px;font-weight:bold;color:#e3ecff;">Signal · ${p.id}</div>
          <div>Type: ${p.type} · Aspect ${p.aspect}</div><div>Direction: ${p.direction}</div><div>KM: ${p.km}</div>
          <div style="margin-top:4px;"><a href="/smms" style="color:#5fb1ff;font-size:10px;">View SMMS →</a></div></div>`;
      } else if (layer === 'lc-dot') {
        html = `<div style="font-family:Menlo,Consolas,monospace;font-size:11px;line-height:1.5;color:#c7d3e6;">
          <div style="font-size:13px;font-weight:bold;color:#e3ecff;">Level Crossing · ${p.id}</div>
          <div>${p.name}</div><div>Status: ${p.status}</div><div>KM: ${p.km}</div></div>`;
      } else if (layer === 'bridges-line') {
        html = `<div style="font-family:Menlo,Consolas,monospace;font-size:11px;line-height:1.5;color:#c7d3e6;">
          <div style="font-size:13px;font-weight:bold;color:#e3ecff;">Bridge · ${p.id}</div>
          <div>${p.name}</div><div>Spans: ${p.spans} · Length: ${p.length}m</div><div>KM: ${p.km}</div>
          <div style="margin-top:4px;"><a href="/bridges" style="color:#5fb1ff;font-size:10px;">View Bridges →</a></div></div>`;
      } else if (layer === 'switches-dot') {
        html = `<div style="font-family:Menlo,Consolas,monospace;font-size:11px;line-height:1.5;color:#c7d3e6;">
          <div style="font-size:13px;font-weight:bold;color:#e3ecff;">Point · ${p.assetId}</div>
          <div>Type: ${p.type}</div><div>KM: ${p.km}</div></div>`;
      }
      if (html) showPopup(lngLat, html);
    });
    map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = ''; });
  });
}

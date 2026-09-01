// Railway Digital Twin Map — MapLibre GL JS
// Demonstrates a synthetic Delhi-area railway network with tracks, stations,
// signals, OHE masts, defects, trains, blocks, inspectable assets and popups.
//
// This is a SYNTHETIC DEMONSTRATION. The map is not connected to live
// operational feeds and must never be described as live data.

import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import {
  bridges, defaultLayers, defects, inspections, kpiMetrics, ohes, signals,
  stations, tracks, trains, workOrders
} from '../lib/data';
// alerts imported only at top of file, used by reference; we avoid unused import
import { alerts } from '../lib/data';
import { Layers, Search, X } from 'lucide-react';
import type { LayerToggle } from '../lib/types';

interface PopupData {
  type: 'train' | 'track' | 'signal' | 'ohe' | 'bridge' | 'defect' | 'workOrder' | 'station' | 'block';
  id: string;
  [k: string]: any;
}

interface Props {
  initialCenter?: [number, number];
  initialZoom?: number;
  showFilters?: boolean;
  onSelect?: (sel: PopupData | null) => void;
  selectedKm?: string | null;
  height?: string;
  selectionMode?: 'asset' | 'train' | 'point';
}

export default function RailwayMap({
  initialCenter = [77.32, 28.66],
  initialZoom = 11.5,
  showFilters = true,
  onSelect,
  selectedKm,
  height = '100%',
  selectionMode = 'asset',
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const popupsRef = useRef<maplibregl.Popup[]>([]);
  const [layers, setLayers] = useState<LayerToggle[]>(defaultLayers);
  const [search, setSearch] = useState('');
  const [ready, setReady] = useState(false);
  const [hoverId, setHoverId] = useState<string | null>(null);

  // Stable synthetic coordinates — synthetic Delhi section corridor
  const sectionCorridor = {
    DLI: [77.228, 28.662],
    NDLS: [77.2197, 28.6431],
    SZM: [77.2089, 28.6811],
    DSA: [77.2906, 28.6736],
    VVB: [77.3176, 28.6720],
    GZB: [77.4393, 28.6531],
    SBB: [77.5012, 28.6457],
    TKJ: [77.241, 28.627],
    CYZ: [77.2395, 28.6658],
    PWL: [77.1793, 28.6521],
  } as Record<string, [number, number]>;

  // KM chainage for mapping KM → approx lng
  // 0km @ DLI, +25.5km @ GZB
  const kmToLngLat = (km: number): [number, number] => {
    // approx linear interp DLI → GZB with slight curve
    const start = sectionCorridor.DLI;
    const end = sectionCorridor.GZB;
    const t = Math.max(0, Math.min(1, (km - 120) / 13));
    return [
      start[0] + (end[0] - start[0]) * t,
      start[1] + (end[1] - start[1]) * t - 0.005 * Math.sin(t * Math.PI),
    ];
  };

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Demo vector style — minimal dark canvas (no external tiles)
    const style: any = {
      version: 8,
      sources: {
        'bg-grid': {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        },
      },
      glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
      layers: [
        {
          id: 'bg',
          type: 'background',
          paint: { 'background-color': '#050b1a' },
        },
        {
          id: 'grid',
          type: 'background',
          paint: {
            'background-color': {
              stops: [[9, '#07142a'], [12, '#08182f'], [14, '#0a1d36']],
            },
          },
        },
      ],
    };

    const map = new maplibregl.Map({
      container: containerRef.current,
      style,
      center: initialCenter,
      zoom: initialZoom,
      attributionControl: { compact: true, customAttribution: 'RailNet AI · Demo · © OpenStreetMap contributors' },
      pitchWithRotate: false,
      dragRotate: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false, visualizePitch: false }), 'top-right');
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric', maxWidth: 80 }), 'bottom-left');

    map.on('load', () => {
      // ---- TRACKS as GeoJSON LineStrings along DLI–GZB corridor ----
      const trackFeatures: any[] = [];
      // UP main
      const upLine = [
        sectionCorridor.DLI,
        sectionCorridor.CYZ, sectionCorridor.SZM, sectionCorridor.DSA,
        sectionCorridor.VVB, sectionCorridor.GZB, sectionCorridor.SBB,
      ];
      // DOWN main (slightly offset)
      const dnLine = upLine.map(([x, y]) => [x - 0.004, y - 0.0006]);
      trackFeatures.push({
        type: 'Feature',
        properties: { id: 'TRK-UP-MAIN', kind: 'main' },
        geometry: { type: 'LineString', coordinates: upLine },
      });
      trackFeatures.push({
        type: 'Feature',
        properties: { id: 'TRK-DN-MAIN', kind: 'main' },
        geometry: { type: 'LineString', coordinates: dnLine },
      });
      // Loop lines at 124/5 area
      const loopA = [
        kmToLngLat(124.3),
        [kmToLngLat(124.4)[0] - 0.003, kmToLngLat(124.4)[1]],
        [kmToLngLat(124.8)[0] - 0.003, kmToLngLat(124.8)[1]],
        kmToLngLat(124.9),
      ];
      trackFeatures.push({
        type: 'Feature',
        properties: { id: 'TRK-LOOP-A', kind: 'loop' },
        geometry: { type: 'LineString', coordinates: loopA },
      });

      // Side rail towards NDLS
      const ndlsLine = [sectionCorridor.DLI, sectionCorridor.NDLS, sectionCorridor.TKJ];
      trackFeatures.push({
        type: 'Feature',
        properties: { id: 'TRK-NDLS-LINK', kind: 'main' },
        geometry: { type: 'LineString', coordinates: ndlsLine },
      });
      const patelLine = [sectionCorridor.NDLS, sectionCorridor.PWL];
      trackFeatures.push({
        type: 'Feature',
        properties: { id: 'TRK-PWL-LINK', kind: 'siding' },
        geometry: { type: 'LineString', coordinates: patelLine },
      });

      map.addSource('tracks', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: trackFeatures },
      });
      map.addLayer({
        id: 'tracks-shadow',
        type: 'line',
        source: 'tracks',
        paint: {
          'line-color': '#000',
          'line-width': [
            'match', ['get', 'kind'],
            'main', 9,
            'loop', 7,
            'siding', 5,
            5,
          ],
          'line-blur': 2.5,
          'line-opacity': 0.5,
        },
      });
      map.addLayer({
        id: 'tracks-base',
        type: 'line',
        source: 'tracks',
        paint: {
          'line-color': [
            'match', ['get', 'kind'],
            'main', '#2a3650',
            'loop', '#1e2a44',
            'siding', '#1a2438',
            '#2a3650',
          ],
          'line-width': [
            'match', ['get', 'kind'],
            'main', 5,
            'loop', 3.5,
            'siding', 2.5,
            4,
          ],
        },
      });
      map.addLayer({
        id: 'tracks-rail',
        type: 'line',
        source: 'tracks',
        paint: {
          'line-color': [
            'match', ['get', 'kind'],
            'main', '#5fb1ff',
            'loop', '#a3b0cc',
            'siding', '#6b7a98',
            '#5fb1ff',
          ],
          'line-width': 0.6,
          'line-dasharray': [4, 2],
        },
      });

      // ---- STATIONS ----
      const stationFeatures = stations.map(s => ({
        type: 'Feature',
        properties: { id: s.id, code: s.code, name: s.name, platforms: s.platforms, km: s.km },
        geometry: { type: 'Point', coordinates: [s.lng, s.lat] },
      }));
      map.addSource('stations', { type: 'geojson', data: { type: 'FeatureCollection', features: stationFeatures } });
      map.addLayer({
        id: 'stations-halo',
        type: 'circle',
        source: 'stations',
        paint: { 'circle-radius': 12, 'circle-color': '#081428', 'circle-stroke-color': '#5fb1ff', 'circle-stroke-width': 0.6, 'circle-opacity': 0.5 },
      });
      map.addLayer({
        id: 'stations-dot',
        type: 'circle',
        source: 'stations',
        paint: { 'circle-radius': 4, 'circle-color': '#5fb1ff', 'circle-stroke-color': '#e3ecff', 'circle-stroke-width': 1 },
      });
      map.addLayer({
        id: 'stations-label',
        type: 'symbol',
        source: 'stations',
        layout: {
          'text-field': ['concat', ['get', 'code'], '\n', ['get', 'name']],
          'text-size': 10,
          'text-offset': [0, 1.2],
          'text-anchor': 'top',
          'text-font': ['Open Sans Regular'],
          'text-letter-spacing': 0.05,
        },
        paint: {
          'text-color': '#c7d3e6',
          'text-halo-color': '#050b1a',
          'text-halo-width': 1.2,
        },
      });

      // ---- ASSETS (signals, OHE, bridges, defects, work orders, inspections) ----
      const signalFeatures = signals.map(s => {
        const [lng, lat] = kmToLngLat(parseFloat(s.km.split('/')[0]) + parseFloat(s.km.split('/')?.[1] || '0') / 10);
        return {
          type: 'Feature',
          properties: { id: s.id, kind: 'signal', status: s.status, type: s.type, aspect: s.aspect, km: s.km },
          geometry: { type: 'Point', coordinates: [lng + 0.0008, lat + 0.0006] },
        };
      });
      const oheFeatures = ohes.map(o => {
        const [lng, lat] = kmToLngLat(parseFloat(o.km.split('/')[0]) + parseFloat(o.km.split('/')?.[1] || '0') / 10);
        return {
          type: 'Feature',
          properties: { id: o.id, kind: 'ohe', status: o.condition, type: o.type, km: o.km },
          geometry: { type: 'Point', coordinates: [lng - 0.0008, lat - 0.0006] },
        };
      });
      const bridgeFeatures = bridges.map(b => {
        const [lng, lat] = kmToLngLat(parseFloat(b.km.split('/')[0]) + (parseFloat(b.km.split('/')?.[1] || '0')) / 10);
        return {
          type: 'Feature',
          properties: { id: b.id, kind: 'bridge', status: b.condition, km: b.km, name: b.name },
          geometry: { type: 'Point', coordinates: [lng, lat] },
        };
      });
      const defectFeatures = defects.map(d => {
        const [lng, lat] = kmToLngLat(parseFloat(d.assetKm.split('/')[0]) + (parseFloat(d.assetKm.split('/')?.[1]?.split('-')?.[0] || '0')) / 10);
        return {
          type: 'Feature',
          properties: { id: d.id, kind: 'defect', severity: d.severity, assetType: d.assetType, assetKm: d.assetKm, category: d.category },
          geometry: { type: 'Point', coordinates: [lng + (Math.random() - 0.5) * 0.0008, lat + (Math.random() - 0.5) * 0.0008] },
        };
      });
      const woFeatures = workOrders.filter(w => w.status !== 'COMPLETED').map(w => {
        const [lng, lat] = kmToLngLat(parseFloat(w.assetKm.split('/')[0]) + (parseFloat(w.assetKm.split('/')?.[1]?.split('-')?.[0] || '0')) / 10);
        return {
          type: 'Feature',
          properties: { id: w.id, kind: 'workOrder', status: w.status, priority: w.priority, assetType: w.assetType, assetKm: w.assetKm },
          geometry: { type: 'Point', coordinates: [lng + 0.0012, lat - 0.0012] },
        };
      });
      const inspFeatures = inspections.filter(i => i.status !== 'COMPLETED').map(i => {
        const [lng, lat] = kmToLngLat(parseFloat(i.assetKm.split('/')[0]) + (parseFloat(i.assetKm.split('/')?.[1]?.split('-')?.[0] || '0')) / 10);
        return {
          type: 'Feature',
          properties: { id: i.id, kind: 'inspection', status: i.status, assetType: i.assetType, assetKm: i.assetKm },
          geometry: { type: 'Point', coordinates: [lng - 0.0012, lat + 0.0012] },
        };
      });

      map.addSource('assets', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [...signalFeatures, ...oheFeatures, ...bridgeFeatures, ...defectFeatures, ...woFeatures, ...inspFeatures],
        },
      });

      const colorFor = (kind: string, status: string) => {
        if (kind === 'defect') {
          return status === 'critical' ? '#e53935' : status === 'warning' ? '#f5a623' : '#2196f3';
        }
        if (kind === 'workOrder') return '#00bcd4';
        if (kind === 'inspection') return status === 'OVERDUE' ? '#e53935' : status === 'DUE' ? '#f5a623' : '#2196f3';
        if (kind === 'signal') return status === 'critical' ? '#e53935' : status === 'warning' ? '#f5a623' : '#2ecc71';
        if (kind === 'ohe') return status === 'critical' ? '#e53935' : status === 'warning' ? '#f5a623' : '#2ecc71';
        if (kind === 'bridge') return status === 'warning' ? '#f5a623' : '#2ecc71';
        return '#5fb1ff';
      };

      // Asset halos (pulse for critical)
      ['signal', 'ohe', 'bridge', 'defect', 'workOrder', 'inspection'].forEach(kind => {
        map.addLayer({
          id: `assets-${kind}-halo`,
          type: 'circle',
          source: 'assets',
          filter: ['==', ['get', 'kind'], kind],
          paint: {
            'circle-radius': 12,
            'circle-color': [
              'case',
              ['==', ['get', 'severity'], 'critical'], '#e53935',
              ['==', ['get', 'status'], 'CRITICAL'], '#e53935',
              ['==', ['get', 'status'], 'OVERDUE'], '#e53935',
              ['==', ['get', 'severity'], 'warning'], '#f5a623',
              ['==', ['get', 'status'], 'WARNING'], '#f5a623',
              ['==', ['get', 'status'], 'DUE'], '#f5a623',
              ['==', ['get', 'status'], 'BLOCKED'], '#e53935',
              '#2196f3',
            ],
            'circle-opacity': 0.18,
            'circle-stroke-width': 0,
          },
        });
        map.addLayer({
          id: `assets-${kind}`,
          type: 'circle',
          source: 'assets',
          filter: ['==', ['get', 'kind'], kind],
          paint: {
            'circle-radius': [
              'case',
              ['==', ['get', 'kind'], 'signal'], 4,
              ['==', ['get', 'kind'], 'ohe'], 3,
              ['==', ['get', 'kind'], 'bridge'], 5,
              ['==', ['get', 'kind'], 'defect'], 5,
              ['==', ['get', 'kind'], 'workOrder'], 4,
              ['==', ['get', 'kind'], 'inspection'], 3.5,
              4,
            ],
            'circle-color': [
              'case',
              ['==', ['get', 'severity'], 'critical'], '#e53935',
              ['==', ['get', 'status'], 'CRITICAL'], '#e53935',
              ['==', ['get', 'status'], 'OVERDUE'], '#e53935',
              ['==', ['get', 'severity'], 'warning'], '#f5a623',
              ['==', ['get', 'status'], 'WARNING'], '#f5a623',
              ['==', ['get', 'status'], 'DUE'], '#f5a623',
              ['==', ['get', 'status'], 'BLOCKED'], '#e53935',
              ['==', ['get', 'status'], 'UPCOMING'], '#00bcd4',
              '#2196f3',
            ],
            'circle-stroke-color': '#0a1428',
            'circle-stroke-width': 1.2,
          },
        });
      });

      // Selected KM marker
      if (selectedKm) {
        const km = parseFloat(selectedKm.split('/')[0]) + (parseFloat(selectedKm.split('/')[1]?.split('-')?.[0] || '0')) / 10;
        const [lng, lat] = kmToLngLat(km);
        map.addSource('selected-km', {
          type: 'geojson',
          data: { type: 'Feature', properties: { km: selectedKm }, geometry: { type: 'Point', coordinates: [lng, lat] } },
        });
        map.addLayer({
          id: 'selected-km-ring',
          type: 'circle',
          source: 'selected-km',
          paint: {
            'circle-radius': 18,
            'circle-color': '#f5a623',
            'circle-opacity': 0.0,
            'circle-stroke-color': '#f5a623',
            'circle-stroke-width': 1.6,
          },
        });
      }

      // ---- TRAINS ----
      const trainFeatures = trains.map(t => ({
        type: 'Feature',
        properties: {
          id: t.id, number: t.number, name: t.name, origin: t.origin,
          destination: t.destination, direction: t.direction, currentKm: t.currentKm,
          speed: t.speed, delayMin: t.delayMin, status: t.status, priority: t.priority,
          nextStation: t.nextStation, section: t.viaSection, lastUpdate: t.lastUpdate,
          rake: t.rake, loco: t.loco,
        },
        geometry: { type: 'Point', coordinates: [t.lng, t.lat] },
      }));
      map.addSource('trains', { type: 'geojson', data: { type: 'FeatureCollection', features: trainFeatures } });

      const trainColor = (priority: string, status: string) => {
        if (status === 'critical') return '#e53935';
        if (priority === 'RAJDHANI') return '#5fb1ff';
        if (priority === 'SHATABDI') return '#00bcd4';
        if (priority === 'FREIGHT') return '#a3b0cc';
        if (status === 'warning') return '#f5a623';
        return '#2ecc71';
      };

      map.addLayer({
        id: 'trains-arrow',
        type: 'symbol',
        source: 'trains',
        layout: {
          'text-field': '▶',
          'text-size': 12,
          'text-allow-overlap': true,
          'text-rotate': ['get', 'direction'],
          'text-rotation-alignment': 'map',
        },
        paint: {
          'text-color': ['case',
            ['==', ['get', 'direction'], 'UP'], '#f5a623',
            '#5fb1ff',
          ],
        },
      });
      map.addLayer({
        id: 'trains',
        type: 'circle',
        source: 'trains',
        paint: {
          'circle-radius': ['case', ['==', ['get', 'status'], 'critical'], 9, 7],
          'circle-color': [
            'case',
            ['==', ['get', 'status'], 'critical'], '#e53935',
            ['==', ['get', 'status'], 'warning'], '#f5a623',
            ['==', ['get', 'priority'], 'RAJDHANI'], '#5fb1ff',
            ['==', ['get', 'priority'], 'FREIGHT'], '#a3b0cc',
            '#2ecc71',
          ],
          'circle-stroke-color': '#0a1428',
          'circle-stroke-width': 2,
        },
      });
      map.addLayer({
        id: 'trains-label',
        type: 'symbol',
        source: 'trains',
        layout: {
          'text-field': ['get', 'number'],
          'text-size': 10,
          'text-offset': [0, -1.4],
          'text-anchor': 'bottom',
          'text-font': ['Open Sans Bold'],
        },
        paint: {
          'text-color': '#e3ecff',
          'text-halo-color': '#050b1a',
          'text-halo-width': 1,
        },
      });

      // ---- CLICK POPUPS ----
      const showPopup = (lngLat: [number, number], html: string) => {
        popupsRef.current.forEach(p => p.remove());
        popupsRef.current = [];
        const popup = new maplibregl.Popup({ closeButton: true, closeOnClick: true, offset: 14, maxWidth: '320px' })
          .setLngLat(lngLat)
          .setHTML(html)
          .addTo(map);
        popupsRef.current.push(popup);
        popup.on('close', () => { if (onSelect) onSelect(null); });
      };

      const buildHtml = (props: any, type: string) => {
        if (type === 'train') {
          const status = (props.status || 'normal').toUpperCase();
          const color = trainColor(props.priority, props.status);
          return `
            <div style="font-size:11px;font-family:Menlo,Consolas,monospace;line-height:1.5;">
              <div style="font-size:13px;font-weight:bold;color:#e3ecff;margin-bottom:4px;">▶ ${props.number} · ${props.name}</div>
              <div style="display:flex;gap:6px;margin-bottom:6px;">
                <span style="background:rgba(95,177,255,0.15);color:#5fb1ff;padding:1px 6px;font-size:9px;">${props.priority}</span>
                <span style="background:rgba(${props.status === 'critical' ? '229,57,53' : props.status === 'warning' ? '245,166,35' : '46,204,113'},0.15);color:${color};padding:1px 6px;font-size:9px;">${status}</span>
                <span style="background:rgba(107,122,152,0.2);color:#a3b0cc;padding:1px 6px;font-size:9px;">${props.direction}</span>
              </div>
              <div style="color:#a3b0cc;">Route: <span style="color:#e3ecff;">${props.origin} → ${props.destination}</span></div>
              <div style="color:#a3b0cc;">Section: <span style="color:#e3ecff;">${props.section}</span></div>
              <div style="color:#a3b0cc;">Location: <span style="color:#e3ecff;">KM ${props.currentKm.toFixed(1)}</span></div>
              <div style="color:#a3b0cc;">Next Station: <span style="color:#e3ecff;">${props.nextStation}</span></div>
              <div style="color:#a3b0cc;">Speed: <span style="color:#e3ecff;">${props.speed} km/h</span> · Delay: <span style="color:${props.delayMin > 0 ? '#f5a623' : '#2ecc71'};">+${props.delayMin} min</span></div>
              <div style="color:#a3b0cc;">Loco: <span style="color:#e3ecff;">${props.loco}</span></div>
              <div style="color:#6b7a98;font-size:9px;margin-top:4px;">Last update ${props.lastUpdate}</div>
              <div style="color:#6b7a98;font-size:9px;margin-top:4px;border-top:1px solid #1e2a44;padding-top:3px;">Synthetic demonstration data</div>
            </div>
          `;
        }
        if (type === 'signal') {
          const tr = signals.find(s => s.id === props.id)!;
          return `
            <div style="font-size:11px;font-family:Menlo,Consolas,monospace;line-height:1.5;">
              <div style="font-size:13px;font-weight:bold;color:#e3ecff;">Signal · ${tr.id}</div>
              <div style="color:#a3b0cc;">Type: <span style="color:#e3ecff;">${tr.type}</span></div>
              <div style="color:#a3b0cc;">Aspect: <span style="color:${tr.aspect === 'RED' ? '#e53935' : tr.aspect === 'YELLOW' ? '#f5a623' : '#2ecc71'};">${tr.aspect}</span></div>
              <div style="color:#a3b0cc;">Status: <span style="color:${tr.status === 'critical' ? '#e53935' : tr.status === 'warning' ? '#f5a623' : '#2ecc71'};">${tr.status.toUpperCase()}</span></div>
              <div style="color:#a3b0cc;">Track Circuit: <span style="color:#e3ecff;">${tr.trackCircuit}</span></div>
              <div style="color:#a3b0cc;">Interlocking: <span style="color:#e3ecff;">${tr.interlockingId}</span></div>
              <div style="color:#a3b0cc;">Last Inspection: <span style="color:#e3ecff;">${tr.lastInspected}</span></div>
              ${tr.faults.length ? `<div style="color:#e53935;margin-top:4px;">Faults: ${tr.faults.join(', ')}</div>` : ''}
              <div style="margin-top:6px;display:flex;gap:6px;">
                <a href="/smms" style="color:#5fb1ff;font-size:10px;text-decoration:underline;">View SMMS →</a>
              </div>
            </div>
          `;
        }
        if (type === 'ohe') {
          const o = ohes.find(x => x.id === props.id)!;
          return `
            <div style="font-size:11px;font-family:Menlo,Consolas,monospace;line-height:1.5;">
              <div style="font-size:13px;font-weight:bold;color:#e3ecff;">OHE · ${o.id}</div>
              <div style="color:#a3b0cc;">Type: <span style="color:#e3ecff;">${o.type} · ${o.voltage} kV</span></div>
              <div style="color:#a3b0cc;">Mast: <span style="color:#e3ecff;">${o.mastNo}</span></div>
              <div style="color:#a3b0cc;">Contact Wire Height: <span style="color:#e3ecff;">${o.contactWireHeight} m</span></div>
              <div style="color:#a3b0cc;">Tension: <span style="color:#e3ecff;">${o.tension} kN</span></div>
              <div style="color:#a3b0cc;">Condition: <span style="color:${o.condition === 'critical' ? '#e53935' : o.condition === 'warning' ? '#f5a623' : '#2ecc71'};">${o.condition.toUpperCase()}</span></div>
              <div style="color:#a3b0cc;">Risk Score: <span style="color:${o.riskScore > 70 ? '#e53935' : o.riskScore > 40 ? '#f5a623' : '#2ecc71'};">${o.riskScore}/100</span></div>
              <div style="margin-top:6px;"><a href="/tdms" style="color:#5fb1ff;font-size:10px;text-decoration:underline;">View TDMS →</a></div>
            </div>
          `;
        }
        if (type === 'defect') {
          const d = defects.find(x => x.id === props.id)!;
          return `
            <div style="font-size:11px;font-family:Menlo,Consolas,monospace;line-height:1.5;">
              <div style="font-size:13px;font-weight:bold;color:#e3ecff;">Defect · ${d.id}</div>
              <div style="color:#a3b0cc;">Type: <span style="color:#e3ecff;">${d.assetType} @ KM ${d.assetKm}</span></div>
              <div style="color:#a3b0cc;">Severity: <span style="color:${d.severity === 'critical' ? '#e53935' : '#f5a623'};">${d.severity.toUpperCase()}</span></div>
              <div style="color:#a3b0cc;">Category: <span style="color:#e3ecff;">${d.category}</span></div>
              <div style="color:#c7d3e6;margin-top:4px;">${d.description}</div>
              <div style="color:#a3b0cc;margin-top:4px;">Reported: <span style="color:#e3ecff;">${d.reportedDate}</span></div>
              <div style="margin-top:6px;"><a href="/maintenance" style="color:#5fb1ff;font-size:10px;text-decoration:underline;">Create work order →</a></div>
            </div>
          `;
        }
        if (type === 'workOrder') {
          const w = workOrders.find(x => x.id === props.id)!;
          return `
            <div style="font-size:11px;font-family:Menlo,Consolas,monospace;line-height:1.5;">
              <div style="font-size:13px;font-weight:bold;color:#e3ecff;">Work Order · ${w.id}</div>
              <div style="color:#a3b0cc;">${w.assetType} @ KM ${w.assetKm} · Priority ${w.priority}</div>
              <div style="color:#a3b0cc;">Status: <span style="color:${w.status === 'BLOCKED' || w.status === 'OVERDUE' ? '#e53935' : w.status === 'IN_PROGRESS' ? '#f5a623' : '#2196f3'};">${w.status}</span></div>
              <div style="color:#c7d3e6;margin-top:4px;">${w.problem}</div>
              <div style="color:#a3b0cc;margin-top:4px;">Team: <span style="color:#e3ecff;">${w.team}</span></div>
              <div style="color:#a3b0cc;">Window: <span style="color:#e3ecff;">${w.plannedStart} → ${w.plannedEnd}</span></div>
              ${w.blockId ? `<div style="color:#a3b0cc;">Block: <a href="/block-planner" style="color:#5fb1ff;font-size:10px;">${w.blockId}</a></div>` : ''}
            </div>
          `;
        }
        if (type === 'inspection') {
          const i = inspections.find(x => x.id === props.id)!;
          return `
            <div style="font-size:11px;font-family:Menlo,Consolas,monospace;line-height:1.5;">
              <div style="font-size:13px;font-weight:bold;color:#e3ecff;">Inspection · ${i.id}</div>
              <div style="color:#a3b0cc;">${i.assetType} @ KM ${i.assetKm}</div>
              <div style="color:#a3b0cc;">Status: <span style="color:${i.status === 'OVERDUE' || i.status === 'CRITICAL' ? '#e53935' : i.status === 'DUE' ? '#f5a623' : '#2196f3'};">${i.status}</span></div>
              <div style="color:#a3b0cc;">Inspector: <span style="color:#e3ecff;">${i.inspector}</span></div>
              <div style="color:#a3b0cc;">Scheduled: <span style="color:#e3ecff;">${i.scheduledDate}</span></div>
              <div style="color:#c7d3e6;margin-top:4px;">${i.findings}</div>
            </div>
          `;
        }
        if (type === 'bridge') {
          const b = bridges.find(x => x.id === props.id)!;
          return `
            <div style="font-size:11px;font-family:Menlo,Consolas,monospace;line-height:1.5;">
              <div style="font-size:13px;font-weight:bold;color:#e3ecff;">Bridge · ${b.id}</div>
              <div style="color:#a3b0cc;">${b.name}</div>
              <div style="color:#a3b0cc;">Type: <span style="color:#e3ecff;">${b.type}</span> · Spans: <span style="color:#e3ecff;">${b.spans}</span> · Length: <span style="color:#e3ecff;">${b.length} m</span></div>
              <div style="color:#a3b0cc;">Year Built: <span style="color:#e3ecff;">${b.yearBuilt}</span></div>
              <div style="color:#a3b0cc;">Condition: <span style="color:${b.condition === 'critical' ? '#e53935' : b.condition === 'warning' ? '#f5a623' : '#2ecc71'};">${b.condition.toUpperCase()}</span></div>
              <div style="color:#a3b0cc;">Risk: <span style="color:${b.riskScore > 70 ? '#e53935' : b.riskScore > 40 ? '#f5a623' : '#2ecc71'};">${b.riskScore}/100</span></div>
              <div style="margin-top:6px;"><a href="/bridges" style="color:#5fb1ff;font-size:10px;text-decoration:underline;">View Bridges →</a></div>
            </div>
          `;
        }
        return '';
      };

      // Click handlers per layer
      const clickHandlers = [
        { layer: 'trains', type: 'train' },
        { layer: 'assets-signal', type: 'signal' },
        { layer: 'assets-ohe', type: 'ohe' },
        { layer: 'assets-bridge', type: 'bridge' },
        { layer: 'assets-defect', type: 'defect' },
        { layer: 'assets-workOrder', type: 'workOrder' },
        { layer: 'assets-inspection', type: 'inspection' },
      ];

      clickHandlers.forEach(({ layer, type }) => {
        map.on('click', layer, (e) => {
          const f = e.features?.[0];
          if (!f) return;
          const p = f.properties as any;
          const html = buildHtml(p, type);
          showPopup([(f.geometry as any).coordinates[0], (f.geometry as any).coordinates[1]], html);
          map.flyTo({ center: [(f.geometry as any).coordinates[0], (f.geometry as any).coordinates[1]], zoom: Math.max(map.getZoom(), 13) });
          if (onSelect) onSelect({ type: type as any, id: p.id, ...p });
        });
        map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = ''; });
      });

      // Hover on assets — change cursor
      map.on('mouseenter', 'stations-dot', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'stations-dot', () => { map.getCanvas().style.cursor = ''; });

      // Click empty space — open location intelligence for nearest KM if needed
      if (selectionMode === 'point') {
        map.on('click', (e) => {
          // approximate lng → km
          const start = sectionCorridor.DLI;
          const end = sectionCorridor.GZB;
          const t = (e.lngLat.lng - start[0]) / (end[0] - start[0]);
          const km = 120 + 13 * Math.max(0, Math.min(1, t));
          const kmStr = `${Math.floor(km)}/${Math.round((km % 1) * 10)}`;
          const lngLat: [number, number] = [e.lngLat.lng, e.lngLat.lat];
          showPopup(lngLat, `
            <div style="font-size:11px;font-family:Menlo,Consolas,monospace;line-height:1.5;">
              <div style="font-size:13px;font-weight:bold;color:#e3ecff;">Location @ KM ${kmStr}</div>
              <div style="color:#a3b0cc;">Section: <span style="color:#e3ecff;">DLI–GZB</span></div>
              <div style="margin-top:6px;"><a href="/location?km=${encodeURIComponent(kmStr)}" style="color:#5fb1ff;font-size:10px;text-decoration:underline;">Open Location Intelligence →</a></div>
            </div>
          `);
          if (onSelect) onSelect({ type: 'defect', id: `loc-${kmStr}`, km: kmStr } as any);
        });
      }

      setReady(true);
    });

    mapRef.current = map;

    return () => {
      popupsRef.current.forEach(p => p.remove());
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Center on selectedKm when changes
  useEffect(() => {
    if (!ready || !mapRef.current || !selectedKm) return;
    const km = parseFloat(selectedKm.split('/')[0]) + (parseFloat(selectedKm.split('/')[1]?.split('-')?.[0] || '0')) / 10;
    const [lng, lat] = kmToLngLat(km);
    mapRef.current.flyTo({ center: [lng, lat], zoom: 14 });
  }, [selectedKm, ready]);

  const toggleLayer = (key: string) => {
    setLayers(prev => prev.map(l => l.key === key ? { ...l, visible: !l.visible } : l));
  };

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const m = mapRef.current;
    const apply = (id: string, on: boolean) => {
      if (m.getLayer(id)) m.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none');
    };
    layers.forEach(l => {
      if (l.key === 'tracks') { ['tracks-shadow', 'tracks-base', 'tracks-rail'].forEach(x => apply(x, l.visible)); }
      if (l.key === 'stations') { ['stations-halo', 'stations-dot', 'stations-label'].forEach(x => apply(x, l.visible)); }
      if (l.key === 'signals') { ['assets-signal-halo', 'assets-signal'].forEach(x => apply(x, l.visible)); }
      if (l.key === 'ohe') { ['assets-ohe-halo', 'assets-ohe'].forEach(x => apply(x, l.visible)); }
      if (l.key === 'bridges') { ['assets-bridge-halo', 'assets-bridge'].forEach(x => apply(x, l.visible)); }
      if (l.key === 'defects') { ['assets-defect-halo', 'assets-defect'].forEach(x => apply(x, l.visible)); }
      if (l.key === 'inspections') { ['assets-inspection-halo', 'assets-inspection'].forEach(x => apply(x, l.visible)); }
      if (l.key === 'blocks') { apply('selected-km-ring', l.visible); }
      if (l.key === 'trains') { ['trains', 'trains-label', 'trains-arrow'].forEach(x => apply(x, l.visible)); }
      if (l.key === 'workOrders') { ['assets-workOrder-halo', 'assets-workOrder'].forEach(x => apply(x, l.visible)); }
    });
  }, [layers, ready]);

  // Search jump
  const doSearch = () => {
    if (!search.trim() || !mapRef.current) return;
    const q = search.toLowerCase().trim();
    // Try station
    const stn = stations.find(s => s.code.toLowerCase() === q || s.name.toLowerCase().includes(q));
    if (stn) {
      mapRef.current.flyTo({ center: [stn.lng, stn.lat], zoom: 13 });
      popupsRef.current.forEach(p => p.remove());
      const popup = new maplibregl.Popup({ closeButton: true, offset: 14 })
        .setLngLat([stn.lng, stn.lat])
        .setHTML(`<div style="font-size:11px;"><div style="font-size:13px;font-weight:bold;color:#e3ecff;">${stn.code} · ${stn.name}</div><div style="color:#a3b0cc;">Platforms: ${stn.platforms} · KM ${stn.km}</div></div>`)
        .addTo(mapRef.current);
      popupsRef.current = [popup];
      return;
    }
    // Try train number
    const tr = trains.find(t => t.number === q || t.name.toLowerCase().includes(q));
    if (tr) {
      mapRef.current.flyTo({ center: [tr.lng, tr.lat], zoom: 13 });
      popupsRef.current.forEach(p => p.remove());
      const popup = new maplibregl.Popup({ closeButton: true, offset: 14 })
        .setLngLat([tr.lng, tr.lat])
        .setHTML(`<div style="font-size:11px;"><div style="font-size:13px;font-weight:bold;color:#e3ecff;">${tr.number} · ${tr.name}</div><div style="color:#a3b0cc;">${tr.origin} → ${tr.destination} · KM ${tr.currentKm} · ${tr.speed} km/h</div></div>`)
        .addTo(mapRef.current);
      popupsRef.current = [popup];
      return;
    }
    // Try asset id
    const allAssets: any[] = [
      ...signals.map(s => ({ ...s, kind: 'signal' })),
      ...ohes.map(s => ({ ...s, kind: 'ohe' })),
      ...tracks.map(s => ({ ...s, kind: 'track' })),
    ];
    const found = allAssets.find(a => a.id.toLowerCase().includes(q));
    if (found) {
      // jump to first km
      const km = parseFloat((found.km || '0/0').split('/')[0]);
      const [lng, lat] = kmToLngLat(km);
      mapRef.current.flyTo({ center: [lng, lat], zoom: 14 });
      popupsRef.current.forEach(p => p.remove());
      const popup = new maplibregl.Popup({ closeButton: true, offset: 14 })
        .setLngLat([lng, lat])
        .setHTML(`<div style="font-size:11px;"><div style="font-size:13px;font-weight:bold;color:#e3ecff;">${found.id}</div><div style="color:#a3b0cc;">${found.kind} @ KM ${found.km}</div></div>`)
        .addTo(mapRef.current);
      popupsRef.current = [popup];
    }
  };

  return (
    <div className="relative w-full" style={{ height }}>
      <div ref={containerRef} className="absolute inset-0 bg-[#050b1a] bg-grid" />

      {/* Search bar */}
      <div className="absolute top-3 left-3 flex items-center gap-1 z-10 bg-[#081428]/90 border border-[#2a3650] rounded-sm px-2 py-1 backdrop-blur">
        <Search size={12} className="text-[#6b7a98]" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && doSearch()}
          placeholder="Search station, train no., asset id, KM…"
          className="bg-transparent text-[11px] text-[#e3ecff] placeholder-[#6b7a98] outline-none w-[260px] font-mono"
        />
      </div>

      {/* Layer panel */}
      {showFilters && (
        <div className="absolute top-3 right-3 z-10 bg-[#081428]/95 border border-[#2a3650] rounded-sm backdrop-blur w-[200px]">
          <div className="px-2 py-1.5 border-b border-[#1e2a44] flex items-center justify-between">
            <span className="text-[10px] text-[#e3ecff] font-mono uppercase tracking-wider flex items-center gap-1">
              <Layers size={11} /> Layers
            </span>
          </div>
          <div className="p-1.5 space-y-0.5">
            {layers.map(l => (
              <label key={l.key} className="flex items-center gap-2 px-1 py-0.5 hover:bg-[#112347] cursor-pointer rounded-sm">
                <input
                  type="checkbox"
                  checked={l.visible}
                  onChange={() => toggleLayer(l.key)}
                  className="appearance-none w-3 h-3 border border-[#2a3650] rounded-sm checked:bg-[#5fb1ff] checked:border-[#5fb1ff]"
                />
                <span className="text-[10px] text-[#c7d3e6]">{l.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-12 right-3 z-10 bg-[#081428]/95 border border-[#2a3650] rounded-sm backdrop-blur p-2 text-[10px] font-mono">
        <div className="text-[#6b7a98] uppercase tracking-wider mb-1">Status Legend</div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#2ecc71]"></span><span className="text-[#c7d3e6]">Normal</span></div>
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#f5a623]"></span><span className="text-[#c7d3e6]">Warning</span></div>
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#e53935]"></span><span className="text-[#c7d3e6]">Critical</span></div>
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#2196f3]"></span><span className="text-[#c7d3e6]">Info</span></div>
        </div>
        <div className="border-t border-[#1e2a44] mt-1.5 pt-1.5 text-[#6b7a98]">
          Synthetic demonstration · not live data
        </div>
      </div>

      {/* KPI strip overlay */}
      <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-1.5 text-[10px] text-[#6b7a98] font-mono bg-[#081428]/80 border border-[#2a3650] rounded-sm px-2 py-1 backdrop-blur">
          <span>TRAINS</span><span className="text-[#e3ecff]">{kpiMetrics.activeTrains}</span>
          <span className="text-[#1e2a44]">|</span>
          <span>DELAYED</span><span className="text-[#f5a623]">{kpiMetrics.delayedTrains}</span>
          <span className="text-[#1e2a44]">|</span>
          <span>BLOCKS</span><span className="text-[#2196f3]">{kpiMetrics.activeBlocks}</span>
          <span className="text-[#1e2a44]">|</span>
          <span>CRIT</span><span className="text-[#e53935]">{alerts.filter(a => a.level === 'critical' && !a.acknowledged).length}</span>
        </div>
        <div className="flex items-center gap-1 text-[9px] text-[#6b7a98] font-mono bg-[#081428]/80 border border-[#2a3650] rounded-sm px-2 py-1 backdrop-blur">
          <span>RAILNET AI · MapLibre GL · OpenStreetMap contributors</span>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle, ChevronRight, Clock, Compass, Crosshair, Gauge, Layers,
  MapPin, Search, Sparkles, Train, Wifi, WifiOff, X, Zap, ArrowDown, ArrowUp,
} from 'lucide-react';
import TwinMap, { DEFAULT_LAYERS, LayerState } from '../components/TwinMap';
import { LiveMapRailRadarOverlay } from '../components/RailRadarPanel';
import {
  extendedTrains, getTrainPosition, searchAll, SearchResult, REF_TIME, REF_DATE,
  ExtendedTrain,
} from '../lib/trainRoutes';

type MapStatus = 'LOADING' | 'CONNECTED' | 'FALLBACK';

export default function LiveMap() {
  const navigate = useNavigate();
  const [layers, setLayers] = useState<LayerState>(DEFAULT_LAYERS);
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const [selectedTrainId, setSelectedTrainId] = useState<string | null>(null);
  const [selectedStationCode, setSelectedStationCode] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [layersOpen, setLayersOpen] = useState(true);
  const [tickTime, setTickTime] = useState({ hh: REF_TIME.hh, mm: REF_TIME.mm });
  const [mapStatus, setMapStatus] = useState<MapStatus>('LOADING');
  const [statusInfo, setStatusInfo] = useState<string>('');
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ---------- TRAIN POSITIONS ----------
  const trainPositions = useMemo(() => {
    const out: Record<string, ReturnType<typeof getTrainPosition>> = {};
    for (const t of extendedTrains) {
      out[t.id] = getTrainPosition(t, tickTime.hh, tickTime.mm);
    }
    return out;
  }, [tickTime]);

  const trainsGeoJSON = useMemo(() => {
    const features: any[] = [];
    for (const t of extendedTrains) {
      const pos = trainPositions[t.id];
      if (!pos) continue;
      features.push({
        type: 'Feature',
        properties: {
          id: t.id, number: t.number, name: t.name,
          direction: t.direction, priority: t.priority, status: t.status,
          delayMin: t.delayMin, speed: pos.currentStation ? 0 : t.speed,
        },
        geometry: { type: 'Point', coordinates: [pos.lng, pos.lat] },
      });
    }
    return { type: 'FeatureCollection', features };
  }, [trainPositions]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('twinmap-trains', { detail: trainsGeoJSON }));
  }, [trainsGeoJSON]);

  // ---------- SIMULATED TIME ----------
  useEffect(() => {
    const i = setInterval(() => {
      setTickTime(t => {
        let mm = t.mm + 1;
        let hh = t.hh;
        if (mm >= 60) { mm -= 60; hh = (hh + 1) % 24; }
        return { hh, mm };
      });
    }, 8000);
    return () => clearInterval(i);
  }, []);

  // ---------- SEARCH ----------
  useEffect(() => {
    const q = searchQ.trim();
    if (q.length < 1) {
      setSearchResults([]);
      setHighlightIdx(0);
      return;
    }
    setSearchResults(searchAll(q));
    setHighlightIdx(0);
  }, [searchQ]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const selectedTrain = selectedTrainId ? extendedTrains.find(t => t.id === selectedTrainId) : null;
  const selectedTrainPos = selectedTrainId ? trainPositions[selectedTrainId] : null;

  const selectedRouteData = useMemo(() => {
    if (!selectedTrain || !selectedTrainPos) return null;
    const routeStartKm = selectedTrain.schedule[0].km;
    const routeEndKm = selectedTrain.schedule[selectedTrain.schedule.length - 1].km;
    const routeSpan = routeEndKm - routeStartKm || 1;
    const stops = selectedTrain.schedule.map(s => {
      const stopProgress = (s.km - routeStartKm) / routeSpan;
      const passed = selectedTrain.direction === 'UP'
        ? selectedTrainPos.progress >= stopProgress - 0.01
        : selectedTrainPos.progress >= stopProgress - 0.01;
      const isCurrent = selectedTrainPos.currentStation?.code === s.code;
      return {
        code: s.code, name: s.name, lng: s.lng, lat: s.lat,
        km: s.km, arrive: s.arrive, depart: s.depart,
        passed, isCurrent,
      };
    });
    return {
      trainId: selectedTrain.id,
      trainName: selectedTrain.name,
      trainNumber: selectedTrain.number,
      color: selectedTrain.priority === 'RAJDHANI' ? '#5fb1ff'
           : selectedTrain.priority === 'SHATABDI' ? '#00bcd4'
           : selectedTrain.priority === 'DURONTO'  ? '#a78bfa'
           : '#f5a623',
      routePolyline: selectedTrainPos.routePolyline,
      trackedPolyline: selectedTrainPos.trackedPolyline,
      remainingPolyline: selectedTrainPos.remainingPolyline,
      currentPos: { lat: selectedTrainPos.lat, lng: selectedTrainPos.lng, km: selectedTrainPos.km },
      stops,
      direction: selectedTrain.direction,
    };
  }, [selectedTrain, selectedTrainPos]);

  const handleSelectResult = (r: SearchResult) => {
    setSearchOpen(false);
    setSearchQ('');
    setSearchResults([]);
    setHighlightIdx(0);
    if (r.type === 'TRAIN') {
      setSelectedTrainId(r.refId);
      setSelectedStationCode(null);
      setSelectedAssetId(null);
    } else if (r.type === 'STATION') {
      setSelectedStationCode(r.refId);
      setSelectedTrainId(null);
      setSelectedAssetId(null);
    } else if (r.type === 'ASSET') {
      setSelectedAssetId(r.refId);
      setSelectedTrainId(null);
      setSelectedStationCode(null);
    }
  };

  const onSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx(i => Math.min(i + 1, searchResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const r = searchResults[highlightIdx];
      if (r) handleSelectResult(r);
    } else if (e.key === 'Escape') {
      setSearchOpen(false);
      inputRef.current?.blur();
    }
  };

  const closeTrainPanel = () => setSelectedTrainId(null);

  return (
    <div className="flex flex-col h-full bg-[#050b1a] overflow-hidden">
      {/* HEADER */}
      <div className="px-4 py-2 border-b border-[#1e2a44] flex items-center justify-between bg-[#081428] gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="text-[10px] text-[#6b7a98] font-mono uppercase tracking-wider">Live Railway Map · Digital Twin</div>
          <h1 className="text-lg font-semibold text-[#e3ecff] truncate">
            RAILNET AI · OSM + OpenRailwayMap · Estimated Train Positions
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <MapStatusBadge status={mapStatus} info={statusInfo} />
          <span className="chip chip-amber">DATA: SYNTHETIC DEMO</span>
          <span className="chip chip-blue">DEMO {String(tickTime.hh).padStart(2, '0')}:{String(tickTime.mm).padStart(2, '0')} IST</span>
          <span className="chip chip-grey">{REF_DATE}</span>
          {selectedTrainId && (
            <button onClick={() => navigate('/coa')} className="px-3 py-1 bg-[#112347] hover:bg-[#1a2c5a] text-[#e3ecff] text-[10px] border border-[#2a3650] flex items-center gap-1">
              <Train size={10} /> COA Board
            </button>
          )}
        </div>
      </div>

      {/* MAIN */}
      <div className="flex-1 flex min-h-0">
        {/* MAP */}
        <div className={`relative flex-1 ${selectedTrainId ? 'border-r border-[#1e2a44]' : ''}`}>
          <TwinMap
            layers={layers}
            selectedTrainId={selectedTrainId}
            selectedTrainData={selectedRouteData}
            selectedStationCode={selectedStationCode}
            selectedAssetId={selectedAssetId}
            onSelectTrain={(id) => { setSelectedTrainId(id); setSelectedStationCode(null); setSelectedAssetId(null); }}
            onSelectStation={(code) => { setSelectedStationCode(code); setSelectedTrainId(null); setSelectedAssetId(null); }}
            onSelectAsset={(id) => { setSelectedAssetId(id); setSelectedTrainId(null); setSelectedStationCode(null); }}
            onMapStatus={(s, i) => { setMapStatus(s); setStatusInfo(i || ''); }}
          />

          {/* RAIL RADAR OVERLAY */}
          <LiveMapRailRadarOverlay />

          {/* SEARCH */}
          <div ref={searchRef} className="absolute top-3 left-3 z-30 w-[400px]">
            <div className={`flex items-center gap-1.5 bg-[#081428]/98 border-2 rounded-sm px-2.5 py-2 backdrop-blur shadow-2xl transition-colors ${
              searchFocused ? 'border-[#5fb1ff] shadow-[0_0_0_3px_rgba(95,177,255,0.15)]' : 'border-[#2a3650]'
            }`}>
              <Search size={14} className="text-[#5fb1ff]" />
              <input
                ref={inputRef}
                value={searchQ}
                onChange={e => { setSearchQ(e.target.value); setSearchOpen(true); }}
                onFocus={() => { setSearchFocused(true); setSearchOpen(true); }}
                onBlur={() => setSearchFocused(false)}
                onKeyDown={onSearchKeyDown}
                placeholder="Search train, station, asset… (e.g. Rajdhani, 12951, NDLS)"
                className="flex-1 bg-transparent text-[12px] text-[#e3ecff] placeholder-[#6b7a98] outline-none font-mono"
              />
              {searchQ && (
                <button onClick={() => { setSearchQ(''); setSearchResults([]); inputRef.current?.focus(); }} className="text-[#6b7a98] hover:text-white p-0.5">
                  <X size={12} />
                </button>
              )}
              <span className="kbd ml-1">/</span>
            </div>

            {searchOpen && searchQ.trim().length >= 1 && searchResults.length > 0 && (
              <div className="mt-1 bg-[#081428]/98 border-2 border-[#5fb1ff] rounded-sm backdrop-blur max-h-[500px] overflow-y-auto scroll-thin shadow-2xl">
                {(['TRAIN', 'STATION', 'ASSET'] as const).map(group => {
                  const items = searchResults.filter(r => r.type === group);
                  if (items.length === 0) return null;
                  return (
                    <div key={group}>
                      <div className="px-2.5 py-1 text-[9px] text-[#5fb1ff] font-mono uppercase tracking-wider bg-[#0d1c36] border-b border-[#1e2a44] sticky top-0">
                        {group}S · {items.length} match{items.length === 1 ? '' : 'es'}
                      </div>
                      {items.map(r => {
                        const globalIdx = searchResults.findIndex(x => x.refId === r.refId && x.type === r.type);
                        const isHL = globalIdx === highlightIdx;
                        return (
                          <button
                            key={`${r.type}-${r.refId}`}
                            onMouseEnter={() => setHighlightIdx(globalIdx)}
                            onClick={() => handleSelectResult(r)}
                            className={`w-full text-left px-2.5 py-2 border-b border-[#1e2a44] last:border-0 flex items-start gap-2.5 transition-colors ${
                              isHL ? 'bg-[#112347]' : 'hover:bg-[#112347]'
                            }`}
                          >
                            <span className="mt-0.5">
                              {r.type === 'TRAIN' && <Train size={12} className="text-[#5fb1ff]" />}
                              {r.type === 'STATION' && <MapPin size={12} className="text-[#f5a623]" />}
                              {r.type === 'ASSET' && <Layers size={12} className="text-[#00bcd4]" />}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="text-[12px] text-[#e3ecff] truncate font-medium">{r.label}</div>
                              <div className="text-[10px] text-[#6b7a98] font-mono truncate">{r.sub}</div>
                            </div>
                            <ChevronRight size={11} className="text-[#6b7a98] mt-1.5" />
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
                <div className="px-2.5 py-1.5 text-[9px] text-[#6b7a98] font-mono border-t border-[#1e2a44] bg-[#050b1a] flex items-center gap-3">
                  <span>↑↓ navigate</span><span>↵ select</span><span>esc close</span>
                </div>
              </div>
            )}

            {searchOpen && searchQ.trim().length >= 1 && searchResults.length === 0 && (
              <div className="mt-1 bg-[#081428]/98 border border-[#2a3650] rounded-sm backdrop-blur px-3 py-3 text-[11px] text-[#6b7a98] font-mono">
                No matching trains, stations or assets for "<span className="text-[#e3ecff]">{searchQ}</span>"
              </div>
            )}

            {searchOpen && searchQ.trim().length < 1 && (
              <div className="mt-1 bg-[#081428]/98 border border-[#2a3650] rounded-sm backdrop-blur px-3 py-2.5 text-[10px] text-[#6b7a98] font-mono space-y-1">
                <div className="text-[#5fb1ff] uppercase tracking-wider text-[9px]">Tip · type a train name or number</div>
                <div>Try: <span className="text-[#e3ecff]">Rajdhani</span>, <span className="text-[#e3ecff]">12951</span>, <span className="text-[#e3ecff]">Delhi</span>, <span className="text-[#e3ecff]">NDLS</span>, <span className="text-[#e3ecff]">Shatabdi</span>, <span className="text-[#e3ecff]">124/5</span></div>
              </div>
            )}
          </div>

          {/* LAYER CONTROL */}
          <div className="absolute top-3 right-3 z-30 w-[240px]">
            <button
              onClick={() => setLayersOpen(o => !o)}
              className="w-full flex items-center justify-between bg-[#081428]/95 border border-[#2a3650] rounded-sm px-2 py-1.5 text-[10px] text-[#e3ecff] font-mono uppercase tracking-wider backdrop-blur hover:bg-[#0d1c36]"
            >
              <span className="flex items-center gap-1.5"><Layers size={11} /> Layer Control</span>
              <span className="text-[#6b7a98]">{layersOpen ? '−' : '+'}</span>
            </button>
            {layersOpen && (
              <div className="mt-1 bg-[#081428]/98 border border-[#2a3650] rounded-sm backdrop-blur p-1.5 space-y-0.5 shadow-lg max-h-[460px] overflow-y-auto scroll-thin">
                <div className="text-[9px] text-[#5fb1ff] uppercase tracking-wider px-1 pt-1">Base Map</div>
                <LayerCheck k="baseMap" label="Map Tiles (OSM)" layers={layers} setLayers={setLayers} />
                <LayerCheck k="osm" label="OSM Voyager" layers={layers} setLayers={setLayers} />
                <LayerCheck k="opnv" label="OpenRailwayMap overlay" layers={layers} setLayers={setLayers} />
                <div className="text-[9px] text-[#5fb1ff] uppercase tracking-wider px-1 pt-1.5 mt-1 border-t border-[#1e2a44]">Railway Infrastructure</div>
                <LayerCheck k="tracks" label="Tracks" layers={layers} setLayers={setLayers} />
                <LayerCheck k="stations" label="Stations" layers={layers} setLayers={setLayers} />
                <LayerCheck k="junctions" label="Junctions" layers={layers} setLayers={setLayers} />
                <LayerCheck k="halts" label="Halts" layers={layers} setLayers={setLayers} />
                <LayerCheck k="yd" label="Yards" layers={layers} setLayers={setLayers} />
                <LayerCheck k="levelCrossings" label="Level Crossings" layers={layers} setLayers={setLayers} />
                <LayerCheck k="bridges" label="Bridges" layers={layers} setLayers={setLayers} />
                <LayerCheck k="signals" label="Signals" layers={layers} setLayers={setLayers} />
                <LayerCheck k="ohe" label="OHE Masts" layers={layers} setLayers={setLayers} />
                <LayerCheck k="switches" label="Switches" layers={layers} setLayers={setLayers} />
                <div className="text-[9px] text-[#5fb1ff] uppercase tracking-wider px-1 pt-1.5 mt-1 border-t border-[#1e2a44]">RAILNET Asset Data</div>
                <LayerCheck k="defects" label="Defects" layers={layers} setLayers={setLayers} />
                <LayerCheck k="inspections" label="Inspections" layers={layers} setLayers={setLayers} />
                <LayerCheck k="workOrders" label="Work Orders" layers={layers} setLayers={setLayers} />
                <LayerCheck k="blocks" label="Blocks" layers={layers} setLayers={setLayers} />
                <LayerCheck k="trains" label="Trains (estimated)" layers={layers} setLayers={setLayers} />
                <div className="border-t border-[#1e2a44] pt-1 mt-1 flex gap-1">
                  <button onClick={() => setLayers(DEFAULT_LAYERS)} className="flex-1 px-1 py-1 text-[9px] bg-[#112347] border border-[#2a3650] text-[#e3ecff] font-mono">ALL</button>
                  <button onClick={() => setLayers({
                    ...DEFAULT_LAYERS,
                    ohe: false, switches: false, yd: false, levelCrossings: false,
                    inspections: false, defects: false, workOrders: false, signals: false,
                  })} className="flex-1 px-1 py-1 text-[9px] bg-[#112347] border border-[#2a3650] text-[#e3ecff] font-mono">CORE</button>
                </div>
              </div>
            )}
          </div>

          {/* LEGEND */}
          <div className="absolute bottom-12 left-3 z-20 bg-[#081428]/95 border border-[#2a3650] rounded-sm backdrop-blur p-2 max-w-[260px]">
            <div className="text-[9px] text-[#5fb1ff] font-mono uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Sparkles size={9} /> OpenRailwayMap · Railway Layers
            </div>
            <div className="space-y-0.5 text-[10px] font-mono">
              <LegendRow swatch={<div className="w-4 h-0.5 bg-[#e3ecff]"></div>} label="Main line (UP/DN)" />
              <LegendRow swatch={<div className="w-4 h-0.5 bg-[#a3b0cc]"></div>} label="Branch" />
              <LegendRow swatch={<div className="w-2 h-2 rounded-full bg-[#dc2626] border border-white"></div>} label="Terminal / Junction" />
              <LegendRow swatch={<div className="w-2 h-2 rounded-full bg-[#ef4444] border border-[#fbbf24]"></div>} label="Halt" />
              <LegendRow swatch={<div className="w-2 h-2 rounded-full bg-[#fbbf24] border border-[#0a1428]"></div>} label="Level crossing" />
              <LegendRow swatch={<div className="w-3 h-0.5 bg-[#f5a623]"></div>} label="Bridge" />
              <LegendRow swatch={<div className="w-2 h-2 rounded-full bg-[#2ecc71]"></div>} label="Signal" />
              <LegendRow swatch={<div className="w-1 h-1 rounded-full bg-[#00bcd4]"></div>} label="OHE mast" />
              <LegendRow swatch={<div className="w-2 h-2 rounded-full bg-[#00bcd4]"></div>} label="Point machine" />
              <LegendRow swatch={<span className="text-[#ff6b66] text-[10px]">▲</span>} label="Defect" />
              <LegendRow swatch={<span className="text-[#5fb1ff] text-[10px]">◆</span>} label="Inspection" />
              <LegendRow swatch={<span className="text-[#ff6b66] text-[10px]">■</span>} label="Work order" />
              <LegendRow swatch={<div className="w-3 h-0 border-t border-dashed border-[#f5a623]"></div>} label="Block window" />
              <LegendRow swatch={<div className="w-2 h-2 rounded-full bg-[#5fb1ff]"></div>} label="Train" />
            </div>
          </div>

          {/* DATA SOURCE FOOTER */}
          <div className="absolute bottom-3 right-3 z-20 bg-[#081428]/95 border border-[#2a3650] rounded-sm backdrop-blur px-2 py-1 text-[9px] font-mono text-[#6b7a98] space-y-0.5">
            <div className="flex items-center gap-1">
              <span>MAP:</span>
              <span className={mapStatus === 'CONNECTED' ? 'text-[#2ecc71]' : mapStatus === 'FALLBACK' ? 'text-[#f5a623]' : 'text-[#5fb1ff]'}>
                {mapStatus === 'CONNECTED' ? 'CONNECTED · OSM + OpenRailwayMap' :
                 mapStatus === 'FALLBACK'  ? 'LOCAL FALLBACK · railway geometry active' :
                 'LOADING…'}
              </span>
            </div>
            {statusInfo && mapStatus === 'CONNECTED' && <div className="text-[#a3b0cc]">{statusInfo}</div>}
            <div>TRAINS: <span className="text-[#f5a623]">Estimated from timetable</span> · not live</div>
            <div>RAILNET ASSETS: <span className="text-[#00bcd4]">Synthetic demo dataset</span></div>
          </div>
        </div>

        {/* TRAIN DETAILS PANEL */}
        {selectedTrainId && selectedTrain && selectedTrainPos && (
          <TrainDetailsPanel
            train={selectedTrain}
            position={selectedTrainPos}
            onClose={closeTrainPanel}
            onOpenLocationIntelligence={() => {
              const km = selectedTrainPos.km;
              const kmStr = `${Math.floor(km)}/${Math.round((km % 1) * 10)}`;
              navigate(`/location?km=${encodeURIComponent(kmStr)}`);
            }}
          />
        )}
      </div>
    </div>
  );
}

function MapStatusBadge({ status, info }: { status: MapStatus; info?: string }) {
  if (status === 'LOADING') {
    return (
      <span className="chip chip-blue flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-[#5fb1ff] animate-pulse"></span>
        MAP: LOADING
      </span>
    );
  }
  if (status === 'CONNECTED') {
    return (
      <span className="chip chip-green flex items-center gap-1" title={info || ''}>
        <Wifi size={10} />
        MAP: CONNECTED
      </span>
    );
  }
  return (
    <span className="chip chip-amber flex items-center gap-1" title={info || ''}>
      <WifiOff size={10} />
      MAP: FALLBACK
    </span>
  );
}

function LayerCheck({ k, label, layers, setLayers }: { k: keyof LayerState; label: string; layers: LayerState; setLayers: any }) {
  return (
    <label className="flex items-center gap-2 px-1 py-0.5 hover:bg-[#112347] cursor-pointer rounded-sm">
      <input
        type="checkbox"
        checked={layers[k]}
        onChange={() => setLayers((p: LayerState) => ({ ...p, [k]: !p[k] }))}
        className="appearance-none w-3 h-3 border border-[#2a3650] rounded-sm checked:bg-[#5fb1ff] checked:border-[#5fb1ff]"
      />
      <span className="text-[10px] text-[#c7d3e6]">{label}</span>
    </label>
  );
}

function LegendRow({ swatch, label }: { swatch: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 text-[#c7d3e6]">
      <span className="w-4 flex justify-center">{swatch}</span>
      <span>{label}</span>
    </div>
  );
}

function TrainDetailsPanel({
  train, position, onClose, onOpenLocationIntelligence,
}: {
  train: ExtendedTrain;
  position: any;
  onClose: () => void;
  onOpenLocationIntelligence: () => void;
}) {
  const sectionDistance = Math.abs(train.schedule[train.schedule.length - 1].km - train.schedule[0].km);
  const elapsed = position.progress * sectionDistance;
  const remaining = Math.max(sectionDistance - elapsed, 0);
  const pct = Math.min(100, Math.max(0, position.progress * 100));

  return (
    <div className="w-[420px] bg-[#081428] border-l border-[#1e2a44] flex flex-col overflow-hidden">
      <div className="px-3 py-2.5 border-b border-[#1e2a44] bg-[#0d1c36]">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-[#5fb1ff] tracking-wider uppercase">Train Information</span>
            <span className={`chip ${position.source === 'ESTIMATED' ? 'chip-amber' : 'chip-blue'}`} style={{ fontSize: 9 }}>
              {position.source === 'ESTIMATED' ? 'Estimated' : 'Timetable'}
            </span>
          </div>
          <button onClick={onClose} className="text-[#6b7a98] hover:text-white"><X size={14} /></button>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-[20px] font-bold text-[#e3ecff] font-mono">{train.number}</span>
          <span className="text-[12px] text-[#a3b0cc] truncate">{train.name}</span>
        </div>
        <div className="text-[11px] text-[#6b7a98] font-mono mt-0.5">
          {train.origin} → {train.destination} · via {train.via}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scroll-thin">
        <div className="grid grid-cols-2 gap-0 border-b border-[#1e2a44] text-[11px] font-mono">
          <Cell label="Train Number" value={<span className="text-[#e3ecff] font-bold">{train.number}</span>} />
          <Cell label="Train Name" value={<span className="text-[#e3ecff] truncate">{train.name}</span>} />
          <Cell label="Origin" value={<span className="text-[#e3ecff]">{train.origin}</span>} />
          <Cell label="Destination" value={<span className="text-[#e3ecff]">{train.destination}</span>} />
          <Cell label="Current Location" value={<span className="text-[#f5a623]">KM {position.km.toFixed(1)}</span>} />
          <Cell label="Direction" value={<span className="text-[#e3ecff] flex items-center gap-1">{train.direction === 'UP' ? <ArrowUp size={10} /> : <ArrowDown size={10} />}{train.direction}</span>} />
          <Cell label="Status" value={
            <span className={`chip ${train.status === 'critical' ? 'chip-red' : train.status === 'warning' ? 'chip-amber' : train.status === 'info' ? 'chip-blue' : 'chip-green'}`}>{train.status.toUpperCase()}</span>
          } />
          <Cell label="Delay" value={
            <span className={train.delayMin > 15 ? 'text-[#e53935]' : train.delayMin > 0 ? 'text-[#f5a623]' : 'text-[#2ecc71]'}>
              {train.delayMin > 0 ? `+${train.delayMin} min` : 'on time'}
            </span>
          } />
          <Cell label="Previous Station" value={
            <span className="text-[#a3b0cc]">{position.previousStation ? `${position.previousStation.code} · ${position.previousStation.name}` : '—'}</span>
          } />
          <Cell label="Next Station" value={
            <span className="text-[#f5a623]">{position.nextStation ? `${position.nextStation.code} · ${position.nextStation.name}` : '—'}</span>
          } />
          <Cell label="Speed" value={
            <span className="text-[#e3ecff] flex items-center gap-1"><Gauge size={10} /> {position.currentStation ? '0' : train.speed} km/h</span>
          } />
          <Cell label="Priority" value={<span className="text-[#e3ecff]">{train.priority}</span>} />
        </div>

        <div className="border-b border-[#1e2a44]">
          <div className="px-3 py-1.5 bg-[#0d1c36] border-b border-[#1e2a44] flex items-center gap-2">
            <Compass size={11} className="text-[#5fb1ff]" />
            <span className="text-[10px] text-[#e3ecff] font-mono uppercase tracking-wider">Journey Progress</span>
          </div>
          <div className="px-3 py-2">
            <div className="flex items-center justify-between text-[10px] font-mono mb-1">
              <span className="text-[#a3b0cc]">Section progress · {elapsed.toFixed(1)} / {sectionDistance.toFixed(1)} km</span>
              <span className="text-[#5fb1ff] font-bold">{pct.toFixed(1)}%</span>
            </div>
            <div className="h-2 bg-[#1e2a44] rounded-full overflow-hidden">
              <div className="h-full relative" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #2ecc71 0%, #5fb1ff 60%, #f5a623 100%)' }}>
                <div className="absolute inset-0 bar-scan"></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2 text-[10px] font-mono">
              <div className="bg-[#050b1a] border border-[#1e2a44] rounded-sm p-1.5">
                <div className="text-[9px] text-[#6b7a98] uppercase tracking-wider">Completed in section</div>
                <div className="text-[#5fe09a] text-[13px] font-bold">{elapsed.toFixed(0)} km</div>
              </div>
              <div className="bg-[#050b1a] border border-[#1e2a44] rounded-sm p-1.5">
                <div className="text-[9px] text-[#6b7a98] uppercase tracking-wider">Remaining in section</div>
                <div className="text-[#fbbf24] text-[13px] font-bold">{remaining.toFixed(0)} km</div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-b border-[#1e2a44] px-3 py-2 text-[10px] font-mono">
          <div className="text-[9px] text-[#5fb1ff] uppercase tracking-wider mb-1">Rake & Crew</div>
          <div className="grid grid-cols-2 gap-1.5">
            <div><span className="text-[#6b7a98]">Rake:</span> <span className="text-[#e3ecff]">{train.rake}</span></div>
            <div><span className="text-[#6b7a98]">Loco:</span> <span className="text-[#e3ecff]">{train.loco}</span></div>
            <div><span className="text-[#6b7a98]">Guard:</span> <span className="text-[#e3ecff]">{train.guard}</span></div>
            <div><span className="text-[#6b7a98]">Base sp:</span> <span className="text-[#e3ecff]">{train.baseSpeed} km/h</span></div>
          </div>
        </div>

        <div>
          <div className="px-3 py-1.5 bg-[#0d1c36] border-b border-[#1e2a44] flex items-center gap-2">
            <Clock size={11} className="text-[#f5a623]" />
            <span className="text-[10px] text-[#e3ecff] font-mono uppercase tracking-wider">Route Timeline · {train.schedule.length} stops</span>
          </div>
          <div className="px-3 py-2">
            {train.schedule.map((s, i) => {
              const routeStartKm = train.schedule[0].km;
              const routeEndKm = train.schedule[train.schedule.length - 1].km;
              const stopProgress = (s.km - routeStartKm) / (routeEndKm - routeStartKm || 1);
              const isPast = position.progress >= stopProgress - 0.01;
              const isCurrent = position.currentStation?.code === s.code;
              const isNext = position.nextStation?.code === s.code;
              return (
                <div key={i} className="relative pl-7 pb-2">
                  {i < train.schedule.length - 1 && (
                    <div className={`absolute left-3 top-5 bottom-0 w-px ${isPast ? 'bg-[#5fe09a]' : 'bg-[#2a3650]'}`}></div>
                  )}
                  <div className={`absolute left-1.5 top-1.5 w-3 h-3 rounded-full flex items-center justify-center text-[9px] font-mono border-2 ${
                    isCurrent ? 'bg-[#f5a623] border-[#f5a623] text-[#050b1a] animate-pulse' :
                    isPast ? 'bg-[#5fe09a] border-[#5fe09a] text-[#050b1a]' :
                    isNext ? 'bg-[#050b1a] border-[#f5a623] text-[#f5a623]' :
                    'bg-[#050b1a] border-[#2a3650] text-[#6b7a98]'
                  }`}>
                    {isCurrent ? '●' : i + 1}
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className={`text-[11px] font-mono ${isCurrent ? 'text-[#f5a623] font-bold' : isPast ? 'text-[#5fe09a]' : 'text-[#e3ecff]'}`}>
                        {s.code} <span className="text-[#6b7a98]">· KM {s.km}</span>
                      </div>
                      <div className="text-[9px] text-[#a3b0cc]">{s.name}</div>
                    </div>
                    <div className="text-right text-[10px] font-mono">
                      {s.arrive !== '--' && <div className={isPast ? 'text-[#5fe09a]' : 'text-[#a3b0cc]'}>arr {s.arrive}</div>}
                      {s.depart !== '--' && <div className={isPast ? 'text-[#5fe09a]' : 'text-[#a3b0cc]'}>dep {s.depart}</div>}
                      {s.platform && <div className="text-[#6b7a98]">{s.platform}</div>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="px-3 py-2 border-t border-[#1e2a44] text-[9px] text-[#6b7a98] font-mono leading-relaxed">
          <div className="flex items-center gap-1 mb-1">
            <AlertCircle size={9} className="text-[#f5a623]" />
            <span className="uppercase tracking-wider">Tracking source · SYNTHETIC DEMONSTRATION</span>
          </div>
          Position estimated from the synthetic timetable by interpolating along the resolved railway track polyline between previous and next stations. Not a live GPS feed.
        </div>

        <div className="px-3 py-2 border-t border-[#1e2a44]">
          <button
            onClick={onOpenLocationIntelligence}
            className="w-full px-3 py-2 bg-[#112347] hover:bg-[#1a2c5a] border border-[#2a3650] text-[#e3ecff] text-[11px] flex items-center justify-center gap-1.5"
          >
            <MapPin size={11} /> Open Location Intelligence <ChevronRight size={11} />
          </button>
        </div>
      </div>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="px-3 py-1.5 border-r border-b border-[#1e2a44] last:border-r-0">
      <div className="text-[9px] text-[#6b7a98] uppercase tracking-wider">{label}</div>
      <div className="text-[11px] mt-0.5 truncate">{value}</div>
    </div>
  );
}

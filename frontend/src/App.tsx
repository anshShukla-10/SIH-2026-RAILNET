import { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import AIAssistant from './components/AIAssistant';

import CommandCentre from './pages/CommandCentre';
import LiveMap from './pages/LiveMap';
import COA from './pages/COA';
import TMS from './pages/TMS';
import TDMS from './pages/TDMS';
import SMMS from './pages/SMMS';
import Bridges from './pages/Bridges';
import Inspections from './pages/Inspections';
import Maintenance from './pages/Maintenance';
import BlockPlanner from './pages/BlockPlanner';
import AssetIntelligence from './pages/AssetIntelligence';
import AIRiskEngine from './pages/AIRiskEngine';
import Alerts from './pages/Alerts';
import Reports from './pages/Reports';
import DataIntegration from './pages/DataIntegration';
import SystemHealth from './pages/SystemHealth';
import Settings from './pages/Settings';
import LocationIntelligence from './pages/LocationIntelligence';
import { RailRadarPanel } from './components/RailRadarPanel';

const TITLES: Record<string, string> = {
  '/': 'Command Centre — Railway Digital Twin',
  '/map': 'Live Railway Map',
  '/coa': 'Train Movement (COA)',
  '/tms': 'TMS — Track Asset Register',
  '/tdms': 'TDMS — OHE / Traction',
  '/smms': 'SMMS — Signalling Management',
  '/bridges': 'Bridges & Structures',
  '/inspections': 'Inspection Management',
  '/maintenance': 'Maintenance Work Orders',
  '/block-planner': 'Block Planner & Conflicts',
  '/assets': 'Asset Intelligence',
  '/risk': 'AI Risk Engine',
  '/alerts': 'Alerts & Notifications',
  '/reports': 'Operational Reports',
  '/integration': 'Data Integration Pipeline',
  '/system-health': 'System Health',
  '/settings': 'Platform Settings',
  '/location': 'Location Intelligence',
  '/radar': 'Rail Radar · Operational Status',
};

function Shell() {
  const location = useLocation();
  const [assistantOpen, setAssistantOpen] = useState(false);

  useEffect(() => {
    // Auto-open AI assistant on Block Planner per SIH spec
    if (location.pathname === '/block-planner') setAssistantOpen(true);
    if (location.pathname === '/risk') setAssistantOpen(true);
  }, [location.pathname]);

  const subtitle = TITLES[location.pathname] || 'RAILNET AI';

  return (
    <div className="h-screen flex bg-[#050b1a] text-[#c7d3e6] overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0">
        <Topbar subtitle={subtitle} />
        <div className="flex-1 min-h-0 overflow-hidden">
          <Routes>
            <Route path="/" element={<CommandCentre />} />
            <Route path="/map" element={<LiveMap />} />
            <Route path="/coa" element={<COA />} />
            <Route path="/tms" element={<TMS />} />
            <Route path="/tdms" element={<TDMS />} />
            <Route path="/smms" element={<SMMS />} />
            <Route path="/bridges" element={<Bridges />} />
            <Route path="/inspections" element={<Inspections />} />
            <Route path="/maintenance" element={<Maintenance />} />
            <Route path="/block-planner" element={<BlockPlanner />} />
            <Route path="/assets" element={<AssetIntelligence />} />
            <Route path="/risk" element={<AIRiskEngine />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/integration" element={<DataIntegration />} />
            <Route path="/system-health" element={<SystemHealth />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/location" element={<LocationIntelligence />} />
            <Route path="/radar" element={<RailRadarPanel />} />
          </Routes>
        </div>
      </main>

      {/* Floating AI Assistant launcher */}
      <button
        onClick={() => setAssistantOpen(o => !o)}
        className="fixed bottom-4 right-4 z-40 w-12 h-12 bg-[#f5a623] hover:bg-[#e69610] text-[#050b1a] rounded-sm shadow-lg flex items-center justify-center border border-[#f5a623]"
        title="RAILNET AI Assistant"
      >
        <Sparkles size={20} />
      </button>

      <AIAssistant open={assistantOpen} onClose={() => setAssistantOpen(false)} contextLocation={location.pathname === '/location' ? 'KM 124/5' : ''} />
    </div>
  );
}

export default function App() {
  // Use HashRouter for static deployment (Vercel)
  return (
    <HashRouter>
      <Shell />
    </HashRouter>
  );
}

import { Component, StrictMode, type ErrorInfo, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import 'maplibre-gl/dist/maplibre-gl.css'
import App from './App.tsx'

class AppErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('RAILNET AI runtime error:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '100vh', background: '#050b1a', color: '#c7d3e6', padding: 32, fontFamily: 'Consolas, monospace' }}>
          <div style={{ maxWidth: 900, margin: '0 auto', border: '1px solid #e53935', background: '#081428', padding: 24 }}>
            <div style={{ color: '#ff6b66', fontWeight: 700, letterSpacing: '0.08em', fontSize: 12 }}>RAILNET AI · RUNTIME ERROR</div>
            <h1 style={{ margin: '10px 0', fontSize: 24 }}>The application failed to render.</h1>
            <pre style={{ whiteSpace: 'pre-wrap', color: '#ffb4b0', fontSize: 13, lineHeight: 1.5 }}>{this.state.error.message}</pre>
            <p style={{ color: '#8fa1bf', fontSize: 12 }}>Open the browser console for the full stack trace. This screen prevents a silent blank page.</p>
            <button onClick={() => window.location.reload()} style={{ marginTop: 12, background: '#f5a623', border: 0, padding: '9px 14px', cursor: 'pointer', fontWeight: 700 }}>Reload application</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
)

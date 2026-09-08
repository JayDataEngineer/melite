import { Component, type ReactNode } from 'react'
import { reloadOnStaleChunk } from '../lib/staleChunk'

interface Props { children: ReactNode }
interface State { hasError: boolean; error: string | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }
  static getDerivedStateFromError(e: Error) { return { hasError: true, error: e.message } }
  // Stale-chunk self-heal (net #2 — lib/staleChunk.ts): a lazy chunk
  // whose hash died in a dist rebuild reloads the page ONCE instead of
  // parking the surface on this crash screen. Loop-guarded inside;
  // every other error keeps the manual fallback below.
  componentDidCatch(e: Error) { reloadOnStaleChunk(e) }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',flexDirection:'column',gap:16,background:'var(--background)',color:'var(--foreground)',fontFamily:'monospace',padding:24 }}>
          <h2 style={{color:'var(--brand)',fontSize:18}}>Something crashed</h2>
          <pre style={{fontSize:12,color:'var(--muted-foreground)',maxWidth:600,whiteSpace:'pre-wrap',textAlign:'center'}}>{this.state.error}</pre>
          <button onClick={() => { this.setState({hasError:false,error:null}); window.location.reload() }}
            style={{padding:'8px 24px',background:'var(--brand)',color:'var(--primary-foreground)',border:'none',cursor:'pointer',fontFamily:'monospace',fontWeight:600}}>
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Expose game state for debugging in development only
if (import.meta.env.DEV) {
  import('./game/state').then((m) => ((window as unknown as Record<string, unknown>).__dronefall = m));
}

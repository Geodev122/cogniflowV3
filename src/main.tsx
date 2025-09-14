// src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

const rootEl = document.getElementById('root')
if (!rootEl) {
  throw new Error('Root container #root not found')
}

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>
)

// PWA: we’ll add a proper Workbox SW in Phase 0.4.
// This keeps a no-op register that won’t throw if file missing.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Swap to '/sw.js' or Workbox injected filename in Phase 0.4
    navigator.serviceWorker
      .register('/sw.js')
      .catch(() => {
        // ignore during development
      })
  })
}

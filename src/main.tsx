import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

const rootEl = document.getElementById('root')
if (!rootEl) {
  // Hard guard to avoid silent white screens if index.html is corrupted
  const msg = 'Root element #root not found.'
  console.error(msg)
  const fallback = document.createElement('div')
  fallback.style.cssText = 'padding:24px;font-family:system-ui, -apple-system, Segoe UI, Roboto, Inter, sans-serif'
  fallback.innerText = msg
  document.body.appendChild(fallback)
} else {
  createRoot(rootEl).render(
    <StrictMode>
      <App />
    </StrictMode>
  )
}

// Register the service worker in production
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .catch((err) => {
        // non-blocking; don’t toast in prod
        console.warn('SW registration failed', err)
      })
  })
}

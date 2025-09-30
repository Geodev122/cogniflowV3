// Lightweight helper to dynamically load html2canvas and normalize export shape.
// Returns the html2canvas factory function or null if not available.
let cached: any = null

export async function loadHtml2Canvas(): Promise<any | null> {
  if (cached) return cached
  try {
    const mod = await import('html2canvas')
    // html2canvas exports a default function in ESM builds
    const h2c = mod?.default || mod
    cached = h2c
    return h2c
  } catch (e) {
    return null
  }
}

export default loadHtml2Canvas

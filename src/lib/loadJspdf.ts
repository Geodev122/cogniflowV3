// Lightweight helper to dynamically load jspdf and normalize export shape.
// Returns the jsPDF constructor or null if not available.
let cached: any = null

export async function loadJsPDF(): Promise<any | null> {
  if (cached) return cached
  try {
    const mod = await import('jspdf')
    const jsPDF = mod?.default || mod?.jsPDF || mod
    cached = jsPDF
    return jsPDF
  } catch (e) {
    // not installed or failed to load
    return null
  }
}

export default loadJsPDF

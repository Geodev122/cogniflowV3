// Static wrapper that imports jspdf and normalizes export shape.
// Importing this file will include jspdf in the bundle where used.
import * as jspdfMod from 'jspdf'

const jsPDF = (jspdfMod as any)?.default || (jspdfMod as any)?.jsPDF || jspdfMod

export default jsPDF

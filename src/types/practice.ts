export type TreatmentPlan = { id: string; case_id: string }
export type SessionNote   = { id: string; case_id: string; session_index: number }
export type ClientActivity = { id: string; client_id: string; case_id?: string | null; kind: string }
export type CaseSummary   = { id: string; case_id: string; title: string; updated_at: string }

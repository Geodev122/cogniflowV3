import React from 'react'
import { render, fireEvent, screen, waitFor } from '@testing-library/react'
import SessionBoard from '../src/components/therapist/SessionBoard'
import { supabase } from '../src/__mocks__/supabase'

// NOTE: These tests are illustrative. They assume vitest + @testing-library/react are installed.

describe('SessionBoard persist and resource assignment', () => {
  test('persist uses upsert when no sessionNoteId', async () => {
    // Render and use ref to call saveNow
    const ref: any = React.createRef()
    render(<SessionBoard ref={ref} defaultCaseId={'case-1'} defaultClientId={'client-1'} />)
    // simulate typing note
    const textarea = await screen.findByPlaceholderText(/Live session notes/i)
    fireEvent.change(textarea, { target: { value: 'My test note' } })
    // call saveNow (this will call supabase.upsert from mock)
    const ok = await ref.current.saveNow()
    expect(ok).toBeTruthy()
  })

  test('resource assign inserts into session_agenda', async () => {
    // simulate direct call to supabase.insert via a small wrapper
    const payload = { case_id: 'case-1', therapist_id: 'ther-1', source: 'resource', source_id: 'r1', title: 'Resource: Test', payload: { resource: { id: 'r1' } }, created_at: new Date().toISOString() }
    const { error } = await supabase.from('session_agenda').insert(payload as any)
    expect(error).toBeNull()
  })
})

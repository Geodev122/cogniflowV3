import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { MobileShell } from '../../components/client/MobileShell'
import { AssessmentForm } from '../../components/assessment/AssessmentForm'
import type { AssessmentInstance, AssessmentTemplate } from '../../types/assessment'

export default function AssessmentPlayer() {
  const { instanceId } = useParams<{ instanceId: string }>()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [instance, setInstance] = useState<(AssessmentInstance & { template?: AssessmentTemplate }) | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancel = false
    const load = async () => {
      if (!profile || !instanceId) return
      setLoading(true); setError(null)
      try {
        const { data: inst, error: err } = await supabase
          .from('assessment_instances')
          .select('*')
          .eq('id', instanceId)
          .eq('client_id', profile.id)
          .single<AssessmentInstance>()
        if (err) throw err

        const { data: tpl, error: tErr } = await supabase
          .from('assessment_templates')
          .select('*')
          .eq('id', inst.template_id)
          .single<AssessmentTemplate>()
        if (tErr) throw tErr

        if (!cancel) setInstance({ ...inst, template: tpl })
      } catch (e:any) {
        console.error('[AssessmentPlayer]', e); if (!cancel) setError('Could not open assessment.')
      } finally { if (!cancel) setLoading(false) }
    }
    load()
    return () => { cancel = true }
  }, [profile, instanceId])

  const readonly = instance ? !(['assigned','in_progress'].includes(instance.status)) : true

  return (
    <MobileShell title={instance?.title || 'Assessment'}>
      {loading ? (
        <div className="h-[70vh] grid place-items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : error ? (
        <div className="p-3">
          <div className="bg-red-50 border border-red-200 text-red-800 rounded p-3 text-sm">{error}</div>
        </div>
      ) : !instance ? (
        <div className="p-4">Not found.</div>
      ) : (
        <div className="p-3">
          <AssessmentForm
            instance={instance}
            readonly={readonly}
            showNavigation
            showProgress
            onResponse={() => {}}
            onSave={() => {}}
            onComplete={() => navigate('/client/assessments')}
          />
        </div>
      )}
    </MobileShell>
  )
}

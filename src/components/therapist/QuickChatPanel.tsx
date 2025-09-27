import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

export default function QuickChatPanel({ open, onClose, initialRecipient }: { open: boolean, onClose: () => void, initialRecipient?: string }) {
  const { profile } = useAuth()
  const [messages, setMessages] = useState<{ id: string, body: string, sender_id?: string }[]>([])
  const [text, setText] = useState('')

  useEffect(() => {
    if (!open || !profile?.id) return
    let mounted = true
    ;(async () => {
      const { data, error } = await supabase.from('messages').select('*').or(`sender_id.eq.${profile.id},recipient_id.eq.${profile.id}`).order('created_at', { ascending: true }).limit(200)
      if (error) { console.warn('Load messages error', error); return }
      if (!mounted) return
      setMessages((data || []).map((d: any) => ({ id: d.id, body: d.body, sender_id: d.sender_id })))
    })()
    return () => { mounted = false }
  }, [open, profile?.id])

  if (!open) return null

  const send = async () => {
    if (!text.trim() || !profile?.id) return
    // optimistic UI
    const tempId = String(Date.now())
    setMessages(m => [...m, { id: tempId, body: text.trim(), sender_id: profile.id }])
    const toInsert = { sender_id: profile.id, recipient_id: null, body: text.trim() }
    setText('')
    try {
      const { error, data } = await supabase.from('messages').insert(toInsert).select().single()
      if (error) throw error
      // replace temp message with saved one
      setMessages(m => m.map(msg => msg.id === tempId ? { id: data.id, body: data.body, sender_id: data.sender_id } : msg))
    } catch (e) {
      console.warn('Failed to send', e)
    }
  }

  return (
    <div className="fixed right-4 bottom-20 w-80 bg-white border rounded-lg shadow-lg z-50">
      <div className="p-3 border-b flex items-center justify-between">
        <div className="font-medium">Quick Chat {initialRecipient ? `- ${initialRecipient}` : ''}</div>
        <button onClick={onClose} className="text-sm text-gray-500">Close</button>
      </div>
      <div className="p-3 h-56 overflow-y-auto space-y-2">
        {messages.length === 0 ? (
          <div className="text-xs text-gray-400">No messages yet.</div>
        ) : messages.map(m => (
          <div key={m.id} className={`p-2 rounded ${m.sender_id === profile?.id ? 'bg-blue-50 self-end text-right' : 'bg-gray-50'}`}>{m.body}</div>
        ))}
      </div>
      <div className="p-3 border-t flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} className="flex-1 border rounded px-2 py-1" placeholder="Message..." />
        <button onClick={send} className="px-3 py-1 bg-blue-600 text-white rounded">Send</button>
      </div>
    </div>
  )
}

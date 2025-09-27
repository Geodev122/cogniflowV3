import React, { useState } from 'react'

export default function QuickChatPanel({ open, onClose, initialRecipient }: { open: boolean, onClose: () => void, initialRecipient?: string }) {
  const [messages, setMessages] = useState<{ id: string, text: string, fromMe: boolean }[]>([])
  const [text, setText] = useState('')

  if (!open) return null

  const send = () => {
    if (!text.trim()) return
    setMessages(m => [...m, { id: String(Date.now()), text: text.trim(), fromMe: true }])
    setText('')
    // placeholder: connect to real messaging API later
    setTimeout(() => setMessages(m => [...m, { id: String(Date.now()+1), text: 'Auto-reply: Received', fromMe: false }]), 600)
  }

  return (
    <div className="fixed right-4 bottom-20 w-80 bg-white border rounded-lg shadow-lg z-50">
      <div className="p-3 border-b flex items-center justify-between">
        <div className="font-medium">Quick Chat {initialRecipient ? `- ${initialRecipient}` : ''}</div>
        <button onClick={onClose} className="text-sm text-gray-500">Close</button>
      </div>
      <div className="p-3 h-56 overflow-y-auto space-y-2">
        {messages.length === 0 ? (
          <div className="text-xs text-gray-400">No messages yet. Use this for quick notes or connect to a chat later.</div>
        ) : messages.map(m => (
          <div key={m.id} className={`p-2 rounded ${m.fromMe ? 'bg-blue-50 self-end text-right' : 'bg-gray-50'}`}>{m.text}</div>
        ))}
      </div>
      <div className="p-3 border-t flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} className="flex-1 border rounded px-2 py-1" placeholder="Message..." />
        <button onClick={send} className="px-3 py-1 bg-blue-600 text-white rounded">Send</button>
      </div>
    </div>
  )
}

import React, { useState } from 'react';
import { Bot, Send, X, Trash2, Loader2 } from 'lucide-react';
import api, { unwrap } from '../../services/apiClient';
import { isDemoMode } from '../../services/mode';
const SUGGESTED = ["Summarize today's complaints.", 'Show unresolved high-priority complaints.', 'Find overdue complaints.', 'Which department has the largest backlog?', 'Show recently completed tasks.'];
export default function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([{ role: 'ai', text: 'Hi, I am AVENQRA AI. Ask about complaints, backlog, SLA or overdue work.' }]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const send = async (text) => {
    const q = (text || input).trim();
    if (!q || busy) return;
    setInput(''); setErr(null);
    setMsgs((m) => [...m, { role: 'user', text: q }]);
    setBusy(true);
    try {
      if (isDemoMode()) throw new Error('Assistant needs the live API. You are in demo mode.');
      const res = await api.post('/assistant/ask', { question: q }, { timeout: 20000 });
      const d = unwrap(res) || {};
      setMsgs((m) => [...m, { role: 'ai', text: d.text || 'No answer.', source: d.source }]);
    } catch (e) { setErr(e.message); setMsgs((m) => [...m, { role: 'ai', text: 'Assistant unavailable: ' + e.message + ' — try again.', error: true }]); }
    finally { setBusy(false); }
  };
  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open && (
        <div className="card mb-3 flex h-[480px] w-[92vw] max-w-sm flex-col overflow-hidden" role="dialog" aria-label="AVENQRA AI assistant">
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-b from-cyan-500 to-blue-600 text-white"><Bot className="h-4 w-4" /></span>
            <div className="mr-auto"><p className="text-sm font-bold">AVENQRA AI</p><p className="text-[11px] text-slate-400">Civic complaint intelligence</p></div>
            <button className="btn btn-ghost btn-xs" onClick={() => setMsgs([{ role: 'ai', text: 'Conversation cleared. How can I help?' }])} aria-label="Clear conversation"><Trash2 className="h-3.5 w-3.5" /></button>
            <button className="btn btn-ghost btn-xs" onClick={() => setOpen(false)} aria-label="Close assistant"><X className="h-4 w-4" /></button>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
            {msgs.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'ml-8 rounded-xl bg-cyan-600 px-3 py-2 text-xs text-white' : 'mr-8 rounded-xl bg-slate-100 px-3 py-2 text-xs dark:bg-navy-800'}>
                <p className="whitespace-pre-wrap">{m.text}</p>
                {m.source && <p className="mt-1 text-[10px] opacity-60">source: {m.source}</p>}
              </div>
            ))}
            {busy && <p className="flex items-center gap-1 text-xs text-slate-400"><Loader2 className="h-3 w-3 animate-spin" /> thinking…</p>}
            {err && <button className="btn btn-secondary btn-xs" onClick={() => send(msgs.filter((m) => m.role === 'user').slice(-1)[0]?.text)}>Retry</button>}
          </div>
          <div className="flex flex-wrap gap-1 border-t border-slate-100 px-3 pt-2 dark:border-slate-800">
            {SUGGESTED.slice(0, 3).map((s) => <button key={s} className="btn btn-ghost btn-xs" onClick={() => send(s)}>{s}</button>)}
          </div>
          <form className="flex gap-2 p-3" onSubmit={(e) => { e.preventDefault(); send(); }}>
            <input className="input flex-1" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about complaints…" aria-label="Ask AVENQRA AI" onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
            <button className="btn btn-primary btn-sm" disabled={busy || !input.trim()} aria-label="Send message"><Send className="h-3.5 w-3.5" /></button>
          </form>
        </div>
      )}
      <button className="btn btn-primary h-12 w-12 !rounded-full !p-0 shadow-lg" onClick={() => setOpen((v) => !v)} aria-label="Open AVENQRA AI assistant"><Bot className="h-5 w-5" /></button>
    </div>
  );
}

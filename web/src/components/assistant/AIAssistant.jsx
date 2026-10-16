import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, X, Trash2, Loader2, AlertCircle, CheckCircle, ShieldAlert, Sparkles, RefreshCw } from 'lucide-react';
import api, { unwrap } from '../../services/apiClient';
import { isDemoMode } from '../../services/mode';
import { useData } from '../../context/DataContext';

const SUGGESTED = [
  "Summarize today's complaints.",
  'Show unresolved high-priority complaints.',
  'Find overdue complaints.',
  'Which department has the largest backlog?',
  'Show recently completed tasks.',
  'Identify complaints requiring urgent attention.',
  'Summarize the reasons for SLA breaches.',
];

export default function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([
    {
      role: 'ai',
      text: 'Hello, I am AVENQRA AI Civic Intelligence Assistant.\nAsk me about complaints, department workloads, SLA breaches, or progress on specific tickets.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [executingActionId, setExecutingActionId] = useState(null);

  const { refreshComplaints } = useData();
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, busy]);

  // Keyboard accessibility: Escape closes the dialog
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const send = async (text) => {
    const q = (text || input).trim();
    if (!q || busy) return;
    setInput('');
    setErr(null);
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMsgs((m) => [...m, { role: 'user', text: q, timestamp: time }]);
    setBusy(true);

    try {
      // Send query to Express backend /api/v1/assistant/ask
      const res = await api.post('/assistant/ask', { question: q }, { timeout: 25000 });
      const d = unwrap(res) || {};
      const aiTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      setMsgs((m) => [
        ...m,
        {
          role: 'ai',
          text: d.text || 'No response returned.',
          source: d.source || 'rules',
          provider: d.provider || 'rules',
          suggested: d.suggested || [],
          actionProposal: d.data?.actionProposal || null,
          note: d.note || null,
          timestamp: aiTime,
        },
      ]);
    } catch (e) {
      // Backend unreachable or query failed
      setErr(e.message || 'Assistant request failed.');
      const demoAnswer = getDemoAnswer(q);
      const aiTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      setMsgs((m) => [
        ...m,
        {
          role: 'ai',
          text: demoAnswer.text,
          source: 'demo-fallback',
          provider: 'demo',
          actionProposal: demoAnswer.actionProposal || null,
          note: 'Rule-based response (backend unreachable or returned error).',
          timestamp: aiTime,
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  /** Execute a confirmed consequential action with audit logging */
  const handleConfirmAction = async (proposal) => {
    if (!proposal || executingActionId) return;
    setExecutingActionId(proposal.complaintId);
    try {
      const res = await api.post('/assistant/action', {
        action: proposal.action,
        complaintId: proposal.complaintId,
        targetStatus: proposal.targetStatus,
        remarks: `[AI Assistant Action: ${proposal.action} confirmed by operator]`,
      });
      const data = unwrap(res) || {};

      setMsgs((m) => [
        ...m,
        {
          role: 'ai',
          text: `✅ **Confirmed & Executed:** Complaint #${proposal.ticketNumber} has been updated to **${proposal.targetStatus}**.\n\n` +
            `• **Audit Event:** Consequential action logged to municipal audit history.\n` +
            `• **Notifications:** Department authorities and citizens alerted.\n` +
            `• **Live Dashboard:** Updated in real time.`,
          source: 'action-confirmed',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);

      // Refresh frontend data store
      if (refreshComplaints) refreshComplaints();
    } catch (actionErr) {
      setMsgs((m) => [
        ...m,
        {
          role: 'ai',
          text: `❌ **Action Failed:** ${actionErr.message || 'Failed to update ticket status.'}\n` +
            `Please check your role permissions or try updating through the Triage Kanban console.`,
          source: 'action-error',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setExecutingActionId(null);
    }
  };

  /** Canned fallback answers when API server is unavailable */
  function getDemoAnswer(input) {
    const q = String(input || '').toLowerCase();
    if (q.includes('escalate') && (q.includes('ticket') || q.includes('4561') || q.includes('avn-'))) {
      return {
        text: `⚠️ **Action Proposal: Escalate Complaint #AVN-2026-4561**\n\n` +
          `• **Title:** Large pothole on MG Road\n` +
          `• **Current Status:** SUBMITTED (Priority: HIGH)\n` +
          `• **Target Status:** \`ESCALATED\` | Priority: \`CRITICAL\`\n` +
          `• **Audit Impact:** Highest municipal authority will be alerted.\n\n` +
          `*Please confirm below to execute this update.*`,
        actionProposal: {
          action: 'ESCALATE',
          complaintId: 'demo-c1',
          ticketNumber: 'AVN-2026-4561',
          targetStatus: 'ESCALATED',
          title: 'Large pothole on MG Road',
        },
      };
    }
    if (q.includes('overdue') || q.includes('breach')) {
      return { text: '⚠️ Overdue complaints: #AVN-2026-890003 (Mananchira Park damaged bench) has breached the 30-min SLA and was escalated to Highest Authority.' };
    }
    if (q.includes('priority') || q.includes('urgent')) {
      return { text: '🔴 2 urgent open complaints:\n• #AVN-2026-4561 (Large pothole on MG Road — HIGH)\n• #AVN-2026-890003 (Damaged park bench — CRITICAL escalated).' };
    }
    if (q.includes('backlog') || q.includes('workload')) {
      return { text: '🏗️ Backlog by department:\n• Roads & Transport: 2 open\n• Waste Management: 1 open\n• Drainage: 1 open\n• Electrical: 0 open\n\nLargest backlog: Roads & Transport (2 tickets).' };
    }
    if (q.includes('completed') || q.includes('resolved') || q.includes('closed')) {
      return { text: '✅ Recently completed tasks:\n• #AVN-2026-890002 (Fallen tree blocking footpath — Electrical crew)\n• #AVN-2026-890012 (Streetlight dark — Electrical crew).' };
    }
    if (q.includes('reason') || q.includes('breach')) {
      return { text: '🔍 SLA breach summary: #AVN-2026-890003 breached SLA due to field assessment delays and required specialized park repair equipment.' };
    }
    return {
      text: '📋 Today: 6 total complaints in scope • 4 open • 2 resolved • 1 overdue (30-min SLA). Categories include Road, Waste, Electrical, and Drainage.',
    };
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open && (
        <div
          className="card mb-3 flex h-[540px] w-[94vw] max-w-md flex-col overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-150"
          role="dialog"
          aria-label="AVENQRA AI assistant"
        >
          {/* Header */}
          <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-900 px-4 py-3 text-white dark:border-slate-800">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-sm">
              <Bot className="h-4 w-4" />
            </span>
            <div className="mr-auto">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-bold tracking-tight">AVENQRA AI</p>
                <span className="rounded bg-cyan-500/20 px-1 py-0.2 text-[9px] font-black uppercase text-cyan-300">
                  Civic Intel
                </span>
              </div>
              <p className="text-[11px] text-slate-300">Civic complaint intelligence &amp; response</p>
            </div>
            <button
              className="btn btn-ghost btn-xs text-slate-300 hover:text-white"
              onClick={() =>
                setMsgs([
                  {
                    role: 'ai',
                    text: 'Conversation cleared. How can I assist you with civic operations?',
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  },
                ])
              }
              title="Clear conversation"
              aria-label="Clear conversation"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
            <button
              className="btn btn-ghost btn-xs text-slate-300 hover:text-white"
              onClick={() => setOpen(false)}
              aria-label="Close assistant"
              title="Close assistant"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Demo-mode indicator */}
          {isDemoMode() && (
            <div className="border-b border-amber-200 bg-amber-50 px-3 py-1.5 dark:border-amber-500/30 dark:bg-amber-500/10">
              <p className="text-[10px] font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> DEMO MODE — Responses use local rule-based intelligence.
              </p>
            </div>
          )}

          {/* Message List */}
          <div className="flex-1 space-y-3 overflow-y-auto p-3.5 bg-slate-50/50 dark:bg-navy-950/50">
            {msgs.map((m, i) => (
              <div
                key={i}
                className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs shadow-sm ${
                    m.role === 'user'
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-br-none'
                      : 'bg-white text-slate-800 border border-slate-200/70 dark:bg-navy-850 dark:text-slate-100 dark:border-slate-800 rounded-bl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>

                  {/* Consequential Action Card */}
                  {m.actionProposal && (
                    <div className="mt-2.5 rounded-xl border border-amber-300 bg-amber-50 p-2.5 text-slate-800 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-100">
                      <div className="flex items-center gap-1.5 font-bold text-[11px] text-amber-900 dark:text-amber-200">
                        <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
                        <span>Action Required: Explicit Confirmation</span>
                      </div>
                      <p className="mt-1 text-[10px] text-slate-600 dark:text-slate-300">
                        Confirm transition of <strong>{m.actionProposal.ticketNumber}</strong> to{' '}
                        <strong>{m.actionProposal.targetStatus}</strong>.
                      </p>
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          disabled={executingActionId === m.actionProposal.complaintId}
                          onClick={() => handleConfirmAction(m.actionProposal)}
                          className="flex items-center gap-1 rounded-lg bg-amber-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm hover:bg-amber-700 disabled:opacity-50"
                        >
                          {executingActionId === m.actionProposal.complaintId ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <CheckCircle className="h-3 w-3" />
                          )}
                          <span>Confirm {m.actionProposal.action}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="mt-1.5 flex items-center justify-between gap-2 text-[9px] opacity-60">
                    <span>{m.timestamp}</span>
                    {m.source && (
                      <span className="font-mono">
                        {m.provider ? `${m.provider}:` : ''}{m.source}
                      </span>
                    )}
                  </div>

                  {m.note && (
                    <p className="mt-1 border-t border-slate-200/50 pt-1 text-[9px] italic text-slate-400">
                      ℹ {m.note}
                    </p>
                  )}
                </div>
              </div>
            ))}

            {/* Typing / Thinking Indicator */}
            {busy && (
              <div className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-xs text-slate-500 border border-slate-200 dark:bg-navy-850 dark:border-slate-800 max-w-[120px]">
                <Loader2 className="h-3 w-3 animate-spin text-cyan-600" />
                <span className="text-[11px]">Analyzing…</span>
                <span className="flex space-x-1">
                  <span className="h-1 w-1 rounded-full bg-cyan-600 animate-pulse" />
                  <span className="h-1 w-1 rounded-full bg-cyan-600 animate-pulse delay-75" />
                  <span className="h-1 w-1 rounded-full bg-cyan-600 animate-pulse delay-150" />
                </span>
              </div>
            )}

            {err && (
              <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                <span className="flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {err}
                </span>
                <button
                  type="button"
                  className="font-bold underline hover:text-rose-900 ml-2"
                  onClick={() => {
                    const lastUserMsg = msgs.filter((m) => m.role === 'user').slice(-1)[0]?.text;
                    if (lastUserMsg) send(lastUserMsg);
                  }}
                >
                  Retry
                </button>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Quick Questions Scrollable Strip */}
          <div className="border-t border-slate-100 bg-white px-3 py-2 dark:border-slate-800 dark:bg-navy-900">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Suggested civic questions
            </p>
            <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {SUGGESTED.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={busy}
                  className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-medium text-slate-700 hover:border-cyan-400 hover:bg-cyan-50 hover:text-cyan-800 dark:border-slate-700 dark:bg-navy-800 dark:text-slate-200 dark:hover:border-cyan-500"
                  onClick={() => send(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Input Form */}
          <form
            className="flex items-center gap-2 border-t border-slate-100 bg-white p-2.5 dark:border-slate-800 dark:bg-navy-900"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <input
              ref={inputRef}
              className="input flex-1 text-xs"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about complaints, departments, SLA..."
              aria-label="Ask AVENQRA AI"
              disabled={busy}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <button
              type="submit"
              className="btn btn-primary btn-sm h-9 px-3"
              disabled={busy || !input.trim()}
              aria-label="Send message"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* Floating Action Button */}
      <button
        className="btn btn-primary h-13 w-13 !rounded-full !p-0 shadow-xl ring-4 ring-cyan-500/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
        onClick={() => setOpen((v) => !v)}
        aria-label="Open AVENQRA AI assistant"
        title="Open AVENQRA AI Assistant"
      >
        <Bot className="h-6 w-6 text-white" />
      </button>
    </div>
  );
}


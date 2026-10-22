import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Send,
  X,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  Flame,
  Clock,
  Building2,
  Share2,
  HelpCircle,
  Cpu,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import api, { unwrap } from '../../services/apiClient';
import { isDemoMode } from '../../services/mode';
import { useData } from '../../context/DataContext';

const SUGGESTED_CHIPS = [
  { label: "Summarize today's complaints.", tag: 'Overview', icon: '📊' },
  { label: 'Show unresolved high-priority complaints.', tag: 'Urgent', icon: '🔴' },
  { label: 'Find overdue complaints.', tag: 'Overdue', icon: '⚠️' },
  { label: 'Which department has the largest backlog?', tag: 'Workload', icon: '🏢' },
  { label: 'Show recently completed tasks.', tag: 'Completed', icon: '✅' },
  { label: 'Identify complaints requiring urgent attention.', tag: 'Critical', icon: '🚨' },
  { label: 'Summarize the reasons for SLA breaches.', tag: 'Root Cause', icon: '🔍' },
  { label: 'Recommend department for deep road pothole', tag: 'Routing', icon: '🏛️' },
  { label: 'Draft notification for health hazard garbage dump', tag: 'Notice', icon: '📢' },
];

export default function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([
    {
      role: 'ai',
      text: 'Greetings. I am the **AVENQRA Civic Intelligence Copilot**.\n\nI monitor municipal complaint intake, department workloads, SLA escalation deadlines, and ticket remediations.\n\nSelect a quick query below or ask any operational question.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);
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

  const copyToClipboard = (text, idx) => {
    navigator.clipboard?.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

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
          actionProposal: d.data?.actionProposal || d.actionProposal || null,
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
        remarks: `[AI Copilot Action: ${proposal.action} authorized by operator]`,
      });
      const data = unwrap(res) || {};

      setMsgs((m) => [
        ...m,
        {
          role: 'ai',
          text: `🛡️ **Consequential Action Authorized & Executed**\n\n` +
            `• **Target Ticket:** \`#${proposal.ticketNumber}\` updated to **${proposal.targetStatus}**\n` +
            `• **Audit History:** Recorded to municipal immutable log.\n` +
            `• **Outbox Trigger:** Department lead and citizen alerts queued.\n` +
            `• **Dashboard:** Telemetry updated in real time.`,
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
          text: `❌ **Action Authorization Failed:** ${actionErr.message || 'Failed to update ticket status.'}\n` +
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
    if (q.includes('escalate') && (q.includes('ticket') || q.includes('4561') || q.includes('avn-') || q.includes('demo'))) {
      return {
        text: `⚠️ **Action Proposal: Escalate Incident #AVN-2026-4561**\n\n` +
          `• **Title:** Large pothole on MG Road\n` +
          `• **Current Status:** SUBMITTED (Priority: HIGH)\n` +
          `• **Proposed Target:** Status: \`ESCALATED\` | Priority: \`CRITICAL\`\n` +
          `• **Audit Impact:** Automatic Super Admin alert will be dispatched.\n\n` +
          `*Explicit operator confirmation is required before modifying database records.*`,
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
      return { text: '⚠️ **Overdue Incidents:**\n• #AVN-2026-890003 (Mananchira Park damaged bench) has breached the 30-min SLA threshold and was escalated to Highest Authority.' };
    }
    if (q.includes('priority') || q.includes('urgent')) {
      return { text: '🔴 **Urgent Action Queue:**\n• #AVN-2026-4561 (Large pothole on MG Road — HIGH)\n• #AVN-2026-890003 (Damaged park bench — CRITICAL escalated).' };
    }
    if (q.includes('backlog') || q.includes('workload')) {
      return { text: '🏗️ **Department Workload:**\n• Roads & Transport: 2 open\n• Waste Management: 1 open\n• Drainage: 1 open\n• Electrical: 0 open\n\n**Largest Backlog:** Roads & Transport (2 tickets).' };
    }
    if (q.includes('completed') || q.includes('resolved') || q.includes('closed')) {
      return { text: '✅ **Recently Remediated Tasks:**\n• #AVN-2026-890002 (Fallen tree blocking footpath — Electrical crew)\n• #AVN-2026-890012 (Streetlight dark — Electrical crew).' };
    }
    if (q.includes('reason') || q.includes('why')) {
      return { text: '🔍 **SLA Root-Cause Summary:** #AVN-2026-890003 breached SLA due to field assessment delays and required specialized park repair equipment.' };
    }
    return {
      text: '📋 **Operations Snapshot:** 6 total complaints in scope • 4 open • 2 resolved • 1 overdue (30-min SLA). Categories include Road, Waste, Electrical, and Drainage.',
    };
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open && (
        <div
          className="card mb-3.5 flex h-[580px] w-[95vw] max-w-lg flex-col overflow-hidden border border-slate-200/90 bg-white/95 shadow-2xl backdrop-blur-2xl dark:border-white/[0.1] dark:bg-navy-950/95 animate-in fade-in zoom-in-95 duration-200"
          role="dialog"
          aria-label="AVENQRA AI Copilot"
        >
          {/* Cybernetic Copilot Header */}
          <div className="relative border-b border-slate-200/80 bg-gradient-to-r from-slate-900 via-navy-900 to-slate-900 px-4 py-3.5 text-white dark:border-white/[0.08]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 text-white shadow-md shadow-cyan-500/30 ring-1 ring-white/20">
                  <Bot className="h-5 w-5" />
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-black tracking-tight text-white">AVENQRA Copilot</h2>
                    <span className="rounded-md border border-cyan-400/30 bg-cyan-500/15 px-1.5 py-0.2 text-[9px] font-black uppercase text-cyan-300">
                      v2.4 Core
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300/80 font-medium">
                    Autonomous civic intelligence &amp; action safety
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition"
                  onClick={() =>
                    setMsgs([
                      {
                        role: 'ai',
                        text: 'Conversation history reset. Ready for municipal operations queries.',
                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                      },
                    ])
                  }
                  title="Clear conversation"
                  aria-label="Clear conversation"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition"
                  onClick={() => setOpen(false)}
                  aria-label="Close assistant"
                  title="Close assistant (Esc)"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Scope info bar */}
            <div className="mt-2.5 flex items-center justify-between rounded-lg bg-white/5 px-2.5 py-1 text-[10px] text-slate-300 backdrop-blur-md">
              <span className="flex items-center gap-1 font-mono text-cyan-300">
                <ShieldCheck className="h-3 w-3 text-cyan-400" />
                <span>Scope: Authorized Municipal Data</span>
              </span>
              <span className="font-mono text-slate-400">Deterministic Guardrails Active</span>
            </div>
          </div>

          {/* Demo Mode Notice */}
          {isDemoMode() && (
            <div className="flex items-center gap-1.5 border-b border-amber-200 bg-amber-500/10 px-3.5 py-1.5 text-[11px] font-semibold text-amber-800 dark:text-amber-300">
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              <span>Offline Simulation Mode — Answers use verified municipal seed dataset.</span>
            </div>
          )}

          {/* Conversation Message List */}
          <div className="flex-1 space-y-3.5 overflow-y-auto p-4 bg-slate-50/70 dark:bg-navy-950/70">
            {msgs.map((m, i) => (
              <div
                key={i}
                className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`group relative max-w-[90%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-sm transition-all ${
                    m.role === 'user'
                      ? 'rounded-br-none bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white shadow-blue-500/15'
                      : 'rounded-bl-none border border-slate-200/90 bg-white/95 text-slate-800 dark:border-white/[0.08] dark:bg-navy-900/90 dark:text-slate-100 backdrop-blur-md shadow-card'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.text}</p>

                  {/* Consequential Action Proposal Card */}
                  {m.actionProposal && (
                    <div className="mt-3 overflow-hidden rounded-xl border border-amber-400/50 bg-gradient-to-b from-amber-500/15 to-amber-500/5 p-3 text-slate-900 dark:text-amber-100 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-black text-amber-900 dark:text-amber-200">
                          <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                          <span>Security Authorization Required</span>
                        </div>
                        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                          Consequential
                        </span>
                      </div>

                      <p className="mt-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                        Requested state mutation for ticket <strong>#{m.actionProposal.ticketNumber}</strong>:
                      </p>

                      <div className="mt-2 flex items-center gap-2 rounded-lg bg-white/60 p-2 font-mono text-[11px] text-slate-800 dark:bg-navy-850 dark:text-slate-200">
                        <span className="text-slate-400">{m.actionProposal.currentStatus || 'CURRENT'}</span>
                        <ChevronRight className="h-3 w-3 text-cyan-500" />
                        <span className="font-bold text-cyan-600 dark:text-cyan-400">
                          {m.actionProposal.targetStatus}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-2 border-t border-amber-300/40 pt-2.5">
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          Requires explicit confirmation before save.
                        </p>
                        <button
                          type="button"
                          disabled={executingActionId === m.actionProposal.complaintId}
                          onClick={() => handleConfirmAction(m.actionProposal)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-md shadow-amber-600/20 hover:from-amber-500 hover:to-orange-500 transition disabled:opacity-50 active:scale-[0.98]"
                        >
                          {executingActionId === m.actionProposal.complaintId ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin" />
                              <span>Executing…</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Confirm &amp; Execute</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Metadata & Copy Action */}
                  <div className="mt-2 flex items-center justify-between gap-3 text-[10px] text-slate-400 dark:text-slate-500 pt-1 border-t border-slate-100 dark:border-white/5">
                    <span className="font-mono">{m.timestamp}</span>

                    {m.role === 'ai' && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(m.text, i)}
                        className="flex items-center gap-1 text-[10px] font-medium text-slate-400 hover:text-cyan-500 transition"
                        title="Copy answer"
                      >
                        {copiedIndex === i ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-500" />
                            <span className="text-emerald-500 font-bold">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Live Reasoning / Analyzing indicator */}
            {busy && (
              <div className="flex items-center gap-2.5 rounded-2xl border border-slate-200/80 bg-white/95 px-4 py-2.5 text-xs text-slate-600 shadow-sm dark:border-white/[0.08] dark:bg-navy-900/90 dark:text-slate-300 max-w-[200px] backdrop-blur-md">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-500" />
                <span className="text-[11px] font-medium">Synthesizing data…</span>
                <span className="flex space-x-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-pulse" />
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-pulse delay-75" />
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-pulse delay-150" />
                </span>
              </div>
            )}

            {/* Error Notification */}
            {err && (
              <div className="flex items-center justify-between rounded-xl border border-rose-300 bg-rose-50 px-3.5 py-2 text-xs text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                <span className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                  <span>{err}</span>
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

          {/* Quick Intelligence Question Chips */}
          <div className="border-t border-slate-200/80 bg-slate-50/80 px-3 py-2.5 dark:border-white/[0.08] dark:bg-navy-900/80">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Suggested Intelligence Queries
              </span>
              <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-medium">Click to run</span>
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {SUGGESTED_CHIPS.map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  disabled={busy}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-700 shadow-sm transition hover:border-cyan-500 hover:bg-cyan-50/40 hover:text-cyan-900 dark:border-white/[0.08] dark:bg-navy-850 dark:text-slate-200 dark:hover:border-cyan-500/40 active:scale-[0.98]"
                  onClick={() => send(chip.label)}
                >
                  <span>{chip.icon}</span>
                  <span>{chip.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Query Input Bar */}
          <form
            className="flex items-center gap-2 border-t border-slate-200/80 bg-white p-3 dark:border-white/[0.08] dark:bg-navy-900"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <input
              ref={inputRef}
              className="input flex-1 text-xs py-2.5 px-3.5 rounded-xl border-slate-200 dark:border-white/10 dark:bg-navy-850"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Copilot about tickets, department backlogs, SLA breaches..."
              aria-label="Ask AVENQRA Copilot"
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
              className="btn btn-primary h-10 px-4 rounded-xl shadow-md shadow-cyan-500/20"
              disabled={busy || !input.trim()}
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      {/* Futuristic Floating CoPilot Button */}
      <button
        type="button"
        className="group relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 text-white shadow-xl shadow-cyan-500/25 ring-2 ring-white/30 transition-all duration-300 hover:scale-110 active:scale-95"
        onClick={() => setOpen((v) => !v)}
        aria-label="Toggle AVENQRA AI Copilot"
        title="AVENQRA Intelligence Copilot (Esc to close)"
      >
        <Bot className="h-6 w-6 transition-transform group-hover:rotate-6" />
        
        {/* Pulsing Live Halo Ring */}
        <span className="absolute -inset-1 -z-10 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 opacity-40 blur-sm transition-all group-hover:opacity-80" />

        {/* Status indicator dot */}
        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 ring-2 ring-white dark:ring-navy-950" />
        </span>
      </button>
    </div>
  );
}

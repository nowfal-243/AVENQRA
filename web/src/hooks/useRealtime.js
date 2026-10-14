import { useEffect, useRef } from 'react';
import { API_BASE_URL, getToken } from '../services/apiClient';
export default function useRealtime({ enabled, onEvent }) {
  const cb = useRef(onEvent);
  cb.current = onEvent;
  useEffect(() => {
    if (!enabled) return undefined;
    let es = null; let closed = false;
    try {
      const url = `${API_BASE_URL}/events/stream?token=${encodeURIComponent(getToken() || '')}`;
      es = new EventSource(url);
      const events = ['complaint:created', 'complaint:assigned', 'complaint:statusUpdated', 'complaint:escalated', 'complaint:completed', 'notification:created'];
      events.forEach((ev) => es.addEventListener(ev, (e) => { try { cb.current && cb.current(ev, JSON.parse(e.data)); } catch {} }));
      es.onerror = () => { if (!closed) { try { es.close(); } catch {} } };
    } catch {}
    return () => { closed = true; try { es && es.close(); } catch {} };
  }, [enabled]);
}

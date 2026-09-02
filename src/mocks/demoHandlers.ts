import { http, HttpResponse, delay } from 'msw';

let slowCounter = 0;

interface RelayEvent {
  module: string;
  employeeName: string;
  context: string;
  date?: string;
  timestamp: string;
}
const relayEvents: RelayEvent[] = [];

export const demoHandlers = [
  // Capability 1 demo: always fails, so repeated clicks let you see the SDK's recovery
  // recommendation escalate from "Retry" to "Save as Draft" after 3 failures.
  http.post('/api/demo/flaky', async () => {
    await delay(400);
    return new HttpResponse(null, { status: 500 });
  }),

  // Capability 2 demo: each successive call is progressively slower, to build a real
  // upward latency trend the SDK can detect on its own.
  http.get('/api/demo/slow', async () => {
    slowCounter++;
    const artificialDelay = Math.min(300 + slowCounter * 350, 3000);
    await delay(artificialDelay);
    return HttpResponse.json({ ok: true, callNumber: slowCounter, tookMs: artificialDelay });
  }),

  // Capability 3 demo: normal calls return a healthy payload; ?broken=1 simulates a
  // "successful failure" — HTTP 200 with a payload that's quietly empty inside.
  http.get('/api/demo/data', async ({ request }) => {
    await delay(400);
    const url = new URL(request.url);
    const broken = url.searchParams.get('broken') === '1';
    if (broken) {
      return HttpResponse.json({ status: 'ok', items: [] });
    }
    return HttpResponse.json({
      status: 'ok',
      items: Array.from({ length: 12 }, (_, i) => ({ id: i, label: `Record ${i + 1}`, value: Math.round(Math.random() * 1000) })),
    });
  }),

  // Capability 4 demo: intentionally slow, so rapid re-clicking is a natural reaction —
  // exactly the pattern the frustration watcher is designed to catch.
  http.post('/api/demo/slow-button', async () => {
    await delay(7000);
    return HttpResponse.json({ ok: true, customMessage: 'Done — thanks for your patience.' });
  }),

  // Capability 5: the relay. Each app instance reports here independently; correlation
  // happens on this shared infrastructure, not inside either app's own backend.
  http.post('/api/relay/report', async ({ request }) => {
    const body = (await request.clone().json().catch(() => ({}))) as Partial<RelayEvent>;
    relayEvents.push({
      module: body.module || 'unknown',
      employeeName: body.employeeName || 'Unknown',
      context: body.context || '',
      date: body.date,
      timestamp: new Date().toISOString(),
    });
    return HttpResponse.json({ ok: true });
  }),

  http.get('/api/relay/correlate', async ({ request }) => {
    const url = new URL(request.url);
    const employee = (url.searchParams.get('employee') || '').toLowerCase();
    const matches = relayEvents.filter((e) => e.employeeName.toLowerCase() === employee);
    const modules = new Set(matches.map((m) => m.module));
    return HttpResponse.json({ events: matches, correlated: modules.size >= 2 });
  }),

  // Demo utility: reset the flaky/slow counters for a repeatable run.
  http.post('/api/demo/reset', async () => {
    slowCounter = 0;
    return HttpResponse.json({ ok: true });
  }),
];

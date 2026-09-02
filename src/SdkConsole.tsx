import { useState } from 'react';

function Card({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow p-5">
      <h3 className="font-bold text-gray-900">{title}</h3>
      <p className="text-sm text-gray-500 mb-4">{subtitle}</p>
      {children}
    </div>
  );
}

function Log({ lines }: { lines: string[] }) {
  if (lines.length === 0) return null;
  return (
    <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-600 space-y-1 max-h-32 overflow-y-auto">
      {lines.map((l, i) => <div key={i}>{l}</div>)}
    </div>
  );
}

export default function SdkConsole() {
  // Capability 1: context-aware recovery
  const [flakyAttempts, setFlakyAttempts] = useState(0);
  const triggerFlaky = async () => {
    setFlakyAttempts((n) => n + 1);
    await fetch('/api/demo/flaky', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ demo: true, attempt: flakyAttempts + 1 }) });
  };

  // Capability 2: predictive degradation
  const [slowLog, setSlowLog] = useState<string[]>([]);
  const triggerSlow = async () => {
    const start = performance.now();
    await fetch('/api/demo/slow');
    const took = Math.round(performance.now() - start);
    setSlowLog((prev) => [...prev, `Call took ${took}ms`].slice(-8));
  };

  // Capability 3: silent-failure detection
  const [dataLog, setDataLog] = useState<string[]>([]);
  const callNormal = async () => {
    const res = await fetch('/api/demo/data');
    const data = await res.json();
    setDataLog((prev) => [...prev, `Normal call — ${data.items.length} items returned`].slice(-8));
  };
  const callBroken = async () => {
    const res = await fetch('/api/demo/data?broken=1');
    const data = await res.json();
    setDataLog((prev) => [...prev, `"Broken" call — HTTP 200, but only ${data.items.length} items`].slice(-8));
  };

  // Capability 4: frustration detection (just needs a slow button — the SDK's global
  // click watcher does the rest, no per-component wiring needed)
  const [slowBtnStatus, setSlowBtnStatus] = useState('idle');
  const triggerSlowButton = async () => {
    setSlowBtnStatus('working');
    await fetch('/api/demo/slow-button', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    setSlowBtnStatus('idle');
  };

  // Capability 5: cross-app correlation
  const [correlateName, setCorrelateName] = useState('');
  const [correlateResult, setCorrelateResult] = useState<{ events: { module: string; context: string; timestamp: string }[]; correlated: boolean } | null>(null);
  const checkCorrelation = async () => {
    const res = await fetch(`/api/relay/correlate?employee=${encodeURIComponent(correlateName)}`);
    setCorrelateResult(await res.json());
  };

  const resetAll = async () => {
    await fetch('/api/demo/reset', { method: 'POST' });
    setFlakyAttempts(0);
    setSlowLog([]);
    setDataLog([]);
    setCorrelateResult(null);
  };

  return (
    <div className="w-full max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Co-Pilot Console</h1>
          <p className="text-gray-500 text-sm">Five SDK capabilities — all Level 2 client-side interception, zero codebase or backend access.</p>
        </div>
        <button onClick={resetAll} className="text-sm px-3 py-1.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-100">
          Reset Counters
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card title="1. Context-Aware Recovery" subtitle="A plain retry has no memory. This SDK does — it escalates its advice after repeated failures.">
          <button onClick={triggerFlaky} className="w-full py-2 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">
            Trigger Backend Failure ({flakyAttempts} so far)
          </button>
          <p className="text-xs text-gray-400 mt-2">Click 3 times within 2 minutes — the modal switches from "Retry Submission" to "Save as Draft."</p>
        </Card>

        <Card title="2. Predictive Degradation" subtitle="Watches latency across requests and warns before anything actually fails.">
          <button onClick={triggerSlow} className="w-full py-2 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">
            Call Endpoint (gets slower each time)
          </button>
          <Log lines={slowLog} />
          <p className="text-xs text-gray-400 mt-2">Click ~6 times — a proactive toast should appear once the trend is clear.</p>
        </Card>

        <Card title="3. Silent-Failure Detection" subtitle="Catches HTTP 200 responses that are quietly broken inside.">
          <div className="flex gap-2">
            <button onClick={callNormal} className="flex-1 py-2 rounded bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200">
              Call Normally
            </button>
            <button onClick={callBroken} className="flex-1 py-2 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">
              Trigger Silent Failure
            </button>
          </div>
          <Log lines={dataLog} />
          <p className="text-xs text-gray-400 mt-2">Call normally 3+ times first to build a baseline, then trigger the silent failure.</p>
        </Card>

        <Card title="4. Frustration Detection" subtitle="Detects rapid repeated clicks live and intervenes — not just for later analytics.">
          <button onClick={triggerSlowButton} disabled={slowBtnStatus === 'working'} className="w-full py-2 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
            {slowBtnStatus === 'working' ? 'Working... (try clicking again)' : 'Slow Action (takes 7s)'}
          </button>
          <p className="text-xs text-gray-400 mt-2">Click it 3+ times quickly while it's "working" — the SDK's global click watcher notices, no extra wiring needed.</p>
        </Card>

        <Card title="5. Cross-App Correlation" subtitle="Correlates activity across modules via a relay the SDK owns — not via integrating two vendors' backends.">
          <div className="flex gap-2 mb-2">
            <input
              value={correlateName}
              onChange={(e) => setCorrelateName(e.target.value)}
              placeholder="Employee name"
              className="flex-1 border border-gray-300 rounded p-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button onClick={checkCorrelation} className="px-4 py-2 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">
              Check
            </button>
          </div>
          {correlateResult && (
            <div className="text-xs">
              {correlateResult.events.length === 0 ? (
                <p className="text-gray-400">No activity found for this name yet.</p>
              ) : (
                <>
                  <p className={`font-medium mb-1 ${correlateResult.correlated ? 'text-orange-600' : 'text-gray-500'}`}>
                    {correlateResult.correlated ? '⚡ Cross-module activity found' : 'Activity in one module only'}
                  </p>
                  {correlateResult.events.map((e, i) => (
                    <div key={i} className="text-gray-600">• [{e.module}] {e.context}</div>
                  ))}
                </>
              )}
            </div>
          )}
          <p className="text-xs text-gray-400 mt-2">Submit a Leave request and an Expense claim for the same name in the other tabs, then check here.</p>
        </Card>
      </div>
    </div>
  );
}

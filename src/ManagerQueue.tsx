import { useEffect, useState } from 'react';

interface Insight {
  category: string;
  title: string;
  message: string;
  action: string;
  successMessage: string;
  successStatus: 'approved' | 'rejected' | 'flagged';
}

interface BaseItem {
  id: string;
  kind: 'leave' | 'expense';
  employeeName: string;
  status: string;
  submittedAt: string;
  insight: Insight | null;
  // leave fields
  leaveType?: string;
  startDate?: string;
  endDate?: string;
  reason?: string;
  // expense fields
  vendor?: string;
  category?: string;
  amount?: number;
  expenseDate?: string;
  description?: string;
  isLateNight?: boolean;
  duplicateFlag?: boolean;
}

function summaryFor(item: BaseItem): string {
  if (item.kind === 'leave') return `${item.leaveType} · ${item.startDate} → ${item.endDate}`;
  return `${item.vendor} · ₹${(item.amount ?? 0).toLocaleString('en-IN')}`;
}

const detailFieldsFor = (item: BaseItem): [string, string][] => {
  if (item.kind === 'leave') {
    return [
      ['Employee', item.employeeName],
      ['Leave Type', item.leaveType || '—'],
      ['Start Date', item.startDate || '—'],
      ['End Date', item.endDate || '—'],
      ['Reason', item.reason || '—'],
    ];
  }
  return [
    ['Employee', item.employeeName],
    ['Vendor', item.vendor || '—'],
    ['Category', item.category || '—'],
    ['Amount', `₹${(item.amount ?? 0).toLocaleString('en-IN')}`],
    ['Expense Date', item.expenseDate || '—'],
    ['Description', item.description || '—'],
  ];
};

export default function ManagerQueue() {
  const [items, setItems] = useState<BaseItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [manualMode, setManualMode] = useState(false);

  const loadQueue = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/queue');
      const data = await res.json();
      setItems(data.items || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/queue');
        const data = await res.json();
        setItems(data.items || []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const resetDemoData = async () => {
    setSelectedId(null);
    setManualMode(false);
    await fetch('/api/queue/reset', { method: 'POST' });
    await loadQueue();
  };

  const selected = items.find((i) => i.id === selectedId) || null;

  const resolve = async (status: 'approved' | 'rejected' | 'flagged') => {
    if (!selected) return;
    setResolving(true);
    try {
      await fetch(`/api/queue/${selected.id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      setItems((prev) => prev.filter((i) => i.id !== selected.id));
      setSelectedId(null);
      setManualMode(false);
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="w-full max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manager Approval Queue</h1>
          <p className="text-gray-500 text-sm">Review pending requests — AI Manager Co-Pilot surfaces context where it applies.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadQueue} className="text-sm px-3 py-1.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-100">
            Refresh Queue
          </button>
          <button onClick={resetDemoData} className="text-sm px-3 py-1.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-100">
            Reset Demo Data
          </button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-2 bg-white rounded-xl border border-gray-200 shadow overflow-hidden">
          {loading ? (
            <div className="p-6 text-sm text-gray-400">Loading queue...</div>
          ) : items.length === 0 ? (
            <div className="p-6 text-sm text-gray-400">Queue is empty.</div>
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                onClick={() => { setSelectedId(item.id); setManualMode(false); }}
                className={`w-full text-left p-4 border-b border-gray-100 hover:bg-gray-50 ${selectedId === item.id ? 'bg-blue-50' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">{item.kind}</span>
                  <span className="flex gap-2">
                    {item.duplicateFlag && <span className="text-xs font-medium text-red-600">⚠ Duplicate</span>}
                    {item.insight && <span className="text-xs font-medium text-orange-600">⚡ Insight</span>}
                  </span>
                </div>
                <div className="font-medium text-gray-900 mt-0.5">{item.employeeName}</div>
                <div className="text-sm text-gray-500">{summaryFor(item)}</div>
              </button>
            ))
          )}
        </div>

        <div className="col-span-3 bg-white rounded-xl border border-gray-200 shadow p-6">
          {!selected ? (
            <div className="text-sm text-gray-400">Select an item from the queue to review it.</div>
          ) : (
            <div>
              <div className="mb-5">
                <div className="text-xs uppercase tracking-wide text-gray-400 font-semibold mb-2">Request Details (read-only)</div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
                  {detailFieldsFor(selected).map(([label, value]) => (
                    <div key={label} className="flex justify-between text-sm gap-4">
                      <span className="text-gray-500">{label}</span>
                      <span className="text-gray-900 font-medium text-right">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {selected.duplicateFlag && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                  ⚠ Flagged by a business rule: this employee has submitted this vendor multiple times recently.
                </div>
              )}

              {selected.insight && !manualMode ? (
                <div className={`rounded-lg p-4 border ${selected.insight.category === 'WELLBEING_RISK' ? 'bg-purple-50 border-purple-200' : 'bg-orange-50 border-orange-200'}`}>
                  <div className="text-[11px] uppercase tracking-wide font-bold text-gray-500 mb-1">AI Manager Co-Pilot</div>
                  <div className="font-bold text-gray-900 mb-1">{selected.insight.title}</div>
                  <div className="text-sm text-gray-600 mb-4 leading-relaxed">{selected.insight.message}</div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setManualMode(true)}
                      disabled={resolving}
                      className="flex-1 py-2 rounded border border-gray-300 text-sm font-medium text-gray-600 hover:bg-white"
                    >
                      Dismiss Insight & Decide Manually
                    </button>
                    <button
                      onClick={() => resolve(selected.insight!.successStatus)}
                      disabled={resolving}
                      className="flex-1 py-2 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
                    >
                      {resolving ? 'Processing...' : selected.insight.action}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => resolve('rejected')}
                    disabled={resolving}
                    className="flex-1 py-2 rounded bg-red-50 text-red-700 border border-red-200 text-sm font-medium hover:bg-red-100 disabled:opacity-60"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => resolve('approved')}
                    disabled={resolving}
                    className="flex-1 py-2 rounded bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-60"
                  >
                    {resolving ? 'Processing...' : 'Approve'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import LeaveApp from './LeaveApp';
import ExpenseApp from './ExpenseApp';
import ManagerQueue from './ManagerQueue';
import SdkConsole from './SdkConsole';

type Tab = 'leave' | 'expense' | 'queue' | 'sdk';

export default function App() {
  const [tab, setTab] = useState<Tab>('leave');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'leave', label: 'Leave Module' },
    { id: 'expense', label: 'Expense Module' },
    { id: 'queue', label: 'Manager Queue' },
    { id: 'sdk', label: 'AI Co-Pilot Console' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4 font-sans">
      <div className="w-full max-w-4xl mb-6 flex gap-2 bg-gray-200 p-1 rounded-lg">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${tab === t.id ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'leave' && <LeaveApp />}
      {tab === 'expense' && <ExpenseApp />}
      {tab === 'queue' && <ManagerQueue />}
      {tab === 'sdk' && <SdkConsole />}
    </div>
  );
}

import { useState } from 'react';
import LeaveApp from './LeaveApp';
import ExpenseApp from './ExpenseApp';

export default function App() {
  const [tab, setTab] = useState<'leave' | 'expense'>('leave');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4 font-sans">
      <div className="w-full max-w-lg mb-6 flex gap-2 bg-gray-200 p-1 rounded-lg">
        <button
          onClick={() => setTab('leave')}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'leave' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
        >
          Leave Module
        </button>
        <button
          onClick={() => setTab('expense')}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'expense' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
        >
          Expense Module
        </button>
      </div>
      {tab === 'leave' ? <LeaveApp /> : <ExpenseApp />}
    </div>
  );
}

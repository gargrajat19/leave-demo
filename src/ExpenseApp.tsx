import React, { useState } from 'react';
import { useExpenseStore } from './expenseStore';

export default function ExpenseApp() {
  const { formData, updateField, resetForm } = useExpenseStore();
  const [formStatus, setFormStatus] = useState('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormStatus('loading');
    try {
      const res = await fetch('/api/expense-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json().catch(()=>({}));
      if (res.ok) {
        resetForm();
        if (data.viaModal) {
          setFormStatus('idle');
        } else {
          setFormStatus(data.customMessage || 'success');
          setTimeout(() => setFormStatus('idle'), 4000);
        }
      } else {
        setFormStatus('idle');
      }
    } catch {
      setFormStatus('idle');
    }
  };

  const getButtonClass = () => {
    if (formStatus === 'idle' || formStatus === 'loading') return 'bg-blue-600 hover:bg-blue-700 text-white';
    return 'bg-green-600 text-white';
  };

  const getButtonText = () => {
    if (formStatus === 'loading') return 'Submitting...';
    if (formStatus === 'idle') return 'Submit Claim';
    if (formStatus === 'success') return '✓ Claim Submitted Successfully';
    return `✓ ${formStatus}`;
  };

  return (
    <div className="w-full max-w-lg">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Finance Portal</h1>
        <p className="text-gray-500 text-sm">Employee Expense Claims</p>
      </div>
      <form onSubmit={handleSubmit} className="w-full bg-white p-6 rounded-xl shadow border border-gray-200 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Employee Name</label>
          <input required type="text" className="w-full border border-gray-300 rounded p-2 outline-none focus:ring-2 focus:ring-blue-500" value={formData.employeeName} onChange={e => updateField('employeeName', e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
          <input required type="text" placeholder="e.g. Uber, Marriott, Amazon..." className="w-full border border-gray-300 rounded p-2 outline-none focus:ring-2 focus:ring-blue-500" value={formData.vendor} onChange={e => updateField('vendor', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select className="w-full border border-gray-300 rounded p-2 outline-none focus:ring-2 focus:ring-blue-500" value={formData.category} onChange={e => updateField('category', e.target.value)}>
              <option>Travel</option>
              <option>Meals</option>
              <option>Software</option>
              <option>Office Supplies</option>
              <option>Client Entertainment</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
            <input required type="number" min="0" step="0.01" className="w-full border border-gray-300 rounded p-2 outline-none focus:ring-2 focus:ring-blue-500" value={formData.amount} onChange={e => updateField('amount', e.target.value)} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Expense Date</label>
          <input required type="date" className="w-full border border-gray-300 rounded p-2 outline-none focus:ring-2 focus:ring-blue-500" value={formData.expenseDate} onChange={e => updateField('expenseDate', e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea required rows={3} className="w-full border border-gray-300 rounded p-2 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Purpose of this expense..." value={formData.description} onChange={e => updateField('description', e.target.value)}></textarea>
        </div>
        <button type="submit" disabled={formStatus !== 'idle'} className={`w-full font-medium p-2 rounded transition-colors disabled:opacity-80 ${getButtonClass()}`}>
          {getButtonText()}
        </button>
      </form>
      <p className="text-xs text-gray-400 mt-4">Try vendor "Uber" for a duplicate-detection insight, an amount over ₹50,000 for a budget-approval insight, or anything else for a simulated backend failure + retry.</p>
    </div>
  );
}

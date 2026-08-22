import React, { useState } from 'react';
import { useExpenseStore } from './expenseStore';

export default function ExpenseApp() {
  const { formData, updateField, resetForm } = useExpenseStore();
  const [formStatus, setFormStatus] = useState('idle');
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [discrepancy, setDiscrepancy] = useState<{ message: string; fields: string[] } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormStatus('loading');
    setDuplicateWarning(null);
    setDiscrepancy(null);
    try {
      const res = await fetch('/api/expense-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json().catch(()=>({}));
      if (res.ok) {
        const shouldReset = data.finalized !== false;
        if (shouldReset) resetForm();
        if (data.viaModal) {
          setFormStatus('idle');
        } else {
          setFormStatus(data.customMessage || 'success');
          setTimeout(() => setFormStatus('idle'), 4000);
        }
      } else if (res.status === 422 && data.discrepancy) {
        setDiscrepancy({ message: data.customMessage || 'Please check this submission and correct it.', fields: data.fields || [] });
        setFormStatus('idle');
      } else if (res.status === 409 && data.duplicate) {
        setDuplicateWarning(data.customMessage || 'This looks like a duplicate. Please review and resubmit.');
        setFormStatus('idle');
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

  const fieldClass = (field: string) => {
    const base = 'w-full border rounded p-2 outline-none focus:ring-2';
    if (discrepancy?.fields.includes(field)) {
      return `${base} border-red-400 ring-1 ring-red-200 focus:ring-red-400`;
    }
    return `${base} border-gray-300 focus:ring-blue-500`;
  };

  return (
    <div className="w-full max-w-lg">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Finance Portal</h1>
        <p className="text-gray-500 text-sm">Employee Expense Claims</p>
      </div>
      <form onSubmit={handleSubmit} className="w-full bg-white p-6 rounded-xl shadow border border-gray-200 space-y-5">
        {discrepancy && (
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-sm">
            ℹ️ {discrepancy.message}
          </div>
        )}
        {duplicateWarning && (
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
            ⚠️ {duplicateWarning}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Employee Name</label>
          <input required type="text" className={fieldClass('employeeName')} value={formData.employeeName} onChange={e => updateField('employeeName', e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
          <input required type="text" placeholder="e.g. Uber, Marriott, Amazon..." className={fieldClass('vendor')} value={formData.vendor} onChange={e => updateField('vendor', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select className={fieldClass('category')} value={formData.category} onChange={e => updateField('category', e.target.value)}>
              <option>Travel</option>
              <option>Meals</option>
              <option>Software</option>
              <option>Office Supplies</option>
              <option>Client Entertainment</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
            <input required type="number" min="0" step="0.01" className={fieldClass('amount')} value={formData.amount} onChange={e => updateField('amount', e.target.value)} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Expense Date</label>
          <input required type="date" className={fieldClass('expenseDate')} value={formData.expenseDate} onChange={e => updateField('expenseDate', e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea required rows={3} className={fieldClass('description')} placeholder="Purpose of this expense..." value={formData.description} onChange={e => updateField('description', e.target.value)}></textarea>
        </div>
        <button type="submit" disabled={formStatus !== 'idle'} className={`w-full font-medium p-2 rounded transition-colors disabled:opacity-80 ${getButtonClass()}`}>
          {getButtonText()}
        </button>
      </form>
      <p className="text-xs text-gray-400 mt-4">Submissions rotate through Network Error → DB Down → High Traffic → Timeout → Success. Try a future Expense Date, or a Meals claim over ₹5,000, to see a data-correction prompt.</p>
    </div>
  );
}

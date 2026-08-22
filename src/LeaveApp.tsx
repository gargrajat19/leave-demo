import React, { useState } from 'react';
import { useLeaveStore } from './store';

export default function LeaveApp() {
  const { formData, updateField, resetForm } = useLeaveStore();
  const [formStatus, setFormStatus] = useState('idle');
  const [discrepancy, setDiscrepancy] = useState<{ message: string; fields: string[] } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormStatus('loading');
    setDiscrepancy(null);
    try {
      const res = await fetch('/api/leave-requests', {
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
      } else if (res.status === 422 && data.discrepancy) {
        setDiscrepancy({ message: data.customMessage || 'Please check this submission and correct it.', fields: data.fields || [] });
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
    if (formStatus === 'idle') return 'Submit Request';
    if (formStatus === 'success') return '✓ Request Submitted Successfully';
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
        <h1 className="text-2xl font-bold text-gray-900">Workforce Portal</h1>
        <p className="text-gray-500 text-sm">Employee Leave Management</p>
      </div>
      <form onSubmit={handleSubmit} className="w-full bg-white p-6 rounded-xl shadow border border-gray-200 space-y-5">
        {discrepancy && (
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-sm">
            ℹ️ {discrepancy.message}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Employee Name</label>
          <input required type="text" className={fieldClass('employeeName')} value={formData.employeeName} onChange={e => updateField('employeeName', e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
          <select className={fieldClass('leaveType')} value={formData.leaveType} onChange={e => updateField('leaveType', e.target.value)}>
            <option>Sick Leave</option>
            <option>Annual Leave</option>
            <option>Casual Leave</option>
            <option>Bereavement Leave</option>
            <option>Unpaid Time Off</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input required type="date" className={fieldClass('startDate')} value={formData.startDate} onChange={e => updateField('startDate', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input required type="date" className={fieldClass('endDate')} value={formData.endDate} onChange={e => updateField('endDate', e.target.value)} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Leave</label>
          <textarea required rows={3} className={fieldClass('reason')} placeholder="Please provide a brief reason..." value={formData.reason} onChange={e => updateField('reason', e.target.value)}></textarea>
        </div>
        <button type="submit" disabled={formStatus !== 'idle'} className={`w-full font-medium p-2 rounded transition-colors disabled:opacity-80 ${getButtonClass()}`}>
          {getButtonText()}
        </button>
      </form>
      <p className="text-xs text-gray-400 mt-4">Submissions rotate through Network Error → DB Down → High Traffic → Timeout → Success. Try an End Date before Start Date, or over 5 days of Sick Leave, to see a data-correction prompt.</p>
    </div>
  );
}

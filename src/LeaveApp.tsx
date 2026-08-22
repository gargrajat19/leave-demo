import React, { useState } from 'react';
import { useLeaveStore } from './store';

export default function LeaveApp() {
  const { formData, updateField, resetForm } = useLeaveStore();
  const [formStatus, setFormStatus] = useState('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormStatus('loading');
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

  return (
    <div className="w-full max-w-lg">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Workforce Portal</h1>
        <p className="text-gray-500 text-sm">Employee Leave Management</p>
      </div>
      <form onSubmit={handleSubmit} className="w-full bg-white p-6 rounded-xl shadow border border-gray-200 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Employee Name</label>
          <input required type="text" className="w-full border border-gray-300 rounded p-2 outline-none focus:ring-2 focus:ring-blue-500" value={formData.employeeName} onChange={e => updateField('employeeName', e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
          <select className="w-full border border-gray-300 rounded p-2 outline-none focus:ring-2 focus:ring-blue-500" value={formData.leaveType} onChange={e => updateField('leaveType', e.target.value)}>
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
            <input required type="date" className="w-full border border-gray-300 rounded p-2 outline-none focus:ring-2 focus:ring-blue-500" value={formData.startDate} onChange={e => updateField('startDate', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input required type="date" className="w-full border border-gray-300 rounded p-2 outline-none focus:ring-2 focus:ring-blue-500" value={formData.endDate} onChange={e => updateField('endDate', e.target.value)} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Leave</label>
          <textarea required rows={3} className="w-full border border-gray-300 rounded p-2 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Please provide a brief reason..." value={formData.reason} onChange={e => updateField('reason', e.target.value)}></textarea>
        </div>
        <button type="submit" disabled={formStatus !== 'idle'} className={`w-full font-medium p-2 rounded transition-colors disabled:opacity-80 ${getButtonClass()}`}>
          {getButtonText()}
        </button>
      </form>
      <p className="text-xs text-gray-400 mt-4">Submissions go to the Manager Queue for review. About 1 in 3 submissions simulates a backend outage — you'll get an option to retry without losing what you entered.</p>
    </div>
  );
}

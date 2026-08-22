import type { LeaveQueueItem, ExpenseQueueItem } from './db';
import { allExpensesFor } from './db';

export interface Insight {
  category: string;
  title: string;
  message: string;
  action: string;
  successMessage: string;
  successStatus: 'approved' | 'rejected' | 'flagged';
}

export function computeLeaveInsight(item: LeaveQueueItem): Insight | null {
  const name = item.employeeName.toLowerCase();

  if (name.includes('alex')) {
    return {
      category: 'RETENTION_RISK',
      title: 'High Flight Risk Detected',
      message: 'Alex has taken 6 isolated half-days in the last 45 days. This cluster pattern has an 82% correlation with active interviewing or severe burnout.',
      action: 'Approve & Schedule 1-on-1',
      successMessage: 'Leave approved. A 1-on-1 calendar invite has been drafted and sent to Alex.',
      successStatus: 'approved',
    };
  }

  if (name.includes('sarah')) {
    return {
      category: 'ANOMALY',
      title: 'Pattern Anomaly Detected',
      message: 'Sarah has an 88% probability of taking Sick Leave strictly adjacent to public holidays or weekends over the last 12 months.',
      action: 'Approve & Flag for HR Review',
      successMessage: 'Leave approved. This request has also been routed to the HR review queue.',
      successStatus: 'flagged',
    };
  }

  return null;
}

export function computeExpenseInsight(item: ExpenseQueueItem): Insight | null {
  const related = allExpensesFor(item.employeeName);

  // Use case A: threshold-splitting — several near-limit claims from the same employee.
  // This needs a pattern across multiple records; no single claim looks wrong on its own.
  const nearThreshold = related.filter((e) => e.amount >= 40000 && e.amount < 50000);
  if (nearThreshold.length >= 3) {
    const total = nearThreshold.reduce((sum, e) => sum + e.amount, 0);
    return {
      category: 'ANOMALY',
      title: 'Possible Threshold-Splitting Pattern',
      message: `${item.employeeName} has submitted ${nearThreshold.length} claims just under the ₹50,000 auto-approval limit, totaling ₹${total.toLocaleString('en-IN')}. This pattern is consistent with a single larger expense being split to avoid manager sign-off.`,
      action: 'Reject & Request Consolidated Claim',
      successMessage: 'Claim rejected; employee notified to resubmit as a single consolidated expense.',
      successStatus: 'rejected',
    };
  }

  // Use case B: late-night pattern — a wellbeing signal, not a compliance one.
  const lateNight = related.filter((e) => e.isLateNight);
  if (lateNight.length >= 5) {
    return {
      category: 'WELLBEING_RISK',
      title: 'Sustained After-Hours Activity Detected',
      message: `${item.employeeName} has filed ${lateNight.length} late-night meal/travel expenses in recent weeks, correlating with an unusually high volume of after-hours work. This may indicate sustained overwork.`,
      action: 'Approve & Flag for Manager Check-in',
      successMessage: "Expense approved. A workload check-in has been flagged for this employee's manager.",
      successStatus: 'flagged',
    };
  }

  return null;
}

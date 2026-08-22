export type ItemStatus = 'pending' | 'approved' | 'rejected' | 'flagged';

export interface LeaveQueueItem {
  id: string;
  kind: 'leave';
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: ItemStatus;
  submittedAt: string;
}

export interface ExpenseQueueItem {
  id: string;
  kind: 'expense';
  employeeName: string;
  vendor: string;
  category: string;
  amount: number;
  expenseDate: string;
  description: string;
  status: ItemStatus;
  submittedAt: string;
  isLateNight?: boolean;
  duplicateFlag?: boolean; // plain business-rule flag — NOT an AI insight, shown as a simple badge
}

export type QueueItem = LeaveQueueItem | ExpenseQueueItem;

let idCounter = 1;
export function nextId(): string {
  return `itm_${idCounter++}`;
}

// Positive n = n days in the past, negative n = n days in the future.
function offsetDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

export const queue: QueueItem[] = [];
export const history: QueueItem[] = [];

// Builds fresh seed data (recomputing relative dates against "now") and repopulates queue/history
// in place. Used both on module load and by the "Reset Demo Data" button, so testers don't have
// to keep re-entering data by hand.
export function resetDb() {
  idCounter = 1;

  const seedHistory: QueueItem[] = [
    // Priya: threshold-splitting pattern (3+ near-limit claims once combined with her pending item below)
    { id: nextId(), kind: 'expense', employeeName: 'Priya', vendor: 'OfficeMart', category: 'Office Supplies', amount: 48200, expenseDate: offsetDays(9), description: 'Replacement laptop accessories', status: 'approved', submittedAt: offsetDays(9) },
    { id: nextId(), kind: 'expense', employeeName: 'Priya', vendor: 'OfficeMart', category: 'Office Supplies', amount: 47850, expenseDate: offsetDays(5), description: 'Monitor and docking station', status: 'approved', submittedAt: offsetDays(5) },
    // Rahul: late-night / wellbeing pattern (5+ late-night claims once combined with his pending item below)
    { id: nextId(), kind: 'expense', employeeName: 'Rahul', vendor: 'Ola', category: 'Travel', amount: 620, expenseDate: offsetDays(22), description: 'Cab home after client call', status: 'approved', submittedAt: offsetDays(22), isLateNight: true },
    { id: nextId(), kind: 'expense', employeeName: 'Rahul', vendor: 'Swiggy', category: 'Meals', amount: 540, expenseDate: offsetDays(18), description: 'Dinner while finishing release', status: 'approved', submittedAt: offsetDays(18), isLateNight: true },
    { id: nextId(), kind: 'expense', employeeName: 'Rahul', vendor: 'Ola', category: 'Travel', amount: 700, expenseDate: offsetDays(14), description: 'Cab home', status: 'approved', submittedAt: offsetDays(14), isLateNight: true },
    { id: nextId(), kind: 'expense', employeeName: 'Rahul', vendor: 'Swiggy', category: 'Meals', amount: 610, expenseDate: offsetDays(10), description: 'Late dinner at office', status: 'approved', submittedAt: offsetDays(10), isLateNight: true },
    { id: nextId(), kind: 'expense', employeeName: 'Rahul', vendor: 'Ola', category: 'Travel', amount: 655, expenseDate: offsetDays(3), description: 'Cab home after deployment', status: 'approved', submittedAt: offsetDays(3), isLateNight: true },
    // Deepak: precedent for a duplicate-vendor flag (plain business rule, not an insight)
    { id: nextId(), kind: 'expense', employeeName: 'Deepak', vendor: 'Uber', category: 'Travel', amount: 380, expenseDate: offsetDays(6), description: 'Client site visit', status: 'approved', submittedAt: offsetDays(6) },
    { id: nextId(), kind: 'expense', employeeName: 'Deepak', vendor: 'Uber', category: 'Travel', amount: 410, expenseDate: offsetDays(4), description: 'Client site visit (return)', status: 'approved', submittedAt: offsetDays(4) },
  ];

  const seedQueue: QueueItem[] = [
    { id: nextId(), kind: 'leave', employeeName: 'Alex', leaveType: 'Sick Leave', startDate: offsetDays(-2), endDate: offsetDays(-2), reason: 'Not feeling well', status: 'pending', submittedAt: offsetDays(0) },
    { id: nextId(), kind: 'leave', employeeName: 'Sarah', leaveType: 'Sick Leave', startDate: offsetDays(-1), endDate: offsetDays(-1), reason: 'Migraine', status: 'pending', submittedAt: offsetDays(0) },
    { id: nextId(), kind: 'leave', employeeName: 'Meera', leaveType: 'Annual Leave', startDate: offsetDays(-10), endDate: offsetDays(-6), reason: 'Family trip', status: 'pending', submittedAt: offsetDays(1) },
    { id: nextId(), kind: 'leave', employeeName: 'Karan', leaveType: 'Bereavement Leave', startDate: offsetDays(-1), endDate: offsetDays(1), reason: 'Family emergency', status: 'pending', submittedAt: offsetDays(0) },
    { id: nextId(), kind: 'expense', employeeName: 'Priya', vendor: 'OfficeMart', category: 'Office Supplies', amount: 48500, expenseDate: offsetDays(1), description: 'Ergonomic chair', status: 'pending', submittedAt: offsetDays(0) },
    { id: nextId(), kind: 'expense', employeeName: 'Rahul', vendor: 'Swiggy', category: 'Meals', amount: 590, expenseDate: offsetDays(0), description: 'Dinner during on-call incident', status: 'pending', submittedAt: offsetDays(0), isLateNight: true },
    { id: nextId(), kind: 'expense', employeeName: 'Deepak', vendor: 'Uber', category: 'Travel', amount: 395, expenseDate: offsetDays(1), description: 'Client site visit (third trip this week)', status: 'pending', submittedAt: offsetDays(1), duplicateFlag: true },
    { id: nextId(), kind: 'expense', employeeName: 'Vikram', vendor: 'Adobe', category: 'Software', amount: 12000, expenseDate: offsetDays(2), description: 'Design tool annual license', status: 'pending', submittedAt: offsetDays(2) },
    { id: nextId(), kind: 'expense', employeeName: 'Anjali', vendor: 'Taj Hotels', category: 'Client Entertainment', amount: 8500, expenseDate: offsetDays(1), description: 'Client dinner', status: 'pending', submittedAt: offsetDays(1) },
    { id: nextId(), kind: 'expense', employeeName: 'Neha', vendor: 'IndiGo', category: 'Travel', amount: 6200, expenseDate: offsetDays(3), description: 'Flight for client onsite visit', status: 'pending', submittedAt: offsetDays(3) },
  ];

  queue.length = 0;
  queue.push(...seedQueue);
  history.length = 0;
  history.push(...seedHistory);
}

resetDb();

export function addToQueue(item: QueueItem) {
  queue.push(item);
}

export function resolveItem(id: string, newStatus: ItemStatus): QueueItem | null {
  const idx = queue.findIndex((i) => i.id === id);
  if (idx === -1) return null;
  const [item] = queue.splice(idx, 1);
  item.status = newStatus;
  history.push(item);
  return item;
}

export function allExpensesFor(employeeName: string): ExpenseQueueItem[] {
  const norm = employeeName.toLowerCase();
  return [...queue, ...history].filter(
    (i): i is ExpenseQueueItem => i.kind === 'expense' && i.employeeName.toLowerCase() === norm
  );
}

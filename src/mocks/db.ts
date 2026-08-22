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

// Already-resolved records, used only as context for pattern detection — not shown as pending work.
// This models a real HRMS/ERP: the manager's queue is small, but pattern-based insight draws on
// months of history that already exists in the system.
export const history: QueueItem[] = [
  { id: nextId(), kind: 'expense', employeeName: 'Priya', vendor: 'OfficeMart', category: 'Office Supplies', amount: 48200, expenseDate: offsetDays(9), description: 'Replacement laptop accessories', status: 'approved', submittedAt: offsetDays(9) },
  { id: nextId(), kind: 'expense', employeeName: 'Priya', vendor: 'OfficeMart', category: 'Office Supplies', amount: 47850, expenseDate: offsetDays(5), description: 'Monitor and docking station', status: 'approved', submittedAt: offsetDays(5) },
  { id: nextId(), kind: 'expense', employeeName: 'Rahul', vendor: 'Ola', category: 'Travel', amount: 620, expenseDate: offsetDays(22), description: 'Cab home after client call', status: 'approved', submittedAt: offsetDays(22), isLateNight: true },
  { id: nextId(), kind: 'expense', employeeName: 'Rahul', vendor: 'Swiggy', category: 'Meals', amount: 540, expenseDate: offsetDays(18), description: 'Dinner while finishing release', status: 'approved', submittedAt: offsetDays(18), isLateNight: true },
  { id: nextId(), kind: 'expense', employeeName: 'Rahul', vendor: 'Ola', category: 'Travel', amount: 700, expenseDate: offsetDays(14), description: 'Cab home', status: 'approved', submittedAt: offsetDays(14), isLateNight: true },
  { id: nextId(), kind: 'expense', employeeName: 'Rahul', vendor: 'Swiggy', category: 'Meals', amount: 610, expenseDate: offsetDays(10), description: 'Late dinner at office', status: 'approved', submittedAt: offsetDays(10), isLateNight: true },
  { id: nextId(), kind: 'expense', employeeName: 'Rahul', vendor: 'Ola', category: 'Travel', amount: 655, expenseDate: offsetDays(3), description: 'Cab home after deployment', status: 'approved', submittedAt: offsetDays(3), isLateNight: true },
];

// The manager's actual pending queue. Seeded with a couple of starter rows so the queue isn't
// empty on first load; new submissions from the employee-facing forms get pushed in here too.
export const queue: QueueItem[] = [
  { id: nextId(), kind: 'leave', employeeName: 'Alex', leaveType: 'Sick Leave', startDate: offsetDays(-2), endDate: offsetDays(-2), reason: 'Not feeling well', status: 'pending', submittedAt: offsetDays(0) },
  { id: nextId(), kind: 'leave', employeeName: 'Sarah', leaveType: 'Sick Leave', startDate: offsetDays(-1), endDate: offsetDays(-1), reason: 'Migraine', status: 'pending', submittedAt: offsetDays(0) },
  { id: nextId(), kind: 'expense', employeeName: 'Priya', vendor: 'OfficeMart', category: 'Office Supplies', amount: 48500, expenseDate: offsetDays(1), description: 'Ergonomic chair', status: 'pending', submittedAt: offsetDays(0) },
  { id: nextId(), kind: 'expense', employeeName: 'Rahul', vendor: 'Swiggy', category: 'Meals', amount: 590, expenseDate: offsetDays(0), description: 'Dinner during on-call incident', status: 'pending', submittedAt: offsetDays(0), isLateNight: true },
];

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

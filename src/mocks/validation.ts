import type { LeaveFormData } from '../store';
import type { ExpenseFormData } from '../expenseStore';

export interface ValidationResult {
  ok: boolean;
  message?: string;
  fields?: string[];
}

const LEAVE_TYPE_MAX_DAYS: Record<string, number> = {
  'Sick Leave': 5,
  'Bereavement Leave': 3,
  'Annual Leave': 15,
  'Unpaid Time Off': 30,
};

function daysBetweenInclusive(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
  return diff + 1;
}

export function validateLeave(payload: Partial<LeaveFormData>): ValidationResult {
  const { startDate, endDate, leaveType } = payload;
  if (!startDate || !endDate) return { ok: true };

  if (new Date(endDate) < new Date(startDate)) {
    return { ok: false, message: 'End Date cannot be before Start Date. Please correct the dates and resubmit.', fields: ['startDate', 'endDate'] };
  }

  const cap = leaveType ? LEAVE_TYPE_MAX_DAYS[leaveType] : undefined;
  if (cap) {
    const days = daysBetweenInclusive(startDate, endDate);
    if (days > cap) {
      return {
        ok: false,
        message: `You've requested ${days} day(s) of ${leaveType}, but policy allows a maximum of ${cap} consecutive day(s) for this leave type. Please adjust your dates or select a different leave type.`,
        fields: ['leaveType', 'startDate', 'endDate'],
      };
    }
  }

  return { ok: true };
}

const CATEGORY_MAX_AMOUNT: Record<string, number> = {
  'Meals': 5000,
  'Office Supplies': 60000,
  'Software': 100000,
  'Client Entertainment': 25000,
  'Travel': 200000,
};

export function validateExpense(payload: Partial<ExpenseFormData>): ValidationResult {
  const { expenseDate, category, amount } = payload;

  if (expenseDate) {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (new Date(expenseDate) > today) {
      return { ok: false, message: 'Expense date cannot be in the future. Please check the date and correct it.', fields: ['expenseDate'] };
    }
  }

  const amt = Number(amount) || 0;
  const cap = category ? CATEGORY_MAX_AMOUNT[category] : undefined;
  if (cap && amt > cap) {
    return {
      ok: false,
      message: `This ${category} claim of ₹${amt.toLocaleString('en-IN')} exceeds the ₹${cap.toLocaleString('en-IN')} per-claim policy limit for this category. Please verify the amount or category.`,
      fields: ['category', 'amount'],
    };
  }

  return { ok: true };
}

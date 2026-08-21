import { http, HttpResponse, delay } from 'msw';
import type { ExpenseFormData } from '../expenseStore';

const errors = [500, 503, 504];
let counter = 0;

export const expenseHandlers = [
  http.post('/api/expense-requests', async ({ request }) => {
    await delay(1200);
    const payload = await request.clone().json().catch(() => ({})) as Partial<ExpenseFormData>;
    const vendor = (payload.vendor || '').toLowerCase();
    const amount = Number(payload.amount) || 0;
    const isRetry = request.headers.get('x-retry') === '1';

    if (isRetry) {
      return HttpResponse.json({ customMessage: 'Expense claim submitted successfully.' }, { status: 200 });
    }

    // Use case 1: duplicate-submission detection (anomaly)
    if (vendor.includes('uber')) {
      return HttpResponse.json({
        type: 'AI_INSIGHT',
        category: 'ANOMALY',
        title: 'Possible Duplicate Expense',
        message: `We found a similar Uber expense submitted earlier this week for ${payload.employeeName || 'this employee'}. This may be a duplicate submission rather than a new trip.`,
        action: 'Flag as Duplicate & Notify Finance',
        successMessage: 'Finance team notified; expense flagged for review before reimbursement.',
      }, { status: 400 });
    }

    // Use case 2: policy/budget threshold breach (insight, not an anomaly)
    if (amount > 50000) {
      return HttpResponse.json({
        type: 'AI_INSIGHT',
        category: 'INSIGHT',
        title: 'Expense Exceeds Auto-Approval Limit',
        message: `This ₹${amount.toLocaleString('en-IN')} claim exceeds the ₹50,000 auto-approval limit for ${payload.category || 'this category'}. Manager sign-off is required before it can be reimbursed.`,
        action: 'Request Manager Approval',
        successMessage: 'Manager approval request has been sent for this expense.',
      }, { status: 400 });
    }

    // Otherwise: simulate the same round-robin backend failures as the leave module,
    // proving the SDK's retry/healing flow works identically here without any SDK changes.
    const status = errors[counter % errors.length];
    counter++;
    return new HttpResponse(null, { status });
  }),
];

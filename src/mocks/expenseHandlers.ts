import { http, HttpResponse, delay } from 'msw';
import type { ExpenseFormData } from '../expenseStore';

const errors = [500, 503, 504];
let counter = 0;
const duplicateAttempts = new Map<string, number>();

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

    // Use case 1: duplicate-submission detection.
    // 1st submission of this vendor: send it back to the employee to double-check and resubmit.
    // 2nd submission of the same vendor: treat the duplicate as confirmed and auto-flag to Finance.
    if (vendor.includes('uber')) {
      const key = `${(payload.employeeName || '').toLowerCase()}|${vendor}`;
      const attempt = (duplicateAttempts.get(key) || 0) + 1;
      duplicateAttempts.set(key, attempt);

      if (attempt === 1) {
        return HttpResponse.json({
          type: 'AI_INSIGHT',
          category: 'ANOMALY',
          title: 'Possible Duplicate Expense',
          message: `We found a similar Uber expense submitted earlier this week for ${payload.employeeName || 'this employee'}. Please double-check your records — if this is a genuine, separate expense, simply resubmit the claim as-is.`,
          action: 'Acknowledge & Review',
          successMessage: "Thanks — please double-check this expense and resubmit if it isn't a duplicate.",
          finalized: false,
        }, { status: 400 });
      }

      return HttpResponse.json({
        type: 'AI_INSIGHT',
        category: 'ANOMALY',
        title: 'Duplicate Confirmed — Flagged to Finance',
        message: `This Uber expense has now been submitted twice by ${payload.employeeName || 'this employee'} and still appears to be a duplicate. It has been automatically flagged for Finance review.`,
        action: 'Acknowledge',
        successMessage: 'Finance team notified; expense flagged for review.',
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

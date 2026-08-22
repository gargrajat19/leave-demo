import { http, HttpResponse, delay } from 'msw';
import type { LeaveFormData } from '../store';
import type { ExpenseFormData } from '../expenseStore';
import { addToQueue, resolveItem, nextId, resetDb, queue, type ItemStatus } from './db';
import { computeLeaveInsight, computeExpenseInsight } from './insights';

const failureStatuses = [500, 503, 504];

// Fails roughly 1 in 3 submissions (cycling through 500/503/504) so the healing/retry flow is
// reliably demoable, while most submissions succeed and actually land in the manager's queue.
function makeOutcomeCounter() {
  let n = 0;
  let failN = 0;
  return function next(): number | null {
    n++;
    if (n % 3 === 0) {
      const status = failureStatuses[failN % failureStatuses.length];
      failN++;
      return status;
    }
    return null;
  };
}

let nextLeaveOutcome = makeOutcomeCounter();
let nextExpenseOutcome = makeOutcomeCounter();

// Plain business-rule duplicate check (NOT an AI insight) — same employee submitting the same
// vendor again. 1st repeat: bounce back to the employee to double-check. 2nd repeat: let it
// through but mark it for the manager as a plain flag, not a reasoning-based insight.
let duplicateAttempts = new Map<string, number>();

export const queueHandlers = [
  // Employee-facing: submit a leave request. The only thing this endpoint decides for itself
  // is a technical failure (db/network down) — no business insight happens here anymore.
  http.post('/api/leave-requests', async ({ request }) => {
    await delay(1200);
    const payload = (await request.clone().json().catch(() => ({}))) as Partial<LeaveFormData>;
    const isRetry = request.headers.get('x-retry') === '1';

    if (isRetry) {
      return HttpResponse.json({ customMessage: 'Leave request submitted for approval.' }, { status: 200 });
    }

    if (payload.leaveType === 'Casual Leave') {
      return HttpResponse.json({ customMessage: 'Casual Leave Approved' }, { status: 200 });
    }

    const failStatus = nextLeaveOutcome();
    if (failStatus) {
      return new HttpResponse(null, { status: failStatus });
    }

    addToQueue({
      id: nextId(),
      kind: 'leave',
      employeeName: payload.employeeName || 'Unknown',
      leaveType: payload.leaveType || 'Sick Leave',
      startDate: payload.startDate || '',
      endDate: payload.endDate || '',
      reason: payload.reason || '',
      status: 'pending',
      submittedAt: new Date().toISOString(),
    });

    return HttpResponse.json({ customMessage: 'Leave request submitted for approval.' }, { status: 200 });
  }),

  // Employee-facing: submit an expense claim.
  http.post('/api/expense-requests', async ({ request }) => {
    await delay(1200);
    const payload = (await request.clone().json().catch(() => ({}))) as Partial<ExpenseFormData>;
    const isRetry = request.headers.get('x-retry') === '1';

    if (isRetry) {
      return HttpResponse.json({ customMessage: 'Expense claim submitted for approval.' }, { status: 200 });
    }

    const failStatus = nextExpenseOutcome();
    if (failStatus) {
      return new HttpResponse(null, { status: failStatus });
    }

    const vendor = payload.vendor || '';
    let duplicateFlag = false;
    if (vendor) {
      const key = `${(payload.employeeName || '').toLowerCase()}|${vendor.toLowerCase()}`;
      const attempt = (duplicateAttempts.get(key) || 0) + 1;
      duplicateAttempts.set(key, attempt);

      if (attempt === 2) {
        return HttpResponse.json({
          duplicate: true,
          customMessage: `This looks like a duplicate of a ${vendor} expense you already submitted recently. Please double-check your records and resubmit if this is a genuine, separate expense.`,
        }, { status: 409 });
      }
      duplicateFlag = attempt >= 3;
    }

    addToQueue({
      id: nextId(),
      kind: 'expense',
      employeeName: payload.employeeName || 'Unknown',
      vendor,
      category: payload.category || '',
      amount: Number(payload.amount) || 0,
      expenseDate: payload.expenseDate || '',
      description: payload.description || '',
      status: 'pending',
      submittedAt: new Date().toISOString(),
      duplicateFlag,
    });

    return HttpResponse.json({
      customMessage: duplicateFlag
        ? 'Expense claim submitted for approval — flagged for review due to repeated similar claims.'
        : 'Expense claim submitted for approval.',
    }, { status: 200 });
  }),

  // Manager-facing: the pending queue, each item annotated with whatever insight applies.
  http.get('/api/queue', async () => {
    await delay(300);
    const items = queue.map((item) => ({
      ...item,
      insight: item.kind === 'leave' ? computeLeaveInsight(item) : computeExpenseInsight(item),
    }));
    return HttpResponse.json({ items });
  }),

  // Manager-facing: approve / reject / act on a queue item.
  http.post('/api/queue/:id/resolve', async ({ request, params }) => {
    await delay(500);
    const id = params.id as string;
    const body = (await request.clone().json().catch(() => ({}))) as { status?: ItemStatus };
    const resolved = resolveItem(id, body.status || 'approved');
    if (!resolved) {
      return HttpResponse.json({ error: 'Item not found' }, { status: 404 });
    }
    return HttpResponse.json({ ok: true });
  }),

  // Demo utility: restore the queue/history back to seeded data, and clear the duplicate-attempt
  // and simulated-outage counters, so testing doesn't require re-entering data by hand.
  http.post('/api/queue/reset', async () => {
    await delay(200);
    resetDb();
    duplicateAttempts = new Map<string, number>();
    nextLeaveOutcome = makeOutcomeCounter();
    nextExpenseOutcome = makeOutcomeCounter();
    return HttpResponse.json({ ok: true });
  }),
];

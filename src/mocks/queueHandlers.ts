import { http, HttpResponse, delay } from 'msw';
import type { LeaveFormData } from '../store';
import type { ExpenseFormData } from '../expenseStore';
import { addToQueue, resolveItem, nextId, resetDb, queue, type ItemStatus } from './db';
import { computeLeaveInsight, computeExpenseInsight } from './insights';
import { validateLeave, validateExpense } from './validation';

type TechnicalOutcome = 'NETWORK_ERROR' | 500 | 503 | 504 | null;

// Deterministic rotation — NOT random — so every submission reliably demonstrates a distinct
// scenario: network error, db down, high traffic, timeout, then success, then repeats. This is
// separate from data-discrepancy validation below, which is real and doesn't consume a rotation slot.
const TECHNICAL_OUTCOMES: TechnicalOutcome[] = ['NETWORK_ERROR', 500, 503, 504, null];

function makeOutcomeCounter() {
  let n = 0;
  return function next(): TechnicalOutcome {
    const outcome = TECHNICAL_OUTCOMES[n % TECHNICAL_OUTCOMES.length];
    n++;
    return outcome;
  };
}

let nextLeaveOutcome = makeOutcomeCounter();
let nextExpenseOutcome = makeOutcomeCounter();

// Plain business-rule duplicate check (NOT an AI insight) — same employee submitting the same
// vendor again. 1st repeat: bounce back to the employee to double-check. 2nd repeat: let it
// through but mark it for the manager as a plain flag, not a reasoning-based insight.
let duplicateAttempts = new Map<string, number>();

function technicalFailureResponse(outcome: TechnicalOutcome) {
  if (outcome === 'NETWORK_ERROR') return HttpResponse.error();
  return new HttpResponse(null, { status: outcome as number });
}

export const queueHandlers = [
  // Employee-facing: submit a leave request.
  // Order: (1) real data validation — always evaluated, never skipped by rotation;
  //        (2) technical-failure simulation — deterministic rotation;
  //        (3) success — added to the manager's queue.
  http.post('/api/leave-requests', async ({ request }) => {
    await delay(1200);
    const payload = (await request.clone().json().catch(() => ({}))) as Partial<LeaveFormData>;
    const isRetry = request.headers.get('x-retry') === '1';

    if (isRetry) {
      return HttpResponse.json({ customMessage: 'Leave request submitted for approval.' }, { status: 200 });
    }

    const validation = validateLeave(payload);
    if (!validation.ok) {
      return HttpResponse.json({ discrepancy: true, customMessage: validation.message, fields: validation.fields }, { status: 422 });
    }

    if (payload.leaveType === 'Casual Leave') {
      return HttpResponse.json({ customMessage: 'Casual Leave Approved' }, { status: 200 });
    }

    const outcome = nextLeaveOutcome();
    if (outcome !== null) {
      return technicalFailureResponse(outcome);
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

  // Employee-facing: submit an expense claim. Same ordering principle as leave above.
  http.post('/api/expense-requests', async ({ request }) => {
    await delay(1200);
    const payload = (await request.clone().json().catch(() => ({}))) as Partial<ExpenseFormData>;
    const isRetry = request.headers.get('x-retry') === '1';

    if (isRetry) {
      return HttpResponse.json({ customMessage: 'Expense claim submitted for approval.' }, { status: 200 });
    }

    const validation = validateExpense(payload);
    if (!validation.ok) {
      return HttpResponse.json({ discrepancy: true, customMessage: validation.message, fields: validation.fields }, { status: 422 });
    }

    const outcome = nextExpenseOutcome();
    if (outcome !== null) {
      return technicalFailureResponse(outcome);
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

  // Demo utility: restore the queue/history back to seeded data, and reset the duplicate-attempt
  // and outcome-rotation counters, so every reset gives a clean, repeatable demo run.
  http.post('/api/queue/reset', async () => {
    await delay(200);
    resetDb();
    duplicateAttempts = new Map<string, number>();
    nextLeaveOutcome = makeOutcomeCounter();
    nextExpenseOutcome = makeOutcomeCounter();
    return HttpResponse.json({ ok: true });
  }),
];

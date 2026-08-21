import { http, HttpResponse, delay } from 'msw';
import type { LeaveFormData } from '../store';

const errors = [500, 503, 504];
let counter = 0;

export const leaveHandlers = [
  http.post('/api/leave-requests', async ({ request }) => {
    await delay(1200);
    const payload = await request.clone().json().catch(() => ({})) as Partial<LeaveFormData>;
    const name = (payload.employeeName || '').toLowerCase();
    const leaveType = payload.leaveType || '';
    const isRetry = request.headers.get('x-retry') === '1';

    if (isRetry) {
      return HttpResponse.json({ customMessage: 'Leave request submitted successfully.' }, { status: 200 });
    }

    if (name.includes('alex')) {
      return HttpResponse.json({
        type: 'AI_INSIGHT',
        category: 'RETENTION_RISK',
        title: 'High Flight Risk Detected',
        message: 'Alex has taken 6 isolated half-days in the last 45 days. This cluster pattern has an 82% correlation with active interviewing or severe burnout.',
        action: 'Schedule 1-on-1',
        successMessage: 'A 1-on-1 calendar invite has been drafted and sent to Alex.'
      }, { status: 400 });
    }

    if (name.includes('sarah')) {
      return HttpResponse.json({
        type: 'AI_INSIGHT',
        category: 'ANOMALY',
        title: 'Pattern Anomaly Detected',
        message: 'Sarah has an 88% probability of taking Sick Leave strictly adjacent to public holidays or weekends over the last 12 months.',
        action: 'Flag for HR Review',
        successMessage: 'This request has been securely routed to the HR review queue.'
      }, { status: 400 });
    }

    if (leaveType === 'Casual Leave') {
      return HttpResponse.json({ customMessage: 'Casual Leave Approved' }, { status: 200 });
    }

    const status = errors[counter % errors.length];
    counter++;
    return new HttpResponse(null, { status });
  })
];

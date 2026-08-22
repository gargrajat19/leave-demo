// Self-healing SDK: intercepts fetch() failures (5xx / network-down) at the point of
// submission and offers a capture-and-retry recovery UI, so a transient backend/network
// issue doesn't lose what the user was trying to submit.
//
// Deliberately out of scope for this SDK: business decisions like "does this look
// suspicious" or "does this need manager review." Those are judgment calls that belong to
// whichever screen actually makes that decision (e.g. a manager's approval queue) — the SDK
// only ever sees a single in-flight request and has no way to reason about a user's history,
// so baking that logic in here would be the wrong place to put it.

export function initHealingSDK() {
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    try {
      const response = await originalFetch(...args);
      if (!response.ok && response.status >= 500) {
        const request = args[0] instanceof Request ? args[0] : new Request(args[0], args[1]);
        const payload = await request.clone().json().catch(() => ({}));
        const retry = () => retryRequest(originalFetch, request);
        return new Promise((resolve) => {
          injectHealingUI(payload, { status: response.status, text: response.statusText }, retry, (customMessage) => {
            resolve(new Response(JSON.stringify({ customMessage, viaModal: true }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
          });
        });
      }
      return response;
    } catch {
      const request = args[0] instanceof Request ? args[0] : new Request(args[0], args[1]);
      const payload = await request.clone().json().catch(() => ({}));
      const retry = () => retryRequest(originalFetch, request);
      return new Promise((resolve) => {
        injectHealingUI(payload, { status: 'NETWORK_ERROR', text: 'Connection Lost' }, retry, (customMessage) => {
          resolve(new Response(JSON.stringify({ customMessage, viaModal: true }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
        });
      });
    }
  };
}

async function retryRequest(originalFetch: typeof window.fetch, request: Request): Promise<Response> {
  const headers = new Headers(request.headers);
  headers.set('x-retry', '1');
  const retried = new Request(request, { headers });
  return originalFetch(retried);
}

function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch] as string));
}

// Turns any payload field name into a readable label, e.g. "employeeName" -> "Employee Name".
// This is what lets injectHealingUI render captured data for ANY host app's form shape
// without the SDK needing to know its fields ahead of time.
function humanizeKey(key: string): string {
  const spaced = key.replace(/_/g, ' ').replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  return spaced.replace(/\b\w/g, (c) => c.toUpperCase()).trim();
}

interface HealingErrorData {
  status: number | string;
  text: string;
}

function injectHealingUI(
  payload: Record<string, unknown>,
  errorData: HealingErrorData,
  retry: () => Promise<Response>,
  onComplete: (customMessage: string) => void
) {
  if (document.getElementById('sdk-overlay')) return;
  const host = document.createElement('div');
  host.id = 'sdk-overlay';
  Object.assign(host.style, { position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh', zIndex: '9999', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' });
  const shadowRoot = host.attachShadow({ mode: 'open' });
  let errorTitle = '⚠️ System Offline';
  let errorDesc = '';
  if (errorData.status === 'NETWORK_ERROR') { errorTitle = '⚠️ Internet Connection Lost'; errorDesc = "Your device has lost its internet connection, but don't worry — we've captured your request details below."; }
  else if (errorData.status === 500) { errorTitle = '⚠️ System Database Down'; errorDesc = "The backend database is temporarily down, but don't worry — we've captured your request details below."; }
  else if (errorData.status === 503) { errorTitle = '⚠️ High Traffic Volume'; errorDesc = "The system is receiving too many requests, but don't worry — we've captured your request details below."; }
  else if (errorData.status === 504) { errorTitle = '⚠️ Server Timeout'; errorDesc = "The server is taking too long to respond, but don't worry — we've captured your request details below."; }

  const rows: [string, string][] = Object.entries(payload).map(
    ([key, value]) => [humanizeKey(key), value === undefined || value === null || value === '' ? '—' : String(value)]
  );
  const capturedRowsHtml = rows.map(([label, value]) =>
    `<div class="row"><span class="row-label">${escapeHtml(label)}</span><span class="row-value">${escapeHtml(value)}</span></div>`
  ).join('');

  shadowRoot.innerHTML = `<style>
    .modal{background:white;padding:32px;border-radius:12px;width:460px;box-shadow:0 10px 25px rgba(0,0,0,0.2);font-family:sans-serif}
    .title{color:#dc2626;font-size:18px;font-weight:bold;margin-bottom:8px;display:flex;align-items:center;gap:8px}
    .title.success-state{color:#16a34a}
    .subtitle{color:#4b5563;font-size:14px;margin-bottom:16px;line-height:1.5}
    .captured{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px 14px;margin-bottom:20px}
    .captured-label{font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280;font-weight:bold;margin-bottom:8px}
    .row{display:flex;justify-content:space-between;gap:12px;font-size:13px;padding:4px 0;border-bottom:1px solid #eef0f2}
    .row:last-child{border-bottom:none}
    .row-label{color:#6b7280}
    .row-value{color:#111827;font-weight:600;text-align:right}
    .btn{background:#2563eb;color:white;border:none;padding:12px;border-radius:6px;cursor:pointer;width:100%;font-weight:600;font-size:15px}
    .btn:disabled{opacity:0.7;cursor:default}
    .btn.success{background:#16a34a}
  </style>
    <div class="modal">
      <div class="title" id="m-title">${errorTitle}</div>
      <div class="subtitle" id="m-subtitle">${errorDesc}</div>
      <div class="captured">
        <div class="captured-label">Captured Request Details</div>
        ${capturedRowsHtml}
      </div>
      <button class="btn" id="retry-btn">Retry Submission</button>
    </div>
  `;
  document.body.appendChild(host);
  const titleBox = shadowRoot.getElementById('m-title') as HTMLElement | null;
  const subtitleBox = shadowRoot.getElementById('m-subtitle') as HTMLElement | null;
  const retryBtn = shadowRoot.getElementById('retry-btn') as HTMLButtonElement | null;
  if (!titleBox || !subtitleBox || !retryBtn) return;

  retryBtn.addEventListener('click', async () => {
    retryBtn.disabled = true;
    retryBtn.innerText = 'Retrying...';
    try {
      const res = await retry();
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const successMessage: string = data.customMessage || 'Request submitted successfully.';
        titleBox.innerText = '✅ Success';
        titleBox.classList.add('success-state');
        subtitleBox.innerText = successMessage;
        retryBtn.innerText = 'Close';
        retryBtn.disabled = false;
        retryBtn.classList.add('success');
        retryBtn.addEventListener('click', () => {
          host.remove();
          onComplete(successMessage);
        }, { once: true });
        return;
      }
      throw new Error('Retry failed');
    } catch {
      retryBtn.disabled = false;
      retryBtn.innerText = 'Retry Submission';
      subtitleBox.innerText = 'Still having trouble — please try again.';
    }
  });
}

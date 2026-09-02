export function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch] as string));
}

// Turns any payload field name into a readable label, e.g. "employeeName" -> "Employee Name".
// This is what lets the healing UI render captured data for ANY host app's form shape without
// the SDK needing to know its fields ahead of time.
export function humanizeKey(key: string): string {
  const spaced = key.replace(/_/g, ' ').replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  return spaced.replace(/\b\w/g, (c) => c.toUpperCase()).trim();
}

// A lightweight, non-blocking, auto-dismissing corner notice. Deliberately NOT the same
// component as the full-screen healing modal — these are advisory signals (a trend, a
// suspicion) that shouldn't interrupt what the user is doing, unlike an actual failure.
export function showToast(opts: { icon: string; title: string; message: string; tone: 'warn' | 'info'; durationMs?: number }) {
  const host = document.createElement('div');
  Object.assign(host.style, {
    position: 'fixed', bottom: '20px', right: '20px', zIndex: '9998',
    maxWidth: '360px', fontFamily: 'sans-serif',
  });
  const shadowRoot = host.attachShadow({ mode: 'open' });
  const color = opts.tone === 'warn' ? '#f59e0b' : '#3b82f6';
  shadowRoot.innerHTML = `
    <style>
      .toast { background: white; border-left: 4px solid ${color}; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.15); padding: 14px 16px; animation: slidein 0.25s ease-out; }
      @keyframes slidein { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      .row { display: flex; gap: 10px; align-items: flex-start; }
      .icon { font-size: 18px; }
      .title { font-weight: 700; font-size: 13px; color: #111827; margin-bottom: 2px; }
      .msg { font-size: 12.5px; color: #4b5563; line-height: 1.4; }
    </style>
    <div class="toast">
      <div class="row">
        <div class="icon">${opts.icon}</div>
        <div>
          <div class="title">${escapeHtml(opts.title)}</div>
          <div class="msg">${escapeHtml(opts.message)}</div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(host);
  setTimeout(() => host.remove(), opts.durationMs ?? 6000);
}

interface HealingErrorData {
  status: number | string;
  text: string;
}

// The recovery modal for an actual in-flight failure. `priorFailures` lets the SDK react
// differently to a request that keeps failing versus a first-time blip (context-aware
// recovery) — a plain retry library has no memory of what came before, so it can't do this.
export function injectHealingUI(
  payload: Record<string, unknown>,
  errorData: HealingErrorData,
  retry: () => Promise<Response>,
  priorFailures: number,
  onComplete: (customMessage: string) => void
) {
  if (document.getElementById('sdk-overlay')) return;
  const escalate = priorFailures >= 3;
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

  if (escalate) {
    errorTitle = '🔁 Repeated Failures Detected';
    errorDesc = `This request has failed ${priorFailures} times in the last couple of minutes. Rather than retry again immediately, we recommend saving this as a draft and trying again later — your details are captured below either way.`;
  }

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
    .btn.draft{background:#7c3aed}
  </style>
    <div class="modal">
      <div class="title" id="m-title">${errorTitle}</div>
      <div class="subtitle" id="m-subtitle">${errorDesc}</div>
      <div class="captured">
        <div class="captured-label">Captured Request Details</div>
        ${capturedRowsHtml}
      </div>
      <button class="btn ${escalate ? 'draft' : ''}" id="retry-btn">${escalate ? 'Save as Draft' : 'Retry Submission'}</button>
    </div>
  `;
  document.body.appendChild(host);
  const titleBox = shadowRoot.getElementById('m-title') as HTMLElement | null;
  const subtitleBox = shadowRoot.getElementById('m-subtitle') as HTMLElement | null;
  const retryBtn = shadowRoot.getElementById('retry-btn') as HTMLButtonElement | null;
  if (!titleBox || !subtitleBox || !retryBtn) return;

  if (escalate) {
    retryBtn.addEventListener('click', () => {
      host.remove();
      onComplete('Saved as a draft. Please try submitting again in a little while.');
    }, { once: true });
    return;
  }

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

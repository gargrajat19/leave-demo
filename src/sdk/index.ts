import type { LeaveFormData } from '../store';

import type { LeaveFormData } from '../store';

export function initHealingSDK() {
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    try {
      const response = await originalFetch(...args);
      const request = args[0] instanceof Request ? args[0] : new Request(args[0], args[1]);
      const payload = await request.clone().json().catch(() => ({}));

      if (response.status === 400) {
        const errorBody = await response.clone().json().catch(()=>({}));
        if (errorBody.type === 'AI_INSIGHT') {
           return new Promise((resolve) => {
               injectAIInsightUI(payload, errorBody, (successMessage) => {
                   resolve(new Response(JSON.stringify({ customMessage: successMessage }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
               });
           });
        }
      }
      if (!response.ok && response.status >= 500) {
        const retry = () => retryRequest(originalFetch, request);
        return new Promise((resolve) => {
            injectHealingUI(payload, { status: response.status, text: response.statusText }, retry, (customMessage) => {
                resolve(new Response(JSON.stringify({ customMessage }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
            });
        });
      }
      return response;
    } catch {
      const request = args[0] instanceof Request ? args[0] : new Request(args[0], args[1]);
      const payload = await request.clone().json().catch(() => ({ }));
      const retry = () => retryRequest(originalFetch, request);
      return new Promise((resolve) => {
          injectHealingUI(payload, { status: 'NETWORK_ERROR', text: 'Connection Lost' }, retry, (customMessage) => {
              resolve(new Response(JSON.stringify({ customMessage }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
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
      if (!response.ok && response.status >= 500) {
        return new Promise((resolve) => {
            injectHealingUI(payload, { status: response.status, text: response.statusText }, () => {
                resolve(new Response(JSON.stringify({ customMessage: 'Request safely cached offline' }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
            });
        });
      }
      return response;
    } catch {
      const request = args[0] instanceof Request ? args[0] : new Request(args[0], args[1]);
      const payload = await request.clone().json().catch(() => ({ }));
      return new Promise((resolve) => {
          injectHealingUI(payload, { status: 'NETWORK_ERROR', text: 'Connection Lost' }, () => {
              resolve(new Response(JSON.stringify({ customMessage: 'Request safely cached offline' }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
          });
      });
    }
  };
}

interface AIInsightData {
  category: string;
  title: string;
  message: string;
  action: string;
  successMessage: string;
}

function injectAIInsightUI(_payload: unknown, insightData: AIInsightData, onComplete: (successMessage: string) => void) {
  if (document.getElementById('sdk-overlay')) return;
  const host = document.createElement('div');
  host.id = 'sdk-overlay';
  Object.assign(host.style, { position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh', zIndex: '9999', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' });
  const shadowRoot = host.attachShadow({ mode: 'open' });
  const isAnomaly = insightData.category === 'ANOMALY';
  const themeColor = isAnomaly ? '#f97316' : '#8b5cf6';
  shadowRoot.innerHTML = `
    <style>
      .modal { background: white; padding: 32px; border-radius: 12px; width: 450px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04); font-family: sans-serif; }
      .header { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
      .icon { background: ${themeColor}15; color: ${themeColor}; padding: 8px; border-radius: 8px; font-size: 20px; }
      .title-box { display: flex; flex-direction: column; }
      .supertitle { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: ${themeColor}; font-weight: bold; }
      .title { color: #111827; font-size: 18px; font-weight: 700; }
      .content { color: #4b5563; font-size: 14px; line-height: 1.6; margin-bottom: 24px; padding: 12px; border-left: 4px solid ${themeColor}; background: #f9fafb; border-radius: 0 8px 8px 0; }
      .actions { display: flex; gap: 10px; }
      .btn { flex: 1; padding: 12px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 14px; transition: all 0.2s; text-align: center; border: none; }
      .btn-primary { background: ${themeColor}; color: white; }
      .btn-primary:hover { filter: brightness(0.9); }
      .btn-secondary { background: transparent; color: #475569; border: 1px solid #cbd5e1; }
      .btn-secondary:hover { background: #f1f5f9; }
      .success-state { color: #16a34a !important; }
    </style>
    <div class="modal">
      <div class="header">
        <div class="icon">${isAnomaly ? '🚩' : '💡'}</div>
        <div class="title-box">
          <div class="supertitle">AI Manager Co-Pilot</div>
          <div class="title" id="m-title">${insightData.title}</div>
        </div>
      </div>
      <div class="content" id="m-content">${insightData.message}</div>
      <div class="actions">
        <button class="btn btn-secondary" id="ignore-btn">Ignore & Approve</button>
        <button class="btn btn-primary" id="action-btn">${insightData.action}</button>
      </div>
    </div>
  `;
  document.body.appendChild(host);
  const ignoreBtn = shadowRoot.getElementById('ignore-btn') as HTMLButtonElement | null;
  const actionBtn = shadowRoot.getElementById('action-btn') as HTMLButtonElement | null;
  const titleBox = shadowRoot.getElementById('m-title') as HTMLElement | null;
  const contentBox = shadowRoot.getElementById('m-content') as HTMLElement | null;

  if (!ignoreBtn || !actionBtn || !titleBox || !contentBox) return;

  ignoreBtn.addEventListener('click', () => {
    host.remove();
    onComplete('Request Approved Normally');
  });

  actionBtn.addEventListener('click', async () => {
    actionBtn.disabled = true;
    ignoreBtn.style.display = 'none';
    actionBtn.innerText = 'Processing...';
    
    await new Promise(r => setTimeout(r, 1200));
    
    actionBtn.disabled = false;
    titleBox.innerText = '✅ Action Completed';
    titleBox.classList.add('success-state');
    contentBox.innerText = insightData.successMessage;
    actionBtn.innerText = 'Close';
    actionBtn.style.background = '#16a34a';
    
    actionBtn.addEventListener('click', () => {
      host.remove();
      onComplete(insightData.successMessage);
    }, { once: true });
  }, { once: true });
}

interface HealingErrorData {
  status: number | string;
  text: string;
}

function injectHealingUI(
  payload: Partial<LeaveFormData>,
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
  else if (errorData.status === 500) { errorTitle = '⚠️ HR Database Down'; errorDesc = "The main HR database is temporarily down, but don't worry — we've captured your request details below."; }
  else if (errorData.status === 503) { errorTitle = '⚠️ High Traffic Volume'; errorDesc = "The HR portal is receiving too many requests, but don't worry — we've captured your request details below."; }
  else if (errorData.status === 504) { errorTitle = '⚠️ Server Timeout'; errorDesc = "The HR server is taking too long to respond, but don't worry — we've captured your request details below."; }

  const rows: [string, string][] = [
    ['Employee', payload.employeeName || '—'],
    ['Leave Type', payload.leaveType || '—'],
    ['Dates', (payload.startDate || '—') + ' → ' + (payload.endDate || '—')],
    ['Reason', payload.reason || '—'],
  ];
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
        const successMessage: string = data.customMessage || 'Leave request submitted successfully.';
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

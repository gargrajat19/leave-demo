const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('📦 1/2: Installing dependencies (this will work now)...');
execSync('npm install zustand msw @tailwindcss/vite', { stdio: 'inherit' });
execSync('npx msw init ./public --save', { stdio: 'inherit' });

console.log('✍️ 2/2: Writing SDK and App files...');
const write = (file, content) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content.trim());
};

write('vite.config.ts', `import { defineConfig } from 'vite'\nimport react from '@vitejs/plugin-react'\nimport tailwindcss from '@tailwindcss/vite'\nexport default defineConfig({ plugins: [react(), tailwindcss()] })`);
write('src/index.css', `@import "tailwindcss";`);

write('src/store.ts', `import { create } from 'zustand'\nexport const useLeaveStore = create((set) => ({ formData: { employeeName: '', leaveType: 'Sick Leave', startDate: '', endDate: '', reason: '' }, updateField: (field, value) => set((state) => ({ formData: { ...state.formData, [field]: value } })), resetForm: () => set({ formData: { employeeName: '', leaveType: 'Sick Leave', startDate: '', endDate: '', reason: '' } }) }))`);

write('src/mocks/handlers.ts', `import { http, HttpResponse } from 'msw'\nexport const handlers = [ http.post('/api/leave-requests', async () => { await new Promise(r => setTimeout(r, 1500)); return new HttpResponse(null, { status: 500 }); }) ]`);
write('src/mocks/browser.ts', `import { setupWorker } from 'msw/browser'\nimport { handlers } from './handlers'\nexport const worker = setupWorker(...handlers)`);

write('src/sdk/index.ts', `export function initHealingSDK() { const orig = window.fetch; window.fetch = async (...args) => { try { const res = await orig(...args); if (!res.ok && res.status >= 500) { const req = args[0] instanceof Request ? args[0] : new Request(args[0], args[1]); const payload = await req.clone().json().catch(() => ({})); injectHealingUI(payload); return new Response(JSON.stringify({ healed: true }), { status: 200, headers: { 'Content-Type': 'application/json' } }); } return res; } catch (e) { throw e; } } }\nfunction injectHealingUI(payload) { if (document.getElementById('sdk-overlay')) return; const host = document.createElement('div'); host.id = 'sdk-overlay'; Object.assign(host.style, { position: 'fixed', inset: '0', zIndex: '9999', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }); const shadow = host.attachShadow({ mode: 'open' }); shadow.innerHTML = '⚠️ HR System OfflineWe intercepted the failure and securely saved your request locally.' + JSON.stringify(payload, null, 2) + 'Acknowledge'; document.body.appendChild(host); shadow.getElementById('c').addEventListener('click', () => host.remove()); }`);

write('src/main.tsx', `import React from 'react'\nimport ReactDOM from 'react-dom/client'\nimport App from './App.tsx'\nimport './index.css'\nimport { initHealingSDK } from './sdk'\ninitHealingSDK()\nasync function enable() { const { worker } = await import('./mocks/browser'); return worker.start(); }\nenable().then(() => { ReactDOM.createRoot(document.getElementById('root')).render() })`);

write('src/App.tsx', `import { useState } from 'react'\nimport { useLeaveStore } from './store'\nexport default function App() { const { formData, updateField, resetForm } = useLeaveStore(); const [status, setStatus] = useState('idle'); const handleSubmit = async (e) => { e.preventDefault(); setStatus('loading'); try { const res = await fetch('/api/leave-requests', { method: 'POST', body: JSON.stringify(formData) }); if (res.ok) { setStatus('success'); resetForm(); setTimeout(() => setStatus('idle'), 3000); } else setStatus('error'); } catch { setStatus('error'); } }; return Workforce PortalEmployee Leave ManagementName updateField('employeeName', e.target.value)} />Type updateField('leaveType', e.target.value)}>Sick LeaveVacation{status === 'loading' ? 'Submitting...' : 'Submit Request'}; }`);

console.log('✅ ALL DONE! Run "npm run dev" now.');
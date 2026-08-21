import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { initHealingSDK } from './sdk/index';

initHealingSDK();

async function bootApp() {
  try {
    const { worker } = await import('./mocks/browser');
    await worker.start({ onUnhandledRequest: 'bypass' });
  } catch (e) {
    console.error('MSW Error:', e);
  }
  const rootEl = document.getElementById('root');
  if (!rootEl) throw new Error('Root element #root not found in index.html');
  ReactDOM.createRoot(rootEl).render(<React.StrictMode><App /></React.StrictMode>);
}

bootApp();
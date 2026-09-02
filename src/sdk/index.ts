import { showToast, injectHealingUI } from './ui';

// ============================================================================
// Capability 1: Context-aware recovery.
// A plain retry has no memory — it treats the 1st and 10th failure of the same
// request identically. This SDK tracks failure history per-endpoint and changes
// its recommended action once a request keeps failing, instead of blindly
// suggesting "try again" forever.
// ============================================================================
const failureHistory = new Map<string, number[]>();
const FAILURE_WINDOW_MS = 2 * 60 * 1000;

function recordFailure(url: string) {
  const arr = failureHistory.get(url) || [];
  arr.push(Date.now());
  failureHistory.set(url, arr);
}

function countRecentFailures(url: string): number {
  const now = Date.now();
  const arr = (failureHistory.get(url) || []).filter((t) => now - t <= FAILURE_WINDOW_MS);
  failureHistory.set(url, arr);
  return arr.length;
}

// ============================================================================
// Capability 2: Predictive degradation.
// Watches response latency across ALL requests (not just failures) and warns
// proactively when a clear upward trend appears — before anything has actually
// timed out. This is the piece that completes "error reporting -> self-
// diagnosing -> self-healing -> self-preventing": everything else in this SDK
// reacts to a failure that already happened; this one doesn't wait for that.
// ============================================================================
const LATENCY_WINDOW = 6;
const latencyHistory: number[] = [];
let degradationWarnedAt = 0;
const DEGRADATION_COOLDOWN_MS = 30_000;

function trackLatency(elapsedMs: number) {
  latencyHistory.push(elapsedMs);
  if (latencyHistory.length > LATENCY_WINDOW) latencyHistory.shift();
  if (latencyHistory.length < LATENCY_WINDOW) return;

  const half = LATENCY_WINDOW / 2;
  const earlier = latencyHistory.slice(0, half);
  const recent = latencyHistory.slice(half);
  const avgEarlier = earlier.reduce((a, b) => a + b, 0) / earlier.length;
  const avgRecent = recent.reduce((a, b) => a + b, 0) / recent.length;

  const trendingUp = avgRecent > avgEarlier * 1.6 && avgRecent > 400;
  const offCooldown = Date.now() - degradationWarnedAt > DEGRADATION_COOLDOWN_MS;

  if (trendingUp && offCooldown) {
    degradationWarnedAt = Date.now();
    showToast({
      icon: '📉',
      tone: 'warn',
      title: 'Performance Degradation Detected',
      message: `Response times have climbed from ~${Math.round(avgEarlier)}ms to ~${Math.round(avgRecent)}ms. Monitoring closely — no failure yet, just flagging the trend early.`,
    });
  }
}

// ============================================================================
// Capability 3: Silent-failure detection.
// A request can return HTTP 200 while still being broken inside (an empty or
// malformed payload from bad backend error handling) — the calling app has no
// way to know, since from its point of view the request "succeeded." This
// learns the normal response shape per endpoint and flags a sharp deviation.
// ============================================================================
interface ResponseProfile { count: number; avgLength: number; }
const responseProfiles = new Map<string, ResponseProfile>();

async function checkSilentFailure(url: string, response: Response) {
  const text = await response.text().catch(() => '');
  const length = text.length;
  const profile = responseProfiles.get(url);

  if (!profile) {
    responseProfiles.set(url, { count: 1, avgLength: length });
    return;
  }

  if (profile.count >= 3 && profile.avgLength > 50 && length < profile.avgLength * 0.25) {
    showToast({
      icon: '🕵️',
      tone: 'warn',
      title: 'Possible Silent Failure',
      message: `This endpoint usually returns ~${Math.round(profile.avgLength)} bytes of data, but just returned ${length}. It reported success (200), but the payload looks abnormally empty — worth checking.`,
    });
    return; // don't fold the anomalous response into the learned baseline
  }

  responseProfiles.set(url, { count: profile.count + 1, avgLength: (profile.avgLength * profile.count + length) / (profile.count + 1) });
}

// ============================================================================
// Capability 4: Frustration detection -> live intervention.
// Session-replay tools already detect rage-clicks, but only for a human to
// review later in analytics. This acts on it live, the moment it happens.
// ============================================================================
const clickHistory = new Map<Element, number[]>();
const RAGE_CLICK_WINDOW_MS = 4000;
const RAGE_CLICK_THRESHOLD = 3;
const rageWarned = new WeakSet<Element>();

export function initFrustrationWatcher() {
  document.addEventListener('click', (e) => {
    const target = (e.target as HTMLElement)?.closest('button, [type="submit"]');
    if (!target) return;
    const now = Date.now();
    const arr = (clickHistory.get(target) || []).filter((t) => now - t <= RAGE_CLICK_WINDOW_MS);
    arr.push(now);
    clickHistory.set(target, arr);

    if (arr.length >= RAGE_CLICK_THRESHOLD && !rageWarned.has(target)) {
      rageWarned.add(target);
      showToast({
        icon: '🤔',
        tone: 'info',
        title: 'Noticed Repeated Clicks',
        message: "This doesn't seem to be responding yet. Your last input is safe — no need to keep clicking, we're still working on it.",
      });
      setTimeout(() => rageWarned.delete(target), 15_000);
    }
  }, true);
}

// ============================================================================
// Capability 5: Cross-app correlation via a relay this SDK owns — not via
// integrating two vendors' backends with each other. Each app instance
// reports a small amount of telemetry to shared infrastructure the SDK
// controls; correlation happens there, above both apps, without either app's
// backend ever needing to know the other one exists.
// ============================================================================
export async function reportTelemetry(event: { module: string; employeeName: string; context: string; date?: string }) {
  try {
    await fetch('/api/relay/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
  } catch {
    // best-effort — telemetry should never block the host app
  }
}

// ============================================================================
// Core: fetch interception, wiring capabilities 1-3 into every request.
// ============================================================================
export function initHealingSDK() {
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const request = args[0] instanceof Request ? args[0] : new Request(args[0], args[1]);
    const url = request.url;
    const start = performance.now();

    try {
      const response = await originalFetch(...args);
      trackLatency(performance.now() - start);

      if (!response.ok && response.status >= 500) {
        recordFailure(url);
        const payload = await request.clone().json().catch(() => ({}));
        const retry = () => retryRequest(originalFetch, request);
        const priorFailures = countRecentFailures(url);
        return new Promise((resolve) => {
          injectHealingUI(payload, { status: response.status, text: response.statusText }, retry, priorFailures, (customMessage) => {
            resolve(new Response(JSON.stringify({ customMessage, viaModal: true }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
          });
        });
      }

      if (response.ok) {
        checkSilentFailure(url, response.clone());
      }

      return response;
    } catch {
      recordFailure(url);
      const payload = await request.clone().json().catch(() => ({}));
      const retry = () => retryRequest(originalFetch, request);
      const priorFailures = countRecentFailures(url);
      return new Promise((resolve) => {
        injectHealingUI(payload, { status: 'NETWORK_ERROR', text: 'Connection Lost' }, retry, priorFailures, (customMessage) => {
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

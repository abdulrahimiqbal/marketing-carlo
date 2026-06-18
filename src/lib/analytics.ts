// Thin, privacy-friendly hook point for analytics + error reporting. No-ops by
// default. To enable a provider (e.g. Plausible/PostHog) add its script and
// allow its domain in the server CSP (script-src / connect-src), then this
// forwards events to it. Swap `reportError` to forward to Sentry, etc.
type Props = Record<string, string | number | boolean>;

interface AnalyticsFn {
  (event: string, options?: { props?: Props }): void;
}

declare global {
  interface Window {
    plausible?: AnalyticsFn;
  }
}

export function track(event: string, props?: Props): void {
  try {
    if (typeof window !== 'undefined' && typeof window.plausible === 'function') {
      window.plausible(event, props ? { props } : undefined);
    }
  } catch {
    /* analytics must never break the app */
  }
}

export function reportError(error: unknown, context?: Props): void {
  // eslint-disable-next-line no-console
  console.error('[CampaignCanvas error]', error, context ?? {});
  track('app_error', context);
}

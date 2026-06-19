import { Component, type ErrorInfo, type ReactNode } from 'react';
import { clearStoredProject } from '../state/persistence';
import { reportError } from '../lib/analytics';

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

/** Catches render-time errors so a single bug can't white-screen the whole app. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportError(error, { componentStack: info.componentStack ?? '' });
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-slate-50 p-6 text-center">
        <h1 className="text-lg font-semibold text-slate-900">Something went wrong</h1>
        <p className="max-w-md text-sm text-slate-600">
          The app hit an unexpected error. Your saved campaign is still in this browser — try
          reloading. If it keeps happening, resetting the saved data usually fixes it.
        </p>
        <pre className="max-w-md overflow-auto rounded bg-slate-100 p-2 text-left text-[11px] text-slate-500">
          {this.state.error.message}
        </pre>
        <div className="flex gap-2">
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Reload
          </button>
          <button
            onClick={() => {
              clearStoredProject();
              window.location.reload();
            }}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Reset saved data
          </button>
        </div>
      </div>
    );
  }
}

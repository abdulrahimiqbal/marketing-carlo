// §11 — optional LLM message check, surfaced on organic nodes only. Paste a
// draft post, get a qualitative read (resonance / misread risk / sharper
// rewrite). It is QUALITATIVE ONLY and never touches the node's numbers.
import { useState } from 'react';

interface CheckResult {
  resonatesWith: string;
  topMisreadRisk: string;
  sharperRewrite: string;
  model?: string;
}

const MAX = 4000;

function QualitativeBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700 ring-1 ring-inset ring-violet-200">
      <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
      Qualitative check
    </span>
  );
}

function ResultBlock({ label, children }: { label: string; children: string }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{children}</p>
    </div>
  );
}

export function MessageCheck({ channelLabel }: { channelLabel: string }) {
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CheckResult | null>(null);

  const tooShort = draft.trim().length < 10;

  const run = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const resp = await fetch('/api/message-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft: draft.trim(), channel: channelLabel }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        setError(data?.message || `Request failed (${resp.status}).`);
        return;
      }
      setResult(data as CheckResult);
    } catch {
      setError('Could not reach the message checker. If running locally, start the server with `npm start`.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Message check
        </h3>
        <QualitativeBadge />
      </div>
      <p className="mb-2 text-[11px] text-slate-400">
        Paste your draft post for a qualitative gut-check — who it resonates with, the top misread
        risk, and one sharper rewrite. This never produces or changes any numbers.
      </p>

      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value.slice(0, MAX))}
        rows={4}
        placeholder="Paste your launch post draft…"
        className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200"
      />
      <div className="mt-1 flex items-center justify-between">
        <span className="text-[10px] text-slate-400">
          {draft.length}/{MAX}
        </span>
        <button
          onClick={run}
          disabled={loading || tooShort}
          className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {loading ? 'Checking…' : 'Check message'}
        </button>
      </div>

      {error && (
        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-3 space-y-3 rounded-lg border border-violet-100 bg-violet-50/40 p-3">
          <ResultBlock label="Resonates with">{result.resonatesWith}</ResultBlock>
          <ResultBlock label="Top misread risk">{result.topMisreadRisk}</ResultBlock>
          <ResultBlock label="Sharper rewrite">{result.sharperRewrite}</ResultBlock>
          <p className="border-t border-violet-100 pt-2 text-[10px] text-slate-400">
            Qualitative only — this does not affect your estimates{result.model ? ` · ${result.model}` : ''}.
          </p>
        </div>
      )}
    </section>
  );
}

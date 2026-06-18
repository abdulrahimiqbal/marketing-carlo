# Campaign Canvas

> Map your launch on one canvas, simulate every channel, and see the users before you spend.

A single-page app where you lay out a product launch as **channel nodes on a canvas**, fill in
(or accept default) assumptions per channel, and immediately see an **honest range** of expected
visitors, signups, and paying users — per channel and for the whole campaign — _before spending
any money_.

The product thesis is **epistemic honesty**. The app shows **ranges, not points**; it **labels how
confident each number is**; and it never blends a high-variance organic guess into a tighter paid
estimate without showing the seam.

## What's in v1

A single **deterministic funnel engine** applied across all channels (Meta Ads, Google Search, X
organic), with channel-tuned, benchmark-seeded assumptions and a **Monte Carlo range** (2,000
draws, triangular distributions, seeded RNG for reproducibility).

- **Honest ranges** — every result is reported as P10 / P50 / P90, never a lone integer.
- **Confidence badges** — paid channels are "Estimated · assumption-based"; organic is
  "Estimated · high variance." Badges describe what the engine _actually did_.
- **The paid/organic seam** — campaign totals always show paid and organic subtotals separately.
- **Manual actuals** — after launch, enter real numbers for an honest estimate-vs-actual
  side-by-side.
- **Data safety** — an error boundary so a runtime error can't white-screen the app, plus JSON
  export / import and a "start over" action (localStorage is per-device).
- **Optional message check** (§11) — on organic nodes, paste a draft post for a _qualitative_ read
  (resonance / misread risk / sharper rewrite). It never produces or modifies any numbers and is
  off unless an Anthropic API key is configured (see below).

Explicitly **out of scope** in v1 (reserved for v2): the behavioral agent simulation,
auth/multi-user, and live ad-platform integration.

## Tech stack

Vite · TypeScript (strict) · React 18 · [@xyflow/react](https://reactflow.dev) (React Flow v12) ·
Tailwind CSS · Zustand · Recharts · localStorage persistence. The funnel engine runs **entirely
client-side as pure functions** — no backend, database, or auth.

## Local development

```bash
npm install
npm run dev          # http://localhost:5173
```

Other scripts:

```bash
npm test             # run the engine, state, persistence, and UI tests (vitest)
npm run typecheck    # strict TypeScript, no emit
npm run build        # type-check + produce the static bundle in dist/
npm start            # serve the built dist/ with the production server (server.js)
```

## Deploying to Railway

The core app is fully client-side; Railway just needs to serve the built static bundle. A tiny
Express server (`server.js`) serves `dist/` on the port Railway provides (`$PORT`) and falls back to
`index.html` for client-side routes.

**One-time setup**

1. Create a new project on [Railway](https://railway.app) and connect this repository.
2. Railway auto-detects the Node app via **Nixpacks**. The build is pinned by `nixpacks.toml`:
   - install: `npm ci`
   - build: `npm run build`
   - start: `npm start`
3. `railway.json` configures the start command and a health check at `/healthz`.
4. Railway injects `PORT` automatically — no environment variables are required for v1.

That's it. On deploy, Railway runs `npm ci` → `npm run build` → `npm start`, and the app is live.
No API keys are shipped in the client bundle.

### Optional: enable the §11 message check

The message check calls the Anthropic API from a server route (`/api/message-check` in `server.js`),
keeping the key server-side. It is **off by default** — without a key, the endpoint returns a
friendly "not enabled" response and the rest of the app is unaffected.

To turn it on, add a Railway **service variable**:

- `ANTHROPIC_API_KEY` — your Anthropic API key (required to enable the feature)
- `ANTHROPIC_MODEL` — optional model override (defaults to `claude-opus-4-8`)

No key is ever read by or shipped to the browser. The check is qualitative only and never produces
or modifies any numbers. For local development, set `ANTHROPIC_API_KEY` and run `npm start`
alongside `npm run dev` (Vite proxies `/api` to the local server).

> **Why a server at all?** The PRD targeted Vercel static hosting. Railway runs a process rather
> than serving a static directory, so we add a minimal static file server. The application logic is
> still 100% client-side — `server.js` only serves files.

### Manual deploy via the Railway CLI (optional)

```bash
npm i -g @railway/cli
railway login
railway init
railway up
```

## Architecture

```
src/
  engine/            # pure, headless funnel engine (no React)
    types.ts         #   core interfaces
    rng.ts           #   mulberry32 + triangular sampling + seed hashing
    funnel.ts        #   channel entry stages + shared downstream funnel
    simulate.ts      #   Monte Carlo per node + campaign aggregate
    engine.test.ts   #   acceptance tests
  benchmarks/
    presets.ts       # per-vertical benchmark seeds + node factory
  state/
    store.ts         # Zustand store (single source of truth)
    persistence.ts   # debounced localStorage load/save
  canvas/            # React Flow canvas + custom channel node card
  components/        # Inspector, CampaignSummary, Toolbar, badges, range bars
  lib/               # number/range formatting, id helper
```

### The engine in one paragraph

Each channel reduces to the same funnel; only the entry stage differs (CPM, CPC, or
reach-based). For each of N = 2,000 draws we sample every uncertain assumption from a triangular
distribution using a **seeded** generator (so identical node state always reproduces the same
range), run the full funnel, and collect the outputs. We report P10 / P50 / P90. The campaign
aggregate **sums across nodes per draw index, then takes percentiles** — which correctly narrows
the summed range instead of naively adding the individual ranges.

## The one rule

If a choice trades honesty for impressiveness, choose honesty. A wide range the user trusts on
launch day beats a crisp integer they stop believing the first time reality disagrees.

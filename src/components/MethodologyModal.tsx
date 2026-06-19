// "How it works" — plain-language honesty about what the engine does and,
// just as importantly, what it does not. This is part of the product's moat:
// being trustworthy after someone checks it against reality.
import { ConfirmDialog } from './ConfirmDialog';

export function MethodologyModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <ConfirmDialog
      open={open}
      title="How Campaign Canvas works"
      onClose={onClose}
      actions={[{ label: 'Got it', tone: 'primary', onClick: onClose }]}
    >
      <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
        <p>
          Each channel is a funnel. Your <strong>fixed inputs</strong> (budget, list size, followers)
          are exact; your <strong>assumptions</strong> (CPM, click-through, conversion) are uncertain,
          so each is a triangular <em>low / most-likely / high</em> range seeded from benchmarks.
        </p>
        <p>
          For every channel we run a <strong>Monte Carlo simulation: 2,000 draws</strong>. Each draw
          samples every assumption from its range and runs the whole funnel. We report the 10th, 50th,
          and 90th percentiles of the 2,000 outcomes — a range, never a single number.
        </p>
        <p>
          The campaign total <strong>sums across channels per draw, then takes percentiles</strong>.
          That's why the combined range is tighter than adding the channel ranges — independent bets
          partly cancel. Paid and organic subtotals are always kept separate; we never blend a tight
          paid estimate with a wide organic guess into one misleading number.
        </p>
        <p>
          The <strong>sensitivity</strong> bars show which assumption drives most of the spread, so
          you know what to nail down first. The <strong>distribution</strong> is the real shape of
          those 2,000 draws.
        </p>
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-800 ring-1 ring-inset ring-amber-200">
          <strong>What this is not:</strong> a measurement. We are not wired into any ad platform's
          auction. Organic reach is a power-law lottery — its range is wide on purpose. Benchmarks are
          starting estimates; adjust them to your reality, and enter your actuals after launch. A wide
          range you trust beats a crisp number you stop believing.
        </p>
      </div>
    </ConfirmDialog>
  );
}

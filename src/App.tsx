// Single screen, three regions (§7): left rail (toolbar + campaign summary),
// center canvas, right inspector (opens on node select).
import { useStore } from './state/store';
import { Toolbar } from './components/Toolbar';
import { CampaignSummary } from './components/CampaignSummary';
import { Canvas } from './canvas/Canvas';
import { Inspector } from './components/Inspector';
import { ProjectActions } from './components/ProjectActions';
import { SmallScreenNotice } from './components/SmallScreenNotice';

export default function App() {
  const selectedNodeId = useStore((s) => s.selectedNodeId);
  const selectedNode = useStore(
    (s) => s.project.nodes.find((n) => n.id === selectedNodeId) ?? null,
  );
  const vertical = useStore((s) => s.project.vertical);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-900">
      {/* Left rail */}
      <aside className="flex w-80 shrink-0 flex-col border-r border-slate-200 bg-white">
        <Toolbar />
        <div className="min-h-0 flex-1 overflow-y-auto">
          <CampaignSummary />
        </div>
        <ProjectActions />
      </aside>

      {/* Canvas */}
      <main className="relative min-w-0 flex-1">
        <Canvas />
      </main>

      {/* Inspector */}
      {selectedNode && (
        <aside className="w-96 shrink-0 border-l border-slate-200 bg-white">
          <Inspector node={selectedNode} vertical={vertical} />
        </aside>
      )}

      <SmallScreenNotice />
    </div>
  );
}

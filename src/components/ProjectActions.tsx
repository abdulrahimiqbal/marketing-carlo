// Data-safety footer: export / import a project file and start over. localStorage
// is per-device and easy to lose, so this gives the user a real escape hatch.
import { useRef, useState } from 'react';
import { useStore } from '../state/store';
import { downloadProject, readProjectFile } from '../lib/projectFile';
import { shareUrl } from '../lib/share';
import { track } from '../lib/analytics';
import { ConfirmDialog } from './ConfirmDialog';

export function ProjectActions() {
  const project = useStore((s) => s.project);
  const importProject = useStore((s) => s.importProject);
  const resetProject = useStore((s) => s.resetProject);

  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      importProject(await readProjectFile(file));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed.');
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl(project));
      track('shared', { channels: project.nodes.length });
      setError(null);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setError('Could not copy the link to your clipboard.');
    }
  };

  return (
    <div className="border-t border-slate-200 px-4 py-3">
      <div className="flex items-center gap-3 text-[11px] font-medium text-slate-500">
        <button
          onClick={() => downloadProject(project)}
          className="hover:text-indigo-600 hover:underline"
        >
          Export
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className="hover:text-indigo-600 hover:underline"
        >
          Import
        </button>
        <button onClick={handleShare} className="hover:text-indigo-600 hover:underline">
          {copied ? 'Link copied!' : 'Share'}
        </button>
        <button
          onClick={() => setConfirmReset(true)}
          className="ml-auto text-slate-400 hover:text-red-600 hover:underline"
        >
          Start over
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            void handleImport(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>
      {error && <p className="mt-1 text-[11px] text-red-600">{error}</p>}

      <ConfirmDialog
        open={confirmReset}
        title="Start over?"
        onClose={() => setConfirmReset(false)}
        actions={[
          { label: 'Cancel', tone: 'default', onClick: () => setConfirmReset(false) },
          {
            label: 'Start over',
            tone: 'danger',
            onClick: () => {
              resetProject();
              setConfirmReset(false);
            },
          },
        ]}
      >
        This clears the current campaign from this browser and starts a blank one. Export it first
        if you want to keep it.
      </ConfirmDialog>
    </div>
  );
}

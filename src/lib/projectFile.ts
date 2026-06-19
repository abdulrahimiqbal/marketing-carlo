// Export / import a project as a JSON file — data portability so a user's work
// isn't trapped in one browser's localStorage.
import type { Project } from '../engine/types';
import { isValidProject } from '../state/persistence';

export function downloadProject(project: Project): void {
  const safeName = (project.name || 'campaign').replace(/[^a-z0-9-_]+/gi, '-').toLowerCase();
  const date = new Date().toISOString().slice(0, 10);
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeName}-${date}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function readProjectFile(file: File): Promise<Project> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error("That file isn't valid JSON.");
  }
  if (!isValidProject(parsed)) {
    throw new Error("That file isn't a Campaign Canvas project.");
  }
  return parsed;
}

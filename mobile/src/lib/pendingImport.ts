import type { Project } from "./api";

// One-shot handoff into the Import screen: whichever screen navigates there
// (header nav, a shared link, or Detail's Edit button) sets this immediately
// before navigating; Import reads-and-clears it on mount. Simpler than
// threading a full draft object through Expo Router's string-only params.
type PendingImport = {
  editingProjectId: string | null;
  editingProject: Project | null;
  sharedUrl: string | null;
  sharedText: string | null;
};

let pending: PendingImport = { editingProjectId: null, editingProject: null, sharedUrl: null, sharedText: null };

export function setPendingEdit(project: Project) {
  pending = { editingProjectId: project.id, editingProject: project, sharedUrl: null, sharedText: null };
}

export function setPendingShare(url: string | null, text: string | null) {
  pending = { editingProjectId: null, editingProject: null, sharedUrl: url, sharedText: text };
}

export function clearPendingImport() {
  pending = { editingProjectId: null, editingProject: null, sharedUrl: null, sharedText: null };
}

export function consumePendingImport(): PendingImport {
  const current = pending;
  pending = { editingProjectId: null, editingProject: null, sharedUrl: null, sharedText: null };
  return current;
}

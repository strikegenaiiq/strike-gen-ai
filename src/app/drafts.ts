export type StudioDraft = {
  prompt: string;
  scope: "standard" | "premium";
  duration: number;
  resolution: string;
  savedAt: number;
};

const DRAFT_KEY = "strike-studio:draft:v1";

export function loadStudioDraft(): StudioDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as StudioDraft;
    if (!draft || typeof draft.prompt !== "string") return null;
    return draft;
  } catch {
    return null;
  }
}

export function saveStudioDraft(draft: StudioDraft) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Storage can be unavailable in private browsing; the editor remains usable.
  }
}

export function clearStudioDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Ignore storage failures.
  }
}

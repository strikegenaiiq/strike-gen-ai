import { useEffect } from "react";
import { loadStudioDraft, saveStudioDraft, clearStudioDraft } from "./drafts";

const DRAFT_EVENT = "strike-studio:draft-updated";

export function StudioDraftBridge() {
  useEffect(() => {
    let textarea: HTMLTextAreaElement | null = null;
    let observer: MutationObserver | null = null;
    let pollId: number | null = null;

    const attach = () => {
      if (textarea) return true;
      const candidate = document.querySelector<HTMLTextAreaElement>(
        'textarea[placeholder*="cinematic" i], textarea'
      );
      if (!candidate) return false;
      textarea = candidate;

      const draft = loadStudioDraft();
      if (draft?.prompt && !textarea.value) {
        const setter = Object.getOwnPropertyDescriptor(
          HTMLTextAreaElement.prototype,
          "value"
        )?.set;
        setter?.call(textarea, draft.prompt);
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
      }

      const save = () => {
        const prompt = textarea?.value ?? "";
        if (!prompt.trim()) {
          clearStudioDraft();
          return;
        }
        saveStudioDraft({
          prompt,
          scope: "standard",
          duration: 5,
          resolution: "720p",
          savedAt: Date.now(),
        });
        window.dispatchEvent(new Event(DRAFT_EVENT));
      };

      textarea.addEventListener("input", save);
      textarea.addEventListener("change", save);
      pollId = window.setInterval(() => {
        if (textarea && !textarea.value.trim()) clearStudioDraft();
      }, 500);
      return true;
    };

    if (!attach()) {
      observer = new MutationObserver(() => {
        if (attach()) observer?.disconnect();
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }

    return () => {
      observer?.disconnect();
      if (pollId !== null) window.clearInterval(pollId);
      textarea?.removeEventListener("input", () => undefined);
      textarea?.removeEventListener("change", () => undefined);
    };
  }, []);

  return null;
}

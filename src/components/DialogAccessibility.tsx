import { useEffect } from "react";

const FOCUSABLE = [
  "button:not([disabled])",
  "a[href]",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

/**
 * Adds one consistent keyboard contract to legacy dialogs while their
 * business-specific forms remain owned by their pages: focus enters the most
 * recent dialog, Tab stays inside it, Escape uses its explicit close button,
 * and focus returns to the invoking control when it closes.
 */
export default function DialogAccessibility() {
  useEffect(() => {
    let activeDialog: HTMLElement | null = null;
    let returnFocus: HTMLElement | null = null;
    let previousOverflow = "";

    const dialogs = () => Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]'));
    const focusables = (dialog: HTMLElement) => Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE))
      .filter((element) => !element.hasAttribute("hidden") && element.getAttribute("aria-hidden") !== "true");

    const sync = () => {
      const next = dialogs().at(-1) || null;
      if (next === activeDialog) return;
      if (!next) {
        document.documentElement.style.overflow = previousOverflow;
        activeDialog = null;
        returnFocus?.focus({ preventScroll: true });
        returnFocus = null;
        return;
      }
      if (!activeDialog) {
        returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        previousOverflow = document.documentElement.style.overflow;
        document.documentElement.style.overflow = "hidden";
      }
      activeDialog = next;
      if (!activeDialog.hasAttribute("tabindex")) activeDialog.tabIndex = -1;
      requestAnimationFrame(() => (focusables(activeDialog as HTMLElement)[0] || activeDialog)?.focus({ preventScroll: true }));
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (!activeDialog) return;
      if (event.key === "Escape") {
        const close = activeDialog.querySelector<HTMLButtonElement>('button[aria-label="Fermer"], button[aria-label^="Fermer "]');
        if (close) {
          event.preventDefault();
          close.click();
        }
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusables(activeDialog);
      if (!items.length) {
        event.preventDefault();
        activeDialog.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("keydown", onKeyDown);
    sync();
    return () => {
      observer.disconnect();
      document.removeEventListener("keydown", onKeyDown);
      document.documentElement.style.overflow = previousOverflow;
    };
  }, []);

  return null;
}

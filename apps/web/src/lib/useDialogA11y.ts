'use client';

// shared dialog behavior for every overlay (compose, sign-in, action sheet,
// comments, you-page sheets): focus moves in on open, Tab is trapped inside,
// Escape closes, and focus returns to the trigger on close. attach the
// returned ref to the dialog panel element.
import { useEffect, useRef } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// stack of open panels — only the top-most one handles Escape/Tab, so
// stacked overlays don't all close on a single Escape
const openPanels: HTMLElement[] = [];

export function useDialogA11y<T extends HTMLElement>(onClose: () => void) {
  const panelRef = useRef<T | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    openPanels.push(panel);

    const trigger =
      document.activeElement instanceof HTMLElement && document.activeElement !== document.body
        ? document.activeElement
        : null;

    // move focus in unless the dialog already focused something (autoFocus).
    // a [data-dialog-focus] element wins — destructive sheets point this at
    // their cancel button so Enter-Enter can't confirm by accident.
    if (!panel.contains(document.activeElement)) {
      const first =
        panel.querySelector<HTMLElement>('[data-dialog-focus]') ??
        panel.querySelector<HTMLElement>(FOCUSABLE);
      if (first) {
        first.focus();
      } else {
        panel.tabIndex = -1;
        panel.focus();
      }
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (openPanels[openPanels.length - 1] !== panel) return;
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) {
        e.preventDefault();
        return;
      }
      const active = document.activeElement;
      if (e.shiftKey) {
        if (active === first || !panel.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last || !panel.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      const i = openPanels.indexOf(panel);
      if (i !== -1) openPanels.splice(i, 1);
      trigger?.focus();
    };
  }, []);

  return panelRef;
}

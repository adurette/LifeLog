"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Native modal semantics keep background controls inert and contain keyboard focus. */
export function AppDialog({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    const heading = dialog.querySelector<HTMLElement>("h2");
    if (heading) { heading.id ||= `dialog-${crypto.randomUUID()}`; dialog.setAttribute("aria-labelledby", heading.id); }
    // Start at the title so opening a sheet doesn't immediately summon the keyboard.
    dialog.querySelector<HTMLElement>("h2")?.focus();
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      previous?.focus({ preventScroll: true });
    };
  }, []);
  return <dialog ref={ref} className="app-dialog" aria-label="Edit your record" onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => { if (event.target === event.currentTarget) { const bounds = event.currentTarget.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose(); } }}>{children}</dialog>;
}

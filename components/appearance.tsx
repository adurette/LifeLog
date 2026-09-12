"use client";

import { useSyncExternalStore } from "react";
import { Check, Palette } from "lucide-react";

const THEMES = [
  { id: "paper", name: "Paper", description: "Warm and familiar", color: "#f5f2ea" },
  { id: "ocean", name: "Ocean", description: "Cool and calm", color: "#edf4f8" },
  { id: "night", name: "Night", description: "Easy on the eyes", color: "#17211e" },
] as const;
const subscribe = (callback: () => void) => {
  window.addEventListener("lifelog-appearance", callback);
  return () => window.removeEventListener("lifelog-appearance", callback);
};
const snapshot = () => document.documentElement.dataset.theme ?? "paper";

export function AppearanceSettings() {
  const theme = useSyncExternalStore(subscribe, snapshot, () => "paper");
  const choose = (id: string) => {
    const selected = THEMES.find((item) => item.id === id)!;
    document.documentElement.setAttribute("data-theme", id);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", selected.color);
    try { localStorage.setItem("lifelog-theme", id); } catch { /* Theme still applies when storage is unavailable. */ }
    window.dispatchEvent(new Event("lifelog-appearance"));
  };
  return <section className="settings-card"><header><span><Palette size={20} /></span><div><h2>Appearance</h2><p>Choose a theme for this device.</p></div></header><div className="theme-options" role="group" aria-label="Color theme">{THEMES.map((item) => <button key={item.id} type="button" className="theme-option" aria-pressed={theme === item.id} onClick={() => choose(item.id)}><span className={`theme-preview ${item.id}`} aria-hidden="true"><i /><i /><i /></span><strong>{item.name}{theme === item.id && <Check size={16} />}</strong><small>{item.description}</small></button>)}</div></section>;
}


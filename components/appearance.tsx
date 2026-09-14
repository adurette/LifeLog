"use client";

import { useSyncExternalStore } from "react";
import { Check, Palette, Type } from "lucide-react";

const THEMES = [
  { id: "paper", name: "Paper", description: "Warm and familiar", color: "#f5f2ea" },
  { id: "ocean", name: "Ocean", description: "Cool and calm", color: "#edf4f8" },
  { id: "night", name: "Night", description: "Easy on the eyes", color: "#17211e" },
] as const;
const FONT_SIZES = [
  { id: "standard", name: "Standard", sample: "Aa", description: "16px base" },
  { id: "large", name: "Large", sample: "Aa", description: "18px base" },
  { id: "largest", name: "Largest", sample: "Aa", description: "20px base" },
] as const;
const subscribe = (callback: () => void) => {
  window.addEventListener("lifelog-appearance", callback);
  return () => window.removeEventListener("lifelog-appearance", callback);
};
const snapshot = () => document.documentElement.dataset.theme ?? "paper";
const fontSizeSnapshot = () => document.documentElement.dataset.fontSize ?? "standard";

export function AppearanceSettings() {
  const theme = useSyncExternalStore(subscribe, snapshot, () => "paper");
  const fontSize = useSyncExternalStore(subscribe, fontSizeSnapshot, () => "standard");
  const choose = (id: string) => {
    const selected = THEMES.find((item) => item.id === id)!;
    document.documentElement.setAttribute("data-theme", id);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", selected.color);
    try { localStorage.setItem("lifelog-theme", id); } catch { /* Theme still applies when storage is unavailable. */ }
    window.dispatchEvent(new Event("lifelog-appearance"));
  };
  const chooseFontSize = (id: string) => {
    document.documentElement.setAttribute("data-font-size", id);
    try { localStorage.setItem("lifelog-font-size", id); } catch { /* Size still applies when storage is unavailable. */ }
    window.dispatchEvent(new Event("lifelog-appearance"));
  };
  return <section className="settings-card appearance-settings"><header><span><Palette size={20} /></span><div><h2>Appearance</h2><p>Choose a theme and comfortable text size for this device.</p></div></header><div className="theme-options" role="group" aria-label="Color theme">{THEMES.map((item) => <button key={item.id} type="button" className="theme-option" aria-pressed={theme === item.id} onClick={() => choose(item.id)}><span className={`theme-preview ${item.id}`} aria-hidden="true"><i /><i /><i /></span><strong>{item.name}{theme === item.id && <Check size={16} />}</strong><small>{item.description}</small></button>)}</div><div className="font-size-setting"><div className="setting-label"><Type size={18} /><div><strong>Text size</strong><small>Applies throughout LifeLog.</small></div></div><div className="font-size-options" role="group" aria-label="Text size">{FONT_SIZES.map((item) => <button key={item.id} type="button" className={`font-size-option ${item.id}`} aria-pressed={fontSize === item.id} onClick={() => chooseFontSize(item.id)}><span aria-hidden="true">{item.sample}</span><strong>{item.name}</strong><small>{item.description}</small>{fontSize === item.id && <Check size={16} aria-hidden="true" />}</button>)}</div></div></section>;
}

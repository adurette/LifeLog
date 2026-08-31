"use client";

import { useEffect, useState } from "react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { get, set } from "idb-keyval";
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from "recharts";
import { AlertCircle, Archive, BarChart3, CalendarDays, Check, ChevronLeft, ChevronRight, CircleUserRound, Cloud, CloudOff, Coffee, Download, History, Home, LoaderCircle, LogOut, Menu, Pencil, Plus, RotateCcw, Settings2, ShieldCheck, SlidersHorizontal, Sparkles, Target, Trash2, X } from "lucide-react";
import { bucketSeries, compareSeries, dailySeries } from "@/lib/analytics";
import type { Granularity } from "@/lib/analytics";
import { seedData } from "@/lib/seed";
import { getSupabase } from "@/lib/supabase";
import { toCsv, toJson } from "@/lib/export";
import { queueAndSync, syncPending } from "@/lib/sync";
import type { Entry, EntryValue, LifeLogData, LoggingMode, Metric, MetricColor, MetricType, ScheduleType } from "@/lib/types";

type Tab = "today" | "history" | "metrics" | "insights" | "settings";
type SyncStatus = "local" | "syncing" | "synced" | "pending" | "error";
const STORE_KEY = "lifelog-v1";
const cloudStoreKey = (userId: string) => `lifelog-v1:${userId}`;
const COLORS: Record<MetricColor, string> = { sage: "#47715b", amber: "#b66b2c", blue: "#3f6f91", rose: "#a65364", violet: "#6e5a8a" };
const day = () => new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const prettyDate = (date: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(`${date}T12:00:00`));
function MetricGlyph({ metric, size = 19 }: { metric: Metric; size?: number }) { if (metric.id === "coffee") return <Coffee size={size} />; if (metric.type === "boolean") return <Target size={size} />; if (metric.type === "rating") return <Sparkles size={size} />; return <SlidersHorizontal size={size} />; }

function fromCloudMetric(row: Record<string, unknown>): Metric { return { id: String(row.id), name: String(row.name), description: row.description ? String(row.description) : undefined, type: row.type as MetricType, unit: row.unit ? String(row.unit) : undefined, loggingMode: row.logging_mode as LoggingMode, schedule: row.schedule as ScheduleType, weekdays: row.weekdays as number[] | undefined, color: row.color as MetricColor, ratingMin: row.rating_min as number | undefined, ratingMax: row.rating_max as number | undefined, options: row.options as string[] | undefined, aggregation: row.aggregation as Metric["aggregation"], archived: Boolean(row.archived_at) }; }
function fromCloudEntry(row: Record<string, unknown>): Entry { return { id: String(row.id), metricId: String(row.metric_id), value: row.value as EntryValue, occurredAt: String(row.occurred_at), localDate: String(row.local_date), timezone: String(row.timezone), note: row.note ? String(row.note) : undefined, synced: true }; }
function cloudMetric(metric: Metric, userId: string | null) { return { id: metric.id, user_id: userId, name: metric.name, description: metric.description, type: metric.type, unit: metric.unit, logging_mode: metric.loggingMode, schedule: metric.schedule, weekdays: metric.weekdays, color: metric.color, rating_min: metric.ratingMin, rating_max: metric.ratingMax, options: metric.options, aggregation: metric.aggregation, archived_at: metric.archived ? new Date().toISOString() : null }; }

function useLifeLog(userId: string | null) {
  const [data, setData] = useState<LifeLogData>(userId ? { metrics: [], entries: [] } : seedData);
  const [ready, setReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(userId ? "syncing" : "local");
  const [pendingCount, setPendingCount] = useState(0);
  const applySyncResult = (result: { pending: number; error: string | null }) => { setPendingCount(result.pending); setSyncStatus(result.error ? "error" : result.pending ? "pending" : "synced"); };
  const syncNow = async () => { if (!userId) return; setSyncStatus("syncing"); applySyncResult(await syncPending(userId)); };
  const send = (operation: Parameters<typeof queueAndSync>[1]) => { if (!userId) return; setSyncStatus("syncing"); void queueAndSync(userId, operation).then(applySyncResult); };
  useEffect(() => {
    const supabase = getSupabase();
    if (userId && supabase) get<LifeLogData>(cloudStoreKey(userId)).then((cached) => { if (cached) setData(cached); return syncPending(userId); }).then((result) => { applySyncResult(result); return Promise.all([supabase.from("metrics").select("*").order("created_at"), supabase.from("entries").select("*").order("local_date")]); }).then(([metricResult, entryResult]) => { if (!metricResult.error && !entryResult.error) setData({ metrics: (metricResult.data ?? []).map(fromCloudMetric), entries: (entryResult.data ?? []).map(fromCloudEntry) }); setReady(true); });
    else get<LifeLogData>(STORE_KEY).then((saved) => { if (saved) setData(saved); setReady(true); });
  }, [userId]);
  useEffect(() => { if (ready) void set(userId ? cloudStoreKey(userId) : STORE_KEY, data); }, [data, ready, userId]);

  const saveEntry = (metric: Metric, value: EntryValue, date = day()) => setData((current) => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const base: Entry = { id: crypto.randomUUID(), metricId: metric.id, value, occurredAt: new Date().toISOString(), localDate: date, timezone, synced: false };
    const entries = metric.loggingMode === "daily"
      ? [...current.entries.filter((entry) => !(entry.metricId === metric.id && entry.localDate === date)), base]
      : [...current.entries, base];
    send({ id: metric.loggingMode === "daily" ? `entry:${metric.id}:${date}` : `entry:${base.id}`, kind: "entry", payload: { id: base.id, user_id: userId, metric_id: metric.id, value, occurred_at: base.occurredAt, local_date: date, timezone, slot_key: metric.loggingMode === "daily" ? "daily" : base.id } });
    return { ...current, entries };
  });
  const updateEntry = (entry: Entry, value: EntryValue) => { const metric = data.metrics.find((item) => item.id === entry.metricId); if (!metric) return; const updated = { ...entry, value, synced: false }; setData((current) => ({ ...current, entries: current.entries.map((item) => item.id === entry.id ? updated : item) })); send({ id: `entry:${entry.id}`, kind: "entry", payload: { id: entry.id, user_id: userId, metric_id: entry.metricId, value, occurred_at: entry.occurredAt, local_date: entry.localDate, timezone: entry.timezone, slot_key: metric.loggingMode === "daily" ? "daily" : entry.id, note: entry.note } }); };
  const deleteEntry = (entry: Entry) => { setData((current) => ({ ...current, entries: current.entries.filter((item) => item.id !== entry.id) })); send({ id: `delete-entry:${entry.id}`, kind: "delete-entry", payload: { id: entry.id } }); };
  const addMetric = (metric: Metric) => { setData((current) => ({ ...current, metrics: [...current.metrics, metric] })); send({ id: `metric:${metric.id}`, kind: "metric", payload: cloudMetric(metric, userId) }); };
  const updateMetric = (metric: Metric) => { setData((current) => ({ ...current, metrics: current.metrics.map((item) => item.id === metric.id ? metric : item) })); send({ id: `metric:${metric.id}`, kind: "metric", payload: cloudMetric(metric, userId) }); };
  const archiveMetric = (id: string) => { const archivedAt = new Date().toISOString(); setData((current) => ({ ...current, metrics: current.metrics.map((metric) => metric.id === id ? { ...metric, archived: true } : metric) })); send({ id: `archive:${id}`, kind: "archive", payload: { id, archived_at: archivedAt } }); };
  const restoreMetric = (id: string) => { const metric = data.metrics.find((item) => item.id === id); if (metric) updateMetric({ ...metric, archived: false }); };
  return { data, saveEntry, updateEntry, deleteEntry, addMetric, updateMetric, archiveMetric, restoreMetric, ready, syncStatus, pendingCount, syncNow };
}

export function LifeLogApp() {
  const supabase = getSupabase();
  const [userId, setUserId] = useState<string | null | undefined>(supabase ? undefined : null);
  useEffect(() => { if (!supabase) return; void supabase.auth.getUser().then((response) => setUserId(response.data.user?.id ?? null)); const { data } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => setUserId(session?.user.id ?? null)); return () => data.subscription.unsubscribe(); }, [supabase]);
  if (supabase && userId === undefined) return <div className="auth-screen"><Brand /><p>Opening your private space…</p></div>;
  if (supabase && !userId) return <AuthScreen />;
  return <LifeLogWorkspace userId={userId ?? null} />;
}

function LifeLogWorkspace({ userId }: { userId: string | null }) {
  const { data, saveEntry, updateEntry, deleteEntry, addMetric, updateMetric, archiveMetric, restoreMetric, ready, syncStatus, pendingCount, syncNow } = useLifeLog(userId);
  const [tab, setTab] = useState<Tab>("today");
  const [showAdd, setShowAdd] = useState(false);
  const [editingMetric, setEditingMetric] = useState<Metric | null>(null);
  const [online, setOnline] = useState(() => typeof navigator === "undefined" ? true : navigator.onLine);
  useEffect(() => {
    const update = () => { setOnline(navigator.onLine); if (navigator.onLine && userId) void syncNow(); };
    window.addEventListener("online", update); window.addEventListener("offline", update);
    if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/sw.js");
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, [userId, syncNow]);

  const active = data.metrics.filter((metric) => !metric.archived);
  if (userId && ready && data.metrics.length === 0) return <Onboarding onFinish={(metrics, timezone) => { metrics.forEach(addMetric); void getSupabase()?.from("profiles").update({ timezone }).eq("id", userId); }} />;
  return (
    <div className="app-shell">
      <Sidebar tab={tab} setTab={setTab} online={online} syncStatus={syncStatus} pendingCount={pendingCount} onSync={syncNow} />
      <main className="main">
        <MobileHeader online={online} onSettings={() => setTab("settings")} />
        {tab === "today" && <Today metrics={active} entries={data.entries} onSave={saveEntry} onAdd={() => setShowAdd(true)} />}
        {tab === "history" && <HistoryView metrics={active} entries={data.entries} onAdd={saveEntry} onUpdate={updateEntry} onDelete={deleteEntry} />}
        {tab === "metrics" && <MetricsView metrics={data.metrics} entries={data.entries} onAdd={() => setShowAdd(true)} onEdit={setEditingMetric} onArchive={archiveMetric} onRestore={restoreMetric} />}
        {tab === "insights" && <Insights metrics={active} entries={data.entries} />}
        {tab === "settings" && <SettingsView data={data} userId={userId} />}
      </main>
      <BottomNav tab={tab} setTab={setTab} />
      {showAdd && <AddMetricModal onClose={() => setShowAdd(false)} onAdd={(metric) => { addMetric(metric); setShowAdd(false); }} />}
      {editingMetric && <AddMetricModal initial={editingMetric} onClose={() => setEditingMetric(null)} onAdd={(metric) => { updateMetric(metric); setEditingMetric(null); }} />}
    </div>
  );
}

function AuthScreen() {
  const [email, setEmail] = useState(""); const [sent, setSent] = useState(false);
  const signIn = async (event: React.FormEvent) => { event.preventDefault(); const supabase = getSupabase(); if (!supabase) return; const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } }); if (!error) setSent(true); };
  return <div className="auth-screen"><div className="auth-card"><Brand /><span className="eyebrow">Your private record</span><h1>Notice what shapes your days.</h1><p>Track what matters to you, then gently explore the patterns over time.</p>{sent ? <div className="email-sent"><Check size={18} />Check your email for your secure sign-in link.</div> : <form onSubmit={signIn}><label>Email address<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></label><button className="primary">Continue with email</button></form>}<small>Your data stays private to your account.</small></div></div>;
}

function Brand() { return <div className="brand"><span className="brand-mark"><span /></span><span>LifeLog</span></div>; }

function Sidebar({ tab, setTab, online, syncStatus, pendingCount, onSync }: { tab: Tab; setTab: (tab: Tab) => void; online: boolean; syncStatus: SyncStatus; pendingCount: number; onSync: () => void }) {
  const links: [Tab, typeof Home, string][] = [["today", Home, "Today"], ["history", History, "History"], ["metrics", SlidersHorizontal, "Metrics"], ["insights", BarChart3, "Insights"]];
  const label = syncStatus === "local" ? "Local demo data" : !online ? `${pendingCount || ""} pending offline`.trim() : syncStatus === "syncing" ? "Syncing…" : syncStatus === "error" ? "Sync needs attention" : syncStatus === "pending" ? `${pendingCount} pending` : "Synced";
  const Icon = syncStatus === "error" ? AlertCircle : !online ? CloudOff : syncStatus === "syncing" ? LoaderCircle : Cloud;
  return <aside className="sidebar"><Brand /><nav>{links.map(([id, NavIcon, label]) => <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}><NavIcon size={19} />{label}</button>)}</nav><div className="sidebar-foot"><button className={`sync-state ${syncStatus}`} onClick={onSync} disabled={!online || syncStatus === "local"}><Icon size={16} /><span>{label}</span></button><button className="profile" onClick={() => setTab("settings")}><span>AD</span><div><strong>Your account</strong><small>Private space</small></div><Settings2 size={17} /></button></div></aside>;
}

function MobileHeader({ online, onSettings }: { online: boolean; onSettings: () => void }) { return <header className="mobile-head"><Brand /><span className={`status-dot ${online ? "" : "offline"}`} title={online ? "Online" : "Offline"} /><button aria-label="Open settings" onClick={onSettings}><Menu size={22} /></button></header>; }
function BottomNav({ tab, setTab }: { tab: Tab; setTab: (tab: Tab) => void }) { const items: [Tab, typeof Home, string][] = [["today", Home, "Today"], ["history", History, "History"], ["metrics", SlidersHorizontal, "Metrics"], ["insights", BarChart3, "Insights"]]; return <nav className="bottom-nav">{items.map(([id, Icon, label]) => <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}><Icon size={20} /><span>{label}</span></button>)}</nav>; }

function PageHeader({ eyebrow, title, copy, action }: { eyebrow: string; title: string; copy: string; action?: React.ReactNode }) { return <div className="page-header"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{copy}</p></div>{action}</div>; }

function Today({ metrics, entries, onSave, onAdd }: { metrics: Metric[]; entries: Entry[]; onSave: (metric: Metric, value: EntryValue) => void; onAdd: () => void }) {
  const today = day();
  const weekday = new Date().getDay();
  const due = metrics.filter((metric) => metric.loggingMode === "daily" && (metric.schedule === "daily" || (metric.schedule === "weekdays" && metric.weekdays?.includes(weekday))));
  const events = metrics.filter((metric) => metric.loggingMode === "event");
  const done = due.filter((metric) => entries.some((entry) => entry.metricId === metric.id && entry.localDate === today)).length;
  return <div className="page"><PageHeader eyebrow={new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date())} title="How was your day?" copy="A minute of noticing adds up to a clearer picture." action={<button className="avatar-button" aria-label="Profile"><CircleUserRound size={25} /></button>} />
    <section className="progress-card"><div><span>Today’s check-in</span><strong>{done} of {due.length} complete</strong></div><div className="progress-track"><span style={{ width: `${due.length ? (done / due.length) * 100 : 0}%` }} /></div><span className="progress-number">{due.length ? Math.round(done / due.length * 100) : 0}%</span></section>
    <div className="section-heading"><div><h2>Daily check-in</h2><p>Your scheduled reflections for today.</p></div></div>
    <section className="metric-grid">{due.map((metric) => { const entry = entries.find((item) => item.metricId === metric.id && item.localDate === today); return <MetricCard key={`${metric.id}-${entry?.id ?? "empty"}`} metric={metric} entry={entry} onSave={onSave} />; })}</section>
    <div className="section-heading event-heading"><div><h2>Quick log</h2><p>Capture moments as they happen.</p></div><button className="text-button" onClick={onAdd}><Plus size={16} />New metric</button></div>
    <section className="quick-row">{events.map((metric) => <QuickLog key={metric.id} metric={metric} entries={entries.filter((entry) => entry.metricId === metric.id && entry.localDate === today)} onSave={onSave} />)}<button className="add-quick" onClick={onAdd}><Plus size={22} /><span>Add something</span></button></section>
  </div>;
}

function MetricCard({ metric, entry, onSave }: { metric: Metric; entry?: Entry; onSave: (metric: Metric, value: EntryValue) => void }) {
  const [value, setValue] = useState<EntryValue>(entry?.value ?? (metric.type === "boolean" ? false : metric.type === "rating" ? 5 : metric.type === "number" ? 0 : ""));
  const complete = Boolean(entry);
  return <article className={`metric-card ${complete ? "complete" : ""}`} style={{ "--metric": COLORS[metric.color] } as React.CSSProperties}><header><span className="metric-icon"><MetricGlyph metric={metric} /></span><div><h3>{metric.name}</h3><p>{metric.description}</p></div>{complete && <span className="check"><Check size={15} /></span>}</header>
    <div className="metric-control">
      {metric.type === "rating" && <div className="rating"><input aria-label={metric.name} type="range" min={metric.ratingMin ?? 1} max={metric.ratingMax ?? 10} value={Number(value)} onChange={(e) => setValue(Number(e.target.value))} /><div><span>{metric.ratingMin ?? 1}</span><strong>{value}<small>/ {metric.ratingMax ?? 10}</small></strong><span>{metric.ratingMax ?? 10}</span></div></div>}
      {metric.type === "boolean" && <div className="boolean"><button className={value === true ? "selected" : ""} onClick={() => setValue(true)}>Yes</button><button className={value === false && complete ? "selected" : ""} onClick={() => setValue(false)}>No</button></div>}
      {metric.type === "number" && <label className="number-input"><input aria-label={metric.name} type="number" value={String(value)} onChange={(e) => setValue(Number(e.target.value))} /><span>{metric.unit}</span></label>}
      {metric.type === "text" && <textarea aria-label={metric.name} value={String(value)} onChange={(e) => setValue(e.target.value)} placeholder="Write a short note…" />}
      {metric.type === "choice" && <select aria-label={metric.name} value={String(value)} onChange={(e) => setValue(e.target.value)}><option value="">Choose one…</option>{metric.options?.map((option) => <option key={option}>{option}</option>)}</select>}
    </div><button className="save-metric" onClick={() => onSave(metric, value)}>{complete ? "Update" : "Save check-in"}<ChevronRight size={16} /></button></article>;
}

function QuickLog({ metric, entries, onSave }: { metric: Metric; entries: Entry[]; onSave: (metric: Metric, value: EntryValue) => void }) { const [amount, setAmount] = useState(1); const total = entries.reduce((sum, entry) => sum + Number(entry.value), 0); return <article className="quick-card" style={{ "--metric": COLORS[metric.color] } as React.CSSProperties}><span className="quick-icon"><MetricGlyph metric={metric} size={21} /></span><div><strong>{metric.name}</strong><span>{total} {metric.unit} today</span></div><input aria-label={`${metric.name} amount`} type="number" step="any" value={amount} onChange={(event) => setAmount(Number(event.target.value))} /><button aria-label={`Log ${metric.name}`} onClick={() => onSave(metric, amount)}><Plus size={20} /></button></article>; }

function HistoryView({ metrics, entries, onAdd, onUpdate, onDelete }: { metrics: Metric[]; entries: Entry[]; onAdd: (metric: Metric, value: EntryValue, date?: string) => void; onUpdate: (entry: Entry, value: EntryValue) => void; onDelete: (entry: Entry) => void }) {
  const [editing, setEditing] = useState<{ entry: Entry; metric: Metric } | null>(null);
  const [adding, setAdding] = useState(false); const [metricFilter, setMetricFilter] = useState("all"); const [month, setMonth] = useState(day().slice(0, 7));
  const filtered = entries.filter((entry) => entry.localDate.startsWith(month) && (metricFilter === "all" || entry.metricId === metricFilter));
  const dates = [...new Set(filtered.map((entry) => entry.localDate))].sort().reverse();
  const moveMonth = (amount: number) => { const date = new Date(`${month}-15T12:00:00`); date.setMonth(date.getMonth() + amount); setMonth(date.toISOString().slice(0, 7)); };
  const monthLabel = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date(`${month}-15T12:00:00`));
  const remove = (entry: Entry, metric: Metric) => { if (window.confirm(`Delete this ${metric.name} entry?`)) onDelete(entry); };
  return <div className="page"><PageHeader eyebrow="Your record" title="History" copy="Look back without judgment. Every entry is context." action={<button className="primary" onClick={() => setAdding(true)}><Plus size={16} />Add past entry</button>} /><div className="history-toolbar"><div className="month-nav"><button aria-label="Previous month" onClick={() => moveMonth(-1)}><ChevronLeft size={17} /></button><strong>{monthLabel}</strong><button aria-label="Next month" onClick={() => moveMonth(1)} disabled={month >= day().slice(0, 7)}><ChevronRight size={17} /></button></div><label>Filter<span className="sr-only"> by metric</span><select value={metricFilter} onChange={(event) => setMetricFilter(event.target.value)}><option value="all">All metrics</option>{metrics.map((metric) => <option key={metric.id} value={metric.id}>{metric.name}</option>)}</select></label></div>{dates.length === 0 ? <div className="empty-state"><CalendarDays size={28} /><h2>No entries here yet</h2><p>Choose another month or add an entry for a day you missed.</p><button className="secondary" onClick={() => setAdding(true)}>Add an entry</button></div> : <section className="history-list">{dates.map((date) => <article key={date}><div className="history-date"><CalendarDays size={18} /><div><strong>{prettyDate(date)}</strong><span>{date === day() ? "Today" : new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date(`${date}T12:00:00`))}</span></div></div><div className="history-values">{filtered.filter((entry) => entry.localDate === date).map((entry) => { const metric = metrics.find((item) => item.id === entry.metricId); if (!metric) return null; return <div className="history-entry" key={entry.id}><div><i style={{ background: COLORS[metric.color] }} /><span>{metric.name}</span><strong>{typeof entry.value === "boolean" ? entry.value ? "Yes" : "No" : entry.value} {metric.unit}</strong></div><div className="history-entry-actions"><button aria-label={`Edit ${metric.name} entry`} onClick={() => setEditing({ entry, metric })}><Pencil size={14} /></button><button aria-label={`Delete ${metric.name} entry`} onClick={() => remove(entry, metric)}><Trash2 size={14} /></button></div></div>; })}</div></article>)}</section>}{editing && <EditEntryModal {...editing} onClose={() => setEditing(null)} onSave={(value) => { onUpdate(editing.entry, value); setEditing(null); }} />}{adding && <BackfillModal metrics={metrics} onClose={() => setAdding(false)} onSave={(metric, value, date) => { onAdd(metric, value, date); setMonth(date.slice(0, 7)); setAdding(false); }} />}</div>;
}

function EditEntryModal({ entry, metric, onClose, onSave }: { entry: Entry; metric: Metric; onClose: () => void; onSave: (value: EntryValue) => void }) {
  const [value, setValue] = useState<EntryValue>(entry.value);
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}><form className="modal entry-modal" onSubmit={(event) => { event.preventDefault(); onSave(value); }}><header><div><span className="eyebrow">{prettyDate(entry.localDate)}</span><h2>Edit {metric.name}</h2></div><button type="button" aria-label="Close" onClick={onClose}><X size={20} /></button></header><div className="metric-control">{metric.type === "rating" && <div className="rating"><input aria-label={metric.name} type="range" min={metric.ratingMin ?? 1} max={metric.ratingMax ?? 10} value={Number(value)} onChange={(event) => setValue(Number(event.target.value))} /><div><span>{metric.ratingMin ?? 1}</span><strong>{value}</strong><span>{metric.ratingMax ?? 10}</span></div></div>}{metric.type === "boolean" && <div className="boolean"><button type="button" className={value === true ? "selected" : ""} onClick={() => setValue(true)}>Yes</button><button type="button" className={value === false ? "selected" : ""} onClick={() => setValue(false)}>No</button></div>}{metric.type === "number" && <label className="number-input"><input aria-label={metric.name} type="number" value={String(value)} onChange={(event) => setValue(Number(event.target.value))} /><span>{metric.unit}</span></label>}{metric.type === "text" && <textarea aria-label={metric.name} value={String(value)} onChange={(event) => setValue(event.target.value)} />}{metric.type === "choice" && <select aria-label={metric.name} value={String(value)} onChange={(event) => setValue(event.target.value)}>{metric.options?.map((option) => <option key={option}>{option}</option>)}</select>}</div><footer><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary" type="submit">Save changes</button></footer></form></div>;
}

function BackfillModal({ metrics, onClose, onSave }: { metrics: Metric[]; onClose: () => void; onSave: (metric: Metric, value: EntryValue, date: string) => void }) {
  const [metricId, setMetricId] = useState(metrics[0]?.id ?? ""); const [date, setDate] = useState(day()); const metric = metrics.find((item) => item.id === metricId) ?? metrics[0]; const [value, setValue] = useState<EntryValue>(metric?.type === "boolean" ? false : metric?.type === "rating" ? 5 : metric?.type === "number" ? 0 : "");
  const chooseMetric = (id: string) => { const next = metrics.find((item) => item.id === id); setMetricId(id); setValue(next?.type === "boolean" ? false : next?.type === "rating" ? 5 : next?.type === "number" ? 0 : ""); };
  if (!metric) return null;
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}><form className="modal entry-modal" onSubmit={(event) => { event.preventDefault(); onSave(metric, value, date); }}><header><div><span className="eyebrow">Backfill your record</span><h2>Add a past entry</h2></div><button type="button" aria-label="Close" onClick={onClose}><X size={20} /></button></header><div className="form-row"><label>Metric<select value={metricId} onChange={(event) => chooseMetric(event.target.value)}>{metrics.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>Date<input required type="date" max={day()} value={date} onChange={(event) => setDate(event.target.value)} /></label></div><div className="metric-control">{metric.type === "rating" && <div className="rating"><input aria-label={metric.name} type="range" min={metric.ratingMin ?? 1} max={metric.ratingMax ?? 10} value={Number(value)} onChange={(event) => setValue(Number(event.target.value))} /><div><span>{metric.ratingMin ?? 1}</span><strong>{value}</strong><span>{metric.ratingMax ?? 10}</span></div></div>}{metric.type === "boolean" && <div className="boolean"><button type="button" className={value === true ? "selected" : ""} onClick={() => setValue(true)}>Yes</button><button type="button" className={value === false ? "selected" : ""} onClick={() => setValue(false)}>No</button></div>}{metric.type === "number" && <label className="number-input"><input aria-label={metric.name} type="number" step="any" value={String(value)} onChange={(event) => setValue(Number(event.target.value))} /><span>{metric.unit}</span></label>}{metric.type === "text" && <textarea required aria-label={metric.name} value={String(value)} onChange={(event) => setValue(event.target.value)} placeholder="Write a short note…" />}{metric.type === "choice" && <select aria-label={metric.name} value={String(value)} onChange={(event) => setValue(event.target.value)}><option value="">Choose one…</option>{metric.options?.map((option) => <option key={option}>{option}</option>)}</select>}</div><footer><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary" type="submit">Save entry</button></footer></form></div>;
}

function MetricsView({ metrics, entries, onAdd, onEdit, onArchive, onRestore }: { metrics: Metric[]; entries: Entry[]; onAdd: () => void; onEdit: (metric: Metric) => void; onArchive: (id: string) => void; onRestore: (id: string) => void }) {
  const active = metrics.filter((metric) => !metric.archived); const archived = metrics.filter((metric) => metric.archived);
  const rows = (items: Metric[], isArchived = false) => items.map((metric) => { const count = entries.filter((entry) => entry.metricId === metric.id).length; return <article key={metric.id}><span className="metric-icon" style={{ color: COLORS[metric.color], background: `${COLORS[metric.color]}18` }}><MetricGlyph metric={metric} size={20} /></span><div><strong>{metric.name}</strong><span>{metric.type.replace("_", " ")} · {metric.loggingMode} · {metric.schedule} · {count} entries</span></div><div className="manage-actions">{!isArchived && <button aria-label={`Edit ${metric.name}`} onClick={() => onEdit(metric)}><Pencil size={17} /></button>}<button aria-label={`${isArchived ? "Restore" : "Archive"} ${metric.name}`} onClick={() => isArchived ? onRestore(metric.id) : onArchive(metric.id)}>{isArchived ? <RotateCcw size={17} /> : <Archive size={17} />}</button></div></article>; });
  return <div className="page"><PageHeader eyebrow="Your practice" title="Things you track" copy="Keep only the questions that help you notice something useful." action={<button className="primary" onClick={onAdd}><Plus size={17} />Add metric</button>} /><section className="manage-list">{rows(active)}</section>{archived.length > 0 && <><div className="section-heading archived-heading"><div><h2>Archived</h2><p>Restore a metric without losing its history.</p></div></div><section className="manage-list archived-list">{rows(archived, true)}</section></>}</div>;
}

function Insights({ metrics, entries }: { metrics: Metric[]; entries: Entry[] }) {
  const comparable = metrics.filter((metric) => ["number", "rating", "boolean"].includes(metric.type));
  const [aId, setA] = useState(comparable[0]?.id ?? ""); const [bId, setB] = useState(comparable[1]?.id ?? "");
  const [range, setRange] = useState<"30" | "90" | "365" | "all">("30"); const [granularity, setGranularity] = useState<Granularity>("day");
  const a = metrics.find((metric) => metric.id === aId) ?? comparable[0]; const b = metrics.find((metric) => metric.id === bId) ?? comparable[1];
  const cutoff = range === "all" ? "0000-00-00" : (() => { const date = new Date(); date.setDate(date.getDate() - Number(range)); return date.toISOString().slice(0, 10); })();
  const rangedEntries = entries.filter((entry) => entry.localDate >= cutoff);
  const seriesA = a ? bucketSeries(a, dailySeries(a, rangedEntries), granularity) : []; const seriesB = b ? bucketSeries(b, dailySeries(b, rangedEntries), granularity) : [];
  const result = a && b ? compareSeries(seriesA, seriesB) : { points: [], correlation: null };
  const shownCorrelation = result.points.length >= 10 ? result.correlation : null;
  const strength = result.points.length < 10 ? "Keep logging to reveal a pattern" : shownCorrelation === null ? "Not enough variation" : Math.abs(shownCorrelation) > .7 ? "Strong pattern" : Math.abs(shownCorrelation) > .4 ? "Possible pattern" : "Little visible relationship";
  const availableDates = new Set([...seriesA.map((point) => point.date), ...seriesB.map((point) => point.date)]); const missingCount = availableDates.size - result.points.length;
  const chartDate = (value: string) => prettyDate(value.length === 7 ? `${value}-01` : value);
  return <div className="page"><PageHeader eyebrow="Explore gently" title="Insights" copy="Compare the signals in your life. Patterns are clues—not proof." />
    <div className="insight-toolbar"><div><span>Range</span>{(["30", "90", "365", "all"] as const).map((value) => <button className={range === value ? "selected" : ""} key={value} onClick={() => setRange(value)}>{value === "all" ? "All" : `${value}d`}</button>)}</div><div><span>Group by</span>{(["day", "week", "month"] as const).map((value) => <button className={granularity === value ? "selected" : ""} key={value} onClick={() => setGranularity(value)}>{value}</button>)}</div></div>
    <section className="insight-hero"><div className="compare-controls"><label>Compare<select value={aId} onChange={(e) => setA(e.target.value)}>{comparable.map((metric) => <option key={metric.id} value={metric.id}>{metric.name}</option>)}</select></label><span>with</span><label><span className="sr-only">Second metric</span><select value={bId} onChange={(e) => setB(e.target.value)}>{comparable.filter((metric) => metric.id !== aId).map((metric) => <option key={metric.id} value={metric.id}>{metric.name}</option>)}</select></label></div><div className="correlation"><span>Exploratory correlation</span><strong>{shownCorrelation === null ? "—" : shownCorrelation.toFixed(2)}</strong><em>{strength}</em><small>{result.points.length} matched {granularity === "day" ? "days" : `${granularity}s`} · Spearman rank</small></div></section>
    <section className="chart-grid"><article className="chart-card"><header><div><span>Trend</span><h2>{a?.name}</h2></div><span className="range-pill">{range === "all" ? "All data" : `${range} days`}</span></header><div className="chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={seriesA}><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#47715b" stopOpacity={.3}/><stop offset="100%" stopColor="#47715b" stopOpacity={0}/></linearGradient></defs><CartesianGrid vertical={false} stroke="#e5e0d5" /><XAxis dataKey="date" tickFormatter={chartDate} tickLine={false} axisLine={false} fontSize={11} /><YAxis tickLine={false} axisLine={false} fontSize={11} width={25} /><Tooltip labelFormatter={(label) => chartDate(String(label))} /><Area type="monotone" dataKey="value" stroke="#47715b" strokeWidth={2.5} fill="url(#area)" /></AreaChart></ResponsiveContainer></div></article>
      <article className="chart-card"><header><div><span>Shared timeline</span><h2>{a?.name} & {b?.name}</h2></div></header><div className="chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={result.points}><CartesianGrid vertical={false} stroke="#e5e0d5" /><XAxis dataKey="date" tickFormatter={chartDate} tickLine={false} axisLine={false} fontSize={11} /><YAxis yAxisId="left" hide domain={["auto", "auto"]} /><YAxis yAxisId="right" hide orientation="right" domain={["auto", "auto"]} /><Tooltip labelFormatter={(label) => chartDate(String(label))} /><Line yAxisId="left" type="monotone" dataKey="x" name={a?.name} stroke="#47715b" strokeWidth={2.5} dot={false} /><Line yAxisId="right" type="monotone" dataKey="y" name={b?.name} stroke="#b66b2c" strokeWidth={2.5} dot={false} /></LineChart></ResponsiveContainer></div></article>
      <article className="chart-card scatter-card"><header><div><span>Relationship</span><h2>{a?.name} vs. {b?.name}</h2></div></header><div className="chart"><ResponsiveContainer width="100%" height="100%"><ScatterChart margin={{ bottom: 8, left: 0 }}><CartesianGrid stroke="#e5e0d5" /><XAxis type="number" dataKey="x" name={a?.name} tickLine={false} fontSize={11} /><YAxis type="number" dataKey="y" name={b?.name} tickLine={false} fontSize={11} /><ZAxis range={[55, 55]} /><Tooltip cursor={{ strokeDasharray: "3 3" }} /><Scatter data={result.points} fill="#47715b" /></ScatterChart></ResponsiveContainer></div></article>
      <article className="chart-card data-note"><Sparkles size={20} /><div><h2>How this comparison works</h2><p>LifeLog matched {result.points.length} {granularity === "day" ? "days" : `${granularity}s`} where both metrics had data. {missingCount > 0 ? `${missingCount} unmatched periods were excluded rather than treated as zero.` : "No missing periods were treated as zero."}</p><p>Correlation appears after 10 matched periods and describes association—not cause.</p></div></article></section>
    <p className="insight-note"><Sparkles size={16} />A relationship can be influenced by routines, timing, or other factors. Use this as a prompt for reflection, not a causal conclusion.</p>
  </div>;
}

function downloadFile(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a"); link.href = url; link.download = name; link.click();
  URL.revokeObjectURL(url);
}

interface InstallPromptEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> }
function urlBase64ToUint8Array(value: string) { const padding = "=".repeat((4 - value.length % 4) % 4); const base64 = (value + padding).replaceAll("-", "+").replaceAll("_", "/"); return Uint8Array.from(window.atob(base64), (character) => character.charCodeAt(0)); }

function ReminderSettings({ userId }: { userId: string }) {
  const supported = typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
  const [subscription, setSubscription] = useState<PushSubscription | null>(null); const [time, setTime] = useState("20:00"); const [error, setError] = useState(""); const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  useEffect(() => { if (!supported) return; void navigator.serviceWorker.ready.then(async (registration) => { setSubscription(await registration.pushManager.getSubscription()); const supabase = getSupabase(); if (supabase) { const { data } = await supabase.from("profiles").select("reminder_time").eq("id", userId).single(); if (data?.reminder_time) setTime(String(data.reminder_time).slice(0, 5)); } }); }, [supported, userId]);
  useEffect(() => { const capture = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPromptEvent); }; window.addEventListener("beforeinstallprompt", capture); return () => window.removeEventListener("beforeinstallprompt", capture); }, []);
  const enable = async () => { setError(""); const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY; if (!key) { setError("Add the VAPID public key before enabling reminders."); return; } const permission = await Notification.requestPermission(); if (permission !== "granted") { setError("Notification permission was not granted."); return; } const registration = await navigator.serviceWorker.ready; const next = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) }); const json = next.toJSON(); if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) return; const supabase = getSupabase(); const { error: saveError } = await supabase!.from("push_subscriptions").upsert({ user_id: userId, endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth }, { onConflict: "endpoint" }); if (saveError) { setError(saveError.message); return; } await supabase!.from("profiles").update({ reminders_enabled: true, reminder_time: time }).eq("id", userId); setSubscription(next); };
  const disable = async () => { const endpoint = subscription?.endpoint; await subscription?.unsubscribe(); const supabase = getSupabase(); if (endpoint) await supabase?.from("push_subscriptions").delete().eq("endpoint", endpoint); await supabase?.from("profiles").update({ reminders_enabled: false }).eq("id", userId); setSubscription(null); };
  const saveTime = async (value: string) => { setTime(value); await getSupabase()?.from("profiles").update({ reminder_time: value }).eq("id", userId); };
  const test = async () => { const registration = await navigator.serviceWorker.ready; await registration.showNotification("LifeLog reminders are ready", { body: "Your daily reflection reminder will appear like this.", icon: "/icon-192.png" }); };
  return <><section className="settings-card"><header><span><Download size={20} /></span><div><h2>Install LifeLog</h2><p>Add it to your home screen for an app-like experience and iPhone notifications.</p></div></header><div className="settings-actions">{installPrompt ? <button className="primary" onClick={async () => { await installPrompt.prompt(); setInstallPrompt(null); }}>Install app</button> : <span className="settings-hint">On iPhone: tap Share, then “Add to Home Screen.”</span>}</div></section><section className="settings-card"><header><span><CalendarDays size={20} /></span><div><h2>Daily reminder</h2><p>Receive a private prompt to complete your check-in.</p></div></header>{supported ? <div className="reminder-controls"><label>Reminder time<input type="time" step="900" value={time} onChange={(event) => void saveTime(event.target.value)} /></label><div className="settings-actions">{subscription ? <><button className="secondary" onClick={test}>Send test</button><button className="danger" onClick={disable}>Turn off</button></> : <button className="primary" onClick={enable}>Enable reminders</button>}</div>{error && <p className="setting-error">{error}</p>}</div> : <p className="settings-hint">Install LifeLog and use a supported browser to enable reminders.</p>}</section></>;
}

function SettingsView({ data, userId }: { data: LifeLogData; userId: string | null }) {
  const cloudEnabled = Boolean(userId);
  const exportDate = day();
  const signOut = async () => { await getSupabase()?.auth.signOut(); };
  const deleteAccount = async () => {
    if (!window.confirm("Permanently delete your account and all LifeLog data? This cannot be undone.")) return;
    const supabase = getSupabase(); if (!supabase) return;
    const { error } = await supabase.rpc("delete_my_account");
    if (!error) await supabase.auth.signOut();
  };
  const resetDemo = async () => { if (!window.confirm("Reset all local demo data?")) return; await set(STORE_KEY, seedData); window.location.reload(); };
  return <div className="page settings-page"><PageHeader eyebrow="Your space" title="Settings" copy="Manage your private data and account." />
    <section className="settings-card"><header><span><ShieldCheck size={20} /></span><div><h2>Data and privacy</h2><p>{cloudEnabled ? "Your records are protected by account-level database policies." : "Demo records are stored only in this browser."}</p></div></header><div className="settings-stats"><div><strong>{data.metrics.filter((metric) => !metric.archived).length}</strong><span>Active metrics</span></div><div><strong>{data.entries.length}</strong><span>Total entries</span></div></div></section>
    {userId && <ReminderSettings userId={userId} />}
    <section className="settings-card"><header><span><Download size={20} /></span><div><h2>Export your data</h2><p>Download a portable copy whenever you want.</p></div></header><div className="settings-actions"><button className="secondary" onClick={() => downloadFile(`lifelog-${exportDate}.csv`, toCsv(data), "text/csv")}>Download CSV</button><button className="secondary" onClick={() => downloadFile(`lifelog-${exportDate}.json`, toJson(data), "application/json")}>Download JSON</button></div></section>
    <section className="settings-card"><header><span><CircleUserRound size={20} /></span><div><h2>{cloudEnabled ? "Account" : "Demo mode"}</h2><p>{cloudEnabled ? "Sign out on this device or permanently remove your account." : "Connect Supabase to enable private cloud accounts."}</p></div></header><div className="settings-actions">{cloudEnabled ? <><button className="secondary" onClick={signOut}><LogOut size={16} />Sign out</button><button className="danger" onClick={deleteAccount}><Trash2 size={16} />Delete account</button></> : <button className="danger" onClick={resetDemo}><Trash2 size={16} />Reset demo data</button>}</div></section>
  </div>;
}

const STARTERS: Omit<Metric, "id">[] = [
  { name: "Hours of sleep", description: "How long did you sleep?", type: "number", unit: "hours", loggingMode: "daily", schedule: "daily", color: "violet" },
  { name: "Mood", description: "How are you feeling overall?", type: "rating", loggingMode: "daily", schedule: "daily", color: "sage", ratingMin: 1, ratingMax: 10 },
  { name: "Coffee", description: "Log each cup as it happens", type: "number", unit: "cups", loggingMode: "event", schedule: "flexible", color: "amber", aggregation: "sum" },
  { name: "Meditated", description: "Did you meditate today?", type: "boolean", loggingMode: "daily", schedule: "daily", color: "blue" },
  { name: "Daily note", description: "Anything worth remembering", type: "text", loggingMode: "daily", schedule: "daily", color: "rose" },
];

function Onboarding({ onFinish }: { onFinish: (metrics: Metric[], timezone: string) => void }) {
  const [selected, setSelected] = useState([0, 1, 2]); const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const toggle = (index: number) => setSelected((current) => current.includes(index) ? current.filter((item) => item !== index) : [...current, index]);
  return <main className="onboarding"><div className="onboarding-card"><Brand /><span className="eyebrow">Welcome to your LifeLog</span><h1>Start with a few useful questions.</h1><p>You can change these or create anything else later.</p><div className="starter-grid">{STARTERS.map((metric, index) => <button key={metric.name} className={selected.includes(index) ? "selected" : ""} onClick={() => toggle(index)}><span className="metric-icon" style={{ color: COLORS[metric.color], background: `${COLORS[metric.color]}18` }}><MetricGlyph metric={{ ...metric, id: String(index) }} /></span><span><strong>{metric.name}</strong><small>{metric.description}</small></span>{selected.includes(index) && <Check size={16} />}</button>)}</div><label className="timezone-field">Your timezone<select value={timezone} onChange={(event) => setTimezone(event.target.value)}><option>{timezone}</option><option>America/New_York</option><option>America/Chicago</option><option>America/Denver</option><option>America/Los_Angeles</option><option>UTC</option></select></label><button className="primary onboarding-continue" disabled={selected.length === 0} onClick={() => onFinish(selected.map((index) => ({ ...STARTERS[index], id: crypto.randomUUID() })), timezone)}>Start my first check-in<ChevronRight size={17} /></button></div></main>;
}

function AddMetricModal({ initial, onClose, onAdd }: { initial?: Metric; onClose: () => void; onAdd: (metric: Metric) => void }) {
  const [name, setName] = useState(initial?.name ?? ""); const [description, setDescription] = useState(initial?.description ?? ""); const [type, setType] = useState<MetricType>(initial?.type ?? "number"); const [mode, setMode] = useState<LoggingMode>(initial?.loggingMode ?? "daily"); const [schedule, setSchedule] = useState<ScheduleType>(initial?.schedule ?? "daily"); const [unit, setUnit] = useState(initial?.unit ?? ""); const [options, setOptions] = useState(initial?.options?.join(", ") ?? ""); const [color, setColor] = useState<MetricColor>(initial?.color ?? "sage"); const [ratingMin, setRatingMin] = useState(initial?.ratingMin ?? 1); const [ratingMax, setRatingMax] = useState(initial?.ratingMax ?? 10); const [aggregation, setAggregation] = useState<Metric["aggregation"]>(initial?.aggregation ?? "sum"); const [weekdays, setWeekdays] = useState(initial?.weekdays ?? [1, 2, 3, 4, 5]);
  const submit = (event: React.FormEvent) => { event.preventDefault(); const choiceOptions = options.split(",").map((value) => value.trim()).filter(Boolean); if (!name.trim() || (type === "choice" && choiceOptions.length < 2) || ratingMax <= ratingMin) return; onAdd({ id: initial?.id ?? crypto.randomUUID(), name: name.trim(), description: description.trim() || undefined, type, unit: unit.trim() || undefined, loggingMode: mode, schedule, weekdays: schedule === "weekdays" ? weekdays : undefined, color, ratingMin: type === "rating" ? ratingMin : undefined, ratingMax: type === "rating" ? ratingMax : undefined, options: type === "choice" ? choiceOptions : undefined, aggregation: mode === "event" ? aggregation : undefined, archived: initial?.archived }); };
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}><form className="modal metric-form" onSubmit={submit}><header><div><span className="eyebrow">{initial ? "Metric settings" : "New question"}</span><h2>{initial ? `Edit ${initial.name}` : "What would you like to notice?"}</h2></div><button type="button" aria-label="Close" onClick={onClose}><X size={20} /></button></header><label>Name<input autoFocus required value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Hours of sleep" /></label><label>Description <span>(optional)</span><input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="A short prompt or reminder" /></label><div className="form-row"><label>Answer type<select disabled={Boolean(initial)} value={type} onChange={(event) => { const nextType = event.target.value as MetricType; setType(nextType); if (nextType !== "number") setMode("daily"); }}><option value="number">Number</option><option value="rating">Rating scale</option><option value="boolean">Yes / no</option><option value="choice">Single choice</option><option value="text">Text</option></select></label><label>Logging style<select disabled={Boolean(initial)} value={mode} onChange={(event) => setMode(event.target.value as LoggingMode)}><option value="daily">Once per day</option>{type === "number" && <option value="event">Multiple events</option>}</select></label></div>{type === "number" && <label>Unit <span>(optional)</span><input value={unit} onChange={(event) => setUnit(event.target.value)} placeholder="cups, hours, miles…" /></label>}{type === "rating" && <div className="form-row"><label>Minimum<input type="number" value={ratingMin} onChange={(event) => setRatingMin(Number(event.target.value))} /></label><label>Maximum<input type="number" value={ratingMax} onChange={(event) => setRatingMax(Number(event.target.value))} /></label></div>}{type === "choice" && <label>Choices <span>(at least two, comma separated)</span><input required value={options} onChange={(event) => setOptions(event.target.value)} placeholder="Great, okay, difficult" /></label>}{mode === "event" && <label>Daily summary<select value={aggregation} onChange={(event) => setAggregation(event.target.value as Metric["aggregation"])}><option value="sum">Total</option><option value="count">Number of entries</option><option value="average">Average</option></select></label>}<label>Schedule<select value={schedule} onChange={(event) => setSchedule(event.target.value as ScheduleType)}><option value="daily">Every day</option><option value="weekdays">Selected weekdays</option><option value="flexible">No schedule</option></select></label>{schedule === "weekdays" && <div className="weekday-picker">{["S", "M", "T", "W", "T", "F", "S"].map((label, index) => <button type="button" key={`${label}-${index}`} className={weekdays.includes(index) ? "selected" : ""} onClick={() => setWeekdays((current) => current.includes(index) ? current.filter((day) => day !== index) : [...current, index])}>{label}</button>)}</div>}<fieldset className="color-picker"><legend>Color</legend>{(Object.keys(COLORS) as MetricColor[]).map((option) => <button type="button" aria-label={option} key={option} className={color === option ? "selected" : ""} style={{ background: COLORS[option] }} onClick={() => setColor(option)} />)}</fieldset><footer><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary" type="submit">{initial ? "Save changes" : "Create metric"}</button></footer></form></div>;
}

"use client";

import { useEffect, useState } from "react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { get, set } from "idb-keyval";
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertCircle, Archive, BarChart3, CalendarDays, Check, ChevronRight, CircleUserRound, Cloud, CloudOff, Coffee, Download, History, Home, LoaderCircle, LogOut, Menu, Pencil, Plus, Settings2, ShieldCheck, SlidersHorizontal, Sparkles, Target, Trash2, X } from "lucide-react";
import { comparison, dailySeries } from "@/lib/analytics";
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
    if (userId && supabase) get<LifeLogData>(cloudStoreKey(userId)).then((cached) => { if (cached) setData(cached); return syncPending(userId); }).then((result) => { applySyncResult(result); return Promise.all([supabase.from("metrics").select("*").is("archived_at", null).order("created_at"), supabase.from("entries").select("*").order("local_date")]); }).then(([metricResult, entryResult]) => { if (!metricResult.error && !entryResult.error) setData({ metrics: (metricResult.data ?? []).map(fromCloudMetric), entries: (entryResult.data ?? []).map(fromCloudEntry) }); setReady(true); });
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
  const addMetric = (metric: Metric) => { setData((current) => ({ ...current, metrics: [...current.metrics, metric] })); send({ id: `metric:${metric.id}`, kind: "metric", payload: { id: metric.id, user_id: userId, name: metric.name, description: metric.description, type: metric.type, unit: metric.unit, logging_mode: metric.loggingMode, schedule: metric.schedule, weekdays: metric.weekdays, color: metric.color, rating_min: metric.ratingMin, rating_max: metric.ratingMax, options: metric.options, aggregation: metric.aggregation } }); };
  const archiveMetric = (id: string) => { const archivedAt = new Date().toISOString(); setData((current) => ({ ...current, metrics: current.metrics.map((metric) => metric.id === id ? { ...metric, archived: true } : metric) })); send({ id: `archive:${id}`, kind: "archive", payload: { id, archived_at: archivedAt } }); };
  return { data, saveEntry, updateEntry, deleteEntry, addMetric, archiveMetric, ready, syncStatus, pendingCount, syncNow };
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
  const { data, saveEntry, updateEntry, deleteEntry, addMetric, archiveMetric, syncStatus, pendingCount, syncNow } = useLifeLog(userId);
  const [tab, setTab] = useState<Tab>("today");
  const [showAdd, setShowAdd] = useState(false);
  const [online, setOnline] = useState(() => typeof navigator === "undefined" ? true : navigator.onLine);
  useEffect(() => {
    const update = () => { setOnline(navigator.onLine); if (navigator.onLine && userId) void syncNow(); };
    window.addEventListener("online", update); window.addEventListener("offline", update);
    if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/sw.js");
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, [userId, syncNow]);

  const active = data.metrics.filter((metric) => !metric.archived);
  return (
    <div className="app-shell">
      <Sidebar tab={tab} setTab={setTab} online={online} syncStatus={syncStatus} pendingCount={pendingCount} onSync={syncNow} />
      <main className="main">
        <MobileHeader online={online} onSettings={() => setTab("settings")} />
        {tab === "today" && <Today metrics={active} entries={data.entries} onSave={saveEntry} onAdd={() => setShowAdd(true)} />}
        {tab === "history" && <HistoryView metrics={active} entries={data.entries} onUpdate={updateEntry} onDelete={deleteEntry} />}
        {tab === "metrics" && <MetricsView metrics={active} entries={data.entries} onAdd={() => setShowAdd(true)} onArchive={archiveMetric} />}
        {tab === "insights" && <Insights metrics={active} entries={data.entries} />}
        {tab === "settings" && <SettingsView data={data} cloudEnabled={Boolean(userId)} />}
      </main>
      <BottomNav tab={tab} setTab={setTab} />
      {showAdd && <AddMetricModal onClose={() => setShowAdd(false)} onAdd={(metric) => { addMetric(metric); setShowAdd(false); }} />}
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

function QuickLog({ metric, entries, onSave }: { metric: Metric; entries: Entry[]; onSave: (metric: Metric, value: EntryValue) => void }) { const total = entries.reduce((sum, entry) => sum + Number(entry.value), 0); return <article className="quick-card" style={{ "--metric": COLORS[metric.color] } as React.CSSProperties}><span className="quick-icon"><MetricGlyph metric={metric} size={21} /></span><div><strong>{metric.name}</strong><span>{total} {metric.unit} today</span></div><button aria-label={`Add ${metric.name}`} onClick={() => onSave(metric, 1)}><Plus size={20} /></button></article>; }

function HistoryView({ metrics, entries, onUpdate, onDelete }: { metrics: Metric[]; entries: Entry[]; onUpdate: (entry: Entry, value: EntryValue) => void; onDelete: (entry: Entry) => void }) {
  const [editing, setEditing] = useState<{ entry: Entry; metric: Metric } | null>(null);
  const dates = [...new Set(entries.map((entry) => entry.localDate))].sort().reverse();
  const remove = (entry: Entry, metric: Metric) => { if (window.confirm(`Delete this ${metric.name} entry?`)) onDelete(entry); };
  return <div className="page"><PageHeader eyebrow="Your record" title="History" copy="Look back without judgment. Every entry is context." /><section className="history-list">{dates.map((date) => <article key={date}><div className="history-date"><CalendarDays size={18} /><div><strong>{prettyDate(date)}</strong><span>{date === day() ? "Today" : new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date(`${date}T12:00:00`))}</span></div></div><div className="history-values">{entries.filter((entry) => entry.localDate === date).map((entry) => { const metric = metrics.find((item) => item.id === entry.metricId); if (!metric) return null; return <div className="history-entry" key={entry.id}><div><i style={{ background: COLORS[metric.color] }} /><span>{metric.name}</span><strong>{typeof entry.value === "boolean" ? entry.value ? "Yes" : "No" : entry.value} {metric.unit}</strong></div><div className="history-entry-actions"><button aria-label={`Edit ${metric.name} entry`} onClick={() => setEditing({ entry, metric })}><Pencil size={14} /></button><button aria-label={`Delete ${metric.name} entry`} onClick={() => remove(entry, metric)}><Trash2 size={14} /></button></div></div>; })}</div></article>)}</section>{editing && <EditEntryModal {...editing} onClose={() => setEditing(null)} onSave={(value) => { onUpdate(editing.entry, value); setEditing(null); }} />}</div>;
}

function EditEntryModal({ entry, metric, onClose, onSave }: { entry: Entry; metric: Metric; onClose: () => void; onSave: (value: EntryValue) => void }) {
  const [value, setValue] = useState<EntryValue>(entry.value);
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}><form className="modal entry-modal" onSubmit={(event) => { event.preventDefault(); onSave(value); }}><header><div><span className="eyebrow">{prettyDate(entry.localDate)}</span><h2>Edit {metric.name}</h2></div><button type="button" aria-label="Close" onClick={onClose}><X size={20} /></button></header><div className="metric-control">{metric.type === "rating" && <div className="rating"><input aria-label={metric.name} type="range" min={metric.ratingMin ?? 1} max={metric.ratingMax ?? 10} value={Number(value)} onChange={(event) => setValue(Number(event.target.value))} /><div><span>{metric.ratingMin ?? 1}</span><strong>{value}</strong><span>{metric.ratingMax ?? 10}</span></div></div>}{metric.type === "boolean" && <div className="boolean"><button type="button" className={value === true ? "selected" : ""} onClick={() => setValue(true)}>Yes</button><button type="button" className={value === false ? "selected" : ""} onClick={() => setValue(false)}>No</button></div>}{metric.type === "number" && <label className="number-input"><input aria-label={metric.name} type="number" value={String(value)} onChange={(event) => setValue(Number(event.target.value))} /><span>{metric.unit}</span></label>}{metric.type === "text" && <textarea aria-label={metric.name} value={String(value)} onChange={(event) => setValue(event.target.value)} />}{metric.type === "choice" && <select aria-label={metric.name} value={String(value)} onChange={(event) => setValue(event.target.value)}>{metric.options?.map((option) => <option key={option}>{option}</option>)}</select>}</div><footer><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary" type="submit">Save changes</button></footer></form></div>;
}

function MetricsView({ metrics, entries, onAdd, onArchive }: { metrics: Metric[]; entries: Entry[]; onAdd: () => void; onArchive: (id: string) => void }) { return <div className="page"><PageHeader eyebrow="Your practice" title="Things you track" copy="Keep only the questions that help you notice something useful." action={<button className="primary" onClick={onAdd}><Plus size={17} />Add metric</button>} /><section className="manage-list">{metrics.map((metric) => { const count = entries.filter((entry) => entry.metricId === metric.id).length; return <article key={metric.id}><span className="metric-icon" style={{ color: COLORS[metric.color], background: `${COLORS[metric.color]}18` }}><MetricGlyph metric={metric} size={20} /></span><div><strong>{metric.name}</strong><span>{metric.type.replace("_", " ")} · {metric.loggingMode} · {count} entries</span></div><button aria-label={`Archive ${metric.name}`} onClick={() => onArchive(metric.id)}><Archive size={18} /></button></article>; })}</section></div>; }

function Insights({ metrics, entries }: { metrics: Metric[]; entries: Entry[] }) {
  const comparable = metrics.filter((metric) => ["number", "rating", "boolean"].includes(metric.type));
  const [aId, setA] = useState(comparable[0]?.id ?? ""); const [bId, setB] = useState(comparable[1]?.id ?? "");
  const a = metrics.find((metric) => metric.id === aId) ?? comparable[0]; const b = metrics.find((metric) => metric.id === bId) ?? comparable[1];
  const result = a && b ? comparison(a, b, entries) : { points: [], correlation: null };
  const trend = a ? dailySeries(a, entries).slice(-14) : [];
  const strength = result.correlation === null ? "Not enough variation" : Math.abs(result.correlation) > .7 ? "Strong pattern" : Math.abs(result.correlation) > .4 ? "Possible pattern" : "Little visible relationship";
  return <div className="page"><PageHeader eyebrow="Explore gently" title="Insights" copy="Compare the signals in your life. Patterns are clues—not proof." />
    <section className="insight-hero"><div className="compare-controls"><label>Compare<select value={aId} onChange={(e) => setA(e.target.value)}>{comparable.map((metric) => <option key={metric.id} value={metric.id}>{metric.name}</option>)}</select></label><span>with</span><label><span className="sr-only">Second metric</span><select value={bId} onChange={(e) => setB(e.target.value)}>{comparable.filter((metric) => metric.id !== aId).map((metric) => <option key={metric.id} value={metric.id}>{metric.name}</option>)}</select></label></div><div className="correlation"><span>Exploratory correlation</span><strong>{result.correlation === null ? "—" : result.correlation.toFixed(2)}</strong><em>{strength}</em><small>{result.points.length} matched days · Spearman rank</small></div></section>
    <section className="chart-grid"><article className="chart-card"><header><div><span>Recent trend</span><h2>{a?.name}</h2></div><span className="range-pill">14 days</span></header><div className="chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={trend}><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#47715b" stopOpacity={.3}/><stop offset="100%" stopColor="#47715b" stopOpacity={0}/></linearGradient></defs><CartesianGrid vertical={false} stroke="#e5e0d5" /><XAxis dataKey="date" tickFormatter={prettyDate} tickLine={false} axisLine={false} fontSize={11} /><YAxis tickLine={false} axisLine={false} fontSize={11} width={25} /><Tooltip labelFormatter={(label) => prettyDate(String(label))} /><Area type="monotone" dataKey="value" stroke="#47715b" strokeWidth={2.5} fill="url(#area)" /></AreaChart></ResponsiveContainer></div></article>
      <article className="chart-card"><header><div><span>Shared days</span><h2>{a?.name} & {b?.name}</h2></div></header><div className="chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={result.points}><CartesianGrid vertical={false} stroke="#e5e0d5" /><XAxis dataKey="date" tickFormatter={prettyDate} tickLine={false} axisLine={false} fontSize={11} /><YAxis yAxisId="left" hide domain={["auto", "auto"]} /><YAxis yAxisId="right" hide orientation="right" domain={["auto", "auto"]} /><Tooltip labelFormatter={(label) => prettyDate(String(label))} /><Line yAxisId="left" type="monotone" dataKey="x" name={a?.name} stroke="#47715b" strokeWidth={2.5} dot={false} /><Line yAxisId="right" type="monotone" dataKey="y" name={b?.name} stroke="#b66b2c" strokeWidth={2.5} dot={false} /></LineChart></ResponsiveContainer></div></article></section>
    <p className="insight-note"><Sparkles size={16} />A relationship can be influenced by routines, timing, or other factors. Use this as a prompt for reflection, not a causal conclusion.</p>
  </div>;
}

function downloadFile(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a"); link.href = url; link.download = name; link.click();
  URL.revokeObjectURL(url);
}

function SettingsView({ data, cloudEnabled }: { data: LifeLogData; cloudEnabled: boolean }) {
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
    <section className="settings-card"><header><span><Download size={20} /></span><div><h2>Export your data</h2><p>Download a portable copy whenever you want.</p></div></header><div className="settings-actions"><button className="secondary" onClick={() => downloadFile(`lifelog-${exportDate}.csv`, toCsv(data), "text/csv")}>Download CSV</button><button className="secondary" onClick={() => downloadFile(`lifelog-${exportDate}.json`, toJson(data), "application/json")}>Download JSON</button></div></section>
    <section className="settings-card"><header><span><CircleUserRound size={20} /></span><div><h2>{cloudEnabled ? "Account" : "Demo mode"}</h2><p>{cloudEnabled ? "Sign out on this device or permanently remove your account." : "Connect Supabase to enable private cloud accounts."}</p></div></header><div className="settings-actions">{cloudEnabled ? <><button className="secondary" onClick={signOut}><LogOut size={16} />Sign out</button><button className="danger" onClick={deleteAccount}><Trash2 size={16} />Delete account</button></> : <button className="danger" onClick={resetDemo}><Trash2 size={16} />Reset demo data</button>}</div></section>
  </div>;
}

function AddMetricModal({ onClose, onAdd }: { onClose: () => void; onAdd: (metric: Metric) => void }) {
  const [name, setName] = useState(""); const [type, setType] = useState<MetricType>("number"); const [mode, setMode] = useState<LoggingMode>("daily"); const [schedule, setSchedule] = useState<ScheduleType>("daily"); const [unit, setUnit] = useState(""); const [options, setOptions] = useState("");
  const submit = (event: React.FormEvent) => { event.preventDefault(); const choiceOptions = options.split(",").map((v) => v.trim()).filter(Boolean); if (!name.trim() || (type === "choice" && choiceOptions.length < 2)) return; onAdd({ id: crypto.randomUUID(), name: name.trim(), type, unit: unit.trim() || undefined, loggingMode: mode, schedule, weekdays: schedule === "weekdays" ? [1, 2, 3, 4, 5] : undefined, color: "sage", ratingMin: 1, ratingMax: 10, options: choiceOptions, aggregation: "sum" }); };
  return <div className="modal-backdrop" onMouseDown={(e) => { if (e.currentTarget === e.target) onClose(); }}><form className="modal" onSubmit={submit}><header><div><span className="eyebrow">New question</span><h2>What would you like to notice?</h2></div><button type="button" aria-label="Close" onClick={onClose}><X size={20} /></button></header><label>Name<input autoFocus required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Hours of sleep" /></label><div className="form-row"><label>Answer type<select value={type} onChange={(e) => { const nextType = e.target.value as MetricType; setType(nextType); if (nextType !== "number") setMode("daily"); }}><option value="number">Number</option><option value="rating">Rating scale</option><option value="boolean">Yes / no</option><option value="choice">Single choice</option><option value="text">Text</option></select></label><label>Logging style<select value={mode} onChange={(e) => setMode(e.target.value as LoggingMode)}><option value="daily">Once per day</option>{type === "number" && <option value="event">Multiple events</option>}</select></label></div>{type === "number" && <label>Unit <span>(optional)</span><input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="cups, hours, miles…" /></label>}{type === "choice" && <label>Choices <span>(at least two, comma separated)</span><input required value={options} onChange={(e) => setOptions(e.target.value)} placeholder="Great, okay, difficult" /></label>}<label>Schedule<select value={schedule} onChange={(e) => setSchedule(e.target.value as ScheduleType)}><option value="daily">Every day</option><option value="weekdays">Weekdays</option><option value="flexible">No schedule</option></select></label><footer><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary" type="submit">Create metric</button></footer></form></div>;
}

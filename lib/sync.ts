import { get, set } from "idb-keyval";
import { getSupabase } from "./supabase";

export type SyncOperation =
  | { id: string; kind: "entry"; payload: Record<string, unknown> }
  | { id: string; kind: "metric"; payload: Record<string, unknown> }
  | { id: string; kind: "archive"; payload: { id: string; archived_at: string } };

const key = (userId: string) => `lifelog-sync-queue:${userId}`;
let queueLock: Promise<unknown> = Promise.resolve();
let syncLock: Promise<unknown> = Promise.resolve();

async function execute(operation: SyncOperation) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Cloud client is unavailable");
  if (operation.kind === "entry") return supabase.from("entries").upsert(operation.payload, { onConflict: "user_id,metric_id,local_date,slot_key" });
  if (operation.kind === "metric") return supabase.from("metrics").upsert(operation.payload, { onConflict: "id" });
  return supabase.from("metrics").update({ archived_at: operation.payload.archived_at }).eq("id", operation.payload.id);
}

export function queueOperation(userId: string, operation: SyncOperation) {
  queueLock = queueLock.then(async () => {
    const queue = await get<SyncOperation[]>(key(userId)) ?? [];
    await set(key(userId), [...queue.filter((item) => item.id !== operation.id), operation]);
  });
  return queueLock;
}

export function syncPending(userId: string) {
  syncLock = syncLock.then(async () => {
    await queueLock;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    const queue = await get<SyncOperation[]>(key(userId)) ?? [];
    const remaining = [...queue];
    for (const operation of queue) {
      const result = await execute(operation);
      if (result.error) break;
      remaining.shift();
      await set(key(userId), remaining);
    }
  });
  return syncLock;
}

export async function queueAndSync(userId: string, operation: SyncOperation) {
  await queueOperation(userId, operation);
  await syncPending(userId);
}

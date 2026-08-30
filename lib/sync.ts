import { get, set } from "idb-keyval";
import { getSupabase } from "./supabase";

export type SyncOperation =
  | { id: string; kind: "entry"; payload: Record<string, unknown> }
  | { id: string; kind: "delete-entry"; payload: { id: string } }
  | { id: string; kind: "metric"; payload: Record<string, unknown> }
  | { id: string; kind: "archive"; payload: { id: string; archived_at: string } };

export interface SyncResult { pending: number; error: string | null }

const key = (userId: string) => `lifelog-sync-queue:${userId}`;
let queueLock: Promise<unknown> = Promise.resolve();
let syncLock: Promise<SyncResult> = Promise.resolve({ pending: 0, error: null });

async function execute(operation: SyncOperation) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Cloud client is unavailable");
  if (operation.kind === "entry") return supabase.from("entries").upsert(operation.payload, { onConflict: "user_id,metric_id,local_date,slot_key" });
  if (operation.kind === "delete-entry") return supabase.from("entries").delete().eq("id", operation.payload.id);
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
    const queue = await get<SyncOperation[]>(key(userId)) ?? [];
    if (typeof navigator !== "undefined" && !navigator.onLine) return { pending: queue.length, error: null };
    const remaining = [...queue];
    for (const operation of queue) {
      try {
        const result = await execute(operation);
        if (result.error) return { pending: remaining.length, error: result.error.message };
      } catch (error) {
        return { pending: remaining.length, error: error instanceof Error ? error.message : "Synchronization failed" };
      }
      remaining.shift();
      await set(key(userId), remaining);
    }
    return { pending: 0, error: null };
  });
  return syncLock;
}

export async function queueAndSync(userId: string, operation: SyncOperation) {
  await queueOperation(userId, operation);
  return syncPending(userId);
}

import { getSupabase } from "./supabase";

export async function reportError(error: Error & { digest?: string }) {
  const supabase = getSupabase(); if (!supabase) return;
  const { data } = await supabase.auth.getUser();
  await supabase.from("app_errors").insert({ user_id: data.user?.id ?? null, message: error.message || "Unknown client error", stack: error.stack, digest: error.digest, page: window.location.pathname });
}

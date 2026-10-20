import { supabase } from "./supabase";
import type { AttemptRow } from "../content/report";

export type Child = {
  id: string;
  display_name: string;
  avatar: string;
  xp: number;
  streak_days: number;
  last_active_date: string | null;
};

export type UnitProgress = {
  unit_id: string;
  best_correct: number;
  total: number;
  runs: number;
};

export type AttemptKind = "correct" | "almost" | "incorrect";
export type CompleteResult = { xp: number; streak: number; gained: number };

const CHILD_COLUMNS = "id, display_name, avatar, xp, streak_days, last_active_date";

export async function listChildren(): Promise<Child[]> {
  const { data, error } = await supabase
    .from("children")
    .select(CHILD_COLUMNS)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Child[];
}

export async function createChild(displayName: string): Promise<Child> {
  const { data: sessionData } = await supabase.auth.getSession();
  const parentId = sessionData.session?.user.id;
  if (!parentId) throw new Error("Not signed in.");

  const { data, error } = await supabase
    .from("children")
    .insert({ parent_id: parentId, display_name: displayName })
    .select(CHILD_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return data as Child;
}

export async function getProgress(childId: string): Promise<UnitProgress[]> {
  const { data, error } = await supabase
    .from("unit_progress")
    .select("unit_id, best_correct, total, runs")
    .eq("child_id", childId);
  if (error) throw new Error(error.message);
  return (data ?? []) as UnitProgress[];
}

/** Saved in the background; a failure never interrupts the lesson. */
export async function recordAttempt(attempt: {
  childId: string;
  unitId: string;
  item: string;
  heard: string;
  kind: AttemptKind;
}): Promise<void> {
  const { error } = await supabase.from("attempts").insert({
    child_id: attempt.childId,
    unit_id: attempt.unitId,
    item: attempt.item,
    heard: attempt.heard,
    kind: attempt.kind,
  });
  if (error) console.warn("Attempt not saved:", error.message);
}

export async function completeUnit(
  childId: string,
  unitId: string,
  correct: number,
  total: number,
): Promise<CompleteResult> {
  const { data, error } = await supabase.rpc("complete_unit", {
    p_child_id: childId,
    p_unit_id: unitId,
    p_correct: correct,
    p_total: total,
  });
  if (error) throw new Error(error.message);
  const row = (Array.isArray(data) ? data[0] : data) as
    | { new_xp: number; new_streak: number; gained: number }
    | null
    | undefined;
  if (!row) throw new Error("No result from the server.");
  return { xp: row.new_xp, streak: row.new_streak, gained: row.gained };
}

/** The child's recent attempts (newest first), for the parent report. Only the parent's own children can be read. */
export async function getAttempts(childId: string, days = 60): Promise<AttemptRow[]> {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const { data, error } = await supabase
    .from("attempts")
    .select("item, heard, kind, created_at")
    .eq("child_id", childId)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) throw new Error(error.message);
  return (data ?? []) as AttemptRow[];
}

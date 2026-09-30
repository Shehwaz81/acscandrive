import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { canEquivalents } from "./money";
import { SubmissionConflictError } from "./repository";
import { STUDENT_COLUMNS, toStudent } from "./roster.server";
import type { Amount, DonationLog, LogPatch, LogWithStudent, NewLog, StudentTotals } from "./types";
import { MAX_CANS, MAX_CASH_CENTS } from "./validation";

/**
 * Reads and writes `donation_logs` for the volunteer workspace.
 *
 * Like roster.server.ts, nothing here checks who is asking and the admin
 * client bypasses RLS: every caller must verify a signed-in volunteer first.
 *
 * There is no updated_at column (MVP), so `updatedAt` is `recorded_at`.
 * Totals are always summed from rows; nothing stores a running total.
 */

const LOG_COLUMNS = "transaction_id, student_id, method, can_count, amount_cents, recorded_at";
/** The workspace only handles these; a future `online` row stays out until refunds are defined. */
const METHODS = ["cans", "cash"];

type LogRow = {
  transaction_id: string;
  student_id: number;
  method: string;
  can_count: number | null;
  amount_cents: number | null;
  recorded_at: string;
};

/** The request was wrong (bad body, unknown student): a 400, not a server fault. */
export class InvalidLogError extends Error {}

function toLog(r: LogRow): DonationLog {
  return {
    id: r.transaction_id,
    studentId: String(r.student_id),
    method: r.method as DonationLog["method"],
    cans: r.can_count,
    cashCents: r.amount_cents,
    createdAt: r.recorded_at,
    updatedAt: r.recorded_at,
  };
}

function amountColumns(a: Amount) {
  return a.method === "cans"
    ? { method: "cans", can_count: a.cans, amount_cents: null }
    : { method: "cash", can_count: null, amount_cents: a.cashCents };
}

// ---- Input boundary: request bodies are untrusted JSON. ----

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isStudentId(v: unknown): v is string {
  return typeof v === "string" && /^\d{1,18}$/.test(v);
}

export function isLogId(v: unknown): v is string {
  return typeof v === "string" && UUID.test(v);
}

function isCount(v: unknown, max: number): v is number {
  return typeof v === "number" && Number.isInteger(v) && v > 0 && v <= max;
}

/** `{ method, cans }` or `{ method, cashCents }`, with the other field absent or null. */
export function parseLogPatch(body: unknown): LogPatch | null {
  if (typeof body !== "object" || body === null) return null;
  const b = body as Record<string, unknown>;
  if (b.method === "cans" && isCount(b.cans, MAX_CANS) && b.cashCents == null) {
    return { method: "cans", cans: b.cans };
  }
  if (b.method === "cash" && isCount(b.cashCents, MAX_CASH_CENTS) && b.cans == null) {
    return { method: "cash", cashCents: b.cashCents };
  }
  return null;
}

export function parseNewLog(body: unknown): NewLog | null {
  const amount = parseLogPatch(body);
  if (!amount) return null;
  const { id, studentId } = body as Record<string, unknown>;
  if (!isLogId(id) || !isStudentId(studentId)) return null;
  return { id: id.toLowerCase(), studentId, ...amount };
}

// ---- Queries ----

export async function listStudentLogs(studentId: string): Promise<DonationLog[]> {
  const { data, error } = await createAdminClient()
    .from("donation_logs")
    .select(LOG_COLUMNS)
    .eq("student_id", Number(studentId))
    .in("method", METHODS)
    .order("recorded_at", { ascending: false });
  if (error) throw new Error(`Couldn't read logs: ${error.message}`);
  return data.map(toLog);
}

export async function listRecentLogs(limit: number): Promise<LogWithStudent[]> {
  const { data, error } = await createAdminClient()
    .from("donation_logs")
    .select(`${LOG_COLUMNS}, students(${STUDENT_COLUMNS})`)
    .in("method", METHODS)
    .order("recorded_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Couldn't read recent logs: ${error.message}`);
  return data.map(({ students, ...row }) => ({ ...toLog(row), student: toStudent(students) }));
}

export async function getStudentTotals(studentId: string): Promise<StudentTotals> {
  const { data, error } = await createAdminClient()
    .from("donation_logs")
    .select("can_count, amount_cents")
    .eq("student_id", Number(studentId))
    .in("method", METHODS);
  if (error) throw new Error(`Couldn't read totals: ${error.message}`);
  let cans = 0;
  let cashCents = 0;
  for (const r of data) {
    cans += r.can_count ?? 0;
    cashCents += r.amount_cents ?? 0;
  }
  return { cans, cashCents, canEquivalents: canEquivalents(cans, cashCents) };
}

/**
 * Insert once per submission id. A retry of the same submission (same id,
 * student and amount) returns the stored row; the same id with anything else
 * throws SubmissionConflictError. The primary key makes this hold even when
 * two requests race.
 */
export async function createLog(input: NewLog): Promise<DonationLog> {
  const db = createAdminClient();
  const columns = { student_id: Number(input.studentId), ...amountColumns(input) };
  const { data, error } = await db
    .from("donation_logs")
    .insert({ transaction_id: input.id, ...columns })
    .select(LOG_COLUMNS)
    .single();
  if (!error) return toLog(data);

  // 23503: foreign key violation, the student doesn't exist.
  if (error.code === "23503") throw new InvalidLogError("Unknown student.");
  // 23505: unique violation, this submission id is already saved.
  if (error.code !== "23505") throw new Error(`Couldn't save log: ${error.message}`);

  const existing = await db.from("donation_logs").select(LOG_COLUMNS).eq("transaction_id", input.id).single();
  if (existing.error) throw new Error(`Couldn't read log: ${existing.error.message}`);
  const row = existing.data;
  const same =
    row.student_id === columns.student_id &&
    row.method === columns.method &&
    row.can_count === columns.can_count &&
    row.amount_cents === columns.amount_cents;
  if (!same) throw new SubmissionConflictError();
  return toLog(row);
}

/** Direct overwrite of method and amount (owner's decision: no history). Null if no such log. */
export async function updateLog(id: string, patch: LogPatch): Promise<DonationLog | null> {
  const { data, error } = await createAdminClient()
    .from("donation_logs")
    .update(amountColumns(patch))
    .eq("transaction_id", id)
    .in("method", METHODS)
    .select(LOG_COLUMNS)
    .maybeSingle();
  if (error) throw new Error(`Couldn't update log: ${error.message}`);
  return data ? toLog(data) : null;
}

/** Real delete (owner's decision: no history). A missing row is not an error, so a retry succeeds. */
export async function deleteLog(id: string): Promise<void> {
  const { error } = await createAdminClient()
    .from("donation_logs")
    .delete()
    .eq("transaction_id", id)
    .in("method", METHODS);
  if (error) throw new Error(`Couldn't delete log: ${error.message}`);
}

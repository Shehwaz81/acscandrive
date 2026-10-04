/**
 * Student Standings: the pure aggregation that turns private rows into the
 * public shapes in `types.ts`. No I/O, so tests feed synthetic rows.
 *
 * Two rankings that never mix: today (the Toronto calendar day of `now`) and
 * all-time (every counted log, no date filter). Rounding follows the homepage:
 * can-equivalents round down per student, per grouping (all-time, today, a
 * dress-down window, the drive), and only then sum.
 */

import { canEquivalents } from "../volunteer/money";
import { findSameNames, normalize, normalizedName, searchStudents } from "../volunteer/search";
import { torontoDayKey } from "../volunteer/time";
import type { Student } from "../volunteer/types";
import {
  CURRENT_DRIVE,
  DODGEBALL,
  DRESS_DOWN,
  type DressDownRules,
  dressDownConfirmed,
  countsTowardDrive,
  earlyFrom,
  inWindow,
  relevantWindow,
  type Window,
  windowClosed,
} from "./rules";
import type {
  DressDownProgress,
  DressDownWindow,
  HistoryEntry,
  HomeroomProgress,
  PublicStudent,
  RankedStudent,
  SearchItem,
  SearchResult,
  StandingsData,
  StudentProfile,
  StudentRef,
} from "./types";

/** The columns the standings need from a `donation_logs` row. */
export type StandingsLog = {
  student_id: number;
  method: string;
  can_count: number | null;
  amount_cents: number | null;
  occurred_at: string;
};

/** Turns a student id into the ref the browser sees. */
export type Seal = (studentId: string) => StudentRef;

export const TOP_N = 25;
/** Three on the shelf plus four close behind. */
const TODAY_ENTRIES = 7;
export const SEARCH_LIMIT = 8;
export const MIN_QUERY = 2;

type Sum = { cans: number; cents: number };
type Ranked = { student: Student; total: number; cans: number; cashCents: number; rank: number; tied: boolean };

export type StandingsIndex = {
  todayKey: string;
  generatedAt: string;
  now: Date;
  students: Student[];
  byId: Map<string, Student>;
  teacherOf: (room: string) => string;
  /** Students with a total above zero, in rank order. */
  allTime: Ranked[];
  today: Ranked[];
  allTimeById: Map<string, Ranked>;
  todayById: Map<string, Ranked>;
  sums: { allTime: Map<string, Sum>; today: Map<string, Sum> };
  /** Counted logs per student, newest first. */
  logsById: Map<string, StandingsLog[]>;
  sameNames: Map<string, Student[]>;
  rooms: Map<string, { size: number; driveTotal: number }>;
};

const isCounted = (l: StandingsLog) => l.method === "cans" || l.method === "cash";

function add(m: Map<string, Sum>, id: string, l: StandingsLog) {
  const s = m.get(id) ?? { cans: 0, cents: 0 };
  s.cans += l.can_count ?? 0;
  s.cents += l.amount_cents ?? 0;
  m.set(id, s);
}

const byName = (a: Student, b: Student) =>
  a.lastName.localeCompare(b.lastName, "en-CA", { sensitivity: "base" }) ||
  a.firstName.localeCompare(b.firstName, "en-CA", { sensitivity: "base" }) ||
  a.homeroom.localeCompare(b.homeroom, "en", { numeric: true, sensitivity: "base" });

/**
 * Competition ranking ("1, 2, 2, 4") of everyone above zero. Inside a tie the
 * order is last name, first name, homeroom: for display only, it decides nothing.
 */
function rank(students: Student[], sums: Map<string, Sum>): Ranked[] {
  const rows = students
    .map((student) => {
      const s = sums.get(student.id) ?? { cans: 0, cents: 0 };
      return { student, total: canEquivalents(s.cans, s.cents), cans: s.cans, cashCents: s.cents };
    })
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total || byName(a.student, b.student));
  const ranked: Ranked[] = [];
  rows.forEach((r, i) => {
    const prev = ranked[i - 1];
    ranked.push({
      ...r,
      rank: prev && prev.total === r.total ? prev.rank : i + 1,
      tied: prev?.total === r.total || rows[i + 1]?.total === r.total,
    });
  });
  return ranked;
}

/**
 * Sums every counted log once. `online` logs are left out until refunds are
 * defined; logs for students who aren't on the roster, and students outside
 * Grades 9–12, are skipped, as on the homepage. Staff (no grade) are ranked
 * with the students.
 */
export function buildIndex(
  roster: Student[],
  logs: StandingsLog[],
  now: Date = new Date(),
  /** From teacherLabels(); a room without one falls back to its code. */
  teachers: ReadonlyMap<string, string> = new Map(),
): StandingsIndex {
  const students = roster.filter((s) => s.grade === null || (s.grade >= 9 && s.grade <= 12));
  const byId = new Map(students.map((s) => [s.id, s]));
  const todayKey = torontoDayKey(now);

  const sums = { allTime: new Map<string, Sum>(), today: new Map<string, Sum>() };
  const drive = new Map<string, Sum>();
  const logsById = new Map<string, StandingsLog[]>();
  for (const l of logs) {
    const id = String(l.student_id);
    if (!isCounted(l) || !byId.has(id)) continue;
    add(sums.allTime, id, l);
    if (torontoDayKey(l.occurred_at) === todayKey) add(sums.today, id, l);
    if (countsTowardDrive(l.occurred_at)) add(drive, id, l);
    logsById.set(id, [...(logsById.get(id) ?? []), l]);
  }
  for (const list of logsById.values()) list.sort((a, b) => Date.parse(b.occurred_at) - Date.parse(a.occurred_at));

  const rooms = new Map<string, { size: number; driveTotal: number }>();
  for (const s of students) {
    const r = rooms.get(s.homeroom) ?? { size: 0, driveTotal: 0 };
    const d = drive.get(s.id);
    r.size += 1;
    if (d) r.driveTotal += canEquivalents(d.cans, d.cents);
    rooms.set(s.homeroom, r);
  }

  const allTime = rank(students, sums.allTime);
  const today = rank(students, sums.today);
  return {
    todayKey,
    generatedAt: now.toISOString(),
    now,
    students,
    byId,
    teacherOf: (room) => teachers.get(room) ?? room,
    allTime,
    today,
    allTimeById: new Map(allTime.map((r) => [r.student.id, r])),
    todayById: new Map(today.map((r) => [r.student.id, r])),
    sums,
    logsById,
    sameNames: findSameNames(students),
    rooms,
  };
}

function toPublic(index: StandingsIndex, s: Student, seal: Seal): PublicStudent {
  return {
    ref: seal(s.id),
    firstName: s.firstName.trim(),
    lastName: s.lastName.trim(),
    grade: s.grade,
    homeroom: s.homeroom.trim(),
    teacher: index.teacherOf(s.homeroom),
  };
}

function toRanked(index: StandingsIndex, r: Ranked, seal: Seal): RankedStudent {
  return {
    ...toPublic(index, r.student, seal),
    total: r.total,
    cans: r.cans,
    cashCents: r.cashCents,
    rank: r.rank,
    tied: r.tied,
  };
}

/** The page's own figures: today's leaders and the all-time top 25. */
export function buildStandingsData(index: StandingsIndex, seal: Seal): StandingsData {
  return {
    generatedAt: index.generatedAt,
    rosterCount: index.students.length,
    today: {
      date: index.todayKey,
      entries: index.today.slice(0, TODAY_ENTRIES).map((r) => ({
        ...toRanked(index, r, seal),
        allTimeRank: index.allTimeById.get(r.student.id)?.rank ?? null,
      })),
      donorCount: index.today.length,
    },
    allTime: {
      // Everyone tied at the last rank is shown, so the table can exceed 25 rows.
      rows: index.allTime.filter((r) => r.rank <= TOP_N).map((r) => toRanked(index, r, seal)),
      donorCount: index.allTime.length,
    },
  };
}

/**
 * Roster search. Order: names that start with what was typed, then other
 * word-prefix matches, then near spellings. Queries under MIN_QUERY letters
 * match nothing, so the roster can't be listed one letter at a time.
 */
export function searchStandings(index: StandingsIndex, query: string, seal: Seal): SearchResult {
  const q = normalize(query);
  if (q.replace(/ /g, "").length < MIN_QUERY) return { items: [], total: 0 };
  const { exact, similar } = searchStudents(index.students, query, Infinity);
  const starts = exact.filter((s) => normalizedName(s).startsWith(q));
  const rest = exact.filter((s) => !normalizedName(s).startsWith(q));

  const item = (s: Student, isSimilar: boolean): SearchItem => {
    const r = index.allTimeById.get(s.id);
    return {
      ...toPublic(index, s, seal),
      total: index.logsById.has(s.id) ? (r?.total ?? 0) : null,
      rank: r?.rank ?? null,
      sameName: index.sameNames.has(normalizedName(s)),
      similar: isSimilar,
    };
  };
  const items = [...starts, ...rest].map((s) => item(s, false)).concat(similar.map((s) => item(s, true)));
  return { items: items.slice(0, SEARCH_LIMIT), total: items.length };
}

/** One student's progress toward the relevant dress-down Friday, and the Friday before it. */
export function buildDressDown(
  logs: StandingsLog[],
  now: Date,
  rules: DressDownRules = DRESS_DOWN,
): DressDownProgress {
  const cutoff = rules.cutoff.value;
  const windows = rules.windows.value;
  const result = (w: Window): DressDownWindow => {
    // The first window also takes donations dated before the drive opened.
    const from = w === windows[0] ? earlyFrom(w.windowStart) : w.windowStart;
    const sum = { cans: 0, cents: 0 };
    for (const l of logs) {
      if (!isCounted(l) || !inWindow(w, cutoff, l.occurred_at, from)) continue;
      sum.cans += l.can_count ?? 0;
      sum.cents += l.amount_cents ?? 0;
    }
    const counted = canEquivalents(sum.cans, sum.cents);
    return { ...w, cutoff, counted, reached: counted >= rules.threshold, closed: windowClosed(w, cutoff, now) };
  };
  const at = relevantWindow(now, rules);
  return {
    confirmed: dressDownConfirmed(rules),
    threshold: rules.threshold,
    carryover: rules.carryover.value,
    carryoverConfirmed: rules.carryover.confirmed,
    phase: at?.phase ?? "ended",
    current: at ? result(windows[at.index]) : null,
    previous: at && at.index > 0 ? result(windows[at.index - 1]) : null,
  };
}

/**
 * A homeroom's shared dodgeball target. `place` comes only from a recorded
 * confirmation; without one the furthest a class gets is "reached".
 */
export function buildHomeroomProgress(
  index: StandingsIndex,
  homeroom: string,
  places: ReadonlyMap<string, number> = new Map(),
): HomeroomProgress {
  const room = index.rooms.get(homeroom) ?? { size: 0, driveTotal: 0 };
  const target = room.size * DODGEBALL.perStudent;
  const place = places.get(homeroom) ?? null;
  return {
    homeroom: homeroom.trim(),
    teacher: index.teacherOf(homeroom),
    classSize: room.size,
    target,
    total: room.driveTotal,
    status: place !== null ? "confirmed" : room.driveTotal >= target && target > 0 ? "reached" : "below",
    place,
    maxPlaces: DODGEBALL.places,
    drive: CURRENT_DRIVE,
  };
}

/** Everything the student view shows, or null for an id that isn't on the roster. */
export function buildStudentProfile(
  index: StandingsIndex,
  studentId: string,
  seal: Seal,
  /** Confirmed dodgeball places by homeroom; empty until the owner records any. */
  places: ReadonlyMap<string, number> = new Map(),
): StudentProfile | null {
  const student = index.byId.get(studentId);
  if (!student) return null;
  const logs = index.logsById.get(studentId) ?? [];
  const all = index.sums.allTime.get(studentId) ?? { cans: 0, cents: 0 };
  const day = index.sums.today.get(studentId) ?? { cans: 0, cents: 0 };
  const allRank = index.allTimeById.get(studentId);
  const dayRank = index.todayById.get(studentId);
  const shown = index.allTime.filter((r) => r.rank <= TOP_N);

  return {
    student: {
      ...toPublic(index, student, seal),
      sameNameCount: index.sameNames.get(normalizedName(student))?.length ?? 1,
    },
    allTime: {
      total: canEquivalents(all.cans, all.cents),
      cans: all.cans,
      cashCents: all.cents,
      rank: allRank?.rank ?? null,
      tied: allRank?.tied ?? false,
      donorCount: index.allTime.length,
      inTop25: allRank !== undefined && allRank.rank <= TOP_N,
      cutoffTotal: index.allTime.length >= TOP_N ? shown[shown.length - 1].total : null,
    },
    today: {
      date: index.todayKey,
      total: canEquivalents(day.cans, day.cents),
      cans: day.cans,
      cashCents: day.cents,
      rank: dayRank?.rank ?? null,
      tied: dayRank?.tied ?? false,
      donorCount: index.today.length,
    },
    dressDown: buildDressDown(logs, index.now),
    homeroom: buildHomeroomProgress(index, student.homeroom, places),
    history: logs.map(
      (l): HistoryEntry => ({
        date: l.occurred_at,
        method: l.method as HistoryEntry["method"],
        cans: l.can_count,
        cashCents: l.amount_cents,
      }),
    ),
  };
}

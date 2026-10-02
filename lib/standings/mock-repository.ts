import type { Grade, Student } from "../volunteer/types";
import {
  buildIndex,
  buildStandingsData,
  buildStudentProfile,
  searchStandings,
  type StandingsIndex,
  type StandingsLog,
} from "./build";
import { type StandingsRepository, StudentNotFoundError } from "./repository";
import type { SearchResult, StandingsData, StudentProfile, StudentRef } from "./types";

/**
 * Fictional students and donation logs for the Student Standings page. Every
 * figure is computed from these logs by the same `build.ts` the real path
 * uses, so totals always add up. The clock is fixed at MOCK_NOW so the page is
 * the same on every load.
 *
 * Cases on purpose: today's #1 (Maya Reyes) is #29 all-time; two students are
 * called Ava Martin; "Ava Martinez" and "Avery Martins" are near spellings; two
 * students tie for 7th; some students have no donations; one has only $0.50.
 */

export const MOCK_SCENARIOS = ["live", "tie", "two", "none", "loading", "error"] as const;
/**
 * live: a full day. tie: three students tied for 2nd today. two: only two
 * donors today. none: nothing today. loading: requests never finish.
 * error: the page data and each request's first try fail.
 */
export type MockScenario = (typeof MOCK_SCENARIOS)[number];

export const isMockScenario = (v: string | null): v is MockScenario =>
  (MOCK_SCENARIOS as readonly string[]).includes(v ?? "");

/** Friday, October 23, 2026, 11:42 a.m. in Toronto: the drive's last day. */
export const MOCK_NOW = new Date("2026-10-23T11:42:00-04:00");
const TODAY = "2026-10-23";

const HOMEROOMS: { room: string; grade: Grade; teacher: string; size: number }[] = [
  { room: "9A", grade: 9, teacher: "Okafor", size: 9 },
  { room: "9B", grade: 9, teacher: "Lindqvist", size: 9 },
  { room: "10A", grade: 10, teacher: "Bianchi", size: 9 },
  { room: "10C", grade: 10, teacher: "Haddad", size: 9 },
  { room: "11A", grade: 11, teacher: "Tremblay", size: 28 },
  { room: "11B", grade: 11, teacher: "Nakamura", size: 9 },
  { room: "12A", grade: 12, teacher: "Petrov", size: 9 },
  { room: "12B", grade: 12, teacher: "Osei", size: 12 },
];

// 31 × 29 names: the pairing below never repeats within the roster.
const FIRST = [
  "Liam", "Priya", "Noah", "Sofia", "Ethan", "Amara", "Lucas", "Hana", "Owen", "Leila", "Jonah", "Mei", "Caleb",
  "Nadia", "Felix", "Imani", "Theo", "Yara", "Isaac", "Chloe", "Mateo", "Anika", "Jude", "Elena", "Kofi", "Tessa",
  "Rohan", "Ingrid", "Samir", "Bianca", "Dario",
];
const LAST = [
  "Abara", "Bergstrom", "Castellano", "Dubois", "Eriksen", "Fontaine", "Gallo", "Hoang", "Ibekwe", "Jovanovic",
  "Kowalski", "Laurent", "Moreau", "Nwosu", "Olsen", "Pereira", "Quigley", "Rossi", "Santos", "Thibault", "Ueda",
  "Vasquez", "Wojcik", "Xavier", "Yilmaz", "Zielinski", "Arsenault", "Brisebois", "Caruso",
];

/** Named students, with the place each holds on the all-time ladder (null: no donations). */
const SPECIAL = [
  { firstName: "Maya", lastName: "Reyes", room: "11A", slot: 28 },
  { firstName: "Ava", lastName: "Martin", room: "10C", slot: 6 },
  { firstName: "Ava", lastName: "Martin", room: "11B", slot: 35 },
  { firstName: "Ava", lastName: "Martinez", room: "12A", slot: null },
  { firstName: "Avery", lastName: "Martins", room: "9B", slot: 20 },
  { firstName: "Zoë", lastName: "O’Brien", room: "12B", slot: 12 },
];
const MAYA_SLOT = 28;

/** All-time can-equivalents by ladder slot. Slots 6 and 7 tie; slot 24 (#25) is on 75. */
const LADDER = [
  214, 196, 183, 171, 164, 158, 151, 151, 144, 139, 133, 128, 124, 119, 115, 110, 106, 101, 97, 93, 89, 85, 81, 78,
  75, 70, 64, 58, 52, 49, 45, 41, 38, 34, 30, 27, 24, 21, 18, 15, 12, 10, 9, 7, 6, 5, 3, 2, 1,
];
/** Slots held by 11A students other than Maya, so 11A's drive total is 235 of 280. */
const ROOM_11A_SLOTS = [22, 30, 33, 38, 45];

/** Today's can-equivalents by ladder slot. */
const TODAY_BY_SLOT: Record<Exclude<MockScenario, "loading" | "error">, Record<number, number>> = {
  live: { 28: 46, 2: 34, 9: 31, 5: 27, 14: 22, 19: 20, 30: 18, 22: 15, 33: 12, 11: 9, 40: 5 },
  tie: { 28: 46, 2: 34, 9: 34, 5: 34, 14: 22, 19: 20, 30: 18 },
  two: { 28: 46, 2: 34 },
  none: {},
};

/** Collection days before today: weekdays October 5–22. */
const EARLIER_DAYS = [5, 6, 7, 8, 9, 12, 13, 14, 15, 16, 19, 20, 21, 22].map(
  (d) => `2026-10-${String(d).padStart(2, "0")}`,
);

/** A Toronto morning during the drive (EDT). `minute` is minutes after 7:30. */
const at = (day: string, minute: number) =>
  `${day}T07:${String(30 + (minute % 30)).padStart(2, "0")}:00-04:00`;

function roster(): { students: Student[]; slots: Map<number, Student> } {
  const students: Student[] = [];
  let n = 0;
  for (const h of HOMEROOMS) {
    const named = SPECIAL.filter((s) => s.room === h.room);
    for (let i = 0; i < h.size; i++) {
      const name = named[i] ?? { firstName: FIRST[n % FIRST.length], lastName: LAST[(n * 7) % LAST.length] };
      if (!named[i]) n++;
      students.push({
        id: String(9001 + students.length),
        firstName: name.firstName,
        lastName: name.lastName,
        grade: h.grade,
        homeroom: h.room,
      });
    }
  }

  const isSpecial = (s: Student) => SPECIAL.some((x) => x.room === s.homeroom && x.lastName === s.lastName);
  const slots = new Map<number, Student>();
  for (const x of SPECIAL) {
    const st = students.find((s) => s.homeroom === x.room && s.firstName === x.firstName && s.lastName === x.lastName);
    if (x.slot !== null && st) slots.set(x.slot, st);
  }
  const in11A = students.filter((s) => s.homeroom === "11A" && !isSpecial(s));
  ROOM_11A_SLOTS.forEach((slot, i) => slots.set(slot, in11A[i]));
  // Everyone else fills the remaining slots in a fixed, scattered order.
  const others = students.filter((s) => s.homeroom !== "11A" && !isSpecial(s));
  let next = 0;
  for (let slot = 0; slot < LADDER.length; slot++) {
    if (slots.has(slot)) continue;
    slots.set(slot, others[(next * 37) % others.length]);
    next++;
  }
  return { students, slots };
}

function logsFor(scenario: keyof typeof TODAY_BY_SLOT, slots: Map<number, Student>, students: Student[]): StandingsLog[] {
  const logs: StandingsLog[] = [];
  const cans = (id: string, n: number, when: string) =>
    logs.push({ student_id: Number(id), method: "cans", can_count: n, amount_cents: null, occurred_at: when });
  const cash = (id: string, cents: number, when: string) =>
    logs.push({ student_id: Number(id), method: "cash", can_count: null, amount_cents: cents, occurred_at: when });

  for (const [slot, student] of slots) {
    let left = LADDER[slot];
    const id = student.id;

    const today = TODAY_BY_SLOT[scenario][slot] ?? 0;
    if (today > 0) {
      if (slot === MAYA_SLOT) {
        cans(id, today - 10, at(TODAY, 14));
        cash(id, 1000, at(TODAY, 15));
      } else {
        cans(id, today, at(TODAY, 10 + slot));
      }
      left -= today;
    }
    // The four leaders also gave last year: all-time counts it, this drive doesn't.
    if (slot < 4) {
      cans(id, 20, "2025-10-15T07:45:00-04:00");
      left -= 20;
    }
    if (slot === 47) {
      // 1 can + $1.50 = 2: the partial dollar rounds down.
      cash(id, 150, at(EARLIER_DAYS[3], 20));
      left -= 1;
    } else if (slot % 4 === 1 && left >= 20) {
      cash(id, 1000, at(EARLIER_DAYS[(slot * 5) % EARLIER_DAYS.length], 20));
      left -= 10;
    }
    const count = Math.min(left, 1 + (slot % 4));
    for (let j = 0; j < count; j++) {
      const share = Math.floor(left / count) + (j === 0 ? left % count : 0);
      cans(id, share, at(EARLIER_DAYS[(slot * 3 + j * 5) % EARLIER_DAYS.length], slot * 7 + j * 11));
    }
  }

  // One student has history but no total: $0.50 rounds down to 0 cans.
  const donors = new Set([...slots.values()].map((s) => s.id));
  const cents = students.find((s) => !donors.has(s.id) && s.lastName !== "Martinez");
  if (cents) cash(cents.id, 50, at(EARLIER_DAYS[6], 12));
  return logs;
}

const TEACHERS = new Map(HOMEROOMS.map((h) => [h.room, h.teacher]));
const cache = new Map<string, StandingsIndex>();

/** Mock refs aren't sealed: there is no real id behind them. */
const seal = (id: string): StudentRef => `mock-${id}`;
const open = (ref: StudentRef) => (ref.startsWith("mock-") ? ref.slice(5) : null);

function dataScenario(scenario: MockScenario): keyof typeof TODAY_BY_SLOT {
  return scenario === "loading" || scenario === "error" ? "live" : scenario;
}

export function mockIndex(scenario: MockScenario = "live"): StandingsIndex {
  const key = dataScenario(scenario);
  let index = cache.get(key);
  if (!index) {
    const { students, slots } = roster();
    index = buildIndex(students, logsFor(key, slots, students), MOCK_NOW, TEACHERS);
    cache.set(key, index);
  }
  return index;
}

export function mockStandingsData(scenario: MockScenario = "live"): StandingsData {
  return buildStandingsData(mockIndex(scenario), seal);
}

export class MockStandingsRepository implements StandingsRepository {
  private readonly scenario: MockScenario;
  /** In the "error" scenario each kind of request fails once, then works, so retry can be tried. */
  private readonly failed = new Set<string>();

  constructor(scenario: MockScenario = "live") {
    this.scenario = scenario;
  }

  async searchStudents(query: string): Promise<SearchResult> {
    await this.gate(`search:${query}`);
    return searchStandings(mockIndex(this.scenario), query, seal);
  }

  async getStudentProfile(ref: StudentRef): Promise<StudentProfile> {
    await this.gate(`profile:${ref}`);
    const id = open(ref);
    const profile = id ? buildStudentProfile(mockIndex(this.scenario), id, seal) : null;
    if (!profile) throw new StudentNotFoundError();
    return profile;
  }

  private gate(key: string): Promise<void> {
    if (this.scenario === "loading") return new Promise(() => {});
    if (this.scenario === "error" && !this.failed.has(key)) {
      this.failed.add(key);
      return Promise.reject(new Error("Mock failure"));
    }
    return Promise.resolve();
  }
}

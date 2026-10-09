import type { Student, StudentSearchResult } from "./types";

/**
 * Student name search: exact (prefix) matches plus near spellings, so a
 * volunteer notices "Maya Rodrigues" when they meant "Maya Rodriguez". The
 * mock runs this in the browser; with the real roster the students route runs
 * it on the server (app/api/volunteer/students).
 */

export const SIMILAR_MIN_QUERY = 4;
export const SIMILAR_LIMIT = 4;
/** A short query can match hundreds of the ~1,100 students; send only this many. */
export const EXACT_LIMIT = 20;

/** Lowercase, strip accents and apostrophes, treat hyphens as spaces, collapse whitespace. */
export function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’`]/g, "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function fullName(s: Pick<Student, "firstName" | "lastName">): string {
  return `${s.firstName} ${s.lastName}`;
}

export function normalizedName(s: Student): string {
  return normalize(fullName(s));
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = cur;
  }
  return prev[b.length];
}

export function compareStudents(a: Student, b: Student): number {
  return (
    a.lastName.localeCompare(b.lastName, "en-CA", { sensitivity: "base" }) ||
    a.firstName.localeCompare(b.firstName, "en-CA", { sensitivity: "base" }) ||
    (a.grade ?? 0) - (b.grade ?? 0)
  );
}

function isExact(tokens: string[], words: string[]): boolean {
  return tokens.every((t) => words.some((w) => w.startsWith(t)));
}

export function searchStudents(
  students: Student[],
  query: string,
  /** Cap on `exact`; the public student search passes Infinity and orders the matches itself. */
  exactLimit: number = EXACT_LIMIT,
): StudentSearchResult {
  const q = normalize(query);
  if (!q) return { exact: [], exactTotal: 0, similar: [] };
  const tokens = q.split(" ");

  const exact: Student[] = [];
  const rest: Student[] = [];
  for (const s of students) {
    (isExact(tokens, normalizedName(s).split(" ")) ? exact : rest).push(s);
  }
  exact.sort(compareStudents);
  const exactTotal = exact.length;
  const shown = exact.slice(0, exactLimit);

  if (q.length < SIMILAR_MIN_QUERY) return { exact: shown, exactTotal, similar: [] };

  const nameLimit = q.length >= 8 ? 2 : 1;
  const exactNames = exact.map(normalizedName);
  const longTokens = tokens.filter((t) => t.length >= 4);

  const similar = rest
    .filter((s) => {
      const name = normalizedName(s);
      const reversed = normalize(`${s.lastName} ${s.firstName}`);
      if (Math.min(levenshtein(q, name), levenshtein(q, reversed)) <= nameLimit) return true;
      const words = name.split(" ");
      if (longTokens.some((t) => words.some((w) => levenshtein(t, w) <= 1))) return true;
      return exactNames.some((n) => levenshtein(n, name) <= 2);
    })
    .sort(compareStudents)
    .slice(0, SIMILAR_LIMIT);

  return { exact: shown, exactTotal, similar };
}

/** Groups of two or more students whose normalized full names are identical. */
export function findSameNames(students: Student[]): Map<string, Student[]> {
  const groups = new Map<string, Student[]>();
  for (const s of students) {
    const key = normalizedName(s);
    groups.set(key, [...(groups.get(key) ?? []), s]);
  }
  for (const [key, group] of groups) if (group.length < 2) groups.delete(key);
  return groups;
}

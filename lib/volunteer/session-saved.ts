import type { DonationLog, Student } from "./types";

/**
 * "Saved this session": logs this browser tab created, for a quick scan for
 * doubles and typos. Client-only state in sessionStorage, not part of the
 * repository. Every storage access is guarded because it can throw (private
 * mode, blocked storage).
 */

export type SavedEntry = { log: DonationLog; student: Student };

const KEY = "volunteer:saved-this-session";
const EMPTY: SavedEntry[] = [];
let entries: SavedEntry[] | null = null;
const listeners = new Set<() => void>();

function read(): SavedEntry[] {
  if (entries) return entries;
  try {
    const raw = sessionStorage.getItem(KEY);
    entries = raw ? (JSON.parse(raw) as SavedEntry[]) : [];
  } catch {
    entries = [];
  }
  return entries;
}

function write(next: SavedEntry[]) {
  entries = next;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Keep the in-memory copy; the list just won't survive a reload.
  }
  listeners.forEach((l) => l());
}

export const sessionSaved = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot: read,
  getServerSnapshot: () => EMPTY,
  add(entry: SavedEntry) {
    write([entry, ...read().filter((e) => e.log.id !== entry.log.id)]);
  },
  /** Reflect an edit made anywhere in the workspace. */
  update(log: DonationLog) {
    if (read().some((e) => e.log.id === log.id)) {
      write(read().map((e) => (e.log.id === log.id ? { ...e, log } : e)));
    }
  },
  remove(id: string) {
    if (read().some((e) => e.log.id === id)) write(read().filter((e) => e.log.id !== id));
  },
  clear() {
    write([]);
  },
};

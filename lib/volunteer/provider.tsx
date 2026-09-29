"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createRepository } from "./index";
import type { MockControls, VolunteerRepository } from "./repository";
import { sessionSaved } from "./session-saved";
import type { LogPatch, NewLog, Student } from "./types";

/**
 * Hands the repository to components through context, so UI code never
 * imports an implementation. Caching is deliberately simple: every query
 * refetches when `revision` changes, and every successful write bumps it
 * (student logs, totals and recent logs all refresh).
 */

type Ctx = {
  repo: VolunteerRepository;
  mock: MockControls | null;
  revision: number;
  bump: () => void;
  failNextWrite: boolean;
  syncMockFlags: () => void;
};

const RepositoryContext = createContext<Ctx | null>(null);

export function RepositoryProvider({
  children,
  repo: injectedRepo,
  mock: injectedMock,
}: {
  children: ReactNode;
  /** Tests inject their own instance. */
  repo?: VolunteerRepository;
  mock?: MockControls | null;
}) {
  const [{ repo, mock }] = useState(() =>
    injectedRepo ? { repo: injectedRepo, mock: injectedMock ?? null } : createRepository(),
  );
  const [revision, setRevision] = useState(0);

  // Mock data lives in memory and resets on reload; drop "saved this session"
  // entries that would point at logs that no longer exist.
  useEffect(() => {
    if (!injectedRepo && mock) sessionSaved.clear();
  }, [injectedRepo, mock]);
  const [failNextWrite, setFailNextWrite] = useState(() => mock?.getFailNextWrite() ?? false);

  const bump = useCallback(() => setRevision((r) => r + 1), []);
  const syncMockFlags = useCallback(
    () => setFailNextWrite(mock?.getFailNextWrite() ?? false),
    [mock],
  );

  return (
    <RepositoryContext.Provider value={{ repo, mock, revision, bump, failNextWrite, syncMockFlags }}>
      {children}
    </RepositoryContext.Provider>
  );
}

function useRepoContext(): Ctx {
  const ctx = useContext(RepositoryContext);
  if (!ctx) throw new Error("Volunteer hooks must be used inside <RepositoryProvider>");
  return ctx;
}

export type QueryState<T> = {
  data: T | undefined;
  error: Error | null;
  /** True until data for the current key and revision has arrived. */
  loading: boolean;
};

/**
 * Fetch `fn` whenever `key` or the revision changes. `key === null` disables
 * the query. With `keepPrevious`, data for an older key stays visible while
 * the new key loads (search results don't flicker between keystrokes).
 */
function useRepoQuery<T>(
  key: string | null,
  fn: (repo: VolunteerRepository) => Promise<T>,
  { keepPrevious = false } = {},
): QueryState<T> & { dataKey: string | null; retry: () => void } {
  const { repo, revision } = useRepoContext();
  // Bumped by retry() to refetch the same key after a failure.
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  });
  const [state, setState] = useState<{
    key: string | null;
    stamp: string | null;
    data: T | undefined;
    error: Error | null;
  }>({ key: null, stamp: null, data: undefined, error: null });

  const stamp = key === null ? null : `${key}#${revision}#${attempt}`;

  useEffect(() => {
    if (key === null) return;
    let cancelled = false;
    fnRef.current(repo).then(
      (data) => !cancelled && setState({ key, stamp: `${key}#${revision}#${attempt}`, data, error: null }),
      // Drop old data: it answered a different key and must not pass for this one.
      (error: unknown) =>
        !cancelled &&
        setState({
          key,
          stamp: `${key}#${revision}#${attempt}`,
          data: undefined,
          error: error instanceof Error ? error : new Error(String(error)),
        }),
    );
    return () => {
      cancelled = true;
    };
  }, [key, revision, attempt, repo]);

  if (key === null) return { data: undefined, error: null, loading: false, dataKey: null, retry };
  const sameKey = state.key === key;
  return {
    data: sameKey || keepPrevious ? state.data : undefined,
    dataKey: sameKey || keepPrevious ? state.key : null,
    error: sameKey ? state.error : null,
    loading: state.stamp !== stamp,
    retry,
  };
}

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

/**
 * Debounced (150 ms) student search. `settledQuery` is the query the current
 * `data` answers; only pick from results when it equals what was typed.
 */
export function useStudentSearch(query: string) {
  const debounced = useDebounced(query.trim(), 150);
  const key = debounced ? `search:${debounced}` : null;
  const q = useRepoQuery(key, (repo) => repo.searchStudents(debounced), { keepPrevious: true });
  const settledQuery = q.dataKey?.slice("search:".length) ?? null;
  return {
    ...q,
    settledQuery,
    /** Results match exactly what is in the box right now. */
    current: !q.loading && settledQuery === query.trim() && query.trim() !== "",
  };
}

/** Other students whose names match or nearly match this one. */
export function useLookalikes(student: Student | null) {
  const name = student ? `${student.firstName} ${student.lastName}` : "";
  const q = useRepoQuery(student ? `lookalikes:${student.id}` : null, (repo) =>
    repo.searchStudents(name),
  );
  const others = q.data
    ? [...q.data.exact, ...q.data.similar].filter((s) => s.id !== student?.id)
    : [];
  return { ...q, data: others };
}

export function useStudent(id: string | null) {
  return useRepoQuery(id ? `student:${id}` : null, (repo) => repo.getStudent(id!));
}

export function useStudentLogs(id: string | null) {
  return useRepoQuery(id ? `logs:${id}` : null, (repo) => repo.listLogsForStudent(id!));
}

export function useStudentTotals(id: string | null) {
  return useRepoQuery(id ? `totals:${id}` : null, (repo) => repo.getTotals(id!));
}

export function useRecentLogs(limit = 8) {
  return useRepoQuery(`recent:${limit}`, (repo) => repo.listRecentLogs(limit));
}

/** Resolves with the saved log, or rejects; refreshes all queries on success. */
export function useCreateLog() {
  const { repo, bump, syncMockFlags } = useRepoContext();
  return useCallback(
    async (input: NewLog, student: Student) => {
      try {
        const log = await repo.createLog(input);
        sessionSaved.add({ log, student });
        bump();
        return log;
      } finally {
        syncMockFlags();
      }
    },
    [repo, bump, syncMockFlags],
  );
}

export function useUpdateLog() {
  const { repo, bump, syncMockFlags } = useRepoContext();
  return useCallback(
    async (id: string, patch: LogPatch) => {
      try {
        const log = await repo.updateLog(id, patch);
        sessionSaved.update(log);
        bump();
        return log;
      } finally {
        syncMockFlags();
      }
    },
    [repo, bump, syncMockFlags],
  );
}

export function useSessionSaved() {
  return useSyncExternalStore(
    sessionSaved.subscribe,
    sessionSaved.getSnapshot,
    sessionSaved.getServerSnapshot,
  );
}

/** Null unless the mock data source is active. */
export function useMockControls() {
  const { mock, failNextWrite, syncMockFlags, bump } = useRepoContext();
  if (!mock) return null;
  return {
    failNextWrite,
    setFailNextWrite(on: boolean) {
      mock.setFailNextWrite(on);
      syncMockFlags();
    },
    reset() {
      mock.reset();
      sessionSaved.clear();
      syncMockFlags();
      bump();
    },
  };
}

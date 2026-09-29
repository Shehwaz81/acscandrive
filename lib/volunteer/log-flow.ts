import type { DonationLog, Method, Student } from "./types";
import { sanitizeAmountInput } from "./validation";

/**
 * The log-donation form as one state machine:
 *   idle ──save──▶ saving ──ok──▶ saved
 *                    │
 *                    └─error─▶ failed ──save──▶ saving
 * While saving, every other action is ignored, so a double press or a stray
 * keystroke can't change what is being written or start a second write.
 */

export type LogFlowStatus = "idle" | "saving" | "failed" | "saved";

export type LogFlowState = {
  status: LogFlowStatus;
  student: Student | null;
  method: Method;
  /** Exactly what is in the amount field (sanitized). */
  raw: string;
  /** Validation message shown under the field after a save attempt. */
  fieldError: string | null;
  /** Why the last save failed. */
  saveError: "network" | "conflict" | null;
  /** Stable id for this entry; reused on retry so a lost response can't double-credit. */
  submissionId: string;
  saved: DonationLog | null;
};

export type LogFlowAction =
  | { type: "pickStudent"; student: Student; submissionId: string }
  | { type: "changeStudent"; submissionId: string }
  | { type: "setMethod"; method: Method }
  | { type: "setRaw"; raw: string }
  | { type: "invalid"; message: string }
  | { type: "saveStart" }
  | { type: "saveFailed"; reason: "network" | "conflict" }
  | { type: "saveSucceeded"; log: DonationLog }
  /** After success: clear everything for the next student. */
  | { type: "nextStudent"; submissionId: string }
  /** After success: same student, fresh amount. */
  | { type: "anotherForSame"; submissionId: string };

export function initialLogFlow(submissionId: string): LogFlowState {
  return {
    status: "idle",
    student: null,
    method: "cans",
    raw: "",
    fieldError: null,
    saveError: null,
    submissionId,
    saved: null,
  };
}

export function logFlowReducer(state: LogFlowState, action: LogFlowAction): LogFlowState {
  if (state.status === "saving" && action.type !== "saveFailed" && action.type !== "saveSucceeded") {
    return state;
  }
  switch (action.type) {
    case "pickStudent":
      return { ...initialLogFlow(action.submissionId), student: action.student };
    case "changeStudent":
    case "nextStudent":
      return initialLogFlow(action.submissionId);
    case "anotherForSame":
      return { ...initialLogFlow(action.submissionId), student: state.student };
    case "setMethod":
      if (state.status === "saved" || state.method === action.method) return state;
      return { ...state, method: action.method, fieldError: null };
    case "setRaw":
      if (state.status === "saved") return state;
      return { ...state, raw: sanitizeAmountInput(action.raw), fieldError: null };
    case "invalid":
      return { ...state, fieldError: action.message };
    case "saveStart":
      if (!state.student || state.status === "saved") return state;
      return { ...state, status: "saving", saveError: null, fieldError: null };
    case "saveFailed":
      if (state.status !== "saving") return state;
      return { ...state, status: "failed", saveError: action.reason };
    case "saveSucceeded":
      if (state.status !== "saving") return state;
      return { ...state, status: "saved", saved: action.log, saveError: null };
  }
}

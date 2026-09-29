import { describe, expect, it } from "vitest";
import { initialLogFlow, logFlowReducer as r } from "./log-flow";
import { seedStudents } from "./seed";

const maya = seedStudents()[0];

describe("logFlowReducer", () => {
  it("ignores edits and a second save while saving", () => {
    let s = r(initialLogFlow("a"), { type: "pickStudent", student: maya, submissionId: "b" });
    s = r(s, { type: "setRaw", raw: "12" });
    s = r(s, { type: "saveStart" });
    expect(r(s, { type: "saveStart" })).toBe(s);
    expect(r(s, { type: "setRaw", raw: "99" })).toBe(s);
    expect(r(s, { type: "setMethod", method: "cash" })).toBe(s);
    expect(r(s, { type: "changeStudent", submissionId: "c" })).toBe(s);
  });

  it("keeps values and the submission id after a failure", () => {
    let s = r(initialLogFlow("a"), { type: "pickStudent", student: maya, submissionId: "b" });
    s = r(s, { type: "setMethod", method: "cash" });
    s = r(s, { type: "setRaw", raw: "$15.50" });
    s = r(s, { type: "saveStart" });
    s = r(s, { type: "saveFailed", reason: "network" });
    expect(s).toMatchObject({ status: "failed", method: "cash", raw: "15.50", submissionId: "b" });
    expect(s.student).toBe(maya);
  });

  it("resets to cans and a new id for each student", () => {
    let s = r(initialLogFlow("a"), { type: "pickStudent", student: maya, submissionId: "b" });
    s = r(s, { type: "setMethod", method: "cash" });
    s = r(s, { type: "anotherForSame", submissionId: "c" });
    expect(s).toMatchObject({ method: "cans", raw: "", submissionId: "c", student: maya });
  });
});

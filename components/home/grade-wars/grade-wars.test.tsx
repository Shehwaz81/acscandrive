import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { MockGradeWarsRepository } from "@/lib/grade-wars/mock";
import type { GradeWarsRepository } from "@/lib/grade-wars/repository";
import type { GradeWarsData } from "@/lib/grade-wars/types";
import { GradeWars } from "./grade-wars";

afterEach(cleanup);

const mock = () => new MockGradeWarsRepository();
const NO_DAYS: GradeWarsData = { days: [], results: [] };
const show = (repository: GradeWarsRepository) => render(<GradeWars data={NO_DAYS} repository={repository} />);

async function ranking(date: RegExp) {
  return screen.findByRole("list", { name: date });
}

/** "1st Grade 11 … 420 can-equivalents" per row, in order. */
function rows(list: HTMLElement) {
  return within(list)
    .getAllByRole("listitem")
    .map((li) => li.textContent);
}

describe("GradeWars", () => {
  it("defaults to the latest day with Grade 11 first at 420", async () => {
    show(mock());
    const list = await ranking(/Friday, October 23/);
    await waitFor(() => expect(rows(list)[0]).toMatch(/^1stGrade 11Day winner420/));
    expect(rows(list)[1]).toMatch(/^2ndGrade 9365/);
    expect(screen.getByText("1,340", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Friday, October 23 (latest)" })).toHaveAttribute("aria-pressed", "true");
  });

  it("steps back a day with ← and re-ranks", async () => {
    const user = userEvent.setup();
    show(mock());
    await waitFor(async () => expect(rows(await ranking(/October 23/))[0]).toMatch(/Grade 11/));
    await user.click(screen.getByRole("button", { name: "Previous day" }));
    const list = await ranking(/Thursday, October 22/);
    await waitFor(() => expect(rows(list)[0]).toMatch(/^1stGrade 10Day winner330/));
  });

  it("shows two Tied 1st tags on Oct 20", async () => {
    const user = userEvent.setup();
    show(mock());
    await user.click(await screen.findByRole("button", { name: "Tuesday, October 20" }));
    const list = await ranking(/Tuesday, October 20/);
    await waitFor(() => expect(within(list).getAllByText("Tied 1st")).toHaveLength(2));
    expect(within(list).queryByText("Day winner")).not.toBeInTheDocument();
    expect(rows(list).slice(0, 2).map((r) => r?.slice(0, 3))).toEqual(["1st", "1st"]);
  });

  it("names no winner on the empty Oct 21", async () => {
    const user = userEvent.setup();
    show(mock());
    await user.click(await screen.findByRole("button", { name: "Wednesday, October 21" }));
    // The status card, and the live region announcing it.
    expect(await screen.findAllByText(/no ranking and no winner for this day/)).toHaveLength(2);
    const list = await ranking(/Wednesday, October 21/);
    expect(within(list).getAllByText("No donations recorded")).toHaveLength(4);
    expect(screen.queryByText(/Day winner|Tied 1st|Leading today/)).not.toBeInTheDocument();
  });

  it("moves between chips with arrow keys, Home and End", async () => {
    const user = userEvent.setup();
    show(mock());
    const latest = await screen.findByRole("button", { name: "Friday, October 23 (latest)" });
    expect(latest).toHaveAttribute("tabindex", "0");
    latest.focus();

    await user.keyboard("{ArrowLeft}");
    const thu = screen.getByRole("button", { name: "Thursday, October 22" });
    expect(thu).toHaveFocus();
    expect(thu).toHaveAttribute("aria-pressed", "true");
    expect(latest).toHaveAttribute("tabindex", "-1");

    await user.keyboard("{Home}");
    expect(screen.getByRole("button", { name: "Monday, October 19" })).toHaveFocus();
    await user.keyboard("{End}");
    expect(latest).toHaveFocus();
    await ranking(/Friday, October 23/);
  });

  it("refetches when Try again is pressed after an error", async () => {
    const user = userEvent.setup();
    const inner = mock();
    let calls = 0;
    const flaky: GradeWarsRepository = {
      listCollectionDays: () => inner.listCollectionDays(),
      getDayResult: (id) => (++calls === 1 ? Promise.reject(new Error("down")) : inner.getDayResult(id)),
    };
    show(flaky);
    await user.click(await screen.findByRole("button", { name: "Try again" }));
    const list = await ranking(/October 23/);
    await waitFor(() => expect(rows(list)[0]).toMatch(/Grade 11/));
    expect(calls).toBe(2);
    expect(screen.queryByText("Daily totals unavailable")).not.toBeInTheDocument();
  });

  it("says Leading today, never winner, while the day is in progress", async () => {
    show(new MockGradeWarsRepository({ live: true }));
    const list = await ranking(/October 23/);
    await waitFor(() => expect(within(list).getByText("Leading today")).toBeInTheDocument());
    expect(screen.queryByText("Day winner")).not.toBeInTheDocument();
    expect(screen.getByText("In progress")).toBeInTheDocument();
  });

  it("ignores a late response for a day the visitor already left", async () => {
    const user = userEvent.setup();
    const inner = mock();
    let releaseOld: () => void = () => {};
    const slowFirst: GradeWarsRepository = {
      listCollectionDays: () => inner.listCollectionDays(),
      getDayResult: (id) =>
        id === "2026-10-23"
          ? new Promise((resolve) => {
              releaseOld = () => resolve(inner.getDayResult(id));
            })
          : inner.getDayResult(id),
    };
    show(slowFirst);
    await user.click(await screen.findByRole("button", { name: "Monday, October 19" }));
    const list = await ranking(/Monday, October 19/);
    await waitFor(() => expect(rows(list)[0]).toMatch(/Grade 12/));
    releaseOld();
    await new Promise((r) => setTimeout(r, 0));
    expect(rows(await ranking(/Monday, October 19/))[0]).toMatch(/Grade 12/);
  });

  it("says when Grade Wars starts, not Loading…, before the first collection day", async () => {
    render(<GradeWars data={NO_DAYS} />);
    expect(await screen.findByText("Grade Wars starts Monday, October 5")).toBeInTheDocument();
    // The chip and the four grade rows.
    expect(screen.getAllByText("Not started")).toHaveLength(5);
    expect(screen.queryByText(/Loading/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /October/ })).not.toBeInTheDocument();
  });
});

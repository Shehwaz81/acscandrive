import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type MockScenario, MockStandingsRepository, mockStandingsData } from "@/lib/standings/test-fixtures";
import type { StandingsRepository } from "@/lib/standings/repository";
import type { StandingsData } from "@/lib/standings/types";
import { tableNote } from "./all-time-table";
import { StandingsPage } from "./standings-page";

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/students");
});

function show(scenario: MockScenario = "live", repository: StandingsRepository = new MockStandingsRepository(scenario)) {
  const data: StandingsData | null = scenario === "error" ? null : mockStandingsData(scenario);
  render(<StandingsPage data={data} repository={repository} onRetry={() => {}} />);
  return userEvent.setup();
}

const shelf = () => screen.getByRole("region", { name: /top donors/i });
const cansOnShelf = () => within(shelf()).queryAllByRole("button", { name: /today: .*Open details/ });
/** The phone bar and the desktop card are both in the DOM; either drives the same search. */
const searchBox = () => screen.getAllByRole("combobox", { name: "Find a student" })[0];

describe("today's shelf", () => {
  it("stands the day's top three on the shelf, whatever their all-time rank", () => {
    show();
    const labels = cansOnShelf().map((b) => b.getAttribute("aria-label"));
    expect(labels[0]).toBe("1st today: Maya Reyes, grade 11, homeroom 11A, 46 cans today. Open details.");
    expect(labels).toHaveLength(3 + 4);
    expect(within(shelf()).getByText(/#29 all-time. Not in the top 25, yet!/)).toBeInTheDocument();
    expect(within(shelf()).queryByText(/winner/i)).toBeNull();
  });

  it("draws open spots when only two students have donated", () => {
    show("two");
    expect(cansOnShelf()).toHaveLength(2);
    expect(within(shelf()).getAllByText("Open spot")).toHaveLength(1);
    expect(within(shelf()).getByText("No one yet")).toBeInTheDocument();
  });

  it("ranks no one on an empty day", () => {
    show("none");
    expect(cansOnShelf()).toHaveLength(0);
    expect(within(shelf()).getAllByText("Open spot")).toHaveLength(3);
    expect(within(shelf()).getByText("The shelf’s empty, for now")).toBeInTheDocument();
  });

  it("marks ties and settles nothing", () => {
    show("tie");
    expect(within(shelf()).getAllByText(/2ND · TODAY · TIED/)).toHaveLength(2);
    expect(
      within(shelf()).getByText(
        "Tied on 34 cans today. Shown alphabetically; how ties are settled for lunch vouchers isn’t confirmed.",
      ),
    ).toBeInTheDocument();
    // The third student tied for 2nd is close behind, with the shared rank.
    expect(within(shelf()).getByRole("button", { name: /^Tied 2nd today: Noah Olsen/ })).toBeInTheDocument();
  });
});

describe("when the page's data failed", () => {
  it("says so in both sections and never shows a zero or an empty day", () => {
    show("error");
    expect(screen.getByText("Today’s donations didn’t load")).toBeInTheDocument();
    expect(screen.getByText("The all-time table didn’t load")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Try again" })).toHaveLength(2);
    const text = screen.getByRole("main").textContent ?? "";
    expect(text).not.toMatch(/\b0\b|No one yet|Open spot|empty|No donations/);
  });

  it("still searches: that is a separate request", async () => {
    const user = show("error", new MockStandingsRepository());
    await user.type(searchBox(), "maya");
    expect(await screen.findByRole("option", { name: /Maya Reyes/ })).toBeInTheDocument();
  });
});

describe("the all-time table", () => {
  it("lists the top 25 with ties marked", () => {
    show();
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("button")).toHaveLength(25);
    expect(within(table).getAllByText("TIE")).toHaveLength(2);
    expect(screen.getByText(/^The top 25 of 49 students with recorded donations\./)).toBeInTheDocument();
  });

  it("explains a table longer or shorter than 25", () => {
    const row = (rank: number) => ({ rank }) as StandingsData["allTime"]["rows"][number];
    const rows = [...Array.from({ length: 24 }, (_, i) => row(i + 1)), row(25), row(25), row(25)];
    expect(tableNote(rows, 40)).toMatch(/^27 shown: 3 students are tied for 25th\. The top 25 of 40 students/);
    expect(tableNote([row(1), row(2)], 2)).toMatch(/^All 2 students with recorded donations\./);
  });
});

describe("student details", () => {
  it("open from the shelf and give focus back on Escape", async () => {
    const user = show();
    const can = cansOnShelf()[0];
    await user.click(can);
    const dialog = await screen.findByRole("dialog", { name: "Maya Reyes" });
    expect(await within(dialog).findByText("#29 OF 49 ALL-TIME")).toBeInTheDocument();
    expect(within(dialog).getByText("Outside the all-time top 25; #25 is on 75.")).toBeInTheDocument();
    expect(within(dialog).getByText("#1 of 11 donors today")).toBeInTheDocument();
    expect(within(dialog).getByText("PROVISIONAL RULES")).toBeInTheDocument();
    expect(within(dialog).queryByText(/Eligible|Qualified/)).toBeNull();
    expect(window.location.search).toContain("student=");

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(window.location.search).toBe("");
    await waitFor(() => expect(can).toHaveFocus());
  });

  it("open from the table and mark the row", async () => {
    const user = show();
    const row = within(screen.getByRole("table")).getByRole("button", { name: /Liam Abara/ });
    await user.click(row);
    const dialog = await screen.findByRole("dialog", { name: "Liam Abara" });
    expect(await within(dialog).findByText("#1 OF 49 ALL-TIME")).toBeInTheDocument();
    expect(row).toHaveAttribute("aria-pressed", "true");
    // Last year's cans are all-time, under their own heading, and not in this drive's class total.
    expect(within(dialog).getByText("2025 · outside drive dates")).toBeInTheDocument();
  });

  it("open from search and tell two students with one name apart", async () => {
    const user = show();
    await user.type(searchBox(), "ava mart");
    const options = await screen.findAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual([
      expect.stringMatching(/^Ava MartinSAME NAME.*10C.*151#7 all-time$/),
      expect.stringMatching(/^Ava MartinSAME NAME.*11B/),
      expect.stringMatching(/^Ava Martinez.*No donations recorded$/),
    ]);
    await user.click(options[1]);
    const dialog = await screen.findByRole("dialog", { name: "Ava Martin" });
    expect(await within(dialog).findByText("2 students are named Ava Martin. This one is in 11B.")).toBeInTheDocument();
  });

  it("say 'no donations recorded' instead of a zero and a rank", async () => {
    const user = show();
    await user.type(searchBox(), "martinez");
    await screen.findByRole("option", { name: /Ava Martinez/ });
    await user.keyboard("{Enter}");
    const dialog = await screen.findByRole("dialog", { name: "Ava Martinez" });
    expect(await within(dialog).findByText("No donations recorded")).toBeInTheDocument();
    expect(within(dialog).getByText(/Nothing logged yet\. Donations show up here/)).toBeInTheDocument();
    expect(dialog.textContent).not.toMatch(/#—|#0/);
  });

  it("show a staff member's totals without student rewards", async () => {
    const live = new MockStandingsRepository();
    const ref = mockStandingsData().allTime.rows[0].ref;
    const profile = await live.getStudentProfile(ref);
    const staff = { ...profile, student: { ...profile.student, grade: null, homeroom: "Teachers", teacher: "Teachers" } };
    const user = show("live", { searchStudents: (q) => live.searchStudents(q), getStudentProfile: async () => staff });
    await user.click(within(screen.getByRole("table")).getAllByRole("button", { name: /open details/ })[0]);
    const dialog = await screen.findByRole("dialog");
    expect(await within(dialog).findByText("Staff · Homeroom Teachers · Teachers")).toBeInTheDocument();
    expect(within(dialog).queryByText(/dodgeball/i)).not.toBeInTheDocument();
    expect(within(dialog).queryByText(/dress.down/i)).not.toBeInTheDocument();
  });

  it("page the history ten at a time", async () => {
    const mock = new MockStandingsRepository();
    const repo: StandingsRepository = {
      searchStudents: (q) => mock.searchStudents(q),
      getStudentProfile: async (ref) => {
        const p = await mock.getStudentProfile(ref);
        const history = Array.from({ length: 23 }, (_, i) => ({ ...p.history[0], cans: i + 1, method: "cans" as const }));
        return { ...p, history };
      },
    };
    const user = show("live", repo);
    await user.click(cansOnShelf()[0]);
    const dialog = await screen.findByRole("dialog");
    await user.click(await within(dialog).findByRole("button", { name: "Load more · 13 earlier" }));
    await user.click(within(dialog).getByRole("button", { name: "Load more · 3 earlier" }));
    expect(within(dialog).getByText("That’s everything on record.")).toBeInTheDocument();
    expect(within(dialog).getByText("23 cans")).toBeInTheDocument();
  });

  it("offer a retry when the details fail, and recover", async () => {
    const mock = new MockStandingsRepository();
    const getStudentProfile = vi.fn<StandingsRepository["getStudentProfile"]>((ref) => mock.getStudentProfile(ref));
    getStudentProfile.mockRejectedValueOnce(new Error("down"));
    const user = show("live", { searchStudents: (q) => mock.searchStudents(q), getStudentProfile });
    await user.click(cansOnShelf()[0]);
    const dialog = await screen.findByRole("dialog");
    await user.click(await within(dialog).findByRole("button", { name: "Try again" }));
    expect(await within(dialog).findByText("#29 OF 49 ALL-TIME")).toBeInTheDocument();
  });
});

describe("search", () => {
  it("says when nothing matches and clears", async () => {
    const user = show();
    await user.type(searchBox(), "zz");
    // The phone bar and the desktop card both hold the message; only the focused one is shown.
    expect((await screen.findAllByText("No student matches “zz”")).length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: "Clear search" }));
    expect(searchBox()).toHaveValue("");
    expect(searchBox()).toHaveFocus();
  });

  it("drops a slow answer to an earlier query", async () => {
    const mock = new MockStandingsRepository();
    let releaseSlow = () => {};
    const repo: StandingsRepository = {
      getStudentProfile: (ref) => mock.getStudentProfile(ref),
      searchStudents: async (q) => {
        if (q === "ava") await new Promise<void>((r) => (releaseSlow = r));
        return mock.searchStudents(q);
      },
    };
    const user = show("live", repo);
    await user.type(searchBox(), "ava");
    // Let the debounced "ava" request start before the query changes.
    await new Promise((r) => setTimeout(r, 250));
    await user.clear(searchBox());
    await user.type(searchBox(), "maya");
    await screen.findByRole("option", { name: /Maya Reyes/ });
    releaseSlow();
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([expect.stringMatching(/^Maya Reyes/)]);
  });
});

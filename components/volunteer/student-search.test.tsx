import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MockVolunteerRepository } from "@/lib/volunteer/mock-repository";
import { RepositoryProvider } from "@/lib/volunteer/provider";
import { StudentSearch } from "./student-search";

afterEach(cleanup);

describe("StudentSearch when the roster request fails", () => {
  it("shows a failure (not 'no match'), blocks Enter, and recovers on retry", async () => {
    const student = { id: "7", firstName: "Maya", lastName: "Rodriguez", grade: 11 as const, homeroom: "11A" };
    let failing = true;
    const directory = {
      search: vi.fn(async () => {
        if (failing) throw new Error("network down");
        return { exact: [student], exactTotal: 1, similar: [] };
      }),
      get: async () => student,
    };
    const repo = new MockVolunteerRepository({ latency: { read: [0, 0], write: [0, 0] }, directory });
    const onPick = vi.fn();
    render(
      <RepositoryProvider repo={repo} mock={repo}>
        <StudentSearch onPick={onPick} />
      </RepositoryProvider>,
    );
    const user = userEvent.setup();
    const box = screen.getByRole("combobox", { name: "Find a student" });
    await user.type(box, "maya");

    expect(await screen.findByText("Search isn’t working right now.")).toBeInTheDocument();
    expect(screen.queryByText(/No student matches/)).toBeNull();
    await user.keyboard("{Enter}");
    expect(onPick).not.toHaveBeenCalled();

    failing = false;
    await user.click(screen.getByRole("button", { name: "Search again" }));
    await screen.findByRole("option", { name: /Maya Rodriguez/ });
    expect(screen.queryByText("Search isn’t working right now.")).toBeNull();
    box.focus();
    await waitFor(() => expect(box.getAttribute("aria-activedescendant")).toBeTruthy());
    await user.keyboard("{Enter}");
    expect(onPick).toHaveBeenCalledWith(student);
  });
});

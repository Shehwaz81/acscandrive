import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MockVolunteerRepository } from "@/lib/volunteer/mock-repository";
import { RepositoryProvider } from "@/lib/volunteer/provider";
import { sessionSaved } from "@/lib/volunteer/session-saved";
import { LogFlowView } from "./log-flow-view";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/volunteer/log",
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

let repo: MockVolunteerRepository;

function setup() {
  repo = new MockVolunteerRepository({ latency: { read: [0, 0], write: [5, 5] } });
  render(
    <RepositoryProvider repo={repo} mock={repo}>
      <LogFlowView />
    </RepositoryProvider>,
  );
  return userEvent.setup();
}

beforeEach(() => sessionSaved.clear());
afterEach(cleanup);

async function pickPriya(user: ReturnType<typeof userEvent.setup>) {
  const search = screen.getByRole("combobox", { name: "Find a student" });
  expect(search).toHaveFocus();
  await user.type(search, "priya");
  await screen.findByRole("option", { name: /Priya Singh/ });
  await waitFor(() => expect(search.getAttribute("aria-activedescendant")).toBeTruthy());
  await user.keyboard("{Enter}");
  expect(await screen.findByText("Recording for")).toBeInTheDocument();
}

describe("LogFlowView", () => {
  it("runs the whole entry from the keyboard: search → Enter → amount → Enter → Enter", async () => {
    const user = setup();
    const before = (await repo.listLogsForStudent("s17")).length;
    await pickPriya(user);

    const amount = screen.getByLabelText("How many cans?");
    await waitFor(() => expect(amount).toHaveFocus());
    await user.keyboard("12");
    // The save bar states exactly what will be written.
    expect(
      screen.getByText((_, el) => el?.tagName === "P" && el.textContent === "12 cans for Priya Singh, homeroom 11A"),
    ).toBeInTheDocument();
    await user.keyboard("{Enter}");

    const next = await screen.findByRole("button", { name: /Next student/ });
    expect(screen.getByText("Recorded")).toBeInTheDocument();
    expect(screen.getByText("12 cans", { selector: "p" })).toBeInTheDocument();
    await waitFor(() => expect(next).toHaveFocus());

    await user.keyboard("{Enter}");
    const search = await screen.findByRole("combobox", { name: "Find a student" });
    await waitFor(() => expect(search).toHaveFocus());
    expect(search).toHaveValue("");

    const logs = await repo.listLogsForStudent("s17");
    expect(logs).toHaveLength(before + 1);
    expect(logs[0]).toMatchObject({ method: "cans", cans: 12, cashCents: null });
  });

  it("keeps every value after a failed save, then saves exactly once on retry", async () => {
    const user = setup();
    await pickPriya(user);
    const before = (await repo.listLogsForStudent("s17")).length;

    await waitFor(() => expect(screen.getByLabelText("How many cans?")).toHaveFocus());
    await user.keyboard("$15.50");
    const amount = screen.getByLabelText("How much cash?");
    expect(amount).toHaveValue("15.50");

    act(() => repo.setFailNextWrite(true));
    await user.keyboard("{Enter}");

    const alert = await screen.findByText(/Not saved — nothing was recorded/);
    expect(alert.closest("[role=alert]")).toHaveTextContent("$15.50 for Priya Singh is still filled in");
    const retry = screen.getByRole("button", { name: /Try saving again/ });
    await waitFor(() => expect(retry).toHaveFocus());
    expect(screen.getByLabelText("How much cash?")).toHaveValue("15.50");
    expect(screen.getByRole("radio", { name: /Cash/ })).toHaveAttribute("aria-checked", "true");
    expect(screen.queryByText("Recorded")).toBeNull();
    expect(await repo.listLogsForStudent("s17")).toHaveLength(before);

    // Two quick presses must still produce one log.
    await user.keyboard("{Enter}{Enter}");
    await screen.findByRole("button", { name: /Next student/ });
    const after = await repo.listLogsForStudent("s17");
    expect(after).toHaveLength(before + 1);
    expect(after[0]).toMatchObject({ method: "cash", cashCents: 1550, cans: null });
  });

  it("validates on save and moves focus to the field", async () => {
    const user = setup();
    await pickPriya(user);
    await waitFor(() => expect(screen.getByLabelText("How many cans?")).toHaveFocus());
    await user.keyboard("2.5{Enter}");
    expect(await screen.findByText("Cans are counted in whole numbers — no decimals.")).toBeInTheDocument();
    const amount = screen.getByLabelText("How many cans?");
    expect(amount).toHaveAttribute("aria-invalid", "true");
    expect(amount).toHaveFocus();
    await user.keyboard("{Backspace}");
    expect(screen.queryByText("Cans are counted in whole numbers — no decimals.")).toBeNull();
  });
});

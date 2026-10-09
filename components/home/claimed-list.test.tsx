import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicClaim } from "@/lib/claims";
import { ClaimedList, PREVIEW } from "./claimed-list";

afterEach(cleanup);

// jsdom doesn't implement scrolling.
const scrollBy = vi.fn();
beforeEach(() => {
  scrollBy.mockClear();
  window.scrollBy = scrollBy;
});

/** Fictional claims, already A to Z like the API returns them. */
const claims = (n: number): PublicClaim[] =>
  Array.from({ length: n }, (_, i) => ({
    placeId: `place-${i + 1}`,
    address: `${String(i + 1).padStart(3, "0")} Sample Street, Windsor`,
    lat: 42.3,
    lng: -83,
    claimer: "Avery T. (9A)",
  }));

const streets = () =>
  within(screen.getByRole("list"))
    .getAllByRole("listitem")
    .map((li) => li.textContent);

describe("ClaimedList", () => {
  it("shows only the first streets of a long list, with the total on the button", () => {
    render(<ClaimedList claims={claims(40)} failed={false} />);
    expect(streets()).toHaveLength(PREVIEW);
    expect(streets()[0]).toMatch(/^001 Sample Street/);
    expect(streets()[PREVIEW - 1]).toMatch(/^006 Sample Street/);
    expect(screen.getByRole("button", { name: "See all 40 streets" })).toHaveAttribute("aria-expanded", "false");
  });

  it("lists every street on See all and moves focus to the first one revealed", async () => {
    const user = userEvent.setup();
    render(<ClaimedList claims={claims(40)} failed={false} />);
    await user.click(screen.getByRole("button", { name: "See all 40 streets" }));

    expect(streets()).toHaveLength(40);
    expect(streets()[39]).toMatch(/^040 Sample Street/);
    expect(document.activeElement).toHaveTextContent(/^007 Sample Street/);
    const button = screen.getByRole("button", { name: "See fewer streets" });
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(button).toHaveAttribute("aria-controls", screen.getByRole("list").id);
  });

  it("folds back on See fewer, keeping focus on the button and the page where it was", async () => {
    const user = userEvent.setup();
    render(<ClaimedList claims={claims(40)} failed={false} />);
    await user.click(screen.getByRole("button", { name: "See all 40 streets" }));
    expect(scrollBy).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "See fewer streets" }));

    expect(streets()).toHaveLength(PREVIEW);
    expect(screen.getByRole("button", { name: "See all 40 streets" })).toHaveFocus();
    expect(scrollBy).toHaveBeenCalledOnce();
  });

  it("works from the keyboard", async () => {
    const user = userEvent.setup();
    render(<ClaimedList claims={claims(12)} failed={false} />);
    await user.tab();
    expect(screen.getByRole("button", { name: "See all 12 streets" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(streets()).toHaveLength(12);
    // From the first revealed street, Tab reaches the button at the end of the list.
    await user.tab();
    expect(screen.getByRole("button", { name: "See fewer streets" })).toHaveFocus();
  });

  it.each([1, PREVIEW, PREVIEW + 2])("shows a list of %i whole, with no button", (n) => {
    render(<ClaimedList claims={claims(n)} failed={false} />);
    expect(streets()).toHaveLength(n);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("collapses once the button would hide three streets", () => {
    render(<ClaimedList claims={claims(PREVIEW + 3)} failed={false} />);
    expect(streets()).toHaveLength(PREVIEW);
    expect(screen.getByRole("button", { name: `See all ${PREVIEW + 3} streets` })).toBeInTheDocument();
  });

  it("keeps the list open when a claim is added or deleted", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<ClaimedList claims={claims(40)} failed={false} />);
    await user.click(screen.getByRole("button", { name: "See all 40 streets" }));
    rerender(<ClaimedList claims={claims(41)} failed={false} />);
    expect(streets()).toHaveLength(41);
    rerender(<ClaimedList claims={claims(39)} failed={false} />);
    expect(streets()).toHaveLength(39);
  });

  it("says so while loading, when empty and when the list failed to load", () => {
    const { rerender } = render(<ClaimedList claims={null} failed={false} />);
    expect(screen.getByText("Loading…")).toBeInTheDocument();
    rerender(<ClaimedList claims={[]} failed={false} />);
    expect(screen.getByText("No streets claimed yet. Be the first.")).toBeInTheDocument();
    rerender(<ClaimedList claims={[]} failed />);
    expect(screen.getByText(/Claimed streets couldn't load/)).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });
});

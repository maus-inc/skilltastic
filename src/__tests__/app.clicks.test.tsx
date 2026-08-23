import { describe, expect, it } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@testing-library/react";
import App from "../App";

/**
 * Click-through smoke test for the browser-preview mode: mounts the real
 * App against the fixture invoke layer and clicks the primary flows.
 * Regression guard for "it disappears / does nothing when I click".
 */

async function boot() {
  render(<App />);
  await waitFor(() => expect(screen.getAllByText("code-review").length).toBeGreaterThan(0));
}

/** Sidebar rows share labels with the topbar <h1> and title-bar tabs —
 *  scope clicks to the actual nav item. */
function getSidebarRow(label: string): HTMLElement {
  const rows = Array.from(document.querySelectorAll<HTMLElement>(".sidebar .nav-item"));
  const hit = rows.find((r) => r.textContent?.includes(label));
  if (!hit) throw new Error(`sidebar row not found: ${label}`);
  return hit;
}

describe("app click flows (preview mode)", () => {
  it("boots and shows the skill list", async () => {
    await boot();
    expect(screen.getAllByText("code-review").length).toBeGreaterThan(0);
    expect(screen.getAllByText("commit-style").length).toBeGreaterThan(0);
  });

  it("clicking a card opens the editor; closing returns to the list", async () => {
    const user = userEvent.setup();
    await boot();
    await user.click(screen.getAllByText("code-review")[0]);
    await waitFor(() =>
      expect(screen.getByText("code-review / SKILL.md")).toBeTruthy(),
    );
    // list stays mounted behind the modal
    expect(screen.getAllByText("commit-style").length).toBeGreaterThan(0);
    // Escape closes the modal (title-bar window controls share the
    // "close" accessible name, so keyboard out instead of clicking it)
    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByText("code-review / SKILL.md")).toBeNull(),
    );
  });

  it("clicking a switch toggles the skill and the card stays visible", async () => {
    const user = userEvent.setup();
    await boot();
    const toggle = screen.getByLabelText("disable code-review");
    const cardBefore = toggle.closest(".skill-card");
    await user.click(toggle);
    // the card must survive its own toggle (ids move to .disabled on the
    // backend; the list has to keep showing the skill)
    await waitFor(() => expect(screen.getByLabelText("enable code-review")).toBeTruthy());
    expect(screen.getAllByText("code-review").length).toBeGreaterThan(0);
    // ...as the SAME DOM node — a remount plays the exit animation and
    // reads as the skill disappearing
    const cardAfter = screen.getByLabelText("enable code-review").closest(".skill-card");
    expect(cardAfter).toBe(cardBefore);
    await user.click(screen.getByLabelText("enable code-review"));
    await waitFor(() => expect(screen.getByLabelText("disable code-review")).toBeTruthy());
  });

  it("clicking a sidebar tool filters the list without blanking it", async () => {
    const user = userEvent.setup();
    await boot();
    await user.click(getSidebarRow("Cursor"));
    await waitFor(() => expect(screen.getAllByText("tests-first").length).toBeGreaterThan(0));
    // claude-only skills are filtered out, not everything (wait for the
    // exit animation to finish removing the node)
    await waitFor(() => expect(screen.queryByText("code-review")).toBeNull());
  });

  it("new skill button opens the create modal", async () => {
    const user = userEvent.setup();
    await boot();
    // title-bar "+" and topbar button share the label — either opens it
    await user.click(screen.getAllByLabelText("new skill")[0]);
    await waitFor(() => expect(screen.getByText("create & edit")).toBeTruthy());
  });

  it("add project opens the picker without looping", async () => {
    const user = userEvent.setup();
    await boot();
    await user.click(screen.getByText("+ add project"));
    await waitFor(() => expect(screen.getByText("add project")).toBeTruthy());
    // the opt-in consent screen (fixture starts with no saved detection)
    await waitFor(() =>
      expect(screen.getByText(/Choose a folder yourself/)).toBeTruthy(),
    );
  });

  it("all-skills home click returns to the full list", async () => {
    const user = userEvent.setup();
    await boot();
    await user.click(getSidebarRow("Cursor"));
    await waitFor(() => expect(screen.queryByText("code-review")).toBeNull());
    await user.click(getSidebarRow("all skills"));
    await waitFor(() => expect(screen.getAllByText("code-review").length).toBeGreaterThan(0));
  });

  it("delete flow: editor delete removes the card for good", async () => {
    const user = userEvent.setup();
    await boot();
    await user.click(screen.getAllByText("commit-style")[0]);
    await waitFor(() => expect(screen.getByText("commit-style / SKILL.md")).toBeTruthy());
    await user.click(screen.getByText("delete"));
    // the editor closes and the card is gone everywhere
    await waitFor(() => expect(screen.queryByText("commit-style / SKILL.md")).toBeNull());
    await waitFor(() => expect(screen.queryByText("commit-style")).toBeNull());
  });

  it("edit + save flow round-trips content", async () => {
    const user = userEvent.setup();
    await boot();
    await user.click(screen.getAllByText("docs-sync")[0]);
    await waitFor(() => expect(screen.getByText("docs-sync / SKILL.md")).toBeTruthy());
    await user.click(screen.getByText("edit"));
    // scope to the editor's textarea — the topbar search is also a textbox
    const box = document.querySelector(".modal textarea") as HTMLTextAreaElement;
    expect(box).toBeTruthy();
    await user.clear(box);
    await user.type(box, "# rewritten");
    await user.click(screen.getByText("save"));
    // saving lands back in view mode: the morph button reads "edit" again
    await waitFor(() => expect(screen.getByText("edit")).toBeTruthy());
  });

  it("create flow: submit opens the editor with the new skill", async () => {
    const user = userEvent.setup();
    await boot();
    await user.click(screen.getAllByLabelText("new skill")[0]);
    await waitFor(() => expect(screen.getByText("create & edit")).toBeTruthy());
    // name input + description textarea live in the modal; the topbar
    // search is also a textbox, so scope to the modal
    const modal = document.querySelector(".create-modal") as HTMLElement;
    const name = within(modal).getByPlaceholderText("my-skill");
    const desc = within(modal).getAllByRole("textbox").find((el) => el.tagName === "TEXTAREA")!;
    await user.type(name, "smoke-skill");
    await user.type(desc, "created by the click smoke test");
    await user.click(within(modal).getByText("create & edit"));
    await waitFor(() => expect(screen.getByText("smoke-skill / SKILL.md")).toBeTruthy());
    // and it joins the global list behind the modal
    expect(screen.getAllByText("smoke-skill").length).toBeGreaterThan(1);
  });

  it("opening a project shows its own skills; forget returns home", async () => {
    const user = userEvent.setup();
    await boot();
    await user.click(getSidebarRow("skilltastic"));
    await waitFor(() => expect(screen.getAllByText("ci-checklist").length).toBeGreaterThan(0));
    // global-only skills are not in the project view
    expect(screen.queryByText("code-review")).toBeNull();
    await user.click(screen.getByText("forget project"));
    await waitFor(() => expect(screen.getAllByText("code-review").length).toBeGreaterThan(0));
  });

  it("list ⇄ cards view toggle keeps every skill visible", async () => {
    const user = userEvent.setup();
    await boot();
    const before = screen.getAllByText(/./).length; // anything rendered
    await user.click(screen.getByLabelText("card view"));
    // cards mode renders the same skills in the grid
    await waitFor(() => expect(document.querySelector(".skill-list--cards")).toBeTruthy());
    expect(screen.getAllByText("code-review").length).toBeGreaterThan(0);
    expect(screen.getAllByText("tests-first").length).toBeGreaterThan(0);
    await user.click(screen.getByLabelText("list view"));
    await waitFor(() => expect(document.querySelector(".skill-list--cards")).toBeNull());
    expect(screen.getAllByText("code-review").length).toBeGreaterThan(0);
    expect(before).toBeGreaterThan(0);
  });

  it("pin buttons toggle without dropping their row", async () => {
    const user = userEvent.setup();
    await boot();
    await user.click(screen.getByLabelText("pin Cursor"));
    await waitFor(() => expect(screen.getByLabelText("unpin Cursor")).toBeTruthy());
    expect(getSidebarRow("Cursor")).toBeTruthy();
    await user.click(screen.getByLabelText("unpin Cursor"));
    await waitFor(() => expect(screen.getByLabelText("pin Cursor")).toBeTruthy());
  });
});

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

  it("clicking a card opens an editor tab; closing the tab returns to the list", async () => {
    const user = userEvent.setup();
    await boot();
    await user.click(screen.getAllByText("code-review")[0]);
    // the workbench opens as a title-bar tab with a breadcrumb
    await waitFor(() => expect(document.querySelector(".ed-crumb-title")?.textContent).toContain("code-review"));
    expect(screen.getByLabelText("close code-review")).toBeTruthy();
    await user.click(screen.getByLabelText("close code-review"));
    await waitFor(() =>
      expect(document.querySelector(".ed-crumb-title")).toBeNull(),
    );
    expect(screen.getAllByText("code-review").length).toBeGreaterThan(0);
  }, 15000);

  it("editor: chrome renders — status, live preview, palette actions, clean close", async () => {
    // (dispatching whole-doc replacements through CodeMirror is not
    // reliable in jsdom; the dirty/save/guard path is exercised in the
    // real browser — here we assert the workbench chrome)
    const user = userEvent.setup();
    await boot();
    await user.click(screen.getAllByText("docs-sync")[0]);
    await waitFor(() =>
      expect(document.querySelector(".ed-crumb-title")?.textContent).toContain("docs-sync"),
    );
    expect(screen.getByText("saved")).toBeTruthy();
    expect(screen.getByText(/Ln 1, Col 1/)).toBeTruthy();
    // live preview renders the skill body
    await waitFor(() =>
      expect(document.querySelector(".ed-preview")?.textContent).toContain("Keep docs in sync"),
    );
    // the palette offers editor actions while an editor tab is active
    await user.click(screen.getByLabelText("menu"));
    await waitFor(() => expect(document.querySelector(".cmd")).toBeTruthy());
    expect(within(document.querySelector(".cmd") as HTMLElement).getByText("save skill")).toBeTruthy();
    await user.keyboard("{Escape}");
    // a clean tab closes without the unsaved guard
    await user.click(screen.getByLabelText("close docs-sync"));
    await waitFor(() => expect(document.querySelector(".ed-crumb-title")).toBeNull());
  }, 15000);

  it("clicking a switch toggles the skill and the card stays visible", async () => {
    const user = userEvent.setup();
    await boot();
    const toggle = screen.getByLabelText("disable code-review");
    const cardBefore = toggle.closest(".skill-card");
    expect(cardBefore).not.toBeNull();
    await user.click(toggle);
    // the card must survive its own toggle (ids move to .disabled on the
    // backend; the list has to keep showing the skill)
    await waitFor(() => expect(screen.getByLabelText("enable code-review")).toBeTruthy());
    expect(screen.getAllByText("code-review").length).toBeGreaterThan(0);
    // ...as the SAME DOM node — a remount plays the exit animation and
    // reads as the skill disappearing
    const cardAfter = screen.getByLabelText("enable code-review").closest(".skill-card");
    expect(cardAfter).not.toBeNull();
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

  it("delete flow: arming then cancelling keeps everything", async () => {
    const user = userEvent.setup();
    await boot();
    await user.click(screen.getAllByText("commit-style")[0]);
    await waitFor(() => expect(document.querySelector(".ed-crumb-title")?.textContent).toContain("commit-style"));
    await user.click(screen.getByLabelText("delete"));
    // armed: the way out is visible and the skill is untouched
    await waitFor(() => expect(screen.getByLabelText(/cancel — \d+ seconds/)).toBeTruthy());
    await user.click(screen.getByLabelText(/cancel — \d+ seconds/));
    await waitFor(() => expect(screen.getByLabelText("delete")).toBeTruthy());
    expect(document.querySelector(".ed-crumb-title")?.textContent).toContain("commit-style");
  }, 15000);

  it("delete flow: expiry reveals the execute button; clicking it deletes", async () => {
    const user = userEvent.setup();
    await boot();
    await user.click(screen.getAllByText("commit-style")[0]);
    await waitFor(() => expect(document.querySelector(".ed-crumb-title")?.textContent).toContain("commit-style"));
    await user.click(screen.getByLabelText("delete"));
    await waitFor(() => expect(screen.getByLabelText(/cancel — \d+ seconds/)).toBeTruthy());
    // expiry never commits by itself — it reveals the explicit execute button
    await waitFor(() => expect(screen.getByLabelText("confirm delete")).toBeTruthy(), {
      timeout: 9000,
    });
    await user.click(screen.getByLabelText("confirm delete"));
    await waitFor(() => expect(document.querySelector(".ed-crumb-title")).toBeNull());
    await waitFor(() => expect(screen.queryByText("commit-style")).toBeNull());
  }, 15000);

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
    await waitFor(() => expect(document.querySelector(".ed-crumb-title")?.textContent).toContain("smoke-skill"));
    // and it joins the global list behind the modal
    await waitFor(() => expect(screen.getAllByText("smoke-skill").length).toBeGreaterThan(0));
  });

  it("opening a project shows its own skills; forget returns home", async () => {
    const user = userEvent.setup();
    await boot();
    await user.click(getSidebarRow("skilltastic"));
    await waitFor(() => expect(screen.getAllByText("ci-checklist").length).toBeGreaterThan(0));
    // global-only skills are not in the project view
    expect(screen.queryByText("code-review")).toBeNull();
    await user.click(screen.getByLabelText("forget project"));
    await waitFor(() => expect(screen.getByLabelText(/keep project — \d+ seconds/)).toBeTruthy());
    // countdown ends on the explicit execute button; clicking it forgets
    await waitFor(() => expect(screen.getByLabelText("confirm forget project")).toBeTruthy(), {
      timeout: 9000,
    });
    await user.click(screen.getByLabelText("confirm forget project"));
    await waitFor(() => expect(screen.getAllByText("code-review").length).toBeGreaterThan(0), {
      timeout: 5000,
    });
  }, 20000);

  it("command menu: pointer click dips before the view opens", async () => {
    const user = userEvent.setup();
    await boot();
    await user.click(screen.getByLabelText("menu"));
    await waitFor(() => expect(document.querySelector(".cmd")).toBeTruthy());
    const menu = document.querySelector(".cmd") as HTMLElement;
    await user.click(within(menu).getByText("Cursor"));
    // the press dip plays first — the menu is still open right after the
    // click, and the row carries the pressed state
    expect(document.querySelector(".cmd-item.pressed")).toBeTruthy();
    // ...then the action lands: a tab opens and the menu closes
    await waitFor(() => expect(document.querySelector(".tb-tab")).toBeTruthy(), {
      timeout: 2000,
    });
    await waitFor(() => expect(document.querySelector(".cmd")).toBeNull());
  }, 10000);

  it("empty project view reads identically in card mode", async () => {
    const user = userEvent.setup();
    await boot();
    // add a project with no skills (browse stand-in yields "playground")
    await user.click(getSidebarRow("+ add project"));
    await waitFor(() => expect(screen.getByText("browse folders…")).toBeTruthy());
    await user.click(screen.getByText("browse folders…"));
    await waitFor(() => expect(screen.getByText(/No skills found/)).toBeTruthy());
    expect(
      (document.querySelector(".skill-list") as HTMLElement).classList.contains(
        "skill-list--cards",
      ),
    ).toBe(false);
    await user.click(screen.getByLabelText("card view"));
    // the empty state must not rearrange into the card grid
    expect(
      (document.querySelector(".skill-list") as HTMLElement).classList.contains(
        "skill-list--cards",
      ),
    ).toBe(false);
    expect(screen.getByText(/No skills found/)).toBeTruthy();
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

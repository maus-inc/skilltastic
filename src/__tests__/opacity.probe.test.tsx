import { it, expect } from "vitest";
import React from "react";
import { MotionConfig } from "motion/react";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@testing-library/react";
import App from "../App";

/** Probe: do motion-animated controls get stuck invisible (opacity 0)
 *  after real interactions? jsdom applies inline styles to
 *  getComputedStyle, so a stuck motion write shows up here. */

function opacities(el: Element | null): string {
  if (!el) return "missing";
  const cs = getComputedStyle(el);
  return `computed=${cs.opacity} inline=${(el as HTMLElement).style.opacity}`;
}

it("opacity probe: switch, card, new-skill button after full interaction cycle", async () => {
  const user = userEvent.setup();
  // boot EXACTLY like main.tsx does: StrictMode + MotionConfig reducedMotion="user"
  render(
    <React.StrictMode>
      <MotionConfig reducedMotion="user">
        <App />
      </MotionConfig>
    </React.StrictMode>,
  );
  await waitFor(() => expect(screen.getAllByText("code-review").length).toBeGreaterThan(0));

  const card = screen.getAllByText("code-review")[0].closest(".skill-card")!;
  const toggle = screen.getByLabelText("disable code-review");
  const newSkill = screen.getAllByLabelText("new skill").find(
    (el) => el.classList.contains("wm-btn"),
  )!;

  console.log("BEFORE  card:", opacities(card), "| switch:", opacities(toggle), "| newskill:", opacities(newSkill));

  // toggle the switch
  await user.click(toggle);
  await waitFor(() => expect(screen.getByLabelText("enable code-review")).toBeTruthy());
  const card2 = screen.getAllByText("code-review")[0].closest(".skill-card")!;
  const toggle2 = screen.getByLabelText("enable code-review");
  console.log("AFTER TOGGLE  card:", opacities(card2), "| switch:", opacities(toggle2));

  // open the create modal and close it
  await user.click(newSkill);
  await waitFor(() => expect(screen.getByText("create & edit")).toBeTruthy());
  console.log(
    "MODAL OPEN  modal:", opacities(document.querySelector(".modal-overlay")),
    "| modal box:", opacities(document.querySelector(".modal")),
    "| cancel-ish ghost btns:",
    Array.from(document.querySelectorAll(".modal .wm-btn")).map((b) => `${b.textContent}:${opacities(b)}`).join(" , "),
  );
  await user.keyboard("{Escape}");
  await waitFor(() => expect(screen.queryByText("create & edit")).toBeNull());

  console.log("AFTER CLOSE  newskill:", opacities(newSkill), "| card:", opacities(card2), "| switch:", opacities(toggle2));

  // let any pending animation frames flush
  await new Promise((r) => setTimeout(r, 400));
  console.log(
    "FLUSHED  newskill:", opacities(newSkill),
    "| card:", opacities(card2),
    "| switch:", opacities(screen.getByLabelText("enable code-review")),
  );
});

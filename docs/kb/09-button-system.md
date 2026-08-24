# 09 — Button System

Ported 1:1 in structure from **Watermelon UI's button** (shadcn-style CVA
component, fetched from `registry.watermelon.sh/r/button.json`; the numbered
`button-N` registry items are usage demos of this one base). Rebuilt as a
plain-CSS + motion component at `src/components/ui/Button.tsx`; classes are
`.wm-btn`, `.wm-btn--<variant>`, `.wm-btn--<size>` in `App.css`.

Use `<Button>` for every action control. Raw `<button>` is allowed only for
app chrome with bespoke behaviour: title-bar controls/tabs (`tb-*`),
sidebar pins (`pin-btn`), sort toggle, and the Switch.

## Variants (6 — same contract as the source)

| Variant | Source (shadcn dark) | Our mono mapping | Use for |
| --- | --- | --- | --- |
| `default` | `bg-primary`, `primary-foreground` text, hover /90 | white bg, black text, hover 90% | the one primary action per surface (save, create, new skill) |
| `destructive` | `bg-destructive/60` dark, white text, red focus ring | `--danger` at 60%, white text, red ring | delete skill, forget project |
| `outline` | border + `bg-input/30`, hover `bg-input/50`, shadow-xs | hairline border, 3% white bg, hover 8%, contact shadow | normal actions (browse, rescan) |
| `secondary` | `bg-secondary`, hover /80 | 12% white bg, hover dims to 9% | selected/toggled state of a mode button |
| `ghost` | transparent, hover `bg-accent` | transparent, hover 8% white | low-emphasis (cancel, close ×) |
| `link` | text-primary, underline on hover | white text, underline on hover | inline navigation only |

## Sizes (compact-scaled)

The source scale (36/32/40px) is desktop-web sized; ours is scaled to the
phase-2 compact density while keeping the same ratios and names:

| Size | Source | Ours | Notes |
| --- | --- | --- | --- |
| `sm` | h-8, px-3, gap 1.5 | **24px**, px-10, gap 5, 11.5px text | the workhorse in this app |
| `default` | h-9, px-4 | **28px**, px-12, gap 6, 12px text | modals' primary row |
| `lg` | h-10, px-6 | **32px**, px-16, gap 6, 12.5px text | rare; empty-state CTAs |
| `icon-sm` / `icon` / `icon-lg` | 32/36/40 square | **24/28/32** square | icon-only; give `aria-label` |

Icon sizing follows the source's `[&_svg]:size-4` rule scaled down: svgs
default to 14px inside buttons and don't shrink.

## Shared behaviour (from the source, all variants)

- `inline-flex items-center justify-center`, no text wrap, 6px radius
- `disabled`: 50% opacity + pointer-events none
- `focus-visible`: 3px ring — white at 35% normally, danger at 40% on
  destructive (source: `ring-ring/50`, `ring-destructive/40`)
- `aria-invalid`: danger border + danger ring
- motion: `whileTap` scale 0.97 spring (our substitute for the source's
  `transition-all`; transforms stay motion-owned per the motion rule)
- edge light: dark variants (outline/secondary, ghost on hover,
  destructive) carry a top white inset streak; `default` (white)
  carries `--streak-black` — the inset bottom shade. See the streak
  entry in 03-frontend.md.

## Mapping table (what replaced what)

| Surface | Old class | Now |
| --- | --- | --- |
| Topbar "new skill" | `.btn` | `default` / `sm` (btn-morph) |
| Topbar "forget project" | `.icon-btn danger` | `TimedUndoAction` (arm → countdown → commit) |
| Modal close × | `.icon-btn square` | `ghost` / `icon-sm` |
| Editor: edit-mode toggle | `.btn active` | active → `secondary`, idle → `outline` (btn-morph) |
| Editor: delete | `.btn danger` | `TimedUndoAction` (arm → countdown → commit) |
| Editor: view (cancel) | `.btn` | `ghost` / `sm` |
| Editor: save | `.btn primary` | `default` / `sm` |
| Add-project: rescan/browse | `.btn` | `outline` / `sm` |
| Create-skill: submit | `.btn` | `default` / `sm` |

`.btn` and `.icon-btn` are removed; don't reintroduce them.

## Press dip (pointer feedback)

Every `Button` and every `CommandMenu` entry plays a 200ms in-out press
dip on POINTER clicks before the action runs — the WHOLE button dips
(`translateY(1px) scale(0.96)` and back), not just its label, so the
press is seen before the consequence. Keyboard activation
(`e.detail === 0`) acts instantly with no animation; reduced motion
drops the dip. The old `whileTap` spring left Button for this — one
transform owner per element. The `default` variant additionally carries
a cast shadow (`0 4px 12px`) so raised primary actions read with depth.

## Destructive confirmation: `TimedUndoAction`

Destructive actions never use `window.confirm` and never fire on a single
click. `ui/TimedUndoAction.tsx` (the Watermelon `time-undo-action` pattern,
restyled to these tokens) is the only confirmation UX:

- **rest:** solid destructive fill (`wm-btn--destructive` colors/streak),
  24px height, 7px radius, center-aligned — reads as a plain destructive
  button; hover morphs the label into `hoverIcon` like every action button.
- **armed (first click):** the control springs wider; fill drops to a
  danger tint with a danger border, and `[undo mark][label][countdown]`
  appear center-aligned with the per-character spring stagger (no blur
  filters — perf contract). The countdown chip is mono tabular-nums on
  the destructive fill. Clicking it cancels back to rest.
- **ready (countdown finished):** the control collapses to an
  icon-only `[trash]` execute button — the label would only soften the
  moment. It's a bright surface, so it carries the full depth
  treatment: top white streak, inset bottom shade + dark ring
  (streak-black), contact + cast shadows. Only clicking it commits.
  Escape or an outside press disarms from armed/ready; unmount/teardown
  never commits (closing a modal is not consent).
- Width animates via a measured spring (`react-use-measure`); this is the
  one sanctioned width animation (stateful expand, not a hover morph).
- `useSkillMutations.remove` executes only; confirmation lives in the UI
  component that calls it.

New destructive surface = wrap it in `TimedUndoAction`; do not add
`confirm()` dialogs.

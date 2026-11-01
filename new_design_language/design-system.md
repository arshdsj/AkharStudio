# Script Editor — Design System

Dark, dense, desktop-first. Modelled on the structure and discipline of professional Adobe tools (layered tokens, surface hierarchy by lightness, one control height, one accent), not on their look.

Files: `tokens.css` (values) · `components.css` (primitives) · `reference.html` (live specimen) · `design-rules.md` (rules for coding agents).

---

## 1. Audit of the current UI

### Why it reads as "generated"
1. **Boxes inside boxes.** Language card sits in a bordered container, which holds bordered cards. Paper format: bordered container holding a segmented control. Export dialog: a bordered "Certified screenplay PDF" card holding bordered option cards, plus three more bordered tiles below. Every group is outlined, so nothing is more important than anything else.
2. **Border as the default tool.** Structure is drawn with 1px outlines instead of being created by spacing and surface lightness. Result: visual noise and no depth.
3. **Settings rows are outlined buttons.** Five full-width bordered buttons with chevrons look like a form of buttons, not a navigable list.
4. **Four heading styles in one panel.** "PANEL & SETTINGS" (icon + caps), "LANGUAGE / ਭਾਸ਼ਾ" (icon + caps + right-aligned meta), "APP SETTINGS" (caps, no icon), "Default Paper Format" (sentence case). Scenes uses a fifth ("SCENE OUTLINE" + count).
5. **Selection is expressed three ways**: filled pill (tabs), tick + lighter fill (language, paper), dimmed text (A4, which looks disabled).
6. **The primary action looks disabled.** "Export PDF" is a flat mid-grey button, indistinguishable from an inactive control. There is no accent anywhere, so nothing signals "do this".
7. **Native controls leak through**: the CONT'D `<select>` and the blue checkbox are browser defaults on an otherwise custom surface.
8. **Several radii and several sizes** (large 12-ish cards, ~8 inputs, pill tabs) and control heights vary from ~30 to ~60px with no rule.
9. **Redundant decoration**: icons on section headers, a "Gurmukhi" tag repeating what the selected card already says, a dashed/outlined empty-state container.

### Layout inconsistencies (the one you flagged, and others)
- **Panel changes size between tabs.** Settings and Scenes are different heights because the panel is sized by its content. The tab strip also changes width and fill between views (the "Language & Settings" tab is wide, "Scenes" narrower; the selected pill moves).
- **Tab label length drives layout.** "Language & Settings" is long enough to dominate the strip. Tabs need equal width and short names.
- **Inner padding differs**: header, tab strip, and sections do not share a left edge.
- **Empty state is a small box** instead of occupying the available space.

---

## 2. Design language

**Principles**
1. **Surface over stroke.** Hierarchy comes from lightness steps and spacing. Lines are the exception.
2. **One of everything.** One control height, one accent hue, three radii, one grid, one selection treatment.
3. **Content first.** The script page is the hero; panels are quiet, slightly lighter than the canvas, with low-contrast chrome.
4. **Same shell, different content.** Navigation changes content, never container geometry.

### Surfaces (dark)
| Token | Value | Use |
|---|---|---|
| `--surface-canvas` | #161616 | Editor "desk" behind the page |
| `--surface-sunken` | #1a1a1a | Inset tracks (segmented control) |
| `--surface-chrome` | #1e1e1e | Top bar, status bar |
| `--surface-panel` | #232323 | Side panels |
| `--surface-control` | #2d2d2d | Inputs, secondary buttons |
| `--surface-hover` / `-pressed` | #363636 / #3e3e3e | Interaction states |
| `--surface-overlay` | #2a2a2a | Dialogs, menus (+ shadow) |

Order from back to front: canvas → chrome → panel → control → overlay. Each step is visibly different without a border.

### Colour
- Text: primary `#ececec`, secondary `#a1a1a1` (6:1 on panel), disabled/placeholder `#767676` (only for disabled and placeholder text).
- **One accent**, blue: fill `#336adb` (white text 5:1), accent text/focus `#6e9bff`. Used only for: the primary button, the active-tab underline, checked checkboxes, the focus ring. If a screen has more than one accent-filled thing, one is wrong.
- Semantic red/green exist as primitives for errors/success; do not use them decoratively.

### Lines (the only three allowed)
1. **Separator**, `rgba(255,255,255,.08)` — under tab strip, above dialog footer, in menus.
2. **Edge highlight**, 1px inner top on floating surfaces.
3. **Focus ring**, 2px accent, keyboard focus only.
No outlines on inputs, buttons, cards, groups, or empty states.

### Spacing and layout
- 4px grid: 4 · 8 · 12 · 16 · 24 · 32. Nothing else.
- Panel: fixed 320px wide, full height. Header 40, tab bar 36, body padding 16, **24 between sections**, 8 between a section title and its content, 8 between label and control.
- Everything in a panel aligns to the same 16px left edge, including header title and tabs.
- Empty states fill the remaining body height and centre; they never shrink the panel.
- Dialog: 480px wide, header 48, body padding 24, footer 16/24 with separator above, actions right-aligned (Cancel then primary).

### Sizing
| Height | Use |
|---|---|
| 24 | Icon buttons, dense toolbars |
| **28** | **Default**: inputs, buttons, select, segmented |
| 32 | List rows, dialog footer buttons |

Radii: 4 controls · 6 menus/popovers · 8 dialogs.

### Typography
System UI stack (SF Pro / Segoe UI Variable), with Noto Sans Gurmukhi as the fallback so Punjabi UI strings render everywhere. Gurmukhi gets ×1.08 size and 1.6 line-height automatically (`:lang(pa)`, `.gurmukhi`) because it looks smaller than Latin at equal size.

| Role | Size / weight |
|---|---|
| Panel + dialog title | 15 / 600 |
| Dialog body | 13 / 400 |
| Default UI, labels, controls | 12 / 400–500 |
| Section title | 11 / 600, caps, +0.04em, secondary colour |
| Help text, counts | 11 / 400, secondary |

Script page text uses `--font-script` (Courier family); it is document content, not UI.

### Components (what replaces what)
| Before | After |
|---|---|
| Two large language cards with ticks | **Segmented control** + one line of help text |
| Bordered paper-format container | Label + segmented control, no container |
| Native `<select>` | `.ds-select`: filled, borderless, same 28px height |
| Five outlined nav buttons | **List rows**, 32px (`.ds-row--two-line`, min 44px, when a description is needed), icon + label + chevron, hover fill, no border |
| Pill tabs with icons and uneven width | **Underline tabs**, equal width, text + optional count |
| Dashed empty box | Centred empty state, icon + title + hint |
| Grey primary button | **Accent-filled primary**, grey secondary, quiet tertiary |
| Dialog card-in-card | One surface, titled sections, **list rows** for secondary formats |
| Tick for selection | Selection = fill (`--surface-thumb` / `--surface-selected`). Ticks only inside checkboxes |
| Raw ON/OFF buttons | **Switch** (`.ds-switch-row`, `.ds-switch`): 28×16 track, 12 thumb, pill radius |

### States (every interactive thing, same recipe)
Rest → hover (+1 surface step) → pressed (+2) → focus-visible (2px ring) → disabled (text-disabled, no hover). Selected is a fill, never a border.

### Motion
100ms hover/press, 160ms tab and segment changes, 220ms dialogs and panel collapse. Ease `cubic-bezier(.2,0,0,1)`. Disabled under `prefers-reduced-motion`.

### Icons
16px, 1.5px stroke, one set (match what you use today, e.g. Lucide). Icons appear only in list rows, icon buttons and empty states — never on section headers or tabs.

---

## 3. Extending it (rules for every future feature)
1. Import `tokens.css`; use **semantic** tokens only. No hex, no raw px for spacing/radius/height.
2. Build from `ds-` primitives. Need something new? Compose existing primitives first; if impossible, add a primitive here with tokens, then use it.
3. Before adding a border, ask which of the three allowed lines it is. If none, use a surface step or spacing.
4. Never wrap a group in a container just to group it. Use a section title and 24px.
5. A new panel/tab reuses `.ds-panel` shell; a new modal reuses `.ds-dialog`. Geometry is fixed.
6. One primary button per view.
7. A new screen is "done" only when it has been checked against `reference.html` side by side.

Light theme later: add a `[data-theme="light"]` block that redefines layer 2 only. Components don't change.

---

## 4. Resources evaluated

| Resource | Verdict | Why |
|---|---|---|
| **Adobe Spectrum tokens / Spectrum CSS / Spectrum Web Components** | **Use as reference, not as a dependency.** | Spectrum's token model (global tokens + colour-specific + scale-specific, semantic aliases over raw grays) is exactly the structure used here. Adopting its components wholesale would give you Adobe's look, not your own, and adds a Lit/web-component dependency. Worth reading its token names and the dark gray values to sanity-check yours. |
| **Radix Colors (12-step scale)** | **Use the idea.** | Its step roles (app background, subtle background, element background, hover…) are the model behind the surface ladder. Optional dependency for generating future hue scales. |
| **Anthropic `frontend-design` skill** (also mirrored in Antigravity skill repos) | **Marginal, optional.** | Good anti-"AI slop" instincts, but aimed at expressive web pages. Fine as a secondary prompt for new screens if you give it this system as the constraint. |
| **`ui-ux-pro-max`** and similar "generate a design system for me" skills | **Skip.** | They generate palettes and styles from trend catalogues. That is the process that produces the generic look you want to leave. This project already has a defined system. |
| **antigravity-kit `frontend-design`** | **Skip.** | Maps briefs to marketing-site design systems (shadcn, Fluent, Carbon…); wrong domain for a dense desktop tool. |
| **Antigravity itself** | **Use the mechanism, not a skill.** | Antigravity design guidance converges on the same point: it has no taste by default and does well when given a design system, an aesthetic skill and real reference images. So put `design-rules.md` and `tokens.css` in the agent's project context and give it `reference.html` as the visual reference. |
| React Aria / Radix Primitives (headless) | **Recommended if you are on React.** | Accessible behaviour for tabs, select, dialog, menu with zero styling opinions, so `components.css` skins them. |

---

## 5. Applying it to the app (migration order)
1. Add `tokens.css` + `components.css`; load globally.
2. Replace the panel shell and tabs (fixes the size jump immediately).
3. Convert segmented controls (language, paper), the select, and nav rows.
4. Rebuild Export dialog, then every other dialog/menu/toolbar on the same primitives.
5. Delete old one-off styles; grep for hard-coded hex, `border:`, `border-radius:` and `box-shadow:` outside `tokens.css`/`components.css`.
6. Screens not in your screenshots (editor toolbar, element-type bar, dictionary, keyboard, library, shortcuts, diagnostics) need their own pass; the rules above cover them, but I haven't seen them.

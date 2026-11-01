# UI rules for coding agents (always apply)

This app has a fixed design system: `tokens.css`, `components.css`, `design-system.md`, visual reference `reference.html`. All UI work must follow it.

## Must
- Use only semantic tokens from `tokens.css`. No hex colours, no raw px for spacing, radius, height or font size.
- Spacing is the 4px grid (4, 8, 12, 16, 24, 32). Control heights are 24, 28 (default) or 32. Radii are 4, 6, 8.
- Build with `ds-` primitives. If a primitive is missing, add it to `components.css` using tokens, then use it.
- Panels use `.ds-panel` (320px, header 40, tab bar 36, body padding 16, section gap 24). Tabs never change panel size; empty states fill the body.
- Dialogs use `.ds-dialog`: title, sections, footer with Cancel + one primary button on the right.
- Selection is shown by fill. Groups are separated by spacing and a section title.
- Every interactive element has hover, pressed, focus-visible and disabled states from the shared recipe.
- Exactly one accent-filled (primary) button per view.

## Must not
- No borders or outlines on buttons, inputs, cards, groups, empty states. Only: separator, edge highlight, focus ring.
- No card inside a card, no container wrapping a single group.
- No native-looking select, checkbox, radio or scrollbar. Use the `ds-` versions.
- No icons on section titles or tabs. No new colours, fonts, shadows or radii.
- No ticks to show selection (except inside a checkbox).

## Before finishing any UI change
Compare against `reference.html` at the same zoom. Check: same left edge (16px), same control heights, no stray borders, one primary action.

# Themes — integration guide (Dark default · Darker · Light)

Additive only. Do not edit `tokens.css`, `components.css` or `switch-addon.css`. Dark mode has no rules in the new files, so it cannot change (verified: pixel-identical render with `themes.css` loaded).

## New files
| File | Purpose |
|---|---|
| `themes.css` | Darker + Light overrides of the semantic tokens, plus the editor-page tokens |
| `theme.js` | Applies/saves the theme, wires the Appearance control, fires a `themechange` event |
| `reference-themes.html` | Live specimen with a theme switcher (open it to compare all three) |

## Steps
1. Copy `themes.css` and `theme.js` next to `tokens.css`.
2. Load order in the HTML: `tokens.css` → `components.css` → (`switch-addon.css` if separate) → **`themes.css`**.
3. Paste the PRE-PAINT block from the top of `theme.js` inline in `<head>`, before the stylesheets (prevents a flash of the wrong theme on launch). Load `theme.js` itself with `defer`.
4. **Fill in the two TODO lines at the top of `themes.css`** with the editor page's *current* dark background and text colour. This is the only value I couldn't see. Dark then stays exactly as it is, and Darker derives its page colour from the same value.
5. Point the editor page at the page tokens (see below).
6. Add the Appearance control to the settings panel (markup below).
7. Run the audit, then fix what it finds.

## Editor page
The writing page must use the page tokens, not the UI surfaces:
```css
.editor-page            { background: var(--page-surface); color: var(--page-text); caret-color: var(--page-text); }
.editor-page ::selection { background: var(--surface-selected); }
```
Light gives `#ffffff` / `#000000`. Every piece of script text (scene headings, action, character names, dialogue, parentheticals, transitions, Gurmukhi) must inherit `--page-text` — no element type may hard-code its own colour. Add class `ds-page` to the editor root so the Light-mode safeguard rule in `themes.css` applies.

PDF export is a separate path and should stay white paper with black text in every theme.

## Appearance control (reuses the existing segmented control)
Put it as the first section of the Settings tab:
```html
<section class="ds-section">
  <h3 class="ds-section__title">Appearance</h3>
  <div class="ds-seg" role="radiogroup" aria-label="Theme" data-theme-control>
    <button class="ds-seg__item" role="radio" data-theme-value="dark">Dark</button>
    <button class="ds-seg__item" role="radio" data-theme-value="darker">Darker</button>
    <button class="ds-seg__item" role="radio" data-theme-value="light">Light</button>
  </div>
</section>
```
Framework apps: keep `data-theme` on `<html>` as the single source of truth and call `Theme.set('light' | 'darker' | 'dark')`.

## Audit — anything that bypasses tokens will look wrong in Light
Run these over the app source (excluding `tokens.css` and `themes.css`) and convert every hit to a semantic token:
```
grep -rnE "#[0-9a-fA-F]{3,8}\b" src --include=*.css --include=*.html --include=*.js --include=*.jsx --include=*.ts --include=*.tsx --include=*.svelte --include=*.vue
grep -rnE "rgba?\(|hsla?\(" src
grep -rnE "var\(--(gray|blue|red|green)-[0-9]+\)" src          # primitives must not be used outside tokens.css
grep -rnE "stroke=.#|fill=.#|%23[0-9a-fA-F]{3,6}" src           # SVG icons and inline data-URIs
grep -rnE "color-scheme|prefers-color-scheme" src               # anything else deciding light/dark
```
Common offenders in a script editor: highlight colours for "Highlight Characters", suggestion/ghost text for Roman→Gurmukhi, dimmed text, scene-outline selection, canvas or PDF-preview backgrounds, icon SVGs with a fixed `fill`, and third-party widgets. Give each a semantic token (add it to `tokens.css` for Dark, then a Light/Darker value in `themes.css`). Icons should use `currentColor`.

## Rules for the future (add to `design-rules.md`)
- Never reference a colour primitive or a hex value in components. Semantic tokens only.
- A new semantic colour token must be defined for all three themes in the same change: Dark in `tokens.css`, Darker and Light in `themes.css`.
- Darker changes darkness values only. If a Darker value needs a different design decision, it is a Dark change first.
- Light keeps the same layout, spacing, type, radii, motion and accent. Only colour, shadow weight and the editor page differ.
- Script text always uses `--page-text` on `--page-surface`.

## What each theme does
| | Dark (default) | Darker | Light |
|---|---|---|---|
| Surface ladder | unchanged | same steps, deeper (canvas `#0a0a0a`, panel `#151515`, control `#1e1e1e`) | mirrored: desk `#d9d9d9`, panel `#f5f5f5`, controls filled darker than panel, overlays white |
| Text | unchanged | unchanged | `#121212` primary, `#5a5a5a` secondary |
| Accent | blue | unchanged | unchanged (white text on blue) |
| Depth | lightness steps | lightness steps + slightly heavier shadow | shadows |
| Editor page | current | current, deepened ~40% | `#ffffff` with `#000000` text |

Measured contrast, UI text on panel: Dark 13.3:1, Darker 15.5:1, Light 17.2:1. Secondary text: 6.1 / 7.1 / 6.3. Page text on page: Light 21:1.

## Test checklist
- Fresh launch: Dark, no flash.
- Switch each theme in Settings; every panel, dialog, menu, toolbar and the editor change together.
- Quit and relaunch: the chosen theme is kept.
- Disabled, hover, pressed and keyboard-focus states are visible in all three.
- Export PDF from each theme: output identical.

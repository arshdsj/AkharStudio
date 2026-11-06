/* ==========================================================================
   theme.js — theme switching for: dark (default) | darker | light

   1. Put the PRE-PAINT block (below, marked) inline in <head> BEFORE the CSS
      links so there is no flash of the wrong theme on load.
   2. Load this file anywhere (defer is fine). It exposes window.Theme and
      wires every  [data-theme-control]  segmented control automatically.

   Markup for the control (reuses the existing segmented component):
     <div class="ds-seg" role="radiogroup" aria-label="Theme" data-theme-control>
       <button class="ds-seg__item" role="radio" data-theme-value="dark">Dark</button>
       <button class="ds-seg__item" role="radio" data-theme-value="darker">Darker</button>
       <button class="ds-seg__item" role="radio" data-theme-value="light">Light</button>
     </div>

   If your app is React/Vue/Svelte: keep the three functions (get / apply / set),
   store the value in your own state, and call apply() when it changes. The CSS
   only cares that <html data-theme="..."> is set.
   ========================================================================== */

/* ---- PRE-PAINT BLOCK — paste inline in <head>, before stylesheets ----------
<script>
  (function () {
    try {
      var t = localStorage.getItem('scriptEditor.theme');
      if (t === 'darker' || t === 'light') document.documentElement.setAttribute('data-theme', t);
      else document.documentElement.setAttribute('data-theme', 'dark');
    } catch (e) { document.documentElement.setAttribute('data-theme', 'dark'); }
  })();
</script>
---------------------------------------------------------------------------- */

(function () {
  'use strict';
  var KEY = 'scriptEditor.theme';
  var THEMES = ['dark', 'darker', 'light'];
  var DEFAULT = 'dark';
  var root = document.documentElement;

  function get() {
    try {
      var v = localStorage.getItem(KEY);
      return THEMES.indexOf(v) > -1 ? v : DEFAULT;
    } catch (e) { return DEFAULT; }
  }

  function syncControls(theme) {
    var items = document.querySelectorAll('[data-theme-control] [data-theme-value]');
    for (var i = 0; i < items.length; i++) {
      items[i].setAttribute('aria-checked', String(items[i].getAttribute('data-theme-value') === theme));
    }
  }

  function apply(theme) {
    if (THEMES.indexOf(theme) < 0) theme = DEFAULT;
    root.setAttribute('data-theme', theme);
    syncControls(theme);
    return theme;
  }

  function set(theme) {
    theme = apply(theme);
    try { localStorage.setItem(KEY, theme); } catch (e) { /* storage blocked: theme still applies for this session */ }
    // Anything that paints outside CSS (canvas, PDF preview, editor plugins) can listen for this.
    document.dispatchEvent(new CustomEvent('themechange', { detail: { theme: theme } }));
    return theme;
  }

  function bind() {
    var groups = document.querySelectorAll('[data-theme-control]');
    for (var g = 0; g < groups.length; g++) {
      groups[g].addEventListener('click', function (e) {
        var b = e.target.closest('[data-theme-value]');
        if (b) set(b.getAttribute('data-theme-value'));
      });
    }
    syncControls(root.getAttribute('data-theme') || get());
  }

  // Keep several open windows in step.
  window.addEventListener('storage', function (e) { if (e.key === KEY) apply(get()); });

  apply(get());
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind); else bind();

  window.Theme = { get: get, set: set, apply: apply, list: THEMES.slice() };
})();

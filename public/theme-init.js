// External (not inline) to satisfy the strict CSP (script-src 'self'), and
// parser-blocking in <head> so it runs before first paint (no theme flash).
/* global document, localStorage */
(function () {
  try {
    var t = localStorage.getItem("lm-theme");
    if (t !== "light" && t !== "dark") t = "light";
    document.documentElement.setAttribute("data-theme", t);
  } catch {
    // Theme is best-effort before app boot.
  }
})();

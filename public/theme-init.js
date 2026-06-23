// Pre-paint theme init. External (not inline) so it satisfies the strict CSP
// (script-src 'self'); kept parser-blocking in <head> so it runs before first
// paint — no theme flash. Sets data-theme from the saved choice, else dark.
(function () {
  try {
    var t = localStorage.getItem("lm-theme");
    if (t !== "light" && t !== "dark") t = "dark"; // default dark (high-contrast)
    document.documentElement.setAttribute("data-theme", t);
  } catch (e) {}
})();

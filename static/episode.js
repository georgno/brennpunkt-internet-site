// Subtle parallax for the faint cover in the episode page background.
// Static when the user prefers reduced motion (and without JavaScript).
(function () {
  "use strict";
  var img = document.querySelector(".page-bg-img");
  if (!img || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var ticking = false;
  function update() {
    ticking = false;
    var y = Math.min(window.scrollY, 1200);
    img.style.transform = "translate3d(0, " + (y * 0.25).toFixed(1) + "px, 0) scale(1.08)";
  }
  window.addEventListener("scroll", function () {
    if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
  }, { passive: true });
  update();
})();

// Links to a transcript turn (#t-1182): open the collapsed transcript, scroll there, mark the turn.
(function () {
  "use strict";
  function show() {
    var id = window.location.hash.slice(1);
    if (!/^t-\d+$/.test(id)) return;
    var el = document.getElementById(id);
    if (!el) return;
    var box = el.closest("details");
    if (box) box.open = true;
    el.scrollIntoView({ block: "center" });
  }
  window.addEventListener("hashchange", show);
  show();
})();

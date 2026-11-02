// Clicking an entry with data-anchor (transcript turn, award row) puts its id into the URL, so the
// address can be copied and shared; the entry is highlighted. Links inside the entry work as usual.
(function () {
  "use strict";
  function mark(el) {
    document.querySelectorAll(".is-target").forEach(function (o) { o.classList.remove("is-target"); });
    if (el) el.classList.add("is-target");
  }
  document.addEventListener("click", function (e) {
    if (e.target.closest("a, button, summary, input, label")) return;
    if (window.getSelection && String(window.getSelection()).length) return;  // selecting text
    var el = e.target.closest("[data-anchor]");
    if (!el || !el.id) return;
    try { history.replaceState(null, "", "#" + el.id); } catch (err) { return; }
    mark(el);
  });
  var id = window.location.hash.slice(1);
  if (id) mark(document.getElementById(id));
})();

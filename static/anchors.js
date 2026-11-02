// Clicking an entry with data-anchor (transcript turn, award row) puts its id into the URL, so the
// address can be copied and shared; the entry is highlighted. Links inside the entry work as usual.
(function () {
  "use strict";
  function mark(el) {
    document.querySelectorAll(".is-target").forEach(function (o) { o.classList.remove("is-target"); });
    if (el) el.classList.add("is-target");
  }
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var status = document.createElement("p");
  status.className = "copy-status";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  document.body.appendChild(status);
  function copied(url) {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(url).then(function () {
      status.textContent = "Link kopiert";
      status.classList.add("show");
      setTimeout(function () { status.classList.remove("show"); status.textContent = ""; }, 1800);
    }, function () {});
  }
  // heading permalinks: set the hash without the jump, scroll gently, copy the link
  document.addEventListener("click", function (e) {
    var link = e.target.closest("a.heading-link, a.permalink");
    if (!link) return;
    var id = link.getAttribute("href").slice(1), el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    try { history.replaceState(null, "", "#" + id); } catch (err) { window.location.hash = id; return; }
    mark(el);
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    copied(window.location.href);
  });
  document.addEventListener("click", function (e) {
    if (e.target.closest("a, button, summary, input, label")) return;
    if (window.getSelection && String(window.getSelection()).length) return;  // selecting text
    var el = e.target.closest("[data-anchor]");
    if (!el || !el.id) return;
    try { history.replaceState(null, "", "#" + el.id); } catch (err) { return; }
    mark(el);
  });
  // "/" opens the search from every page (on the search page, search.js focuses the field instead)
  document.addEventListener("keydown", function (e) {
    if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey || document.getElementById("q")) return;
    var el = document.activeElement, tag = (el && el.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA" || (el && el.isContentEditable)) return;
    var link = document.querySelector("a.nav-search");
    if (link) { e.preventDefault(); window.location.href = link.href; }
  });
  var id = window.location.hash.slice(1);
  if (id) mark(document.getElementById(id));
})();

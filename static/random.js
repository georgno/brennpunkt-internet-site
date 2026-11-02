// "Zufällige Folge": picks one of the episode links on this page (no extra index, the build stays
// deterministic) and opens it; avoids the previous pick. Shown only with JavaScript; key "r" as shortcut.
(function () {
  "use strict";
  var button = document.querySelector("button.random-episode");
  if (!button) return;
  function links() {
    var seen = {}, out = [];
    document.querySelectorAll(".episode-list a.row-title, .episode-list .episode-title a").forEach(function (a) {
      var href = a.getAttribute("href");
      if (href && !seen[href]) { seen[href] = true; out.push(href); }
    });
    return out;
  }
  if (!links().length) return;
  button.hidden = false;
  function go() {
    var all = links(), last = null;
    try { last = sessionStorage.getItem("random-episode"); } catch (e) {}
    var pool = all.length > 1 ? all.filter(function (h) { return h !== last; }) : all;
    var pick = pool[Math.floor(Math.random() * pool.length)];
    try { sessionStorage.setItem("random-episode", pick); } catch (e) {}
    window.location.href = pick;
  }
  button.addEventListener("click", go);
  document.addEventListener("keydown", function (e) {
    if (e.key !== "r" || e.ctrlKey || e.metaKey || e.altKey) return;
    var el = document.activeElement, tag = (el && el.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (el && el.isContentEditable)) return;
    go();
  });
})();

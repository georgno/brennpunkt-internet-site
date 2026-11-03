// Wochenbewertung: tooltip for matrix cells and a crosshair with tooltip on the line chart.
(function () {
  "use strict";
  var tip = document.querySelector(".tip");
  if (!tip) return;
  function show(text, x, y) {
    tip.textContent = text;
    tip.hidden = false;
    var w = tip.offsetWidth, h = tip.offsetHeight;
    var left = Math.min(Math.max(8, x - w / 2), document.documentElement.clientWidth - w - 8);
    var top = y - h - 12 < window.scrollY + 8 ? y + 16 : y - h - 12;
    tip.style.left = left + "px";
    tip.style.top = top + "px";
  }
  function hide() { tip.hidden = true; }

  document.querySelectorAll("[data-tip]").forEach(function (el) {
    function at() {
      var r = el.getBoundingClientRect();
      show(el.getAttribute("data-tip"), r.left + r.width / 2 + window.scrollX, r.top + window.scrollY);
    }
    el.addEventListener("pointerenter", at);
    el.addEventListener("focus", at);
    el.addEventListener("pointerleave", hide);
    el.addEventListener("blur", hide);
  });

  var chart = document.querySelector(".rating-chart");
  if (!chart) return;
  var points = JSON.parse(chart.getAttribute("data-points"));
  var plot = chart.querySelector(".rc-plot");
  var svg = plot.querySelector("svg");
  var cross = plot.querySelector(".rc-cross"), dot = plot.querySelector(".rc-dot");
  var current = null;
  function nearest(clientX) {
    var r = svg.getBoundingClientRect();
    var pct = (clientX - r.left) / r.width * 100, best = null, dist = Infinity;
    points.forEach(function (p) { var d = Math.abs(p.x - pct); if (d < dist) { dist = d; best = p; } });
    return best;
  }
  function move(e) {
    var p = nearest(e.clientX);
    if (!p) return;
    current = p;
    var r = svg.getBoundingClientRect();
    cross.hidden = dot.hidden = false;
    cross.style.left = dot.style.left = p.x + "%";
    dot.style.top = p.y + "%";
    show(p.tip, r.left + r.width * p.x / 100 + window.scrollX, r.top + r.height * p.y / 100 + window.scrollY);
  }
  plot.addEventListener("pointermove", move);
  plot.addEventListener("pointerdown", move);
  plot.addEventListener("pointerleave", function () { cross.hidden = dot.hidden = true; hide(); });
  plot.addEventListener("click", function () { if (current && current.href) window.location.href = current.href; });
})();

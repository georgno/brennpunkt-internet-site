// Wörter: compare how often up to four words were said, per quarter (per 10,000 words).
(function () {
  "use strict";
  var chart = document.querySelector(".word-trend");
  if (!chart) return;
  var MAX = 4, SLOTS = 4;  // colours follow the word (slot), never its position in the list
  var form = document.querySelector(".wt-form"), input = document.getElementById("wt-input");
  var legend = document.querySelector(".wt-legend"), datalist = document.getElementById("wt-words");
  var plot = chart.querySelector(".rc-plot"), svg = plot.querySelector("svg");
  var lines = svg.querySelector(".wt-lines"), yearsG = svg.querySelector(".wt-years");
  var yAxis = chart.querySelector(".rc-y"), xAxis = chart.querySelector(".rc-x");
  var cross = plot.querySelector(".rc-cross"), tip = document.querySelector(".tip");
  var NS = "http://www.w3.org/2000/svg";
  var data, quarters = [], totals = [], lookup = {}, chosen = [];  // chosen: [{word, slot, rates}]

  function num(x) { return x.toLocaleString("de-DE", { maximumFractionDigits: x < 10 ? 1 : 0 }); }

  function prepare(d) {
    var qIndex = {};
    d.months.forEach(function (m, i) {
      var q = m.slice(0, 4) + "-Q" + (Math.floor((+m.slice(5, 7) - 1) / 3) + 1);
      if (!(q in qIndex)) { qIndex[q] = quarters.length; quarters.push(q); totals.push(0); }
      totals[qIndex[q]] += d.totals[i];
    });
    d.qOf = d.months.map(function (m) {
      return qIndex[m.slice(0, 4) + "-Q" + (Math.floor((+m.slice(5, 7) - 1) / 3) + 1)];
    });
    Object.keys(d.words).forEach(function (w) { lookup[w.toLowerCase()] = w; });
    var frag = document.createDocumentFragment();
    Object.keys(d.words).sort(function (a, b) { return a.localeCompare(b, "de"); }).forEach(function (w) {
      var o = document.createElement("option"); o.value = w; frag.appendChild(o);
    });
    datalist.appendChild(frag);
  }

  function rates(word) {
    var counts = quarters.map(function () { return 0; });
    data.words[word].forEach(function (p) { counts[data.qOf[p[0]]] += p[1]; });
    return counts.map(function (c, i) { return totals[i] ? c / totals[i] * 10000 : 0; });
  }

  function x(i) { return quarters.length > 1 ? i / (quarters.length - 1) * 100 : 50; }

  function niceMax(v) {
    if (v <= 0) return 1;
    var p = Math.pow(10, Math.floor(Math.log10(v))), f = v / p;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
  }

  function draw() {
    lines.textContent = ""; yearsG.textContent = ""; xAxis.textContent = ""; yAxis.textContent = "";
    var top = niceMax(Math.max.apply(null, [0].concat(chosen.map(function (c) { return Math.max.apply(null, c.rates); }))));
    [[0, top], [50, top / 2], [100, 0]].forEach(function (t) {
      var s = document.createElement("span"); s.style.top = t[0] + "%"; s.textContent = num(t[1]); yAxis.appendChild(s);
    });
    var shown = {};
    quarters.forEach(function (q, i) {
      var year = q.slice(0, 4);
      if (shown[year]) return;
      shown[year] = true;
      var l = document.createElementNS(NS, "line");
      l.setAttribute("class", "rc-year");
      l.setAttribute("x1", x(i) * 10); l.setAttribute("x2", x(i) * 10); l.setAttribute("y1", 0); l.setAttribute("y2", 100);
      yearsG.appendChild(l);
      var s = document.createElement("span"); s.style.left = x(i) + "%"; s.textContent = year; xAxis.appendChild(s);
    });
    chosen.forEach(function (c) {
      var d = c.rates.map(function (r, i) { return (i ? "L" : "M") + (x(i) * 10).toFixed(1) + " " + (100 - r / top * 100).toFixed(2); }).join(" ");
      var p = document.createElementNS(NS, "path");
      p.setAttribute("class", "wt-line wt-s" + c.slot); p.setAttribute("d", d);
      lines.appendChild(p);
    });
    chart.top = top;
  }

  function renderLegend() {
    legend.textContent = "";
    chosen.forEach(function (c) {
      var li = document.createElement("li");
      li.className = "wt-s" + c.slot;
      var a = document.createElement("a");
      a.href = "suche.html?q=" + encodeURIComponent(c.word); a.textContent = c.word;
      var b = document.createElement("button");
      b.type = "button"; b.className = "wt-remove"; b.setAttribute("aria-label", c.word + " entfernen"); b.textContent = "×";
      b.addEventListener("click", function () { remove(c.word); });
      li.appendChild(document.createElement("span")).className = "wt-swatch";
      li.appendChild(a); li.appendChild(b);
      legend.appendChild(li);
    });
    try {
      history.replaceState(null, "", chosen.length ? "#w=" + chosen.map(function (c) { return encodeURIComponent(c.word); }).join(",") : location.pathname);
    } catch (e) { /* file:// or sandboxed */ }
  }

  function add(raw) {
    var word = lookup[(raw || "").trim().toLowerCase()];
    if (!word) { input.setCustomValidity("Dieses Wort kommt zu selten vor."); input.reportValidity(); return false; }
    input.setCustomValidity("");
    if (chosen.some(function (c) { return c.word === word; })) return true;
    if (chosen.length >= MAX) chosen.shift();
    var used = chosen.map(function (c) { return c.slot; }), slot = 0;
    while (used.indexOf(slot) >= 0 && slot < SLOTS - 1) slot++;
    chosen.push({ word: word, slot: slot, rates: rates(word) });
    return true;
  }

  function remove(word) {
    chosen = chosen.filter(function (c) { return c.word !== word; });
    draw(); renderLegend();
  }

  function show(text, px, py) {
    tip.textContent = ""; tip.appendChild(text); tip.hidden = false;
    var w = tip.offsetWidth, h = tip.offsetHeight;
    tip.style.left = Math.min(Math.max(8, px - w / 2), document.documentElement.clientWidth - w - 8) + "px";
    tip.style.top = (py - h - 12 < window.scrollY + 8 ? py + 16 : py - h - 12) + "px";
  }

  function move(e) {
    if (!chosen.length) return;
    var r = svg.getBoundingClientRect();
    var i = Math.round((e.clientX - r.left) / r.width * (quarters.length - 1));
    i = Math.max(0, Math.min(quarters.length - 1, i));
    cross.hidden = false; cross.style.left = x(i) + "%";
    var box = document.createDocumentFragment();
    var head = document.createElement("strong"); head.textContent = quarters[i].replace("-Q", " Q"); box.appendChild(head);
    chosen.forEach(function (c) {
      var row = document.createElement("span"); row.className = "wt-tip-row wt-s" + c.slot;
      row.appendChild(document.createElement("span")).className = "wt-swatch";
      row.appendChild(document.createTextNode(c.word + ": " + num(c.rates[i])));
      box.appendChild(row);
    });
    show(box, r.left + r.width * x(i) / 100 + window.scrollX, r.top + window.scrollY);
  }
  plot.addEventListener("pointermove", move);
  plot.addEventListener("pointerdown", move);
  plot.addEventListener("pointerleave", function () { cross.hidden = true; tip.hidden = true; });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (add(input.value)) { input.value = ""; draw(); renderLegend(); }
  });
  input.addEventListener("input", function () { input.setCustomValidity(""); });

  fetch(chart.getAttribute("data-src")).then(function (r) { return r.json(); }).then(function (d) {
    data = d; prepare(d);
    var fromHash = /^#w=/.test(location.hash) ? location.hash.slice(3).split(",").map(decodeURIComponent) : null;
    (fromHash || JSON.parse(chart.getAttribute("data-default"))).forEach(add);
    draw(); renderLegend();
  }).catch(function () {
    chart.insertAdjacentHTML("beforebegin", "<p class=\"wt-note\">Die Verlaufsdaten konnten nicht geladen werden.</p>");
  });
})();

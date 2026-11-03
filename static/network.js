// Netz: topics, hosts and words drawn with Sigma.js from positions computed at build time (no simulation).
(function () {
  "use strict";
  var box = document.getElementById("net-graph"), dataEl = document.getElementById("net-data");
  if (!box || !dataEl || !window.graphology || !window.Sigma) return;
  var SigmaCtor = window.Sigma.Sigma || window.Sigma.default || window.Sigma;
  var GraphCtor = window.graphology.Graph || window.graphology;
  var data = JSON.parse(dataEl.textContent);
  var info = document.getElementById("net-info"), search = document.getElementById("net-search");
  var showHosts = document.getElementById("net-hosts"), showWords = document.getElementById("net-words");
  var DIM = "#2a1d1e", EDGE = "rgba(168, 154, 154, 0.3)", EDGE_FOCUS = "rgba(230, 222, 222, 0.75)";

  // node sizes are pixels: scale them with the box so small screens are not one big blob
  var scale = Math.max(0.55, Math.min(1, box.clientWidth / 900));
  var graph = new GraphCtor();
  data.nodes.forEach(function (n) {
    graph.addNode(n.id, { x: n.x, y: -n.y, size: Math.max(2, n.size * scale), color: n.color, label: n.label,
                          kind: n.type, url: n.url, n: n.n });
  });
  data.edges.forEach(function (e, i) {
    if (!graph.hasNode(e.s) || !graph.hasNode(e.t)) return;
    graph.addEdgeWithKey("e" + i, e.s, e.t, {
      kind: e.kind,
      size: e.kind === "topic" ? 0.5 + 3 * e.w : 1,
      color: e.kind === "host" ? e.color : EDGE
    });
  });
  var byLabel = {};
  graph.forEachNode(function (id, a) { byLabel[a.label.toLowerCase()] = id; });

  var selected = null, hovered = null;
  function visible(id) {
    var k = graph.getNodeAttribute(id, "kind");
    return !(k === "host" && !showHosts.checked) && !(k === "word" && !showWords.checked);
  }
  var renderer = new SigmaCtor(graph, box, {
    labelColor: { color: "#e6dede" },
    labelFont: "Inter Tight, system-ui, sans-serif",
    labelSize: scale < 0.8 ? 12 : 13,
    labelWeight: "600",
    labelRenderedSizeThreshold: 9,
    defaultEdgeColor: EDGE,
    zIndex: true,
    nodeReducer: function (id, attrs) {
      var res = Object.assign({}, attrs);
      if (!visible(id)) { res.hidden = true; return res; }
      var focus = hovered || selected;
      if (focus && focus !== id && !graph.areNeighbors(focus, id)) { res.color = DIM; res.label = ""; res.zIndex = 0; }
      else if (focus) { res.zIndex = 1; res.forceLabel = true; }
      if (attrs.kind === "host") res.forceLabel = true;
      return res;
    },
    edgeReducer: function (id, attrs) {
      var res = Object.assign({}, attrs);
      var s = graph.source(id), t = graph.target(id), focus = hovered || selected;
      if (!visible(s) || !visible(t)) { res.hidden = true; return res; }
      if (focus && s !== focus && t !== focus) res.hidden = true;
      else if (focus) { res.size = (attrs.size || 1) + 1; if (attrs.kind !== "host") res.color = EDGE_FOCUS; }
      return res;
    }
  });

  // a little room around the map so the labels at the edge are not cut off
  renderer.getCamera().setState({ ratio: 1.12 });

  function describe(id) {
    if (!id) { info.textContent = "Auf einen Punkt zeigen oder tippen, um seine Verbindungen zu sehen."; return; }
    var a = graph.getNodeAttributes(id);
    var kind = a.kind === "host" ? "Moderator" : a.kind === "word" ? "Wort" : "Thema";
    var count = a.kind === "word" ? a.n + "-mal gesagt" : a.n + (a.n === 1 ? " Folge" : " Folgen");
    info.textContent = "";
    info.appendChild(document.createTextNode(kind + ": "));
    var link = document.createElement("a"); link.href = a.url; link.textContent = a.label;
    info.appendChild(link);
    info.appendChild(document.createTextNode(" · " + count + " · " + graph.degree(id) + " Verbindungen"));
  }
  function select(id, zoom) {
    selected = id; describe(id); renderer.refresh();
    if (id && zoom) {
      var d = renderer.getNodeDisplayData(id);
      if (d) renderer.getCamera().animate({ x: d.x, y: d.y, ratio: 0.45 }, { duration: 450 });
    }
  }
  renderer.on("enterNode", function (e) { hovered = e.node; describe(e.node); renderer.refresh(); box.style.cursor = "pointer"; });
  renderer.on("leaveNode", function () { hovered = null; describe(selected); renderer.refresh(); box.style.cursor = ""; });
  // first tap selects (phones have no hover), a second tap on the same point opens its page
  renderer.on("clickNode", function (e) {
    if (selected === e.node || hovered === e.node && !("ontouchstart" in window)) {
      window.location.href = graph.getNodeAttribute(e.node, "url");
    } else select(e.node, false);
  });
  renderer.on("clickStage", function () { select(null, false); });

  search.addEventListener("change", function () {
    var id = byLabel[search.value.trim().toLowerCase()];
    if (id) {
      var k = graph.getNodeAttribute(id, "kind");
      if (k === "word" && !showWords.checked) { showWords.checked = true; }
      if (k === "host" && !showHosts.checked) { showHosts.checked = true; }
      select(id, true);
    }
  });
  [showHosts, showWords].forEach(function (cb) { cb.addEventListener("change", function () { renderer.refresh(); }); });
})();

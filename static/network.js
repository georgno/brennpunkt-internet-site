// Host map ("Netz" page and host pages): hosts in the corners, topics between them by how much each host
// cares about them. Positions come from the build; here the map is drawn with Sigma.js and can be explored:
// hover/tap shows a point's connections, double click opens its page, points can be dragged (a dragged host
// pulls its topics along) and spring back when released. Nothing animates unless something is dragged.
(function () {
  "use strict";
  var SigmaLib = window.Sigma, graphologyLib = window.graphology;
  if (!SigmaLib || !graphologyLib) return;
  var SigmaCtor = SigmaLib.Sigma || SigmaLib.default || SigmaLib;
  var GraphCtor = graphologyLib.Graph || graphologyLib;
  var DIM = "#2a1d1e", MOOD = { pos: "#c9a227", neg: "#e0444b", word: "#8a7f7f" }, WORD = "#a89a9a";

  // hover label: dark box with light text (the default box is white, which hid the white label)
  function drawHover(ctx, data, settings) {
    var size = settings.labelSize, font = settings.labelFont, weight = settings.labelWeight;
    ctx.font = weight + " " + size + "px " + font;
    var label = data.label || "", w = ctx.measureText(label).width, pad = 6;
    var x = data.x + data.size + 4, y = data.y - size / 2 - pad;
    ctx.fillStyle = "#150808";
    ctx.shadowColor = "rgba(0,0,0,.6)"; ctx.shadowBlur = 8;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w + 2 * pad, size + 2 * pad, 6); else ctx.rect(x, y, w + 2 * pad, size + 2 * pad);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = data.color; ctx.beginPath(); ctx.arc(data.x, data.y, data.size + 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffffff"; ctx.fillText(label, x + pad, data.y + size / 3);
  }

  function init(box, data, opts) {
    var root = opts.root || "";
    var info = opts.info, focusHost = opts.host ? "h:" + opts.host : null;
    var scale = Math.max(0.6, Math.min(1, box.clientWidth / 900));
    var graph = new GraphCtor();
    data.hosts.forEach(function (h) {
      graph.addNode(h.id, { x: h.x, y: h.y, hx: h.x, hy: h.y, size: 13 * scale, color: "#ffffff", label: h.label,
                            kind: "host", url: root + h.url, n: h.n });
    });
    data.topics.forEach(function (t) {
      graph.addNode(t.id, { x: t.x, y: t.y, hx: t.x, hy: t.y, size: Math.max(2.5, t.size * scale), color: t.color,
                            label: t.label, kind: "topic", url: root + t.url, n: t.n });
    });
    (data.words || []).forEach(function (w) {
      graph.addNode(w.id, { x: w.x, y: w.y, hx: w.x, hy: w.y, size: Math.max(2, 3.2 * scale), color: WORD,
                            label: w.label, kind: "word", url: root + w.url, n: w.n });
    });
    data.edges.forEach(function (e, i) {
      graph.addEdgeWithKey("e" + i, e.s, e.t, { color: MOOD[e.mood], size: 0.6 + 2.4 * e.w, w: e.w, mood: e.mood });
    });

    var hovered = null, selected = focusHost, dragged = null, moved = false;
    var renderer = new SigmaCtor(graph, box, {
      labelColor: { color: "#e6dede" }, labelFont: "Inter Tight, system-ui, sans-serif",
      labelSize: scale < 0.8 ? 11 : 13, labelWeight: "600", labelDensity: scale < 0.8 ? 0.6 : 2, labelGridCellSize: scale < 0.8 ? 90 : 50,
      labelRenderedSizeThreshold: 0, zIndex: true, hoverRenderer: drawHover,
      nodeReducer: function (id, a) {
        var r = Object.assign({}, a), f = hovered || selected;
        if (a.kind === "word" && opts.words && !opts.words.checked) { r.hidden = true; return r; }
        if (a.kind === "host") { r.forceLabel = true; r.zIndex = 2; }
        if (f && f !== id && !graph.areNeighbors(f, id)) { r.color = DIM; r.label = a.kind === "host" ? a.label : ""; r.zIndex = 0; }
        // on small screens the label grid decides (forcing every neighbour's label piles them up)
        else if (f) { r.zIndex = 1; if (scale >= 0.8 || id === f) r.forceLabel = true; }
        return r;
      },
      edgeReducer: function (id, a) {
        var r = Object.assign({}, a), f = hovered || selected;
        if (a.mood === "word" && opts.words && !opts.words.checked) { r.hidden = true; return r; }
        if (!f || (graph.source(id) !== f && graph.target(id) !== f)) r.hidden = true;
        return r;
      }
    });
    // keep the frame fixed while points are dragged around
    var bbox = renderer.getBBox ? renderer.getBBox() : null;
    if (bbox && renderer.setCustomBBox) renderer.setCustomBBox(bbox);
    renderer.getCamera().setState({ ratio: 1.15 });

    function describe(id) {
      if (!info) return;
      if (!id) { info.textContent = opts.hint || ""; return; }
      var a = graph.getNodeAttributes(id);
      info.textContent = "";
      var link = document.createElement("a"); link.href = a.url; link.textContent = a.label;
      info.appendChild(link);
      var rest = a.kind === "host" ? " · " + a.n + " Folgen"
        : a.kind === "word" ? " · " + a.n + "-mal gesagt"
        : " · " + a.n + (a.n === 1 ? " Folge" : " Folgen");
      if (a.kind === "topic") {
        var who = [];
        graph.forEachEdge(id, function (e, ea, s) {
          who.push(graph.getNodeAttribute(s, "label") + (ea.mood === "pos" ? " mag es" : " regt sich auf"));
        });
        if (who.length) rest += " · " + who.join(", ");
      }
      if (a.kind === "word") {
        var by = [];
        graph.forEachEdge(id, function (e, ea, s) { by.push(graph.getNodeAttribute(s, "label")); });
        if (by.length) rest += " · typisch für " + by.join(" und ");
      }
      info.appendChild(document.createTextNode(rest));
    }
    describe(selected);

    renderer.on("enterNode", function (e) { if (!dragged) { hovered = e.node; describe(e.node); renderer.refresh(); } });
    renderer.on("leaveNode", function () { if (!dragged) { hovered = null; describe(selected); renderer.refresh(); } });
    renderer.on("clickNode", function (e) {
      if (moved) return;
      selected = selected === e.node && !focusHost ? null : e.node;
      describe(selected); renderer.refresh();
    });
    renderer.on("doubleClickNode", function (e) {
      if (e.preventSigmaDefault) e.preventSigmaDefault();
      window.location.href = graph.getNodeAttribute(e.node, "url");
    });
    renderer.on("clickStage", function () { if (!moved) { selected = focusHost; hovered = null; describe(selected); renderer.refresh(); } });

    // --- dragging with a little physics -------------------------------------------------------------
    var anim = null;
    function targets() {  // where every point wants to be: home, or pulled along by a dragged host
      var t = {};
      graph.forEachNode(function (id, a) { t[id] = [a.hx, a.hy]; });
      if (dragged && graph.getNodeAttribute(dragged, "kind") === "host") {
        var d = graph.getNodeAttributes(dragged), dx = d.x - d.hx, dy = d.y - d.hy;
        graph.forEachEdge(dragged, function (e, ea, s, tg) {
          var other = s === dragged ? tg : s;
          t[other] = [t[other][0] + dx * 0.75 * ea.w, t[other][1] + dy * 0.75 * ea.w];
        });
      }
      return t;
    }
    function step() {
      var t = targets(), busy = false;
      graph.forEachNode(function (id, a) {
        if (id === dragged) return;
        var nx = a.x + (t[id][0] - a.x) * 0.18, ny = a.y + (t[id][1] - a.y) * 0.18;
        if (Math.abs(nx - a.x) + Math.abs(ny - a.y) > 1e-4) { busy = true; graph.mergeNodeAttributes(id, { x: nx, y: ny }); }
        else if (a.x !== t[id][0] || a.y !== t[id][1]) graph.mergeNodeAttributes(id, { x: t[id][0], y: t[id][1] });
      });
      anim = busy || dragged ? requestAnimationFrame(step) : null;
    }
    function kick() { if (!anim) anim = requestAnimationFrame(step); }

    renderer.on("downNode", function (e) {
      dragged = e.node; moved = false; hovered = e.node; describe(e.node);
      if (!renderer.getCustomBBox || !renderer.getCustomBBox()) renderer.setCustomBBox && renderer.setCustomBBox(renderer.getBBox());
    });
    var captor = renderer.getMouseCaptor();
    captor.on("mousemovebody", function (e) {
      if (!dragged) return;
      var p = renderer.viewportToGraph(e);
      graph.mergeNodeAttributes(dragged, { x: p.x, y: p.y });
      moved = true; kick();
      e.preventSigmaDefault(); if (e.original) { e.original.preventDefault(); e.original.stopPropagation(); }
    });
    captor.on("mouseup", function () {
      if (dragged) { dragged = null; kick(); setTimeout(function () { moved = false; }, 0); }
    });

    if (opts.words) opts.words.addEventListener("change", function () { renderer.refresh(); });
    if (opts.search) {
      var byLabel = {};
      graph.forEachNode(function (id, a) { byLabel[a.label.toLowerCase()] = id; });
      opts.search.addEventListener("change", function () {
        var id = byLabel[opts.search.value.trim().toLowerCase()];
        if (!id) return;
        selected = id; describe(id); renderer.refresh();
        var d = renderer.getNodeDisplayData(id);
        if (d) renderer.getCamera().animate({ x: d.x, y: d.y, ratio: 0.6 }, { duration: 450 });
      });
    }
    return renderer;
  }

  document.querySelectorAll("[data-host-map]").forEach(function (box) {
    var info = box.parentNode.querySelector(".net-info");
    fetch(box.getAttribute("data-src")).then(function (r) { return r.json(); }).then(function (data) {
      init(box, data, { root: box.getAttribute("data-root") || "", host: box.getAttribute("data-host") || null,
                        info: info, hint: info ? info.textContent : "",
                        search: document.getElementById(box.getAttribute("data-search") || ""),
                        words: document.getElementById(box.getAttribute("data-words") || "") });
    }).catch(function () { if (info) info.textContent = "Die Karte konnte nicht geladen werden."; });
  });
})();

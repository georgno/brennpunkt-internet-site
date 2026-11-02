// Full-text search over docs/search/ (built by `brennpunkt build`). Loads the manifest and the page texts
// first, then the transcript shards (newest year first) as needed. Text is inserted with textContent only.
(function () {
  "use strict";
  var input = document.getElementById("q"), form = input && input.form;
  var status = document.getElementById("search-status"), results = document.getElementById("search-results");
  if (!input || !results) return;
  var BASE = "search/", PAGE_EPISODES = 25;
  var manifest = null, texts = null, shards = [], loading = null, failed = false, current = "", shown = PAGE_EPISODES;

  // --- normalisation: case, diacritics, ß = ss; keeps a map back to the original positions ---
  function normChar(c) { return c.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ß/g, "ss"); }
  function norm(s) { return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ß/g, "ss"); }
  function normMap(s) {
    var out = "", map = [];
    for (var i = 0; i < s.length; i++) { var n = normChar(s[i]); for (var j = 0; j < n.length; j++) { out += n[j]; map.push(i); } }
    map.push(s.length);
    return { text: out, map: map };
  }
  function parse(q) {
    var terms = [], re = /["„“”]([^"„“”]+)["„“”]?|(\S+)/g, m;
    while ((m = re.exec(q))) { var t = norm((m[1] || m[2]).trim()); if (t.length >= 2) terms.push(t); }
    return terms;
  }
  function matches(n, terms) { for (var i = 0; i < terms.length; i++) if (n.indexOf(terms[i]) < 0) return false; return true; }

  // text with every term marked (<mark>), built from DOM nodes
  function highlighted(text, terms, maxLen) {
    var nm = normMap(text), ranges = [];
    terms.forEach(function (t) {
      var from = 0, at;
      while ((at = nm.text.indexOf(t, from)) >= 0) { ranges.push([nm.map[at], nm.map[at + t.length]]); from = at + t.length; }
    });
    ranges.sort(function (a, b) { return a[0] - b[0]; });
    var start = 0, end = text.length;
    if (maxLen && text.length > maxLen && ranges.length) {
      start = Math.max(0, ranges[0][0] - Math.floor(maxLen / 3));
      start = text.lastIndexOf(" ", start) + 1;
      end = Math.min(text.length, start + maxLen);
    }
    var frag = document.createDocumentFragment(), pos = start;
    if (start > 0) frag.appendChild(document.createTextNode("… "));
    ranges.forEach(function (r) {
      if (r[0] < pos || r[0] >= end) return;
      frag.appendChild(document.createTextNode(text.slice(pos, r[0])));
      var mk = document.createElement("mark"); mk.textContent = text.slice(r[0], Math.min(r[1], end)); frag.appendChild(mk);
      pos = Math.min(r[1], end);
    });
    frag.appendChild(document.createTextNode(text.slice(pos, end)));
    if (end < text.length) frag.appendChild(document.createTextNode(" …"));
    return frag;
  }

  // --- loading ---
  function getJSON(file) {
    return fetch(file).then(function (r) { if (!r.ok) throw new Error(file); return r.json(); });
  }
  function start() {
    if (loading) return loading;
    loading = Promise.all([getJSON(BASE + "manifest.json"), getJSON(BASE + "texts.json")]).then(function (res) {
      manifest = res[0];
      texts = res[1].map(function (t) { t.n = norm(t.l + " " + t.x); return t; });
      var chain = Promise.resolve();
      manifest.shards.forEach(function (s, i) {
        chain = chain.then(function () {
          setStatus(null, "Durchsuche Transkripte " + s.year + " (" + (i + 1) + "/" + manifest.shards.length + ") …");
          return getJSON(s.file).then(function (rows) {
            shards.push(rows.map(function (r) { return { e: r[0], id: r[1], s: r[2], ts: r[3], x: r[4], n: norm(r[4]) }; }));
            render();
          }, function () { failed = true; render(); });
        });
      });
      return chain.then(function () { render(); });
    }, function () {
      status.textContent = "Die Suche konnte nicht geladen werden.";
      throw new Error("index");
    });
    return loading;
  }
  function done() { return manifest && shards.length === manifest.shards.length; }

  // --- rendering ---
  var templates = {};
  document.querySelectorAll("template.tpl-msg").forEach(function (t) { templates[t.dataset.who] = t; });
  function message(turn, terms, context) {
    var who = manifest.speakers[turn.s] || "", ep = manifest.episodes[turn.e];
    var tpl = templates[who] || (who ? templates["§letter§"] : templates[""]);
    var node = tpl.content.firstElementChild.cloneNode(true);
    var walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT), t;
    while ((t = walker.nextNode())) t.nodeValue = t.nodeValue.replace(/§L§/g, who).replace(/§TS§/g, turn.ts);
    node.querySelectorAll("*").forEach(function (el) {
      Array.prototype.forEach.call(el.attributes, function (a) {
        if (a.value.indexOf("§") >= 0) el.setAttribute(a.name, a.value.replace(/§L§/g, who));
      });
    });
    var bubble = node.querySelector(".bubble");
    bubble.setAttribute("href", ep.page + "#" + turn.id);
    bubble.textContent = "";
    bubble.appendChild(highlighted(turn.x, context ? [] : terms, context ? 160 : 600));
    if (context) node.classList.add("msg-context");
    return node;
  }
  function episodeHead(ep) {
    var p = document.createElement("p"); p.className = "sr-ep";
    if (ep.image) { var img = document.createElement("img"); img.src = ep.image; img.alt = ""; img.width = 32; img.height = 32; img.loading = "lazy"; p.appendChild(img); }
    var a = document.createElement("a"); a.href = ep.page; a.textContent = (ep.n != null ? "#" + ep.n + " " : "") + ep.title;
    var txt = document.createElement("span"); txt.className = "sr-ep-text";
    txt.appendChild(a); txt.appendChild(document.createTextNode(" · " + ep.date));
    p.appendChild(txt);
    return p;
  }
  function heading(text) { var h = document.createElement("h2"); h.className = "section-title"; h.textContent = text; return h; }
  function setStatus(count, extra) {
    status.textContent = (count == null ? "" : count) + (extra ? (count == null ? "" : " · ") + extra : "");
  }

  function render() {
    var terms = parse(current);
    results.textContent = "";
    if (!terms.length) { setStatus(null, current ? "Bitte mindestens zwei Zeichen eingeben." : ""); return; }
    if (!manifest) { setStatus(null, "Lade Suchindex …"); return; }
    var textHits = texts.filter(function (t) { return matches(t.n, terms); });
    var groups = [], byEp = {}, total = 0;
    shards.forEach(function (rows) {
      rows.forEach(function (turn, i) {
        if (!matches(turn.n, terms)) return;
        total++;
        if (!(turn.e in byEp)) { byEp[turn.e] = { e: turn.e, hits: [] }; groups.push(byEp[turn.e]); }
        byEp[turn.e].hits.push({ turn: turn, prev: rows[i - 1] && rows[i - 1].e === turn.e ? rows[i - 1] : null,
                                 next: rows[i + 1] && rows[i + 1].e === turn.e ? rows[i + 1] : null });
      });
    });
    groups.sort(function (a, b) { return a.e - b.e; });
    if (textHits.length) {
      results.appendChild(heading("Auf der Seite (" + textHits.length + ")"));
      var list = document.createElement("ul"); list.className = "sr-texts";
      textHits.slice(0, 50).forEach(function (t) {
        var li = document.createElement("li"), src = document.createElement("p"), a = document.createElement("a");
        src.className = "sr-src"; a.href = t.u; a.textContent = t.l; src.appendChild(a);
        if (t.e != null) { var ep = manifest.episodes[t.e]; src.appendChild(document.createTextNode(" · " + (ep.n != null ? "#" + ep.n + " " : "") + ep.title)); }
        var body = document.createElement("p"); body.className = "sr-snippet"; body.appendChild(highlighted(t.x, terms, 260));
        li.appendChild(src); li.appendChild(body); list.appendChild(li);
      });
      results.appendChild(list);
    }
    if (groups.length) {
      results.appendChild(heading("Im Transkript (" + total + " " + (total === 1 ? "Treffer" : "Treffer") + " in " + groups.length + " " + (groups.length === 1 ? "Folge" : "Folgen") + ")"));
      groups.slice(0, shown).forEach(function (g) {
        var sec = document.createElement("section"); sec.className = "sr-group";
        sec.appendChild(episodeHead(manifest.episodes[g.e]));
        g.hits.slice(0, 5).forEach(function (h) {
          var chat = document.createElement("div"); chat.className = "chat sr-chat";
          if (h.prev) chat.appendChild(message(h.prev, terms, true));
          chat.appendChild(message(h.turn, terms, false));
          if (h.next) chat.appendChild(message(h.next, terms, true));
          sec.appendChild(chat);
        });
        if (g.hits.length > 5) { var more = document.createElement("p"); more.className = "sr-more"; more.textContent = "+ " + (g.hits.length - 5) + " weitere Treffer in dieser Folge"; sec.appendChild(more); }
        results.appendChild(sec);
      });
      if (groups.length > shown) {
        var btn = document.createElement("button"); btn.type = "button"; btn.className = "button sr-load";
        btn.textContent = "Weitere Folgen anzeigen (" + (groups.length - shown) + ")";
        btn.addEventListener("click", function () { shown += PAGE_EPISODES; render(); });
        results.appendChild(btn);
      }
    }
    var count = textHits.length + total;
    var state = done() ? "" : "Transkripte werden noch geladen …";
    if (failed) state = "Ein Teil der Transkripte konnte nicht geladen werden.";
    if (!count && done()) setStatus(null, "Keine Treffer für „" + current + "“.");
    else setStatus(count + " " + (count === 1 ? "Treffer" : "Treffer"), state);
  }

  // --- input, URL, keyboard ---
  var timer = null;
  function run(q, push) {
    current = q.trim(); shown = PAGE_EPISODES;
    var url = current ? "?q=" + encodeURIComponent(current) : location.pathname;
    try { if (push) history.pushState({ q: current }, "", url); else history.replaceState({ q: current }, "", url); } catch (e) {}
    if (current) start().catch(function () {});
    render();
  }
  input.addEventListener("input", function () { clearTimeout(timer); timer = setTimeout(function () { run(input.value, false); }, 250); });
  form.addEventListener("submit", function (e) {
    e.preventDefault(); clearTimeout(timer); run(input.value, true);
    var first = results.querySelector("a"); if (first) first.focus();
  });
  window.addEventListener("popstate", function () {
    input.value = new URLSearchParams(location.search).get("q") || ""; run(input.value, false);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
    var tag = (document.activeElement && document.activeElement.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA" || (document.activeElement && document.activeElement.isContentEditable)) return;
    e.preventDefault(); input.focus(); input.select();
  });
  var initial = new URLSearchParams(location.search).get("q") || "";
  if (initial) { input.value = initial; run(initial, false); }
})();

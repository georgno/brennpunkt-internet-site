// Sort the episode overview in the browser. Without JavaScript the list keeps its default order
// (newest first) and the control stays hidden.
(function () {
  "use strict";
  var list = document.getElementById("episode-list");
  var keyButtons = Array.prototype.slice.call(document.querySelectorAll(".sort-key"));
  var dirButton = document.getElementById("episode-sort-dir");
  if (!list || !keyButtons.length || !dirButton) return;
  dirButton.closest(".sort").hidden = false;

  var rows = Array.prototype.slice.call(list.children);
  var collator = new Intl.Collator("de", { sensitivity: "base", numeric: true });
  var num = function (el, key) { var v = el.dataset[key]; return v === undefined ? null : parseFloat(v); };
  // data-order is the build order (newest first), so "date ascending" means oldest first
  var byDate = function (a, b) { return num(b, "order") - num(a, "order"); };
  var compare = {
    date: byDate,
    name: function (a, b) { return collator.compare(a.dataset.title, b.dataset.title) || byDate(a, b); },
    rating: function (a, b) { return (num(a, "rating") - num(b, "rating")) || byDate(a, b); },
    count: function (a, b) { return (num(a, "count") - num(b, "count")) || byDate(a, b); }
  };
  var natural = { date: "desc", name: "asc", rating: "desc", count: "desc" };
  var numeric = { rating: true, count: true };  // rows without the value go last
  var state = { key: "date", dir: "desc" };

  function render() {
    var sign = state.dir === "asc" ? 1 : -1;
    var rated = rows.filter(function (r) { return !numeric[state.key] || r.dataset[state.key] !== undefined; });
    var unrated = rows.filter(function (r) { return numeric[state.key] && r.dataset[state.key] === undefined; });
    rated.sort(function (a, b) { return sign * compare[state.key](a, b); });
    unrated.sort(function (a, b) { return -byDate(a, b); });  // episodes without rating: always last, newest first
    rated.concat(unrated).forEach(function (row) { list.appendChild(row); });
    keyButtons.forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.sort === state.key)); });
    var label = state.dir === "asc" ? "Aufsteigend" : "Absteigend";
    dirButton.textContent = state.dir === "asc" ? "↑" : "↓";
    dirButton.setAttribute("aria-label", label);
    dirButton.title = label;
    try {
      var isDefault = state.key === "date" && state.dir === "desc";
      history.replaceState(null, "", isDefault ? location.pathname : "?sort=" + state.key + "&dir=" + state.dir);
    } catch (e) {}
  }

  keyButtons.forEach(function (b) {
    b.addEventListener("click", function () {
      if (state.key === b.dataset.sort) {
        state.dir = state.dir === "asc" ? "desc" : "asc";  // clicking the active field flips the direction
      } else {
        state.key = b.dataset.sort;
        state.dir = natural[state.key];
      }
      render();
    });
  });
  dirButton.addEventListener("click", function () {
    state.dir = state.dir === "asc" ? "desc" : "asc";
    render();
  });

  var params = new URLSearchParams(location.search);
  if (compare[params.get("sort")]) state.key = params.get("sort");
  state.dir = params.get("dir") === "asc" || params.get("dir") === "desc" ? params.get("dir") : natural[state.key];
  render();
})();

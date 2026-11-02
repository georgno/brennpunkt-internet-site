// Tags table: click a column header to sort (again to flip). Without JavaScript: most frequent first.
(function () {
  "use strict";
  var table = document.getElementById("tag-table");
  if (!table) return;
  var body = table.tBodies[0];
  var rows = Array.prototype.slice.call(body.rows);
  var buttons = Array.prototype.slice.call(table.querySelectorAll("th button"));
  var collator = new Intl.Collator("de", { sensitivity: "base", numeric: true });
  var natural = { name: 1, count: -1, first: 1, last: -1, avg: -1 };
  var state = { key: "count", dir: -1 };
  function value(row, key) {
    var v = row.dataset[key];
    if (key === "name" || key === "first" || key === "last") return v;
    return v === undefined ? null : parseFloat(v);
  }
  function render() {
    var withValue = rows.filter(function (r) { return value(r, state.key) !== null; });
    var without = rows.filter(function (r) { return value(r, state.key) === null; });
    withValue.sort(function (a, b) {
      var x = value(a, state.key), y = value(b, state.key);
      var c = typeof x === "string" ? collator.compare(x, y) : x - y;
      return state.dir * c || collator.compare(a.dataset.name, b.dataset.name);
    });
    withValue.concat(without).forEach(function (r) { body.appendChild(r); });
    buttons.forEach(function (b) {
      if (b.dataset.key === state.key) b.setAttribute("aria-sort", state.dir > 0 ? "ascending" : "descending");
      else b.removeAttribute("aria-sort");
    });
  }
  buttons.forEach(function (b) {
    b.addEventListener("click", function () {
      var key = b.dataset.key;
      state = key === state.key ? { key: key, dir: -state.dir } : { key: key, dir: natural[key] };
      render();
    });
  });
})();

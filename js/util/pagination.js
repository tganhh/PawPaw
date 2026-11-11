(function (global) {
  "use strict";

  function paginate(list, page, pageSize) {
    var size = Math.max(1, Number(pageSize) || 20);
    var isArray = Object.prototype.toString.call(list) === '[object Array]';
    var total = isArray ? list.length : 0;
    var totalPages = Math.max(1, Math.ceil(total / size));
    var current = Math.min(Math.max(1, Number(page) || 1), totalPages);
    var start = (current - 1) * size;
    var items = total ? list.slice(start, start + size) : [];

    return {
      items: items,
      page: current,
      pageSize: size,
      total: total,
      totalPages: totalPages,
      from: total ? start + 1 : 0,
      to: total ? start + items.length : 0
    };
  }

  function getPageList(current, totalPages) {
    var pages = [];
    var i;

    if (totalPages <= 7) {
      for (i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
      return pages;
    }

    pages.push(1);
    var left = Math.max(2, current - 1);
    var right = Math.min(totalPages - 1, current + 1);

    if (left > 2) pages.push("…");
    for (var p = left; p <= right; p++) pages.push(p);
    if (right < totalPages - 1) pages.push("…");
    pages.push(totalPages);

    return pages;
  }

  function render(container, state, onChange, unitLabel) {
    if (!container) return;

    var unit = unitLabel || "kết quả";

    if (state.total === 0) {
      container.innerHTML = "";
      return;
    }

    var info = "Hiển thị <strong>" + state.from + "–" + state.to + "</strong> trong <strong>" + state.total + "</strong> " + unit;

    if (state.totalPages <= 1) {
      container.innerHTML = "<div class=\"pagination-info\">" + info + "</div>";
      return;
    }

    function btn(label, page, opts) {
      opts = opts || {};
      var cls = "page-btn";
      if (opts.active) cls += " active";
      var disabled = opts.disabled ? " disabled" : "";
      var aria = opts.aria ? " aria-label=\"" + opts.aria + "\"" : "";
      var cur = opts.active ? " aria-current=\"page\"" : "";
      return "<button type=\"button\" class=\"" + cls + "\" data-page=\"" + page + "\"" + disabled + aria + cur + ">" + label + "</button>";
    }

    var numbers = "";
    var pageList = getPageList(state.page, state.totalPages);
    
    for (var i = 0; i < pageList.length; i++) {
      var p = pageList[i];
      if (p === "…") {
        numbers += "<span class=\"page-ellipsis\">…</span>";
      } else {
        numbers += btn(p, p, { active: p === state.page });
      }
    }

    var html = "<div class=\"pagination-info\">" + info + "</div>" +
      "<nav class=\"pagination\" aria-label=\"Phân trang\">" +
      btn("«", 1, { disabled: state.page === 1, aria: "Trang đầu" }) +
      btn("‹", state.page - 1, { disabled: state.page === 1, aria: "Trang trước" }) +
      numbers +
      btn("›", state.page + 1, { disabled: state.page === state.totalPages, aria: "Trang sau" }) +
      btn("»", state.totalPages, { disabled: state.page === state.totalPages, aria: "Trang cuối" }) +
      "</nav>";

    container.innerHTML = html;

    var buttons = container.querySelectorAll("button[data-page]");
    for (var b = 0; b < buttons.length; b++) {
      buttons[b].onclick = function() {
        var el = this;
        var target = Number(el.getAttribute("data-page"));
        if (!el.disabled && target !== state.page && typeof onChange === "function") {
          onChange(target);
        }
      };
    }
  }

  var Pagination = { 
    paginate: paginate, 
    getPageList: getPageList, 
    render: render 
  };

  if (typeof window !== "undefined") {
    window.Pagination = Pagination;
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = Pagination;
  }
})(typeof window !== "undefined" ? window : this);
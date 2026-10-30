(function () {
  "use strict";

  var STAR_LABELS = ["", "Rất tệ", "Chưa tốt", "Bình thường", "Hài lòng", "Tuyệt vời"];
  var currentDetailId = null;
  var el = {};

  function escapeHtml(value) {
    var str = String(value == null ? "" : value);
    return str.replace(/[&<>"']/g, function (ch) { 
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]; 
    });
  }

  function showToast(message, type) { 
    if (typeof Common !== "undefined" && typeof Common.showToast === "function") {
      Common.showToast(message, type); 
    }
  }

  function formatDateTime(iso) {
    if (!iso) return "";
    var m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    return m ? m[3] + "/" + m[2] + "/" + m[1] + " " + m[4] + ":" + m[5] : String(iso);
  }

  function renderStars(count) {
    var n = Number(count) || 0; 
    var html = "";
    for (var i = 1; i <= 5; i++) {
      html += i <= n ? "★" : '<span class="off">★</span>';
    }
    return '<span class="stars-text" title="' + n + ' sao">' + html + "</span>";
  }

  function getList(key) { 
    return Storage.getData(key) || []; 
  }

  function buildRows() {
    var reviews = getList(DATA_KEYS.REVIEWS); 
    var appointments = getList(DATA_KEYS.APPOINTMENTS);
    var users = getList(DATA_KEYS.USERS); 
    var details = getList(DATA_KEYS.APPOINTMENT_DETAILS);
    var services = getList(DATA_KEYS.SERVICES);

    var rows = [];
    var i, a, u, d, s;
    
    for (i = 0; i < reviews.length; i++) {
      var review = reviews[i];
      var appt = null; 
      
      for (a = 0; a < appointments.length; a++) { 
        if (String(appointments[a].ma_lich_hen) === String(review.ma_lich_hen)) { 
          appt = appointments[a]; 
          break; 
        } 
      }
      
      var user = null; 
      if (appt) { 
        for (u = 0; u < users.length; u++) { 
          if (String(users[u].ma_nguoi_dung) === String(appt.ma_nguoi_dung)) { 
            user = users[u]; 
            break; 
          } 
        } 
      }
      
      var serviceNames = [];
      for (d = 0; d < details.length; d++) {
        if (String(details[d].ma_lich_hen) === String(review.ma_lich_hen)) {
          var sv = null; 
          for (s = 0; s < services.length; s++) { 
            if (String(services[s].ma_dich_vu) === String(details[d].ma_dich_vu)) { 
              sv = services[s]; 
              break; 
            } 
          }
          var name = sv ? sv.ten_dich_vu : details[d].ma_dich_vu;
          if (serviceNames.indexOf(name) === -1) {
            serviceNames.push(name);
          }
        }
      }
      
      rows.push({ 
        review: review, 
        customerName: user ? user.ho_ten : "(Không rõ)", 
        customerCode: user ? user.ma_nguoi_dung : "", 
        serviceText: serviceNames.length ? serviceNames.join(", ") : "(Không rõ)", 
        appointment: appt 
      });
    }
    return rows;
  }

  function getFilteredRows() {
    var star = el.filterStar.value; 
    var visibility = el.filterVisibility.value; 
    var sort = el.sortTime.value;
    
    var allRows = buildRows(); 
    var rows = [];
    
    for (var i = 0; i < allRows.length; i++) {
      var r = allRows[i].review;
      var matchStar = star === "all" || Number(r.so_sao) === Number(star);
      var matchVis = visibility === "all" || r.trang_thai_hien_thi === visibility;
      if (matchStar && matchVis) {
        rows.push(allRows[i]);
      }
    }
    
    rows.sort(function (a, b) {
      var ta = String(a.review.thoi_gian_danh_gia || ""); 
      var tb = String(b.review.thoi_gian_danh_gia || "");
      if (sort === "oldest") {
        return ta < tb ? -1 : (ta > tb ? 1 : 0);
      } else {
        return tb < ta ? -1 : (tb > ta ? 1 : 0);
      }
    });
    return rows;
  }

  function render() {
    var rows = getFilteredRows(); 
    var total = getList(DATA_KEYS.REVIEWS).length;
    el.resultCount.innerHTML = "Hiển thị <strong>" + rows.length + "</strong> / " + total + " đánh giá";
    
    if (rows.length === 0) { 
      el.tableBody.innerHTML = '<tr><td colspan="8" class="review-empty">Không có đánh giá nào phù hợp với bộ lọc.</td></tr>'; 
      return; 
    }

    var html = "";
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i]; 
      var r = row.review; 
      var isHidden = r.trang_thai_hien_thi === HIEN_THI.AN; 
      var id = escapeHtml(r.ma_danh_gia);
      
      html += '<tr class="' + (isHidden ? "is-hidden-row" : "") + '">';
      html += '<td class="col-code">' + id + "</td>";
      html += "<td>" + escapeHtml(row.customerName) + (row.customerCode ? '<br><small style="color:var(--purple-gray)">' + escapeHtml(row.customerCode) + "</small>" : "") + "</td>";
      html += "<td>" + escapeHtml(row.serviceText) + "</td>";
      html += "<td>" + renderStars(r.so_sao) + "</td>";
      html += '<td class="col-content"><div class="review-content-short">' + escapeHtml(r.noi_dung_danh_gia) + "</div></td>";
      html += '<td class="col-time">' + escapeHtml(formatDateTime(r.thoi_gian_danh_gia)) + "</td>";
      html += "<td>" + visibilityBadge(isHidden) + '</td>';
      html += '<td><div class="review-actions"><button type="button" class="btn btn-secondary btn-sm" data-action="detail" data-id="' + id + '">Chi tiết</button>' + toggleButton(isHidden, id) + "</div></td>";
      html += '</tr>';
    }
    el.tableBody.innerHTML = html;
  }

  function visibilityBadge(isHidden) { 
    return isHidden ? '<span class="visibility-badge visibility-an">Đã ẩn</span>' : '<span class="visibility-badge visibility-hien_thi">Đang hiện</span>'; 
  }
  
  function toggleButton(isHidden, id) { 
    return isHidden ? '<button type="button" class="btn btn-success btn-sm" data-action="toggle" data-id="' + id + '">Hiện</button>' : '<button type="button" class="btn btn-danger btn-sm" data-action="toggle" data-id="' + id + '">Ẩn</button>'; 
  }

  function toggleVisibility(maDanhGia) {
    var review = Storage.getItemById(DATA_KEYS.REVIEWS, "ma_danh_gia", maDanhGia);
    if (!review) { 
      showToast("Không tìm thấy đánh giá.", "error"); 
      return false; 
    }
    
    var willHide = review.trang_thai_hien_thi !== HIEN_THI.AN;
    var ok = Storage.updateItem(DATA_KEYS.REVIEWS, "ma_danh_gia", { ma_danh_gia: maDanhGia, trang_thai_hien_thi: willHide ? HIEN_THI.AN : HIEN_THI.HIEN_THI });
    
    if (!ok) { 
      showToast("Cập nhật thất bại, vui lòng thử lại.", "error"); 
      return false; 
    }
    
    var msg = willHide ? "Đã ẩn đánh giá " + maDanhGia + ". Khách hàng sẽ không còn thấy." : "Đã hiện lại đánh giá " + maDanhGia + ".";
    showToast(msg, "success");
    render(); 
    return true;
  }

  function openDetail(maDanhGia) {
    var rows = buildRows(); 
    var row = null;
    for (var i = 0; i < rows.length; i++) { 
      if (String(rows[i].review.ma_danh_gia) === String(maDanhGia)) { 
        row = rows[i]; 
        break; 
      } 
    }
    if (!row) return;
    
    var r = row.review; 
    var appt = row.appointment; 
    currentDetailId = r.ma_danh_gia;

    var html = detailRow("Mã đánh giá", escapeHtml(r.ma_danh_gia));
    html += detailRow("Khách hàng", escapeHtml(row.customerName) + (row.customerCode ? " (" + escapeHtml(row.customerCode) + ")" : ""));
    html += detailRow("Mã lịch hẹn", escapeHtml(r.ma_lich_hen));
    html += detailRow("Ngày hẹn", appt ? escapeHtml(appt.ngay_hen + " " + String(appt.gio_hen || "").slice(0, 5)) : "(Không rõ)");
    html += detailRow("Dịch vụ", escapeHtml(row.serviceText));
    html += detailRow("Số sao", renderStars(r.so_sao) + " " + escapeHtml(STAR_LABELS[Number(r.so_sao)] || ""));
    html += detailRow("Thời gian đánh giá", escapeHtml(formatDateTime(r.thoi_gian_danh_gia)));
    html += detailRow("Hiển thị", visibilityBadge(r.trang_thai_hien_thi === HIEN_THI.AN));
    html += '<div class="review-detail-content">' + escapeHtml(r.noi_dung_danh_gia) + "</div>";
    
    el.detailBody.innerHTML = html;
    syncDetailToggleButton(r.trang_thai_hien_thi === HIEN_THI.AN); 
    
    el.detailModal.hidden = false; 
    el.detailModal.style.display = "flex";
  }

  function detailRow(label, valueHtml) { 
    return '<div class="review-detail-row"><span class="label">' + label + '</span><span class="value">' + valueHtml + "</span></div>"; 
  }
  
  function syncDetailToggleButton(isHidden) { 
    el.detailToggle.textContent = isHidden ? "Hiện đánh giá" : "Ẩn đánh giá"; 
    el.detailToggle.className = "btn " + (isHidden ? "btn-success" : "btn-danger"); 
  }
  
  function closeDetail() { 
    el.detailModal.hidden = true; 
    el.detailModal.style.display = "none"; 
    currentDetailId = null; 
  }
  
  function resetFilters() { 
    el.filterStar.value = "all"; 
    el.filterVisibility.value = "all"; 
    el.sortTime.value = "newest"; 
    render(); 
  }

  function bindEvents() {
    el.filterStar.onchange = render; 
    el.filterVisibility.onchange = render; 
    el.sortTime.onchange = render; 
    el.btnReset.onclick = resetFilters;
    
    el.tableBody.onclick = function (e) {
      var btn = e.target; 
      while (btn && btn !== el.tableBody && !btn.hasAttribute("data-action")) {
        btn = btn.parentElement;
      }
      if (!btn || btn === el.tableBody) return;
      
      var id = btn.getAttribute("data-id"); 
      var action = btn.getAttribute("data-action");
      if (action === "detail") openDetail(id); 
      if (action === "toggle") toggleVisibility(id);
    };
    
    el.btnDetailClose.onclick = closeDetail; 
    el.btnDetailToggle = el.detailToggle;
    
    el.detailToggle.onclick = function () { 
      if (!currentDetailId) return; 
      var id = currentDetailId; 
      if (toggleVisibility(id)) {
        openDetail(id); 
      }
    };
    
    el.detailModal.onclick = function (e) { 
      if (e.target === el.detailModal) closeDetail(); 
    };
    
    document.onkeydown = function (e) { 
      if (e.key === "Escape" && currentDetailId) closeDetail(); 
    };
  }

  function queryElements() {
    el.filterStar = document.getElementById("filter-star"); 
    el.filterVisibility = document.getElementById("filter-visibility"); 
    el.sortTime = document.getElementById("sort-time"); 
    el.btnReset = document.getElementById("btn-reset-filter"); 
    el.resultCount = document.getElementById("result-count"); 
    el.tableBody = document.getElementById("review-table-body"); 
    el.detailModal = document.getElementById("review-detail-modal"); 
    el.detailBody = document.getElementById("review-detail-body"); 
    el.detailToggle = document.getElementById("btn-detail-toggle"); 
    el.btnDetailClose = document.getElementById("btn-detail-close");
  }

  function init() {
    if (typeof AuthGuard !== "undefined" && !AuthGuard.requireLogin(VAI_TRO.QUAN_LY)) {
      return;
    }
    queryElements(); 
    bindEvents();
    if (Storage.initData) {
      Storage.initData();
    }
    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init); 
  } else {
    init();
  }
})();
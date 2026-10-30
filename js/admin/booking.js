(function (global) {
  "use strict";

  var PAGE_SIZE = 20;
  var STATUS = { SAP_DIEN_RA: "sap_dien_ra", DANG_DIEN_RA: "dang_dien_ra", DA_HOAN_THANH: "da_hoan_thanh", DA_HUY: "da_huy" };

  var bookings = [];
  var filtered = [];
  var currentPage = 1;

  var tbody = document.getElementById("booking-tbody");
  var paginationEl = document.getElementById("booking-pagination");
  var keywordInput = document.getElementById("filter-keyword");
  var statusSelect = document.getElementById("filter-status");
  var dateFromInput = document.getElementById("filter-date-from");
  var dateToInput = document.getElementById("filter-date-to");
  var dateChips = document.querySelectorAll(".btn-chip");
  var btnReset = document.getElementById("btn-reset");

  var modal = document.getElementById("modal-detail");
  var btnCloseModal = document.getElementById("btn-close-modal");
  var modalContent = document.getElementById("modal-detail-content");

  function getDK() {
    if (typeof DATA_KEYS !== "undefined") {
      return DATA_KEYS;
    }
    if (typeof CONSTANTS !== "undefined" && CONSTANTS.DATA_KEYS) {
      return CONSTANTS.DATA_KEYS;
    }
    return { APPOINTMENTS: "lich_hen", APPOINTMENT_DETAILS: "chi_tiet_lich_hen", USERS: "nguoi_dung", PETS: "thu_cung", SERVICES: "dich_vu" };
  }

  function escapeHtml(value) {
    var str = String(value == null ? "" : value);
    return str.replace(/[&<>"']/g, function(ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  function toSearchText(value) {
    // Đã fix lỗi rớt dấu hai chấm ở đây
    var str = String(value == null ? "" : value);
    return str.toLowerCase().replace(/đ/g, "d").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function formatMoney(value) {
    if (typeof Common !== "undefined" && Common.formatCurrency) {
      return Common.formatCurrency(value);
    }
    return Number(value || 0).toLocaleString() + " ₫";
  }

  function normalizeStatus(st) {
    if (!st) return STATUS.SAP_DIEN_RA;
    var lower = String(st).toLowerCase();
    if (lower === "cho_xac_nhan" || lower === "da_xac_nhan" || lower === "sap_dien_ra") {
      return STATUS.SAP_DIEN_RA;
    }
    if (lower === "dang_dien_ra") return STATUS.DANG_DIEN_RA;
    if (lower === "hoan_thanh" || lower === "da_hoan_thanh") return STATUS.DA_HOAN_THANH;
    if (lower === "da_huy") return STATUS.DA_HUY;
    return st;
  }

  function getStatusLabel(status) {
    var st = normalizeStatus(status);
    if (st === STATUS.SAP_DIEN_RA) return "Sắp diễn ra";
    if (st === STATUS.DANG_DIEN_RA) return "Đang diễn ra";
    if (st === STATUS.DA_HOAN_THANH) return "Đã hoàn thành";
    if (st === STATUS.DA_HUY) return "Đã huỷ";
    return status;
  }

  function loadAndJoinData() {
    if (typeof Storage === "undefined") return;
    
    var DK = getDK();
    var appointments = Storage.getData(DK.APPOINTMENTS) || [];
    var users = Storage.getData(DK.USERS) || [];
    var details = Storage.getData(DK.APPOINTMENT_DETAILS) || [];
    var pets = Storage.getData(DK.PETS) || [];
    var services = Storage.getData(DK.SERVICES) || [];

    var i, j, k, d, a, rd, pk, ak;
    var userMap = {}; 
    for (i = 0; i < users.length; i++) {
      userMap[String(users[i].ma_nguoi_dung)] = users[i];
    }
    
    var petMap = {}; 
    for (j = 0; j < pets.length; j++) {
      petMap[String(pets[j].ma_thu_cung)] = pets[j];
    }
    
    var serviceMap = {}; 
    for (k = 0; k < services.length; k++) {
      serviceMap[String(services[k].ma_dich_vu)] = services[k];
    }

    var detailsByAppointment = {};
    for (d = 0; d < details.length; d++) {
      var key = String(details[d].ma_lich_hen);
      if (!detailsByAppointment[key]) {
        detailsByAppointment[key] = [];
      }
      detailsByAppointment[key].push(details[d]);
    }

    bookings = [];
    for (a = 0; a < appointments.length; a++) {
      var apt = appointments[a];
      var user = userMap[String(apt.ma_nguoi_dung)] || { ho_ten: "Khách lẻ", so_dien_thoai: "---" };
      
      var rawDetails = detailsByAppointment[String(apt.ma_lich_hen)] || [];
      var aptDetails = [];
      for (rd = 0; rd < rawDetails.length; rd++) {
        var det = rawDetails[rd];
        var pet = petMap[String(det.ma_thu_cung)] || { ten_thu_cung: "Bé cưng" };
        var srv = serviceMap[String(det.ma_dich_vu)] || { ten_dich_vu: "Dịch vụ" };
        var newDet = {};
        for (pk in det) {
          newDet[pk] = det[pk];
        }
        newDet.ten_thu_cung = pet.ten_thu_cung;
        newDet.ten_dich_vu = srv.ten_dich_vu;
        aptDetails.push(newDet);
      }

      var newApt = {};
      for (ak in apt) {
        newApt[ak] = apt[ak];
      }
      newApt.trang_thai = normalizeStatus(apt.trang_thai);
      newApt.user = user;
      newApt.details = aptDetails;
      newApt._search = toSearchText([apt.ma_lich_hen, user.ho_ten, user.so_dien_thoai].join(" "));
      bookings.push(newApt);
    }

    bookings.sort(function(itemA, itemB) { 
      return new Date(itemB.thoi_gian_tao || itemB.ngay_hen) - new Date(itemA.thoi_gian_tao || itemA.ngay_hen); 
    });
  }

  function renderStatusActions(item) { 
    return '<button type="button" class="btn-table btn-detail" onclick="AdminBooking.showDetail(\'' + escapeHtml(item.ma_lich_hen) + '\')">Xem</button>'; 
  }

  function renderTable() {
    if (!tbody) return;
    tbody.innerHTML = "";
    var state = Pagination.paginate(filtered, currentPage, PAGE_SIZE);
    currentPage = state.page;

    if (state.total === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 25px; color: var(--purple-gray);">Không có dữ liệu phù hợp.</td></tr>';
      Pagination.render(paginationEl, state, goToPage, "lịch hẹn");
      return;
    }

    for (var i = 0; i < state.items.length; i++) {
      var b = state.items[i];
      var tr = document.createElement("tr");
      var itemsStr = "---";
      if (b.details.length > 0) {
        var strArr = [];
        for (var d = 0; d < b.details.length; d++) {
          strArr.push("<b>" + escapeHtml(b.details[d].ten_thu_cung) + "</b>: " + escapeHtml(b.details[d].ten_dich_vu));
        }
        itemsStr = strArr.join("<br>");
      }
      var st = normalizeStatus(b.trang_thai);

      var html = '<td><strong style="color: var(--blue-dark);">' + escapeHtml(b.ma_lich_hen) + '</strong></td>';
      html += '<td><div style="font-weight: 800;">' + escapeHtml(b.user.ho_ten) + '</div></td>';
      html += '<td>' + escapeHtml(b.user.so_dien_thoai) + '</td>';
      html += '<td><div style="font-weight: 800; color: var(--blue-dark);">' + (b.gio_hen ? b.gio_hen.slice(0, 5) : "--:--") + '</div><div style="font-size: 12px; color: var(--purple-gray);">' + escapeHtml(b.ngay_hen) + '</div></td>';
      html += '<td>' + itemsStr + '</td>';
      html += '<td><strong style="color: var(--blue-dark);">' + formatMoney(b.tong_tien) + '</strong></td>';
      html += '<td class="col-center"><span class="badge badge-' + st + '">' + getStatusLabel(st) + '</span></td>';
      html += '<td style="text-align: right; white-space: nowrap;">' + renderStatusActions(b) + '</td>';
      
      tr.innerHTML = html;
      tbody.appendChild(tr);
    }
    Pagination.render(paginationEl, state, goToPage, "lịch hẹn");
  }

  function goToPage(page) {
    currentPage = page;
    renderTable();
    var wrap = tbody ? tbody.parentElement.parentElement : null;
    if (wrap && wrap.scrollIntoView) {
      wrap.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function filterData(resetPage) {
    if (resetPage === undefined) resetPage = true;
    var kw = toSearchText((keywordInput ? keywordInput.value : "").trim());
    var st = statusSelect ? statusSelect.value : "";
    var from = dateFromInput ? dateFromInput.value : "";
    var to = dateToInput ? dateToInput.value : "";

    filtered = [];
    for (var i = 0; i < bookings.length; i++) {
      var item = bookings[i];
      var matchKw = !kw || item._search.indexOf(kw) !== -1;
      var matchSt = !st || normalizeStatus(item.trang_thai) === st;
      var itemDate = item.ngay_hen || "";
      var matchFrom = !from || itemDate >= from;
      var matchTo = !to || itemDate <= to;
      if (matchKw && matchSt && matchFrom && matchTo) {
        filtered.push(item);
      }
    }
    if (resetPage) currentPage = 1;
    renderTable();
  }

  function formatDateInput(d) {
    var year = d.getFullYear();
    var month = String(d.getMonth() + 1); 
    if (month.length < 2) month = "0" + month;
    var day = String(d.getDate()); 
    if (day.length < 2) day = "0" + day;
    return year + "-" + month + "-" + day;
  }

  function applyDateRange(rangeType) {
    var today = new Date();
    var fromDate = new Date();
    var toDate = new Date();

    if (rangeType === "today") { 
      fromDate = today; 
      toDate = today; 
    } else if (rangeType === "7days") { 
      fromDate.setDate(today.getDate() - 7); 
      toDate = today; 
    } else if (rangeType === "30days") { 
      fromDate.setDate(today.getDate() - 30); 
      toDate = today; 
    } else if (rangeType === "this_month") { 
      fromDate = new Date(today.getFullYear(), today.getMonth(), 1); 
      toDate = new Date(today.getFullYear(), today.getMonth() + 1, 0); 
    }

    if (dateFromInput) dateFromInput.value = formatDateInput(fromDate);
    if (dateToInput) dateToInput.value = formatDateInput(toDate);
    filterData();
  }

  function showDetail(id) {
    var item = null;
    for (var i = 0; i < bookings.length; i++) { 
      if (bookings[i].ma_lich_hen === id) { 
        item = bookings[i]; 
        break; 
      } 
    }
    if (!item || !modal || !modalContent) return;

    var st = normalizeStatus(item.trang_thai);
    var statusEditor = '<div style="display: flex; gap: 8px; align-items: center; margin-top: 4px;">';
    statusEditor += '<select id="modal-status-select" style="padding: 6px 10px; border-radius: 6px; border: 1.5px solid var(--blue-light); font-family: inherit; font-size: 13px; font-weight: 700; color: var(--text-main); outline: none;">';
    statusEditor += '<option value="' + STATUS.SAP_DIEN_RA + '" ' + (st === STATUS.SAP_DIEN_RA ? 'selected' : '') + '>Sắp diễn ra</option>';
    statusEditor += '<option value="' + STATUS.DANG_DIEN_RA + '" ' + (st === STATUS.DANG_DIEN_RA ? 'selected' : '') + '>Đang diễn ra</option>';
    statusEditor += '<option value="' + STATUS.DA_HOAN_THANH + '" ' + (st === STATUS.DA_HOAN_THANH ? 'selected' : '') + '>Đã hoàn thành</option>';
    statusEditor += '<option value="' + STATUS.DA_HUY + '" ' + (st === STATUS.DA_HUY ? 'selected' : '') + '>Đã huỷ</option></select>';
    statusEditor += '<button type="button" class="btn btn-primary" style="padding: 6px 12px; font-size: 13px;" onclick="AdminBooking.updateStatus(\'' + escapeHtml(item.ma_lich_hen) + '\')">Lưu</button></div>';

    var rows = "";
    for (var d = 0; d < item.details.length; d++) {
      rows += '<tr><td><strong>' + escapeHtml(item.details[d].ten_thu_cung) + '</strong></td><td>' + escapeHtml(item.details[d].ten_dich_vu) + '</td><td style="text-align: right; font-weight: 800; color: var(--blue-dark);">' + formatMoney(item.details[d].don_gia) + '</td></tr>';
    }

    var createdAt = item.thoi_gian_tao ? new Date(item.thoi_gian_tao).toLocaleString("vi-VN") : "---";

    var html = '<div class="detail-summary-grid">';
    html += '<div><strong>Mã LH:</strong> <span style="color: var(--blue-dark); font-weight: 900;">' + escapeHtml(item.ma_lich_hen) + '</span></div>';
    html += '<div><strong>Trạng thái:</strong> ' + statusEditor + '</div>';
    html += '<div><strong>Khách hàng:</strong> ' + escapeHtml(item.user.ho_ten) + '</div>';
    html += '<div><strong>Số điện thoại:</strong> ' + escapeHtml(item.user.so_dien_thoai) + '</div>';
    html += '<div><strong>Thời gian:</strong> <span style="color: var(--blue-dark); font-weight: 800;">' + (item.gio_hen ? item.gio_hen.slice(0, 5) : "--:--") + '</span> | ' + escapeHtml(item.ngay_hen) + '</div>';
    html += '<div><strong>Ngày đặt:</strong> ' + escapeHtml(createdAt) + '</div></div>';
    html += '<div style="margin-bottom: 15px;"><div style="font-size: 13px; font-weight: 800; color: var(--purple-gray);">Ghi chú khách hàng:</div>';
    html += '<div style="background: #fafbfc; border: 1px solid var(--blue-light); padding: 10px 14px; border-radius: 8px; margin-top: 4px; font-size: 14px;">' + escapeHtml(item.ghi_chu || "Không có ghi chú") + '</div></div>';
    html += '<div><div style="font-size: 13px; font-weight: 800; color: var(--purple-gray); margin-bottom: 6px;">Danh sách dịch vụ:</div>';
    html += '<table class="table-items-detail"><thead><tr><th style="text-align: left;">Thú cưng</th><th style="text-align: left;">Dịch vụ</th><th style="text-align: right;">Đơn giá</th></tr></thead>';
    html += '<tbody>' + (rows || '<tr><td colspan="3" style="text-align: center; color: var(--purple-gray);">Không có dữ liệu</td></tr>') + '</tbody>';
    html += '<tfoot><tr><td colspan="2" style="text-align: right; font-weight: 800;">Tổng tiền</td><td style="text-align: right; font-weight: 900; color: var(--blue-dark);">' + formatMoney(item.tong_tien) + '</td></tr></tfoot></table></div>';

    modalContent.innerHTML = html;
    modal.style.display = "flex";
  }

  function updateStatus(id) {
    var select = document.getElementById("modal-status-select");
    if (!select) return;
    var newStatus = select.value;
    var DK = getDK();
    var appointments = Storage.getData(DK.APPOINTMENTS) || [];
    var idx = -1;
    for (var i = 0; i < appointments.length; i++) { 
      if (String(appointments[i].ma_lich_hen) === String(id)) { 
        idx = i; 
        break; 
      } 
    }

    if (idx === -1) {
      if (typeof Common !== "undefined" && Common.showToast) {
        Common.showToast("Không tìm thấy lịch hẹn!", "error"); 
      } else {
        alert("Không tìm thấy lịch hẹn!");
      }
      return;
    }
    
    var STORE_STATUS = {};
      STORE_STATUS[STATUS.SAP_DIEN_RA] = TRANG_THAI_LICH_HEN.DA_XAC_NHAN;
      STORE_STATUS[STATUS.DANG_DIEN_RA] = TRANG_THAI_LICH_HEN.DA_XAC_NHAN;
      STORE_STATUS[STATUS.DA_HOAN_THANH] = TRANG_THAI_LICH_HEN.HOAN_THANH;
      STORE_STATUS[STATUS.DA_HUY] = TRANG_THAI_LICH_HEN.DA_HUY;

    if (normalizeStatus(appointments[idx].trang_thai) !== newStatus) { appointments[idx].trang_thai = STORE_STATUS[newStatus];}

    if (typeof Storage.updateItem === "function") {
      Storage.updateItem(DK.APPOINTMENTS, "ma_lich_hen", appointments[idx]);
    } else {
      localStorage.setItem(DK.APPOINTMENTS, JSON.stringify(appointments));
    }

    if (typeof Common !== "undefined" && Common.showToast) {
      Common.showToast("Lưu trạng thái thành công!", "success"); 
    } else {
      alert("Lưu trạng thái thành công!");
    }
    
    loadAndJoinData(); 
    filterData(false);
  }

  function closeModal() { 
    if (modal) modal.style.display = "none"; 
  }

  function setupEvents() {
    if (keywordInput) {
      keywordInput.oninput = function() { filterData(); };
    }
    if (statusSelect) {
      statusSelect.onchange = function() { filterData(); };
    }
    if (dateFromInput) {
      dateFromInput.onchange = function() { 
        for (var i = 0; i < dateChips.length; i++) {
          dateChips[i].className = dateChips[i].className.replace(" active", ""); 
        }
        filterData(); 
      };
    }
    if (dateToInput) {
      dateToInput.onchange = function() { 
        for (var i = 0; i < dateChips.length; i++) {
          dateChips[i].className = dateChips[i].className.replace(" active", ""); 
        }
        filterData(); 
      };
    }

    for (var c = 0; c < dateChips.length; c++) {
      dateChips[c].onclick = function() {
        for (var k = 0; k < dateChips.length; k++) {
          dateChips[k].className = dateChips[k].className.replace(" active", "");
        }
        this.className += " active";
        applyDateRange(this.getAttribute("data-range"));
      };
    }
    
    if (btnReset) {
      btnReset.onclick = function() {
        if (keywordInput) keywordInput.value = "";
        if (statusSelect) statusSelect.value = "";
        if (dateFromInput) dateFromInput.value = "";
        if (dateToInput) dateToInput.value = "";
        for (var i = 0; i < dateChips.length; i++) {
          dateChips[i].className = dateChips[i].className.replace(" active", "");
        }
        filterData();
      };
    }
    
    if (btnCloseModal) btnCloseModal.onclick = closeModal;
    window.onclick = function(e) { if (e.target === modal) closeModal(); };
    document.onkeydown = function(e) { if (e.key === "Escape") closeModal(); };
  }

  function init() {
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 25px; color: var(--purple-gray);">Đang tải dữ liệu...</td></tr>';
    }
    if (typeof Storage !== "undefined" && Storage.initData) {
      Storage.initData();
    }
    loadAndJoinData(); 
    filterData(); 
    setupEvents();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init); 
  } else {
    init();
  }

  global.AdminBooking = { 
    showDetail: showDetail, 
    updateStatus: updateStatus, 
    refresh: function() { 
      loadAndJoinData(); 
      filterData(false); 
    } 
  };
})(typeof window !== "undefined" ? window : this);
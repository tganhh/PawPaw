(function (global) {
  "use strict";

  function getST() {
    return { SAP_DIEN_RA: "sap_dien_ra", DANG_DIEN_RA: "dang_dien_ra", DA_HOAN_THANH: "da_hoan_thanh", DA_HUY: "da_huy" };
  }

  function getDK() {
    return (typeof DATA_KEYS !== "undefined") ? DATA_KEYS : {
      APPOINTMENTS: "lich_hen", APPOINTMENT_DETAILS: "chi_tiet_lich_hen", REVIEWS: "danh_gia", PETS: "thu_cung", SERVICES: "dich_vu"
    };
  }

  var currentUser = null, listEl = null, filterEl = null, countEl = null;

  function esc(value) {
    return String(value === null || value === undefined ? "" : value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function money(n) { return (typeof Common !== "undefined" && Common.formatCurrency) ? Common.formatCurrency(n) : (n + " ₫"); }
  function fmtDate(d) { return (typeof Common !== "undefined" && Common.formatDate) ? Common.formatDate(d) : d; }
  function fmtTime(t) { return t ? String(t).slice(0, 5) : ""; }

  function stars(n) {
    var num = Math.max(0, Math.min(5, Number(n) || 0));
    var res = "";
    for (var i = 0; i < num; i++) res += "★";
    for (var j = 0; j < 5 - num; j++) res += "☆";
    return res;
  }

  function toast(msg, type) { if (typeof Common !== "undefined" && Common.showToast) Common.showToast(msg, type); else alert(msg); }
  function getList(key) { return (typeof Storage !== "undefined" && Storage.getData(key)) || []; }

  function normalizeStatus(st) {
    if (!st) return getST().SAP_DIEN_RA;
    var lower = String(st).toLowerCase();
    if (lower === "cho_xac_nhan" || lower === "da_xac_nhan" || lower === "sap_dien_ra") return getST().SAP_DIEN_RA;
    if (lower === "dang_dien_ra") return getST().DANG_DIEN_RA;
    if (lower === "hoan_thanh" || lower === "da_hoan_thanh") return getST().DA_HOAN_THANH;
    if (lower === "da_huy") return getST().DA_HUY;
    return st;
  }

  function getStatusLabel(status) {
    var ST = getST();
    switch (normalizeStatus(status)) {
      case ST.SAP_DIEN_RA: return "Sắp diễn ra";
      case ST.DANG_DIEN_RA: return "Đang diễn ra";
      case ST.DA_HOAN_THANH: return "Đã hoàn thành";
      case ST.DA_HUY: return "Đã huỷ";
      default: return status;
    }
  }

  function getMyAppointments() {
    if (!currentUser) return [];
    var uid = currentUser.ma_nguoi_dung || currentUser.ma_khach_hang || currentUser.id;
    if (!uid) return [];
    var DK = getDK();
    var all = getList(DK.APPOINTMENTS);
    var mine = [];
    for (var i = 0; i < all.length; i++) {
      if (String(all[i].ma_nguoi_dung) === String(uid)) mine.push(all[i]);
    }
    mine.sort(function (a, b) {
      var ka = (a.ngay_hen || "") + "T" + (a.gio_hen || "");
      var kb = (b.ngay_hen || "") + "T" + (b.gio_hen || "");
      return ka < kb ? 1 : ka > kb ? -1 : 0;
    });
    return mine;
  }

  function getAppointmentById(id) {
    var list = getList(getDK().APPOINTMENTS);
    for (var i = 0; i < list.length; i++) { if (String(list[i].ma_lich_hen) === String(id)) return list[i]; }
    return null;
  }

  function getReview(maLichHen) {
    if (typeof ReviewModule !== "undefined" && ReviewModule.getReviewByAppointment) return ReviewModule.getReviewByAppointment(maLichHen);
    var list = getList(getDK().REVIEWS);
    for (var i = 0; i < list.length; i++) { if (String(list[i].ma_lich_hen) === String(maLichHen)) return list[i]; }
    return null;
  }

  function checkCancel(appt) {
    if (typeof BookingRules !== "undefined" && BookingRules.canCancelOrChangeBooking) {
      var res = BookingRules.canCancelOrChangeBooking(appt);
      if (typeof res === "boolean") return { canCancel: res, message: "" };
      return res || { canCancel: false, message: "" };
    }
    return { canCancel: true, message: "" };
  }

  function buildActions(appt) {
    var ST = getST();
    var html = '<button type="button" class="btn btn-secondary btn-sm" data-action="detail" data-id="' + esc(appt.ma_lich_hen) + '">Xem chi tiết</button> ';
    var status = normalizeStatus(appt.trang_thai);

    if (status === ST.SAP_DIEN_RA) {
      var rule = checkCancel(appt);
      if (rule.canCancel) {
        html += '<button type="button" class="btn btn-danger btn-sm" data-action="cancel" data-id="' + esc(appt.ma_lich_hen) + '">Hủy lịch</button>';
      } else {
        html += '<button type="button" class="btn btn-danger btn-sm" disabled>Hủy lịch</button><span class="mybk-action-note" style="display:block; margin-top:4px;">Dưới 24h vui lòng liên hệ hotline để hỗ trợ</span>';
      }
    } else if (status === ST.DA_HOAN_THANH) {
      var review = getReview(appt.ma_lich_hen);
      if (review) {
        html += '<span class="mybk-reviewed-tag">Đã đánh giá <span class="stars-text">' + stars(review.so_sao) + '</span></span>';
      } else {
        html += '<button type="button" class="btn btn-primary btn-sm" data-action="review" data-id="' + esc(appt.ma_lich_hen) + '">Đánh giá dịch vụ</button>';
      }
    }
    return html;
  }

  function buildCard(appt) {
    var DK = getDK();
    var st = normalizeStatus(appt.trang_thai);
    var label = getStatusLabel(st);
    var allDetails = getList(DK.APPOINTMENT_DETAILS);
    var details = [];
    var petCount = {};
    for (var i = 0; i < allDetails.length; i++) {
      if (String(allDetails[i].ma_lich_hen) === String(appt.ma_lich_hen)) {
        details.push(allDetails[i]);
        petCount[allDetails[i].ma_thu_cung] = true;
      }
    }
    var numPets = Object.keys(petCount).length;

    return '<div class="mybk-item"><div class="mybk-item-top"><div><div class="mybk-code">Mã: <strong>' + esc(appt.ma_lich_hen) + '</strong></div><div class="mybk-datetime">' + esc(fmtDate(appt.ngay_hen)) + ' - ' + esc(fmtTime(appt.gio_hen)) + '</div></div><span class="badge badge-' + esc(st) + '">' + esc(label) + '</span></div><div class="mybk-body"><div><span class="mybk-label">Số thú cưng: </span>' + numPets + '</div><div><span class="mybk-label">Số dịch vụ: </span>' + details.length + '</div><div><span class="mybk-label">Tổng tiền: </span><span class="mybk-total">' + esc(money(appt.tong_tien)) + '</span></div></div><div class="mybk-actions">' + buildActions(appt) + '</div></div>';
  }

  function render() {
    if (!listEl) return;
    if (!currentUser) {
      listEl.innerHTML = '<div class="empty-state">Vui lòng đăng nhập để xem danh sách lịch đã đặt.</div>';
      if (countEl) countEl.textContent = "";
      return;
    }

    var all = getMyAppointments();
    var filter = filterEl ? filterEl.value : "all";
    var shown = [];
    if (filter === "all") {
      shown = all;
    } else {
      for (var i = 0; i < all.length; i++) {
        if (normalizeStatus(all[i].trang_thai) === filter) shown.push(all[i]);
      }
    }

    if (countEl) countEl.textContent = "Hiển thị " + shown.length + " / " + all.length + " lịch hẹn";

    if (shown.length === 0) {
      listEl.innerHTML = '<div class="empty-state">' + (all.length === 0 ? "Bạn chưa có lịch hẹn nào." : "Không có lịch hẹn nào ở trạng thái này.") + '</div>';
      return;
    }
    var html = "";
    for (var j = 0; j < shown.length; j++) html += buildCard(shown[j]);
    listEl.innerHTML = html;
  }

  function showDetail(id) {
    var appt = getAppointmentById(id);
    var body = document.getElementById("detail-body");
    var modalEl = document.getElementById("detail-modal");
    if (!appt || !body) return;

    var ST = getST();
    var DK = getDK();
    var allDetails = getList(DK.APPOINTMENT_DETAILS);
    var details = [];
    for (var i = 0; i < allDetails.length; i++) {
      if (String(allDetails[i].ma_lich_hen) === String(appt.ma_lich_hen)) details.push(allDetails[i]);
    }
    var pets = getList(DK.PETS);
    var services = getList(DK.SERVICES);
    var st = normalizeStatus(appt.trang_thai);

    var groups = {};
    var order = [];
    for (var j = 0; j < details.length; j++) {
      var d = details[j];
      if (!groups[d.ma_thu_cung]) { groups[d.ma_thu_cung] = []; order.push(d.ma_thu_cung); }
      groups[d.ma_thu_cung].push(d);
    }

    var petsHtml = "";
    for (var k = 0; k < order.length; k++) {
      var petId = order[k];
      var pet = null;
      for (var pIdx = 0; pIdx < pets.length; pIdx++) { if (String(pets[pIdx].ma_thu_cung) === String(petId)) { pet = pets[pIdx]; break; } }
      var petName = pet ? pet.ten_thu_cung : petId;
      var rows = "";
      var gDetails = groups[petId];
      for (var gd = 0; gd < gDetails.length; gd++) {
        var gdObj = gDetails[gd];
        var srv = null;
        for (var sIdx = 0; sIdx < services.length; sIdx++) { if (String(services[sIdx].ma_dich_vu) === String(gdObj.ma_dich_vu)) { srv = services[sIdx]; break; } }
        rows += '<div class="mybk-detail-row"><span>' + esc(srv ? srv.ten_dich_vu : gdObj.ma_dich_vu) + '</span><span>' + esc(money(gdObj.don_gia)) + '</span></div>';
      }
      petsHtml += '<div class="mybk-detail-pet"><div class="mybk-detail-pet-name"> Bé: <strong>' + esc(petName) + '</strong></div>' + rows + '</div>';
    }

    if (!petsHtml) petsHtml = '<div class="helper-text mybk-detail-empty-text">Không tìm thấy chi tiết dịch vụ của lịch hẹn này.</div>';

    var review = (st === ST.DA_HOAN_THANH) ? getReview(appt.ma_lich_hen) : null;
    var reviewHtml = review ? '<div class="mybk-detail-pet"><div class="mybk-detail-pet-name">Đánh giá của bạn: <span class="stars-text">' + esc(stars(review.so_sao)) + '</span></div><div class="mybk-detail-review-content" style="margin-top:4px;">' + esc(review.noi_dung_danh_gia) + '</div></div>' : "";

    body.innerHTML = '<div class="mybk-detail-row"><span class="mybk-label">Mã lịch hẹn</span><span>' + esc(appt.ma_lich_hen) + '</span></div><div class="mybk-detail-row"><span class="mybk-label">Trạng thái</span><span class="badge badge-' + esc(st) + '">' + esc(getStatusLabel(st)) + '</span></div><div class="mybk-detail-row"><span class="mybk-label">Ngày hẹn</span><span>' + esc(fmtDate(appt.ngay_hen)) + '</span></div><div class="mybk-detail-row"><span class="mybk-label">Giờ hẹn</span><span>' + esc(fmtTime(appt.gio_hen)) + '</span></div><div class="mybk-detail-row"><span class="mybk-label">Ghi chú</span><span>' + esc(appt.ghi_chu || "Không có") + '</span></div>' + petsHtml + '<div class="mybk-detail-row mybk-detail-total"><span>Tổng tiền</span><span>' + esc(money(appt.tong_tien)) + '</span></div>' + reviewHtml;

    if (modalEl) modalEl.removeAttribute("hidden");
    if (typeof Common !== "undefined" && Common.openModal) Common.openModal("detail-modal");
  }

  function cancelBooking(id) {
    var appt = getAppointmentById(id);
    if (!appt) return;
    var ST = getST();
    var DK = getDK();

    if (normalizeStatus(appt.trang_thai) !== ST.SAP_DIEN_RA) {
      toast("Lịch hẹn ở trạng thái này không thể hủy.", "error"); return render();
    }
    var rule = checkCancel(appt);
    if (!rule.canCancel) {
      toast("Dưới 24h vui lòng liên hệ hotline để hỗ trợ.", "error"); return render();
    }
    if (!global.confirm("Bạn chắc chắn muốn hủy lịch " + appt.ma_lich_hen + "?")) return;

    var updatedAppt = {};
    for (var k in appt) { updatedAppt[k] = appt[k]; }
    updatedAppt.trang_thai = ST.DA_HUY;
    
    if (typeof Storage.updateItem === "function") {
        Storage.updateItem(DK.APPOINTMENTS, "ma_lich_hen", updatedAppt);
    } else {
        var appts = getList(DK.APPOINTMENTS);
        for (var i = 0; i < appts.length; i++) {
            if (appts[i].ma_lich_hen === updatedAppt.ma_lich_hen) {
                appts[i] = updatedAppt;
                Storage.setData(DK.APPOINTMENTS, appts); break;
            }
        }
    }
    toast("Đã hủy lịch thành công.", "success");
    render();
  }

  function openReview(id) {
    var ST = getST();
    var appt = getAppointmentById(id);
    if (!appt || normalizeStatus(appt.trang_thai) !== ST.DA_HOAN_THANH) { toast("Chỉ lịch đã hoàn thành mới được đánh giá.", "error"); return; }
    if (typeof ReviewModule === "undefined") { toast("Chưa nạp được module đánh giá.", "error"); return; }
    ReviewModule.open(appt.ma_lich_hen, render);
  }

  function onListClick(e) {
    var btn = e.target;
    while (btn && btn !== listEl && !btn.hasAttribute("data-action")) btn = btn.parentElement;
    if (!btn || btn === listEl || btn.disabled) return;
    var id = btn.getAttribute("data-id");
    var action = btn.getAttribute("data-action");

    if (action === "detail") showDetail(id);
    else if (action === "cancel") cancelBooking(id);
    else if (action === "review") openReview(id);
  }

  function init() {
    listEl = document.getElementById("booking-list");
    filterEl = document.getElementById("filter-status");
    countEl = document.getElementById("result-count");

    var role = (typeof VAI_TRO !== "undefined" && VAI_TRO.KHACH_HANG) ? VAI_TRO.KHACH_HANG : "khach_hang";
    currentUser = (typeof AuthGuard !== "undefined" && AuthGuard.requireLogin) ? AuthGuard.requireLogin(role) : (typeof Storage !== "undefined" ? Storage.getCurrentUser() : null);

    if (typeof Storage !== "undefined" && Storage.initData) Storage.initData();

    if (listEl) listEl.onclick = onListClick;
    if (filterEl) filterEl.onchange = render;

    var btnClose = document.getElementById("btn-close-detail");
    if (btnClose) {
      btnClose.onclick = function () {
        var modalEl = document.getElementById("detail-modal");
        if (modalEl) modalEl.setAttribute("hidden", "hidden");
        if (typeof Common !== "undefined" && Common.closeModal) Common.closeModal("detail-modal");
      };
    }
    render();
  }

  global.MyBookingModule = { init: init, render: render };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})(typeof window !== "undefined" ? window : this);
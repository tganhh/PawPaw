(function (global) {
  "use strict";

  var STAR_LABELS = ["", "Rất tệ", "Chưa tốt", "Bình thường", "Hài lòng", "Tuyệt vời"];
  var modalId = "review-modal";
  var currentAppointmentId = null, currentRating = 0, onSavedCallback = null, bound = false;
  var form, starsBox, contentInput, infoBox, starError, contentError, btnCancel;

  function pad(n) { var s = String(n); return s.length < 2 ? "0" + s : s; }

  function nowLocalIso() {
    var d = new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
  }

  function getAllReviews() { return (typeof Storage !== "undefined" && Storage.getData(DATA_KEYS.REVIEWS)) || []; }

  function getReviewByAppointment(maLichHen) {
    var revs = getAllReviews();
    for (var i = 0; i < revs.length; i++) { if (String(revs[i].ma_lich_hen) === String(maLichHen)) return revs[i]; }
    return null;
  }

  function showToast(msg, type) { if (typeof Common !== "undefined" && Common.showToast) Common.showToast(msg, type); }

  function queryElements() {
    form = document.getElementById("review-form");
    starsBox = document.getElementById("review-stars");
    contentInput = document.getElementById("review-content");
    infoBox = document.getElementById("review-appointment-info");
    starError = document.getElementById("review-star-error");
    contentError = document.getElementById("review-content-error");
    btnCancel = document.getElementById("btn-cancel-review");
  }

  function renderStars() {
    if (!starsBox) return;
    starsBox.innerHTML = "";
    for (var i = 1; i <= 5; i++) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "star-btn";
      btn.setAttribute("data-value", i);
      btn.textContent = "★";
      btn.setAttribute("aria-label", i + " sao");
      btn.title = i + " sao - " + STAR_LABELS[i];
      starsBox.appendChild(btn);
    }
  }

  function paintStars() {
    if (!starsBox) return;
    var btns = starsBox.querySelectorAll(".star-btn");
    for (var i = 0; i < btns.length; i++) {
      var val = Number(btns[i].getAttribute("data-value"));
      if (val <= currentRating) btns[i].className = "star-btn on";
      else btns[i].className = "star-btn";
    }
  }

  function resetForm() {
    currentRating = 0;
    if (contentInput) contentInput.value = "";
    if (starError) starError.textContent = "";
    if (contentError) contentError.textContent = "";
    paintStars();
  }

  function bindEvents() {
    if (bound) return;
    bound = true;
    if (starsBox) {
      starsBox.onclick = function (e) {
        var btn = e.target;
        while (btn && btn !== starsBox && btn.className.indexOf("star-btn") === -1) btn = btn.parentElement;
        if (!btn || btn === starsBox) return;
        currentRating = Number(btn.getAttribute("data-value"));
        if (starError) starError.textContent = "";
        paintStars();
      };
    }
    if (form) form.onsubmit = handleSubmit;
    if (btnCancel) btnCancel.onclick = close;
  }

  function init() { queryElements(); renderStars(); bindEvents(); }

  function open(maLichHen, onSaved) {
    if (!form) init();
    if (getReviewByAppointment(maLichHen)) { showToast("Lịch hẹn này đã được đánh giá.", "error"); return false; }
    currentAppointmentId = maLichHen;
    onSavedCallback = typeof onSaved === "function" ? onSaved : null;
    resetForm();
    if (infoBox) infoBox.textContent = "Lịch hẹn: " + maLichHen;
    if (typeof Common !== "undefined" && Common.openModal) Common.openModal(modalId);
    return true;
  }

  function close() {
    if (typeof Common !== "undefined" && Common.closeModal) Common.closeModal(modalId);
    currentAppointmentId = null;
  }

  function handleSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!currentAppointmentId) return false;

    var content = contentInput ? contentInput.value.trim() : "";
    var valid = true;
    if (starError) starError.textContent = "";
    if (contentError) contentError.textContent = "";

    if (currentRating < 1 || currentRating > 5) { if (starError) starError.textContent = "Vui lòng chọn số sao (1 - 5)."; valid = false; }
    if (!content) { if (contentError) contentError.textContent = "Vui lòng nhập nội dung phản hồi."; valid = false; }
    if (!valid) return false;

    if (getReviewByAppointment(currentAppointmentId)) {
      showToast("Lịch hẹn này đã được đánh giá.", "error"); close();
      if (onSavedCallback) onSavedCallback(); return false;
    }

    var review = {
      ma_danh_gia: Storage.generateId("DG", DATA_KEYS.REVIEWS, "ma_danh_gia"),
      ma_lich_hen: currentAppointmentId,
      so_sao: currentRating,
      trang_thai_hien_thi: (typeof HIEN_THI !== "undefined") ? HIEN_THI.HIEN_THI : "hien_thi",
      thoi_gian_danh_gia: nowLocalIso(),
      noi_dung_danh_gia: content
    };

    Storage.addItem(DATA_KEYS.REVIEWS, review);
    showToast("Cảm ơn bạn đã đánh giá dịch vụ!", "success");

    var cb = onSavedCallback;
    close();
    if (cb) cb(review);
    return true;
  }

  global.ReviewModule = { init: init, open: open, close: close, getReviewByAppointment: getReviewByAppointment };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})(typeof window !== "undefined" ? window : this);
(function (global) {
  "use strict";

  function getDK() {
    return (typeof DATA_KEYS !== "undefined") ? DATA_KEYS : (typeof CONSTANTS !== "undefined" && CONSTANTS.DATA_KEYS ? CONSTANTS.DATA_KEYS : {
      PETS: "thu_cung", SERVICES: "dich_vu", APPOINTMENTS: "lich_hen", APPOINTMENT_DETAILS: "chi_tiet_lich_hen"
    });
  }

  var currentUser = null;
  var userPets = [];
  var allServices = [];
  var existingAppointments = [];
  var nextPetIndex = 0;

  var petContainer = null, btnAddPet = null, dateInput = null, slotsContainer = null, selectedSlotInput = null, bookingForm = null, noteInput = null;
  var summaryPetCount = null, summaryServiceCount = null, summaryDuration = null, summaryTotalPrice = null, durationBadge = null;

  function queryElements() {
    bookingForm = document.getElementById("booking-form") || document.querySelector("form");
    petContainer = document.getElementById("pet-items-container") || document.querySelector(".pet-items-container");
    btnAddPet = document.getElementById("btn-add-pet-row") || document.getElementById("btn-add-pet");
    dateInput = document.getElementById("booking-date") || document.querySelector('input[type="date"]');
    slotsContainer = document.getElementById("slots-container");
    selectedSlotInput = document.getElementById("selected-slot");
    noteInput = document.getElementById("booking-note") || document.querySelector("textarea");
    summaryPetCount = document.getElementById("summary-pet-count");
    summaryServiceCount = document.getElementById("summary-service-count");
    summaryDuration = document.getElementById("summary-duration");
    summaryTotalPrice = document.getElementById("summary-total-price");
    durationBadge = document.getElementById("estimated-duration-badge");
  }

  function getPetTypeString(loai) {
    if (loai === 2 || loai === "2" || loai === "cho" || loai === "Chó") return "Chó";
    return "Mèo";
  }

  function loadDataSync() {
    if (typeof Storage !== "undefined") currentUser = Storage.getCurrentUser();
    var role = typeof VAI_TRO !== "undefined" && VAI_TRO.KHACH_HANG ? VAI_TRO.KHACH_HANG : "khach_hang";

    if (!currentUser && typeof AuthGuard !== "undefined" && AuthGuard.requireLogin) {
      try { currentUser = AuthGuard.requireLogin(role); } catch (e) {}
    }

    var DK = getDK();
    var allPets = (typeof Storage !== "undefined" && Storage.getData(DK.PETS)) ? Storage.getData(DK.PETS) : [];

    if (currentUser && currentUser.ma_nguoi_dung) {
      userPets = [];
      for (var i = 0; i < allPets.length; i++) {
        if (String(allPets[i].ma_nguoi_dung) === String(currentUser.ma_nguoi_dung)) {
          userPets.push(allPets[i]);
        }
      }
    } else { userPets = []; }

    allServices = (typeof Storage !== "undefined" && Storage.getData(DK.SERVICES)) ? Storage.getData(DK.SERVICES) : [];
    existingAppointments = (typeof Storage !== "undefined" && Storage.getData(DK.APPOINTMENTS)) ? Storage.getData(DK.APPOINTMENTS) : [];
  }

  function createPetRow() {
    if (!petContainer) return null;
    var rowIndex = nextPetIndex++;
    var petCard = document.createElement("div");
    petCard.className = "pet-item-card";
    petCard.setAttribute("data-index", rowIndex);

    var optionsHtml = '<option value="">-- Chọn thú cưng --</option>';
    for (var i = 0; i < userPets.length; i++) {
      var pet = userPets[i];
      var typeStr = getPetTypeString(pet.loai);
      optionsHtml += '<option value="' + pet.ma_thu_cung + '">' + pet.ten_thu_cung + ' (' + typeStr + ' - ' + pet.can_nang + 'kg)</option>';
    }

    petCard.innerHTML = '<div class="booking-pet-header"><span class="booking-pet-title">Thú cưng thực hiện</span>' +
      '<button type="button" class="btn btn-danger btn-sm btn-remove-pet">Xóa</button></div>' +
      '<div class="form-group"><select class="pet-select" name="ma_thu_cung" required>' + optionsHtml + '</select>' +
      '<small class="error-message"></small></div>' +
      '<div class="pet-services-wrapper" style="display: none;"><div class="service-checkbox-grid"></div>' +
      '<small class="error-message service-error"></small></div>';

    petContainer.appendChild(petCard);

    var petSelect = petCard.querySelector(".pet-select");
    petSelect.onchange = function () {
      var petId = this.value;
      if (!petId) {
        handlePetSelection(petCard, "");
        return;
      }
      var allSelects = petContainer.querySelectorAll(".pet-select");
      var isDuplicate = false;
      for (var j = 0; j < allSelects.length; j++) {
        if (allSelects[j] !== this && allSelects[j].value === petId) { isDuplicate = true; break; }
      }

      if (isDuplicate) {
        this.value = "";
        handlePetSelection(petCard, "");
        if (typeof Common !== "undefined" && Common.showToast) Common.showToast("Bé thú cưng này đã được chọn ở mục khác!", "error");
        return;
      }
      handlePetSelection(petCard, petId);
    };

    var removeBtn = petCard.querySelector(".btn-remove-pet");
    if (removeBtn) {
      removeBtn.onclick = function () {
        var cardCount = petContainer.querySelectorAll(".pet-item-card").length;
        if (cardCount <= 1) {
          if (typeof Common !== "undefined" && Common.showToast) Common.showToast("Cần giữ lại ít nhất một nhóm thú cưng!", "error");
          return;
        }
        petCard.parentNode.removeChild(petCard);
        updatePetSelectOptions();
        recalculate();
      };
    }
    updatePetSelectOptions();
    return petCard;
  }

  function handlePetSelection(petCard, petId) {
    var wrapper = petCard.querySelector(".pet-services-wrapper");
    var grid = petCard.querySelector(".service-checkbox-grid");
    if (!wrapper || !grid) return;

    if (!petId) {
      wrapper.style.display = "none";
      grid.innerHTML = "";
      updatePetSelectOptions();
      recalculate();
      return;
    }

    var pet = null;
    for (var i = 0; i < userPets.length; i++) {
      if (String(userPets[i].ma_thu_cung) === String(petId)) { pet = userPets[i]; break; }
    }

    var applicable = [];
    for (var j = 0; j < allServices.length; j++) {
      var service = allServices[j];
      if (!service.loai_ap_dung || !pet) {
        applicable.push(service);
        continue;
      }
      var petType = getPetTypeString(pet.loai).toLowerCase();
      var serviceType = String(service.loai_ap_dung).toLowerCase();
      if ((petType === "chó" || petType === "cho") && (serviceType === "cho" || serviceType === "2")) applicable.push(service);
      else if ((petType === "mèo" || petType === "meo") && (serviceType === "meo" || serviceType === "1")) applicable.push(service);
    }

    var html = "";
    for (var k = 0; k < applicable.length; k++) {
      var srv = applicable[k];
      var price = (typeof BookingRules !== "undefined" && BookingRules.calculateServicePrice) ? 
      BookingRules.calculateServicePrice(srv, pet) : Number(srv.gia_duoi_5kg || srv.gia_5_15kg || srv.gia_tren_15kg || 0);
      var priceStr = (typeof Common !== "undefined" && Common.formatCurrency) ? Common.formatCurrency(price) : (price + " ₫");
      html += '<label class="service-checkbox-label"><input type="checkbox" class="service-checkbox" value="' + srv.ma_dich_vu + '" data-price="' + (Number(price) || 0) 
      + '" data-duration="' + (Number(srv.thoi_gian_du_kien) || 30) + '"><span>' + srv.ten_dich_vu + ' (' + priceStr + ')</span></label>';
    }

    grid.innerHTML = html;
    wrapper.style.display = "block";

    var checkboxes = grid.querySelectorAll(".service-checkbox");
    for (var c = 0; c < checkboxes.length; c++) {
      checkboxes[c].onchange = recalculate;
    }

    updatePetSelectOptions();
    recalculate();
  }

  function updatePetSelectOptions() {
    if (!petContainer) return;
    var selects = petContainer.querySelectorAll(".pet-select");
    var chosen = [];
    for (var i = 0; i < selects.length; i++) {
      if (selects[i].value) chosen.push(selects[i].value);
    }

    for (var j = 0; j < selects.length; j++) {
      var select = selects[j];
      var options = select.options;
      for (var o = 0; o < options.length; o++) {
        var opt = options[o];
        if (!opt.value) continue;
        var isChosen = false;
        for (var c = 0; c < chosen.length; c++) {
          if (chosen[c] === opt.value) { isChosen = true; break; }
        }
        opt.disabled = isChosen && opt.value !== select.value;
      }
    }

    var removeBtns = petContainer.querySelectorAll(".btn-remove-pet");
    for (var b = 0; b < removeBtns.length; b++) {
      removeBtns[b].style.display = selects.length > 1 ? "inline-block" : "none";
    }
  }

  function recalculate() {
    if (!petContainer) return;
    var pets = 0, services = 0, minutes = 0, total = 0;
    var cards = petContainer.querySelectorAll(".pet-item-card");

    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];
      var select = card.querySelector(".pet-select");
      var checkedServices = card.querySelectorAll(".service-checkbox:checked");
      if (select && select.value && checkedServices.length > 0) {
        pets++;
        for (var c = 0; c < checkedServices.length; c++) {
          var cb = checkedServices[c];
          services++;
          total += Number(cb.getAttribute("data-price")) || 0;
          minutes += Number(cb.getAttribute("data-duration")) || 0;
        }
      }
    }

    var formatted = (typeof Common !== "undefined" && Common.formatCurrency) ? Common.formatCurrency(total) : (total + " ₫");
    if (summaryPetCount) summaryPetCount.textContent = pets + " bé";
    if (summaryServiceCount) summaryServiceCount.textContent = services + " dịch vụ";
    if (summaryDuration) summaryDuration.textContent = minutes + " phút";
    if (summaryTotalPrice) summaryTotalPrice.textContent = formatted;
    if (durationBadge) durationBadge.textContent = "Tổng thời gian: " + minutes + " phút";
    if (dateInput && dateInput.value) renderSlots(dateInput.value);
  }

  function renderSlots(dateStr) {
    if (!slotsContainer) return;
    slotsContainer.innerHTML = "";
    if (selectedSlotInput) selectedSlotInput.value = "";
    if (!dateStr) return;

    var allSlots = (typeof CONSTANTS !== "undefined" && CONSTANTS.KHUNG_GIO) ? CONSTANTS.KHUNG_GIO : ["08:30:00", "09:00:00", "09:30:00", "10:00:00", "10:30:00", 
      "11:00:00", "13:30:00", "14:00:00", "15:00:00", "15:30:00", "16:00:00"];

    // Lấy danh sách khung giờ trống (đã loại trừ quá khứ và giờ đã có lịch đặt)
    var availableSlots = (typeof BookingRules !== "undefined" && BookingRules.getAvailableTimeSlots) 
        ? BookingRules.getAvailableTimeSlots(dateStr, existingAppointments, allSlots) 
        : null;

    for (var i = 0; i < allSlots.length; i++) {
      (function(slot) {
        var isAvailable = availableSlots !== null 
            ? (availableSlots.indexOf(slot) !== -1) 
            : ((typeof BookingRules !== "undefined" && BookingRules.isNotPastDateTime) ? BookingRules.isNotPastDateTime(dateStr, slot) : true);

        var pill = document.createElement("div");
        pill.className = "slot-pill" + (!isAvailable ? " disabled" : "");
        pill.textContent = slot.slice(0, 5);

        if (isAvailable) {
          pill.onclick = function () {
            var pills = slotsContainer.querySelectorAll(".slot-pill");
            for (var p = 0; p < pills.length; p++) pills[p].className = pills[p].className.replace(" active", "");
            pill.className += " active";
            if (selectedSlotInput) selectedSlotInput.value = slot;
            var error = document.getElementById("slot-error-message");
            if (error) { error.style.display = "none"; error.textContent = ""; }
          };
        }
        slotsContainer.appendChild(pill);
      })(allSlots[i]);
    }
  }

  function handleSubmit(event) {
    if (event && event.preventDefault) event.preventDefault();
    var isValid = true;
    var petCards = petContainer ? petContainer.querySelectorAll(".pet-item-card") : [];
    var detailsToSave = [];

    for (var i = 0; i < petCards.length; i++) {
      var card = petCards[i];
      var select = card.querySelector(".pet-select");
      var checkedServices = card.querySelectorAll(".service-checkbox:checked");

      if (typeof Validation !== "undefined" && select) Validation.clearError(select);

      if (!select || !select.value) {
        if (typeof Validation !== "undefined" && select) Validation.showError(select, "Vui lòng chọn thú cưng");
        isValid = false;
        continue;
      }

      var serviceError = card.querySelector(".service-error");
      if (checkedServices.length === 0) {
        if (serviceError) { serviceError.textContent = "Vui lòng chọn ít nhất một dịch vụ cho thú cưng này."; serviceError.style.display = "block"; }
        isValid = false;
        continue;
      }

      if (serviceError) { serviceError.textContent = ""; serviceError.style.display = "none"; }
      for (var c = 0; c < checkedServices.length; c++) {
        var checkbox = checkedServices[c];
        detailsToSave.push({ ma_thu_cung: select.value, ma_dich_vu: checkbox.value, don_gia: Number(checkbox.getAttribute("data-price")) || 0 });
      }
    }

    if (petCards.length === 0) {
      isValid = false;
      if (typeof Common !== "undefined" && Common.showToast) Common.showToast("Vui lòng thêm ít nhất một thú cưng!", "error");
    }

    if (dateInput) {
      if (typeof Validation !== "undefined") Validation.clearError(dateInput);
      if (!dateInput.value) {
        if (typeof Validation !== "undefined") Validation.showError(dateInput, "Vui lòng chọn ngày");
        isValid = false;
      }
    }

    var slotValue = selectedSlotInput ? selectedSlotInput.value : "";
    if (!slotValue) {
      var slotError = document.getElementById("slot-error-message");
      if (slotError) { slotError.textContent = "Vui lòng chọn giờ"; slotError.style.display = "block"; }
      isValid = false;
    }

    if (!isValid) {
      if (typeof Common !== "undefined" && Common.showToast) Common.showToast("Vui lòng hoàn thiện các trường thông tin còn thiếu!", "error");
      return false;
    }

    // Kiểm tra lại trạng thái trùng lịch trước khi submit lưu dữ liệu
    if (typeof BookingRules !== "undefined" && BookingRules.isTimeSlotAvailable) {
      var isSlotAvailable = BookingRules.isTimeSlotAvailable(dateInput.value, slotValue, existingAppointments);
      if (!isSlotAvailable) {
        if (typeof Common !== "undefined" && Common.showToast) {
          Common.showToast("Khung giờ này vừa có người đặt. Vui lòng chọn khung giờ khác!", "error");
        } else {
          alert("Khung giờ này vừa có người đặt. Vui lòng chọn khung giờ khác!");
        }
        
        renderSlots(dateInput.value); 
        return false;
      }
    }

    var DK = getDK();
    if (typeof Storage === "undefined" || !Storage.addItem) {
      if (typeof Common !== "undefined" && Common.showToast) Common.showToast("Không thể lưu lịch hẹn. Vui lòng tải lại trang!", "error");
      return false;
    }

    var newAppointmentId = Storage.generateId ? Storage.generateId("LH", DK.APPOINTMENTS, "ma_lich_hen") : "LH" + String(Date.now()).slice(-6);
    var totalMoney = 0;
    for (var j = 0; j < detailsToSave.length; j++) totalMoney += detailsToSave[j].don_gia;

    var userId = currentUser ? (currentUser.ma_nguoi_dung || currentUser.ma_khach_hang) : null;
    if (!userId) {
      if (typeof Common !== "undefined" && Common.showToast) Common.showToast("Không xác định được tài khoản đang đăng nhập!", "error");
      return false;
    }

    var noteValue = noteInput ? noteInput.value.trim() : "";
    var statusValue = typeof TRANG_THAI_LICH_HEN !== "undefined" ? TRANG_THAI_LICH_HEN.CHO_XAC_NHAN : (typeof CONSTANTS !== "undefined" && CONSTANTS.TRANG_THAI_LICH_HEN ? CONSTANTS.TRANG_THAI_LICH_HEN.CHO_XAC_NHAN : "cho_xac_nhan");

    var appointment = {
      ma_lich_hen: newAppointmentId,
      ma_nguoi_dung: userId,
      ngay_hen: dateInput ? dateInput.value : "",
      gio_hen: slotValue,
      tong_tien: totalMoney,
      ghi_chu: noteValue || null,
      trang_thai: statusValue,
      thoi_gian_tao: nowLocalISO()
    };

    Storage.addItem(DK.APPOINTMENTS, appointment);

    for (var k = 0; k < detailsToSave.length; k++) {
      var detail = detailsToSave[k];
      var newDetailId = Storage.generateId ? Storage.generateId("CT", DK.APPOINTMENT_DETAILS, "ma_chi_tiet") : "CT" + String(Date.now()).slice(-6);
      var detailRecord = { ma_chi_tiet: newDetailId, ma_lich_hen: newAppointmentId, ma_thu_cung: detail.ma_thu_cung, ma_dich_vu: detail.ma_dich_vu, don_gia: detail.don_gia };
      Storage.addItem(DK.APPOINTMENT_DETAILS, detailRecord);
    }

    if (typeof Common !== "undefined" && Common.showToast) Common.showToast("Đặt lịch chăm sóc thành công!", "success");
    return true;
  }

  function init() {
    queryElements();
    if (!petContainer) return;
    loadDataSync();

    if (!petContainer.querySelector(".pet-item-card")) createPetRow();
    if (btnAddPet) btnAddPet.onclick = function () { createPetRow(); };
    if (dateInput) dateInput.onchange = function () { recalculate(); };
    if (bookingForm) bookingForm.onsubmit = handleSubmit;

    updatePetSelectOptions();
    recalculate();
  }

  global.BookingModule = { init: init, createPetRow: createPetRow, recalculate: recalculate, handleSubmit: handleSubmit };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})(typeof window !== "undefined" ? window : this);

function nowLocalISO() {
  var d = new Date();
  function p(n) { return n < 10 ? "0" + n : "" + n; }
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) +
         "T" + p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds());
}
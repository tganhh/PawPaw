(function (global) {
  'use strict';

  var CONSTANTS = (typeof window !== 'undefined' && window.CONSTANTS)
    ? window.CONSTANTS
    : (typeof global !== 'undefined' && global.CONSTANTS ? global.CONSTANTS : null);

  var DEFAULT_KHUNG_GIO = (CONSTANTS && CONSTANTS.KHUNG_GIO) || [
    "08:30:00", "09:00:00", "09:30:00", "10:00:00", "10:30:00",
    "11:00:00", "13:30:00", "14:00:00", "15:00:00", "15:30:00", "16:00:00"
  ];

  var STATUS_DA_HUY = (CONSTANTS && CONSTANTS.TRANG_THAI_LICH_HEN && CONSTANTS.TRANG_THAI_LICH_HEN.DA_HUY) || "da_huy";

  function padZero(num) {
    return String(num).length < 2 ? "0" + num : String(num);
  }

  function normalizeTime(timeStr) {
    if (!timeStr) return '';
    var parts = String(timeStr).trim().split(':');
    if (parts.length === 2) return padZero(parts[0]) + ":" + padZero(parts[1]) + ":00";
    if (parts.length === 3) return padZero(parts[0]) + ":" + padZero(parts[1]) + ":" + padZero(parts[2]);
    return timeStr;
  }

  function calculateServicePrice(service, petOrWeight) {
    if (!service) return 0;
    var weight = 0;
    var petType = null;

    if (typeof petOrWeight === 'object' && petOrWeight !== null) {
      weight = Number(petOrWeight.can_nang) || 0;
      petType = petOrWeight.loai;
    } else {
      weight = Number(petOrWeight) || 0;
    }

    if (service.loai_ap_dung && petType && service.loai_ap_dung !== petType) {
      return 0;
    }

    if (weight < 5) return Number(service.gia_duoi_5kg) || 0;
    if (weight <= 15) return Number(service.gia_5_15kg) || 0;
    return Number(service.gia_tren_15kg) || 0;
  }

  function calculateTotalPrice(items, petOrWeight) {
    // Không dùng reduce, dùng for
    var isArray = Object.prototype.toString.call(items) === '[object Array]';
    if (!isArray || items.length === 0) return 0;

    var total = 0;
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      if (!item) continue;
      if (typeof item.don_gia !== 'undefined') {
        total += (Number(item.don_gia) || 0);
      } else {
        total += calculateServicePrice(item, petOrWeight);
      }
    }
    return total;
  }

  function isNotPastDateTime(dateStr, timeStr, nowInstance) {
    if (!dateStr) return false;
    var now = nowInstance instanceof Date ? nowInstance : new Date();
    var targetDate = new Date(dateStr);
    
    if (isNaN(targetDate.getTime())) return false;

    if (timeStr) {
      var formattedTime = normalizeTime(timeStr);
      var parts = formattedTime.split(':');
      var h = Number(parts[0]);
      var m = Number(parts[1]);
      var s = Number(parts[2]);
      
      var targetDateTime = new Date(dateStr);
      targetDateTime.setHours(h || 0, m || 0, s || 0, 0);
      return targetDateTime >= now;
    }

    var endOfDay = new Date(dateStr);
    endOfDay.setHours(23, 59, 59, 999);
    return endOfDay >= now;
  }

  function isTimeSlotAvailable(dateStr, timeStr, existingAppointments, maxCapacity) {
    maxCapacity = maxCapacity !== undefined ? maxCapacity : 1; // Default params
    if (!dateStr || !timeStr) return false;
    
    var isArray = Object.prototype.toString.call(existingAppointments) === '[object Array]';
    if (!isArray || existingAppointments.length === 0) return true;

    var checkTime = normalizeTime(timeStr);
    var activeConflicts = 0;

    // Thay filter bằng vòng lặp for
    for (var i = 0; i < existingAppointments.length; i++) {
      var apt = existingAppointments[i];
      if (!apt) continue;
      
      var aptDate = apt.ngay_hen;
      var aptTime = normalizeTime(apt.gio_hen);
      var isCancelled = (apt.trang_thai === STATUS_DA_HUY);

      if (aptDate === dateStr && aptTime === checkTime && !isCancelled) {
        activeConflicts++;
      }
    }
    return activeConflicts < maxCapacity;
  }

  function getAvailableTimeSlots(dateStr, existingAppointments, allSlots, nowInstance) {
    allSlots = allSlots || DEFAULT_KHUNG_GIO;
    if (!dateStr) return [];

    var available = [];
    for (var i = 0; i < allSlots.length; i++) {
      var slot = allSlots[i];
      var isNotPast = isNotPastDateTime(dateStr, slot, nowInstance);
      if (isNotPast && isTimeSlotAvailable(dateStr, slot, existingAppointments)) {
        available.push(slot);
      }
    }
    return available;
  }

  function validateBooking(bookingInput, existingAppointments, nowInstance) {
    if (!bookingInput) {
      return { isValid: false, message: 'Dữ liệu đặt lịch không được để trống.' };
    }

    var ma_thu_cung = bookingInput.ma_thu_cung;
    var pet = bookingInput.pet;
    var services = bookingInput.services;
    var danh_sach_dich_vu = bookingInput.danh_sach_dich_vu;
    var ngay_hen = bookingInput.ngay_hen;
    var gio_hen = bookingInput.gio_hen;

    if (!ma_thu_cung && !pet) {
      return { isValid: false, message: 'Vui lòng chọn thú cưng thực hiện dịch vụ.' };
    }

    var selectedServices = services || danh_sach_dich_vu;
    var isArray = Object.prototype.toString.call(selectedServices) === '[object Array]';
    if (!isArray || selectedServices.length === 0) {
      return { isValid: false, message: 'Vui lòng chọn ít nhất một dịch vụ chăm sóc.' };
    }

    if (!ngay_hen || !gio_hen) {
      return { isValid: false, message: 'Vui lòng chọn ngày và khung giờ hẹn.' };
    }

    if (!isNotPastDateTime(ngay_hen, gio_hen, nowInstance)) {
      return { isValid: false, message: 'Không thể đặt lịch vào ngày hoặc khung giờ đã trôi qua.' };
    }

    if (!isTimeSlotAvailable(ngay_hen, gio_hen, existingAppointments)) {
      return { isValid: false, message: 'Khung giờ này đã có người đặt trước. Vui lòng chọn khung giờ khác.' };
    }

    return { isValid: true, message: 'Thông tin đặt lịch hợp lệ.' };
  }

  function canCancelOrChangeBooking(appointmentOrDate, timeStr, nowInstance) {
    var dateVal = '';
    var timeVal = '';

    if (typeof appointmentOrDate === 'object' && appointmentOrDate !== null) {
      dateVal = appointmentOrDate.ngay_hen;
      timeVal = appointmentOrDate.gio_hen;
    } else {
      dateVal = appointmentOrDate;
      timeVal = timeStr;
    }

    if (!dateVal || !timeVal) {
      return { canCancel: false, message: 'Thông tin lịch hẹn không hợp lệ.' };
    }

    var formattedTime = normalizeTime(timeVal);
    var parts = formattedTime.split(':');
    var h = Number(parts[0]);
    var m = Number(parts[1]);
    var s = Number(parts[2]);
    
    var appointmentDateTime = new Date(dateVal);
    appointmentDateTime.setHours(h || 0, m || 0, s || 0, 0);

    var now = nowInstance instanceof Date ? nowInstance : new Date();
    var diffMs = appointmentDateTime.getTime() - now.getTime();
    var diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours > 24) {
      return { canCancel: true, message: 'Có thể hủy hoặc đổi lịch.' };
    } else if (diffHours <= 0) {
      return { canCancel: false, message: 'Lịch hẹn này đã diễn ra hoặc đang diễn ra.' };
    } else {
      return { canCancel: false, message: 'Chỉ được hủy hoặc thay đổi lịch khi còn trên 24 giờ tới ca hẹn.' };
    }
  }

  var BookingRules = {
    calculateServicePrice: calculateServicePrice,
    isTimeSlotAvailable: isTimeSlotAvailable,
    validateBooking: validateBooking,
    getAvailableTimeSlots: getAvailableTimeSlots,
    calculateTotalPrice: calculateTotalPrice,
    canCancelOrChangeBooking: canCancelOrChangeBooking,
    isNotPastDateTime: isNotPastDateTime,
    normalizeTime: normalizeTime,

    tinhGia: calculateServicePrice,
    tinhTongTien: calculateTotalPrice,
    kiemTraGioTrong: isTimeSlotAvailable,
    layGioTrong: getAvailableTimeSlots
  };

  if (typeof window !== 'undefined') {
    window.BookingRules = BookingRules;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = BookingRules;
  }
})(typeof window !== 'undefined' ? window : this);
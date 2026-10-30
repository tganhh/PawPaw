document.addEventListener("DOMContentLoaded", function() {
  var currentUser = AuthGuard.requireLogin(VAI_TRO.QUAN_LY);
  if (!currentUser) return;
  if (typeof currentUser === "string") currentUser = Storage.getItemById(DATA_KEYS.USERS, "ma_nguoi_dung", currentUser);
  if (!currentUser) return;

  var form = document.getElementById("profileForm");
  var maNguoiDungInput = document.getElementById("maNguoiDung");
  var emailInput = document.getElementById("email");
  var hoTenInput = document.getElementById("hoTen");
  var soDienThoaiInput = document.getElementById("soDienThoai");
  var diaChiInput = document.getElementById("diaChi");
  var avatarWrapper = document.getElementById("avatarWrapper");
  var avatarFileInput = document.getElementById("avatarFileInput");
  var avatarPreview = document.getElementById("avatarPreview");
  var alertSuccess = document.getElementById("alertSuccess");
  var formGeneralError = document.getElementById("formGeneralError");
  var btnBack = document.getElementById("btnBack");

  var currentAvatarData = currentUser.anh_dai_dien || "";

  function renderUserData() {
    if (maNguoiDungInput) maNguoiDungInput.value = currentUser.ma_nguoi_dung || "";
    if (emailInput) emailInput.value = currentUser.email || "";
    if (hoTenInput) hoTenInput.value = currentUser.ho_ten || "";
    if (soDienThoaiInput) soDienThoaiInput.value = currentUser.so_dien_thoai || "";
    if (diaChiInput) diaChiInput.value = currentUser.dia_chi || "";
    updateAvatarDisplay(currentAvatarData, currentUser.ho_ten);
  }

  function updateAvatarDisplay(src, name) {
    if (!avatarPreview) return;
    if (src && src.trim()) { avatarPreview.src = src; }
    else { avatarPreview.src = "https://ui-avatars.com/api/?name=" + encodeURIComponent(name || "Admin") + "&background=806E83&color=fff"; }
  }

  renderUserData();

  if (btnBack) { btnBack.onclick = function() { window.location.href = "dashboard.html"; }; }

  if (avatarWrapper && avatarFileInput) {
    avatarWrapper.onclick = function() { avatarFileInput.click(); };
    avatarFileInput.onchange = function(e) {
      var file = e.target.files[0];
      if (!file) return;
      if (file.type.indexOf("image/") !== 0) { alert("Vui lòng chọn một file hình ảnh!"); avatarFileInput.value = ""; return; }
      if (file.size > 2 * 1024 * 1024) { alert("Kích thước ảnh đại diện không được vượt quá 2MB!"); avatarFileInput.value = ""; return; }

      var reader = new FileReader();
      reader.onload = function(event) { currentAvatarData = event.target.result; if (avatarPreview) avatarPreview.src = currentAvatarData; };
      reader.readAsDataURL(file);
    };
  }

  function validateNameField() {
    if (!hoTenInput) return false;
    return Validation.validateField(hoTenInput, function(value) { return Validation.validateRequired(value, "Họ và tên"); });
  }

  function validatePhoneField() {
    if (!soDienThoaiInput) return false;
    var phoneValue = soDienThoaiInput.value.trim();
    var errorMessage = Validation.validatePhone(phoneValue);
    if (errorMessage) { Validation.showError(soDienThoaiInput, errorMessage); return false; }

    var users = Storage.getData(DATA_KEYS.USERS) || [];
    var currentId = String(currentUser.ma_nguoi_dung || "");
    var isExisted = false;

    for (var i = 0; i < users.length; i++) {
      var user = users[i];
      if (String(user.so_dien_thoai || "").trim() === phoneValue && String(user.ma_nguoi_dung || "").trim() !== currentId) {
        isExisted = true; break;
      }
    }

    if (isExisted) { Validation.showError(soDienThoaiInput, "Số điện thoại này đã được sử dụng bởi tài khoản khác"); return false; }
    Validation.clearError(soDienThoaiInput); return true;
  }

  if (hoTenInput) { hoTenInput.onblur = validateNameField; hoTenInput.oninput = function() { Validation.clearError(hoTenInput); }; }
  if (soDienThoaiInput) { soDienThoaiInput.onblur = validatePhoneField; soDienThoaiInput.oninput = validatePhoneField; }

  function showMessage(element, message, type) {
    if (!element) return;
    element.textContent = message;
    element.className = element.className.replace(" success", "").replace(" error", "");
    if (type) element.className += " " + type;
    element.style.display = "block";
  }

  if (form) {
    form.onsubmit = function(e) {
      e.preventDefault();
      if (alertSuccess) alertSuccess.style.display = "none";
      if (formGeneralError) formGeneralError.style.display = "none";

      if (!validateNameField() || !validatePhoneField()) return;

      var updatedUser = {};
      for(var k in currentUser) updatedUser[k] = currentUser[k];
      updatedUser.ho_ten = hoTenInput.value.trim();
      updatedUser.so_dien_thoai = soDienThoaiInput.value.trim();
      updatedUser.dia_chi = diaChiInput ? diaChiInput.value.trim() : "";
      updatedUser.anh_dai_dien = currentAvatarData || null;

      if (Storage.updateItem(DATA_KEYS.USERS, "ma_nguoi_dung", updatedUser)) {
        Storage.setCurrentUser(updatedUser); currentUser = updatedUser;
        if (alertSuccess) { showMessage(alertSuccess, "Cập nhật hồ sơ quản lý thành công!", "success"); setTimeout(function() { alertSuccess.style.display = "none"; }, 3000); }
      } else {
        showMessage(formGeneralError, "Đã xảy ra lỗi khi lưu thông tin. Vui lòng thử lại!", "error");
      }
    };
  }
});
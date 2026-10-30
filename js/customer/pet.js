(function () {
  "use strict";

  var F = {
    id: "ma_thu_cung", owner: "ma_nguoi_dung", name: "ten_thu_cung", type: "loai", breed: "giong",
    gender: "gioi_tinh", birthYear: "nam_sinh", weight: "can_nang", color: "mau_long", photo: "anh_thu_cung", note: "ghi_chu"
  };

  var KEY = DATA_KEYS.PETS;
  var ID_PREFIX = "TC";
  var MODAL_ID = "pet-modal";
  var MAX_PET_AGE = 30;

  var TYPE_LABEL = {}; TYPE_LABEL[LOAI_THU_CUNG.MEO] = "Mèo"; TYPE_LABEL[LOAI_THU_CUNG.CHO] = "Chó";
  var TYPE_ICON = {}; TYPE_ICON[LOAI_THU_CUNG.MEO] = "🐱"; TYPE_ICON[LOAI_THU_CUNG.CHO] = "🐶";
  var GENDER_LABEL = {}; GENDER_LABEL[GIOI_TINH.CAI] = "Cái"; GENDER_LABEL[GIOI_TINH.DUC] = "Đực";

  var user = null;
  var editingId = null;

  function $(id) { return document.getElementById(id); }

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function allPets() { return Storage.getData(KEY) || []; }

  function myPets() {
    var all = allPets();
    var mine = [];
    for (var i = 0; i < all.length; i++) {
      if (String(all[i][F.owner]) === String(user.ma_nguoi_dung)) mine.push(all[i]);
    }
    return mine;
  }

  function myPetById(id) {
    var mine = myPets();
    for (var i = 0; i < mine.length; i++) {
      if (String(mine[i][F.id]) === String(id)) return mine[i];
    }
    return null;
  }

  function safeUrl(url) {
    var text = url == null ? "" : String(url).trim();
    return /^https?:\/\/\S+$/i.test(text) ? text : "";
  }

  function thumbUrl(url) {
    if (url.indexOf("images.unsplash.com") !== -1 && url.indexOf("?") === -1) {
      return url + "?w=600&q=70&auto=format&fit=crop";
    }
    return url;
  }

  function ageText(year) {
    var y = Number(year);
    if (isNaN(y) || y <= 0 || year % 1 !== 0) return "";
    var diff = new Date().getFullYear() - y;
    return diff <= 0 ? "dưới 1 tuổi" : "khoảng " + diff + " tuổi";
  }

  function parseWeight(value) { return Number(String(value).replace(",", ".")); }

  function isPetInActiveBooking(petId) {
    var details = Storage.getData(DATA_KEYS.APPOINTMENT_DETAILS) || [];
    var appointments = Storage.getData(DATA_KEYS.APPOINTMENTS) || [];
    var active = [TRANG_THAI_LICH_HEN.CHO_XAC_NHAN, TRANG_THAI_LICH_HEN.DA_XAC_NHAN];

    for (var i = 0; i < details.length; i++) {
      if (String(details[i].ma_thu_cung) !== String(petId)) continue;
      for (var j = 0; j < appointments.length; j++) {
        if (String(appointments[j].ma_lich_hen) === String(details[i].ma_lich_hen)) {
          var st = appointments[j].trang_thai;
          if (active[0] === st || active[1] === st) return true;
        }
      }
    }
    return false;
  }

  function photoHtml(p, large) {
    var type = Number(p[F.type]);
    var url = safeUrl(p[F.photo]);
    var html = '<div class="pet-card-photo' + (large ? ' is-large' : '') + '"><span>' + (TYPE_ICON[type] || "🐾") + '</span>';
    if (url) html += '<img src="' + escapeHtml(thumbUrl(url)) + '" alt="' + escapeHtml(p[F.name]) + '" loading="lazy" onerror="this.style.display=\'none\'">';
    html += '</div>';
    return html;
  }

  function validateName(value) {
    var required = Validation.validateRequired(value, "Tên thú cưng");
    if (required) return required;
    var name = value.trim();
    if (name.length > 50) return "Tên thú cưng không quá 50 ký tự";
    
    var mine = myPets();
    for (var i = 0; i < mine.length; i++) {
      if (String(mine[i][F.id]) !== String(editingId || "") && String(mine[i][F.name]).trim().toLowerCase() === name.toLowerCase()) {
        return "Bạn đã có thú cưng trùng tên này";
      }
    }
    return "";
  }

  function validateBirthYear(value) {
    if (!String(value).trim()) return "";
    var year = Number(value);
    var now = new Date().getFullYear();
    if (isNaN(year) || year % 1 !== 0) return "Năm sinh phải là số nguyên";
    if (year > now) return "Năm sinh không được ở tương lai";
    if (year < now - MAX_PET_AGE) return "Năm sinh không hợp lệ (tối đa " + MAX_PET_AGE + " năm trước)";
    return "";
  }

  function validateWeight(value) {
    var required = Validation.validateRequired(value, "Cân nặng");
    if (required) return required;
    var weight = parseWeight(value);
    if (isNaN(weight) || weight <= 0) return "Cân nặng phải lớn hơn 0";
    if (weight > 100) return "Cân nặng không hợp lệ (tối đa 100 kg)";
    return "";
  }

  function validatePhoto(value) {
    var url = String(value).trim();
    if (!url) return "";
    return safeUrl(url) ? "" : "Link ảnh phải bắt đầu bằng http:// hoặc https://";
  }

  function readAndValidateForm() {
    var el = { name: $("pet-ten"), type: $("pet-loai"), gender: $("pet-gioi-tinh"), breed: $("pet-giong"), color: $("pet-mau-long"), birthYear: $("pet-nam-sinh"), weight: $("pet-can-nang"), photo: $("pet-anh"), note: $("pet-ghi-chu") };
    
    var val1 = Validation.validateField(el.name, validateName);
    var val2 = Validation.validateField(el.type, function (v) { return Validation.validateRequired(v, "Loại thú cưng"); });
    var val3 = Validation.validateField(el.gender, function (v) { return Validation.validateRequired(v, "Giới tính"); });
    var val4 = Validation.validateField(el.birthYear, validateBirthYear);
    var val5 = Validation.validateField(el.weight, validateWeight);
    var val6 = Validation.validateField(el.photo, validatePhoto);

    if (!val1 || !val2 || !val3 || !val4 || !val5 || !val6) return null;

    var result = {};
    result[F.name] = el.name.value.trim();
    result[F.type] = Number(el.type.value);
    result[F.breed] = el.breed.value.trim();
    result[F.gender] = Number(el.gender.value);
    result[F.birthYear] = el.birthYear.value.trim() ? Number(el.birthYear.value) : null;
    result[F.weight] = parseWeight(el.weight.value);
    result[F.color] = el.color.value.trim();
    result[F.photo] = el.photo.value.trim() || null;
    result[F.note] = el.note.value.trim();
    return result;
  }

  function cardHtml(p) {
    var id = p[F.id];
    var type = Number(p[F.type]);
    var gender = Number(p[F.gender]);
    var age = ageText(p[F.birthYear]);

    return '<article class="pet-card">' + photoHtml(p, false) + '<div><h3 class="pet-card-name">' + escapeHtml(p[F.name]) + '</h3><p class="pet-card-meta">' + (TYPE_LABEL[type] || "Khác") + ' · ' + (GENDER_LABEL[gender] || "Chưa rõ") + (p[F.breed] ? " · " + escapeHtml(p[F.breed]) : "") + '</p><p class="pet-card-meta">' + escapeHtml(p[F.weight]) + ' kg' + (age ? " · " + escapeHtml(age) : "") + (p[F.color] ? " · Lông " + escapeHtml(String(p[F.color]).toLowerCase()) : "") + '</p></div><div class="pet-card-actions"><a class="btn btn-secondary btn-sm" href="pet-detail.html?id=' + encodeURIComponent(id) + '">Chi tiết</a><button type="button" class="btn btn-primary btn-sm" data-action="edit" data-id="' + escapeHtml(id) + '">Sửa</button><button type="button" class="btn btn-danger btn-sm" data-action="delete" data-id="' + escapeHtml(id) + '">Xóa</button></div></article>';
  }

  function renderList() {
    var box = $("pet-list");
    var pets = myPets();
    $("pet-count").textContent = pets.length;

    if (pets.length === 0) {
      box.innerHTML = '<div class="empty-state"><p>Bạn chưa có thú cưng nào.</p><button type="button" class="btn btn-primary" data-action="add">Thêm thú cưng đầu tiên</button></div>';
      return;
    }
    var html = "";
    for (var i = 0; i < pets.length; i++) html += cardHtml(pets[i]);
    box.innerHTML = html;
  }

  function resetForm() {
    var form = $("pet-form");
    form.reset();
    $("pet-id").value = "";
    var inputs = form.querySelectorAll("input, select, textarea");
    for (var i = 0; i < inputs.length; i++) Validation.clearError(inputs[i]);
  }

  function openAddModal() {
    editingId = null; resetForm();
    $("pet-modal-title").textContent = "Thêm thú cưng";
    Common.openModal(MODAL_ID);
    $("pet-ten").focus();
  }

  function openEditModal(id) {
    var pet = myPetById(id);
    if (!pet) { Common.showToast("Không tìm thấy thú cưng.", "error"); return; }
    editingId = String(id); resetForm();
    $("pet-modal-title").textContent = "Sửa thông tin thú cưng";
    $("pet-id").value = pet[F.id];
    $("pet-ten").value = pet[F.name] || "";
    $("pet-loai").value = pet[F.type] != null ? String(pet[F.type]) : "";
    $("pet-gioi-tinh").value = pet[F.gender] != null ? String(pet[F.gender]) : "";
    $("pet-giong").value = pet[F.breed] || "";
    $("pet-mau-long").value = pet[F.color] || "";
    $("pet-nam-sinh").value = pet[F.birthYear] != null ? pet[F.birthYear] : "";
    $("pet-can-nang").value = pet[F.weight] != null ? pet[F.weight] : "";
    $("pet-anh").value = pet[F.photo] || "";
    $("pet-ghi-chu").value = pet[F.note] || "";
    Common.openModal(MODAL_ID);
    $("pet-ten").focus();
  }

  function closePetModal() {
    Common.closeModal(MODAL_ID);
    editingId = null;
    if (Common.getQueryParam("edit")) window.history.replaceState(null, "", window.location.pathname);
  }

  function handleSubmit(event) {
    event.preventDefault();
    var data = readAndValidateForm();
    if (!data) return;

    if (editingId) {
      if (!myPetById(editingId)) { Common.showToast("Không tìm thấy thú cưng.", "error"); return; }
      var updated = {};
      for (var k in data) updated[k] = data[k];
      updated[F.id] = editingId;
      Storage.updateItem(KEY, F.id, updated);
      Common.showToast("Cập nhật thú cưng thành công.");
    } else {
      var newPet = {};
      newPet[F.id] = Storage.generateId(ID_PREFIX, KEY, F.id);
      newPet[F.owner] = user.ma_nguoi_dung;
      for (var p in data) newPet[p] = data[p];
      Storage.addItem(KEY, newPet);
      Common.showToast("Thêm thú cưng thành công.");
    }
    closePetModal();
    renderList();
  }

  function deletePet(id) {
    var pet = myPetById(id);
    if (!pet) { Common.showToast("Không tìm thấy thú cưng.", "error"); return false; }
    if (isPetInActiveBooking(id)) { Common.showToast("Thú cưng đang có lịch hẹn chưa hoàn tất, không thể xóa.", "error", 4000); return false; }
    if (!window.confirm('Bạn có chắc muốn xóa "' + pet[F.name] + '"?')) return false;
    Storage.deleteItem(KEY, F.id, id);
    Common.showToast("Đã xóa thú cưng.");
    return true;
  }

  function initList() {
    renderList();
    $("btn-add-pet").onclick = openAddModal;
    $("btn-close-modal").onclick = closePetModal;
    $("btn-cancel-modal").onclick = closePetModal;
    $("pet-form").onsubmit = handleSubmit;
    $("pet-form").oninput = function (e) { Validation.clearError(e.target); };
    $("pet-form").onchange = function (e) { Validation.clearError(e.target); };
    $(MODAL_ID).onclick = function (e) { if (e.target === $(MODAL_ID)) closePetModal(); };
    document.onkeydown = function (e) { if (e.key === "Escape") closePetModal(); };
    
    $("pet-list").onclick = function (e) {
      var btn = e.target;
      while (btn && !btn.hasAttribute("data-action") && btn !== $("pet-list")) btn = btn.parentElement;
      if (!btn || btn === $("pet-list")) return;
      var action = btn.getAttribute("data-action");
      var id = btn.getAttribute("data-id");
      if (action === "add") openAddModal();
      if (action === "edit") openEditModal(id);
      if (action === "delete" && deletePet(id)) renderList();
    };

    var editId = Common.getQueryParam("edit");
    if (editId) openEditModal(editId);
  }

  function initDetail() {
    var box = $("pet-detail");
    var id = Common.getQueryParam("id");
    var pet = id ? myPetById(id) : null;

    if (!pet) {
      box.innerHTML = '<div class="empty-state"><p>Không tìm thấy thú cưng này.</p><a class="btn btn-primary" href="pet.html">Quay lại danh sách</a></div>';
      return;
    }

    var type = Number(pet[F.type]);
    var gender = Number(pet[F.gender]);
    var age = ageText(pet[F.birthYear]);
    document.title = "PawPaw - " + pet[F.name];

    box.innerHTML = '<div class="detail-card">' + photoHtml(pet, true) + '<h1 class="page-title">' + escapeHtml(pet[F.name]) + '</h1><div class="detail-list"><div><span>Mã thú cưng</span><span>' + escapeHtml(pet[F.id]) + '</span></div><div><span>Loại</span><span>' + (TYPE_LABEL[type] || "Khác") + '</span></div><div><span>Giới tính</span><span>' + (GENDER_LABEL[gender] || "Chưa rõ") + '</span></div><div><span>Giống</span><span>' + (escapeHtml(pet[F.breed]) || "—") + '</span></div><div><span>Màu lông</span><span>' + (escapeHtml(pet[F.color]) || "—") + '</span></div><div><span>Năm sinh</span><span>' + (pet[F.birthYear] ? escapeHtml(pet[F.birthYear]) : "—") + (age ? " (" + escapeHtml(age) + ")" : "") + '</span></div><div><span>Cân nặng</span><span>' + escapeHtml(pet[F.weight]) + ' kg</span></div><div><span>Ghi chú</span><span>' + (escapeHtml(pet[F.note]) || "—") + '</span></div></div><div class="pet-card-actions"><a class="btn btn-secondary" href="pet.html">← Quay lại</a><button type="button" class="btn btn-primary" id="btn-edit-pet">Sửa</button><button type="button" class="btn btn-danger" id="btn-delete-pet">Xóa</button></div></div>';

    $("btn-edit-pet").onclick = function () { window.location.href = "pet.html?edit=" + encodeURIComponent(id); };
    $("btn-delete-pet").onclick = function () {
      if (deletePet(id)) { setTimeout(function () { window.location.href = "pet.html"; }, 700); }
    };
  }

  function init() {
    Storage.initData();
    user = Storage.getCurrentUser();
    if (!user || user.vai_tro !== VAI_TRO.KHACH_HANG) return;
    if ($("pet-list")) initList(); else if ($("pet-detail")) initDetail();
  }

  init();
})();
(function () {
    var pageTitle = document.getElementById("pet-page-title");
    var form = document.getElementById("pet-form");
    var photoPreview = document.getElementById("pet-photo-preview");

    var fields = {
        id: document.getElementById("pet-id"), owner: document.getElementById("pet-owner"),
        name: document.getElementById("pet-name"), breed: document.getElementById("pet-breed"),
        type: document.getElementById("pet-type"), gender: document.getElementById("pet-gender"),
        year: document.getElementById("pet-year"), weight: document.getElementById("pet-weight"),
        color: document.getElementById("pet-color"), photo: document.getElementById("pet-photo"),
        note: document.getElementById("pet-note")
    };

    var USER_LIST_URL = "user.html";
    var currentPet = null;

    function getTypeEmoji(type) { return Number(type) === LOAI_THU_CUNG.MEO ? "🐱" : "🐶"; }

    function renderPhoto() {
        photoPreview.innerHTML = "";
        photoPreview.textContent = getTypeEmoji(fields.type.value);
        var url = fields.photo.value.trim();
        if (!url) return;
        var image = document.createElement("img");
        image.src = url; image.alt = "Ảnh thú cưng";
        image.onerror = function () { image.parentNode.removeChild(image); };
        photoPreview.appendChild(image);
    }

    function fillForm(pet, owner) {
        fields.id.value = pet.ma_thu_cung;
        fields.owner.value = owner ? (owner.ho_ten || "") + " (" + owner.ma_nguoi_dung + ")" : pet.ma_nguoi_dung;
        fields.name.value = pet.ten_thu_cung || ""; fields.breed.value = pet.giong || "";
        fields.type.value = String(pet.loai); fields.gender.value = String(pet.gioi_tinh);
        fields.year.value = pet.nam_sinh != null ? pet.nam_sinh : "";
        fields.weight.value = pet.can_nang != null ? pet.can_nang : "";
        fields.color.value = pet.mau_long || ""; fields.photo.value = pet.anh_thu_cung || "";
        fields.note.value = pet.ghi_chu || "";
        pageTitle.textContent = "Chỉnh sửa thú cưng: " + (pet.ten_thu_cung || pet.ma_thu_cung);
        renderPhoto();
    }

    function validateYear(value) {
        var required = validateRequired(value, "Năm sinh"); if (required) return required;
        var year = Number(value); var currentYear = new Date().getFullYear();
        if (isNaN(year) || year % 1 !== 0 || year < 1990 || year > currentYear) return "Năm sinh phải từ 1990 đến " + currentYear;
        return "";
    }

    function validateWeight(value) {
        var required = validateRequired(value, "Cân nặng"); if (required) return required;
        var weight = Number(value);
        if (isNaN(weight) || weight <= 0 || weight > 100) return "Cân nặng phải lớn hơn 0 và không quá 100 kg";
        return "";
    }

    function validatePhotoUrl(value) {
        var url = String(value || "").trim(); if (!url) return "";
        var isHttp = url.indexOf("http://") === 0 || url.indexOf("https://") === 0;
        return isHttp ? "" : "Đường dẫn ảnh phải bắt đầu bằng http:// hoặc https://";
    }

    function validateForm() {
        var v1 = validateField(fields.name, function (v) { return validateRequired(v, "Tên thú cưng"); });
        var v2 = validateField(fields.breed, function (v) { return validateRequired(v, "Giống"); });
        var v3 = validateField(fields.year, validateYear);
        var v4 = validateField(fields.weight, validateWeight);
        var v5 = validateField(fields.photo, validatePhotoUrl);
        return v1 && v2 && v3 && v4 && v5;
    }

    function savePet(event) {
        event.preventDefault();
        if (!currentPet) return;
        if (!validateForm()) { showToast("Vui lòng kiểm tra lại thông tin", "error"); return; }
        
        var photoUrl = fields.photo.value.trim();
        var updatedPet = {
            ma_thu_cung: currentPet.ma_thu_cung, ten_thu_cung: fields.name.value.trim(),
            giong: fields.breed.value.trim(), loai: Number(fields.type.value),
            gioi_tinh: Number(fields.gender.value), nam_sinh: Number(fields.year.value),
            can_nang: Number(fields.weight.value), mau_long: fields.color.value.trim(),
            anh_thu_cung: photoUrl ? photoUrl : null, ghi_chu: fields.note.value.trim()
        };

        var saved = Storage.updateItem(DATA_KEYS.PETS, "ma_thu_cung", updatedPet);
        if (!saved) { showToast("Không thể lưu thay đổi", "error"); return; }
        showToast("Đã cập nhật thông tin thú cưng");
        setTimeout(function () { window.location.href = USER_LIST_URL; }, 800);
    }

    function bindEvents() {
        form.onsubmit = savePet;
        fields.photo.oninput = renderPhoto; fields.type.onchange = renderPhoto;
        var keys = ["name", "breed", "year", "weight", "photo"];
        for(var i=0; i<keys.length; i++) {
            (function(k) { fields[k].oninput = function () { clearError(fields[k]); }; })(keys[i]);
        }
    }

    function init() {
        if (Storage.initData) Storage.initData();
        var petId = getQueryParam("id");
        currentPet = petId ? Storage.getItemById(DATA_KEYS.PETS, "ma_thu_cung", petId) : null;
        if (!currentPet) { window.location.replace(USER_LIST_URL); return; }
        var owner = Storage.getItemById(DATA_KEYS.USERS, "ma_nguoi_dung", currentPet.ma_nguoi_dung);
        fillForm(currentPet, owner); bindEvents();
    }

    init();
})();
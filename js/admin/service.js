/**
 * js/admin/service.js
 * Xử lý trang Quản trị danh sách dịch vụ và Thêm/Sửa dịch vụ của Admin
 */
(function (global) {
    "use strict";

    var services = [];
    var filteredServices = [];

    function getDK() { return (typeof DATA_KEYS !== "undefined") ? DATA_KEYS : { SERVICES: "dich_vu" }; }
    
    function esc(val) { 
        return String(val == null ? "" : val).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"); 
    }
    
    function money(val) { 
        var n = Number(val); 
        return (!n || n <= 0) ? "-" : n.toLocaleString("vi-VN") + " đ"; 
    }
    
    function toast(msg, type) { 
        if (typeof Common !== "undefined" && Common.showToast) {
            Common.showToast(msg, type); 
        } else {
            alert(msg); 
        }
    }

    function init() {
        if (typeof Storage !== "undefined" && Storage.initData) Storage.initData();
        
        // Dùng setTimeout đợi một chút để hàm initData kịp lấy dữ liệu lên
        setTimeout(function() {
            var DK = getDK();
            services = (typeof Storage !== "undefined") ? (Storage.getData(DK.SERVICES) || []) : [];
            
            // Phân nhánh logic: Kiểm tra xem đang ở trang Danh sách hay trang Cập nhật
            var form = document.getElementById("service-form");
            if (form) {
                // Nếu tìm thấy form -> Đang ở trang service-update.html
                initForm();
            } else {
                // Nếu không có form -> Đang ở trang service.html (Danh sách)
                filteredServices = []; 
                for(var i = 0; i < services.length; i++) {
                    filteredServices.push(services[i]);
                }
                initFilters(); 
                renderTable(); 
                bindEvents();
            }
        }, 100);
    }

    /* =========================================================
       PHẦN 1: LOGIC CHO TRANG CẬP NHẬT/THÊM DỊCH VỤ (service-update.html)
       ========================================================= */
    function initForm() {
        var urlParams = (typeof Common !== "undefined" && Common.getQueryParams) ? Common.getQueryParams() : {};
        var id = urlParams.id || "";
        var DK = getDK();
        
        var isEdit = id !== "";
        var svc = null;
        
        if (isEdit) {
            var titleEl = document.getElementById("form-title");
            if (titleEl) titleEl.textContent = "Cập nhật dịch vụ";
            
            for(var i = 0; i < services.length; i++) {
                if (services[i].ma_dich_vu === id) { 
                    svc = services[i]; 
                    break; 
                }
            }
        }
        
        // Đổ dữ liệu nhóm dịch vụ vào datalist để gợi ý
        var datalist = document.getElementById("sv-nhom-list");
        if (datalist) {
            var groups = [];
            for(var j = 0; j < services.length; j++) {
                var g = services[j].nhom_dich_vu;
                if (g && groups.indexOf(g) === -1) groups.push(g);
            }
            for(var k = 0; k < groups.length; k++) {
                var opt = document.createElement("option");
                opt.value = groups[k];
                datalist.appendChild(opt);
            }
        }
        
        // Gán dữ liệu lên Form
        if (svc) {
            document.getElementById("sv-id").value = svc.ma_dich_vu || "";
            document.getElementById("sv-ten").value = svc.ten_dich_vu || "";
            document.getElementById("sv-nhom").value = svc.nhom_dich_vu || "";
            document.getElementById("sv-thoi-gian").value = svc.thoi_gian_du_kien || "";
            document.getElementById("sv-mo-ta").value = svc.mo_ta_chi_tiet || "";
            document.getElementById("sv-gia-1").value = svc.gia_duoi_5kg || "";
            document.getElementById("sv-gia-2").value = svc.gia_5_15kg || "";
            document.getElementById("sv-gia-3").value = svc.gia_tren_15kg || "";
            document.getElementById("sv-anh").value = svc.anh_dich_vu || "";
            updatePreview(svc.anh_dich_vu);
        } else if (!isEdit) {
            // Tự động sinh ID mới nếu là Thêm dịch vụ
            var newId = (typeof Storage !== "undefined") ? Storage.generateId("DV", DK.SERVICES, "ma_dich_vu", 3) : "DV001";
            document.getElementById("sv-id").value = newId;
        }
        
        // Preview ảnh khi dán link
        var imgInput = document.getElementById("sv-anh");
        if (imgInput) {
            imgInput.oninput = function() { updatePreview(this.value); };
        }
        
        // Lắng nghe sự kiện Submit khi nhấn LƯU
        var form = document.getElementById("service-form");
        form.onsubmit = function(e) {
            e.preventDefault();
            saveService(isEdit);
        };
    }
    
    function updatePreview(url) {
        var preview = document.getElementById("sv-anh-preview");
        if (!preview) return;
        if (url) {
            preview.innerHTML = '<img src="' + esc(url) + '" alt="Preview" style="max-width: 100px; border-radius: 8px; margin-top: 10px;">';
        } else {
            preview.innerHTML = "";
        }
    }
    
    function saveService(isEdit) {
        var DK = getDK();
        var id = document.getElementById("sv-id").value.trim();
        var ten = document.getElementById("sv-ten").value.trim();
        var nhom = document.getElementById("sv-nhom").value.trim();
        var thoiGian = document.getElementById("sv-thoi-gian").value.trim();
        var moTa = document.getElementById("sv-mo-ta").value.trim();
        var gia1 = document.getElementById("sv-gia-1").value.trim();
        var gia2 = document.getElementById("sv-gia-2").value.trim();
        var gia3 = document.getElementById("sv-gia-3").value.trim();
        var anh = document.getElementById("sv-anh").value.trim();
        
        if (!ten || !nhom || !thoiGian || !gia1 || !gia2 || !gia3) {
            toast("Vui lòng nhập đầy đủ các trường bắt buộc (*).", "error");
            return;
        }
        
        var svcData = {
            ma_dich_vu: id,
            ten_dich_vu: ten,
            nhom_dich_vu: nhom,
            thoi_gian_du_kien: Number(thoiGian),
            mo_ta_chi_tiet: moTa,
            gia_duoi_5kg: Number(gia1),
            gia_5_15kg: Number(gia2),
            gia_tren_15kg: Number(gia3),
            anh_dich_vu: anh
        };
        
        if (typeof Storage !== "undefined") {
            if (isEdit) {
                Storage.updateItem(DK.SERVICES, "ma_dich_vu", svcData);
                toast("Cập nhật dịch vụ thành công!", "success");
            } else {
                Storage.addItem(DK.SERVICES, svcData);
                toast("Thêm dịch vụ thành công!", "success");
            }
        }
        
        setTimeout(function() {
            window.location.href = "service.html";
        }, 1000);
    }

    /* =========================================================
       PHẦN 2: LOGIC CHO TRANG DANH SÁCH DỊCH VỤ (service.html)
       ========================================================= */
    function initFilters() {
        var groupFilter = document.getElementById("service-group-filter");
        if (!groupFilter) return;
        var groups = [];
        for(var i = 0; i < services.length; i++) {
            var g = services[i].nhom_dich_vu; 
            if(g && groups.indexOf(g) === -1) groups.push(g);
        }
        for(var j = 0; j < groups.length; j++) {
            var opt = document.createElement("option"); 
            opt.value = groups[j]; 
            opt.textContent = groups[j]; 
            groupFilter.appendChild(opt);
        }
    }

    function renderTable() {
        var tbody = document.getElementById("service-table-body");
        var countEl = document.getElementById("service-count");
        if (!tbody) return;
        if (countEl) countEl.textContent = filteredServices.length;

        if (filteredServices.length === 0) { 
            tbody.innerHTML = '<tr><td colspan="9" class="review-empty">Không tìm thấy dịch vụ nào phù hợp.</td></tr>'; 
            return; 
        }

        var html = "";
        for(var i = 0; i < filteredServices.length; i++) {
            var svc = filteredServices[i];
            var imgHtml = svc.anh_dich_vu ? '<img src="' + esc(svc.anh_dich_vu) + '" alt="IMG" class="admin-service-img">' : '<div class="admin-service-img">No IMG</div>';
            html += '<tr>' +
                    '<td>' + imgHtml + '</td>' +
                    '<td class="col-code">' + esc(svc.ma_dich_vu) + '</td>' +
                    '<td style="font-weight: 800;">' + esc(svc.ten_dich_vu) + '</td>' +
                    '<td style="color: var(--purple-gray); font-weight: 700;">' + esc(svc.nhom_dich_vu) + '</td>' +
                    '<td>' + money(svc.gia_duoi_5kg) + '</td>' +
                    '<td>' + money(svc.gia_5_15kg) + '</td>' +
                    '<td>' + money(svc.gia_tren_15kg) + '</td>' +
                    '<td style="color: var(--purple-gray);">' + (esc(svc.thoi_gian_du_kien) || "-") + '</td>' +
                    '<td><div class="review-actions">' +
                    '<a href="service-update.html?id=' + esc(svc.ma_dich_vu) + '" class="btn btn-sm btn-primary">Sửa</a>' +
                    '<button type="button" class="btn btn-sm btn-danger btn-delete" data-id="' + esc(svc.ma_dich_vu) + '">Xóa</button>' +
                    '</div></td></tr>';
        }
        tbody.innerHTML = html;
    }

    function bindEvents() {
        var searchInput = document.getElementById("service-search");
        var groupFilter = document.getElementById("service-group-filter");
        var tbody = document.getElementById("service-table-body");

        function applyFilters() {
            var keyword = searchInput ? searchInput.value.trim().toLowerCase() : "";
            var group = groupFilter ? groupFilter.value : "";
            filteredServices = [];
            for(var i = 0; i < services.length; i++) {
                var s = services[i];
                var matchKey = !keyword || ((s.ten_dich_vu || "").toLowerCase().indexOf(keyword) !== -1 || (s.ma_dich_vu || "").toLowerCase().indexOf(keyword) !== -1);
                var matchGroup = !group || s.nhom_dich_vu === group;
                if (matchKey && matchGroup) filteredServices.push(s);
            }
            renderTable();
        }

        if (searchInput) searchInput.oninput = applyFilters;
        if (groupFilter) groupFilter.onchange = applyFilters;

        if (tbody) {
            tbody.onclick = function(e) {
                var btn = e.target;
                if (btn && btn.className.indexOf("btn-delete") !== -1) {
                    deleteService(btn.getAttribute("data-id"));
                }
            };
        }
    }

    function deleteService(id) {
        if (!confirm("Bạn có chắc chắn muốn xóa dịch vụ [" + id + "] không?")) return;
        
        var DK = getDK();
        if (typeof Storage !== "undefined") {
            var success = Storage.deleteItem(DK.SERVICES, "ma_dich_vu", id); // Sử dụng hàm deleteItem chuẩn có sẵn
            if (success) {
                services = Storage.getData(DK.SERVICES) || []; // Cập nhật lại mảng
                var search = document.getElementById("service-search");
                if (search) search.oninput(); // Kích hoạt lại bộ lọc để render bảng
                toast("Đã xóa dịch vụ " + id + " thành công!", "success");
            } else {
                toast("Không tìm thấy dịch vụ để xóa.", "error");
            }
        }
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})(typeof window !== "undefined" ? window : this);
(function () {
    var searchForm = document.getElementById("customer-search-form");
    var searchInput = document.getElementById("customer-search");
    var resetButton = document.getElementById("customer-reset-button");

    var customerList = document.getElementById("customer-list");
    var totalCustomers = document.getElementById("total-customers");
    var resultCount = document.getElementById("customer-result-count");
    var emptyMessage = document.getElementById("customer-empty");

    var users = [];
    var pets = [];

    function normalizeText(value) {
        return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase().trim();
    }

    function getUserRole(user) { return normalizeText(user.vai_tro); }

    function isManager(user) {
        var role = getUserRole(user);
        var managerRole = VAI_TRO && VAI_TRO.QUAN_LY ? normalizeText(VAI_TRO.QUAN_LY) : "quan ly";
        return role === managerRole || role === "admin";
    }

    function isCustomer(user) {
        var role = getUserRole(user);
        var customerRole = VAI_TRO && VAI_TRO.KHACH_HANG ? normalizeText(VAI_TRO.KHACH_HANG) : "khach hang";
        return role === customerRole;
    }

    function getRoleLabel(user) {
        if (isManager(user)) return "Quản lý";
        if (isCustomer(user)) return "Khách hàng";
        return user.vai_tro || "Chưa xác định";
    }

    function loadUsers() {
        var data = Storage.getData(DATA_KEYS.USERS) || [];
        users = [];
        for (var i = 0; i < data.length; i++) {
            if (isCustomer(data[i]) || isManager(data[i])) users.push(data[i]);
        }
    }

    function loadPets() { pets = Storage.getData(DATA_KEYS.PETS) || []; }

    function getCustomerPets(customerId) {
        var res = [];
        for (var i = 0; i < pets.length; i++) {
            if (String(pets[i].ma_nguoi_dung) === String(customerId)) res.push(pets[i]);
        }
        return res;
    }

    function createInfoLine(label, value) {
        var line = document.createElement("p");
        var labelElement = document.createElement("strong");
        labelElement.textContent = label + ": "; line.appendChild(labelElement);
        line.appendChild(document.createTextNode(value !== undefined && value !== null && value !== "" ? String(value) : "Chưa cập nhật"));
        return line;
    }

    function createAvatar(user) {
        var avatar = document.createElement("div"); avatar.className = "admin-user-avatar";
        var initials = document.createElement("span");
        var words = String(user.ho_ten || "ND").trim().split(/\s+/);
        var inText = "";
        var start = Math.max(0, words.length - 2);
        for(var i = start; i < words.length; i++) inText += words[i].charAt(0);
        initials.textContent = inText.toUpperCase();

        if (user.anh_dai_dien) {
            var image = document.createElement("img");
            image.src = user.anh_dai_dien; image.alt = "Ảnh đại diện " + (user.ho_ten || "người dùng");
            image.onerror = function () { avatar.innerHTML = ""; avatar.appendChild(initials); };
            avatar.appendChild(image);
        } else {
            avatar.appendChild(initials);
        }
        return avatar;
    }

    function createPetSection(user) {
        var section = document.createElement("div"); section.className = "admin-user-pets";
        var title = document.createElement("strong"); title.textContent = "Thú cưng: "; section.appendChild(title);
        var customerPets = getCustomerPets(user.ma_nguoi_dung);

        if (customerPets.length === 0) {
            var noPet = document.createElement("span"); noPet.textContent = "Chưa có thú cưng"; section.appendChild(noPet);
            return section;
        }

        var petList = document.createElement("div"); petList.className = "admin-user-pet-list";
        for (var i = 0; i < customerPets.length; i++) {
            var pet = customerPets[i];
            var petLink = document.createElement("a"); petLink.className = "admin-user-pet-link";
            petLink.href = "pet-mnm.html?id=" + encodeURIComponent(pet.ma_thu_cung);
            petLink.textContent = pet.ten_thu_cung || pet.ma_thu_cung;
            petLink.title = "Chỉnh sửa thông tin " + (pet.ten_thu_cung || "thú cưng");
            petList.appendChild(petLink);
        }
        section.appendChild(petList); return section;
    }

    function createUserCard(user) {
        var card = document.createElement("article"); card.className = "admin-user-card";
        var userId = String(user.ma_nguoi_dung || "");
        card.appendChild(createAvatar(user));

        var info = document.createElement("div"); info.className = "admin-user-info";
        info.appendChild(createInfoLine("Mã người dùng", user.ma_nguoi_dung));
        info.appendChild(createInfoLine("Họ và tên", user.ho_ten));
        info.appendChild(createInfoLine("Email", user.email));
        info.appendChild(createInfoLine("Số điện thoại", user.so_dien_thoai));
        info.appendChild(createInfoLine("Vai trò", getRoleLabel(user)));

        var bottom = document.createElement("div"); bottom.className = "admin-user-card-bottom";
        var address = createInfoLine("Địa chỉ", user.dia_chi); address.className = "admin-user-address";
        bottom.appendChild(address);

        var deleteButton = document.createElement("button"); deleteButton.type = "button";
        deleteButton.className = "admin-user-lock-button admin-user-delete-button";
        deleteButton.setAttribute("data-user-id", userId); deleteButton.textContent = "Xóa";
        bottom.appendChild(deleteButton); info.appendChild(bottom);

        if (isCustomer(user)) info.appendChild(createPetSection(user));
        card.appendChild(info); return card;
    }

    function renderUsers(userItems) {
        customerList.innerHTML = "";
        if (userItems.length === 0) {
            emptyMessage.textContent = searchInput.value.trim() ? "Không tìm thấy người dùng phù hợp." : "Chưa có người dùng nào.";
            emptyMessage.style.display = "block";
            resultCount.textContent = "Hiển thị 0 / " + users.length + " người dùng.";
            return;
        }
        emptyMessage.style.display = "none";
        for (var i = 0; i < userItems.length; i++) customerList.appendChild(createUserCard(userItems[i]));
        resultCount.textContent = "Hiển thị " + userItems.length + " / " + users.length + " người dùng.";
    }

    function searchUsers() {
        var keyword = normalizeText(searchInput.value);
        var filteredUsers = [];
        for (var i = 0; i < users.length; i++) {
            var user = users[i];
            var arr = [user.ma_nguoi_dung, user.ho_ten, user.email, user.so_dien_thoai];
            var match = false;
            for(var j = 0; j < arr.length; j++) { if (normalizeText(arr[j]).indexOf(keyword) !== -1) { match = true; break; } }
            if (match) filteredUsers.push(user);
        }
        renderUsers(filteredUsers);
    }

    function resetSearch() { searchInput.value = ""; renderUsers(users); }

    function getCurrentUserId() {
        var storedValue = localStorage.getItem(DATA_KEYS.CURRENT_USER);
        if (!storedValue) return "";
        try { var parsedValue = JSON.parse(storedValue); if (typeof parsedValue === "string") return parsedValue; if (parsedValue && parsedValue.ma_nguoi_dung) return String(parsedValue.ma_nguoi_dung); } catch (error) {}
        return storedValue;
    }

    function deleteUser(userId) {
        var targetId = String(userId);
        var targetUser = null;
        for (var i = 0; i < users.length; i++) { if (String(users[i].ma_nguoi_dung) === targetId) { targetUser = users[i]; break; } }
        if (!targetUser) { alert("Không tìm thấy tài khoản cần xóa."); return; }
        if (targetId === getCurrentUserId()) { alert("Bạn không thể xóa tài khoản đang đăng nhập."); return; }

        var allUsers = Storage.getData(DATA_KEYS.USERS) || [];
        if (isManager(targetUser)) {
            var managerCount = 0;
            for(var m=0; m<allUsers.length; m++) { if(isManager(allUsers[m])) managerCount++; }
            if (managerCount <= 1) { alert("Không thể xóa tài khoản quản lý cuối cùng."); return; }
        }

        if (!confirm('Bạn có chắc chắn muốn xóa tài khoản "' + (targetUser.ho_ten || targetId) + '"?\n\nThông tin tài khoản và dữ liệu liên quan sẽ bị xóa. Thao tác này không thể hoàn tác.')) return;

        try {
            var allPets = Storage.getData(DATA_KEYS.PETS) || [];
            var allAppointments = Storage.getData(DATA_KEYS.APPOINTMENTS) || [];
            var allDetails = Storage.getData(DATA_KEYS.APPOINTMENT_DETAILS) || [];
            var allReviews = Storage.getData(DATA_KEYS.REVIEWS) || [];

            var userPets = []; var petIds = {};
            for(var p=0; p<allPets.length; p++) { if(String(allPets[p].ma_nguoi_dung) === targetId) { userPets.push(allPets[p]); petIds[String(allPets[p].ma_thu_cung)] = true; } }

            var appointmentIds = {};
            for(var a=0; a<allAppointments.length; a++) {
                if(String(allAppointments[a].ma_nguoi_dung) === targetId || petIds[String(allAppointments[a].ma_thu_cung)]) {
                    appointmentIds[String(allAppointments[a].ma_lich_hen)] = true;
                }
            }

            var remainingDetails = [];
            for(var d=0; d<allDetails.length; d++) { if(!appointmentIds[String(allDetails[d].ma_lich_hen)] && !petIds[String(allDetails[d].ma_thu_cung)]) remainingDetails.push(allDetails[d]); }

            var remainingReviews = []; for (var r = 0; r < allReviews.length; r++) { 
                if (!appointmentIds[String(allReviews[r].ma_lich_hen)]) remainingReviews.push(allReviews[r]);}

            var remainingUsers = [];
            for(var u=0; u<allUsers.length; u++) { if(String(allUsers[u].ma_nguoi_dung) !== targetId) remainingUsers.push(allUsers[u]); }

            var remainingPets = [];
            for(var rp=0; rp<allPets.length; rp++) { if(String(allPets[rp].ma_nguoi_dung) !== targetId) remainingPets.push(allPets[rp]); }

            var remainingAppointments = [];
            for(var ra=0; ra<allAppointments.length; ra++) { if(String(allAppointments[ra].ma_nguoi_dung) !== targetId && !petIds[String(allAppointments[ra].ma_thu_cung)]) remainingAppointments.push(allAppointments[ra]); }

            Storage.setData(DATA_KEYS.USERS, remainingUsers); Storage.setData(DATA_KEYS.PETS, remainingPets); Storage.setData(DATA_KEYS.APPOINTMENTS, remainingAppointments); Storage.setData(DATA_KEYS.APPOINTMENT_DETAILS, remainingDetails); Storage.setData(DATA_KEYS.REVIEWS, remainingReviews);

            loadUsers(); loadPets();
            totalCustomers.textContent = users.length;
            searchUsers();
            alert("Đã xóa tài khoản khỏi dữ liệu LocalStorage.");
        } catch (error) {
            console.error("Lỗi khi xóa tài khoản:", error);
            alert("Không thể xóa tài khoản hoàn toàn. Vui lòng kiểm tra Console và dữ liệu LocalStorage.");
        }
    }

    function init() {
        if (Storage.initData) Storage.initData();
        loadUsers(); loadPets();
        if (totalCustomers) totalCustomers.textContent = users.length;
        renderUsers(users);

        if (searchForm) { searchForm.onsubmit = function (event) { event.preventDefault(); searchUsers(); }; }
        if (resetButton) { resetButton.onclick = resetSearch; }
        if (customerList) {
            customerList.onclick = function (event) {
                var btn = event.target;
                while(btn && btn !== customerList && btn.className.indexOf("admin-user-delete-button") === -1) btn = btn.parentElement;
                if (!btn || btn === customerList) return;
                deleteUser(btn.getAttribute("data-user-id"));
            };
        }
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
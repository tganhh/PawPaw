console.log("LOGIN.JS ĐÃ CHẠY");
(function () {

    function initLogin() {
        // Gọi initData() bình thường, không dùng await
        Storage.initData();

        var loginForm = document.getElementById("login-form");
        if (!loginForm) return;

        // Đổi addEventListener thành onsubmit
        loginForm.onsubmit = function (event) {
            console.log("SUBMIT LOGIN ĐÃ CHẠY");
            event.preventDefault();

            // 1. GET FORM DATA (Dùng var)
            var email = document.getElementById("email").value.trim();
            var password = document.getElementById("mat-khau").value;

            // 2. CLEAR OLD ERRORS
            clearErrors();
            var message = document.getElementById("login-message");
            message.innerHTML = ""; // Dùng innerHTML chuẩn bài 10
            message.style.color = "";

            // 3. VALIDATE DATA
            var isValid = true;

            if (!email) {
                showError("email-error", "Vui lòng nhập email.");
                isValid = false;
            } else if (!isValidEmail(email)) {
                showError("email-error", "Email không đúng định dạng.");
                isValid = false;
            }

            if (!password) {
                showError("mat-khau-error", "Vui lòng nhập mật khẩu.");
                isValid = false;
            }

            if (!isValid) return;

            // 4. GET USER LIST
            var users = Storage.getData(DATA_KEYS.USERS) || [];
            console.log("USERS:", users);
            console.log("EMAIL NHẬP:", email);

            // 5. FIND USER (Đổi .find thành vòng lặp for)
            var user = null;
            for (var i = 0; i < users.length; i++) {
                var itemEmail = String(users[i].email || "").trim().toLowerCase();
                if (itemEmail === email.toLowerCase()) {
                    user = users[i];
                    break;
                }
            }
            console.log("USER TÌM ĐƯỢC:", user);

            // 6. CHECK LOGIN INFORMATION
            console.log("MẬT KHẨU NHẬP:", password);
            if (user) console.log("MẬT KHẨU TRONG JSON:", user.mat_khau);
            if (user) console.log("MẬT KHẨU CÓ KHỚP:", user.mat_khau === password);

            if (!user || user.mat_khau !== password) {
                message.innerHTML = "Email hoặc mật khẩu không chính xác.";
                return;
            }

            // 7. SAVE CURRENT USER
            console.log("CHUẨN BỊ LƯU USER:", user);
            Storage.setCurrentUser(user);
            console.log("VAI TRÒ USER:", user.vai_tro);
            console.log("VAI TRÒ KHÁCH HÀNG:", VAI_TRO.KHACH_HANG);
            console.log("USER SAU KHI LƯU:", Storage.getCurrentUser());

            // 8. REDIRECT BY ROLE
            if (user.vai_tro === VAI_TRO.KHACH_HANG) {
                console.log("ĐÃ VÀO NHÁNH KHÁCH HÀNG");
                console.log("ĐƯỜNG DẪN CHUYỂN:", "../customer/about.html");
                window.location.href = "../customer/about.html";
                return;
            }

            if (user.vai_tro === VAI_TRO.QUAN_LY) {
                window.location.href = "../admin/dashboard.html";
                return;
            }

            // 9. INVALID ROLE
            Storage.clearCurrentUser();
            message.innerHTML = "Tài khoản không có quyền truy cập.";
        };
    }

    // VALIDATE EMAIL
    function isValidEmail(email) {
        var re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    // SHOW ERROR
    function showError(elementId, message) {
        var element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = message;
        }
    }

    // CLEAR ERRORS (Thay querySelectorAll().forEach bằng getElementsByClassName và vòng lặp for)
    function clearErrors() {
        var errorElements = document.getElementsByClassName("form-error");
        for (var i = 0; i < errorElements.length; i++) {
            errorElements[i].innerHTML = "";
        }
    }

    // Run when the page is loaded
    initLogin();

})();
(function () {

    function initRegister() {
        // Bỏ await
        Storage.initData();

        var registerForm = document.getElementById("register-form");
        if (!registerForm) return;

        // Đổi addEventListener thành onsubmit
        registerForm.onsubmit = function (event) {
            event.preventDefault();

            // 1. GET FORM DATA
            var fullName = document.getElementById("ho-ten").value.trim();
            var email = document.getElementById("email").value.trim();
            var phoneNumber = document.getElementById("so-dien-thoai").value.trim();
            var password = document.getElementById("mat-khau").value;
            var confirmPassword = document.getElementById("xac-nhan-mat-khau").value;

            // 2. CLEAR OLD ERRORS
            clearErrors();
            var message = document.getElementById("register-message");
            message.innerHTML = "";
            message.style.color = "";

            // 3. VALIDATE DATA
            var isValid = true;

            if (!fullName) {
                showError("ho-ten-error", "Vui lòng nhập họ và tên.");
                isValid = false;
            }

            if (!email) {
                showError("email-error", "Vui lòng nhập email.");
                isValid = false;
            } else if (!isValidEmail(email)) {
                showError("email-error", "Email không đúng định dạng.");
                isValid = false;
            }

            if (!phoneNumber) {
                showError("so-dien-thoai-error", "Vui lòng nhập số điện thoại.");
                isValid = false;
            } else if (!isValidPhone(phoneNumber)) {
                showError("so-dien-thoai-error", "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0.");
                isValid = false;
            }

            if (!password) {
                showError("mat-khau-error", "Vui lòng nhập mật khẩu.");
                isValid = false;
            } else if (password.length < 6) {
                showError("mat-khau-error", "Mật khẩu phải có ít nhất 6 ký tự.");
                isValid = false;
            }

            if (!confirmPassword) {
                showError("xac-nhan-mat-khau-error", "Vui lòng xác nhận mật khẩu.");
                isValid = false;
            } else if (password !== confirmPassword) {
                showError("xac-nhan-mat-khau-error", "Mật khẩu xác nhận không khớp.");
                isValid = false;
            }

            if (!isValid) return;

            // 4. GET USER LIST
            var users = Storage.getData(DATA_KEYS.USERS) || [];

            // 5. CHECK DUPLICATE EMAIL (Đổi .some thành vòng lặp for)
            var emailExists = false;
            for (var i = 0; i < users.length; i++) {
                var userEmail = String(users[i].email || "").trim().toLowerCase();
                if (userEmail === email.toLowerCase()) {
                    emailExists = true;
                    break;
                }
            }

            if (emailExists) {
                showError("email-error", "Email này đã được đăng ký.");
                return;
            }

            // 6. CHECK DUPLICATE PHONE (Đổi .some thành vòng lặp for)
            var phoneExists = false;
            for (var j = 0; j < users.length; j++) {
                var userPhone = String(users[j].so_dien_thoai || "").trim();
                if (userPhone === phoneNumber) {
                    phoneExists = true;
                    break;
                }
            }

            if (phoneExists) {
                showError("so-dien-thoai-error", "Số điện thoại này đã được đăng ký.");
                return;
            }

            // 7. GENERATE USER ID
            var userId = Storage.generateId("KH", DATA_KEYS.USERS, "ma_nguoi_dung");

            // 8. CREATE NEW USER
            var newUser = {
                ma_nguoi_dung: userId,
                ho_ten: fullName,
                email: email,
                so_dien_thoai: phoneNumber,
                mat_khau: password,
                anh_dai_dien: "",
                dia_chi: "",
                vai_tro: VAI_TRO.KHACH_HANG
            };

            // 9. SAVE USER
            Storage.addItem(DATA_KEYS.USERS, newUser);

            // 10. SHOW SUCCESS MESSAGE
            message.innerHTML = "Đăng ký thành công. Đang chuyển đến trang đăng nhập...";
            message.style.color = "#6982D5";

            // 11. REDIRECT TO LOGIN
            setTimeout(function () {
                window.location.href = "login.html";
            }, 800);
        };
    }

    // VALIDATE EMAIL
    function isValidEmail(email) {
        var re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    // VALIDATE PHONE NUMBER
    function isValidPhone(phoneNumber) {
        var re = /^0\d{9}$/;
        return re.test(phoneNumber);
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
    initRegister();

})();
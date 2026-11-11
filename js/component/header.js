function loadCustomerHeader() {
    var navbar = document.querySelector(".navbar");
    if (!navbar) return;

    var isCustomerPage = window.location.pathname.indexOf("/pages/customer/") !== -1;
    var rootPath = isCustomerPage ? "../../" : "";
    var customerPath = isCustomerPage ? "" : "pages/customer/";
    var currentPage = document.body.getAttribute("data-page") || "";

    var menu = [
        { page: "about",       href: "about.html",       text: "Trang chủ" },
        { page: "service",     href: "service.html",     text: "Dịch vụ" },
        { page: "booking",     href: "booking.html",     text: "Đặt lịch" },
        { page: "my-booking",  href: "my-booking.html",  text: "Lịch hẹn" },
        { page: "pet",         href: "pet.html",         text: "Thú cưng" },
        { page: "profile",     href: "profile.html",     text: "Hồ sơ" }
    ];

    // Trang chỉ dành cho khách hàng đã đăng nhập: khách vãng lai bấm vào sẽ bị chuyển sang đăng nhập
    var PROTECTED_PAGES = { "booking": true, "my-booking": true, "pet": true, "profile": true };

    var user = (typeof AppStorage !== "undefined") ? AppStorage.getCurrentUser() : null;
    var isCustomer = !!(user && user.vai_tro === VAI_TRO.KHACH_HANG);
    var loginUrl = rootPath + "pages/auth/login.html";

    var menuHtml = "";
    for (var i = 0; i < menu.length; i++) {
        var item = menu[i];
        var isActive = item.page === currentPage;
        var href = customerPath + item.href;

        if (!isCustomer) {
            if (item.page === "about") {
                href = rootPath + "index.html";            // khách: "Trang chủ" là index.html
            } else if (PROTECTED_PAGES[item.page]) {
                href = loginUrl + "?redirect=" + item.href; // khách: chuyển sang đăng nhập
            }
        }

        menuHtml += '<li><a href="' + href + '" class="' + (isActive ? "active" : "") + '" ' + (isActive ? 'aria-current="page"' : "") + '>' + item.text + '</a></li>';
    }

    var authHtml = isCustomer
        ? '<a href="' + rootPath + 'index.html" class="btn btn-primary" id="btn-logout">Đăng xuất</a>'
        : '<a href="' + rootPath + 'pages/auth/register.html" class="btn btn-secondary">Đăng ký</a>' +
          '<a href="' + loginUrl + '" class="btn btn-primary">Đăng nhập</a>';

    navbar.innerHTML = '<a href="' + rootPath + 'index.html" class="logo">' +
        '<img src="' + rootPath + 'assets/images/logo.jpg" alt="PawPaw Logo" class="logo-icon">' +
        '<img src="' + rootPath + 'assets/images/pawpawheader.png" alt="PawPaw" class="logo-text"></a>' +
        '<ul class="nav-links">' + menuHtml + '</ul>' +
        '<div class="auth-buttons">' + authHtml + '</div>';

    var btnLogout = document.getElementById("btn-logout");
    if (btnLogout) {
        btnLogout.onclick = function () {
            if (typeof AppStorage !== "undefined") AppStorage.clearCurrentUser();
        };
    }
}
loadCustomerHeader();
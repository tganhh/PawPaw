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

    var menuHtml = "";
    for (var i = 0; i < menu.length; i++) {
        var item = menu[i];
        var isActive = item.page === currentPage;
        menuHtml += '<li><a href="' + customerPath + item.href + '" class="' + (isActive ? "active" : "") + '" ' + (isActive ? 'aria-current="page"' : "") + '>' + item.text + '</a></li>';
    }

    navbar.innerHTML = '<a href="' + rootPath + 'index.html" class="logo">' +
        '<img src="' + rootPath + 'assets/images/logo.jpg" alt="PawPaw Logo" class="logo-icon">' +
        '<img src="' + rootPath + 'assets/images/pawpawheader.png" alt="PawPaw" class="logo-text"></a>' +
        '<ul class="nav-links">' + menuHtml + '</ul>' +
        '<div class="auth-buttons"><a href="' + rootPath + 'index.html" class="btn btn-primary" id="btn-logout">Đăng xuất</a></div>';

    var btnLogout = document.getElementById("btn-logout");
    if (btnLogout) {
        btnLogout.onclick = function () {
            if (typeof Storage !== "undefined") Storage.clearCurrentUser();
        };
    }
}
loadCustomerHeader();
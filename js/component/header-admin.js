function loadAdminHeader() {
    var navbar = document.querySelector(".navbar");
    if (!navbar) return;

    var user = (typeof Storage !== "undefined") ? Storage.getCurrentUser() : null;
    var ROLE_ADMIN = (typeof VAI_TRO !== "undefined" && VAI_TRO.QUAN_LY) ? VAI_TRO.QUAN_LY : "quan_ly";

    if (!user || user.vai_tro !== ROLE_ADMIN) {
        window.location.replace("../../index.html");
        return;
    }

    var rootPath = "../../";
    var currentPage = document.body.getAttribute("data-page") || document.body.getAttribute("data-admin-page") || "";

    var menu = [
        { page: "dashboard", href: "dashboard.html",  text: "Dashboard" },
        { page: "user",      href: "user.html",       text: "Người dùng" },
        { page: "service",   href: "service.html",    text: "Dịch vụ" },
        { page: "booking",   href: "booking.html",    text: "Lịch hẹn" },
        { page: "review",    href: "review-mnm.html", text: "Đánh giá" },
        { page: "profile",   href: "profile.html",    text: "Hồ sơ" }
    ];

    var menuHtml = "";
    for (var i = 0; i < menu.length; i++) {
        var item = menu[i];
        var isActive = item.page === currentPage;
        menuHtml += '<li><a href="' + item.href + '" class="' + (isActive ? "active" : "") + '" ' + (isActive ? 'aria-current="page"' : "") + '>' + item.text + '</a></li>';
    }

    navbar.innerHTML = '<a href="dashboard.html" class="logo">' +
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
loadAdminHeader();
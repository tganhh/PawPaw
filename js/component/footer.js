function loadFooter() {
    var footer = document.querySelector(".footer");
    if (!footer) return;

    var isNestedPage = window.location.pathname.indexOf("/pages/") !== -1;
    var rootPath = isNestedPage ? "../../" : "";

    var html = '<div class="container footer-wrapper">' +
        '<div class="footer-brand"><a href="' + rootPath + 'index.html" class="logo">' +
        '<img src="' + rootPath + 'assets/images/logo.jpg" alt="PawPaw Logo" class="logo-icon">' +
        '<img src="' + rootPath + 'assets/images/pawpawfooter.png" alt="PawPaw" class="logo-text">' +
        '</a></div><div class="footer-contact"><h3>Liên hệ</h3><ul><li>' +
        '<img src="' + rootPath + 'assets/images/phone.png" alt="Điện thoại" class="footer-icon">' +
        '<span>0123 456 789</span></li><li>' +
        '<img src="' + rootPath + 'assets/images/email.png" alt="Email" class="footer-icon">' +
        '<span>support@pawpaw.vn</span></li><li>' +
        '<img src="' + rootPath + 'assets/images/address.png" alt="Địa chỉ" class="footer-icon">' +
        '<span>TP. Hồ Chí Minh</span></li></ul></div></div>' +
        '<div class="footer-bottom container"><p>© 2026 PawPaw. All rights reserved.</p></div>';

    footer.innerHTML = html;
}
loadFooter();
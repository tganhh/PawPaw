(function () {
  // Các trang protected nằm ở pages/customer/ hoặc pages/admin/ nên cách gốc 2 cấp
  var ROOT = "../../";
  var LOGIN_URL = ROOT + "pages/auth/login.html";

  // Khu vực mặc định của từng role (Khởi tạo Object kiểu truyền thống)
  var HOME_BY_ROLE = {};
  HOME_BY_ROLE[VAI_TRO.KHACH_HANG] = ROOT + "pages/customer/about.html";
  HOME_BY_ROLE[VAI_TRO.QUAN_LY] = ROOT + "pages/admin/dashboard.html";

  var lastRequiredRole = null;

  // Tự xác định role yêu cầu theo đường dẫn trang
  function detectRequiredRole() {
    var path = window.location.pathname;
    
    // Đổi .includes thành .indexOf theo chuẩn cũ
    if (path.indexOf("/pages/admin/") !== -1) return VAI_TRO.QUAN_LY;
    if (path.indexOf("/pages/customer/") !== -1) return VAI_TRO.KHACH_HANG;

    return null;
  }

  function redirect(url) {
    window.location.replace(url);
  }

  // Trả về currentUser nếu hợp lệ, ngược lại redirect và trả về null
  function requireLogin(requiredRole) {
    var role = requiredRole || detectRequiredRole();
    lastRequiredRole = role;

    // Ẩn trang cho đến khi kiểm tra xong, tránh nháy nội dung
    document.documentElement.style.visibility = "hidden";

    var user = Storage.getCurrentUser();

    // 1. Chưa đăng nhập → login
    if (!user) {
      redirect(LOGIN_URL);
      return null;
    }

    // 2. Role không hợp lệ → xóa phiên, về login
    if (!HOME_BY_ROLE[user.vai_tro]) {
      Storage.clearCurrentUser();
      redirect(LOGIN_URL);
      return null;
    }

    // 3. Sai khu vực → về khu vực đúng của role
    if (role && user.vai_tro !== role) {
      redirect(HOME_BY_ROLE[user.vai_tro]);
      return null;
    }

    // 4. Hợp lệ → hiện trang
    document.documentElement.style.visibility = "";
    return user;
  }

  // Bấm Back sau khi logout (trang lấy từ bfcache) thì kiểm tra lại
  window.addEventListener("pageshow", function (event) {
    if (event.persisted && lastRequiredRole !== null) {
      requireLogin(lastRequiredRole);
    }
  });

  var AuthGuard = { 
    requireLogin: requireLogin, 
    detectRequiredRole: detectRequiredRole 
  };

  window.AuthGuard = AuthGuard;
  window.requireLogin = requireLogin;
})();
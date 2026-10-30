(function () {
  function showError(input, message) {
    if (!input) return;

    input.className += " error";
    input.setAttribute("aria-invalid", "true");

    var errorElement = input.parentElement ? input.parentElement.querySelector(".error-message") : null;

    if (!errorElement) {
      errorElement = document.createElement("small");
      errorElement.className = "error-message";

      if (input.parentElement) {
        input.parentElement.appendChild(errorElement);
      }
    }

    errorElement.textContent = message || "";
    errorElement.style.display = message ? "block" : "none";
  }

  function clearError(input) {
    if (!input) return;

    input.className = input.className.replace(" error", "");
    input.removeAttribute("aria-invalid");

    var errorElement = input.parentElement ? input.parentElement.querySelector(".error-message") : null;

    if (errorElement) {
      errorElement.textContent = "";
      errorElement.style.display = "none";
    }
  }

  function validateRequired(value, fieldName) {
    fieldName = fieldName || "Trường này"; // Setup default parameter chuẩn ES5
    var text = value == null ? "" : String(value).trim();

    if (!text) {
      return fieldName + " không được để trống";
    }
    return "";
  }

  function validateEmail(value) {
    var email = value == null ? "" : String(value).trim();

    if (!email) {
      return "Email không được để trống";
    }

    var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return "Email không hợp lệ";
    }
    return "";
  }

  function validatePhone(value) {
    var phone = value == null ? "" : String(value).trim();

    if (!phone) {
      return "Số điện thoại không được để trống";
    }

    var phoneRegex = /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/;
    if (!phoneRegex.test(phone)) {
      return "Số điện thoại không hợp lệ";
    }
    return "";
  }

  function validatePassword(value) {
    var password = value == null ? "" : String(value);

    if (!password) {
      return "Mật khẩu không được để trống";
    }
    if (password.length < 6) {
      return "Mật khẩu phải có ít nhất 6 ký tự";
    }
    return "";
  }

  function validateField(input, validator) {
    if (!input || typeof validator !== "function") return false;

    var message = validator(input.value);

    if (message) {
      showError(input, message);
      return false;
    }

    clearError(input);
    return true;
  }

  var Validation = {
    showError: showError,
    clearError: clearError,
    validateRequired: validateRequired,
    validateEmail: validateEmail,
    validatePhone: validatePhone,
    validatePassword: validatePassword,
    validateField: validateField
  };

  window.Validation = Validation;
  window.showError = showError;
  window.clearError = clearError;
  window.validateRequired = validateRequired;
  window.validateEmail = validateEmail;
  window.validatePhone = validatePhone;
  window.validatePassword = validatePassword;
  window.validateField = validateField;
})();
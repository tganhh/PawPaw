var services = [];

function getServiceKeys() {
  return (typeof DATA_KEYS !== "undefined") ? DATA_KEYS : (typeof CONSTANTS !== "undefined" && CONSTANTS.DATA_KEYS ? CONSTANTS.DATA_KEYS : {
    SERVICES: "dich_vu", APPOINTMENTS: "lich_hen", APPOINTMENT_DETAILS: "chi_tiet_lich_hen", USERS: "nguoi_dung", REVIEWS: "danh_gia"
  });
}

function getServiceHienThi() {
  return (typeof HIEN_THI !== "undefined") ? HIEN_THI : (typeof CONSTANTS !== "undefined" && CONSTANTS.HIEN_THI ? CONSTANTS.HIEN_THI : {
    HIEN_THI: "hien_thi", AN: "an"
  });
}

function loadServices() {
  var DK = getServiceKeys();
  if (typeof Storage !== "undefined" && Storage.initData) {
    Storage.initData();
    var stored = Storage.getData(DK.SERVICES);
    if (stored && stored.length > 0) {
      services = stored;
      initCurrentPage();
      return;
    }
  }

  var xhr = new XMLHttpRequest();
  xhr.open("GET", "../../data/dich_vu.json", true);
  xhr.onreadystatechange = function () {
    if (xhr.readyState === 4) {
      if (xhr.status === 200 || xhr.status === 0) {
        try {
          services = JSON.parse(xhr.responseText);
        } catch (e) {
          services = Storage.getData(DK.SERVICES) || [];
        }
      } else {
        services = Storage.getData(DK.SERVICES) || [];
      }
      initCurrentPage();
    }
  };
  xhr.send();
}

function initCurrentPage() {
  if (document.getElementById("service-detail")) initDetailPage();
  else if (document.getElementById("filtered-service-list")) initFilterPage();
  else if (document.getElementById("service-list")) initServicePage();
}

function initServicePage() {
  var serviceList = document.getElementById("service-list");
  if (!serviceList) return;
  renderServices(services, serviceList);

  var searchInput = document.getElementById("service-search-input");
  var searchButton = document.getElementById("service-search-button");

  function doSearch() {
    if (!searchInput) return;
    var keyword = searchInput.value.trim().toLowerCase();
    var filteredServices = [];
    for (var i = 0; i < services.length; i++) {
      var s = services[i];
      if ((s.ten_dich_vu && s.ten_dich_vu.toLowerCase().indexOf(keyword) !== -1) ||
          (s.nhom_dich_vu && s.nhom_dich_vu.toLowerCase().indexOf(keyword) !== -1) ||
          (s.mo_ta_chi_tiet && s.mo_ta_chi_tiet.toLowerCase().indexOf(keyword) !== -1)) {
        filteredServices.push(s);
      }
    }
    renderServices(filteredServices, serviceList);
  }

  if (searchInput) searchInput.oninput = doSearch;
  if (searchButton) searchButton.onclick = doSearch;
}

function initFilterPage() {
  var groupSelect = document.getElementById("filter-group");
  var weightSelect = document.getElementById("filter-weight");
  var priceSelect = document.getElementById("filter-price");
  var durationSelect = document.getElementById("filter-duration");
  var searchInput = document.getElementById("filter-search-input");
  var applyButton = document.getElementById("apply-filter");
  var resetButton = document.getElementById("reset-filter");
  var serviceList = document.getElementById("filtered-service-list");
  var emptyMessage = document.getElementById("filtered-service-empty");

  if (!groupSelect || !applyButton || !serviceList) return;

  var groups = [];
  for (var i = 0; i < services.length; i++) {
    var g = services[i].nhom_dich_vu;
    if (g && groups.indexOf(g) === -1) groups.push(g);
  }
  for (var j = 0; j < groups.length; j++) {
    var option = document.createElement("option");
    option.value = groups[j];
    option.textContent = groups[j];
    groupSelect.appendChild(option);
  }

  serviceList.innerHTML = "";
  serviceList.style.display = "none";
  if (emptyMessage) emptyMessage.style.display = "none";

  applyButton.onclick = function () {
    var keyword = searchInput ? searchInput.value.trim().toLowerCase() : "";
    var selectedGroup = groupSelect.value;
    var selectedWeight = weightSelect ? weightSelect.value : "";
    var selectedPrice = priceSelect ? priceSelect.value : "";
    var selectedDuration = durationSelect ? durationSelect.value : "";

    var filteredServices = [];
    for (var k = 0; k < services.length; k++) {
      var s = services[k];
      var matchKeyword = !keyword || (s.ten_dich_vu && s.ten_dich_vu.toLowerCase().indexOf(keyword) !== -1);
      var matchGroup = !selectedGroup || s.nhom_dich_vu === selectedGroup;
      var matchWeight = !selectedWeight || checkWeight(s, selectedWeight);
      var matchPrice = !selectedPrice || checkPrice(s, selectedPrice);
      var matchDuration = !selectedDuration || checkDuration(s, selectedDuration);

      if (matchKeyword && matchGroup && matchWeight && matchPrice && matchDuration) {
        filteredServices.push(s);
      }
    }

    serviceList.innerHTML = "";
    if (filteredServices.length === 0) {
      serviceList.style.display = "none";
      if (emptyMessage) emptyMessage.style.display = "block";
      return;
    }
    for (var f = 0; f < filteredServices.length; f++) serviceList.appendChild(createServiceCard(filteredServices[f]));
    serviceList.style.display = "grid";
    if (emptyMessage) emptyMessage.style.display = "none";
  };

  if (resetButton) {
    resetButton.onclick = function () {
      if (searchInput) searchInput.value = "";
      groupSelect.value = "";
      if (weightSelect) weightSelect.value = "";
      if (priceSelect) priceSelect.value = "";
      if (durationSelect) durationSelect.value = "";
      serviceList.innerHTML = "";
      serviceList.style.display = "none";
      if (emptyMessage) emptyMessage.style.display = "none";
    };
  }
}

function checkWeight(service, weightType) {
  var prices = [Number(service.gia_duoi_5kg), Number(service.gia_5_15kg), Number(service.gia_tren_15kg)];
  switch (weightType) {
    case "under-5": return prices[0] > 0;
    case "5-15": return prices[1] > 0;
    case "over-15": return prices[2] > 0;
    default: return true;
  }
}

function checkPrice(service, priceType) {
  var p1 = Number(service.gia_duoi_5kg), p2 = Number(service.gia_5_15kg), p3 = Number(service.gia_tren_15kg);
  var prices = [];
  if (p1 > 0) prices.push(p1); if (p2 > 0) prices.push(p2); if (p3 > 0) prices.push(p3);
  if (prices.length === 0) return false;
  
  var minPrice = Math.min.apply(null, prices);
  var maxPrice = Math.max.apply(null, prices);

  switch (priceType) {
    case "under-100": return minPrice < 100000;
    case "100-200": return maxPrice >= 100000 && minPrice <= 200000;
    case "200-500": return maxPrice > 200000 && minPrice <= 500000;
    case "over-500": return maxPrice > 500000;
    default: return true;
  }
}

function checkDuration(service, durationType) {
  var duration = parseDuration(service.thoi_gian_du_kien);
  switch (durationType) {
    case "under-30": return duration < 30;
    case "30-60": return duration >= 30 && duration <= 60;
    case "60-120": return duration > 60 && duration <= 120;
    case "over-120": return duration > 120;
    default: return true;
  }
}

function parseDuration(value) {
  if (typeof value === "number") return value;
  var match = String(value).match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function renderServices(serviceArray, container) {
  container.innerHTML = "";
  var emptyMessage = document.getElementById("service-empty");
  if (serviceArray.length === 0) {
    if (emptyMessage) emptyMessage.style.display = "block"; return;
  }
  if (emptyMessage) emptyMessage.style.display = "none";
  for (var i = 0; i < serviceArray.length; i++) container.appendChild(createServiceCard(serviceArray[i]));
}

function getMinPriceText(service) {
  var p1 = Number(service.gia_duoi_5kg), p2 = Number(service.gia_5_15kg), p3 = Number(service.gia_tren_15kg);
  var prices = [];
  if (p1 > 0) prices.push(p1); if (p2 > 0) prices.push(p2); if (p3 > 0) prices.push(p3);
  if (prices.length === 0) return "Liên hệ";
  var minP = Math.min.apply(null, prices);
  return (typeof Common !== "undefined" && Common.formatCurrency) ? Common.formatCurrency(minP) : formatCurrency(minP);
}

function createServiceCard(service) {
  var card = document.createElement("div");
  card.className = "service-card";
  card.onclick = function () { window.location.href = "service-detail.html?id=" + encodeURIComponent(service.ma_dich_vu); };

  if (service.anh_dich_vu) {
    var image = document.createElement("img"); image.className = "service-card-image"; image.src = service.anh_dich_vu; image.alt = service.ten_dich_vu; card.appendChild(image);
  } else {
    var placeholder = document.createElement("div"); placeholder.className = "service-card-placeholder"; placeholder.textContent = "PawPaw"; card.appendChild(placeholder);
  }

  var content = document.createElement("div"); content.className = "service-card-content";
  if (service.nhom_dich_vu) { var group = document.createElement("span"); group.className = "service-card-group"; group.textContent = service.nhom_dich_vu; content.appendChild(group); }

  var title = document.createElement("h2"); title.textContent = service.ten_dich_vu; content.appendChild(title);

  var priceFooter = document.createElement("div"); priceFooter.className = "service-card-price-footer";
  var priceVal = document.createElement("span"); priceVal.className = "service-card-price-value"; priceVal.textContent = "Từ " + getMinPriceText(service);
  var btnDetail = document.createElement("span"); btnDetail.className = "btn btn-sm btn-primary service-card-btn"; btnDetail.textContent = "Chi tiết";

  priceFooter.appendChild(priceVal); priceFooter.appendChild(btnDetail); content.appendChild(priceFooter); card.appendChild(content);
  return card;
}

function initDetailPage() {
  var detailContainer = document.getElementById("service-detail");
  var emptyMessage = document.getElementById("service-detail-empty");
  if (!detailContainer) return;

  var q = window.location.search.substring(1);
  var vars = q.split("&");
  var serviceId = null;
  for (var i = 0; i < vars.length; i++) {
    var pair = vars[i].split("=");
    if (decodeURIComponent(pair[0]) === "id") { serviceId = decodeURIComponent(pair[1]); break; }
  }

  var service = null;
  for (var j = 0; j < services.length; j++) {
    if (String(services[j].ma_dich_vu) === String(serviceId)) { service = services[j]; break; }
  }

  if (!service) {
    detailContainer.innerHTML = "";
    if (emptyMessage) emptyMessage.style.display = "block"; return;
  }
  if (emptyMessage) emptyMessage.style.display = "none";
  renderServiceDetail(service, detailContainer);
  loadServiceReviews(service.ma_dich_vu);
}

var REVIEW_STAR_LABELS = ["", "Rất tệ", "Chưa tốt", "Bình thường", "Hài lòng", "Tuyệt vời"];

function loadServiceReviews(serviceId) {
  if (typeof Storage !== "undefined" && Storage.initData) Storage.initData();
  renderServiceReviews(serviceId);
}

function escapeReviewHtml(value) {
  return String(value == null ? "" : value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function formatReviewTime(iso) {
  if (!iso) return "";
  var m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  return m ? (m[3] + "/" + m[2] + "/" + m[1] + " " + m[4] + ":" + m[5]) : String(iso);
}

function reviewStarsHtml(count) {
  var n = Math.round(Number(count) || 0);
  var html = "";
  for (var i = 1; i <= 5; i++) html += i <= n ? "★" : '<span class="off">★</span>';
  return '<span class="stars-text" title="' + n + ' sao">' + html + '</span>';
}

function getVisibleServiceReviews(serviceId) {
  var DK = getServiceKeys();
  var HT = getServiceHienThi();
  var details = Storage.getData(DK.APPOINTMENT_DETAILS) || [];
  var appointments = Storage.getData(DK.APPOINTMENTS) || [];
  var users = Storage.getData(DK.USERS) || [];
  var reviews = Storage.getData(DK.REVIEWS) || [];

  var appointmentIds = {};
  for (var i = 0; i < details.length; i++) {
    if (String(details[i].ma_dich_vu) === String(serviceId)) appointmentIds[String(details[i].ma_lich_hen)] = true;
  }

  var visible = [];
  for (var j = 0; j < reviews.length; j++) {
    var rev = reviews[j];
    var isVisible = rev.trang_thai_hien_thi === HT.HIEN_THI || rev.trang_thai_hien_thi === "hien_thi" || !rev.trang_thai_hien_thi;
    if (appointmentIds[String(rev.ma_lich_hen)] && isVisible) {
      var appt = null;
      for (var k = 0; k < appointments.length; k++) { if (String(appointments[k].ma_lich_hen) === String(rev.ma_lich_hen)) { appt = appointments[k]; break; } }
      var user = null;
      if (appt) {
        for (var u = 0; u < users.length; u++) { if (String(users[u].ma_nguoi_dung) === String(appt.ma_nguoi_dung)) { user = users[u]; break; } }
      }
      visible.push({ review: rev, customerName: user ? (user.ho_ten || user.ten_nguoi_dung || "Khách hàng") : "Khách hàng" });
    }
  }

  visible.sort(function (a, b) {
    var t1 = String(b.review.thoi_gian_danh_gia || "");
    var t2 = String(a.review.thoi_gian_danh_gia || "");
    return t1 < t2 ? -1 : (t1 > t2 ? 1 : 0);
  });
  return visible;
}

function renderServiceReviews(serviceId) {
  var section = document.getElementById("service-review-section");
  var summary = document.getElementById("service-review-summary");
  var list = document.getElementById("service-review-list");

  if (!section || !summary || !list) return;

  var rows = getVisibleServiceReviews(serviceId);
  section.style.display = "";

  if (rows.length === 0) {
    summary.innerHTML = "";
    list.innerHTML = '<p class="service-review-empty">Dịch vụ này chưa có đánh giá nào.</p>';
    return;
  }

  var total = 0;
  for (var i = 0; i < rows.length; i++) total += Number(rows[i].review.so_sao) || 0;
  var average = total / rows.length;

  summary.innerHTML = '<span class="service-review-avg">' + average.toFixed(1) + '</span> ' + reviewStarsHtml(average) + ' <span class="service-review-count">(' + rows.length + ' đánh giá)</span>';
  
  var html = "";
  for (var j = 0; j < rows.length; j++) {
    var row = rows[j];
    var review = row.review;
    html += '<article class="service-review-item"><div class="service-review-top"><strong class="service-review-name">' + escapeReviewHtml(row.customerName) + '</strong><span class="service-review-time">' + escapeReviewHtml(formatReviewTime(review.thoi_gian_danh_gia)) + '</span></div><div class="service-review-rating">' + reviewStarsHtml(review.so_sao) + ' <span class="service-review-label">' + escapeReviewHtml(REVIEW_STAR_LABELS[Number(review.so_sao)] || "") + '</span></div><p class="service-review-content">' + escapeReviewHtml(review.noi_dung_danh_gia) + '</p></article>';
  }
  list.innerHTML = html;
}

function renderServiceDetail(service, container) {
  container.innerHTML = "";
  var card = document.createElement("div"); card.className = "service-detail-card";
  var imageSection = document.createElement("div"); imageSection.className = "service-detail-image";

  if (service.anh_dich_vu) {
    var image = document.createElement("img"); image.src = service.anh_dich_vu; image.alt = service.ten_dich_vu; imageSection.appendChild(image);
  } else {
    var placeholder = document.createElement("div"); placeholder.className = "service-detail-image-placeholder"; placeholder.textContent = "PawPaw"; imageSection.appendChild(placeholder);
  }

  var content = document.createElement("div"); content.className = "service-detail-content";
  var group = document.createElement("div"); group.className = "service-detail-group"; group.textContent = service.nhom_dich_vu;
  var title = document.createElement("h1"); title.textContent = service.ten_dich_vu;
  var description = document.createElement("p"); description.className = "service-detail-description"; description.textContent = service.mo_ta_chi_tiet;

  var info = document.createElement("div"); info.className = "service-detail-info";
  var infoItem = document.createElement("div"); infoItem.className = "service-detail-info-item";
  var infoLabel = document.createElement("strong"); infoLabel.textContent = "Thời gian dự kiến: ";
  var infoValue = document.createElement("span"); infoValue.textContent = service.thoi_gian_du_kien;
  infoItem.appendChild(infoLabel); infoItem.appendChild(infoValue); info.appendChild(infoItem);

  var priceSection = document.createElement("div"); priceSection.className = "service-price-section";
  var priceTitle = document.createElement("h2"); priceTitle.textContent = "Mức giá theo cân nặng";
  var priceList = document.createElement("div"); priceList.className = "service-price-list";

  addPrice(priceList, "Dưới 5 kg", service.gia_duoi_5kg); addPrice(priceList, "5 - 15 kg", service.gia_5_15kg); addPrice(priceList, "Trên 15 kg", service.gia_tren_15kg);
  priceSection.appendChild(priceTitle); priceSection.appendChild(priceList);

  content.appendChild(group); content.appendChild(title); content.appendChild(description); content.appendChild(info); content.appendChild(priceSection);
  card.appendChild(imageSection); card.appendChild(content); container.appendChild(card);
}

function addPrice(container, label, price) {
  var item = document.createElement("div"); item.className = "service-price-item";
  var labelElement = document.createElement("span"); labelElement.textContent = label;
  var priceElement = document.createElement("span"); priceElement.textContent = formatCurrency(price);
  item.appendChild(labelElement); item.appendChild(priceElement); container.appendChild(item);
}

function formatCurrency(value) {
  var number = Number(value);
  if (!number) return "Liên hệ";
  return new Intl.NumberFormat("vi-VN").format(number) + " đ";
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", loadServices); else loadServices();
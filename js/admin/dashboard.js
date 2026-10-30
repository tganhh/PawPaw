(function (global) {
  "use strict";

  var STATUS = { SAP_DIEN_RA: "sap_dien_ra", DANG_DIEN_RA: "dang_dien_ra", DA_HOAN_THANH: "da_hoan_thanh", DA_HUY: "da_huy" };
  var COLORS = { done: "#5bbf8a", upcoming: "#f5b94a", cancelled: "#ef7b7b", primary: "#6982D5", primarySoft: "rgba(105, 130, 213, 0.18)", pastel: "#99B4DA", text: "#806E83", grid: "rgba(128, 110, 131, 0.14)" };
  var MONTHS_TO_SHOW = 6;
  var TOP_SERVICES = 5;

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function(ch) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]; });
  }

  function formatMoney(value) { return (typeof Common !== "undefined" && Common.formatCurrency) ? Common.formatCurrency(value) : (Number(value || 0).toLocaleString() + " ₫"); }

  function normalizeStatus(st) {
    if (!st) return STATUS.SAP_DIEN_RA;
    var lower = String(st).toLowerCase();
    if (lower === "cho_xac_nhan" || lower === "da_xac_nhan" || lower === "sap_dien_ra") return STATUS.SAP_DIEN_RA;
    if (lower === "dang_dien_ra") return STATUS.DANG_DIEN_RA;
    if (lower === "hoan_thanh" || lower === "da_hoan_thanh") return STATUS.DA_HOAN_THANH;
    if (lower === "da_huy") return STATUS.DA_HUY;
    return st;
  }

  function getStatusLabel(status) {
    switch (normalizeStatus(status)) {
      case STATUS.SAP_DIEN_RA: return "Sắp diễn ra";
      case STATUS.DANG_DIEN_RA: return "Đang diễn ra";
      case STATUS.DA_HOAN_THANH: return "Đã hoàn thành";
      case STATUS.DA_HUY: return "Đã huỷ";
      default: return status;
    }
  }

  function isCustomer(user) {
    var role = String(user.vai_tro || "").toLowerCase();
    return (!role || role === String(VAI_TRO.KHACH_HANG).toLowerCase() || role === "khach_hang" || role === "khach hang");
  }

  function monthKey(dateStr) { return String(dateStr || "").slice(0, 7); }

  function getMonthRange(appointments) {
    var keys = [];
    for(var i=0; i<appointments.length; i++) {
      var k = monthKey(appointments[i].ngay_hen);
      if (/^\d{4}-\d{2}$/.test(k)) keys.push(k);
    }
    if (keys.length === 0) return [];
    var last = keys[0];
    for(var j=1; j<keys.length; j++) { if(keys[j] > last) last = keys[j]; }
    
    var year = Number(last.slice(0, 4));
    var month = Number(last.slice(5, 7));
    var result = [];
    for (var i = 0; i < MONTHS_TO_SHOW; i++) {
      result.unshift(year + "-" + (month < 10 ? "0"+month : month));
      month -= 1;
      if (month === 0) { month = 12; year -= 1; }
    }
    return result;
  }

  function monthLabel(key) { return key.slice(5, 7) + "/" + key.slice(0, 4); }

  function initDashboard() {
    if (typeof Storage === "undefined") return;
    if (Storage.initData) Storage.initData();

    var appointments = Storage.getData(DATA_KEYS.APPOINTMENTS) || [];
    var users = Storage.getData(DATA_KEYS.USERS) || [];
    var details = Storage.getData(DATA_KEYS.APPOINTMENT_DETAILS) || [];
    var pets = Storage.getData(DATA_KEYS.PETS) || [];
    var services = Storage.getData(DATA_KEYS.SERVICES) || [];
    var reviews = Storage.getData(DATA_KEYS.REVIEWS) || [];

    var userMap = {}; for(var i=0; i<users.length; i++) userMap[String(users[i].ma_nguoi_dung)] = users[i];
    var petMap = {}; for(var i=0; i<pets.length; i++) petMap[String(pets[i].ma_thu_cung)] = pets[i];
    var serviceMap = {}; for(var i=0; i<services.length; i++) serviceMap[String(services[i].ma_dich_vu)] = services[i];

    renderKpis({ appointments: appointments, users: users, pets: pets, reviews: reviews });
    renderCharts({ appointments: appointments, details: details, serviceMap: serviceMap });
    renderRecentBookings({ appointments: appointments, details: details, userMap: userMap, petMap: petMap, serviceMap: serviceMap });
  }

  function renderKpis(data) {
    var totalCustomers = 0;
    for(var i=0; i<data.users.length; i++) { if(isCustomer(data.users[i])) totalCustomers++; }
    var totalPets = data.pets.length;

    var pendingBookings = 0;
    var totalRevenue = 0;
    for(var j=0; j<data.appointments.length; j++) {
      var st = normalizeStatus(data.appointments[j].trang_thai);
      if (st === STATUS.SAP_DIEN_RA || st === STATUS.DANG_DIEN_RA) pendingBookings++;
      if (st === STATUS.DA_HOAN_THANH) totalRevenue += (Number(data.appointments[j].tong_tien) || 0);
    }

    var avgRating = "0.0";
    if (data.reviews.length > 0) {
      var sumRating = 0;
      for(var k=0; k<data.reviews.length; k++) sumRating += (Number(data.reviews[k].so_sao) || 0);
      avgRating = (sumRating / data.reviews.length).toFixed(1);
    }

    function setText(id, text) { var el = document.getElementById(id); if (el) el.textContent = text; }
    setText("kpi-total-customers", totalCustomers);
    setText("kpi-total-pets", totalPets);
    setText("kpi-pending-bookings", pendingBookings);
    setText("kpi-total-revenue", formatMoney(totalRevenue));
    setText("kpi-avg-rating", avgRating + " / 5 ⭐");
  }

  function renderCharts(data) {
    if (typeof Chart === "undefined") {
      var boxes = document.querySelectorAll(".chart-box");
      for(var i=0; i<boxes.length; i++) boxes[i].innerHTML = '<div class="chart-empty">Không tải được thư viện biểu đồ.</div>';
      return;
    }

    Chart.defaults.font.family = "'Nunito', sans-serif"; Chart.defaults.font.weight = 600; Chart.defaults.color = COLORS.text;
    var months = getMonthRange(data.appointments);
    var labels = []; for(var i=0; i<months.length; i++) labels.push(monthLabel(months[i]));

    var perMonth = {};
    for(var j=0; j<months.length; j++) perMonth[months[j]] = { done: 0, upcoming: 0, cancelled: 0, revenue: 0 };

    for(var k=0; k<data.appointments.length; k++) {
      var a = data.appointments[k];
      var bucket = perMonth[monthKey(a.ngay_hen)];
      if (!bucket) continue;
      var st = normalizeStatus(a.trang_thai);
      if (st === STATUS.DA_HOAN_THANH) { bucket.done += 1; bucket.revenue += Number(a.tong_tien) || 0; }
      else if (st === STATUS.DA_HUY) { bucket.cancelled += 1; }
      else { bucket.upcoming += 1; }
    }
    
    var rows = []; var revenues = [];
    for(var m=0; m<months.length; m++) { rows.push(perMonth[months[m]]); revenues.push(perMonth[months[m]].revenue); }

    drawBookingsByMonth(labels, rows);
    drawRevenueByMonth(labels, revenues);
    drawStatusShare(rows);
    drawTopServices(data.appointments, data.details, data.serviceMap);
  }

  var stackTotalPlugin = {
    id: "stackTotals",
    afterDatasetsDraw: function(chart) {
      var ctx = chart.ctx; var datasets = chart.data.datasets; var count = chart.data.labels.length;
      ctx.save(); ctx.font = "800 12px 'Nunito', sans-serif"; ctx.fillStyle = "#2f3640"; ctx.textAlign = "center"; ctx.textBaseline = "bottom";
      for (var i = 0; i < count; i++) {
        var total = 0, top = Infinity, x = null;
        for (var di = 0; di < datasets.length; di++) {
          var value = Number(datasets[di].data[i]) || 0;
          total += value;
          var bar = chart.getDatasetMeta(di).data[i];
          if (value > 0 && bar) { if(bar.y < top) top = bar.y; x = bar.x; }
        }
        if (x !== null && top !== Infinity) ctx.fillText(String(total), x, top - 4);
      }
      ctx.restore();
    }
  };

  function drawBookingsByMonth(labels, rows) {
    var canvas = document.getElementById("chart-bookings-month"); if (!canvas) return;
    var d1=[], d2=[], d3=[];
    for(var i=0; i<rows.length; i++) { d1.push(rows[i].done); d2.push(rows[i].upcoming); d3.push(rows[i].cancelled); }

    new Chart(canvas, {
      type: "bar",
      data: { labels: labels, datasets: [
          { label: "Hoàn thành", data: d1, backgroundColor: COLORS.done, borderRadius: 4 },
          { label: "Sắp diễn ra", data: d2, backgroundColor: COLORS.upcoming, borderRadius: 4 },
          { label: "Đã huỷ", data: d3, backgroundColor: COLORS.cancelled, borderRadius: 4 }
      ]},
      options: { responsive: true, maintainAspectRatio: false, layout: { padding: { top: 18 } }, scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, beginAtZero: true, grid: { color: COLORS.grid }, ticks: { precision: 0 } } }, plugins: { legend: { position: "bottom", labels: { usePointStyle: true, boxWidth: 8 } }, tooltip: { callbacks: { footer: function(items) { var total = 0; for(var i=0; i<items.length; i++) total += items[i].parsed.y; return "Tổng: " + total + " lịch"; } } } } },
      plugins: [stackTotalPlugin]
    });
  }

  function drawRevenueByMonth(labels, revenues) {
    var canvas = document.getElementById("chart-revenue-month"); if (!canvas) return;
    new Chart(canvas, {
      type: "line",
      data: { labels: labels, datasets: [{ label: "Doanh thu", data: revenues, borderColor: COLORS.primary, backgroundColor: COLORS.primarySoft, pointBackgroundColor: COLORS.primary, pointRadius: 4, pointHoverRadius: 6, borderWidth: 3, tension: 0.35, fill: true }] },
      options: { responsive: true, maintainAspectRatio: false, scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { color: COLORS.grid }, ticks: { callback: function(v) { return (v / 1000000).toLocaleString("vi-VN", { maximumFractionDigits: 1 }) + " tr"; } } } }, plugins: { legend: { display: false }, tooltip: { callbacks: { label: function(ctx) { return " " + formatMoney(ctx.parsed.y); } } } } }
    });
  }

  function drawStatusShare(rows) {
    var canvas = document.getElementById("chart-status-share"); if (!canvas) return;
    var d=0, u=0, c=0;
    for(var i=0; i<rows.length; i++) { d+=rows[i].done; u+=rows[i].upcoming; c+=rows[i].cancelled; }
    var values = [d, u, c]; var names = ["Hoàn thành", "Sắp diễn ra", "Đã huỷ"];
    var total = d+u+c;
    var labels = []; for(var j=0; j<names.length; j++) labels.push(names[j] + " (" + values[j] + ")");

    new Chart(canvas, {
      type: "doughnut",
      data: { labels: labels, datasets: [{ data: values, backgroundColor: [COLORS.done, COLORS.upcoming, COLORS.cancelled], borderColor: "#ffffff", borderWidth: 3, hoverOffset: 6 }] },
      options: { responsive: true, maintainAspectRatio: false, cutout: "62%", plugins: { legend: { position: "bottom", labels: { usePointStyle: true, boxWidth: 8 } }, tooltip: { callbacks: { label: function(ctx) { var pct = total ? ((ctx.parsed / total) * 100).toFixed(1) : "0.0"; return " " + names[ctx.dataIndex] + ": " + ctx.parsed + " lịch (" + pct + "%)"; } } } } }
    });
  }

  function drawTopServices(appointments, details, serviceMap) {
    var canvas = document.getElementById("chart-top-services"); if (!canvas) return;
    var activeIds = {};
    for(var i=0; i<appointments.length; i++) { if (normalizeStatus(appointments[i].trang_thai) !== STATUS.DA_HUY) activeIds[String(appointments[i].ma_lich_hen)] = true; }
    
    var counter = {};
    for(var j=0; j<details.length; j++) {
      if (activeIds[String(details[j].ma_lich_hen)]) {
        var id = String(details[j].ma_dich_vu);
        counter[id] = (counter[id] || 0) + 1;
      }
    }
    var topArr = [];
    for(var k in counter) { topArr.push({ id: k, count: counter[k] }); }
    topArr.sort(function(a,b) { return b.count - a.count; });
    var top = [];
    for(var t=0; t<Math.min(TOP_SERVICES, topArr.length); t++) {
      var svc = serviceMap[topArr[t].id] || {};
      top.push({ name: svc.ten_dich_vu || topArr[t].id, count: topArr[t].count });
    }
    
    var labels = []; var counts = [];
    for(var l=0; l<top.length; l++) { labels.push(top[l].name.length > 24 ? top[l].name.slice(0, 23) + "…" : top[l].name); counts.push(top[l].count); }

    new Chart(canvas, {
      type: "bar",
      data: { labels: labels, datasets: [{ label: "Lượt đặt", data: counts, backgroundColor: [COLORS.primary, "#7C93DA", "#8EA5DE", COLORS.pastel, "#B0C6E4"], borderRadius: 6, barThickness: 22 }] },
      options: { indexAxis: "y", responsive: true, maintainAspectRatio: false, scales: { x: { beginAtZero: true, grid: { color: COLORS.grid }, ticks: { precision: 0 } }, y: { grid: { display: false } } }, plugins: { legend: { display: false }, tooltip: { callbacks: { title: function(items) { return top[items[0].dataIndex].name; }, label: function(ctx) { return " " + ctx.parsed.x + " lượt đặt"; } } } } }
    });
  }

  function renderRecentBookings(data) {
    var detailsByAppointment = {};
    for(var d=0; d<data.details.length; d++) {
      var key = String(data.details[d].ma_lich_hen);
      if (!detailsByAppointment[key]) detailsByAppointment[key] = [];
      detailsByAppointment[key].push(data.details[d]);
    }

    var fullBookings = [];
    for(var a=0; a<data.appointments.length; a++) {
      var apt = data.appointments[a];
      var user = data.userMap[String(apt.ma_nguoi_dung)] || { ho_ten: "Khách lẻ", so_dien_thoai: "---" };
      var rawDetails = detailsByAppointment[String(apt.ma_lich_hen)] || [];
      var aptDetails = [];
      for(var rd=0; rd<rawDetails.length; rd++) {
        var det = rawDetails[rd];
        var pet = data.petMap[String(det.ma_thu_cung)] || { ten_thu_cung: "Bé cưng" };
        var srv = data.serviceMap[String(det.ma_dich_vu)] || { ten_dich_vu: "Dịch vụ" };
        var newDet = {}; for(var pk in det) newDet[pk] = det[pk];
        newDet.ten_thu_cung = pet.ten_thu_cung; newDet.ten_dich_vu = srv.ten_dich_vu;
        aptDetails.push(newDet);
      }
      var newApt = {}; for(var ak in apt) newApt[ak] = apt[ak];
      newApt.user = user; newApt.details = aptDetails;
      fullBookings.push(newApt);
    }

    fullBookings.sort(function(a, b) { return new Date(b.thoi_gian_tao || b.ngay_hen) - new Date(a.thoi_gian_tao || a.ngay_hen); });
    renderRecentTable(fullBookings.slice(0, 6));
  }

  function renderRecentTable(data) {
    var tbody = document.getElementById("dashboard-booking-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    if (data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 25px; color: var(--purple-gray);">Chưa có dữ liệu lịch hẹn nào.</td></tr>'; return;
    }
    for(var i=0; i<data.length; i++) {
      var b = data[i]; var tr = document.createElement("tr");
      var itemsStr = "---";
      if (b.details.length > 0) {
        var arr = []; for(var d=0; d<b.details.length; d++) arr.push("<b>" + escapeHtml(b.details[d].ten_thu_cung) + "</b>: " + escapeHtml(b.details[d].ten_dich_vu));
        itemsStr = arr.join("<br>");
      }
      var st = normalizeStatus(b.trang_thai);
      tr.innerHTML = '<td><strong style="color: var(--blue-dark);">' + escapeHtml(b.ma_lich_hen) + '</strong></td><td><div style="font-weight: 800;">' + escapeHtml(b.user.ho_ten) + '</div></td><td>' + escapeHtml(b.user.so_dien_thoai) + '</td><td><div style="font-weight: 800; color: var(--blue-dark);">' + (b.gio_hen ? b.gio_hen.slice(0, 5) : "--:--") + '</div><div style="font-size: 12px; color: var(--purple-gray);">' + escapeHtml(b.ngay_hen) + '</div></td><td>' + itemsStr + '</td><td><strong style="color: var(--blue-dark);">' + formatMoney(b.tong_tien) + '</strong></td><td class="col-center"><span class="badge badge-' + st + '">' + getStatusLabel(st) + '</span></td>';
      tbody.appendChild(tr);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initDashboard); else initDashboard();
})(typeof window !== "undefined" ? window : this);
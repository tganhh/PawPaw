(function () {
    "use strict";

    if (document.getElementById("pawpawChatBox")) return;

    var scriptElement = document.currentScript;
    var scriptUrl = scriptElement ? scriptElement.src : (window.location.href); 
    var cssUrl = "../../css/chatbot.css";

    if (!document.getElementById("pawpaw-chatbot-css")) {
        var link = document.createElement("link");
        link.id = "pawpaw-chatbot-css";
        link.rel = "stylesheet";
        link.href = cssUrl;
        document.head.appendChild(link);
    }

    var serviceJsonUrl = "../../data/dich_vu.json";
    var cachedServices = null;

    function normalizeServices(data) {
        if (Object.prototype.toString.call(data) === '[object Array]') return data;
        if (data && Object.prototype.toString.call(data.dich_vu) === '[object Array]') return data.dich_vu;
        if (data && Object.prototype.toString.call(data.services) === '[object Array]') return data.services;
        return [];
    }

    function loadServices(forceReload, callback) {
        if (cachedServices && !forceReload) { callback(null, cachedServices); return; }

        var possibleKeys = ["petcare_dich_vu", "dich_vu", "services"];
        for (var i = 0; i < possibleKeys.length; i++) {
            try {
                var storedData = localStorage.getItem(possibleKeys[i]);
                if (storedData) {
                    var services = normalizeServices(JSON.parse(storedData));
                    if (services.length > 0) { cachedServices = services; callback(null, cachedServices); return; }
                }
            } catch (error) {}
        }

        var xhr = new XMLHttpRequest();
        xhr.open("GET", serviceJsonUrl, true);
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200 || xhr.status === 0) {
                    try {
                        var data = JSON.parse(xhr.responseText);
                        var svcs = normalizeServices(data);
                        if (svcs.length === 0) throw new Error("Empty");
                        cachedServices = svcs; callback(null, cachedServices);
                    } catch(e) { callback(e, []); }
                } else {
                    callback(new Error("HTTP " + xhr.status), []);
                }
            }
        };
        xhr.send();
    }

    function normalizeText(value) {
        var val = value == null ? "" : String(value);
        return val.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase().trim();
    }

    function getServiceName(service) { return service.ten_dich_vu || service.ten_dv || service.name || ""; }
    function getServiceDescription(service) { return service.mo_ta || service.mo_ta_dich_vu || service.description || ""; }

    function formatPrice(value) {
        if (value === null || value === undefined || value === "") return "Chưa có thông tin";
        var number = Number(value); if (isNaN(number)) return String(value);
        return number.toLocaleString("vi-VN") + " VNĐ";
    }

    function formatServiceForAI(service) {
        return {
            ma_dich_vu: service.ma_dich_vu || "", ten_dich_vu: getServiceName(service), mo_ta: getServiceDescription(service),
            gia_duoi_5kg: formatPrice(service.gia_duoi_5kg), gia_5_15kg: formatPrice(service.gia_5_15kg), gia_tren_15kg: formatPrice(service.gia_tren_15kg),
            thoi_gian_du_kien: service.thoi_gian_du_kien != null ? (service.thoi_gian_du_kien + " phút") : "Chưa có thông tin"
        };
    }

    function getSearchTerms(text) {
        var stopWordsArr = ["cho", "toi", "minh", "ban", "cua", "la", "co", "bao", "nhieu", "nao", "gi", "giup", "voi", "khong", "mot", "cac", "duoc", "the", "nay", "kia", "va", "hay", "gia", "dich", "vu", "pawpaw", "be", "thu", "cung", "hoi", "ve", "xin", "chao"];
        var raw = normalizeText(text).replace(/[^\w\s]/g, " ").split(/\s+/);
        var res = [];
        for(var i=0; i<raw.length; i++) { if (raw[i].length > 1 && stopWordsArr.indexOf(raw[i]) === -1) res.push(raw[i]); }
        return res;
    }

    function searchServices(question, callback) {
        loadServices(false, function(err, services) {
            if (err || services.length === 0) { callback({ available: false, services: [] }); return; }
            var query = normalizeText(question); var terms = getSearchTerms(question);
            if (question.trim() === "1") { callback({ available: true, services: services }); return; }

            var priceIntents = ["gia", "bang gia", "bao nhieu", "chi phi", "phi", "dich vu", "spa", "tam", "cat tia", "cat long", "cham soc", "thoi gian"];
            var priceIntent = false;
            for (var j=0; j<priceIntents.length; j++) { if (query.indexOf(normalizeText(priceIntents[j])) !== -1) { priceIntent = true; break; } }
            if (!priceIntent) { callback({ available: true, services: [] }); return; }

            var scored = [];
            for(var k=0; k<services.length; k++) {
                var svc = services[k];
                var searchableText = normalizeText(getServiceName(svc) + " " + getServiceDescription(svc) + " " + (svc.ma_dich_vu||"") + " " + (svc.nhom_dich_vu||"") + " " + (svc.loai_dich_vu||""));
                var score = 0;
                for(var t=0; t<terms.length; t++) { if (searchableText.indexOf(terms[t]) !== -1) score++; }
                scored.push({ service: svc, score: score });
            }

            var matched = []; scored.sort(function(a,b) { return b.score - a.score; });
            for(var m=0; m<scored.length; m++) { if (scored[m].score > 0) matched.push(scored[m].service); }
            callback({ available: true, services: matched });
        });
    }

    var welcomeHTML = 'Dạ PawPaw xin chào sen ạ! 🐾<br><br>Bạn có thể nhập số hoặc bấm chọn:<br><br><b>1.</b> Bảng giá và dịch vụ Spa / Cắt tỉa<br><b>2.</b> Đặt lịch hẹn dịch vụ<br><b>3.</b> Giờ mở cửa và địa chỉ<br><b>4.</b> Tư vấn chăm sóc thú cưng cùng AI<div class="pawpaw-quick-tags"><button type="button" class="pawpaw-tag-btn" data-choice="1">Phím 1: Bảng giá</button><button type="button" class="pawpaw-tag-btn" data-choice="2">Phím 2: Đặt lịch</button><button type="button" class="pawpaw-tag-btn" data-choice="3">Phím 3: Giờ & Địa chỉ</button><button type="button" class="pawpaw-tag-btn" data-choice="4">Phím 4: Tư vấn AI</button></div>';

    var container = document.createElement("div");
    container.innerHTML = '<button type="button" class="pawpaw-chat-btn" id="pawpawChatBtn" title="Chat với PawPaw" aria-label="Mở chatbot PawPaw">🐾</button><section class="pawpaw-chat-box" id="pawpawChatBox" aria-label="Trợ lý AI PawPaw"><div class="pawpaw-chat-header"><span>🐾 Trợ lý AI PawPaw</span><button type="button" id="pawpawCloseChat" aria-label="Đóng chatbot">&times;</button></div><div class="pawpaw-chat-messages" id="pawpawChatMessages" aria-live="polite"><div class="pawpaw-msg pawpaw-msg-bot">' + welcomeHTML + '</div></div><form class="pawpaw-chat-input-bar" id="pawpawChatForm"><input type="text" id="pawpawChatInput" placeholder="Nhập câu hỏi hoặc số 1, 2, 3, 4..." autocomplete="off" required><button type="submit">Gửi</button></form></section>';
    document.body.appendChild(container);

    var chatBtn = document.getElementById("pawpawChatBtn");
    var chatBox = document.getElementById("pawpawChatBox");
    var closeBtn = document.getElementById("pawpawCloseChat");
    var chatForm = document.getElementById("pawpawChatForm");
    var chatInput = document.getElementById("pawpawChatInput");
    var msgContainer = document.getElementById("pawpawChatMessages");
    var sendBtn = chatForm.querySelector("button[type='submit']");
    var isSending = false;

    function openChatbot() { chatBox.style.display = "flex"; chatInput.focus(); }
    function closeChatbot() { chatBox.style.display = "none"; }
    chatBtn.onclick = function() { if (chatBox.style.display === "flex") closeChatbot(); else openChatbot(); };
    closeBtn.onclick = closeChatbot;

    function appendMessage(sender, content, isHTML) {
        var message = document.createElement("div"); message.className = "pawpaw-msg pawpaw-msg-" + sender;
        if (isHTML) message.innerHTML = content; else message.textContent = content;
        msgContainer.appendChild(message); msgContainer.scrollTop = msgContainer.scrollHeight;
        return message;
    }

    function escapeHTML(text) { return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"); }
    function formatBotMessage(text) { return escapeHTML(text).replace(/\*\*(.*?)\*\*/g, "<b>$1</b>").replace(/\*(.*?)\*/g, "<i>$1</i>").replace(/(?:^|\n)\s*[-•]\s+/g, "<br>• ").replace(/\n/g, "<br>"); }

    function getBookingUrl() {
        var path = window.location.pathname;
        if (path.indexOf("/pages/customer/") !== -1) return "booking.html";
        if (path.indexOf("/pages/admin/") !== -1) return "../customer/booking.html";
        return "pages/customer/booking.html";
    }

    function getQuickLocalReply(text) {
        var value = text.trim();
        if (value === "2") return 'Dạ bạn có thể chuyển sang trang <b>Đặt lịch</b> để chọn dịch vụ cho bé nhé!<br><a href="' + getBookingUrl() + '" class="pawpaw-link-btn">👉 Đi đến trang Đặt lịch</a>';
        if (value === "3") return '🐾 <b>Thông tin PawPaw PetCare:</b><br>• <b>Địa chỉ:</b> 123 Đường PetCare, Phường Bến Nghé, Quận 1, TP. HCM<br>• <b>Giờ hoạt động:</b> 08:30 - 17:30 hằng ngày<br>• <b>Hotline:</b> 1900 6868 - 0909 123 456';
        if (value === "4") return '🐾 <b>PawPaw sẵn sàng tư vấn!</b><br>Bạn hãy nhập câu hỏi về chăm sóc, dinh dưỡng, tắm hoặc thói quen của bé nhé!';
        return null;
    }

    function callGemini(userText, callback) {
        var localReply = getQuickLocalReply(userText);
        if (localReply) { callback({ html: localReply, isHTML: true }); return; }

        if (typeof AI_CONFIG === "undefined" || !AI_CONFIG.API_KEY || AI_CONFIG.API_KEY.indexOf("THAY_THE") !== -1) {
            callback({ text: "Chatbot chưa được cấu hình API Key trong js/config.js." }); return;
        }

        searchServices(userText, function(result) {
            var isServiceQuestion = userText.trim() === "1" || /dịch vụ|giá|bảng giá|bao nhiêu|chi phí|spa|tắm|cắt tỉa|cắt lông|thời gian/i.test(userText);
            if (!result.available && isServiceQuestion) { callback({ text: "PawPaw hiện chưa đọc được dữ liệu dịch vụ. Bạn vui lòng thử lại sau nhé." }); return; }
            if (result.available && isServiceQuestion && userText.trim() !== "1" && result.services.length === 0) { callback({ text: "PawPaw chưa tìm thấy dịch vụ phù hợp trong danh sách hiện có. Bạn thử nhập tên dịch vụ cụ thể nhé!" }); return; }

            var arrFormatted = []; for(var i=0; i<result.services.length; i++) arrFormatted.push(formatServiceForAI(result.services[i]));
            var serviceContext = result.services.length > 0 ? JSON.stringify(arrFormatted, null, 2) : "Không có dữ liệu dịch vụ liên quan được truy xuất.";

            var systemPrompt = (AI_CONFIG.SYSTEM_PROMPT || "Bạn là trợ lý tư vấn của PawPaw PetCare.") + "\n\nQUY TẮC TRẢ LỜI:\n- Trả lời bằng tiếng Việt, thân thiện và dễ hiểu.\n- Dữ liệu dịch vụ bên dưới được truy xuất từ website PawPaw.\n- Khi trả lời về tên dịch vụ, giá và thời gian, ưu tiên dữ liệu được cung cấp.\n- Không tự bịa giá, tên dịch vụ hoặc thời gian.\n- Nếu một mức giá ghi \"Chưa có thông tin\", hãy nói rõ chưa có dữ liệu.\n- Giá phụ thuộc cân nặng phải được giải thích đúng theo từng mức cân nặng.\n- Nếu dữ liệu truy xuất không có dịch vụ phù hợp, không được khẳng định dịch vụ đó có tồn tại.\n- Chỉ sử dụng dữ liệu dịch vụ trong phần ngữ cảnh làm căn cứ cho thông tin cụ thể về dịch vụ.\n\nDỮ LIỆU DỊCH VỤ ĐƯỢC TRUY XUẤT:\n" + serviceContext;

            var model = AI_CONFIG.MODEL || "gemini-2.5-flash";
            var baseUrl = AI_CONFIG.API_URL || "https://generativelanguage.googleapis.com/v1beta/models";
            var endpoint = baseUrl + "/" + model + ":generateContent?key=" + encodeURIComponent(AI_CONFIG.API_KEY);
            var promptQuery = userText;
            if (userText.trim() === "1") promptQuery = "Hãy liệt kê bảng giá các dịch vụ PawPaw trong dữ liệu được cung cấp. Trình bày tên dịch vụ, giá theo cân nặng và thời gian dự kiến. Không tự thêm giá không có trong dữ liệu.";

            var xhr = new XMLHttpRequest();
            xhr.open("POST", endpoint, true); xhr.setRequestHeader("Content-Type", "application/json");
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        try {
                            var data = JSON.parse(xhr.responseText); var reply = "";
                            if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
                                var parts = data.candidates[0].content.parts; for(var p=0; p<parts.length; p++) if(parts[p].text) reply += parts[p].text + "\n";
                            }
                            if (!reply) { callback({ text: "PawPaw chưa tạo được câu trả lời. Bạn thử lại nhé!" }); return; }
                            var lowerText = normalizeText(userText); var formatted = formatBotMessage(reply);
                            if (lowerText.indexOf("dat lich") !== -1 || lowerText.indexOf("book") !== -1 || lowerText.indexOf("hen") !== -1) {
                                callback({ html: formatted + '<br><a href="' + getBookingUrl() + '" class="pawpaw-link-btn">👉 Đi đến trang Đặt lịch</a>', isHTML: true });
                            } else { callback({ html: formatted, isHTML: true }); }
                        } catch(e) { callback({ text: "Chatbot gặp lỗi xử lý dữ liệu. Bạn thử lại sau nhé!" }); }
                    } else { callback({ text: "Chatbot gặp lỗi API (" + xhr.status + "). Bạn thử lại sau nhé!" }); }
                }
            };
            xhr.send(JSON.stringify({ systemInstruction: { parts: [{ text: systemPrompt }] }, contents: [{ role: "user", parts: [{ text: promptQuery }] }] }));
        });
    }

    function handleUserSendMessage(text) {
        var userText = text.trim(); if (!userText || isSending) return;
        isSending = true; appendMessage("user", userText);
        var loadingMessage = appendMessage("bot", "PawPaw đang tìm câu trả lời cho sen...");
        chatInput.disabled = true; sendBtn.disabled = true;

        callGemini(userText, function(result) {
            if (result.isHTML) loadingMessage.innerHTML = result.html; else loadingMessage.textContent = result.text;
            isSending = false; chatInput.disabled = false; sendBtn.disabled = false; chatInput.focus();
            msgContainer.scrollTop = msgContainer.scrollHeight;
        });
    }

    msgContainer.onclick = function (event) {
        var button = event.target;
        while (button && button !== msgContainer && button.className.indexOf("pawpaw-tag-btn") === -1) button = button.parentElement;
        if (!button || button === msgContainer) return;
        var choice = button.getAttribute("data-choice");
        if (choice) handleUserSendMessage(choice);
    };

    chatForm.onsubmit = function (event) {
        event.preventDefault();
        var text = chatInput.value.trim(); if (!text || isSending) return;
        chatInput.value = ""; handleUserSendMessage(text);
    };
})();
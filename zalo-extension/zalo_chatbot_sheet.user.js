// ==UserScript==
// @name         Zalo Personal Chatbot TKB - Tra Cứu TKB Qua Google Sheets
// @namespace    https://mrkhang-khoi.github.io/tkb/
// @version      1.0.0
// @description  Tự động trả lời tin nhắn tra cứu TKB trên Zalo cá nhân (Zalo Web) từ Google Sheets
// @author       Hệ Thống Xếp Thời Khóa Biểu FET
// @match        https://chat.zalo.me/*
// @grant        GM_xmlhttpRequest
// @connect      script.google.com
// @connect      script.googleusercontent.com
// ==/UserScript==

(function() {
    'use strict';

    // 🌟 CẤU HÌNH ĐƯỜNG LINK GOOGLE APPS SCRIPT CỦA BẠN:
    const GOOGLE_SCRIPT_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbxVmGzjDVBLFilgPthtok2J5QOxifOEoUyLkIbGSCXY1jm9xm41oU4kvWBypdeVPpNF/exec";

    // Bộ nhớ đệm tin nhắn đã xử lý để tránh gửi lặp
    const processedMessages = new Set();

    console.log("%c🤖 [Zalo Bot TKB] Đang chạy trên Zalo Web cá nhân...", "color: #3b82f6; font-size: 14px; font-weight: bold;");

    /**
     * Lắng nghe tin nhắn mới trên giao diện Zalo Web
     */
    function observeZaloMessages() {
        const observer = new MutationObserver((mutations) => {
            const msgElements = document.querySelectorAll('.chat-item, .msg-item, [data-id]');
            
            msgElements.forEach((el) => {
                const textContent = el.innerText || el.textContent || '';
                const msgId = el.getAttribute('data-id') || (textContent.slice(0, 30) + el.getBoundingClientRect().top);

                if (!textContent || processedMessages.has(msgId)) return;

                // Kiểm tra xem tin nhắn có phải từ người khác gửi đến không (không phải do chính bot gửi đi)
                const isMyMessage = el.classList.contains('me') || el.classList.contains('my-msg') || el.querySelector('.me');
                if (isMyMessage) {
                    processedMessages.add(msgId);
                    return;
                }

                const cleanText = textContent.toLowerCase().trim();

                // Kiểm tra từ khóa tra cứu TKB
                if (cleanText.includes('tkb') || cleanText.includes('thoi khoa bieu') || cleanText.includes('lich day') || cleanText.includes('lich hoc')) {
                    processedMessages.add(msgId);
                    
                    // Trích xuất đoạn lệnh TKB
                    let queryText = textContent.trim();
                    console.log(`📩 [Phát hiện yêu cầu TKB từ Zalo]: "${queryText}"`);

                    fetchTkbFromGoogleSheet(queryText, (reply) => {
                        if (reply) {
                            sendZaloReply(reply);
                        }
                    });
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    /**
     * Gọi Google Apps Script để lấy TKB từ Google Sheets
     */
    function fetchTkbFromGoogleSheet(query, callback) {
        const targetUrl = `${GOOGLE_SCRIPT_WEBAPP_URL}?query=${encodeURIComponent(query)}`;
        
        if (typeof GM_xmlhttpRequest !== 'undefined') {
            GM_xmlhttpRequest({
                method: "GET",
                url: targetUrl,
                onload: function(response) {
                    callback(response.responseText);
                },
                onerror: function(err) {
                    console.error("Lỗi gọi Google Apps Script:", err);
                }
            });
        } else {
            fetch(targetUrl)
                .then(r => r.text())
                .then(text => callback(text))
                .catch(err => console.error("Lỗi fetch:", err));
        }
    }

    /**
     * Tự động điền câu trả lời vào ô chat Zalo và bấm Gửi
     */
    function sendZaloReply(text) {
        const chatInput = document.querySelector('#richInput, div[contenteditable="true"], .input-chat-content');
        if (!chatInput) {
            console.warn("Không tìm thấy ô nhập tin nhắn Zalo.");
            return;
        }

        // Focus vào ô nhập
        chatInput.focus();
        
        // Điền nội dung
        document.execCommand('insertText', false, text);

        // Gửi tin nhắn sau 500ms
        setTimeout(() => {
            const enterEvent = new KeyboardEvent('keydown', {
                bubbles: true,
                cancelable: true,
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                which: 13
            });
            chatInput.dispatchEvent(enterEvent);

            // Bấm nút gửi nếu có
            const sendBtn = document.querySelector('.btn-send, [data-translate-title="STR_SEND_MSG"]');
            if (sendBtn) sendBtn.click();

            console.log("📤 [Đã trả lời tin nhắn TKB trên Zalo cá nhân thành công!]");
        }, 500);
    }

    // Khởi chạy khi trang Zalo Web tải xong
    setTimeout(observeZaloMessages, 3000);
})();

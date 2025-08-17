(function ($) {
    "use strict";
    const chatbotButton = document.getElementById("chatbot-button");
    const chatbotWindow = document.getElementById("chatbot-window");
    const chatbotMessages = document.getElementById("chatbot-messages");
    const chatbotInput = document.getElementById("chatbot-input");
    const chatbotSend = document.getElementById("chatbot-send");

    chatbotButton.addEventListener("click", () => {
        const isHidden = chatbotWindow.style.display === "none";

        chatbotWindow.style.display = isHidden ? "block" : "none";
        chatbotButton.innerHTML = isHidden
            ? '<i class="far fa-envelope-open"></i>'
            : '<i class="far fa-envelope"></i>';
    });

    const staticReplies = {
        "harga website": `
        💻 Harga website bervariasi tergantung jenis dan fitur:<br><br>
        <strong>🔹 Website Standar</strong>
        <ul>
            <li>- Company Profile: mulai <strong>2 – 4 juta</strong></li>
            <li>- Website Toko Online (E-Commerce): mulai <strong>5 – 10 juta</strong></li>
        </ul>
        <strong>🔹 Website Custom</strong>
        <ul>
            <li>- Web Portal / Sistem Aplikasi Khusus: mulai <strong>10 juta ke atas</strong></li>
            <li>- Fitur tambahan sesuai kebutuhan (request based)</li>
        </ul>
        <p>Semua sudah termasuk desain responsif & basic SEO.</p>
    `,
        "layanan": `
        📌 Layanan kami meliputi:
        <ul>
            <li>- Web Development</li>
            <li>- Mobile Development</li>
            <li>- Digital Marketing</li>
            <li>- Social Media Marketing</li>
            <li>- Data Analyst</li>
            <li>- Design Graphic</li>
            <li>- UI/UX Design</li>
            <li>- Branding</li>
            <li>Silahkan Hubungi admin kami jika ingin berkolaborasi.</li>
            <li><a href="https://wa.me/6282366667326" target="_blank"> <i class="far fa-phone"></i> +62 823 6666 7326</a>.</li>
        </ul>
    `,
        "proses pengerjaan": `
        ⚙️ Proses pengerjaan project kami:
        <ul>
            <li>- Konsultasi awal (diskusi kebutuhan & tujuan)</li>
            <li>- Brainstorming ide & perencanaan konsep</li>
            <li>- Pembuatan kontrak kerja & kesepakatan</li>
            <li>- Desain (UI/UX & mockup)</li>
            <li>- Development (coding & implementasi)</li>
            <li>- Testing (uji coba & revisi)</li>
            <li>- Launching & serah terima</li>
        </ul>
    `,
        "default": `
        Terima kasih! <br> Untuk info lebih lanjut, silakan hubungi kami langsung di admin kami disini: <br>
        <a href="https://wa.me/6282366667326" target="_blank"><i class="far fa-phone"></i>+62 823 6666 7326</a>.
    `
    };

    function addMessage(text, sender) {
        if (sender === "ai") {
            const typingDiv = document.createElement("div");
            typingDiv.className = "ai typing";
            typingDiv.innerHTML = `
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
        `;
            chatbotMessages.appendChild(typingDiv);
            chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
            setTimeout(() => {
                typingDiv.remove();
                typeWriterEffect(text);
            }, 1200); // delay sebelum muncul teks asli
        } else {
            // User langsung tampil
            const div = document.createElement("div");
            div.className = sender;
            div.innerHTML = text;
            chatbotMessages.appendChild(div);
            chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
        }
    }

    function typeWriterEffect(text) {
        const div = document.createElement("div");
        div.className = "ai";
        chatbotMessages.appendChild(div);

        let i = 0;
        const interval = setInterval(() => {
            div.innerHTML = text.substring(0, i) + "▌";
            i++;
            if (i > text.length) {
                clearInterval(interval);
                div.innerHTML = text;
            }
            chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
        }, 30);
    }

    function setLoading(state) {
        if (state) {
            chatbotSend.disabled = true;
            chatbotSend.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        } else {
            chatbotSend.disabled = false;
            chatbotSend.innerHTML = '<i class="far fa-paper-plane"></i>';
        }
    }

    let isProcessing = false;
    function sendMessage(message) {
        if (isProcessing) return;
        isProcessing = true;
        setLoading(true);

        addMessage(message, "user");

        let reply = "default";
        for (const key in staticReplies) {
            if (message.toLowerCase().includes(key)) {
                reply = key;
                break;
            }
        }

        setTimeout(() => {
            addMessage(staticReplies[reply], "ai");
            isProcessing = false;
            setLoading(false);
        }, 1000);
    }

    chatbotSend.addEventListener("click", () => {
        const message = chatbotInput.value.trim();
        if (message) {
            chatbotSend.disabled = true;
            sendMessage(message);
            chatbotInput.value = "";
            setTimeout(() => chatbotSend.disabled = false, 1200);
        }
    });

    chatbotInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") chatbotSend.click();
    });

    document.querySelectorAll("#chatbot-suggestions .chip").forEach((chip) => {
        chip.addEventListener("click", () => {
            sendMessage(chip.dataset.q);
        });
    });
})(jQuery);
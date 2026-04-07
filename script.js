// КОНФІГУРАЦІЯ FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyBU7yr7SRj8JEvDHmY4w7SSXIX8zjgocCg",
    authDomain: "goratattokrop.firebaseapp.com",
    databaseURL: "https://goratattokrop-default-rtdb.firebaseio.com",
    projectId: "goratattokrop",
    storageBucket: "goratattokrop.firebasestorage.app",
    messagingSenderId: "921888337663",
    appId: "1:921888337663:web:06a6fa71a114c35a4326ca",
    measurementId: "G-F4F8ENB5D7"
};

// Ініціалізація Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

const totalPhotos = 20; 
let fp; // Екземпляр календаря

// Налаштування Telegram
const TELEGRAM_BOT_TOKEN = '8758214194:AAFI7drpn1wGVEpEaB9XrNyBoZHg1M7GApE'; 
const TELEGRAM_CHAT_ID = '7443699603'; 

// --- ГАЛЕРЕЯ ---
function loadPhotos() {
    const grid = document.getElementById('photo-grid');
    if (!grid) return;
    grid.innerHTML = ''; 
    for (let i = 1; i <= totalPhotos; i++) {
        const item = document.createElement('div');
        item.className = 'reveal-item';
        const img = document.createElement('img');
        img.src = `img/${i}.jpg`; 
        img.alt = `Tattoo work ${i}`;
        img.loading = "lazy";
        img.onerror = function() { item.remove(); };
        img.onclick = function() {
            const modal = document.getElementById('image-modal');
            const modalImg = document.getElementById('full-image');
            if (modal && modalImg) {
                modal.style.display = "flex";
                modalImg.src = this.src;
            }
        };
        item.appendChild(img);
        grid.appendChild(item);
    }
}

// --- НАВІГАЦІЯ ---
window.showTab = function(tabId) {
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => {
        tab.classList.remove('active');
        if (tab.id === 'admin-panel') tab.style.display = 'none';
    });
    
    const activeTab = document.getElementById(tabId);
    if (activeTab) {
        activeTab.classList.add('active');
        if (tabId === 'admin-panel') activeTab.style.display = 'block';
    }

    if (tabId === 'booking') renderCalendar();
    if (tabId === 'admin-panel') loadAdminData();
    
    window.scrollTo(0, 0);
    setTimeout(checkReveal, 100);
}

// --- КАЛЕНДАР ---
function formatDateLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function renderCalendar() {
    database.ref('bookings').once('value').then((snapshot) => {
        const allData = snapshot.val() || {};
        
        // Масив для дат-вихідних
        const dayOffDates = Object.keys(allData).filter(date => {
            return allData[date].clientName && allData[date].clientName.includes("ВИХІДНИЙ");
        });

        // Масив для підтверджених записів (зайнято)
        const confirmedDates = Object.keys(allData).filter(date => {
            return allData[date].status === "confirmed" && !dayOffDates.includes(date);
        });

        const allBookedDates = Object.keys(allData);

        if (fp) fp.destroy();

        fp = flatpickr("#book-date", {
            minDate: "today",
            static: true, 
            appendTo: document.getElementById('book-date-container'), 
            dateFormat: "Y-m-d",
            "locale": "uk",
            disable: [...dayOffDates, ...confirmedDates], // Блокуємо і ті, і ті
            onDayCreate: function(dObj, dStr, fp, dayElem) {
                if (dayElem.dateObj) {
                    const dateStr = formatDateLocal(dayElem.dateObj);
                    
                    if (dayOffDates.includes(dateStr)) {
                        // Додаємо клас для вихідних
                        dayElem.classList.add("day-off-style");
                    } else if (confirmedDates.includes(dateStr)) {
                        // Додаємо клас для зайнятих днів
                        dayElem.classList.add("booked-day-red");
                    } else if (allBookedDates.includes(dateStr)) {
                        // Пунктир для заявок, що очікують (pending)
                        dayElem.style.borderBottom = "2px dashed var(--neon-pink)";
                    }
                }
            }
        });
    });
}

// --- ОБРОБКА ФОРМИ ЗАПИСУ ---
document.addEventListener('change', function(e) {
    if (e.target && e.target.id === 'book-file') {
        const fileName = e.target.files[0] ? e.target.files[0].name : "ОБРАТИ ФОТО";
        document.getElementById('file-label').innerText = fileName;
    }
});

document.addEventListener('click', function(e) {
    if (e.target && e.target.id === 'submit-booking') {
        const date = document.getElementById('book-date').value;
        const name = document.getElementById('book-name').value;
        const idea = document.getElementById('book-idea').value.trim();
        const contact = document.getElementById('book-contact').value.trim();
        const fileInput = document.getElementById('book-file');
        const status = document.getElementById('booking-status');

        // Валідація
        if (!date || !name || !contact || !idea) {
            alert("Заповніть всі поля 🖤");
            return;
        }

        const instaRegex = /^@[a-zA-Z0-9._]{2,30}$/;
        const phoneRegex = /^(\+38)?0\d{9}$/;

        if (!instaRegex.test(contact) && !phoneRegex.test(contact)) {
            alert("Введіть Instagram (з @) або номер телефону 🖤");
            return;
        }

        status.style.display = "block";
        status.innerText = "Відправка... зачекайте 🖤";

        // Перевірка на зайнятість (подвійна)
        database.ref('bookings/' + date).once('value').then((snapshot) => {
            if (snapshot.exists() && (snapshot.val().status === 'confirmed' || snapshot.val().clientName.includes('ВИХІДНИЙ'))) {
                alert("Ця дата вже остаточно зайнята 🖤");
                renderCalendar();
                return;
            }

            // Запис в базу
            database.ref('bookings/' + date).set({
                clientName: name,
                clientContact: contact,
                idea: idea,
                status: "pending",
                timestamp: Date.now()
            }).then(() => {
                const message = `🔔 НОВА ЗАЯВКА\n📅 Дата: ${date}\n👤 Клієнт: ${name}\n📝 Ідея: ${idea}\n📱 Контакт: ${contact}`;
                
                if (fileInput.files && fileInput.files[0]) {
                    const formData = new FormData();
                    formData.append('chat_id', TELEGRAM_CHAT_ID);
                    formData.append('photo', fileInput.files[0]);
                    formData.append('caption', message);
                    fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, { method: 'POST', body: formData }).then(finalize);
                } else {
                    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage?chat_id=${TELEGRAM_CHAT_ID}&text=${encodeURIComponent(message)}`;
                    fetch(url).then(finalize);
                }
            });
        });

        function finalize() {
            status.innerHTML = "Успішно! Я напишу вам 🖤";
            document.getElementById('booking-form-container').style.opacity = "0.3";
            document.getElementById('booking-form-container').style.pointerEvents = "none";
            renderCalendar();
        }
    }
});

// --- АДМІН-ПАНЕЛЬ ---
window.adminAuth = function() {
    const pass = prompt("Пароль:");
    if (pass === "020307") {
        showTab('admin-panel');
    } else {
        alert("Відмовлено.");
    }
};

// Оновлена функція завантаження з кнопками ПІДТВЕРДИТИ/ВІДХИЛИТИ
function loadAdminData() {
    const listCont = document.getElementById('admin-bookings-list');
    database.ref('bookings').on('value', (snapshot) => {
        const data = snapshot.val();
        listCont.innerHTML = "";
        if (!data) return listCont.innerHTML = "<p style='text-align:center;'>Записів немає</p>";

        const sortedDates = Object.keys(data).sort().reverse();

        sortedDates.forEach(date => {
            const booking = data[date];
            const status = booking.status || "pending";
            const isConfirmed = status === "confirmed";
            const isRejected = status === "rejected";
            const isDayOff = booking.clientName && booking.clientName.includes("ВИХІДНИЙ");

            const item = document.createElement('div');
            // Колір фону залежно від статусу
            let bgColor = "rgba(255, 204, 0, 0.05)"; // Очікує (жовтий)
            if (isConfirmed) bgColor = "rgba(0, 255, 0, 0.05)"; // Підтверджено (зелений)
            if (isRejected) bgColor = "rgba(255, 0, 0, 0.05)"; // Відхилено (червоний)

            item.style.cssText = `padding: 15px; border-bottom: 1px solid #222; margin-bottom: 10px; background: ${bgColor};`;
            
            item.innerHTML = `
                <div style="margin-bottom: 10px;">
                    <strong style="color: ${isConfirmed ? '#28a745' : (isRejected ? '#ff4444' : '#ffcc00')}">
                        ${date} [${status.toUpperCase()}]
                    </strong><br>
                    <small>${booking.clientName} (${booking.clientContact})</small>
                    <p style="font-size: 0.8rem; color: #aaa; margin: 5px 0;">${booking.idea || ''}</p>
                </div>
                <div style="display: flex; gap: 10px;">
                    ${(!isConfirmed && !isDayOff) ? `<button onclick="confirmBooking('${date}')" style="background: #28a745; color: white; border: none; padding: 8px 12px; cursor: pointer; font-weight: bold;">ПІДТВЕРДИТИ</button>` : ''}
                    ${(!isRejected && !isDayOff) ? `<button onclick="rejectBooking('${date}')" style="background: none; border: 1px solid #ff4444; color: #ff4444; padding: 8px 12px; cursor: pointer;">ВІДХИЛИТИ</button>` : ''}
                    <button onclick="deleteBooking('${date}')" style="background: none; border: 1px solid #444; color: #888; padding: 8px 12px; cursor: pointer;"><i class="fas fa-trash"></i></button>
                </div>
            `;
            listCont.appendChild(item);
        });
    });
}

// Підтвердження (статус confirmed блокує дату в календарі)
window.confirmBooking = function(date) {
    if(confirm(`Підтвердити запис на ${date}?`)) {
        database.ref('bookings/' + date).update({ 
            status: "confirmed" 
        }).then(() => {
            renderCalendar(); // Оновлюємо календар відразу
        });
    }
};

// Відхилення (статус rejected звільняє дату в календарі)
window.rejectBooking = function(date) {
    if(confirm(`Відхилити заявку на ${date}? Дата стане доступною для інших.`)) {
        database.ref('bookings/' + date).update({ 
            status: "rejected" 
        }).then(() => {
            renderCalendar();
        });
    }
};

// Видалення
window.deleteBooking = function(date) {
    if (confirm(`Видалити запис ${date} з бази назавжди?`)) {
        database.ref('bookings/' + date).remove().then(() => {
            renderCalendar();
        });
    }
};

window.setDayOff = function() {
    const date = document.getElementById('admin-day-off').value;
    if (!date) return alert("Оберіть дату");
    database.ref('bookings/' + date).set({
        clientName: "⛔ ВИХІДНИЙ",
        clientContact: "system",
        status: "confirmed",
        timestamp: Date.now()
    }).then(() => renderCalendar());
};

// --- СТАРТ ТА АНІМАЦІЇ ---
function checkReveal() {
    document.querySelectorAll('.reveal-item').forEach(item => {
        const rect = item.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.9) item.classList.add('visible');
    });
}

document.addEventListener('DOMContentLoaded', () => {
    loadPhotos();
    if (window.location.hash === '#admin') adminAuth();
    window.addEventListener('hashchange', () => { if (window.location.hash === '#admin') adminAuth(); });
    const modal = document.getElementById('image-modal');
    if (modal) modal.onclick = () => modal.style.display = "none";
});

window.addEventListener('scroll', checkReveal);
// Знаходимо елементи модалки
const modal = document.getElementById('image-modal');
const modalImg = document.getElementById('full-image');
const closeBtn = document.querySelector('.close-modal');

// Закриття при кліку на хрестик
if (closeBtn) {
    closeBtn.onclick = function() { 
        modal.style.display = "none";
    }
}

// Закриття при кліку на будь-яку область фону
if (modal) {
    modal.onclick = function(event) {
        if (event.target !== modalImg) {
            modal.style.display = "none";
        }
    }
}

// Додамо закриття клавішею Esc для зручності
document.addEventListener('keydown', (e) => {
    if (e.key === "Escape" && modal) {
        modal.style.display = "none";
    }
});
// Функція для відкриття постерів у модальному вікні
window.openFullPoster = function(imageSrc) {
    const modal = document.getElementById('image-modal');
    const modalImg = document.getElementById('full-image');
    
    if (modal && modalImg) {
        modal.style.display = "flex";
        modalImg.src = imageSrc;
        // Переконуємося, що модалка має правильний стиль для великих фото
        modalImg.style.border = "2px solid var(--neon-pink)";
        modalImg.style.boxShadow = "0 0 30px rgba(255, 0, 255, 0.3)";
    }
};

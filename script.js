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

// Завантаження галереї
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

// Функція для форматування дати БЕЗ зсуву часових поясів
function formatDateLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Перемикання табів та Календар
function showTab(tabId) {
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => tab.classList.remove('active'));
    
    const activeTab = document.getElementById(tabId);
    if (activeTab) activeTab.classList.add('active');

    if (tabId === 'booking') {
        renderCalendar();
    }
    window.scrollTo(0, 0);
    setTimeout(checkReveal, 100);
}

// Окрема функція для малювання календаря
function renderCalendar() {
    database.ref('bookings').once('value').then((snapshot) => {
        const bookedDates = snapshot.val() ? Object.keys(snapshot.val()) : [];
        
        if (fp) fp.destroy();

        fp = flatpickr("#book-date", {
            minDate: "2026-04-03",
            inline: false, 
            static: true,
            dateFormat: "Y-m-d",
            "locale": { firstDayOfWeek: 1 },
            disable: bookedDates, 
            onDayCreate: function(dObj, dStr, fp, dayElem) {
                // Використовуємо локальне форматування для правильної підсвітки
                if (dayElem.dateObj) {
                    const dateStr = formatDateLocal(dayElem.dateObj);
                    if (bookedDates.includes(dateStr)) {
                        dayElem.classList.add("booked-day");
                    }
                }
            }
        });
    });
}

// Анімація появи
function checkReveal() {
    const items = document.querySelectorAll('.reveal-item');
    items.forEach(item => {
        const rect = item.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.9) {
            item.classList.add('visible');
        }
    });
}

// ЛОГІКА БРОНЮВАННЯ
document.addEventListener('click', function(e) {
    if (e.target && e.target.id === 'submit-booking') {
        const date = document.getElementById('book-date').value;
        const name = document.getElementById('book-name').value;
        const contact = document.getElementById('book-contact').value.trim();
        const status = document.getElementById('booking-status');

        if (!date || !name || !contact) {
            alert("Будь ласка, заповніть всі поля 🖤");
            return;
        }

        const instaRegex = /^@[a-zA-Z0-9._]{2,30}$/;
        const phoneRegex = /^(\+38)?0\d{9}$/;

        if (!instaRegex.test(contact) && !phoneRegex.test(contact)) {
            alert("Введіть Instagram (з @) або укр. номер телефону 🖤");
            return;
        }

        database.ref('bookings/' + date).once('value').then((snapshot) => {
            if (snapshot.exists()) {
                alert("Цей день вже зайнятий, оберіть інший 🖤");
                renderCalendar();
            } else {
                database.ref('bookings/' + date).set({
                    clientName: name,
                    clientContact: contact,
                    timestamp: Date.now()
                }).then(() => {
                    status.style.display = "block";
                    status.innerText = "Успішно! Чекаю на вас 🖤";
                    document.getElementById('booking-form-container').style.opacity = "0.3";
                    document.getElementById('booking-form-container').style.pointerEvents = "none";
                    renderCalendar(); // Оновлюємо календар відразу
                });
            }
        });
    }
});

// Адмін-панель
window.adminLogin = function() {
    const pass = prompt("Пароль:");
    if (pass === "0000") {
        database.ref('bookings').on('value', (snapshot) => {
            const data = snapshot.val();
            if (!data) return alert("Записів немає");
            let list = "ЗАПИСИ:\n";
            for (let d in data) list += `${d}: ${data[d].clientName} (${data[d].clientContact})\n`;
            alert(list);
        });
    }
};

// Старт
document.addEventListener('DOMContentLoaded', () => {
    loadPhotos();
    checkReveal();
    const modal = document.getElementById('image-modal');
    if (modal) modal.onclick = () => modal.style.display = "none";
});

window.addEventListener('scroll', checkReveal);
// Функція перевірки хешу в посиланні (наприклад, site.com/#admin)
function checkAdminHash() {
    if (window.location.hash === '#admin') {
        adminAuth();
    }
}

// Авторизація
window.adminAuth = function() {
    const pass = prompt("Вхід в систему керування. Пароль:");
    if (pass === "0000") {
        // Ховаємо всі таби і показуємо адмінку
        const tabs = document.querySelectorAll('.tab-content');
        tabs.forEach(tab => tab.classList.remove('active'));
        
        const adminTab = document.getElementById('admin-panel');
        adminTab.style.display = 'block';
        adminTab.classList.add('active');
        
        loadAdminData(); // Завантажуємо дані
    } else {
        alert("Доступ обмежено.");
        window.location.hash = ''; // Очищуємо хеш
    }
};

// Завантаження даних для адміна
function loadAdminData() {
    const listCont = document.getElementById('admin-bookings-list');
    database.ref('bookings').on('value', (snapshot) => {
        const data = snapshot.val();
        listCont.innerHTML = "";
        if (!data) {
            listCont.innerHTML = "<p>Записів поки немає</p>";
            return;
        }
        for (let date in data) {
            const item = document.createElement('div');
            item.style.cssText = "padding: 15px; border-bottom: 1px solid #222; display: flex; justify-content: space-between; align-items: center;";
            
            // Перевіряємо чи це клієнт чи вихідний
            const isDayOff = data[date].clientName.includes("ВИХІДНИЙ");
            
            item.innerHTML = `
                <div>
                    <span style="color: ${isDayOff ? 'var(--neon-red)' : 'var(--neon-pink)'}; font-weight: bold;">${date}</span><br>
                    <small>${data[date].clientName} ${isDayOff ? '' : '| ' + data[date].clientContact}</small>
                </div>
                <button onclick="deleteBooking('${date}')" style="background: none; border: 1px solid #444; color: #888; padding: 5px 10px; cursor: pointer; font-size: 0.7rem;">ВИДАЛИТИ</button>
            `;
            listCont.appendChild(item);
        }
    });
}

// Встановити вихідний
window.setDayOff = function() {
    const date = document.getElementById('admin-day-off').value;
    if (!date) return alert("Оберіть дату");
    database.ref('bookings/' + date).set({
        clientName: "⛔ ВИХІДНИЙ (Блок)",
        clientContact: "system",
        timestamp: Date.now()
    }).then(() => alert("День заблоковано 🖤"));
};

// Видалити запис
window.deleteBooking = function(date) {
    if (confirm(`Звільнити дату ${date}?`)) {
        database.ref('bookings/' + date).remove().then(() => renderCalendar());
    }
};

// Додай перевірку хешу при завантаженні сторінки
document.addEventListener('DOMContentLoaded', () => {
    checkAdminHash();
    // Також слідкуємо за зміною хешу без перезавантаження
    window.addEventListener('hashchange', checkAdminHash);
});

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

        // Якщо фото не знайдено - видаляємо пустий блок
        img.onerror = function() { 
            item.remove(); 
        };

        // Функція збільшення при кліку
        item.onclick = function() {
            const modal = document.getElementById('image-modal');
            const modalImg = document.getElementById('full-image');
            if (modal && modalImg) {
                modal.style.display = "flex"; // Показуємо модалку
                modalImg.src = img.src;      // Передаємо шлях до великого фото
                document.body.style.overflow = "hidden"; // Блокуємо прокрутку сайту
            }
        };

        item.appendChild(img);
        grid.appendChild(item);
    }
}

// --- УНІВЕРСАЛЬНА МОДАЛКА ДЛЯ ІНФО-ПОСТЕРІВ ---
function initUniversalModal() {
    // Шукаємо всі картинки в секції інформації
    const infoImages = document.querySelectorAll('#aftercare img');
    
    infoImages.forEach(img => {
        // Щоб не додавати обробник двічі, перевіряємо, чи він уже є
        if (!img.dataset.modalInit) {
            img.onclick = function() {
                const modal = document.getElementById('image-modal');
                const modalImg = document.getElementById('full-image');
                if (modal && modalImg) {
                    modal.style.display = "flex"; // Показуємо модалку
                    modalImg.src = this.src;      // Передаємо шлях до великого фото
                    document.body.style.overflow = "hidden"; // Блокуємо прокрутку сайту
                }
            };
            img.dataset.modalInit = "true"; // Позначаємо, що обробник додано
        }
    });
}

// --- НАВІГАЦІЯ ---
// --- НАВІГАЦІЯ (Оновлена) ---
window.showTab = function(tabId) {
    // Ховаємо ВСІ вкладки
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => {
        tab.classList.remove('active');
        tab.style.display = 'none'; // Додаткова перестраховка
    });
    
    // Показуємо потрібну
    const activeTab = document.getElementById(tabId);
    if (activeTab) {
        activeTab.classList.add('active');
        activeTab.style.display = 'block';
    }

    // Специфічна логіка для вкладок
    if (tabId === 'aftercare') initUniversalModal();
    if (tabId === 'booking') renderCalendar();
    
    window.scrollTo(0, 0);
};

// --- КАЛЕНДАР ---
function formatDateLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function renderCalendar() {
    const dateInput = document.querySelector("#book-date");
    const container = document.querySelector("#book-date-container");

    if (!dateInput || !container) return;

    // Спробуємо отримати дані з Firebase
    database.ref('bookings').once('value').then((snapshot) => {
        const allData = snapshot.val() || {};
        
        const lockedDates = Object.keys(allData).filter(date => {
            return allData[date].status === "confirmed" || 
                   (allData[date].clientName && allData[date].clientName.includes("ВИХІДНИЙ"));
        });

        // Знищуємо старий календар перед створенням нового
        if (window.fp && typeof window.fp.destroy === "function") {
            window.fp.destroy();
        }

        // Ініціалізація з перевіркою мови
        window.fp = flatpickr(dateInput, {
            minDate: "today",
            static: true, 
            appendTo: container, 
            dateFormat: "Y-m-d",
            "locale": "uk", 
            disable: lockedDates,
            onDayCreate: function(dObj, dStr, fp, dayElem) {
                if (dayElem.dateObj && typeof formatDateLocal === "function") {
                    const dateStr = formatDateLocal(dayElem.dateObj);
                    if (lockedDates.includes(dateStr)) {
                        dayElem.classList.add("booked-day");
                    }
                }
            }
        });
    }).catch(err => {
        // Якщо база не відповіла, все одно показуємо порожній календар, щоб сайт не "лежав"
        window.fp = flatpickr(dateInput, { minDate: "today", "locale": "uk" });
        console.error("Firebase error:", err);
    });
}

// --- ОБРОБКА ФОРМИ ЗАПИСУ ---
// --- ОБРОБКА ФОРМИ ЗАПИСУ ---
document.addEventListener('click', function(e) {
    if (e.target && e.target.id === 'submit-booking') {
        const date = document.getElementById('book-date').value;
        const name = document.getElementById('book-name').value.trim();
        const idea = document.getElementById('book-idea').value.trim();
        const contact = document.getElementById('book-contact').value.trim();
        const fileInput = document.getElementById('book-file');
        const status = document.getElementById('booking-status');
        const btn = e.target;

        // 1. Валідація
        if (!date || !name || !contact || !idea) {
            alert("Заповніть всі поля 🖤");
            return;
        }

        // 2. Блокування інтерфейсу
        btn.disabled = true;
        btn.style.opacity = "0.5";
        status.style.display = "block";
        status.innerText = "Відправка... зачекайте 🖤";

        // 3. Запис у Firebase
                const currentUser = firebase.auth().currentUser; // Отримуємо поточного юзера

        database.ref('bookings/' + date).set({
            clientName: name,
            clientContact: contact,
            idea: idea,
            status: "pending",
            timestamp: Date.now(),
            userId: currentUser ? currentUser.uid : 'guest' // Додаємо цей рядок
        })
        .then(() => {
            const message = `🔔 НОВА ЗАЯВКА\n📅 Дата: ${date}\n👤 Клієнт: ${name}\n📝 Ідея: ${idea}\n📱 Контакт: ${contact}`;
            
            // 4. Відправка в Telegram
            if (fileInput.files && fileInput.files[0]) {
                // ВІДПРАВКА З ФОТО
                const formData = new FormData();
                formData.append('chat_id', TELEGRAM_CHAT_ID);
                formData.append('photo', fileInput.files[0]);
                formData.append('caption', message);

                fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
                    method: 'POST',
                    body: formData // Для FormData заголовок Content-Type НЕ МОЖНА ставити вручну!
                })
                .then(r => r.json())
                .then(data => {
                    if(!data.ok) throw new Error(data.description);
                    finalize();
                })
                .catch(err => {
                    console.error("Telegram Error:", err);
                    alert("Помилка відправки фото. Запис збережено в базі, я побачу його в адмінці.");
                    finalize();
                });
            } else {
                // ВІДПРАВКА БЕЗ ФОТО
                fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: TELEGRAM_CHAT_ID,
                        text: message,
                        parse_mode: 'Markdown'
                    })
                })
                .then(r => r.json())
                .then(data => {
                    if(!data.ok) throw new Error(data.description);
                    finalize();
                })
                .catch(err => {
                    console.error("Telegram Error:", err);
                    finalize();
                });
            }
        }).catch(err => {
            alert("Помилка бази даних. Спробуйте пізніше.");
            btn.disabled = false;
            btn.style.opacity = "1";
        });

        function finalize() {
            status.innerHTML = "Успішно! Я напишу вам 🖤";
            document.getElementById('booking-form-container').style.opacity = "0.3";
            document.getElementById('booking-form-container').style.pointerEvents = "none";
            if (typeof renderCalendar === "function") renderCalendar();
            
            // Авто-перезавантаження через 4 секунди для очищення форми
            setTimeout(() => { location.reload(); }, 4000);
        }
    }
});

// --- СТАРТ ТА АНІМАЦІЇ ---
function checkReveal() {
    document.querySelectorAll('.reveal-item').forEach(item => {
        const rect = item.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.9) item.classList.add('visible');
    });
}

document.addEventListener('DOMContentLoaded', () => {
    loadPhotos();
    
    const modal = document.getElementById('image-modal');
    const closeBtn = document.querySelector('.close-modal');

    if (modal) {
        // Закриття при кліку на фон
        modal.onclick = (e) => {
            if (e.target === modal || e.target.classList.contains('close-modal')) {
                modal.style.display = "none";
                document.body.style.overflow = "auto"; // Повертаємо прокрутку
            }
        };
    }
});

window.addEventListener('scroll', checkReveal);

// Перемикач режимів Вхід/Реєстрація
// Перемикач режимів
window.toggleAuthMode = function(mode) {
    const isLogin = mode === 'login';
    document.getElementById('btn-login').style.display = isLogin ? 'block' : 'none';
    document.getElementById('btn-reg').style.display = isLogin ? 'none' : 'block';
    document.getElementById('reg-fields').style.display = isLogin ? 'none' : 'block'; // Показуємо дод. поля
    
    document.getElementById('tab-login').style.color = isLogin ? 'var(--neon-pink)' : 'var(--grey-text)';
    document.getElementById('tab-login').style.borderBottom = isLogin ? '2px solid var(--neon-pink)' : 'none';
    document.getElementById('tab-reg').style.color = isLogin ? 'none' : 'var(--neon-pink)';
    document.getElementById('tab-reg').style.borderBottom = isLogin ? 'none' : '2px solid var(--neon-pink)';
    document.getElementById('tab-reg').style.color = isLogin ? 'var(--grey-text)' : 'var(--neon-pink)';
};

// Реєстрація зі збереженням даних в Realtime Database
window.handleRegister = function() {
    const email = document.getElementById('c-email').value;
    const pass = document.getElementById('c-pass').value;
    const name = document.getElementById('c-name').value;
    const contact = document.getElementById('c-contact').value;
    const errorMsg = document.getElementById('auth-error');

    if(!name || !contact) {
        errorMsg.innerText = "Заповніть ім'я та контактні дані";
        errorMsg.style.display = 'block';
        return;
    }

    firebase.auth().createUserWithEmailAndPassword(email, pass)
        .then((userCredential) => {
            // Зберігаємо додаткову інформацію про користувача в базу
            const userId = userCredential.user.uid;
            database.ref('users/' + userId).set({
                username: name,
                contact: contact,
                email: email
            });
            alert("Акаунт створено!");
        })
        .catch((error) => {
            errorMsg.innerText = error.message;
            errorMsg.style.display = 'block';
        });
};

// Оновлений слухач статусу
firebase.auth().onAuthStateChanged((user) => {
    const loginForm = document.getElementById('login-form');
    const welcomeMsg = document.getElementById('welcome-msg');
    const authHeader = document.getElementById('auth-header');
    
    if (user) {
        loginForm.style.display = 'none';
        authHeader.style.display = 'none';
        welcomeMsg.style.display = 'block';
        
        // Відображення пошти (якщо є такий елемент)
        const userDisplay = document.getElementById('user-display');
        if (userDisplay) userDisplay.innerText = user.email;

        // 1. Отримуємо дані про профіль
        database.ref('users/' + user.uid).once('value').then((snapshot) => {
            const data = snapshot.val();
            if (data) {
                if(document.getElementById('display-name')) document.getElementById('display-name').innerText = data.username || "Не вказано";
                if(document.getElementById('display-contact')) document.getElementById('display-contact').innerText = data.contact || "Не вказано";
                if(document.getElementById('display-email')) document.getElementById('display-email').innerText = user.email;
            }
        });

        // 2. Завантажуємо записи користувача
        loadUserBookings(user.uid);

    } else {
        loginForm.style.display = 'block';
        authHeader.style.display = 'flex';
        welcomeMsg.style.display = 'none';
    }
});

// (Залиш функцію handleLogin та onAuthStateChanged, які ми писали раніше) 
// Функція для входу
window.handleLogin = function() {
    const email = document.getElementById('c-email').value;
    const pass = document.getElementById('c-pass').value;
    const errorMsg = document.getElementById('auth-error'); // ТУТ МАЄ БУТИ auth-error

    firebase.auth().signInWithEmailAndPassword(email, pass)
        .then(() => {
            if (errorMsg) errorMsg.style.display = 'none';
        })
        .catch((error) => {
            if (errorMsg) {
                errorMsg.innerText = "Невірний логін або пароль";
                errorMsg.style.display = 'block';
            }
        });
};

// Перевірка статусу входу (автоматично)
firebase.auth().onAuthStateChanged((user) => {
    const loginForm = document.getElementById('login-form');
    const welcomeMsg = document.getElementById('welcome-msg');
    
    if (user) {
        // Користувач увійшов
        loginForm.style.display = 'none';
        welcomeMsg.style.display = 'block';
        document.getElementById('user-display').innerText = user.email;
    } else {
        // Користувач не увійшов
        loginForm.style.display = 'block';
        welcomeMsg.style.display = 'none';
    }
});
// Функція для завантаження записів конкретного користувача
function loadUserBookings(uid) {
    const listDiv = document.getElementById('user-bookings-list');
    if (!listDiv) return;

    database.ref('bookings').orderByChild('userId').equalTo(uid).on('value', (snapshot) => {
        if (snapshot.exists()) {
            let html = '';
            snapshot.forEach((childSnapshot) => {
                const booking = childSnapshot.val();
                const date = childSnapshot.key;
                
                const statusColor = booking.status === 'confirmed' ? 'var(--neon-pink)' : '#ffcc00';
                const statusText = booking.status === 'confirmed' ? 'ПІДТВЕРДЖЕНО' : 'В ОЧІКУВАННІ';

                html += `
                    <div style="background: #111; padding: 15px; border-radius: 10px; border-left: 3px solid ${statusColor}; margin-bottom: 10px; text-align: left;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                            <strong style="color: #fff;">${date}</strong>
                            <span style="color: ${statusColor}; font-size: 0.7rem; font-weight: bold;">${statusText}</span>
                        </div>
                        <p style="color: #888; font-size: 0.8rem; margin: 0;">${booking.idea}</p>
                    </div>
                `;
            });
            listDiv.innerHTML = html;
        } else {
            listDiv.innerHTML = '<p style="color: #555; font-size: 0.8rem;">Активних записів не знайдено</p>';
        }
    });
}


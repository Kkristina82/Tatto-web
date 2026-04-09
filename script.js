// ================================================
//  GOR.A TATTOO — script.js
// ================================================

const TG_TOKEN   = '8758214194:AAFI7drpn1wGVEpEaB9XrNyBoZHg1M7GApE';
const TG_CHAT_ID = '7443699603';

// ── Firebase ──────────────────────────────────────
const firebaseConfig = {
    apiKey: "AIzaSyBU7yr7SRj8JEvDHmY4w7SSXIX8zjgocCg",
    authDomain: "goratattokrop.firebaseapp.com",
    databaseURL: "https://goratattokrop-default-rtdb.firebaseio.com",
    projectId: "goratattokrop",
    storageBucket: "goratattokrop.firebasestorage.app",
    messagingSenderId: "921888337663",
    appId: "1:921888337663:web:06a6fa71a114c35a4326ca"
};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db   = firebase.database();
const auth = firebase.auth();

// ── Telegram ──────────────────────────────────────
async function sendTelegram(text) {
    try {
        await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TG_CHAT_ID,
                text: text,
                parse_mode: 'HTML'
            })
        });
    } catch(e) {
        console.warn('Telegram error:', e);
    }
}

// ── Telegram Photo ────────────────────────────────
async function sendTelegramPhoto(file, caption) {
    try {
        const formData = new FormData();
        formData.append('chat_id', TG_CHAT_ID);
        formData.append('photo', file);
        formData.append('caption', caption);
        formData.append('parse_mode', 'HTML');
        await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendPhoto`, {
            method: 'POST',
            body: formData
        });
    } catch(e) {
        console.warn('Telegram photo error:', e);
    }
}

// ── Tab Navigation ────────────────────────────────
function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    const target = document.getElementById(tabId);
    if (target) { target.classList.add('active'); window.scrollTo({ top: 0, behavior: 'smooth' }); }

    // Оновлюємо активний пункт nav
    document.querySelectorAll('.main-nav ul li').forEach(li => li.classList.remove('nav-active'));
    const map = { home:0, aftercare:1, care:2, contact:3, 'client-cabinet':4 };
    const idx = map[tabId];
    const items = document.querySelectorAll('.main-nav ul li');
    if (idx !== undefined && items[idx]) items[idx].classList.add('nav-active');
}

// Відкрити вкладку кабінету з певною секцією
function openCabinetSection(section) {
    setTimeout(() => switchCabinetTab(section), 50);
}
window.openCabinetSection = openCabinetSection;

// ── Gallery ───────────────────────────────────────
const photos = Array.from({ length: 18 }, (_, i) => `img/${i + 1}.jpg`);

function buildGallery() {
    const grid = document.getElementById('photo-grid');
    if (!grid) return;
    grid.innerHTML = '';
    photos.forEach((src, i) => {
        const wrap = document.createElement('div');
        wrap.className = 'gallery-item';
        const img = document.createElement('img');
        img.src = src;
        img.alt = `Робота ${i + 1}`;
        img.loading = 'lazy';
        wrap.appendChild(img);
        wrap.addEventListener('click', () => openModal(src));
        setTimeout(() => {
            grid.appendChild(wrap);
            requestAnimationFrame(() => setTimeout(() => wrap.classList.add('visible'), 40));
        }, i * 55);
    });
}

// ── Image Modal ───────────────────────────────────
function openModal(src) {
    const modal = document.getElementById('image-modal');
    const img   = document.getElementById('full-image');
    if (!modal || !img) return;
    img.src = src;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
}
function closeModal() {
    const modal = document.getElementById('image-modal');
    if (modal) modal.classList.remove('open');
    document.body.style.overflow = '';
}

// ── Info poster modal (збільшення фото на сторінці інформації) ──
function initInfoPosters() {
    document.querySelectorAll('.info-posters img').forEach(img => {
        img.addEventListener('click', () => openModal(img.src));
    });
}

// ── Date Picker ───────────────────────────────────
let fp = null;

function initDatePicker() {
    const input = document.getElementById('book-date');
    if (!input || typeof flatpickr === 'undefined') return;

    db.ref('bookings').once('value', snap => {
        const booked = [];
        if (snap.exists()) snap.forEach(c => booked.push(c.key));

        fp = flatpickr(input, {
            locale: 'uk',
            dateFormat: 'Y-m-d',
            minDate: 'today',
            disable: booked,
            disableMobile: false
        });
    });
}

// ── File Upload ───────────────────────────────────
function initFileUpload() {
    const fileInput = document.getElementById('book-file');
    const fileLabel = document.getElementById('file-label');
    if (!fileInput || !fileLabel) return;
    fileInput.addEventListener('change', () => {
        fileLabel.textContent = fileInput.files[0] ? fileInput.files[0].name : 'ОБРАТИ ФОТО';
    });
}

// ── Booking Submit ────────────────────────────────
function initBookingSubmit() {
    const btn = document.getElementById('submit-booking');
    if (!btn) return;
    btn.addEventListener('click', async () => {
        const name    = document.getElementById('book-name')?.value.trim();
        const date    = document.getElementById('book-date')?.value.trim();
        const idea    = document.getElementById('book-idea')?.value.trim();
        const contact = document.getElementById('book-contact')?.value.trim();

        if (!name || !date || !idea || !contact) {
            showBookingStatus('⚠️ Будь ласка, заповніть усі поля.', '#ffcc00');
            return;
        }

        btn.disabled = true;
        btn.textContent = 'ВІДПРАВЛЯЄМО...';

        try {
            // Перевірка чи дата вільна
            const snap = await db.ref('bookings/' + date).once('value');
            if (snap.exists()) {
                showBookingStatus('❌ На цю дату вже є запис. Оберіть іншу дату.', '#ff4466');
                btn.disabled = false;
                btn.textContent = 'ВІДПРАВИТИ НА ОЦІНКУ';
                return;
            }

            const userId = auth.currentUser?.uid || 'guest';
            const userName = auth.currentUser ? (await db.ref('users/' + auth.currentUser.uid).once('value')).val()?.name || name : name;

            // Зберігаємо в Firebase
            await db.ref('bookings/' + date).set({
                clientName:    name,
                clientContact: contact,
                idea:          idea,
                status:        'pending',
                timestamp:     Date.now(),
                userId:        userId
            });

            // Відправляємо в Telegram
            const msg =
`🖤 <b>НОВА ЗАЯВКА НА ОЦІНКУ ТАТУ</b>

👤 <b>Ім'я:</b> ${name}
📅 <b>Дата:</b> ${date}
💬 <b>Ідея:</b> ${idea}
📱 <b>Контакт:</b> ${contact}

🔗 Статус: очікує підтвердження`;

            const photoFile = document.getElementById('book-file')?.files[0];
            if (photoFile) {
                await sendTelegramPhoto(photoFile, msg);
            } else {
                await sendTelegram(msg);
            }

            showBookingStatus(`✅ Заявку відправлено!\n\nДата: ${date}\n\nЗ вами зв'яжеться менеджер для передоплати вашого сеансу 🖤`, '#00ff99');

            // Скидаємо форму
            ['book-name','book-date','book-idea','book-contact'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
            const lbl = document.getElementById('file-label');
            if (lbl) lbl.textContent = 'ОБРАТИ ФОТО';
            if (fp) fp.clear();

            // Оновлюємо список записів
            if (auth.currentUser) loadUserBookings(auth.currentUser.uid);

        } catch(err) {
            console.error(err);
            showBookingStatus('❌ Сталася помилка. Напишіть в Instagram 📩', '#ff4466');
        }

        btn.disabled = false;
        btn.textContent = 'ВІДПРАВИТИ НА ОЦІНКУ';
    });
}

function showBookingStatus(msg, color) {
    const el = document.getElementById('booking-status');
    if (!el) return;
    el.style.display    = 'block';
    el.style.borderColor = color;
    el.style.color       = color;
    el.style.background  = color + '10';
    el.textContent       = msg;
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ── Auth tabs ─────────────────────────────────────
window.switchAuthTab = function(mode) {
    document.getElementById('tab-login').classList.toggle('active', mode === 'login');
    document.getElementById('tab-reg').classList.toggle('active', mode === 'reg');
    document.getElementById('form-login').classList.toggle('active', mode === 'login');
    document.getElementById('form-reg').classList.toggle('active', mode === 'reg');
    const e1 = document.getElementById('auth-error');
    const e2 = document.getElementById('reg-error');
    if (e1) e1.style.display = 'none';
    if (e2) e2.style.display = 'none';
};

// ── Login ─────────────────────────────────────────
window.handleLogin = async function() {
    const email = document.getElementById('c-email')?.value.trim();
    const pass  = document.getElementById('c-pass')?.value;
    const errEl = document.getElementById('auth-error');
    if (!email || !pass) { showErr(errEl, 'Введіть email та пароль.'); return; }
    try {
        await auth.signInWithEmailAndPassword(email, pass);
    } catch(err) {
        const msgs = {
            'auth/user-not-found':    'Користувача не знайдено.',
            'auth/wrong-password':    'Невірний пароль.',
            'auth/invalid-email':     'Некоректний email.',
            'auth/invalid-credential':'Невірний email або пароль.',
            'auth/too-many-requests': 'Забагато спроб. Спробуйте пізніше.'
        };
        showErr(errEl, msgs[err.code] || err.message);
    }
};

// ── Register ──────────────────────────────────────
window.handleRegister = async function() {
    const name    = document.getElementById('c-name')?.value.trim();
    const contact = document.getElementById('c-contact')?.value.trim();
    const email   = document.getElementById('c-email-r')?.value.trim();
    const pass    = document.getElementById('c-pass-r')?.value;
    const errEl   = document.getElementById('reg-error');

    if (!name || !email || !pass) { showErr(errEl, 'Заповніть усі поля.'); return; }
    if (pass.length < 6) { showErr(errEl, 'Пароль мінімум 6 символів.'); return; }

    try {
        const cred = await auth.createUserWithEmailAndPassword(email, pass);
        await db.ref('users/' + cred.user.uid).set({ name, contact, email, isAdmin: false });
        // Повідомлення в Telegram про нову реєстрацію
        await sendTelegram(`👤 <b>НОВИЙ КЛІЄНТ</b>\n\n🏷 Ім'я: ${name}\n📱 Контакт: ${contact || '—'}\n📧 Email: ${email}`);
    } catch(err) {
        const msgs = {
            'auth/email-already-in-use': 'Цей email вже зареєстровано.',
            'auth/invalid-email':        'Некоректний email.',
            'auth/weak-password':        'Надто слабкий пароль.'
        };
        showErr(errEl, msgs[err.code] || err.message);
    }
};

function showErr(el, msg) {
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
}

// ── Cabinet inner tabs ────────────────────────────
window.switchCabinetTab = function(tab) {
    document.querySelectorAll('.cabinet-nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.cabinet-sub').forEach(s => s.classList.remove('active'));
    const btn = document.getElementById('cnav-' + tab);
    const sub = document.getElementById('csub-' + tab);
    if (btn) btn.classList.add('active');
    if (sub) sub.classList.add('active');
    if (tab === 'records' && auth.currentUser) loadUserBookings(auth.currentUser.uid);
};

// ── Auth state ────────────────────────────────────
auth.onAuthStateChanged(user => {
    const authBox      = document.getElementById('auth-box');
    const cabinetPanel = document.getElementById('cabinet-panel');
    const navBtn       = document.getElementById('nav-cabinet-btn');

    if (user) {
        if (authBox)      authBox.style.display      = 'none';
        if (cabinetPanel) cabinetPanel.style.display = 'block';
        if (navBtn)       navBtn.textContent          = 'КАБІНЕТ';

        db.ref('users/' + user.uid).once('value', snap => {
            const d = snap.val() || {};
            const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v || '—'; };
            set('disp-name',    d.name);
            set('disp-contact', d.contact);
            set('disp-email',   user.email);
            // Підставляємо ім'я в форму запису
            const bn = document.getElementById('book-name');
            if (bn && !bn.value) bn.value = d.name || '';
            const bc = document.getElementById('book-contact');
            if (bc && !bc.value) bc.value = d.contact || '';
        });

        loadUserBookings(user.uid);

    } else {
        if (authBox)      authBox.style.display      = 'block';
        if (cabinetPanel) cabinetPanel.style.display = 'none';
        if (navBtn)       navBtn.textContent          = 'ВХІД';
    }
});

// ── Load user bookings ────────────────────────────
function loadUserBookings(uid) {
    const list = document.getElementById('user-bookings-list');
    if (!list) return;
    list.innerHTML = '<p style="color:#444;font-size:0.82rem;text-align:center;padding:20px 0">Завантаження...</p>';

    db.ref('bookings').once('value', snap => {
        if (!snap.exists()) {
            list.innerHTML = '<p style="color:#444;font-size:0.82rem;text-align:center;padding:20px 0">Записів поки немає.</p>';
            return;
        }
        let html = '';
        let count = 0;
        snap.forEach(child => {
            const b = child.val();
            if (b.userId !== uid) return;
            count++;
            const col  = b.status === 'confirmed' ? '#00ff99' : '#ffcc00';
            const text = b.status === 'confirmed' ? '✓ Підтверджено' : '⏳ Очікує підтвердження';
            html += `<div class="booking-card" style="border-left-color:${col}">
                <div class="booking-card-date">📅 ${child.key}</div>
                <div class="booking-card-idea">${b.idea || '—'}</div>
                <div class="booking-card-status" style="color:${col}">${text}</div>
            </div>`;
        });
        list.innerHTML = count ? html : '<p style="color:#444;font-size:0.82rem;text-align:center;padding:20px 0">Записів поки немає.</p>';
    });
}

// ── Init ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    buildGallery();
    initInfoPosters();
    initDatePicker();
    initFileUpload();
    initBookingSubmit();

    // Modal close
    const modal   = document.getElementById('image-modal');
    const closeBtn = document.querySelector('.close-modal');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (modal)    modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
});

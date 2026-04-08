const firebaseConfig = {
    apiKey: "AIzaSyBU7yr7SRj8JEvDHmY4w7SSXIX8zjgocCg",
    authDomain: "goratattokrop.firebaseapp.com",
    databaseURL: "https://goratattokrop-default-rtdb.firebaseio.com",
    projectId: "goratattokrop",
    storageBucket: "goratattokrop.firebasestorage.app",
    messagingSenderId: "921888337663",
    appId: "1:921888337663:web:06a6fa71a114c35a4326ca"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth();

window.loginAdmin = function() {
    const email = document.getElementById('admin-email').value;
    const pass = document.getElementById('admin-pass').value;
    auth.signInWithEmailAndPassword(email, pass)
        .then(() => console.log("Спроба входу..."))
        .catch(err => alert("Помилка входу: " + err.message));
};

auth.onAuthStateChanged(user => {
    const loginScreen = document.getElementById('login-screen');
    const adminPanel = document.getElementById('admin-panel');

    if (user) {
        database.ref('users/' + user.uid).on('value', snap => {
            const data = snap.val();
            
            // Перевірка підтримує і логічне true, і рядок "true"
            if (data && (data.isAdmin === true || data.isAdmin === "true")) {
                loginScreen.style.display = 'none';
                adminPanel.style.display = 'block';
                loadAdminBookings();
            } else {
                console.warn("Користувач не є адміном. UID:", user.uid);
                alert("Доступ обмежено. Ваш UID: " + user.uid);
                auth.signOut();
            }
        });
    } else {
        loginScreen.style.display = 'flex';
        adminPanel.style.display = 'none';
    }
});

// Додаємо window. щоб функція була доступна всюди
window.loadAdminBookings = function() {
    const list = document.getElementById('admin-bookings-list');
    database.ref('bookings').on('value', (snapshot) => {
        let html = '';
        if (!snapshot.exists()) {
            list.innerHTML = '<p>Записів немає</p>';
            return;
        }
        snapshot.forEach((child) => {
            const b = child.val();
            const date = child.key;
            const isConfirmed = b.status === 'confirmed';

            html += `
                <div style="background: #111; padding: 15px; border-radius: 10px; margin-bottom: 10px; border-left: 4px solid ${isConfirmed ? '#00ff00' : '#ff00ff'};">
                    <p><strong>Дата: ${date}</strong></p>
                    <p>Клієнт: ${b.clientName} | ${b.clientContact}</p>
                    <p style="font-size: 0.8rem; color: #888;">${b.idea}</p>
                    <div style="margin-top: 10px; display: flex; gap: 10px;">
                        ${!isConfirmed ? `<button onclick="confirmBooking('${date}')" style="background:green; color:white; border:none; padding:5px 10px; cursor:pointer;">Підтвердити</button>` : '<span>Підтверджено ✓</span>'}
                        <button onclick="deleteBooking('${date}')" style="background:red; color:white; border:none; padding:5px 10px; cursor:pointer;">Видалити</button>
                    </div>
                </div>`;
        });
        list.innerHTML = html;
    });
} // <--- Перевір, щоб тут не було зайвих дужок нижче

window.confirmBooking = (date) => database.ref('bookings/' + date).update({ status: 'confirmed' });
window.deleteBooking = (date) => confirm("Видалити?") && database.ref('bookings/' + date).remove();

window.addManualBooking = function() {
    const name = document.getElementById('manual-name').value;
    const date = document.getElementById('manual-date').value;
    if (!date || !name) return alert("Заповни дату та ім'я");

    database.ref('bookings/' + date).set({
        clientName: name,
        clientContact: document.getElementById('manual-contact').value || "Вручну",
        idea: document.getElementById('manual-idea').value || "-",
        status: "confirmed",
        timestamp: Date.now()
    }).then(() => alert("Додано!"));
};

window.setDayOff = function() {
    const date = document.getElementById('admin-day-off').value;
    if (!date) return;
    database.ref('bookings/' + date).set({
        clientName: "⛔ ВИХІДНИЙ",
        status: "confirmed"
    });
};
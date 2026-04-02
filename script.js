const totalPhotos = 20; 

function loadPhotos() {
    const grid = document.getElementById('photo-grid');
    if (!grid) return;
    
    grid.innerHTML = ''; 

    for (let i = 1; i <= totalPhotos; i++) {
        const item = document.createElement('div');
        item.className = 'reveal-item';
        
        const img = document.createElement('img');
        // ВАЖЛИВО: Переконайтеся, що розширення файлів .jpg (маленькими літерами)
        img.src = `img/${i}.jpg`; 
        img.alt = `Tattoo work ${i}`;
        img.loading = "lazy"; // Допомагає сайту вантажитися швидше

        // Якщо фото не знайдено, ми просто видаляємо пустий блок, щоб не було дірок
        img.onerror = function() { 
            console.error(`Помилка завантаження фото: img/${i}.jpg`);
            item.remove(); 
        };

        // Додаємо клік для відкриття модального вікна (як у вашому коді)
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

// Функція для перемикання табів
function showTab(tabId) {
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => tab.classList.remove('active'));
    
    const activeTab = document.getElementById(tabId);
    if (activeTab) {
        activeTab.classList.add('active');
    }
    
    window.scrollTo(0, 0);
    // Даємо мікро-паузу, щоб браузер встиг відмалювати таб перед запуском анімації
    setTimeout(checkReveal, 100);
}

// Анімація появи при скролі
function checkReveal() {
    const items = document.querySelectorAll('.reveal-item');
    items.forEach(item => {
        const rect = item.getBoundingClientRect();
        // Якщо фото з'явилося в полі зору на 90%
        if (rect.top < window.innerHeight * 0.9) {
            item.classList.add('visible');
        }
    });
}

// Ініціалізація при завантаженні сторінки
document.addEventListener('DOMContentLoaded', () => {
    loadPhotos();
    checkReveal();
    
    // Закриття модалки
    const modal = document.getElementById('image-modal');
    if (modal) {
        modal.onclick = function() { modal.style.display = "none"; };
    }
});

window.addEventListener('scroll', checkReveal);

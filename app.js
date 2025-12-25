// Данные
let medicines = JSON.parse(localStorage.getItem('medicines')) || [];
let medicineToDelete = null;

// Запуск приложения
document.addEventListener('DOMContentLoaded', function() {
    // Установить сегодняшнюю дату
    document.getElementById('startDate').valueAsDate = new Date();

    // Кнопки модального окна
    document.getElementById('addButton').onclick = showModal;
    document.getElementById('closeModal').onclick = hideModal;
    document.getElementById('cancelBtn').onclick = hideModal;
    document.getElementById('medicineForm').onsubmit = saveMedicine;

    // Кнопки подтверждения удаления
    document.getElementById('confirmCancel').onclick = cancelDelete;
    document.getElementById('confirmOk').onclick = confirmDelete;

    // Закрытие окна подтверждения при клике вне его
    document.getElementById('confirmModal').onclick = function(e) {
        if (e.target.id === 'confirmModal') {
            hideConfirmModal();
        }
    };

    // Проверить и сбросить отметки "принято" если новый день
    resetTakenIfNewDay();

    // Показать список
    showMedicines();

    // Запустить проверку времени каждую минуту
    setInterval(checkTime, 60000);
    setInterval(checkNotifications, 60000);
});

// ===== ОСНОВНЫЕ ФУНКЦИИ =====

function showModal() {
    document.getElementById('addModal').style.display = 'flex';
    // Очистить поля времени при открытии
    document.querySelectorAll('.time-input').forEach(input => {
        input.value = '';
    });
}

function hideModal() {
    document.getElementById('addModal').style.display = 'none';
    document.getElementById('medicineForm').reset();
    document.getElementById('startDate').valueAsDate = new Date();
}

function showConfirmModal(medicineName) {
    document.getElementById('confirmMessage').textContent =
        `Удалить лекарство "${medicineName}"?`;
    document.getElementById('confirmModal').style.display = 'flex';
}

function hideConfirmModal() {
    document.getElementById('confirmModal').style.display = 'none';
    medicineToDelete = null;
}

// СОХРАНИТЬ ЛЕКАРСТВО (с 4 полями времени)
function saveMedicine(event) {
    event.preventDefault();

    // Собираем только заполненные времена
    const timeInputs = document.querySelectorAll('.time-input');
    const times = [];

    timeInputs.forEach(input => {
        if (input.value && input.value.trim() !== '') {
            times.push(input.value);
        }
    });

    if (times.length === 0) {
        alert('Заполните хотя бы одно время приёма');
        return;
    }

    // Проверяем обязательные поля
    const name = document.getElementById('name').value.trim();
    const startDate = document.getElementById('startDate').value;
    const duration = document.getElementById('duration').value;

    if (!name) {
        alert('Введите название лекарства');
        return;
    }

    if (!startDate) {
        alert('Выберите дату начала курса');
        return;
    }

    if (!duration || parseInt(duration) < 1) {
        alert('Введите корректную продолжительность курса (минимум 1 день)');
        return;
    }

    const medicine = {
        id: Date.now(),
        name: name,
        dosage: document.getElementById('dosage').value.trim() || 'Не указана',
        times: times, // массив только заполненных времён
        startDate: startDate,
        duration: parseInt(duration),
        taken: new Array(times.length).fill(false), // массив отметок для каждого времени
        deleted: false
    };

    medicines.push(medicine);
    localStorage.setItem('medicines', JSON.stringify(medicines));
    showMedicines();
    hideModal();

    alert('Лекарство добавлено!');
}

// ===== ФУНКЦИИ ДЛЯ КНОПОК =====

window.deleteMedicine = function(id) {
    const medicine = medicines.find(m => m.id === id);
    if (!medicine) return;

    medicineToDelete = id;
    showConfirmModal(medicine.name);
}

function confirmDelete() {
    if (medicineToDelete) {
        const medicine = medicines.find(m => m.id === medicineToDelete);
        if (medicine) {
            medicine.deleted = true;
            localStorage.setItem('medicines', JSON.stringify(medicines));
            showMedicines();
            alert(`Лекарство "${medicine.name}" удалено!`);
        }
    }
    hideConfirmModal();
}

function cancelDelete() {
    alert('Удаление отменено');
    hideConfirmModal();
}

// Отметить принятым конкретное время
window.toggleTimeTaken = function(medicineId, timeIndex) {
    const medicine = medicines.find(m => m.id === medicineId);
    if (medicine) {
        medicine.taken[timeIndex] = !medicine.taken[timeIndex];
        localStorage.setItem('medicines', JSON.stringify(medicines));
        showMedicines();
    }
}

// ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====

// Сброс отметок "принято" в полночь
function resetTakenIfNewDay() {
    const today = new Date().toDateString();
    const lastReset = localStorage.getItem('lastResetDate');

    if (!lastReset || lastReset !== today) {
        let needsUpdate = false;

        medicines.forEach(med => {
            if (med.taken) {
                med.taken = med.taken.map(() => false);
                needsUpdate = true;
            }
        });

        if (needsUpdate) {
            localStorage.setItem('medicines', JSON.stringify(medicines));
        }

        localStorage.setItem('lastResetDate', today);
    }
}

function checkTime() {
    const now = new Date();
    if (now.getHours() === 0 && now.getMinutes() <= 1) {
        resetTakenIfNewDay();
        showMedicines();
    }
}

// Проверка завершения курса
function isExpired(startDate, duration) {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(start.getDate() + duration);
    return new Date() > end;
}

// Оставшиеся дни
function getRemainingDays(startDate, duration) {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(start.getDate() + duration);
    const diffTime = end - new Date();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Показать список лекарств
function showMedicines() {
    const container = document.getElementById('medicinesList');

    const visibleMedicines = medicines.filter(m => !m.deleted);

    if (visibleMedicines.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>Нет добавленных лекарств</p>
                <p>Нажмите кнопку выше, чтобы добавить</p>
            </div>
        `;
        return;
    }

    let html = '';

    visibleMedicines.forEach(med => {
        const expired = isExpired(med.startDate, med.duration);
        const remainingDays = getRemainingDays(med.startDate, med.duration);

        // Определяем класс для карточки
        let cardClass = 'medicine-card';
        if (expired) {
            cardClass += ' expired-course';
        } else if (remainingDays <= 3) {
            cardClass += ' ending-soon';
        }

        // Формируем список времён
        let timesHtml = '';
        if (med.times && med.times.length > 0) {
            med.times.forEach((time, index) => {
                const isTaken = med.taken && med.taken[index];
                timesHtml += `
                    <div class="time-item ${isTaken ? 'taken' : ''}">
                        ⏰ ${time}
                        <button class="time-taken-btn" onclick="toggleTimeTaken(${med.id}, ${index})">
                            ${isTaken ? '✅' : '◻️'}
                        </button>
                    </div>
                `;
            });
        }

        html += `
            <div class="${cardClass}">
                <div class="medicine-name">${med.name}</div>
                <div class="medicine-dosage">${med.dosage}</div>

                <div class="medicine-details">
                    <div class="times-list">
                        ${timesHtml}
                    </div>
                    <div>📅 Начало: ${med.startDate}</div>
                    <div>📆 Курс: ${med.duration} дней</div>
                    ${expired ?
                        '<div class="course-status expired">Курс завершён</div>' :
                        `<div class="course-status active">Осталось ${remainingDays} дн.</div>`
                    }
                </div>

                <div class="medicine-actions">
                    <button class="btn-delete" onclick="deleteMedicine(${med.id})">
                        Удалить
                    </button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// ===== УВЕДОМЛЕНИЯ =====

function checkNotifications() {
    const now = new Date();
    const currentTime = now.getHours().toString().padStart(2, '0') + ':' +
                       now.getMinutes().toString().padStart(2, '0');

    medicines.forEach(med => {
        if (!med.deleted && !isExpired(med.startDate, med.duration)) {
            med.times.forEach((time, index) => {
                // За 10 минут до приёма
                const notificationTime = subtractMinutes(time, 10);

                if (currentTime === notificationTime) {
                    showInAppNotification(`Через 10 минут приём: ${med.name} в ${time}`);
                }

                // В точное время приёма
                if (currentTime === time) {
                    showInAppNotification(`Время принять: ${med.name}`);
                }
            });
        }
    });
}

function subtractMinutes(timeStr, minutes) {
    const [hours, mins] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, mins - minutes, 0, 0);

    return date.getHours().toString().padStart(2, '0') + ':' +
           date.getMinutes().toString().padStart(2, '0');
}

function showInAppNotification(message) {
    // Создаём элемент уведомления
    const notification = document.createElement('div');
    notification.className = 'in-app-notification';
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">🔔</span>
            <span class="notification-text">${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;

    document.body.appendChild(notification);

    // Автоудаление через 10 секунд
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100px)';
            setTimeout(() => notification.remove(), 300);
        }
    }, 10000);
}
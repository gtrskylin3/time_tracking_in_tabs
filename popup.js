// Утилиты для форматирования времени
function msToMinutes(ms) {
    return Math.round(ms / 60000);
}

function msToHours(ms) {
    return (ms / 3600000).toFixed(1);
}

function formatTime(ms) {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    
    if (hours > 0) {
        return `${hours}ч ${minutes}м`;
    }
    return `${minutes}м`;
}

function formatTimeHours(ms) {
    const hours = (ms / 3600000).toFixed(1);
    return `${hours}ч`;
}

// Получить иконку для сайта
function getSiteIcon(site) {
    return site.charAt(0).toUpperCase();
}

// Получить цвет для иконки
function getSiteColor(site) {
    const colors = [
        '#667eea', '#764ba2', '#f093fb', '#f5576c',
        '#4facfe', '#00f2fe', '#43e97b', '#38f9d7',
        '#fa709a', '#fee140', '#a8edea', '#fed6e3'
    ];
    let hash = 0;
    for (let i = 0; i < site.length; i++) {
        hash = site.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
}

// Создать элемент сайта
function createSiteItem(site, time, maxTime = 0) {
    const siteItem = document.createElement('div');
    siteItem.className = 'site-item';
    
    const progressPercent = maxTime > 0 ? (time / maxTime) * 100 : 0;
    
    siteItem.innerHTML = `
        <div class="site-icon" style="background-color: ${getSiteColor(site)}">
            ${getSiteIcon(site)}
        </div>
        <div class="site-info">
            <div class="site-name">${site}</div>
            <div class="site-time">${formatTime(time)}</div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${progressPercent}%"></div>
            </div>
        </div>
    `;
    
    return siteItem;
}

// Создать пустое состояние
function createEmptyState(message) {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.innerHTML = `
        <div class="icon">📊</div>
        <div>${message}</div>
    `;
    return emptyState;
}

// Создать график для недели
function createWeekChart(weekData) {
    const chartContainer = document.getElementById('week-chart');
    chartContainer.innerHTML = '';
    
    if (!weekData || Object.keys(weekData).length === 0) {
        chartContainer.appendChild(createEmptyState('Нет данных за неделю'));
        return;
    }
    
    const maxTime = Math.max(...Object.values(weekData));
    
    Object.entries(weekData)
        .filter(([site]) => site && site !== 'null' && site !== 'undefined')
        .sort(([,a], [,b]) => b - a)
        .forEach(([site, time]) => {
            const chartBar = document.createElement('div');
            chartBar.className = 'chart-bar';
            
            const percentage = maxTime > 0 ? (time / maxTime) * 100 : 0;
            
            chartBar.innerHTML = `
                <div class="chart-label">${site}</div>
                <div class="chart-progress">
                    <div class="chart-fill" style="width: ${percentage}%"></div>
                </div>
                <div class="chart-value">${formatTime(time)}</div>
            `;
            
            chartContainer.appendChild(chartBar);
        });
}

// Загрузить данные для сегодня
function loadTodayData() {
    const today = new Date().toISOString().split('T')[0];
    
    chrome.storage.local.get(['dailyData'], (result) => {
        const dailyData = result.dailyData || {};
        const todayData = dailyData[today] || {};
        
        // Обновить статистику
        const totalTime = Object.values(todayData).reduce((sum, time) => sum + time, 0);
        const sitesCount = Object.keys(todayData).length;
        
        document.getElementById('today-total-time').textContent = formatTime(totalTime);
        document.getElementById('today-sites-count').textContent = sitesCount;
        
        // Обновить список сайтов
        const sitesContainer = document.getElementById('today-sites');
        sitesContainer.innerHTML = '';
        
        if (sitesCount === 0) {
            sitesContainer.appendChild(createEmptyState('Сегодня еще нет данных'));
            return;
        }
        
        const maxTime = Math.max(...Object.values(todayData));
        
        Object.entries(todayData)
            .filter(([site]) => site && site !== 'null' && site !== 'undefined')
            .sort(([,a], [,b]) => b - a)
            .forEach(([site, time]) => {
                sitesContainer.appendChild(createSiteItem(site, time, maxTime));
            });
    });
}

// Загрузить данные для недели
function loadWeekData() {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const weekKey = startOfWeek.toISOString().split('T')[0];
    
    chrome.storage.local.get(['weeklyData'], (result) => {
        const weeklyData = result.weeklyData || {};
        const weekData = weeklyData[weekKey] || {};
        
        // Обновить статистику
        const totalTime = Object.values(weekData).reduce((sum, time) => sum + time, 0);
        const sitesCount = Object.keys(weekData).length;
        
        document.getElementById('week-total-time').textContent = formatTime(totalTime);
        document.getElementById('week-sites-count').textContent = sitesCount;
        
        // Создать график
        createWeekChart(weekData);
        
        // Обновить список сайтов
        const sitesContainer = document.getElementById('week-sites');
        sitesContainer.innerHTML = '';
        
        if (sitesCount === 0) {
            sitesContainer.appendChild(createEmptyState('За неделю нет данных'));
            return;
        }
        
        const maxTime = Math.max(...Object.values(weekData));
        
        Object.entries(weekData)
            .filter(([site]) => site && site !== 'null' && site !== 'undefined')
            .sort(([,a], [,b]) => b - a)
            .forEach(([site, time]) => {
                sitesContainer.appendChild(createSiteItem(site, time, maxTime));
            });
    });
}

// Загрузить данные за все время
function loadAllTimeData() {
    chrome.storage.local.get(['timeSpent'], (result) => {
        const allTimeData = result.timeSpent || {};
        
        // Обновить статистику
        const totalTime = Object.values(allTimeData).reduce((sum, time) => sum + time, 0);
        const sitesCount = Object.keys(allTimeData).length;
        
        document.getElementById('alltime-total-time').textContent = formatTimeHours(totalTime);
        document.getElementById('alltime-sites-count').textContent = sitesCount;
        
        // Создать график
        createAllTimeChart(allTimeData);
        
        // Обновить список сайтов
        const sitesContainer = document.getElementById('alltime-sites');
        sitesContainer.innerHTML = '';
        
        if (sitesCount === 0) {
            sitesContainer.appendChild(createEmptyState('Нет данных за все время'));
            return;
        }
        
        const maxTime = Math.max(...Object.values(allTimeData));
        
        Object.entries(allTimeData)
            .filter(([site]) => site && site !== 'null' && site !== 'undefined')
            .sort(([,a], [,b]) => b - a)
            .forEach(([site, time]) => {
                const siteItem = createSiteItem(site, time, maxTime);
                // Обновляем формат времени для "Все время"
                const timeElement = siteItem.querySelector('.site-time');
                timeElement.textContent = formatTimeHours(time);
                sitesContainer.appendChild(siteItem);
            });
    });
}

// Создать график для всех данных
function createAllTimeChart(allTimeData) {
    const chartContainer = document.getElementById('alltime-chart');
    chartContainer.innerHTML = '';
    
    if (!allTimeData || Object.keys(allTimeData).length === 0) {
        chartContainer.appendChild(createEmptyState('Нет данных за все время'));
        return;
    }
    
    const maxTime = Math.max(...Object.values(allTimeData));
    
    Object.entries(allTimeData)
        .filter(([site]) => site && site !== 'null' && site !== 'undefined')
        .sort(([,a], [,b]) => b - a)
        .forEach(([site, time]) => {
            const chartBar = document.createElement('div');
            chartBar.className = 'chart-bar';
            
            const percentage = maxTime > 0 ? (time / maxTime) * 100 : 0;
            
            chartBar.innerHTML = `
                <div class="chart-label">${site}</div>
                <div class="chart-progress">
                    <div class="chart-fill" style="width: ${percentage}%"></div>
                </div>
                <div class="chart-value">${formatTimeHours(time)}</div>
            `;
            
            chartContainer.appendChild(chartBar);
        });
}

// Переключение вкладок
function initTabs() {
    const tabs = document.querySelectorAll('.tab');
    const contents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Убрать активный класс со всех вкладок и контента
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            
            // Добавить активный класс к выбранной вкладке
            tab.classList.add('active');
            
            // Показать соответствующий контент
            const tabName = tab.dataset.tab;
            const content = document.getElementById(`${tabName}-content`);
            content.classList.add('active');
            
            // Загрузить данные для активной вкладки
            if (tabName === 'today') {
                loadTodayData();
            } else if (tabName === 'week') {
                loadWeekData();
            } else if (tabName === 'alltime') {
                loadAllTimeData();
            }
        });
    });
}

// Функция очистки всех данных
function clearAllData() {
    chrome.storage.local.clear(() => {
        // Перезагрузить все данные
        loadTodayData();
        loadWeekData();
        loadAllTimeData();
        
        // Показать уведомление об успешной очистке
        showNotification('Все данные успешно удалены!', 'success');
    });
}

// Показать уведомление
function showNotification(message, type = 'info') {
    // Создаем временное уведомление
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#28a745' : '#17a2b8'};
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 1001;
        font-weight: 500;
        animation: slideInRight 0.3s ease;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Удаляем через 3 секунды
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Инициализация модального окна
function initClearModal() {
    const clearBtn = document.getElementById('clear-data-btn');
    const modal = document.getElementById('confirm-modal');
    const confirmBtn = document.getElementById('confirm-clear');
    const cancelBtn = document.getElementById('cancel-clear');
    
    clearBtn.addEventListener('click', () => {
        modal.classList.add('show');
    });
    
    confirmBtn.addEventListener('click', () => {
        clearAllData();
        modal.classList.remove('show');
    });
    
    cancelBtn.addEventListener('click', () => {
        modal.classList.remove('show');
    });
    
    // Закрытие по клику вне модального окна
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('show');
        }
    });
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initClearModal();
    loadTodayData();
});
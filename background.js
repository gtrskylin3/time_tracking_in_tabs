let activeTabId = null;
let lastActiveTime = null;
let currentHost = null;

// Хранилище временных данных для текущей сессии
let sessionData = {};

// Период сохранения данных (в миллисекундах)
const SAVE_INTERVAL = 10000; // 10 секунд

// Получить hostname из URL
function getHost(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname || 'unknown';
  } catch (e) {
    return 'unknown';
  }
}

// Обновить время для текущего сайта
function updateTime() {
  if (activeTabId && lastActiveTime && currentHost && currentHost !== 'unknown') {
    const now = Date.now();
    const timeSpent = now - lastActiveTime;
    
    // Обновляем данные сессии
    sessionData[currentHost] = (sessionData[currentHost] || 0) + timeSpent;
    
    lastActiveTime = now;
  }
}

// Сохранить данные в chrome.storage.local
function saveData() {
  updateTime();

  const today = new Date().toISOString().split('T')[0];
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekKey = weekStart.toISOString().split('T')[0];

  // Получить существующие данные
  chrome.storage.local.get(['timeSpent', 'dailyData', 'weeklyData'], (result) => {
    let timeSpent = result.timeSpent || {};
    let dailyData = result.dailyData || {};
    let weeklyData = result.weeklyData || {};

    // Обновить данные за все время
    for (const [host, time] of Object.entries(sessionData)) {
      timeSpent[host] = (timeSpent[host] || 0) + time;
    }

    // Обновить данные за день
    dailyData[today] = dailyData[today] || {};
    for (const [host, time] of Object.entries(sessionData)) {
      dailyData[today][host] = (dailyData[today][host] || 0) + time;
    }

    // Обновить данные за неделю
    weeklyData[weekKey] = weeklyData[weekKey] || {};
    for (const [host, time] of Object.entries(sessionData)) {
      weeklyData[weekKey][host] = (weeklyData[weekKey][host] || 0) + time;
    }

    // Сохранить данные
    chrome.storage.local.set({
      timeSpent,
      dailyData,
      weeklyData
    }, () => {
      // Очистить sessionData после сохранения
      sessionData = {};
    });

    // Очистить старые дневные данные (старше 7 дней)
    cleanOldDailyData(dailyData);
    // Очистить старые недельные данные (старше 4 недель)
    cleanOldWeeklyData(weeklyData);
  });
}

// Очистка старых дневных данных
function cleanOldDailyData(dailyData) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const newDailyData = {};
  for (const [date, data] of Object.entries(dailyData)) {
    if (new Date(date) >= sevenDaysAgo) {
      newDailyData[date] = data;
    }
  }

  chrome.storage.local.set({ dailyData: newDailyData });
}

// Очистка старых недельных данных
function cleanOldWeeklyData(weeklyData) {
  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

  const newWeeklyData = {};
  for (const [week, data] of Object.entries(weeklyData)) {
    if (new Date(week) >= fourWeeksAgo) {
      newWeeklyData[week] = data;
    }
  }

  chrome.storage.local.set({ weeklyData: newWeeklyData });
}

// Обработчик переключения вкладок
chrome.tabs.onActivated.addListener((activeInfo) => {
  updateTime();
  activeTabId = activeInfo.tabId;

  chrome.tabs.get(activeTabId, (tab) => {
    if (tab && tab.url) {
      currentHost = getHost(tab.url);
      lastActiveTime = Date.now();
    } else {
      currentHost = null;
      lastActiveTime = null;
    }
  });
});

// Обработчик обновления вкладок
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tabId === activeTabId && changeInfo.url) {
    updateTime();
    currentHost = getHost(changeInfo.url);
    lastActiveTime = Date.now();
  }
});

// Обработчик фокуса окна
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    updateTime();
    activeTabId = null;
    currentHost = null;
    lastActiveTime = null;
  } else {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        activeTabId = tabs[0].id;
        currentHost = getHost(tabs[0].url);
        lastActiveTime = Date.now();
      }
    });
  }
});

// Периодическое сохранение данных
setInterval(saveData, SAVE_INTERVAL);

// Инициализация при запуске
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    timeSpent: {},
    dailyData: {},
    weeklyData: {}
  });
});

// Обработчик закрытия вкладок
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === activeTabId) {
    updateTime();
    activeTabId = null;
    currentHost = null;
    lastActiveTime = null;
  }
});
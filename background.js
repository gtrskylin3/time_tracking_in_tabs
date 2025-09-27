let activeUrl = null;
let startTime = null;
let timeSpent = {};

// Получить ключ для текущего дня
function getTodayKey() {
  const today = new Date();
  return today.toISOString().split('T')[0]; // YYYY-MM-DD
}

// Получить ключ для текущей недели
function getWeekKey() {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  return startOfWeek.toISOString().split('T')[0];
}

// Сохранить время с разбивкой по дням и неделям
function saveTime() {
  if (activeUrl && startTime) {
    const now = Date.now();
    const duration = now - startTime;
    const todayKey = getTodayKey();
    const weekKey = getWeekKey();
    
    // Загружаем существующие данные
    chrome.storage.local.get(['timeSpent', 'dailyData', 'weeklyData'], (result) => {
      const timeSpent = result.timeSpent || {};
      const dailyData = result.dailyData || {};
      const weeklyData = result.weeklyData || {};
      
      // Обновляем общее время
      timeSpent[activeUrl] = (timeSpent[activeUrl] || 0) + duration;
      
      // Обновляем дневные данные
      if (!dailyData[todayKey]) dailyData[todayKey] = {};
      dailyData[todayKey][activeUrl] = (dailyData[todayKey][activeUrl] || 0) + duration;
      
      // Обновляем недельные данные
      if (!weeklyData[weekKey]) weeklyData[weekKey] = {};
      weeklyData[weekKey][activeUrl] = (weeklyData[weekKey][activeUrl] || 0) + duration;
      
      // Сохраняем все данные
      chrome.storage.local.set({ 
        timeSpent, 
        dailyData, 
        weeklyData,
        lastUpdate: now
      });
    });
    
    startTime = now;
  }
}

// Проверить, является ли URL системным (не должен отслеживаться)
function isSystemUrl(url) {
  // Проверяем на валидность URL
  if (!url || typeof url !== 'string') {
    return true;
  }
  
  const systemUrls = [
    'developer.chrome.com',
    'newtab',
    'extensions',
    'chrome://',
    'chrome-extension://',
    'moz-extension://',
    'edge://',
    'about:',
    'null',
    'undefined'
  ];
  
  return systemUrls.some(systemUrl => 
    url.includes(systemUrl) || url.startsWith(systemUrl)
  );
}

function updateActiveTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length === 0) return;
    
    const tab = tabs[0];
    const url = tab.url;
    
    // Пропускаем если URL пустой, null или undefined
    if (!url || url === 'null' || url === 'undefined') {
      if (activeUrl) {
        saveTime();
        activeUrl = null;
        startTime = null;
      }
      return;
    }
    
    // Пропускаем системные URL
    if (isSystemUrl(url)) {
      if (activeUrl) {
        saveTime();
        activeUrl = null;
        startTime = null;
      }
      return;
    }
    
    try {
      const hostname = new URL(url).hostname;
      if (hostname !== activeUrl) {
        saveTime();
        activeUrl = hostname;
        startTime = Date.now();
      }
    } catch (error) {
      // Если не удается создать URL объект, пропускаем
      if (activeUrl) {
        saveTime();
        activeUrl = null;
        startTime = null;
      }
    }
  });
}

// Инициализация при запуске
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get(['timeSpent', 'dailyData', 'weeklyData'], (result) => {
    if (!result.timeSpent) {
      chrome.storage.local.set({ 
        timeSpent: {}, 
        dailyData: {}, 
        weeklyData: {},
        lastUpdate: Date.now()
      });
    }
  });
});

chrome.tabs.onActivated.addListener(updateActiveTab);
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.active && changeInfo.status === 'complete') updateActiveTab();
});
chrome.windows.onFocusChanged.addListener(updateActiveTab);
chrome.runtime.onSuspend.addListener(saveTime);

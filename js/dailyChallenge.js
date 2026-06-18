const AppDailyChallenge = (() => {
  const STORAGE_KEY_RECORDS = "zfl27DailyRecords";
  const STORAGE_KEY_SESSION = "zfl27DailySession";
  const MAX_HISTORY_DAYS = 7;

  const dailyTextPool = [
    ["晨露","暮雪","春山","秋水","寒梅","暖竹","清风","明月"],
    ["诗经","尚书","礼记","周易","春秋","论语","孟子","中庸","大学"],
    ["兰亭","寒食","多宝","玄秘","祭侄","争座","书谱","自叙","圣教","九成"],
    ["云想","春风","玉露","金风","柔情","佳期","纤云","银汉","迢迢","脉脉"],
    ["独坐","幽篁","弹琴","长啸","深林","明月","空山","新雨","晚秋","松林"],
    ["明月","松间","清泉","石上","竹喧","莲动","渔舟","王孙","春芳","可留"],
    ["空山","不见","人闻","语响","返景","深林","复照","青苔","入山","春尽"],
    ["千山","鸟飞","万径","人踪","孤舟","蓑笠","寒江","风雪","日暮","苍山"],
    ["白日","依山","黄河","入海","千里","一目","更上","高楼","大漠","长河"],
    ["葡萄","美酒","夜光","琵琶","马上","醉卧","沙场","古来","征战","几人"],
    ["国破","山河","城春","草木","感时","花溅","恨别","鸟惊","烽火","家书"],
    ["床前","明月","疑是","地上","举头","明月","低头","故乡","白发","三千"]
  ];

  function seededRandom(seed) {
    let x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  function seededRandomInt(seed, min, max) {
    return Math.floor(seededRandom(seed) * (max - min + 1)) + min;
  }

  function seededShuffle(arr, seed) {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(seededRandom(seed + i * 13) * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function getDateString(date) {
    const d = date || new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function getDateSeed(dateStr) {
    let hash = 0;
    for (let i = 0; i < dateStr.length; i++) {
      hash = ((hash << 5) - hash) + dateStr.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  function getEndOfDay(date) {
    const d = date ? new Date(date) : new Date();
    d.setHours(23, 59, 59, 999);
    return d.getTime();
  }

  function isSameDay(dateStr, date) {
    const d = date || new Date();
    return getDateString(d) === dateStr;
  }

  function generatePuzzleForDate(dateStr) {
    const seed = getDateSeed(dateStr);
    const poolIdx = seededRandomInt(seed, 0, dailyTextPool.length - 1);
    const basePool = dailyTextPool[poolIdx];

    const sizeSeed = seed + 7;
    const colsOptions = [3, 3, 4, 4, 5];
    const rowsOptions = [2, 3, 2, 3, 3];
    const sizeIdx = seededRandomInt(sizeSeed, 0, colsOptions.length - 1);
    const cols = colsOptions[sizeIdx];
    const rows = rowsOptions[sizeIdx];
    const total = cols * rows;

    const textPool = basePool.length >= total ? basePool : basePool.concat(basePool);
    const shuffledText = seededShuffle(textPool, seed + 31).slice(0, total);

    const themeKeys = {
      paper: Object.keys(AppData.themes.paper),
      ink: Object.keys(AppData.themes.ink),
      border: Object.keys(AppData.themes.border),
      table: Object.keys(AppData.themes.table)
    };

    const theme = {
      paper: themeKeys.paper[seededRandomInt(seed + 101, 0, themeKeys.paper.length - 1)],
      ink: themeKeys.ink[seededRandomInt(seed + 202, 0, themeKeys.ink.length - 1)],
      border: themeKeys.border[seededRandomInt(seed + 303, 0, themeKeys.border.length - 1)],
      table: themeKeys.table[seededRandomInt(seed + 404, 0, themeKeys.table.length - 1)]
    };

    const difficultySeed = seed + 505;
    const difficultyLevel = seededRandomInt(difficultySeed, 0, 2);
    const timeLimits = [150, 180, 210];
    const enableRotation = difficultyLevel >= 1;
    const enableFlip = difficultyLevel >= 2;
    const initialRotationScrambled = difficultyLevel >= 1;
    const initialFlipScrambled = difficultyLevel >= 2;

    let availableTools = ["zoom", "edgeAlign"];
    if (enableRotation) availableTools.push("rotateCw", "rotateCcw");
    if (enableFlip) availableTools.push("flip");

    const scatterSeed = seed + 606;
    const scatterKeys = Object.keys(AppData.scatterRules);
    const scatterRule = scatterKeys[seededRandomInt(scatterSeed, 0, scatterKeys.length - 1)];

    return {
      id: `daily-${dateStr}`,
      name: `每日残页 · ${dateStr}`,
      daily: true,
      dailyDate: dateStr,
      cols,
      rows,
      text: shuffledText,
      theme,
      timeLimit: timeLimits[difficultyLevel],
      hintPenalty: 80,
      scatterRule,
      enableRotation,
      enableFlip,
      initialRotationScrambled,
      initialFlipScrambled,
      availableTools
    };
  }

  function loadRecords() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_RECORDS);
      if (saved) {
        const data = JSON.parse(saved);
        if (Array.isArray(data)) return data;
      }
    } catch (e) {}
    return [];
  }

  function saveRecords(records) {
    localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(records));
  }

  function addOrUpdateRecord(record) {
    const records = loadRecords();
    const existingIdx = records.findIndex(r => r.date === record.date);
    if (existingIdx >= 0) {
      const existing = records[existingIdx];
      if (!existing.completed && record.completed) {
        records[existingIdx] = { ...existing, ...record };
      } else if (record.completed && record.score > existing.score) {
        records[existingIdx] = { ...existing, ...record };
      } else if (!existing.completed) {
        records[existingIdx] = { ...existing, ...record };
      }
    } else {
      records.push(record);
    }
    records.sort((a, b) => b.date.localeCompare(a.date));
    const trimmed = records.slice(0, MAX_HISTORY_DAYS);
    saveRecords(trimmed);
    return trimmed;
  }

  function getRecentRecords() {
    const records = loadRecords();
    const result = [];
    const today = new Date();
    for (let i = 0; i < MAX_HISTORY_DAYS; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = getDateString(d);
      const record = records.find(r => r.date === dateStr);
      result.push({
        date: dateStr,
        isToday: i === 0,
        completed: record ? record.completed : false,
        score: record ? record.score : null,
        usedTime: record ? record.usedTime : null,
        hintUsed: record ? record.hintUsed : false,
        hasAttempt: !!record
      });
    }
    return result;
  }

  function getTodayRecord() {
    const todayStr = getDateString();
    const records = loadRecords();
    return records.find(r => r.date === todayStr) || null;
  }

  function saveSession(session) {
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));
  }

  function loadSession() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SESSION);
      if (saved) {
        const data = JSON.parse(saved);
        if (data && data.date) {
          if (isSameDay(data.date)) {
            return data;
          } else {
            clearSession();
          }
        }
      }
    } catch (e) {}
    return null;
  }

  function clearSession() {
    localStorage.removeItem(STORAGE_KEY_SESSION);
  }

  function getCountdownMs() {
    return getEndOfDay() - Date.now();
  }

  function formatCountdown(ms) {
    if (ms <= 0) return "00:00:00";
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }

  let countdownTimer = null;
  let onCountdownUpdate = null;
  let onCountdownEnd = null;

  function startCountdownTimer() {
    stopCountdownTimer();
    const tick = () => {
      const remaining = getCountdownMs();
      if (onCountdownUpdate) onCountdownUpdate(formatCountdown(remaining), remaining);
      if (remaining <= 0) {
        stopCountdownTimer();
        if (onCountdownEnd) onCountdownEnd();
      }
    };
    tick();
    countdownTimer = setInterval(tick, 1000);
  }

  function stopCountdownTimer() {
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
  }

  function setCountdownCallbacks(callbacks) {
    if (callbacks.onUpdate) onCountdownUpdate = callbacks.onUpdate;
    if (callbacks.onEnd) onCountdownEnd = callbacks.onEnd;
  }

  function getTodayPuzzle() {
    const todayStr = getDateString();
    return generatePuzzleForDate(todayStr);
  }

  function getPuzzleByDate(dateStr) {
    return generatePuzzleForDate(dateStr);
  }

  function recordResult(result) {
    const todayStr = getDateString();
    const record = {
      date: todayStr,
      completed: result.win,
      score: result.score,
      usedTime: result.usedTime,
      hintUsed: result.hintUsed,
      completedAt: Date.now()
    };
    addOrUpdateRecord(record);
    clearSession();
    return record;
  }

  function recordSessionStart(gameState) {
    const todayStr = getDateString();
    const session = {
      date: todayStr,
      startedAt: Date.now(),
      state: "playing",
      gameState: gameState || null,
      lastSavedAt: Date.now()
    };
    saveSession(session);
    addOrUpdateRecord({
      date: todayStr,
      completed: false,
      score: 0,
      usedTime: 0,
      hintUsed: false,
      hasAttempt: true
    });
    return session;
  }

  function updateSessionGameState(gameState) {
    const session = loadSession();
    if (!session) return null;
    session.gameState = gameState;
    session.lastSavedAt = Date.now();
    saveSession(session);
    return session;
  }

  function getSessionGameState() {
    const session = loadSession();
    return session ? session.gameState : null;
  }

  function hasActiveSession() {
    const session = loadSession();
    return session !== null && session.state === "playing";
  }

  function renderRecordsPanel(containerEl, onRecordClick) {
    const records = getRecentRecords();
    let html = '';
    html += '<div class="daily-countdown-section">';
    html += '  <div class="daily-countdown-label">距今日挑战结束</div>';
    html += '  <div class="daily-countdown-time" id="dailyCountdownTime">00:00:00</div>';
    html += '</div>';
    html += '<div class="daily-records-list">';

    records.forEach(rec => {
      const dateLabel = rec.isToday ? '今天' : formatDateLabel(rec.date);
      let statusClass = '';
      let statusText = '';
      if (rec.isToday) {
        if (rec.completed) {
          statusClass = 'daily-status-completed';
          statusText = '已完成';
        } else if (rec.hasAttempt) {
          statusClass = 'daily-status-playing';
          statusText = '挑战中';
        } else {
          statusClass = 'daily-status-available';
          statusText = '待挑战';
        }
      } else {
        if (rec.completed) {
          statusClass = 'daily-status-completed';
          statusText = '已完成';
        } else if (rec.hasAttempt) {
          statusClass = 'daily-status-failed';
          statusText = '未通过';
        } else {
          statusClass = 'daily-status-missed';
          statusText = '未参与';
        }
      }

      const scoreHtml = rec.score !== null
        ? `<div class="daily-rec-score"><span>得分</span><span class="val">${rec.score}</span></div>`
        : `<div class="daily-rec-score"><span>得分</span><span class="val muted">—</span></div>`;

      const timeHtml = rec.usedTime !== null
        ? `<div class="daily-rec-time"><span>用时</span><span class="val">${rec.usedTime}秒</span></div>`
        : `<div class="daily-rec-time"><span>用时</span><span class="val muted">—</span></div>`;

      const clickable = rec.isToday ? 'daily-rec-clickable' : '';
      const cursor = rec.isToday ? 'style="cursor:pointer"' : '';

      html += `<div class="daily-record-card ${statusClass} ${clickable}" data-date="${rec.date}" ${cursor}>`;
      html += '  <div class="daily-rec-header">';
      html += `    <span class="daily-rec-date">${dateLabel}</span>`;
      html += `    <span class="daily-rec-status">${statusText}</span>`;
      html += '  </div>';
      html += `  ${scoreHtml}${timeHtml}`;
      if (rec.hintUsed) {
        html += '  <div class="daily-rec-hint">使用了提示</div>';
      }
      html += '</div>';
    });

    html += '</div>';
    containerEl.innerHTML = html;

    if (onRecordClick) {
      containerEl.querySelectorAll('.daily-rec-clickable').forEach(card => {
        card.addEventListener('click', () => {
          const dateStr = card.dataset.date;
          onRecordClick(dateStr);
        });
      });
    }
  }

  function formatDateLabel(dateStr) {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parseInt(parts[1])}月${parseInt(parts[2])}日`;
    }
    return dateStr;
  }

  function updateCountdownDisplay() {
    const el = document.getElementById('dailyCountdownTime');
    if (el) {
      el.textContent = formatCountdown(getCountdownMs());
    }
  }

  return {
    generatePuzzleForDate,
    getTodayPuzzle,
    getPuzzleByDate,
    getDateString,
    getRecentRecords,
    getTodayRecord,
    addOrUpdateRecord,
    recordResult,
    recordSessionStart,
    updateSessionGameState,
    getSessionGameState,
    hasActiveSession,
    loadSession,
    saveSession,
    clearSession,
    getCountdownMs,
    formatCountdown,
    startCountdownTimer,
    stopCountdownTimer,
    setCountdownCallbacks,
    renderRecordsPanel,
    updateCountdownDisplay,
    isSameDay
  };
})();

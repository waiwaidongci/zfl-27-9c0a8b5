const AppLibrary = (() => {
  const STORAGE_KEY = "zfl27Library";
  const NOTES_KEY = "zfl27LibraryNotes";

  let currentSort = "completionDate";
  let currentSortDir = "desc";
  let filterHint = "all";
  let filterPaper = "all";
  let filterType = "all";
  let filterStatus = "all";
  let currentView = "library";
  let onExit = null;
  let onStartPuzzle = null;
  let savedGameState = null;

  const colophonTemplates = {
    perfect: [
      "此页修补精妙，毫发无伤，堪称完美。阅者当珍之重之。",
      "匠心独运，天衣无缝。此残页得此修补，可谓物归原貌。",
      "纤毫毕现，无一处瑕疵，真乃修补之典范也。"
    ],
    excellent: [
      "此页修补甚佳，虽微有瑕疵，然整体可观，足堪入藏。",
      "修补有方，大节不亏。此残页重见天光，实为幸事。",
      "功夫扎实，修补得当。残页虽旧，焕然有新意。"
    ],
    good: [
      "此页修补尚可，略有疏漏，然亦属不易。",
      "修补成页，虽非完美，亦足珍赏。再接再厉可也。",
      "残页归位，修补初成。来日再修，当更精进。"
    ],
    pass: [
      "此页勉强成篇，尚有改进余地。勤加练习，必有所成。",
      "修补虽成，颇费周折。持之以恒，定当改观。"
    ],
    barely: [
      "此页修补维艰，勉力成篇。假以时日，当能修得更佳。",
      "残页虽复，然修补粗糙。须知磨刀不误砍柴工。"
    ]
  };

  function generateColophon(rating, hintUsed, usedTime) {
    let category;
    if (rating.includes("完美")) category = "perfect";
    else if (rating.includes("优秀")) category = "excellent";
    else if (rating.includes("良好")) category = "good";
    else if (rating.includes("合格")) category = "pass";
    else category = "barely";

    const templates = colophonTemplates[category];
    const base = templates[Math.floor(Math.random() * templates.length)];

    let suffix = "";
    if (hintUsed) {
      suffix = "修补途中偶借外力，虽非全凭己功，亦算通权达变。";
    }
    if (usedTime !== null && usedTime < 60) {
      suffix = (suffix ? suffix.slice(0, -1) + "，" : "") + "用时仅" + usedTime + "秒，手眼俱快，令人赞叹。";
    }

    return base + (suffix ? " " + suffix : "");
  }

  function loadLibrary() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (Array.isArray(data)) return data;
      }
    } catch (e) {}
    return [];
  }

  function saveLibrary(records) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }

  function loadNotes() {
    try {
      const saved = localStorage.getItem(NOTES_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (typeof data === "object") return data;
      }
    } catch (e) {}
    return {};
  }

  function saveNotes(notes) {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  }

  function addOrUpdateEntry(puzzleId, entry) {
    const records = loadLibrary();
    const existingIdx = records.findIndex(r => r.puzzleId === puzzleId);
    if (existingIdx >= 0) {
      const existing = records[existingIdx];
      records[existingIdx] = {
        ...existing,
        ...entry,
        bestScore: Math.max(existing.bestScore || 0, entry.bestScore || 0),
        bestTime: existing.bestTime !== null && entry.bestTime !== null
          ? Math.min(existing.bestTime, entry.bestTime)
          : (entry.bestTime !== null ? entry.bestTime : existing.bestTime),
        hintUsed: existing.hintUsed || entry.hintUsed,
        completionDate: entry.completionDate || existing.completionDate,
        rating: entry.rating || existing.rating,
        colophon: entry.colophon || existing.colophon,
        text: entry.text || existing.text,
        theme: entry.theme || existing.theme,
        name: entry.name || existing.name,
        cols: entry.cols || existing.cols,
        rows: entry.rows || existing.rows,
        puzzleId: puzzleId
      };
    } else {
      records.push({ puzzleId, ...entry });
    }
    saveLibrary(records);
    return records;
  }

  function getNote(puzzleId) {
    const notes = loadNotes();
    return notes[puzzleId] || "";
  }

  function setNote(puzzleId, text) {
    const notes = loadNotes();
    if (text && text.trim()) {
      notes[puzzleId] = text.trim();
    } else {
      delete notes[puzzleId];
    }
    saveNotes(notes);
  }

  function deleteNote(puzzleId) {
    const notes = loadNotes();
    delete notes[puzzleId];
    saveNotes(notes);
  }

  function deleteEntry(puzzleId) {
    const records = loadLibrary();
    const filtered = records.filter(r => r.puzzleId !== puzzleId);
    saveLibrary(filtered);
    deleteNote(puzzleId);
    return filtered;
  }

  function getFilteredSorted() {
    let records = loadLibrary();
    const notes = loadNotes();

    if (filterHint === "yes") {
      records = records.filter(r => r.hintUsed);
    } else if (filterHint === "no") {
      records = records.filter(r => !r.hintUsed);
    }

    if (filterPaper !== "all") {
      records = records.filter(r => r.theme && r.theme.paper === filterPaper);
    }

    if (filterType === "daily") {
      records = records.filter(r => r.daily);
    } else if (filterType === "builtin") {
      records = records.filter(r => !r.daily && r.puzzleId && r.puzzleId.startsWith("builtin-"));
    } else if (filterType === "custom") {
      records = records.filter(r => !r.daily && r.puzzleId && r.puzzleId.startsWith("custom-"));
    }

    if (filterStatus === "completed") {
      records = records.filter(r => r.bestScore > 0);
    } else if (filterStatus === "perfect") {
      records = records.filter(r => r.rating && r.rating.includes("完美"));
    }

    records.forEach(r => {
      r.note = notes[r.puzzleId] || "";
    });

    records.sort((a, b) => {
      let va, vb;
      switch (currentSort) {
        case "bestScore":
          va = a.bestScore || 0;
          vb = b.bestScore || 0;
          break;
        case "bestTime":
          va = a.bestTime !== null ? a.bestTime : 99999;
          vb = b.bestTime !== null ? b.bestTime : 99999;
          break;
        case "name":
          va = a.name || "";
          vb = b.name || "";
          return currentSortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
        case "completionDate":
        default:
          va = a.completionDate || 0;
          vb = b.completionDate || 0;
          break;
      }
      return currentSortDir === "asc" ? va - vb : vb - va;
    });

    return records;
  }

  function setSort(field) {
    if (currentSort === field) {
      currentSortDir = currentSortDir === "asc" ? "desc" : "asc";
    } else {
      currentSort = field;
      currentSortDir = field === "bestScore" ? "desc" : "asc";
      if (field === "completionDate") currentSortDir = "desc";
    }
  }

  function setFilter(type, value) {
    switch (type) {
      case "hint": filterHint = value; break;
      case "paper": filterPaper = value; break;
      case "type": filterType = value; break;
      case "status": filterStatus = value; break;
    }
  }

  function setOnExit(handler) {
    onExit = handler;
  }

  function setOnStartPuzzle(handler) {
    onStartPuzzle = handler;
  }

  function open() {
    const libraryView = document.querySelector(".library-view");
    const gameView = document.querySelector(".game-view");
    if (libraryView) libraryView.classList.add("active");
    if (gameView) gameView.classList.add("hidden-view");
    render();
  }

  function close() {
    const libraryView = document.querySelector(".library-view");
    const gameView = document.querySelector(".game-view");
    if (libraryView) libraryView.classList.remove("active");
    if (gameView) gameView.classList.remove("hidden-view");
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function renderFullPageText(entry) {
    if (!entry.text || !entry.cols || !entry.rows) return "";
    let html = '<div class="lib-full-text-grid" style="grid-template-columns:repeat(' + entry.cols + ',1fr)">';
    entry.text.forEach(t => {
      html += '<div class="lib-full-text-cell">' + escapeHtml(t) + '</div>';
    });
    html += '</div>';
    return html;
  }

  function renderThemeInfo(theme) {
    if (!theme) return "";
    const paperName = AppData.themes.paper[theme.paper] ? AppData.themes.paper[theme.paper].name : theme.paper;
    const inkName = AppData.themes.ink[theme.ink] ? AppData.themes.ink[theme.ink].name : theme.ink;
    const borderName = AppData.themes.border[theme.border] ? AppData.themes.border[theme.border].name : theme.border;
    const tableName = AppData.themes.table[theme.table] ? AppData.themes.table[theme.table].name : theme.table;
    return '<div class="lib-theme-row"><span>纸张</span><span>' + paperName + '</span></div>' +
           '<div class="lib-theme-row"><span>墨色</span><span>' + inkName + '</span></div>' +
           '<div class="lib-theme-row"><span>边框</span><span>' + borderName + '</span></div>' +
           '<div class="lib-theme-row"><span>台面</span><span>' + tableName + '</span></div>';
  }

  function renderSortControls() {
    const sortOptions = [
      { key: "completionDate", label: "完成日期" },
      { key: "bestScore", label: "最佳得分" },
      { key: "bestTime", label: "最快用时" },
      { key: "name", label: "名称" }
    ];
    let html = '<div class="lib-sort-bar">';
    html += '<span class="lib-sort-label">排序：</span>';
    sortOptions.forEach(opt => {
      const isActive = currentSort === opt.key;
      const arrow = isActive ? (currentSortDir === "asc" ? " ↑" : " ↓") : "";
      html += '<button class="lib-sort-btn' + (isActive ? ' active' : '') + '" data-sort="' + opt.key + '">' + opt.label + arrow + '</button>';
    });
    html += '</div>';
    return html;
  }

  function renderFilterControls() {
    let html = '<div class="lib-filter-bar">';
    html += '<div class="lib-filter-group"><span class="lib-filter-label">类型：</span>';
    html += '<button class="lib-filter-btn' + (filterType === "all" ? ' active' : '') + '" data-filter-type="type" data-filter-val="all">全部</button>';
    html += '<button class="lib-filter-btn' + (filterType === "daily" ? ' active' : '') + '" data-filter-type="type" data-filter-val="daily">每日残页</button>';
    html += '<button class="lib-filter-btn' + (filterType === "builtin" ? ' active' : '') + '" data-filter-type="type" data-filter-val="builtin">内置</button>';
    html += '<button class="lib-filter-btn' + (filterType === "custom" ? ' active' : '') + '" data-filter-type="type" data-filter-val="custom">自定义</button>';
    html += '</div>';

    html += '<div class="lib-filter-group"><span class="lib-filter-label">提示：</span>';
    html += '<button class="lib-filter-btn' + (filterHint === "all" ? ' active' : '') + '" data-filter-type="hint" data-filter-val="all">全部</button>';
    html += '<button class="lib-filter-btn' + (filterHint === "yes" ? ' active' : '') + '" data-filter-type="hint" data-filter-val="yes">用过</button>';
    html += '<button class="lib-filter-btn' + (filterHint === "no" ? ' active' : '') + '" data-filter-type="hint" data-filter-val="no">未用</button>';
    html += '</div>';

    html += '<div class="lib-filter-group"><span class="lib-filter-label">纸张：</span>';
    html += '<button class="lib-filter-btn' + (filterPaper === "all" ? ' active' : '') + '" data-filter-type="paper" data-filter-val="all">全部</button>';
    Object.keys(AppData.themes.paper).forEach(key => {
      const name = AppData.themes.paper[key].name;
      const isActive = filterPaper === key;
      html += '<button class="lib-filter-btn' + (isActive ? ' active' : '') + '" data-filter-type="paper" data-filter-val="' + key + '">' + name + '</button>';
    });
    html += '</div>';
    html += '</div>';
    return html;
  }

  function renderCard(entry) {
    const previewColors = entry.theme ? AppData.getThemePreviewColor(entry.theme) : { paper: "#f7ebcd", ink: "#2b251d" };
    let ratingClass = "";
    if (entry.rating) {
      if (entry.rating.includes("完美")) ratingClass = "lib-rating-perfect";
      else if (entry.rating.includes("优秀")) ratingClass = "lib-rating-excellent";
      else if (entry.rating.includes("良好")) ratingClass = "lib-rating-good";
      else ratingClass = "lib-rating-pass";
    }

    const completedDate = entry.completionDate ? new Date(entry.completionDate) : null;
    const dateStr = completedDate
      ? completedDate.getFullYear() + '/' + String(completedDate.getMonth() + 1).padStart(2, '0') + '/' + String(completedDate.getDate()).padStart(2, '0')
      : "未知";

    let typeTag = "";
    if (entry.daily) {
      typeTag = '<span class="lib-type-tag lib-type-daily">每日</span>';
    } else if (entry.puzzleId && entry.puzzleId.startsWith("custom-")) {
      typeTag = '<span class="lib-type-tag lib-type-custom">自定义</span>';
    } else {
      typeTag = '<span class="lib-type-tag lib-type-builtin">内置</span>';
    }

    let html = '<div class="lib-card" data-puzzle-id="' + entry.puzzleId + '">';

    html += '<div class="lib-card-header">';
    html += '<div class="lib-card-title-row">';
    html += '<span class="lib-card-name">' + typeTag + ' ' + escapeHtml(entry.name || entry.puzzleId) + '</span>';
    if (entry.rating) {
      html += '<span class="lib-card-rating ' + ratingClass + '">' + escapeHtml(entry.rating) + '</span>';
    }
    html += '</div>';
    html += '<div class="lib-card-date">入藏日期：' + dateStr + '</div>';
    html += '</div>';

    html += '<div class="lib-card-body">';

    html += '<div class="lib-card-preview">';
    html += renderFullPageText(entry);
    html += '<div class="lib-theme-dots"><div class="theme-dot" style="background:' + previewColors.paper + ';border-color:' + previewColors.ink + '"></div><div class="theme-dot" style="background:' + previewColors.ink + '"></div></div>';
    html += '</div>';

    html += '<div class="lib-card-info">';
    html += '<div class="lib-stat-row"><span>最佳得分</span><span class="lib-stat-val">' + (entry.bestScore || 0) + '</span></div>';
    html += '<div class="lib-stat-row"><span>最快用时</span><span class="lib-stat-val">' + (entry.bestTime !== null ? entry.bestTime + '秒' : '-') + '</span></div>';
    html += '<div class="lib-stat-row"><span>使用提示</span><span class="lib-stat-val ' + (entry.hintUsed ? 'lib-hint-yes' : '') + '">' + (entry.hintUsed ? '是' : '否') + '</span></div>';
    html += '<div class="lib-theme-info">' + renderThemeInfo(entry.theme) + '</div>';
    html += '</div>';

    html += '</div>';

    if (entry.colophon) {
      html += '<div class="lib-card-colophon">';
      html += '<div class="lib-colophon-label">通关题跋</div>';
      html += '<div class="lib-colophon-text">' + escapeHtml(entry.colophon) + '</div>';
      html += '</div>';
    }

    html += '<div class="lib-card-note">';
    html += '<div class="lib-note-label">藏书备注</div>';
    if (entry.note) {
      html += '<div class="lib-note-text" data-puzzle-id="' + entry.puzzleId + '">' + escapeHtml(entry.note) + '</div>';
      html += '<div class="lib-note-actions">';
      html += '<button class="lib-note-edit-btn" data-puzzle-id="' + entry.puzzleId + '">编辑备注</button>';
      html += '<button class="lib-note-delete-btn" data-puzzle-id="' + entry.puzzleId + '">删除备注</button>';
      html += '</div>';
    } else {
      html += '<div class="lib-note-empty">暂无备注</div>';
      html += '<div class="lib-note-actions">';
      html += '<button class="lib-note-edit-btn" data-puzzle-id="' + entry.puzzleId + '">添加备注</button>';
      html += '</div>';
    }
    html += '</div>';

    html += '<div class="lib-card-actions">';
    html += '<button class="lib-start-btn" data-puzzle-id="' + entry.puzzleId + '">再次挑战</button>';
    html += '</div>';

    html += '</div>';
    return html;
  }

  function renderTabBar() {
    let html = '<div class="lib-tab-bar">';
    html += '<button class="lib-tab-btn' + (currentView === "library" ? ' active' : '') + '" data-view="library">藏书阁</button>';
    html += '<button class="lib-tab-btn' + (currentView === "stats" ? ' active' : '') + '" data-view="stats">修补统计</button>';
    html += '</div>';
    return html;
  }

  function renderStats() {
    const stats = getStats();
    const records = loadLibrary();
    const paperName = stats.mostUsedPaper && AppData.themes.paper[stats.mostUsedPaper]
      ? AppData.themes.paper[stats.mostUsedPaper].name
      : "暂无";

    let html = '<div class="lib-breadcrumb">';
    html += '<span class="crumb" id="libraryBackBtn">← 返回修补台</span>';
    html += '<span class="sep">›</span>';
    html += '<span class="current">修补统计</span>';
    html += '</div>';

    html += renderTabBar();

    html += '<div class="stats-header">';
    html += '<h2>修补统计</h2>';
    html += '<div class="stats-subtitle">累计入藏 <b>' + stats.total + '</b> 页残卷</div>';
    html += '</div>';

    html += '<div class="stats-grid">';
    html += '<div class="stat-card" data-filter="total">';
    html += '<div class="stat-icon">📚</div>';
    html += '<div class="stat-value">' + stats.total + '</div>';
    html += '<div class="stat-label">总入藏数</div>';
    html += '<div class="stat-hint">点击查看全部</div>';
    html += '</div>';

    html += '<div class="stat-card stat-perfect" data-filter="perfect">';
    html += '<div class="stat-icon">✨</div>';
    html += '<div class="stat-value">' + stats.perfectCount + '</div>';
    html += '<div class="stat-label">完美修补</div>';
    html += '<div class="stat-hint">点击查看</div>';
    html += '</div>';

    html += '<div class="stat-card stat-no-hint" data-filter="noHint">';
    html += '<div class="stat-icon">🎯</div>';
    html += '<div class="stat-value">' + stats.noHintCount + '</div>';
    html += '<div class="stat-label">无提示完成</div>';
    html += '<div class="stat-hint">点击查看</div>';
    html += '</div>';

    html += '<div class="stat-card" data-filter="avgScore">';
    html += '<div class="stat-icon">📊</div>';
    html += '<div class="stat-value">' + stats.avgScore + '</div>';
    html += '<div class="stat-label">平均得分</div>';
    html += '<div class="stat-hint">基于已完成</div>';
    html += '</div>';

    html += '<div class="stat-card" data-filter="fastest">';
    html += '<div class="stat-icon">⚡</div>';
    html += '<div class="stat-value">' + (stats.fastestTime !== null ? stats.fastestTime + '秒' : '-') + '</div>';
    html += '<div class="stat-label">最快用时</div>';
    html += '<div class="stat-hint">' + (stats.fastestTime !== null ? '点击查看' : '暂无记录') + '</div>';
    html += '</div>';

    html += '<div class="stat-card stat-paper" data-filter="paper" data-paper="' + (stats.mostUsedPaper || '') + '">';
    html += '<div class="stat-icon">📜</div>';
    html += '<div class="stat-value">' + paperName + '</div>';
    html += '<div class="stat-label">常用纸张</div>';
    html += '<div class="stat-hint">' + (stats.mostUsedPaperCount > 0 ? '共' + stats.mostUsedPaperCount + '页 · 点击查看' : '暂无记录') + '</div>';
    html += '</div>';
    html += '</div>';

    html += '<div class="stats-section">';
    html += '<h3 class="stats-section-title">类型分布</h3>';
    html += '<div class="type-breakdown">';
    html += '<div class="type-item" data-filter="type" data-type="builtin">';
    html += '<div class="type-bar-wrap"><div class="type-bar type-builtin" style="height:' + (stats.total > 0 ? (stats.typeBreakdown.builtin / stats.total * 100) : 0) + '%"></div></div>';
    html += '<div class="type-value">' + stats.typeBreakdown.builtin + '</div>';
    html += '<div class="type-label">内置</div>';
    html += '</div>';
    html += '<div class="type-item" data-filter="type" data-type="custom">';
    html += '<div class="type-bar-wrap"><div class="type-bar type-custom" style="height:' + (stats.total > 0 ? (stats.typeBreakdown.custom / stats.total * 100) : 0) + '%"></div></div>';
    html += '<div class="type-value">' + stats.typeBreakdown.custom + '</div>';
    html += '<div class="type-label">自定义</div>';
    html += '</div>';
    html += '<div class="type-item" data-filter="type" data-type="daily">';
    html += '<div class="type-bar-wrap"><div class="type-bar type-daily" style="height:' + (stats.total > 0 ? (stats.typeBreakdown.daily / stats.total * 100) : 0) + '%"></div></div>';
    html += '<div class="type-value">' + stats.typeBreakdown.daily + '</div>';
    html += '<div class="type-label">每日残页</div>';
    html += '</div>';
    html += '</div>';
    html += '</div>';

    html += '<div class="stats-section">';
    html += '<h3 class="stats-section-title">最近完成趋势（近7天）</h3>';
    html += '<div class="trend-chart">';
    const maxCount = Math.max(...stats.recentTrend.map(d => d.count), 1);
    stats.recentTrend.forEach(day => {
      const heightPercent = day.count > 0 ? (day.count / maxCount * 100) : 0;
      html += '<div class="trend-day">';
      html += '<div class="trend-bar-wrap">';
      html += '<div class="trend-bar" style="height:' + heightPercent + '%"></div>';
      html += '</div>';
      html += '<div class="trend-count">' + day.count + '</div>';
      html += '<div class="trend-date">' + day.date + '</div>';
      html += '</div>';
    });
    html += '</div>';
    html += '</div>';

    if (records.length === 0) {
      html += '<div class="lib-empty">';
      html += '<div class="lib-empty-icon">📖</div>';
      html += '<div class="lib-empty-text">尚无统计数据</div>';
      html += '<div class="lib-empty-hint">完成修补后的残页将自动收入藏书阁并更新统计</div>';
      html += '</div>';
    }

    return html;
  }

  function renderLibrary() {
    const records = getFilteredSorted();

    let html = '<div class="lib-breadcrumb">';
    html += '<span class="crumb" id="libraryBackBtn">← 返回修补台</span>';
    html += '<span class="sep">›</span>';
    html += '<span class="current">藏书阁</span>';
    html += '</div>';

    html += renderTabBar();

    html += '<div class="lib-header">';
    html += '<h2>藏书阁</h2>';
    html += '<div class="lib-count">已入藏 <b>' + records.length + '</b> 页残卷</div>';
    html += '</div>';

    html += renderSortControls();
    html += renderFilterControls();

    if (records.length === 0) {
      html += '<div class="lib-empty">';
      html += '<div class="lib-empty-icon">📖</div>';
      html += '<div class="lib-empty-text">藏书阁尚无残页</div>';
      html += '<div class="lib-empty-hint">完成修补后的残页将自动收入藏书阁</div>';
      html += '</div>';
    } else {
      html += '<div class="lib-cards">';
      records.forEach(entry => {
        html += renderCard(entry);
      });
      html += '</div>';
    }

    return html;
  }

  function render() {
    const container = document.querySelector("#libraryContainer");
    if (!container) return;

    let html;
    if (currentView === "stats") {
      html = renderStats();
    } else {
      html = renderLibrary();
    }

    container.innerHTML = html;
    bindEvents();
  }

  function showNoteEditor(puzzleId) {
    const currentNote = getNote(puzzleId);
    const overlay = document.createElement("div");
    overlay.className = "lib-note-overlay";
    overlay.innerHTML = '<div class="lib-note-modal">' +
      '<h3>编辑藏书备注</h3>' +
      '<textarea class="lib-note-textarea" placeholder="在此书写备注……">' + escapeHtml(currentNote) + '</textarea>' +
      '<div class="lib-note-modal-actions">' +
      '<button class="lib-note-modal-cancel secondary">取消</button>' +
      '<button class="lib-note-modal-save">保存</button>' +
      '</div>' +
      '</div>';
    document.body.appendChild(overlay);

    const textarea = overlay.querySelector(".lib-note-textarea");
    textarea.focus();

    overlay.querySelector(".lib-note-modal-cancel").onclick = () => {
      overlay.remove();
    };

    overlay.querySelector(".lib-note-modal-save").onclick = () => {
      setNote(puzzleId, textarea.value);
      overlay.remove();
      render();
    };

    overlay.onclick = (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    };
  }

  function handleDeleteNote(puzzleId) {
    if (!confirm("确定要删除这条备注吗？")) return;
    deleteNote(puzzleId);
    render();
  }

  function handleStatClick(statFilter, data) {
    filterHint = "all";
    filterPaper = "all";
    filterType = "all";
    filterStatus = "all";
    currentSort = "completionDate";
    currentSortDir = "desc";

    switch (statFilter) {
      case "total":
        break;
      case "perfect":
        filterStatus = "perfect";
        break;
      case "noHint":
        setFilter("hint", "no");
        break;
      case "avgScore":
        currentSort = "bestScore";
        currentSortDir = "desc";
        break;
      case "fastest":
        currentSort = "bestTime";
        currentSortDir = "asc";
        break;
      case "paper":
        if (data && data.paper) {
          setFilter("paper", data.paper);
        }
        break;
      case "type":
        if (data && data.type) {
          setFilter("type", data.type);
        }
        break;
    }

    currentView = "library";
    render();
  }

  function bindEvents() {
    const backBtn = document.querySelector("#libraryBackBtn");
    if (backBtn) {
      backBtn.onclick = () => {
        close();
        if (onExit) onExit();
      };
    }

    document.querySelectorAll(".lib-tab-btn").forEach(btn => {
      btn.onclick = () => {
        currentView = btn.dataset.view;
        render();
      };
    });

    document.querySelectorAll(".stat-card").forEach(card => {
      const filterType = card.dataset.filter;
      if (!filterType) return;
      if (filterType === "avgScore") return;

      card.style.cursor = "pointer";
      card.onclick = () => {
        const paper = card.dataset.paper;
        handleStatClick(filterType, { paper });
      };
    });

    document.querySelectorAll(".type-item").forEach(item => {
      item.onclick = () => {
        const type = item.dataset.type;
        handleStatClick("type", { type });
      };
    });

    document.querySelectorAll(".lib-sort-btn").forEach(btn => {
      btn.onclick = () => {
        setSort(btn.dataset.sort);
        render();
      };
    });

    document.querySelectorAll(".lib-filter-btn").forEach(btn => {
      btn.onclick = () => {
        setFilter(btn.dataset.filterType, btn.dataset.filterVal);
        render();
      };
    });

    document.querySelectorAll(".lib-note-edit-btn").forEach(btn => {
      btn.onclick = () => {
        showNoteEditor(btn.dataset.puzzleId);
      };
    });

    document.querySelectorAll(".lib-note-delete-btn").forEach(btn => {
      btn.onclick = () => {
        handleDeleteNote(btn.dataset.puzzleId);
      };
    });

    document.querySelectorAll(".lib-start-btn").forEach(btn => {
      btn.onclick = () => {
        handleStartPuzzle(btn.dataset.puzzleId);
      };
    });
  }

  function handleStartPuzzle(puzzleId) {
    if (!onStartPuzzle) return;
    close();
    onStartPuzzle(puzzleId);
    if (onExit) onExit();
  }

  function getStats() {
    const records = loadLibrary();
    const completedRecords = records.filter(r => r.bestScore > 0);

    const total = records.length;
    const perfectCount = records.filter(r => r.rating && r.rating.includes("完美")).length;
    const noHintCount = records.filter(r => !r.hintUsed).length;
    const avgScore = completedRecords.length > 0
      ? Math.round(completedRecords.reduce((s, r) => s + (r.bestScore || 0), 0) / completedRecords.length)
      : 0;

    const times = completedRecords
      .filter(r => r.bestTime !== null && r.bestTime !== undefined)
      .map(r => r.bestTime);
    const fastestTime = times.length > 0 ? Math.min(...times) : null;

    const paperCount = {};
    records.forEach(r => {
      if (r.theme && r.theme.paper) {
        paperCount[r.theme.paper] = (paperCount[r.theme.paper] || 0) + 1;
      }
    });
    let mostUsedPaper = null;
    let maxPaperCount = 0;
    Object.keys(paperCount).forEach(p => {
      if (paperCount[p] > maxPaperCount) {
        maxPaperCount = paperCount[p];
        mostUsedPaper = p;
      }
    });

    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now - i * oneDay);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);
      const count = completedRecords.filter(r =>
        r.completionDate && r.completionDate >= dayStart.getTime() && r.completionDate <= dayEnd.getTime()
      ).length;
      const dateStr = (dayStart.getMonth() + 1) + '/' + dayStart.getDate();
      last7Days.push({ date: dateStr, count });
    }

    const typeBreakdown = {
      builtin: records.filter(r => !r.daily && r.puzzleId && r.puzzleId.startsWith("builtin-")).length,
      custom: records.filter(r => !r.daily && r.puzzleId && r.puzzleId.startsWith("custom-")).length,
      daily: records.filter(r => r.daily).length
    };

    return {
      total,
      perfectCount,
      noHintCount,
      avgScore,
      fastestTime,
      mostUsedPaper,
      mostUsedPaperCount: maxPaperCount,
      recentTrend: last7Days,
      typeBreakdown,
      paperCount
    };
  }

  return {
    open,
    close,
    render,
    addOrUpdateEntry,
    deleteEntry,
    getNote,
    setNote,
    deleteNote,
    generateColophon,
    getFilteredSorted,
    setSort,
    setFilter,
    setOnExit,
    setOnStartPuzzle,
    getStats,
    loadLibrary
  };
})();

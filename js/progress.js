const AppProgress = (() => {
  let progress = [];
  let onLevelClick = null;
  let onDeleteCustom = null;
  let onEditCustom = null;

  function init() {
    progress = loadProgress();
  }

  function loadProgress() {
    let data = AppStorage.getProgress();
    const allPuzzles = AppData.getAllPuzzles();
    if (Array.isArray(data) && data.length >= AppData.getBuiltinCount()) {
      const result = [];
      for (let i = 0; i < allPuzzles.length; i++) {
        if (i < data.length && data[i]) {
          result.push(data[i]);
        } else {
          result.push(createDefaultProgress(i));
        }
      }
      return result;
    }
    return createDefaultProgressArray();
  }

  function createDefaultProgressArray() {
    const allPuzzles = AppData.getAllPuzzles();
    return allPuzzles.map((_, i) => createDefaultProgress(i));
  }

  function createDefaultProgress(index) {
    return {
      completed: false,
      bestScore: 0,
      bestTime: null,
      hintUsed: false,
      unlocked: index === 0,
      colophon: ""
    };
  }

  function ensureProgressSize() {
    const allPuzzles = AppData.getAllPuzzles();
    while (progress.length < allPuzzles.length) {
      const idx = progress.length;
      progress.push(createDefaultProgress(idx));
    }
    while (progress.length > allPuzzles.length) {
      progress.pop();
    }
  }

  function saveProgress() {
    AppStorage.setProgress(progress);
  }

  function getProgress() {
    ensureProgressSize();
    return progress;
  }

  function getProgressAt(index) {
    ensureProgressSize();
    return progress[index];
  }

  function updateProgress(index, updates) {
    ensureProgressSize();
    progress[index] = { ...progress[index], ...updates };
    saveProgress();
  }

  function unlockNext(currentIndex) {
    ensureProgressSize();
    const nextIndex = currentIndex + 1;
    if (nextIndex < progress.length) {
      progress[nextIndex].unlocked = true;
      saveProgress();
    }
  }

  function handleCustomDeleted(deleteIndex) {
    if (deleteIndex < 0 || deleteIndex >= progress.length) return;
    progress.splice(deleteIndex, 1);
    ensureProgressSize();
    saveProgress();
  }

  function rebuildProgressForCustoms() {
    const oldProgress = [...progress];
    const allPuzzles = AppData.getAllPuzzles();
    progress = allPuzzles.map((puzzle, i) => {
      const oldIdx = oldProgress.findIndex((_, j) => {
        const oldAll = getOldAllPuzzlesSnapshot();
        return oldAll[j] && oldAll[j].id === puzzle.id;
      });
      if (oldIdx >= 0 && oldProgress[oldIdx]) {
        return oldProgress[oldIdx];
      }
      return createDefaultProgress(i);
    });
    saveProgress();
  }

  function getOldAllPuzzlesSnapshot() {
    return [];
  }

  function setOnLevelClick(handler) {
    onLevelClick = handler;
  }

  function setOnDeleteCustom(handler) {
    onDeleteCustom = handler;
  }

  function setOnEditCustom(handler) {
    onEditCustom = handler;
  }

  function renderLevels(containerEl, currentIndex) {
    ensureProgressSize();
    const allPuzzles = AppData.getAllPuzzles();
    const builtinPuzzles = AppData.getBuiltinPuzzles();
    const customPuzzles = AppData.getCustomPuzzles();

    let html = "";

    if (customPuzzles.length > 0) {
      html += '<div class="progress-section-header"><span class="progress-section-title">我的残页</span></div>';
      for (let i = 0; i < customPuzzles.length; i++) {
        const globalIdx = builtinPuzzles.length + i;
        html += renderLevelCard(customPuzzles[i], globalIdx, currentIndex);
      }
    }

    html += '<div class="progress-section-header" style="margin-top:12px"><span class="progress-section-title">内置残页</span></div>';
    for (let i = 0; i < builtinPuzzles.length; i++) {
      html += renderLevelCard(builtinPuzzles[i], i, currentIndex);
    }

    if (customPuzzles.length === 0) {
      html = '<div class="empty-custom-hint">点击顶部「残页编辑器」创建你自己的古籍残页</div>' + html;
    }

    containerEl.innerHTML = html;

    containerEl.querySelectorAll(".level-card").forEach(card => {
      card.addEventListener("click", (e) => {
        if (e.target.closest(".delete-btn") || e.target.closest(".edit-btn")) return;
        const idx = Number(card.dataset.level);
        if (onLevelClick && progress[idx] && progress[idx].unlocked) {
          onLevelClick(idx);
        }
      });
    });

    containerEl.querySelectorAll(".delete-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        if (onDeleteCustom) {
          onDeleteCustom(id);
        }
      });
    });

    containerEl.querySelectorAll(".edit-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        if (onEditCustom) {
          onEditCustom(id);
        }
      });
    });
  }

  function renderLevelCard(puzzle, index, currentIndex) {
    const p = progress[index] || createDefaultProgress(index);
    const isCurrent = index === currentIndex;
    let badge = "";
    let cardClass = "";
    const hasSave = hasInProgressSave(puzzle);
    if (!p.unlocked) {
      badge = '<span class="level-badge locked-badge"><span class="lock-icon">🔒</span> 未解锁</span>';
      cardClass = "locked";
    } else if (p.completed) {
      badge = '<span class="level-badge done">✓ 已完成</span>';
    } else if (hasSave) {
      badge = '<span class="level-badge" style="background:#e8a33d;color:#fff">⏸ 继续修补</span>';
    } else if (isCurrent) {
      badge = '<span class="level-badge current-badge">进行中</span>';
    } else {
      badge = '<span class="level-badge" style="background:#d8c7ad;color:#5a3d20">待挑战</span>';
    }
    if (isCurrent && p.unlocked) cardClass += " current";

    let statsHtml = "";
    if (!p.unlocked) {
      statsHtml = '<div class="no-record">完成前一页后解锁</div>';
    } else if (!p.completed) {
      statsHtml = '<div class="no-record">尚未完成</div>';
    } else {
      statsHtml = '<div class="level-stats">' +
        '<div><span>最佳得分</span><span class="val">' + p.bestScore + '</span></div>' +
        '<div><span>最快用时</span><span class="val">' + (p.bestTime !== null ? p.bestTime + '秒' : '-') + '</span></div>' +
        '<div><span>使用提示</span><span class="val ' + (p.hintUsed ? 'hint-used' : '') + '">' + (p.hintUsed ? '是' : '否') + '</span></div>' +
      '</div>';
    }

    const previewColors = AppData.getThemePreviewColor(puzzle.theme);
    const previewHtml = p.unlocked ? (
      '<div class="level-theme-preview">' +
        '<div class="theme-dot" style="background:' + previewColors.paper + ';border-color:' + previewColors.ink + '"></div>' +
        '<div class="theme-dot" style="background:' + previewColors.ink + '"></div>' +
      '</div>'
    ) : '';

    const customTag = puzzle.custom ? '<span class="custom-tag">自定义</span>' : '';
    const cardActions = puzzle.custom ? '<div class="card-actions"><button class="edit-btn" data-id="' + puzzle.id + '">编辑</button><button class="delete-btn" data-id="' + puzzle.id + '">删除</button></div>' : '';

    return '<div class="level-card ' + cardClass + '" data-level="' + index + '">' +
      '<div class="level-header">' +
        '<span class="level-name">' + puzzle.name + customTag + '</span>' +
        badge +
      '</div>' +
      statsHtml +
      previewHtml +
      cardActions +
    '</div>';
  }

  function findStartIndex() {
    ensureProgressSize();
    const allPuzzles = AppData.getAllPuzzles();
    let startIdx = 0;
    for (let i = allPuzzles.length - 1; i >= 0; i--) {
      if (progress[i] && progress[i].unlocked && !progress[i].completed) {
        startIdx = i;
        break;
      }
    }
    if (!progress[startIdx] || !progress[startIdx].unlocked) startIdx = 0;
    return startIdx;
  }

  function hasInProgressSave(puzzle) {
    if (!puzzle || !puzzle.id) return false;
    try {
      const data = AppStorage.getLevelSave(puzzle.id);
      if (!data || !data.pieceStates || !Array.isArray(data.pieceStates)) return false;
      const anyLocked = data.pieceStates.some(ps => ps.locked);
      const anyProgress = anyLocked || (data.score !== undefined && data.score !== 1000) ||
                         (typeof data.errorAttempts === "number" && data.errorAttempts > 0) ||
                         data.hintUsed === true;
      return anyProgress;
    } catch (e) {
      return false;
    }
  }

  return {
    init,
    loadProgress,
    saveProgress,
    getProgress,
    getProgressAt,
    updateProgress,
    unlockNext,
    renderLevels,
    setOnLevelClick,
    setOnDeleteCustom,
    setOnEditCustom,
    findStartIndex,
    handleCustomDeleted,
    ensureProgressSize,
    rebuildProgressForCustoms
  };
})();

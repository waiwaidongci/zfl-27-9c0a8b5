const AppGame = (() => {
  let board = null;
  let tray = null;
  let overlay = null;
  let modalTitle = null;
  let modalResult = null;
  let nextBtn = null;
  let retryBtn = null;
  let scoreText = null;
  let timeText = null;
  let levelText = null;
  let bestText = null;
  let errorText = null;
  let paperText = null;
  let inkText = null;
  let borderText = null;
  let tableText = null;
  let body = null;
  let hintBtn = null;
  let resetBtn = null;
  let undoBtn = null;
  let redoBtn = null;

  const MAX_HISTORY = 50;
  let undoStack = [];
  let redoStack = [];

  let currentIndex = 0;
  let currentPuzzle = null;
  let isTempMode = false;
  let isDailyMode = false;
  let score = 0;
  let time = 0;
  let totalTime = 0;
  let timer = null;
  let timerPaused = false;
  let pieces = [];
  let drag = null;
  let hintUsed = false;
  let levelsEl = null;
  let selectedPiece = null;
  let keyboardMode = false;
  let focusedCell = { col: 0, row: 0 };
  let focusMode = "tray";
  let focusedTrayIndex = 0;

  let onTempExit = null;
  let onLevelsRefresh = null;
  let onDailyExit = null;
  let onDailyFinish = null;
  let onTempDailyExit = null;
  let tutorial = null;
  let progress = null;
  let dailyAutosaveTimer = null;
  let levelAutosaveTimer = null;
  let isTempDailyMode = false;

  const LEVEL_SAVE_KEY_PREFIX = "zfl27LevelSave_";
  const TEMP_SAVE_KEY = "zfl27TempSave";
  const AUTOSAVE_INTERVAL = 3000;

  function setDependencies(deps) {
    if (deps.tutorial) tutorial = deps.tutorial;
    if (deps.progress) progress = deps.progress;
    if (deps.onLevelsRefresh) onLevelsRefresh = deps.onLevelsRefresh;
    if (deps.onTempExit) onTempExit = deps.onTempExit;
    if (deps.onDailyExit) onDailyExit = deps.onDailyExit;
    if (deps.onDailyFinish) onDailyFinish = deps.onDailyFinish;
    if (deps.onTempDailyExit) onTempDailyExit = deps.onTempDailyExit;
  }

  function cacheElements() {
    board = document.querySelector("#board");
    tray = document.querySelector("#tray");
    levelsEl = document.querySelector("#levels");
    overlay = document.querySelector("#overlay");
    modalTitle = document.querySelector("#modalTitle");
    modalResult = document.querySelector("#modalResult");
    nextBtn = document.querySelector("#nextBtn");
    retryBtn = document.querySelector("#retryBtn");
    scoreText = document.querySelector("#scoreText");
    timeText = document.querySelector("#timeText");
    levelText = document.querySelector("#levelText");
    bestText = document.querySelector("#bestText");
    errorText = document.querySelector("#errorText");
    paperText = document.querySelector("#paperText");
    inkText = document.querySelector("#inkText");
    borderText = document.querySelector("#borderText");
    tableText = document.querySelector("#tableText");
    body = document.body;
    hintBtn = document.querySelector("#hintBtn");
    resetBtn = document.querySelector("#resetBtn");
    undoBtn = document.querySelector("#undoBtn");
    redoBtn = document.querySelector("#redoBtn");
  }

  function bindUI() {
    hintBtn.onclick = handleHint;
    resetBtn.onclick = handleReset;
    if (undoBtn) undoBtn.onclick = handleUndo;
    if (redoBtn) redoBtn.onclick = handleRedo;
    document.addEventListener("keydown", handleKeyDown);
  }

  function getState() {
    return {
      currentIndex,
      score,
      time,
      totalTime,
      pieces,
      hintUsed,
      timerPaused,
      selectedPiece,
      keyboardMode,
      focusedCell,
      focusMode,
      focusedTrayIndex
    };
  }

  function setState(updates) {
    if (typeof updates.score === "number") score = updates.score;
    if (typeof updates.time === "number") time = updates.time;
    if (typeof updates.totalTime === "number") totalTime = updates.totalTime;
    if (typeof updates.hintUsed === "boolean") hintUsed = updates.hintUsed;
    if (typeof updates.currentIndex === "number") currentIndex = updates.currentIndex;
  }

  function applyTheme(theme) {
    const themes = AppData.themes;
    const paperTheme = themes.paper[theme.paper];
    const inkTheme = themes.ink[theme.ink];
    const borderTheme = themes.border[theme.border];
    const tableTheme = themes.table[theme.table];

    body.className = "";
    board.className = "board";

    body.classList.add(tableTheme.class);
    board.classList.add(paperTheme.class);

    board.dataset.paper = paperTheme.class;
    board.dataset.ink = inkTheme.class;
    board.dataset.border = borderTheme.class;
    board.dataset.table = tableTheme.class;

    paperText.textContent = paperTheme.name;
    inkText.textContent = inkTheme.name;
    borderText.textContent = borderTheme.name;
    tableText.textContent = tableTheme.name;
  }

  function start(index, options) {
    if (progress) {
      const p = progress.getProgressAt(index);
      if (!p || !p.unlocked) return;
    }
    stopDailyAutosave();
    stopLevelAutosave();

    const opts = options || {};
    const oldPuzzleId = currentPuzzle ? currentPuzzle.id : null;
    const newPuzzle = AppData.getPuzzleByIndex(index);
    const newPuzzleId = newPuzzle ? newPuzzle.id : null;

    if (oldPuzzleId !== null) {
      const oldSaveKey = currentPuzzle && currentPuzzle._saveKey
        ? currentPuzzle._saveKey
        : (oldPuzzleId === "temp" ? TEMP_SAVE_KEY : (LEVEL_SAVE_KEY_PREFIX + oldPuzzleId));
      const isSwitchingDifferentLevel = oldPuzzleId !== newPuzzleId;
      if (isSwitchingDifferentLevel) {
        if (oldSaveKey) localStorage.removeItem(oldSaveKey);
      } else if (opts.forceNew === true) {
        const currentSaveKey = newPuzzleId ? (LEVEL_SAVE_KEY_PREFIX + newPuzzleId) : null;
        if (currentSaveKey) localStorage.removeItem(currentSaveKey);
      }
    }

    currentIndex = index;
    isTempMode = false;
    isDailyMode = false;
    currentPuzzle = newPuzzle;
    initGameState();
    if (onLevelsRefresh) onLevelsRefresh();
    renderPuzzle();

    const tryRestore = opts.forceNew !== true;
    let saveKey = null;
    if (tryRestore) {
      saveKey = getLevelSaveKey();
    }
    const savedState = saveKey ? loadLevelSave(saveKey) : null;
    if (savedState) {
      restoreGameState(savedState);
    }

    startTimer();
    startLevelAutosave();
    updateHud();
  }

  function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(36);
  }

  function getTempPuzzleSaveKey(puzzle) {
    const signature = [
      puzzle.name || "",
      puzzle.cols,
      puzzle.rows,
      (puzzle.text || []).join("|"),
      (puzzle.theme ? JSON.stringify(puzzle.theme) : "")
    ].join("__");
    return TEMP_SAVE_KEY + "_" + hashString(signature);
  }

  function startTemp(puzzle, options) {
    stopDailyAutosave();
    stopLevelAutosave();

    const opts = options || {};
    const oldPuzzleId = currentPuzzle ? currentPuzzle.id : null;
    const newTempSaveKey = getTempPuzzleSaveKey(puzzle);
    const newTempId = "temp_" + hashString([puzzle.name || "temp", Date.now()].join("_"));

    if (oldPuzzleId !== null && !isDailyMode) {
      const oldSaveKey = currentPuzzle && currentPuzzle._saveKey
        ? currentPuzzle._saveKey
        : (oldPuzzleId === "temp" ? TEMP_SAVE_KEY : (LEVEL_SAVE_KEY_PREFIX + oldPuzzleId));
      const isSwitchingDifferentTemp = oldSaveKey !== newTempSaveKey;
      if (isSwitchingDifferentTemp) {
        if (oldSaveKey) localStorage.removeItem(oldSaveKey);
      } else if (opts.forceNew === true) {
        localStorage.removeItem(newTempSaveKey);
      }
    }

    currentIndex = -1;
    isTempMode = true;
    isDailyMode = false;
    currentPuzzle = { ...puzzle, id: newTempId, custom: true, _saveKey: newTempSaveKey };
    initGameState();
    if (onLevelsRefresh) onLevelsRefresh();
    renderPuzzle();

    const tryRestore = opts.forceNew !== true;
    const savedState = tryRestore ? loadLevelSave(newTempSaveKey) : null;
    if (savedState) {
      restoreGameState(savedState);
    }

    startTimer();
    startLevelAutosave();
    updateHud();
  }

  function clearLevelSaveForSwitch() {
    if (isDailyMode) return;
    const saveKey = getLevelSaveKey();
    if (!saveKey) return;
    localStorage.removeItem(saveKey);
  }

  function startDaily(puzzle, restoreState) {
    stopLevelAutosave();

    if (currentPuzzle && !isDailyMode) {
      let oldSaveKey = null;
      if (currentPuzzle._saveKey) {
        oldSaveKey = currentPuzzle._saveKey;
      } else if (currentPuzzle.id === "temp") {
        oldSaveKey = TEMP_SAVE_KEY;
      } else if (currentPuzzle.id) {
        oldSaveKey = LEVEL_SAVE_KEY_PREFIX + currentPuzzle.id;
      }
      if (oldSaveKey) localStorage.removeItem(oldSaveKey);
    }

    currentIndex = -1;
    isTempMode = false;
    isTempDailyMode = false;
    isDailyMode = true;
    currentPuzzle = { ...puzzle };
    initGameState();
    if (onLevelsRefresh) onLevelsRefresh();
    renderPuzzle();
    if (restoreState) {
      restoreDailyState(restoreState);
    } else {
      if (AppDailyChallenge) AppDailyChallenge.recordSessionStart(captureDailyState());
    }
    startTimer();
    startDailyAutosave();
    updateHud();
  }

  function startTempDaily(puzzle) {
    stopLevelAutosave();
    stopDailyAutosave();

    if (currentPuzzle && !isTempDailyMode && !isDailyMode) {
      let oldSaveKey = null;
      if (currentPuzzle._saveKey) {
        oldSaveKey = currentPuzzle._saveKey;
      } else if (currentPuzzle.id === "temp") {
        oldSaveKey = TEMP_SAVE_KEY;
      } else if (currentPuzzle.id) {
        oldSaveKey = LEVEL_SAVE_KEY_PREFIX + currentPuzzle.id;
      }
      if (oldSaveKey) localStorage.removeItem(oldSaveKey);
    }

    currentIndex = -1;
    isTempMode = false;
    isDailyMode = false;
    isTempDailyMode = true;
    currentPuzzle = { ...puzzle };
    initGameState();
    if (onLevelsRefresh) onLevelsRefresh();
    renderPuzzle();
    startTimer();
    startLevelAutosave();
    updateHud();
  }

  function captureDailyState() {
    const pieceStates = pieces.map(p => {
      const el = document.querySelector('.piece[data-id="' + p.id + '"]');
      let left = null, top = null, location = "tray";
      if (el) {
        left = parseFloat(el.style.left);
        top = parseFloat(el.style.top);
        location = el.parentElement && el.parentElement.id === "board" ? "board" : "tray";
      }
      return {
        id: p.id,
        rotation: p.rotation,
        flipped: p.flipped,
        locked: p.locked,
        col: p.col,
        row: p.row,
        label: p.label,
        left,
        top,
        location
      };
    });
    return {
      score,
      time,
      totalTime,
      hintUsed,
      errorAttempts: AppSettlement ? AppSettlement.getErrorAttempts() : 0,
      toolUsage: AppToolbox ? AppToolbox.getUsage() : {},
      pieceStates,
      capturedAt: Date.now()
    };
  }

  function saveDailyState() {
    if (!isDailyMode || !AppDailyChallenge) return;
    const state = captureDailyState();
    AppDailyChallenge.updateSessionGameState(state);
  }

  function startDailyAutosave() {
    stopDailyAutosave();
    if (!isDailyMode) return;
    dailyAutosaveTimer = setInterval(() => {
      saveDailyState();
    }, 3000);
  }

  function stopDailyAutosave() {
    if (dailyAutosaveTimer) {
      clearInterval(dailyAutosaveTimer);
      dailyAutosaveTimer = null;
    }
  }

  function getLevelSaveKey() {
    if (isDailyMode) return null;
    if (isTempMode) {
      if (currentPuzzle && currentPuzzle._saveKey) {
        return currentPuzzle._saveKey;
      }
      return TEMP_SAVE_KEY;
    }
    if (currentPuzzle && currentPuzzle.id) {
      return LEVEL_SAVE_KEY_PREFIX + currentPuzzle.id;
    }
    if (currentIndex >= 0) {
      const allPuzzles = AppData.getAllPuzzles();
      if (allPuzzles[currentIndex] && allPuzzles[currentIndex].id) {
        return LEVEL_SAVE_KEY_PREFIX + allPuzzles[currentIndex].id;
      }
    }
    return null;
  }

  function captureGameState() {
    const pieceStates = pieces.map(p => {
      const el = document.querySelector('.piece[data-id="' + p.id + '"]');
      let left = null, top = null, location = "tray";
      if (el) {
        left = parseFloat(el.style.left);
        top = parseFloat(el.style.top);
        location = el.parentElement && el.parentElement.id === "board" ? "board" : "tray";
      }
      return {
        id: p.id,
        rotation: p.rotation,
        flipped: p.flipped,
        locked: p.locked,
        col: p.col,
        row: p.row,
        label: p.label,
        left,
        top,
        location
      };
    });
    return {
      puzzleId: currentPuzzle ? currentPuzzle.id : null,
      puzzleName: currentPuzzle ? currentPuzzle.name : null,
      cols: currentPuzzle ? currentPuzzle.cols : null,
      rows: currentPuzzle ? currentPuzzle.rows : null,
      score,
      time,
      totalTime,
      hintUsed,
      errorAttempts: AppSettlement ? AppSettlement.getErrorAttempts() : 0,
      toolUsage: AppToolbox ? AppToolbox.getUsage() : {},
      keyboardMode,
      focusedCell: { ...focusedCell },
      focusMode,
      focusedTrayIndex,
      selectedPieceId: selectedPiece ? selectedPiece.id : null,
      pieceStates,
      capturedAt: Date.now()
    };
  }

  function saveLevelState() {
    if (isDailyMode) return;
    const saveKey = getLevelSaveKey();
    if (!saveKey) return;
    try {
      const state = captureGameState();
      localStorage.setItem(saveKey, JSON.stringify(state));
    } catch (e) {}
  }

  function loadLevelSave(saveKey) {
    try {
      const raw = localStorage.getItem(saveKey);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function hasLevelSave() {
    if (isDailyMode) return false;
    const saveKey = getLevelSaveKey();
    if (!saveKey) return false;
    const saved = loadLevelSave(saveKey);
    if (!saved) return false;
    if (currentPuzzle) {
      if (saved.cols !== currentPuzzle.cols || saved.rows !== currentPuzzle.rows) return false;
      if (saved.puzzleId && currentPuzzle.id && saved.puzzleId !== currentPuzzle.id) return false;
    }
    return true;
  }

  function clearLevelSave() {
    if (isDailyMode) return;
    const saveKey = getLevelSaveKey();
    if (!saveKey) return;
    localStorage.removeItem(saveKey);
  }

  function clearAllLevelSaves() {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
          key.startsWith(LEVEL_SAVE_KEY_PREFIX) ||
          key === TEMP_SAVE_KEY ||
          key.startsWith(TEMP_SAVE_KEY + "_")
      )) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }

  function restoreGameState(savedState) {
    if (!savedState) return false;
    if (typeof savedState.score === "number") score = savedState.score;
    if (typeof savedState.time === "number") time = savedState.time;
    if (typeof savedState.totalTime === "number") totalTime = savedState.totalTime;
    if (typeof savedState.hintUsed === "boolean") hintUsed = savedState.hintUsed;
    if (typeof savedState.keyboardMode === "boolean") keyboardMode = savedState.keyboardMode;
    if (savedState.focusedCell && typeof savedState.focusedCell === "object") {
      focusedCell = { col: savedState.focusedCell.col || 0, row: savedState.focusedCell.row || 0 };
    }
    if (typeof savedState.focusMode === "string") focusMode = savedState.focusMode;
    if (typeof savedState.focusedTrayIndex === "number") focusedTrayIndex = savedState.focusedTrayIndex;
    if (AppSettlement && typeof savedState.errorAttempts === "number") {
      AppSettlement.setErrorAttempts(savedState.errorAttempts);
    }
    if (AppToolbox && savedState.toolUsage) {
      AppToolbox.setUsage(savedState.toolUsage);
    }
    if (savedState.pieceStates && Array.isArray(savedState.pieceStates)) {
      savedState.pieceStates.forEach(ps => {
        const piece = pieces.find(p => p.id === ps.id);
        if (piece) {
          piece.rotation = ps.rotation;
          piece.flipped = ps.flipped;
          piece.locked = ps.locked;
        }
        const el = document.querySelector('.piece[data-id="' + ps.id + '"]');
        if (el && piece) {
          if (ps.left !== null && !isNaN(ps.left)) el.style.left = ps.left + "px";
          if (ps.top !== null && !isNaN(ps.top)) el.style.top = ps.top + "px";
          if (ps.location === "board" && board) board.appendChild(el);
          else if (ps.location === "tray" && tray) tray.appendChild(el);
          AppPieceState.applyTransformToElement(el, piece);
          if (ps.locked) {
            el.classList.add("locked");
            const p = currentPuzzle;
            if (p && board) {
              const cellW = board.clientWidth / p.cols;
              const cellH = board.clientHeight / p.rows;
              const targetX = piece.col * cellW + 5;
              const targetY = piece.row * cellH + 5;
              el.style.left = targetX + "px";
              el.style.top = targetY + "px";
              if (el.parentElement !== board) board.appendChild(el);
            }
          }
        }
      });
      if (typeof savedState.selectedPieceId === "number") {
        const selPiece = pieces.find(p => p.id === savedState.selectedPieceId && !p.locked);
        if (selPiece) {
          const selEl = document.querySelector('.piece[data-id="' + selPiece.id + '"]');
          if (selEl) selectPiece(selPiece, selEl);
        }
      }
    }
    AppSettlement.setHintUsed(hintUsed);
    updateKeyboardHighlights();
    return true;
  }

  function startLevelAutosave() {
    stopLevelAutosave();
    if (isDailyMode) return;
    levelAutosaveTimer = setInterval(() => {
      saveLevelState();
    }, AUTOSAVE_INTERVAL);
  }

  function stopLevelAutosave() {
    if (levelAutosaveTimer) {
      clearInterval(levelAutosaveTimer);
      levelAutosaveTimer = null;
    }
  }

  function restoreDailyState(savedState) {
    if (!savedState) return;
    if (typeof savedState.score === "number") score = savedState.score;
    if (typeof savedState.time === "number") time = savedState.time;
    if (typeof savedState.totalTime === "number") totalTime = savedState.totalTime;
    if (typeof savedState.hintUsed === "boolean") hintUsed = savedState.hintUsed;
    if (AppSettlement && typeof savedState.errorAttempts === "number") {
      AppSettlement.setErrorAttempts(savedState.errorAttempts);
    }
    if (AppToolbox && savedState.toolUsage) {
      AppToolbox.setUsage(savedState.toolUsage);
    }
    if (savedState.pieceStates && Array.isArray(savedState.pieceStates)) {
      savedState.pieceStates.forEach(ps => {
        const piece = pieces.find(p => p.id === ps.id);
        if (piece) {
          piece.rotation = ps.rotation;
          piece.flipped = ps.flipped;
          piece.locked = ps.locked;
        }
        const el = document.querySelector('.piece[data-id="' + ps.id + '"]');
        if (el && piece) {
          if (ps.left !== null) el.style.left = ps.left + "px";
          if (ps.top !== null) el.style.top = ps.top + "px";
          if (ps.location === "board" && board) board.appendChild(el);
          else if (ps.location === "tray" && tray) tray.appendChild(el);
          AppPieceState.applyTransformToElement(el, piece);
          if (ps.locked) {
            el.classList.add("locked");
            const p = currentPuzzle;
            const cellW = board.clientWidth / p.cols;
            const cellH = board.clientHeight / p.rows;
            const targetX = piece.col * cellW + 5;
            const targetY = piece.row * cellH + 5;
            el.style.left = targetX + "px";
            el.style.top = targetY + "px";
            if (board && el.parentElement !== board) board.appendChild(el);
          }
        }
      });
    }
    AppSettlement.setHintUsed(hintUsed);
    if (AppDailyChallenge) {
      AppDailyChallenge.updateSessionGameState(captureDailyState());
    }
  }

  function clearHistory() {
    undoStack = [];
    redoStack = [];
    updateUndoRedoButtons();
  }

  function captureHistorySnapshot() {
    const pieceStates = pieces.map(p => {
      const el = document.querySelector('.piece[data-id="' + p.id + '"]');
      let left = null, top = null, location = "tray";
      if (el) {
        left = parseFloat(el.style.left);
        top = parseFloat(el.style.top);
        location = el.parentElement && el.parentElement.id === "board" ? "board" : "tray";
      }
      return {
        id: p.id,
        rotation: p.rotation,
        flipped: p.flipped,
        locked: p.locked,
        col: p.col,
        row: p.row,
        label: p.label,
        left,
        top,
        location
      };
    });
    return {
      score,
      time,
      totalTime,
      hintUsed,
      errorAttempts: AppSettlement ? AppSettlement.getErrorAttempts() : 0,
      toolUsage: AppToolbox ? AppToolbox.getUsage() : {},
      pieceStates,
      keyboardMode,
      focusedCell: { ...focusedCell },
      focusMode,
      focusedTrayIndex,
      selectedPieceId: selectedPiece ? selectedPiece.id : null,
      capturedAt: Date.now()
    };
  }

  function applyHistorySnapshot(snapshot) {
    if (!snapshot) return false;
    if (typeof snapshot.score === "number") score = snapshot.score;
    if (typeof snapshot.time === "number") time = snapshot.time;
    if (typeof snapshot.totalTime === "number") totalTime = snapshot.totalTime;
    if (typeof snapshot.hintUsed === "boolean") hintUsed = snapshot.hintUsed;
    if (typeof snapshot.keyboardMode === "boolean") keyboardMode = snapshot.keyboardMode;
    if (snapshot.focusedCell && typeof snapshot.focusedCell === "object") {
      focusedCell = { col: snapshot.focusedCell.col || 0, row: snapshot.focusedCell.row || 0 };
    }
    if (typeof snapshot.focusMode === "string") focusMode = snapshot.focusMode;
    if (typeof snapshot.focusedTrayIndex === "number") focusedTrayIndex = snapshot.focusedTrayIndex;
    if (AppSettlement && typeof snapshot.errorAttempts === "number") {
      AppSettlement.setErrorAttempts(snapshot.errorAttempts);
    }
    if (AppToolbox && snapshot.toolUsage) {
      AppToolbox.setUsage(snapshot.toolUsage);
    }
    if (snapshot.pieceStates && Array.isArray(snapshot.pieceStates)) {
      snapshot.pieceStates.forEach(ps => {
        const piece = pieces.find(p => p.id === ps.id);
        if (piece) {
          piece.rotation = ps.rotation;
          piece.flipped = ps.flipped;
          piece.locked = ps.locked;
        }
        const el = document.querySelector('.piece[data-id="' + ps.id + '"]');
        if (el && piece) {
          if (ps.locked) {
            el.classList.add("locked");
          } else {
            el.classList.remove("locked");
          }
          el.classList.remove("wrong-orientation");
          el.classList.remove("selected");
          if (ps.left !== null && !isNaN(ps.left)) el.style.left = ps.left + "px";
          if (ps.top !== null && !isNaN(ps.top)) el.style.top = ps.top + "px";
          if (ps.location === "board" && board) board.appendChild(el);
          else if (ps.location === "tray" && tray) tray.appendChild(el);
          AppPieceState.applyTransformToElement(el, piece);
          if (ps.locked) {
            const p = currentPuzzle;
            if (p && board) {
              const cellW = board.clientWidth / p.cols;
              const cellH = board.clientHeight / p.rows;
              const targetX = piece.col * cellW + 5;
              const targetY = piece.row * cellH + 5;
              el.style.left = targetX + "px";
              el.style.top = targetY + "px";
              if (el.parentElement !== board) board.appendChild(el);
            }
          }
        }
      });
      clearSelectedPiece();
      if (typeof snapshot.selectedPieceId === "number") {
        const selPiece = pieces.find(p => p.id === snapshot.selectedPieceId && !p.locked);
        if (selPiece) {
          const selEl = document.querySelector('.piece[data-id="' + selPiece.id + '"]');
          if (selEl) selectPiece(selPiece, selEl);
        }
      }
    }
    AppSettlement.setHintUsed(hintUsed);
    updateHud();
    updateKeyboardHighlights();
    if (isDailyMode) saveDailyState();
    else saveLevelState();
    return true;
  }

  function pushHistory() {
    try {
      const snapshot = captureHistorySnapshot();
      undoStack.push(snapshot);
      if (undoStack.length > MAX_HISTORY) {
        undoStack.shift();
      }
      redoStack = [];
      updateUndoRedoButtons();
    } catch (e) {}
  }

  function handleUndo() {
    if (undoStack.length === 0) return;
    if (overlay && !overlay.classList.contains("hidden")) return;
    const currentSnapshot = captureHistorySnapshot();
    const prevSnapshot = undoStack.pop();
    redoStack.push(currentSnapshot);
    applyHistorySnapshot(prevSnapshot);
    updateUndoRedoButtons();
  }

  function handleRedo() {
    if (redoStack.length === 0) return;
    if (overlay && !overlay.classList.contains("hidden")) return;
    const currentSnapshot = captureHistorySnapshot();
    const nextSnapshot = redoStack.pop();
    undoStack.push(currentSnapshot);
    applyHistorySnapshot(nextSnapshot);
    updateUndoRedoButtons();
  }

  function updateUndoRedoButtons() {
    if (undoBtn) {
      undoBtn.disabled = undoStack.length === 0;
      undoBtn.classList.toggle("history-disabled", undoStack.length === 0);
    }
    if (redoBtn) {
      redoBtn.disabled = redoStack.length === 0;
      redoBtn.classList.toggle("history-disabled", redoStack.length === 0);
    }
  }

  function initGameState() {
    score = 1000;
    totalTime = currentPuzzle.timeLimit || 120;
    time = totalTime;
    hintUsed = false;
    pieces = [];
    selectedPiece = null;
    keyboardMode = false;
    focusedCell = { col: 0, row: 0 };
    focusMode = "tray";
    focusedTrayIndex = 0;
    overlay.classList.add("hidden");
    applyTheme(currentPuzzle.theme);
    AppSettlement.reset();
    AppSettlement.setHintUsed(false);
    AppToolbox.setPuzzleConfig(currentPuzzle);
    AppToolbox.setSelectedPiece(null);
    clearKeyboardHighlights();
    clearHistory();
  }

  function startTimer() {
    clearInterval(timer);
    timerPaused = false;
    timer = setInterval(() => {
      if (timerPaused) return;
      time -= 1;
      score = Math.max(0, score - 1);
      updateHud();
      if (time <= 0) finish(false);
    }, 1000);
  }

  function pauseTimer() {
    timerPaused = true;
  }

  function resumeTimer() {
    timerPaused = false;
  }

  function renderPuzzle() {
    board.innerHTML = "";
    tray.innerHTML = "";
    const p = currentPuzzle;
    const cellW = board.clientWidth / p.cols;
    const cellH = board.clientHeight / p.rows;

    for (let c = 1; c < p.cols; c++) {
      board.insertAdjacentHTML("beforeend",
        '<div class="gridline" style="left:'+(c*100/p.cols)+'%;top:0;width:0;height:100%"></div>');
    }
    for (let r = 1; r < p.rows; r++) {
      board.insertAdjacentHTML("beforeend",
        '<div class="gridline" style="top:'+(r*100/p.rows)+'%;left:0;height:0;width:100%"></div>');
    }

    p.text.forEach((label, i) => {
      const col = i % p.cols;
      const row = Math.floor(i / p.cols);
      const piece = AppPieceState.createPieceState(i, { label, col, row });

      if (p.initialRotations && p.initialRotations[i] !== undefined) {
        piece.rotation = p.initialRotations[i];
      } else {
        AppPieceState.randomizeOrientation(piece, currentPuzzle);
      }

      if (p.initialFlips && p.initialFlips[i] !== undefined) {
        piece.flipped = p.initialFlips[i];
      } else if (!p.initialRotations || p.initialRotations[i] === undefined) {
        AppPieceState.randomizeOrientation(piece, currentPuzzle);
      }

      pieces.push(piece);
    });

    const scatterRule = p.scatterRule || "random";
    placePiecesByRule(scatterRule, cellW, cellH);
    setTimeout(() => updateKeyboardHighlights(), 50);
  }

  function placePiecesByRule(rule, cellW, cellH) {
    const p = currentPuzzle;
    let pieceList;

    if (p.initialPieceOrder && Array.isArray(p.initialPieceOrder) && p.initialPieceOrder.length === pieces.length) {
      pieceList = p.initialPieceOrder.map(id => pieces.find(pp => pp.id === id)).filter(Boolean);
    } else {
      pieceList = [...pieces];
    }

    switch (rule) {
      case "ordered":
        pieceList.forEach((piece, i) => createPiece(piece, i, cellW, cellH, "ordered"));
        break;
      case "reversed":
        pieceList.reverse().forEach((piece, i) => createPiece(piece, pieceList.length - 1 - i, cellW, cellH, "ordered"));
        break;
      case "clustered":
        const byRow = {};
        pieceList.forEach(piece => {
          if (!byRow[piece.row]) byRow[piece.row] = [];
          byRow[piece.row].push(piece);
        });
        let flatIdx = 0;
        Object.keys(byRow).sort().forEach(rowKey => {
          byRow[rowKey].forEach(piece => {
            createPiece(piece, flatIdx, cellW, cellH, "clustered", Number(rowKey));
            flatIdx++;
          });
        });
        break;
      case "random":
      default:
        if (!p.initialPieceOrder) {
          shuffle(pieceList);
        }
        pieceList.forEach((piece, i) => createPiece(piece, i, cellW, cellH, "random"));
    }
  }

  function createPiece(piece, i, cellW, cellH, mode = "random", clusterRow = 0) {
    const el = document.createElement("div");
    const puzzle = currentPuzzle;
    const theme = puzzle.theme;
    const paperClass = AppData.themes.paper[theme.paper].class;
    const inkClass = AppData.themes.ink[theme.ink].class;
    const borderClass = AppData.themes.border[theme.border].class;
    el.className = "piece " + paperClass + " " + inkClass + " " + borderClass;
    el.dataset.id = piece.id;
    el.style.width = Math.floor(cellW - 10) + "px";
    el.style.height = Math.floor(cellH - 10) + "px";

    const trayW = tray.clientWidth || 260;
    const pieceW = cellW * 0.72;
    const pieceH = cellH * 0.45;

    let left, top;
    switch (mode) {
      case "ordered":
      case "reversed":
        const cols = Math.max(1, Math.floor(trayW / pieceW));
        left = 12 + (i % cols) * pieceW;
        top = 12 + Math.floor(i / cols) * (cellH * 0.5);
        break;
      case "clustered":
        const clusterCols = Math.max(1, Math.floor(trayW / pieceW));
        left = 12 + (i % clusterCols) * pieceW;
        top = 12 + clusterRow * (cellH * 0.55) + Math.floor(i / clusterCols) * (cellH * 0.25);
        break;
      case "random":
      default:
        const offset = puzzle.initialScatterOffsets && puzzle.initialScatterOffsets[i];
        const offsetX = offset && typeof offset.x === "number" ? offset.x : Math.random() * 8;
        const offsetY = offset && typeof offset.y === "number" ? offset.y : Math.random() * 6;
        left = 12 + (i % 2) * pieceW + offsetX;
        top = 12 + Math.floor(i / 2) * pieceH + offsetY;
    }

    el.style.left = left + "px";
    el.style.top = top + "px";
    el.innerHTML = piece.label + "<small>残片"+(piece.id+1)+"</small>";
    tray.appendChild(el);

    AppPieceState.applyTransformToElement(el, piece);

    el.addEventListener("pointerdown", event => {
      if (piece.locked) return;
      if (tutorial && tutorial.isActive()) {
        if (!tutorial.isDragAllowed()) return;
      }
      if (event.pointerType === "touch") {
        event.preventDefault();
        document.body.style.touchAction = "none";
      }
      selectPiece(piece, el);
      drag = { el, piece, ox: event.offsetX, oy: event.offsetY, pointerId: event.pointerId };
      el.setPointerCapture(event.pointerId);
      if (tutorial) tutorial.onDragStart();
    });

    el.addEventListener("pointermove", event => {
      if (!drag || drag.el !== el) return;
      const target = document.elementFromPoint(event.clientX, event.clientY);
      const parent = target && target.closest("#board") ? board : tray;
      if (el.parentElement !== parent) parent.appendChild(el);
      const rect = parent.getBoundingClientRect();
      el.style.left = event.clientX - rect.left - drag.ox + "px";
      el.style.top = event.clientY - rect.top - drag.oy + "px";
    });

    el.addEventListener("pointerup", () => tryDrop(el, piece));
  }

  function selectPiece(piece, el) {
    document.querySelectorAll(".piece.selected").forEach(p => p.classList.remove("selected"));
    selectedPiece = piece;
    if (el) el.classList.add("selected");
    AppToolbox.setSelectedPiece(piece);
    AppToolbox.render();
  }

  function clearSelectedPiece() {
    selectedPiece = null;
    document.querySelectorAll(".piece.selected").forEach(p => p.classList.remove("selected"));
    AppToolbox.setSelectedPiece(null);
    AppToolbox.render();
  }

  function tryDrop(el, piece) {
    if (!drag) return;
    drag = null;
    document.body.style.touchAction = "";
    if (el.parentElement !== board) return;
    pushHistory();
    const p = currentPuzzle;
    const cellW = board.clientWidth / p.cols;
    const cellH = board.clientHeight / p.rows;
    const targetX = piece.col * cellW + 5;
    const targetY = piece.row * cellH + 5;
    const x = parseFloat(el.style.left);
    const y = parseFloat(el.style.top);
    if (Math.abs(x - targetX) < 42 && Math.abs(y - targetY) < 42) {
      const orientationCorrect = AppPieceState.isOrientationCorrect(piece, currentPuzzle);
      if (orientationCorrect) {
        el.style.left = targetX + "px";
        el.style.top = targetY + "px";
        el.classList.add("locked");
        piece.locked = true;
        score += 80;
        if (tutorial) tutorial.onFirstDrop();
        if (pieces.every(item => item.locked)) {
          if (tutorial) tutorial.onWin();
          finish(true);
        }
      } else {
        AppSettlement.incrementErrorAttempts();
        score = Math.max(0, score - 50);
        el.classList.add("wrong-orientation");
        setTimeout(() => el.classList.remove("wrong-orientation"), 500);
      }
    } else {
      AppSettlement.incrementErrorAttempts();
      score = Math.max(0, score - 50);
    }
    if (piece.locked) {
      clearSelectedPiece();
      focusMode = "tray";
      focusedTrayIndex = 0;
    }
    if (isDailyMode) saveDailyState();
    else saveLevelState();
    updateHud();
    updateKeyboardHighlights();
  }

  function onBeforeToolUsed(toolId) {
    if (!selectedPiece) return;
    pushHistory();
  }

  function onToolUsedCancelled() {
    if (undoStack.length > 0) {
      undoStack.pop();
      updateUndoRedoButtons();
    }
  }

  function onToolUsed(toolId, piece) {
    if (piece) {
      const el = document.querySelector('.piece[data-id="' + piece.id + '"]');
      if (el) {
        AppPieceState.applyTransformToElement(el, piece);
      }
      if (el && el.parentElement === board && !piece.locked) {
        const p = currentPuzzle;
        const cellW = board.clientWidth / p.cols;
        const cellH = board.clientHeight / p.rows;
        const targetX = piece.col * cellW + 5;
        const targetY = piece.row * cellH + 5;
        const x = parseFloat(el.style.left);
        const y = parseFloat(el.style.top);
        if (Math.abs(x - targetX) < 42 && Math.abs(y - targetY) < 42) {
          const orientationCorrect = AppPieceState.isOrientationCorrect(piece, currentPuzzle);
          if (orientationCorrect) {
            el.style.left = targetX + "px";
            el.style.top = targetY + "px";
            el.classList.add("locked");
            piece.locked = true;
            score += 80;
            if (pieces.every(item => item.locked)) {
              finish(true);
            }
            updateHud();
          }
        }
      }
    }
    AppSettlement.setToolUsage(AppToolbox.getUsage());
    if (isDailyMode) saveDailyState();
    else saveLevelState();
  }

  function finish(win) {
    clearInterval(timer);
    stopDailyAutosave();
    stopLevelAutosave();
    clearLevelSave();
    clearHistory();
    const usedTime = totalTime - time;

    AppSettlement.setWin(win);
    AppSettlement.setToolUsage(AppToolbox.getUsage());
    AppSettlement.setHintUsed(hintUsed);

    AppSettlement.computeScore({
      baseScore: score,
      timeRemaining: time,
      timeLimit: totalTime,
      pieceCount: pieces.length,
      lockedCount: pieces.filter(p => p.locked).length,
      errorPenalty: 50,
      toolPenalty: 10,
      hintPenalty: currentPuzzle.hintPenalty || 80
    });

    const finalScore = AppSettlement.getFinalScore();

    if (isDailyMode) {
      if (win) {
        const colophon = AppSettlement.generateColophon();
        AppLibrary.addOrUpdateEntry(currentPuzzle.id, {
          name: currentPuzzle.name,
          text: currentPuzzle.text,
          theme: currentPuzzle.theme,
          cols: currentPuzzle.cols,
          rows: currentPuzzle.rows,
          bestScore: finalScore,
          bestTime: usedTime,
          hintUsed: hintUsed,
          rating: AppSettlement.getRating(),
          colophon: colophon,
          completionDate: Date.now(),
          daily: true,
          dailyDate: currentPuzzle.dailyDate
        });
      }
      if (onDailyFinish) {
        onDailyFinish({
          win,
          score: finalScore,
          usedTime,
          hintUsed
        });
      }
    } else if (!isTempDailyMode && win && progress && !isTempMode) {
      const prev = progress.getProgressAt(currentIndex);
      const newBestScore = Math.max(prev.bestScore, finalScore);
      const newBestTime = (prev.bestTime === null || usedTime < prev.bestTime) ? usedTime : prev.bestTime;
      const colophon = AppSettlement.generateColophon();
      progress.updateProgress(currentIndex, {
        completed: true,
        bestScore: newBestScore,
        bestTime: newBestTime,
        hintUsed: prev.hintUsed || hintUsed,
        unlocked: true,
        colophon: colophon
      });
      const allPuzzles = AppData.getAllPuzzles();
      if (currentIndex + 1 < allPuzzles.length) {
        progress.unlockNext(currentIndex);
      }
      AppLibrary.addOrUpdateEntry(currentPuzzle.id, {
        name: currentPuzzle.name,
        text: currentPuzzle.text,
        theme: currentPuzzle.theme,
        cols: currentPuzzle.cols,
        rows: currentPuzzle.rows,
        bestScore: newBestScore,
        bestTime: newBestTime,
        hintUsed: prev.hintUsed || hintUsed,
        rating: AppSettlement.getRating(),
        colophon: colophon,
        completionDate: Date.now()
      });
    }

    if (onLevelsRefresh && !isTempMode && !isDailyMode && !isTempDailyMode) onLevelsRefresh();
    updateHud();

    modalTitle.style.display = "none";

    AppSettlement.renderResult(modalResult, {
      score: finalScore,
      usedTime,
      totalTime,
      hintUsed,
      win,
      puzzleName: currentPuzzle.name
    });

    if (isDailyMode) {
      nextBtn.textContent = "返回进度册";
      nextBtn.onclick = () => {
        if (onDailyExit) onDailyExit();
      };
      retryBtn.textContent = win ? "再次挑战" : "再试一次";
      retryBtn.onclick = () => {
        if (AppDailyChallenge) AppDailyChallenge.recordSessionStart();
        startDaily(currentPuzzle);
      };
    } else if (isTempDailyMode) {
      nextBtn.textContent = "返回七日日历";
      nextBtn.onclick = () => {
        if (onTempDailyExit) onTempDailyExit();
      };
      retryBtn.textContent = "再玩一遍";
      retryBtn.onclick = () => startTempDaily(currentPuzzle);
    } else if (isTempMode) {
      nextBtn.textContent = "返回编辑器";
      nextBtn.onclick = () => {
        if (onTempExit) onTempExit();
      };
      retryBtn.textContent = "再试一次";
      retryBtn.onclick = () => startTemp(currentPuzzle, { forceNew: true });
    } else {
      const allPuzzles = AppData.getAllPuzzles();
      if (win && currentIndex < allPuzzles.length - 1) {
        nextBtn.textContent = "下一页";
        nextBtn.onclick = () => start(currentIndex + 1);
      } else if (win) {
        nextBtn.textContent = "全部完成！重回第一页";
        nextBtn.onclick = () => start(0, { forceNew: true });
      } else {
        nextBtn.textContent = "再试一次";
        nextBtn.onclick = () => start(currentIndex, { forceNew: true });
      }
      retryBtn.onclick = () => start(currentIndex, { forceNew: true });
    }
    overlay.classList.remove("hidden");
  }

  function updateHud() {
    const puzzle = currentPuzzle;
    if (levelText) {
      if (isDailyMode && puzzle) {
        levelText.innerHTML = puzzle.name + ' <span class="daily-mode-indicator">每日挑战</span>';
      } else if (isTempDailyMode && puzzle) {
        levelText.innerHTML = puzzle.name + ' <span class="daily-mode-indicator" style="background:#6a8a5a">临时重玩</span>';
      } else {
        levelText.textContent = puzzle ? puzzle.name : (currentIndex + 1);
      }
    }
    if (scoreText) scoreText.textContent = score;
    if (timeText) timeText.textContent = time;
    if (errorText) errorText.textContent = AppSettlement.getErrorAttempts();
    if (isDailyMode) {
      const todayRecord = AppDailyChallenge ? AppDailyChallenge.getTodayRecord() : null;
      bestText.textContent = todayRecord && todayRecord.completed ? todayRecord.score : "挑战中";
    } else if (isTempDailyMode) {
      bestText.textContent = "临时模式";
    } else if (progress && !isTempMode) {
      const p = progress.getProgressAt(currentIndex);
      bestText.textContent = p ? (p.bestScore || 0) : 0;
    } else if (isTempMode) {
      bestText.textContent = "试玩";
    }
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function handleHint() {
    if (tutorial && tutorial.isActive()) {
      if (!tutorial.isWaitForHint()) return;
    }
    const piece = pieces.find(item => !item.locked);
    if (!piece) return;
    pushHistory();
    hintUsed = true;
    AppSettlement.setHintUsed(true);
    if (tutorial) tutorial.onHint();
    const puzzle = currentPuzzle;
    const theme = puzzle.theme;
    const paperClass = AppData.themes.paper[theme.paper].class;
    const inkClass = AppData.themes.ink[theme.ink].class;
    const borderClass = AppData.themes.border[theme.border].class;
    const cellW = board.clientWidth / puzzle.cols;
    const cellH = board.clientHeight / puzzle.rows;
    const ghost = document.createElement("div");
    ghost.className = "ghost " + paperClass + " " + inkClass + " " + borderClass;
    ghost.style.left = piece.col * cellW + 5 + "px";
    ghost.style.top = piece.row * cellH + 5 + "px";
    ghost.style.width = cellW - 10 + "px";
    ghost.style.height = cellH - 10 + "px";
    ghost.textContent = "提示";
    ghost.style.opacity = "0.6";
    board.appendChild(ghost);
    const penalty = puzzle.hintPenalty || 80;
    score = Math.max(0, score - penalty);
    setTimeout(() => ghost.remove(), 900);
    if (isDailyMode) saveDailyState();
    else saveLevelState();
    updateHud();
  }

  function handleReset() {
    if (tutorial && tutorial.isActive()) return;
    if (overlay && !overlay.classList.contains("hidden")) return;
    if (isDailyMode) {
      if (AppDailyChallenge) AppDailyChallenge.recordSessionStart();
      startDaily(currentPuzzle);
    } else if (isTempDailyMode) {
      startTempDaily(currentPuzzle);
    } else if (isTempMode) {
      startTemp(currentPuzzle, { forceNew: true });
    } else {
      start(currentIndex, { forceNew: true });
    }
  }

  function getCurrentIndex() {
    return currentIndex;
  }

  function init(deps) {
    setDependencies(deps);
    cacheElements();
    bindUI();
    AppToolbox.init({ game: { onBeforeToolUsed, onToolUsedCancelled, onToolUsed } });
  }

  function getIsDailyMode() {
    return isDailyMode;
  }

  function saveKeyboardState() {
    if (isDailyMode) return;
    saveLevelState();
  }

  function activateKeyboardMode() {
    keyboardMode = true;
    body.classList.add("keyboard-mode");
    saveKeyboardState();
  }

  function clearKeyboardHighlights() {
    document.querySelectorAll(".piece.keyboard-focused").forEach(el => el.classList.remove("keyboard-focused"));
    const existingCellFocus = document.querySelector(".keyboard-cell-focus");
    if (existingCellFocus) existingCellFocus.remove();
    const existingTrayFocus = document.querySelector(".keyboard-tray-focus");
    if (existingTrayFocus) existingTrayFocus.remove();
    if (body) body.classList.remove("keyboard-mode");
  }

  function updateKeyboardHighlights() {
    clearKeyboardHighlights();
    if (!keyboardMode) return;
    activateKeyboardMode();

    if (focusMode === "tray") {
      const unlockedPieces = getUnlockedPieces();
      if (unlockedPieces.length === 0) return;
      focusedTrayIndex = Math.max(0, Math.min(focusedTrayIndex, unlockedPieces.length - 1));
      const piece = unlockedPieces[focusedTrayIndex];
      const el = document.querySelector('.piece[data-id="' + piece.id + '"]');
      if (el) el.classList.add("keyboard-focused");
    } else if (focusMode === "board" && selectedPiece) {
      const p = currentPuzzle;
      const cellW = board.clientWidth / p.cols;
      const cellH = board.clientHeight / p.rows;
      const focusEl = document.createElement("div");
      focusEl.className = "keyboard-cell-focus";
      focusEl.style.left = focusedCell.col * cellW + "px";
      focusEl.style.top = focusedCell.row * cellH + "px";
      focusEl.style.width = cellW + "px";
      focusEl.style.height = cellH + "px";
      board.appendChild(focusEl);
    }
  }

  function getUnlockedPieces() {
    return pieces.filter(p => !p.locked).sort((a, b) => a.id - b.id);
  }

  function moveFocusTray(direction) {
    const unlockedPieces = getUnlockedPieces();
    if (unlockedPieces.length === 0) return;
    if (direction === "next") {
      focusedTrayIndex = (focusedTrayIndex + 1) % unlockedPieces.length;
    } else {
      focusedTrayIndex = (focusedTrayIndex - 1 + unlockedPieces.length) % unlockedPieces.length;
    }
    updateKeyboardHighlights();
    saveKeyboardState();
  }

  function moveFocusBoard(dx, dy) {
    if (!currentPuzzle) return;
    const newCol = Math.max(0, Math.min(currentPuzzle.cols - 1, focusedCell.col + dx));
    const newRow = Math.max(0, Math.min(currentPuzzle.rows - 1, focusedCell.row + dy));
    focusedCell.col = newCol;
    focusedCell.row = newRow;
    updateKeyboardHighlights();
    saveKeyboardState();
  }

  function selectPieceByKeyboard() {
    const unlockedPieces = getUnlockedPieces();
    if (unlockedPieces.length === 0 || focusMode !== "tray") return;
    focusedTrayIndex = Math.max(0, Math.min(focusedTrayIndex, unlockedPieces.length - 1));
    const piece = unlockedPieces[focusedTrayIndex];
    const el = document.querySelector('.piece[data-id="' + piece.id + '"]');
    if (el) {
      selectPiece(piece, el);
      focusMode = "board";
      if (piece.col !== undefined) {
        focusedCell.col = piece.col;
        focusedCell.row = piece.row;
      }
      updateKeyboardHighlights();
      saveKeyboardState();
    }
  }

  function confirmPlacePiece() {
    if (!selectedPiece || focusMode !== "board") return;
    const el = document.querySelector('.piece[data-id="' + selectedPiece.id + '"]');
    if (!el) return;

    const p = currentPuzzle;
    const cellW = board.clientWidth / p.cols;
    const cellH = board.clientHeight / p.rows;
    const targetX = focusedCell.col * cellW + 5;
    const targetY = focusedCell.row * cellH + 5;

    if (el.parentElement !== board) board.appendChild(el);
    el.style.left = targetX + "px";
    el.style.top = targetY + "px";

    drag = { el, piece: selectedPiece };
    tryDrop(el, selectedPiece);
    updateKeyboardHighlights();
    saveKeyboardState();
  }

  function cancelSelection() {
    clearSelectedPiece();
    focusMode = "tray";
    updateKeyboardHighlights();
    saveKeyboardState();
  }

  function handleKeyDown(event) {
    if (overlay && !overlay.classList.contains("hidden")) return;
    if (tutorial && tutorial.isActive()) return;

    const key = event.key;
    const ctrlOrCmd = event.ctrlKey || event.metaKey;

    if (ctrlOrCmd && key === "z" && !event.shiftKey) {
      event.preventDefault();
      handleUndo();
      return;
    }
    if ((ctrlOrCmd && key === "z" && event.shiftKey) || (ctrlOrCmd && (key === "y" || key === "Y"))) {
      event.preventDefault();
      handleRedo();
      return;
    }

    if (key === "Tab") {
      event.preventDefault();
      activateKeyboardMode();
      if (focusMode === "tray" && !selectedPiece) {
        moveFocusTray(event.shiftKey ? "prev" : "next");
      }
      return;
    }

    if (!keyboardMode) {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "Enter", "Escape", "r", "R", "e", "E", "f", "F"].includes(key)) {
        activateKeyboardMode();
        updateKeyboardHighlights();
      } else {
        return;
      }
    }

    if (key === "Escape") {
      event.preventDefault();
      cancelSelection();
      return;
    }

    if (focusMode === "tray" && !selectedPiece) {
      if (key === "ArrowRight" || key === "ArrowDown") {
        event.preventDefault();
        moveFocusTray("next");
      } else if (key === "ArrowLeft" || key === "ArrowUp") {
        event.preventDefault();
        moveFocusTray("prev");
      } else if (key === " " || key === "Enter") {
        event.preventDefault();
        selectPieceByKeyboard();
      }
    } else if (focusMode === "board" && selectedPiece) {
      if (key === "ArrowUp") {
        event.preventDefault();
        moveFocusBoard(0, -1);
      } else if (key === "ArrowDown") {
        event.preventDefault();
        moveFocusBoard(0, 1);
      } else if (key === "ArrowLeft") {
        event.preventDefault();
        moveFocusBoard(-1, 0);
      } else if (key === "ArrowRight") {
        event.preventDefault();
        moveFocusBoard(1, 0);
      } else if (key === " " || key === "Enter") {
        event.preventDefault();
        confirmPlacePiece();
      } else if (key === "r" || key === "R") {
        event.preventDefault();
        if (AppToolbox && AppToolbox.useTool) {
          AppToolbox.useTool("rotateCw");
        }
      } else if (key === "e" || key === "E") {
        event.preventDefault();
        if (AppToolbox && AppToolbox.useTool) {
          AppToolbox.useTool("rotateCcw");
        }
      } else if (key === "f" || key === "F") {
        event.preventDefault();
        if (AppToolbox && AppToolbox.useTool) {
          AppToolbox.useTool("flip");
        }
      }
    }

    updateKeyboardHighlights();
  }

  return {
    init,
    start,
    startTemp,
    startDaily,
    startTempDaily,
    pauseTimer,
    resumeTimer,
    getState,
    setState,
    updateHud,
    getCurrentIndex,
    getIsDailyMode,
    onToolUsed,
    updateKeyboardHighlights,
    saveLevelState,
    clearLevelSave,
    clearAllLevelSaves,
    hasLevelSave,
    undo: handleUndo,
    redo: handleRedo
  };
})();

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
  let paperText = null;
  let inkText = null;
  let borderText = null;
  let tableText = null;
  let body = null;
  let hintBtn = null;
  let resetBtn = null;

  let currentIndex = 0;
  let score = 0;
  let time = 0;
  let totalTime = 0;
  let timer = null;
  let timerPaused = false;
  let pieces = [];
  let drag = null;
  let hintUsed = false;
  let levelsEl = null;

  let onLevelsRefresh = null;
  let tutorial = null;
  let progress = null;

  function setDependencies(deps) {
    if (deps.tutorial) tutorial = deps.tutorial;
    if (deps.progress) progress = deps.progress;
    if (deps.onLevelsRefresh) onLevelsRefresh = deps.onLevelsRefresh;
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
    paperText = document.querySelector("#paperText");
    inkText = document.querySelector("#inkText");
    borderText = document.querySelector("#borderText");
    tableText = document.querySelector("#tableText");
    body = document.body;
    hintBtn = document.querySelector("#hintBtn");
    resetBtn = document.querySelector("#resetBtn");
  }

  function bindUI() {
    hintBtn.onclick = handleHint;
    resetBtn.onclick = handleReset;
  }

  function getState() {
    return {
      currentIndex,
      score,
      time,
      totalTime,
      pieces,
      hintUsed,
      timerPaused
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

  function start(index) {
    if (progress) {
      const p = progress.getProgressAt(index);
      if (!p || !p.unlocked) return;
    }
    currentIndex = index;
    score = 1000;

    const puzzle = AppData.getPuzzleByIndex(index);
    totalTime = puzzle.timeLimit || 120;
    time = totalTime;
    hintUsed = false;
    pieces = [];
    overlay.classList.add("hidden");
    applyTheme(puzzle.theme);

    if (onLevelsRefresh) onLevelsRefresh();
    renderPuzzle();

    clearInterval(timer);
    timerPaused = false;
    timer = setInterval(() => {
      if (timerPaused) return;
      time -= 1;
      score = Math.max(0, score - 1);
      updateHud();
      if (time <= 0) finish(false);
    }, 1000);
    updateHud();
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
    const p = AppData.getPuzzleByIndex(currentIndex);
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
      pieces.push({ id: i, label, col, row, locked: false });
    });

    const scatterRule = p.scatterRule || "random";
    placePiecesByRule(scatterRule, cellW, cellH);
  }

  function placePiecesByRule(rule, cellW, cellH) {
    const pieceList = [...pieces];
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
        shuffle(pieceList).forEach((piece, i) => createPiece(piece, i, cellW, cellH, "random"));
    }
  }

  function createPiece(piece, i, cellW, cellH, mode = "random", clusterRow = 0) {
    const el = document.createElement("div");
    const puzzle = AppData.getPuzzleByIndex(currentIndex);
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
        left = 12 + (i % 2) * pieceW + Math.random() * 8;
        top = 12 + Math.floor(i / 2) * pieceH + Math.random() * 6;
    }

    el.style.left = left + "px";
    el.style.top = top + "px";
    el.innerHTML = piece.label + "<small>残片"+(piece.id+1)+"</small>";
    tray.appendChild(el);

    el.addEventListener("pointerdown", event => {
      if (piece.locked) return;
      if (tutorial && tutorial.isActive()) {
        if (!tutorial.isDragAllowed()) return;
      }
      drag = { el, piece, ox: event.offsetX, oy: event.offsetY };
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

  function tryDrop(el, piece) {
    if (!drag) return;
    drag = null;
    if (el.parentElement !== board) return;
    const p = AppData.getPuzzleByIndex(currentIndex);
    const cellW = board.clientWidth / p.cols;
    const cellH = board.clientHeight / p.rows;
    const targetX = piece.col * cellW + 5;
    const targetY = piece.row * cellH + 5;
    const x = parseFloat(el.style.left);
    const y = parseFloat(el.style.top);
    if (Math.abs(x - targetX) < 42 && Math.abs(y - targetY) < 42) {
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
      score = Math.max(0, score - 50);
    }
    updateHud();
  }

  function finish(win) {
    clearInterval(timer);
    const usedTime = totalTime - time;

    if (win && progress) {
      const prev = progress.getProgressAt(currentIndex);
      const newBestScore = Math.max(prev.bestScore, score);
      const newBestTime = (prev.bestTime === null || usedTime < prev.bestTime) ? usedTime : prev.bestTime;
      progress.updateProgress(currentIndex, {
        completed: true,
        bestScore: newBestScore,
        bestTime: newBestTime,
        hintUsed: prev.hintUsed || hintUsed,
        unlocked: true
      });
      const allPuzzles = AppData.getAllPuzzles();
      if (currentIndex + 1 < allPuzzles.length) {
        progress.unlockNext(currentIndex);
      }
    }

    if (onLevelsRefresh) onLevelsRefresh();
    updateHud();

    modalTitle.textContent = win ? "🎉 残页修补完成" : "⏰ 时间耗尽";

    let rows = '<div class="result-row"><span>本页得分</span><span>' + score + '</span></div>';
    if (win) {
      rows += '<div class="result-row"><span>用时</span><span>' + usedTime + '秒</span></div>';
      rows += '<div class="result-row"><span>使用提示</span><span>' + (hintUsed ? '是（已记录）' : '否') + '</span></div>';
      if (progress) {
        const p = progress.getProgressAt(currentIndex);
        rows += '<div class="result-row"><span>历史最佳得分</span><span>' + p.bestScore + '</span></div>';
        rows += '<div class="result-row"><span>历史最快用时</span><span>' + (p.bestTime !== null ? p.bestTime + '秒' : '-') + '</span></div>';
      }
      const allPuzzles = AppData.getAllPuzzles();
      if (currentIndex + 1 < allPuzzles.length) {
        rows += '<div class="result-row" style="color:#3a7653"><span>下一页解锁</span><span>✓</span></div>';
      }
    } else {
      rows += '<div class="result-row"><span>使用提示</span><span>' + (hintUsed ? '是' : '否') + '</span></div>';
    }
    modalResult.innerHTML = rows;

    const allPuzzles = AppData.getAllPuzzles();
    if (win && currentIndex < allPuzzles.length - 1) {
      nextBtn.textContent = "下一页";
      nextBtn.onclick = () => start(currentIndex + 1);
    } else if (win) {
      nextBtn.textContent = "全部完成！重回第一页";
      nextBtn.onclick = () => start(0);
    } else {
      nextBtn.textContent = "再试一次";
      nextBtn.onclick = () => start(currentIndex);
    }
    retryBtn.onclick = () => start(currentIndex);
    overlay.classList.remove("hidden");
  }

  function updateHud() {
    const puzzle = AppData.getPuzzleByIndex(currentIndex);
    levelText.textContent = puzzle ? puzzle.name : (currentIndex + 1);
    scoreText.textContent = score;
    timeText.textContent = time;
    if (progress) {
      const p = progress.getProgressAt(currentIndex);
      bestText.textContent = p ? (p.bestScore || 0) : 0;
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
    hintUsed = true;
    if (tutorial) tutorial.onHint();
    const puzzle = AppData.getPuzzleByIndex(currentIndex);
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
    updateHud();
  }

  function handleReset() {
    if (tutorial && tutorial.isActive()) return;
    start(currentIndex);
  }

  function getCurrentIndex() {
    return currentIndex;
  }

  function init(deps) {
    setDependencies(deps);
    cacheElements();
    bindUI();
  }

  return {
    init,
    start,
    pauseTimer,
    resumeTimer,
    getState,
    setState,
    updateHud,
    getCurrentIndex
  };
})();

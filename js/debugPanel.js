const AppDebugPanel = (() => {
  let container = null;
  let currentConfig = null;
  let currentPuzzle = null;
  let selectedTheme = null;
  let selectedDifficulty = 3;
  let customSeed = "";
  let isOpen = false;
  let onStartGenerated = null;
  let onToggleState = null;

  const state = {
    history: [],
    favorites: []
  };

  const HISTORY_KEY = "zfl27_generator_history";
  const FAVORITES_KEY = "zfl27_generator_favorites";

  function init(options = {}) {
    if (options.onStartGenerated) {
      onStartGenerated = options.onStartGenerated;
    }
    if (options.onToggleState) {
      onToggleState = options.onToggleState;
    }
    loadState();
    createPanel();
    bindKeyboardShortcuts();
  }

  function loadState() {
    try {
      const h = localStorage.getItem(HISTORY_KEY);
      const f = localStorage.getItem(FAVORITES_KEY);
      if (h) state.history = JSON.parse(h);
      if (f) state.favorites = JSON.parse(f);
    } catch (e) {}
  }

  function saveState() {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(state.history.slice(0, 20)));
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(state.favorites.slice(0, 50)));
    } catch (e) {}
  }

  function addToHistory(result) {
    state.history.unshift({
      seed: result.seed,
      puzzleName: result.puzzle.name,
      difficulty: result.puzzle.generatorOptions?.difficulty || 3,
      theme: result.puzzle.generatorOptions?.theme,
      puzzle: result.puzzle,
      timestamp: Date.now()
    });
    saveState();
  }

  function toggleFavorite(seed) {
    const idx = state.favorites.findIndex(f => f.seed === seed);
    if (idx >= 0) {
      state.favorites.splice(idx, 1);
    } else {
      const result = currentConfig;
      if (result) {
        state.favorites.unshift({
          seed: result.seed,
          puzzleName: result.puzzle.name,
          difficulty: result.puzzle.generatorOptions?.difficulty || 3,
          theme: result.puzzle.generatorOptions?.theme,
          puzzle: result.puzzle,
          timestamp: Date.now()
        });
      }
    }
    saveState();
    renderFavorites();
  }

  function isFavorite(seed) {
    return state.favorites.some(f => f.seed === seed);
  }

  function createPanel() {
    container = document.createElement("div");
    container.id = "debugPanel";
    container.className = "debug-panel hidden";
    container.innerHTML = `
      <div class="debug-panel-header">
        <h2>🔧 程序化残页生成器</h2>
        <button class="debug-close-btn" id="debugCloseBtn">×</button>
      </div>
      <div class="debug-panel-content">
        <div class="debug-tabs">
          <button class="debug-tab active" data-tab="generate">生成</button>
          <button class="debug-tab" data-tab="validate">验证</button>
          <button class="debug-tab" data-tab="history">历史</button>
          <button class="debug-tab" data-tab="favorites">收藏</button>
        </div>
        
        <div class="debug-tab-content" id="debug-tab-generate">
          <div class="debug-section">
            <label class="debug-label">种子 (留空自动生成)</label>
            <div class="debug-seed-row">
              <input type="text" id="debugSeedInput" placeholder="输入种子字符串或数字" />
              <button id="debugRandomSeedBtn" class="debug-btn-small">🎲</button>
              <button id="debugCopySeedBtn" class="debug-btn-small">📋</button>
            </div>
          </div>
          
          <div class="debug-section" id="debugThemeContainer"></div>
          <div class="debug-section" id="debugDifficultyContainer"></div>
          
          <div class="debug-section">
            <div class="debug-options-row">
              <label class="checkbox-label">
                <input type="checkbox" id="debugEnableRotation" />
                <span>启用旋转</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" id="debugEnableFlip" />
                <span>启用翻转</span>
              </label>
            </div>
          </div>
          
          <div class="debug-section">
            <label class="debug-label">破损规则</label>
            <select id="debugDamageRule">
              <option value="none">完好</option>
              <option value="torn">撕裂</option>
              <option value="frayed">磨损</option>
              <option value="chipped">缺口</option>
              <option value="scalloped">扇贝</option>
              <option value="irregular">不规则</option>
              <option value="mixed">混合破损</option>
            </select>
          </div>
          
          <div class="debug-section">
            <label class="debug-label">文字相似度 (0-0.5)</label>
            <input type="range" id="debugSimilarity" min="0" max="0.5" step="0.05" value="0.2" />
            <span id="debugSimilarityValue">0.2</span>
          </div>
          
          <div class="debug-actions">
            <button id="debugGenerateBtn" class="debug-btn-primary">生成残页</button>
            <button id="debugQuickGenerateBtn" class="debug-btn-secondary">快速生成</button>
          </div>
          
          <div class="debug-preview" id="debugPreview">
            <div class="debug-preview-empty">点击生成按钮预览残页</div>
          </div>
          
          <div class="debug-actions">
            <button id="debugStartBtn" class="debug-btn-primary" disabled>开始游戏</button>
            <button id="debugFavoriteBtn" class="debug-btn-secondary" disabled>⭐ 收藏</button>
            <button id="debugExportBtn" class="debug-btn-secondary" disabled>导出配置</button>
          </div>
        </div>
        
        <div class="debug-tab-content hidden" id="debug-tab-validate">
          <div class="debug-section">
            <label class="debug-label">粘贴谜题 JSON 进行验证</label>
            <textarea id="debugValidateInput" placeholder='{"cols": 3, "rows": 2, "text": ["山雨","松风",...]}'></textarea>
            <button id="debugValidateBtn" class="debug-btn-primary">验证谜题</button>
          </div>
          <div id="debugValidateResult" class="debug-validation-result"></div>
        </div>
        
        <div class="debug-tab-content hidden" id="debug-tab-history">
          <div id="debugHistoryList" class="debug-history-list"></div>
        </div>
        
        <div class="debug-tab-content hidden" id="debug-tab-favorites">
          <div id="debugFavoritesList" class="debug-history-list"></div>
        </div>
      </div>
    `;

    document.body.appendChild(container);
    bindPanelEvents();
    renderThemePicker();
    renderDifficultyPicker();
    renderHistory();
    renderFavorites();
  }

  function bindPanelEvents() {
    container.querySelector("#debugCloseBtn").onclick = close;

    container.querySelectorAll(".debug-tab").forEach(tab => {
      tab.onclick = () => {
        const tabName = tab.dataset.tab;
        container.querySelectorAll(".debug-tab").forEach(t => t.classList.remove("active"));
        container.querySelectorAll(".debug-tab-content").forEach(c => c.classList.add("hidden"));
        tab.classList.add("active");
        container.querySelector("#debug-tab-" + tabName).classList.remove("hidden");
      };
    });

    container.querySelector("#debugSeedInput").oninput = (e) => {
      customSeed = e.target.value;
    };

    container.querySelector("#debugRandomSeedBtn").onclick = () => {
      const seed = AppGenerator.generateRandomSeed();
      container.querySelector("#debugSeedInput").value = seed;
      customSeed = seed;
    };

    container.querySelector("#debugCopySeedBtn").onclick = () => {
      const seed = container.querySelector("#debugSeedInput").value;
      if (seed) {
        navigator.clipboard.writeText(seed).then(() => {
          showToast("种子已复制到剪贴板");
        });
      }
    };

    container.querySelector("#debugSimilarity").oninput = (e) => {
      container.querySelector("#debugSimilarityValue").textContent = e.target.value;
    };

    container.querySelector("#debugGenerateBtn").onclick = handleGenerate;
    container.querySelector("#debugQuickGenerateBtn").onclick = handleQuickGenerate;
    container.querySelector("#debugStartBtn").onclick = handleStartGame;
    container.querySelector("#debugFavoriteBtn").onclick = handleToggleFavorite;
    container.querySelector("#debugExportBtn").onclick = handleExport;
    container.querySelector("#debugValidateBtn").onclick = handleValidate;
  }

  function renderThemePicker() {
    const themeContainer = container.querySelector("#debugThemeContainer");
    AppThemeRenderer.renderThemePicker(themeContainer, {
      onSelect: (themeId) => {
        selectedTheme = themeId;
      },
      selectedTheme
    });
  }

  function renderDifficultyPicker() {
    const diffContainer = container.querySelector("#debugDifficultyContainer");
    AppThemeRenderer.renderDifficultyPicker(diffContainer, {
      onSelect: (level) => {
        selectedDifficulty = level;
        updateDifficultyOptions(level);
      },
      selectedDifficulty
    });
    updateDifficultyOptions(selectedDifficulty);
  }

  function updateDifficultyOptions(level) {
    const scramble = AppLevelAdapter.calculateScrambleLevel(level);
    container.querySelector("#debugEnableRotation").checked = scramble.rotation;
    container.querySelector("#debugEnableFlip").checked = scramble.flip;
    container.querySelector("#debugSimilarity").value = scramble.similarity;
    container.querySelector("#debugSimilarityValue").textContent = scramble.similarity;
  }

  function handleGenerate() {
    const seed = customSeed || AppGenerator.generateRandomSeed();
    const enableRotation = container.querySelector("#debugEnableRotation").checked;
    const enableFlip = container.querySelector("#debugEnableFlip").checked;
    const damageRule = container.querySelector("#debugDamageRule").value;
    const similarity = parseFloat(container.querySelector("#debugSimilarity").value);

    const result = AppGenerator.generatePuzzle({
      seed,
      difficulty: selectedDifficulty,
      theme: selectedTheme,
      enableRotation,
      enableFlip,
      damageRule,
      similarity
    });

    currentConfig = result;
    currentPuzzle = result.puzzle;

    renderPreview(result);
    addToHistory(result);
    renderHistory();

    container.querySelector("#debugStartBtn").disabled = false;
    container.querySelector("#debugFavoriteBtn").disabled = false;
    container.querySelector("#debugExportBtn").disabled = false;
    container.querySelector("#debugFavoriteBtn").textContent = isFavorite(seed) ? "⭐ 已收藏" : "⭐ 收藏";
  }

  function handleQuickGenerate() {
    const result = AppLevelAdapter.getQuickGenerate(selectedDifficulty);
    currentConfig = result;
    currentPuzzle = result.puzzle;

    renderPreview({
      puzzle: result.puzzle,
      seed: result.config.seed,
      difficulty: result.difficultyInfo.name
    });
    addToHistory({
      puzzle: result.puzzle,
      seed: result.config.seed
    });
    renderHistory();

    container.querySelector("#debugStartBtn").disabled = false;
    container.querySelector("#debugFavoriteBtn").disabled = false;
    container.querySelector("#debugExportBtn").disabled = false;
    container.querySelector("#debugFavoriteBtn").textContent = isFavorite(result.config.seed) ? "⭐ 已收藏" : "⭐ 收藏";
  }

  function renderPreview(result) {
    const preview = container.querySelector("#debugPreview");
    const puzzle = result.puzzle;
    const previewInfo = AppThemeRenderer.createPreview(puzzle.theme, puzzle.generatorOptions?.theme);

    const damageStyles = {
      none: "",
      torn: "debug-damage-torn",
      frayed: "debug-damage-frayed",
      chipped: "debug-damage-chipped",
      scalloped: "debug-damage-scalloped",
      irregular: "debug-damage-irregular"
    };

    const damageLabels = {
      none: "",
      torn: "撕裂",
      frayed: "磨损",
      chipped: "缺口",
      scalloped: "扇贝",
      irregular: "不规则"
    };

    const cells = [];
    for (let r = 0; r < puzzle.rows; r++) {
      for (let c = 0; c < puzzle.cols; c++) {
        const idx = r * puzzle.cols + c;
        const damage = puzzle.pieceDamage ? puzzle.pieceDamage[idx] : "none";
        const damageClass = damageStyles[damage] || "";
        const damageLabel = damageLabels[damage] || "";
        cells.push(`
          <div class="debug-preview-cell ${damageClass}" style="
            background: ${previewInfo.paperColor};
            color: ${previewInfo.inkColor};
            grid-column: ${c + 1};
            grid-row: ${r + 1};
          ">
            ${puzzle.text[idx]}
            ${damageLabel ? `<span class="debug-damage-label">${damageLabel}</span>` : ""}
          </div>
        `);
      }
    }

    const isFav = isFavorite(result.seed);

    preview.innerHTML = `
      <div class="debug-preview-header">
        <div class="debug-preview-title">${puzzle.name}</div>
        <div class="debug-preview-badge ${isFav ? 'favorited' : ''}" onclick="AppDebugPanel.handleToggleFavorite()">
          ${isFav ? '⭐' : '☆'}
        </div>
      </div>
      <div class="debug-preview-info">
        <div><span>尺寸:</span> <b>${puzzle.cols}×${puzzle.rows}</b> (${puzzle.text.length} 片)</div>
        <div><span>难度:</span> <b>${result.difficulty || '-'} (${puzzle.generatorOptions?.difficulty || '-'})</b></div>
        <div><span>限时:</span> <b>${puzzle.timeLimit}秒</b></div>
        <div><span>提示惩罚:</span> <b>-${puzzle.hintPenalty}分</b></div>
        <div><span>旋转:</span> <b>${puzzle.enableRotation ? '✓' : '✗'}</b></div>
        <div><span>翻转:</span> <b>${puzzle.enableFlip ? '✓' : '✗'}</b></div>
      </div>
      <div class="debug-preview-theme">
        <div><span>纸张:</span> <b>${previewInfo.paperName}</b></div>
        <div><span>墨色:</span> <b>${previewInfo.inkName}</b></div>
        <div><span>边框:</span> <b>${previewInfo.borderName}</b></div>
        <div><span>台面:</span> <b>${previewInfo.tableName}</b></div>
      </div>
      <div class="debug-preview-grid" style="
        grid-template-columns: repeat(${puzzle.cols}, 1fr);
        grid-template-rows: repeat(${puzzle.rows}, 1fr);
      ">
        ${cells.join('')}
      </div>
      <div class="debug-preview-seed">
        <span>种子:</span> <code>${result.seed}</code>
      </div>
      ${puzzle.text.some((w, i) => puzzle.text.indexOf(w) !== i) ? 
        '<div class="debug-preview-warning">⚠️ 存在重复文字，可能影响位置唯一性</div>' : ''}
    `;
  }

  function handleStartGame() {
    if (!currentPuzzle) return;
    if (onStartGenerated) {
      onStartGenerated(currentPuzzle);
    }
    close();
  }

  function handleToggleFavorite() {
    if (!currentConfig) return;
    toggleFavorite(currentConfig.seed);
    container.querySelector("#debugFavoriteBtn").textContent = 
      isFavorite(currentConfig.seed) ? "⭐ 已收藏" : "⭐ 收藏";
  }

  function handleExport() {
    if (!currentConfig) return;
    const exportData = {
      seed: currentConfig.seed,
      puzzle: currentPuzzle,
      exportedAt: Date.now()
    };
    const json = JSON.stringify(exportData, null, 2);
    navigator.clipboard.writeText(json).then(() => {
      showToast("配置已导出到剪贴板");
    });
  }

  function handleValidate() {
    const input = container.querySelector("#debugValidateInput").value;
    const resultDiv = container.querySelector("#debugValidateResult");

    try {
      const puzzle = JSON.parse(input);
      const validation = AppGenerator.validatePuzzle(puzzle);

      if (validation.valid) {
        resultDiv.innerHTML = `
          <div class="debug-validation-success">
            ✓ 谜题验证通过
          </div>
          <div class="debug-validation-info">
            <div>尺寸: ${puzzle.cols}×${puzzle.rows}</div>
            <div>残片数: ${puzzle.text.length}</div>
            <div>文字唯一性: ✓ 全部唯一</div>
          </div>
          <button class="debug-btn-primary" onclick="AppDebugPanel.startValidated()">使用此谜题</button>
        `;
        window._validatedPuzzle = puzzle;
      } else {
        resultDiv.innerHTML = `
          <div class="debug-validation-error">
            ✗ 验证失败: ${validation.error}
          </div>
        `;
      }
    } catch (e) {
      resultDiv.innerHTML = `
        <div class="debug-validation-error">
          ✗ JSON 解析错误: ${e.message}
        </div>
      `;
    }
  }

  function startValidated() {
    if (window._validatedPuzzle && onStartGenerated) {
      onStartGenerated(window._validatedPuzzle);
      close();
    }
  }

  function renderHistory() {
    const list = container.querySelector("#debugHistoryList");
    if (!list) return;

    if (state.history.length === 0) {
      list.innerHTML = '<div class="debug-empty">暂无生成历史</div>';
      return;
    }

    list.innerHTML = state.history.map((h, idx) => `
      <div class="debug-history-item" data-seed="${h.seed}">
        <div class="debug-history-main">
          <div class="debug-history-name">${h.puzzleName}</div>
          <div class="debug-history-meta">
            <span>难度 ${h.difficulty}</span>
            <span>主题 ${h.theme || '-'}</span>
            <span>${new Date(h.timestamp).toLocaleString()}</span>
          </div>
        </div>
        <div class="debug-history-seed"><code>${h.seed}</code></div>
        <div class="debug-history-actions">
          <button class="debug-btn-small" onclick="AppDebugPanel.loadFromHistory(${idx})">加载</button>
          <button class="debug-btn-small" onclick="AppDebugPanel.playFromHistory(${idx})">开始</button>
        </div>
      </div>
    `).join('');
  }

  function renderFavorites() {
    const list = container.querySelector("#debugFavoritesList");
    if (!list) return;

    if (state.favorites.length === 0) {
      list.innerHTML = '<div class="debug-empty">暂无收藏</div>';
      return;
    }

    list.innerHTML = state.favorites.map((f, idx) => `
      <div class="debug-history-item" data-seed="${f.seed}">
        <div class="debug-history-main">
          <div class="debug-history-name">⭐ ${f.puzzleName}</div>
          <div class="debug-history-meta">
            <span>难度 ${f.difficulty}</span>
            <span>主题 ${f.theme || '-'}</span>
            <span>${new Date(f.timestamp).toLocaleString()}</span>
          </div>
        </div>
        <div class="debug-history-seed"><code>${f.seed}</code></div>
        <div class="debug-history-actions">
          <button class="debug-btn-small" onclick="AppDebugPanel.loadFromFavorite(${idx})">加载</button>
          <button class="debug-btn-small" onclick="AppDebugPanel.playFromFavorite(${idx})">开始</button>
          <button class="debug-btn-small debug-btn-danger" onclick="AppDebugPanel.removeFavorite(${idx})">删除</button>
        </div>
      </div>
    `).join('');
  }

  function loadFromHistory(idx) {
    const h = state.history[idx];
    if (!h) return;
    const existingPuzzle = h.puzzle || null;
    const result = AppGenerator.regenerateFromSeed(h.seed, existingPuzzle);
    currentConfig = result;
    currentPuzzle = result.puzzle;
    renderPreview(result);
    container.querySelector("#debugSeedInput").value = h.seed;
    customSeed = h.seed;
    container.querySelector("#debugStartBtn").disabled = false;
    container.querySelector("#debugFavoriteBtn").disabled = false;
    container.querySelector("#debugExportBtn").disabled = false;
    container.querySelector("#debugFavoriteBtn").textContent = isFavorite(h.seed) ? "⭐ 已收藏" : "⭐ 收藏";
  }

  function playFromHistory(idx) {
    const h = state.history[idx];
    if (!h) return;
    const existingPuzzle = h.puzzle || null;
    const result = AppGenerator.regenerateFromSeed(h.seed, existingPuzzle);
    if (onStartGenerated) {
      onStartGenerated(result.puzzle);
      close();
    }
  }

  function loadFromFavorite(idx) {
    const f = state.favorites[idx];
    if (!f) return;
    const existingPuzzle = f.puzzle || null;
    const result = AppGenerator.regenerateFromSeed(f.seed, existingPuzzle);
    currentConfig = result;
    currentPuzzle = result.puzzle;
    renderPreview(result);
    container.querySelector("#debugSeedInput").value = f.seed;
    customSeed = f.seed;
    container.querySelector("#debugStartBtn").disabled = false;
    container.querySelector("#debugFavoriteBtn").disabled = false;
    container.querySelector("#debugExportBtn").disabled = false;
    container.querySelector("#debugFavoriteBtn").textContent = "⭐ 已收藏";
  }

  function playFromFavorite(idx) {
    const f = state.favorites[idx];
    if (!f) return;
    const existingPuzzle = f.puzzle || null;
    const result = AppGenerator.regenerateFromSeed(f.seed, existingPuzzle);
    if (onStartGenerated) {
      onStartGenerated(result.puzzle);
      close();
    }
  }

  function removeFavorite(idx) {
    const f = state.favorites[idx];
    if (f) {
      state.favorites.splice(idx, 1);
      saveState();
      renderFavorites();
    }
  }

  function bindKeyboardShortcuts() {
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "g") {
        e.preventDefault();
        toggle();
      }
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        close();
      }
    });
  }

  function open() {
    isOpen = true;
    container.classList.remove("hidden");
    if (onToggleState) {
      onToggleState(true);
    }
  }

  function close() {
    isOpen = false;
    container.classList.add("hidden");
    if (onToggleState) {
      onToggleState(false);
    }
  }

  function toggle() {
    if (isOpen) close();
    else open();
  }

  function showToast(message) {
    const toast = document.createElement("div");
    toast.className = "debug-toast";
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  }

  function setOnStartGenerated(callback) {
    onStartGenerated = callback;
  }

  function setOnToggleState(callback) {
    onToggleState = callback;
  }

  function getCurrentPuzzle() {
    return currentPuzzle;
  }

  return {
    init,
    open,
    close,
    toggle,
    setOnStartGenerated,
    setOnToggleState,
    getCurrentPuzzle,
    handleToggleFavorite,
    loadFromHistory,
    playFromHistory,
    loadFromFavorite,
    playFromFavorite,
    removeFavorite,
    startValidated
  };
})();

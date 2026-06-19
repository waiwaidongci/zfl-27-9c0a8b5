const AppGeneratorUI = (() => {
  let onStartPreview = null;
  let onSaveCustom = null;
  let onOpenEditor = null;
  let onBack = null;

  let currentStep = "select";
  let currentPuzzle = null;
  let currentConfig = null;

  const state = {
    themeId: null,
    difficulty: 3,
    cols: null,
    rows: null,
    puzzleTheme: null,
    scatterRule: "random",
    damageRule: "none",
    similarity: null
  };

  function setCallbacks(callbacks) {
    if (callbacks.onStartPreview) onStartPreview = callbacks.onStartPreview;
    if (callbacks.onSaveCustom) onSaveCustom = callbacks.onSaveCustom;
    if (callbacks.onOpenEditor) onOpenEditor = callbacks.onOpenEditor;
    if (callbacks.onBack) onBack = callbacks.onBack;
  }

  function init() {
    const themes = AppThesaurus.getThemeNames();
    if (themes.length > 0) {
      state.themeId = themes[0].id;
    }
    const defaultSize = AppLevelAdapter.getOptimalSize(state.difficulty);
    state.cols = defaultSize.cols;
    state.rows = defaultSize.rows;
    state.similarity = AppLevelAdapter.calculateScrambleLevel(state.difficulty).similarity;
  }

  function open() {
    const generatorView = document.querySelector("#generatorView");
    const gameView = document.querySelector(".game-view");
    const editorView = document.querySelector(".editor-view");
    if (generatorView) generatorView.classList.add("active");
    if (gameView) gameView.classList.add("hidden-view");
    if (editorView) editorView.classList.remove("active");
    if (currentStep !== "preview" || !currentPuzzle) {
      currentStep = "select";
      init();
    }
    render();
  }

  function openPreview() {
    currentStep = "preview";
    open();
  }

  function close() {
    const generatorView = document.querySelector("#generatorView");
    const gameView = document.querySelector(".game-view");
    if (generatorView) generatorView.classList.remove("active");
    if (gameView) gameView.classList.remove("hidden-view");
  }

  function handleBack() {
    if (currentStep === "preview") {
      currentStep = "select";
      render();
    } else {
      if (onBack) onBack();
      close();
    }
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function render() {
    const container = document.querySelector("#generatorContainer");
    const stepTitle = document.querySelector("#generatorStepTitle");
    if (!container) return;

    if (currentStep === "select") {
      if (stepTitle) stepTitle.textContent = "选择生成参数";
      container.innerHTML = renderSelectStep();
      bindSelectEvents();
    } else if (currentStep === "preview") {
      if (stepTitle) stepTitle.textContent = "生成预览";
      container.innerHTML = renderPreviewStep();
      bindPreviewEvents();
    }
  }

  function renderSelectStep() {
    const themes = AppThesaurus.getThemeNames();
    const sizes = AppLevelAdapter.getAvailableSizes(state.difficulty);
    const difficultyPresets = AppGenerator.getDifficultyPresets();
    const scatterRules = AppData.scatterRules;
    const damageRules = AppGenerator.getDamageRules();

    const themeCards = themes.map(t => `
      <div class="gen-option-card theme-card ${state.themeId === t.id ? 'active' : ''}" data-theme="${t.id}">
        <div class="gen-option-title">${escapeHtml(t.name)}</div>
        <div class="gen-option-desc">${escapeHtml(t.description)}</div>
      </div>
    `).join("");

    const sizeOptions = sizes.map(s => `
      <div class="gen-size-option ${state.cols === s.cols && state.rows === s.rows ? 'active' : ''}" 
           data-cols="${s.cols}" data-rows="${s.rows}">
        <div class="gen-size-grid" style="grid-template-columns: repeat(${s.cols}, 1fr); grid-template-rows: repeat(${s.rows}, 1fr);">
          ${Array(s.cols * s.rows).fill('<div class="gen-size-cell"></div>').join("")}
        </div>
        <div class="gen-size-label">${s.cols}×${s.rows}</div>
      </div>
    `).join("");

    const difficultyOptions = difficultyPresets.map(d => `
      <div class="gen-diff-option ${state.difficulty === d.level ? 'active' : ''}" data-diff="${d.level}">
        <div class="gen-diff-level">${d.level}</div>
        <div class="gen-diff-name">${escapeHtml(d.name)}</div>
      </div>
    `).join("");

    const diffInfo = AppLevelAdapter.getDifficultyInfo(state.difficulty);
    const scramble = AppLevelAdapter.calculateScrambleLevel(state.difficulty);

    const scatterOptions = Object.keys(scatterRules).map(key => `
      <div class="gen-scatter-option ${state.scatterRule === key ? 'active' : ''}" data-scatter="${key}">
        <div class="gen-scatter-name">${escapeHtml(scatterRules[key].name)}</div>
        <div class="gen-scatter-desc">${escapeHtml(scatterRules[key].desc)}</div>
      </div>
    `).join("");

    const damageOptions = damageRules.map(d => `
      <div class="gen-damage-option ${state.damageRule === d.id ? 'active' : ''}" data-damage="${d.id}">
        ${escapeHtml(d.name)}
      </div>
    `).join("");

    return `
      <div class="gen-two-column">
        <div>
          <div class="gen-section">
            <h2>诗词词库</h2>
            <p class="gen-section-hint">选择一个词库主题，生成的残页文字将从该主题中选取</p>
            <div class="gen-theme-grid">
              ${themeCards}
            </div>
          </div>

          <div class="gen-section" style="margin-top:16px">
            <h2>格子尺寸</h2>
            <p class="gen-section-hint">根据难度等级提供合适的尺寸可选</p>
            <div class="gen-size-row">
              ${sizeOptions}
            </div>
          </div>

          <div class="gen-section" style="margin-top:16px">
            <h2>散落方式</h2>
            <div class="gen-scatter-grid">
              ${scatterOptions}
            </div>
          </div>
        </div>

        <div>
          <div class="gen-section">
            <h2>难度等级</h2>
            <p class="gen-section-hint">难度越高，残片越多，旋转翻面越复杂</p>
            <div class="gen-diff-row">
              ${difficultyOptions}
            </div>
            <div class="gen-diff-detail">
              <div class="gen-diff-desc">${escapeHtml(diffInfo ? diffInfo.description : '')}</div>
              <div class="gen-diff-stats">
                <div><span>旋转判定</span><b>${scramble.rotation ? '✓ 启用' : '✗ 关闭'}</b></div>
                <div><span>翻面判定</span><b>${scramble.flip ? '✓ 启用' : '✗ 关闭'}</b></div>
                <div><span>初始打乱</span><b>${scramble.scrambleInitialRotation ? '旋转' : ''}${scramble.scrambleInitialRotation && scramble.scrambleInitialFlip ? '+' : ''}${scramble.scrambleInitialFlip ? '翻面' : '无'}</b></div>
                <div><span>文字相似度</span><b>${Math.round(scramble.similarity * 100)}%</b></div>
              </div>
            </div>
          </div>

          <div class="gen-section" style="margin-top:16px">
            <h2>残片破损</h2>
            <div class="gen-damage-row">
              ${damageOptions}
            </div>
          </div>

          <div class="gen-section" style="margin-top:16px">
            <h2>生成预览</h2>
            <div class="gen-mini-preview" id="genMiniPreview">
              ${renderMiniPreview()}
            </div>
          </div>

          <div class="gen-actions">
            <button class="secondary" id="genCancelBtn">取消</button>
            <button id="genGenerateBtn">生成残页</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderMiniPreview() {
    const paperKeys = Object.keys(AppData.themes.paper);
    const inkKeys = Object.keys(AppData.themes.ink);
    const paperColor = AppData.paperColors[paperKeys[0]];
    const inkColor = AppData.inkColors[inkKeys[0]];

    const cells = [];
    const total = state.cols * state.rows;
    const sampleWords = getSampleWords(state.themeId, total);
    for (let r = 0; r < state.rows; r++) {
      for (let c = 0; c < state.cols; c++) {
        const idx = r * state.cols + c;
        cells.push(`
          <div class="gen-preview-cell" style="
            left: ${(c * 100 / state.cols)}%;
            top: ${(r * 100 / state.rows)}%;
            width: ${(100 / state.cols)}%;
            height: ${(100 / state.rows)}%;
            background: ${paperColor};
            color: ${inkColor};
          ">
            ${escapeHtml(sampleWords[idx] || '?')}
          </div>
        `);
      }
    }

    return `
      <div class="gen-preview-board">
        ${cells.join("")}
      </div>
      <div class="gen-preview-info">
        <div><span>尺寸</span><b>${state.cols}×${state.rows}（${total} 片）</b></div>
        <div><span>词库</span><b>${escapeHtml(getThemeName(state.themeId))}</b></div>
        <div><span>难度</span><b>Lv.${state.difficulty} ${escapeHtml(getDifficultyName(state.difficulty))}</b></div>
        <div><span>散落</span><b>${escapeHtml(AppData.scatterRules[state.scatterRule]?.name || '')}</b></div>
      </div>
    `;
  }

  function getSampleWords(themeId, count) {
    const bank = AppThesaurus.getWordBank(themeId);
    if (!bank) return Array(count).fill("残片");
    const words = bank.words.slice(0, count);
    while (words.length < count) {
      words.push("残片" + (words.length + 1));
    }
    return words;
  }

  function getThemeName(themeId) {
    const themes = AppThesaurus.getThemeNames();
    const t = themes.find(x => x.id === themeId);
    return t ? t.name : "古籍";
  }

  function getDifficultyName(level) {
    const presets = AppGenerator.getDifficultyPresets();
    const p = presets.find(x => x.level === level);
    return p ? p.name : "普通";
  }

  function bindSelectEvents() {
    document.querySelectorAll(".theme-card").forEach(card => {
      card.onclick = () => {
        state.themeId = card.dataset.theme;
        refreshMiniPreview();
        document.querySelectorAll(".theme-card").forEach(c => c.classList.remove("active"));
        card.classList.add("active");
      };
    });

    document.querySelectorAll(".gen-size-option").forEach(opt => {
      opt.onclick = () => {
        state.cols = parseInt(opt.dataset.cols);
        state.rows = parseInt(opt.dataset.rows);
        refreshMiniPreview();
        document.querySelectorAll(".gen-size-option").forEach(o => o.classList.remove("active"));
        opt.classList.add("active");
      };
    });

    document.querySelectorAll(".gen-diff-option").forEach(opt => {
      opt.onclick = () => {
        const newDiff = parseInt(opt.dataset.diff);
        state.difficulty = newDiff;
        const sizes = AppLevelAdapter.getAvailableSizes(newDiff);
        const hasCurrentSize = sizes.some(s => s.cols === state.cols && s.rows === state.rows);
        if (!hasCurrentSize && sizes.length > 0) {
          state.cols = sizes[0].cols;
          state.rows = sizes[0].rows;
        }
        state.similarity = AppLevelAdapter.calculateScrambleLevel(newDiff).similarity;
        render();
      };
    });

    document.querySelectorAll(".gen-scatter-option").forEach(opt => {
      opt.onclick = () => {
        state.scatterRule = opt.dataset.scatter;
        refreshMiniPreview();
        document.querySelectorAll(".gen-scatter-option").forEach(o => o.classList.remove("active"));
        opt.classList.add("active");
      };
    });

    document.querySelectorAll(".gen-damage-option").forEach(opt => {
      opt.onclick = () => {
        state.damageRule = opt.dataset.damage;
        document.querySelectorAll(".gen-damage-option").forEach(o => o.classList.remove("active"));
        opt.classList.add("active");
      };
    });

    const cancelBtn = document.querySelector("#genCancelBtn");
    if (cancelBtn) cancelBtn.onclick = handleBack;

    const generateBtn = document.querySelector("#genGenerateBtn");
    if (generateBtn) generateBtn.onclick = handleGenerate;

    const backBtn = document.querySelector("#generatorBackBtn");
    if (backBtn) backBtn.onclick = handleBack;
  }

  function refreshMiniPreview() {
    const preview = document.querySelector("#genMiniPreview");
    if (preview) {
      preview.innerHTML = renderMiniPreview();
    }
  }

  function handleGenerate() {
    const seed = AppGenerator.generateRandomSeed();
    const scramble = AppLevelAdapter.calculateScrambleLevel(state.difficulty);
    const rng = AppGenerator.createRNG(seed);

    const result = AppGenerator.generatePuzzle({
      seed,
      difficulty: state.difficulty,
      theme: state.themeId,
      cols: state.cols,
      rows: state.rows,
      scatterRule: state.scatterRule,
      damageRule: state.damageRule,
      similarity: state.similarity,
      enableRotation: scramble.rotation,
      enableFlip: scramble.flip,
      initialRotationScrambled: scramble.scrambleInitialRotation,
      initialFlipScrambled: scramble.scrambleInitialFlip
    });

    currentConfig = result;
    currentPuzzle = result.puzzle;

    const packValidation = LevelPack.validatePuzzle(currentPuzzle);
    if (!packValidation.valid) {
      alert("生成的关卡校验失败：" + packValidation.errors.join("；"));
      return;
    }

    currentStep = "preview";
    render();
  }

  function renderPreviewStep() {
    const puzzle = currentPuzzle;
    const paperColor = AppData.paperColors[puzzle.theme.paper];
    const inkColor = AppData.inkColors[puzzle.theme.ink];

    const cells = [];
    for (let r = 0; r < puzzle.rows; r++) {
      for (let c = 0; c < puzzle.cols; c++) {
        const idx = r * puzzle.cols + c;
        cells.push(`
          <div class="gen-result-cell" style="
            left: ${(c * 100 / puzzle.cols)}%;
            top: ${(r * 100 / puzzle.rows)}%;
            width: ${(100 / puzzle.cols)}%;
            height: ${(100 / puzzle.rows)}%;
            background: ${paperColor};
            color: ${inkColor};
          ">
            ${escapeHtml(puzzle.text[idx])}
          </div>
        `);
      }
    }

    const rotateTool = puzzle.enableRotation ? "✓" : "✗";
    const flipTool = puzzle.enableFlip ? "✓" : "✗";

    return `
      <div class="gen-two-column">
        <div>
          <div class="gen-section">
            <h2>生成结果</h2>
            <div class="gen-result-title">${escapeHtml(puzzle.name)}</div>
            <div class="gen-result-board">
              ${cells.join("")}
            </div>
          </div>

          <div class="gen-section" style="margin-top:16px">
            <h2>文字内容</h2>
            <div class="gen-text-list">
              ${puzzle.text.map((w, i) => `
                <div class="gen-text-item">
                  <span class="gen-text-index">${i + 1}</span>
                  <span class="gen-text-word">${escapeHtml(w)}</span>
                </div>
              `).join("")}
            </div>
          </div>
        </div>

        <div>
          <div class="gen-section">
            <h2>关卡信息</h2>
            <div class="gen-info-grid">
              <div><span>尺寸</span><b>${puzzle.cols}×${puzzle.rows}（${puzzle.text.length} 片）</b></div>
              <div><span>限时</span><b>${puzzle.timeLimit} 秒</b></div>
              <div><span>提示扣分</span><b>${puzzle.hintPenalty} 分</b></div>
              <div><span>散落规则</span><b>${escapeHtml(AppData.scatterRules[puzzle.scatterRule]?.name || puzzle.scatterRule)}</b></div>
              <div><span>旋转判定</span><b>${rotateTool}</b></div>
              <div><span>翻面判定</span><b>${flipTool}</b></div>
            </div>
          </div>

          <div class="gen-section" style="margin-top:16px">
            <h2>主题风格</h2>
            <div class="gen-theme-preview">
              <div class="gen-theme-swatch" style="background: ${paperColor}"></div>
              <div class="gen-theme-info">
                <div><span>纸张</span><b>${escapeHtml(AppData.themes.paper[puzzle.theme.paper]?.name || '')}</b></div>
                <div><span>墨色</span><b style="color:${inkColor}">${escapeHtml(AppData.themes.ink[puzzle.theme.ink]?.name || '')}</b></div>
                <div><span>边框</span><b>${escapeHtml(AppData.themes.border[puzzle.theme.border]?.name || '')}</b></div>
                <div><span>台面</span><b>${escapeHtml(AppData.themes.table[puzzle.theme.table]?.name || '')}</b></div>
              </div>
            </div>
          </div>

          <div class="gen-section" style="margin-top:16px">
            <h2>可用工具</h2>
            <div class="gen-tool-list">
              ${puzzle.availableTools.map(t => {
                const toolNames = { zoom: "放大观察", edgeAlign: "边缘对齐", rotateCw: "顺时针旋转", rotateCcw: "逆时针旋转", flip: "水平翻面" };
                return `<span class="gen-tool-tag">${toolNames[t] || t}</span>`;
              }).join("")}
            </div>
          </div>

          <div class="gen-section" style="margin-top:16px">
            <h2>种子信息</h2>
            <div class="gen-seed-info">
              <code>${escapeHtml(puzzle.generatorSeed || '-')}</code>
              <div class="hint">相同种子可复现相同的残页</div>
            </div>
          </div>

          <div class="gen-actions">
            <button class="secondary" id="genRegenerateBtn">重新生成</button>
            <button class="secondary" id="genPreviewBtn">试玩预览</button>
            <button class="secondary" id="genEditBtn">带回编辑器</button>
            <button id="genSaveBtn">保存为自定义残页</button>
          </div>
        </div>
      </div>
    `;
  }

  function bindPreviewEvents() {
    const backBtn = document.querySelector("#generatorBackBtn");
    if (backBtn) backBtn.onclick = handleBack;

    const regenerateBtn = document.querySelector("#genRegenerateBtn");
    if (regenerateBtn) regenerateBtn.onclick = handleGenerate;

    const previewBtn = document.querySelector("#genPreviewBtn");
    if (previewBtn) previewBtn.onclick = handlePreview;

    const editBtn = document.querySelector("#genEditBtn");
    if (editBtn) editBtn.onclick = handleEdit;

    const saveBtn = document.querySelector("#genSaveBtn");
    if (saveBtn) saveBtn.onclick = handleSave;
  }

  function handlePreview() {
    if (!currentPuzzle) return;
    if (onStartPreview) {
      window._genTempReturn = true;
      onStartPreview(currentPuzzle);
    }
  }

  function handleEdit() {
    if (!currentPuzzle) return;
    close();
    if (onOpenEditor) {
      onOpenEditor(currentPuzzle);
    }
  }

  function handleSave() {
    if (!currentPuzzle) return;

    const normalized = LevelPack.normalizePuzzle(currentPuzzle);
    const validation = LevelPack.validatePuzzle(normalized);
    if (!validation.valid) {
      alert("保存失败，关卡校验不通过：" + validation.errors.join("；"));
      return;
    }

    if (onSaveCustom) {
      onSaveCustom(normalized);
      close();
    }
  }

  function getCurrentPuzzle() {
    return currentPuzzle;
  }

  return {
    open,
    openPreview,
    close,
    setCallbacks,
    getCurrentPuzzle
  };
})();

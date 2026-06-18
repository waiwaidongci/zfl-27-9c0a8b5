const AppEditor = (() => {
  let onSave = null;
  let onCancel = null;
  let onStartPreview = null;

  let editorState = {
    name: "我的残页",
    cols: 3,
    rows: 2,
    text: ["残片1", "残片2", "残片3", "残片4", "残片5", "残片6"],
    theme: { paper: "xuanzhi", ink: "mohei", border: "none", table: "wood" },
    timeLimit: 120,
    hintPenalty: 80,
    scatterRule: "random",
    enableRotation: false,
    enableFlip: false,
    initialRotationScrambled: false,
    initialFlipScrambled: false,
    availableTools: ["zoom", "edgeAlign"]
  };

  const previewRef = { board: null };

  function setCallbacks(callbacks) {
    if (callbacks.onSave) onSave = callbacks.onSave;
    if (callbacks.onCancel) onCancel = callbacks.onCancel;
    if (callbacks.onStartPreview) onStartPreview = callbacks.onStartPreview;
  }

  function open() {
    const editorView = document.querySelector(".editor-view");
    const gameView = document.querySelector(".game-view");
    if (editorView) editorView.classList.add("active");
    if (gameView) gameView.classList.add("hidden-view");
    render();
  }

  function close() {
    const editorView = document.querySelector(".editor-view");
    const gameView = document.querySelector(".game-view");
    if (editorView) editorView.classList.remove("active");
    if (gameView) gameView.classList.remove("hidden-view");
  }

  function resetState() {
    editorState = {
      name: "我的残页",
      cols: 3,
      rows: 2,
      text: ["残片1", "残片2", "残片3", "残片4", "残片5", "残片6"],
      theme: { paper: "xuanzhi", ink: "mohei", border: "none", table: "wood" },
      timeLimit: 120,
      hintPenalty: 80,
      scatterRule: "random",
      enableRotation: false,
      enableFlip: false,
      initialRotationScrambled: false,
      initialFlipScrambled: false,
      availableTools: ["zoom", "edgeAlign"]
    };
  }

  function validate() {
    const total = editorState.cols * editorState.rows;
    if (editorState.text.length !== total) return false;
    if (!editorState.text.every(t => typeof t === "string" && t.trim().length > 0)) return false;
    if (!editorState.name.trim()) return false;
    if (editorState.timeLimit < 10 || editorState.timeLimit > 600) return false;
    if (editorState.hintPenalty < 0 || editorState.hintPenalty > 500) return false;
    return true;
  }

  function buildPuzzle() {
    return {
      name: editorState.name.trim(),
      cols: editorState.cols,
      rows: editorState.rows,
      text: [...editorState.text],
      theme: { ...editorState.theme },
      timeLimit: editorState.timeLimit,
      hintPenalty: editorState.hintPenalty,
      scatterRule: editorState.scatterRule,
      enableRotation: editorState.enableRotation,
      enableFlip: editorState.enableFlip,
      initialRotationScrambled: editorState.initialRotationScrambled,
      initialFlipScrambled: editorState.initialFlipScrambled,
      availableTools: [...editorState.availableTools]
    };
  }

  function handleSave() {
    if (!validate()) {
      alert("请检查填写内容：名称、所有残片文字都不能为空，限时在10-600秒之间，提示扣分在0-500之间。");
      return;
    }
    const puzzle = buildPuzzle();
    if (onSave) onSave(puzzle);
    close();
  }

  function handlePreview() {
    if (!validate()) {
      alert("请检查填写内容：名称、所有残片文字都不能为空，限时在10-600秒之间，提示扣分在0-500之间。");
      return;
    }
    const puzzle = buildPuzzle();
    if (onStartPreview) onStartPreview(puzzle);
  }

  function handleCancel() {
    if (onCancel) onCancel();
    close();
  }

  function updateTextArray() {
    const total = editorState.cols * editorState.rows;
    const newText = [];
    for (let i = 0; i < total; i++) {
      if (i < editorState.text.length && editorState.text[i]) {
        newText.push(editorState.text[i]);
      } else {
        newText.push("残片" + (i + 1));
      }
    }
    editorState.text = newText;
  }

  function render() {
    const container = document.querySelector("#editorContainer");
    if (!container) return;

    container.innerHTML = `
      <div class="editor-breadcrumb">
        <span class="crumb" id="editorBackBtn">← 返回游戏</span>
        <span class="sep">›</span>
        <span class="current">残页编辑器</span>
      </div>
      <div class="editor-container">
        <div>
          <div class="editor-section">
            <h2>基本设置</h2>
            <div class="form-row">
              <label>残页名称</label>
              <input type="text" id="editorName" value="${escapeHtml(editorState.name)}" placeholder="如：夏日绝句">
            </div>
            <div class="form-grid-2">
              <div class="form-row">
                <label>列数 (cols)</label>
                <input type="number" id="editorCols" value="${editorState.cols}" min="2" max="6">
                <div class="hint">2 到 6 列</div>
              </div>
              <div class="form-row">
                <label>行数 (rows)</label>
                <input type="number" id="editorRows" value="${editorState.rows}" min="2" max="5">
                <div class="hint">2 到 5 行</div>
              </div>
            </div>
          </div>

          <div class="editor-section" style="margin-top:16px">
            <h2>残片文字</h2>
            <div class="hint" style="margin-bottom:10px;color:var(--theme-text-muted);font-size:12px">按阅读顺序填写，从左到右、从上到下共 ${editorState.cols * editorState.rows} 个格子</div>
            <div class="text-grid-editor" id="textGridEditor">
              ${renderTextGridInputs()}
            </div>
          </div>

          <div class="editor-section" style="margin-top:16px">
            <h2>主题设置</h2>
            <div class="theme-picker-group">
              <div>
                <h3>纸张纹理</h3>
                <div class="theme-picker-row" id="paperPicker">
                  ${renderThemePicker("paper")}
                </div>
              </div>
              <div>
                <h3>墨色</h3>
                <div class="theme-picker-row" id="inkPicker">
                  ${renderThemePicker("ink")}
                </div>
              </div>
              <div>
                <h3>边框样式</h3>
                <div class="theme-picker-row" id="borderPicker">
                  ${renderThemePicker("border")}
                </div>
              </div>
              <div>
                <h3>背景台面</h3>
                <div class="theme-picker-row" id="tablePicker">
                  ${renderThemePicker("table")}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div class="editor-section">
            <h2>难度参数</h2>
            <div class="form-row">
              <label>限制时间（秒）</label>
              <input type="number" id="editorTimeLimit" value="${editorState.timeLimit}" min="10" max="600">
              <div class="hint">10 - 600 秒</div>
            </div>
            <div class="form-row">
              <label>使用提示扣分</label>
              <input type="number" id="editorHintPenalty" value="${editorState.hintPenalty}" min="0" max="500">
              <div class="hint">0 - 500 分</div>
            </div>
          </div>

          <div class="editor-section" style="margin-top:16px">
            <h2>初始散落规则</h2>
            <div class="scatter-rules" id="scatterPicker">
              ${renderScatterOptions()}
            </div>
          </div>

          <div class="editor-section" style="margin-top:16px">
            <h2>残片方向设置</h2>
            <div class="form-row">
              <label class="checkbox-label">
                <input type="checkbox" id="editorEnableRotation" ${editorState.enableRotation ? "checked" : ""}>
                <span>启用旋转判定</span>
              </label>
              <div class="hint">启用后，残片需要旋转到正确方向才算归位</div>
            </div>
            <div class="form-row">
              <label class="checkbox-label">
                <input type="checkbox" id="editorInitialRotationScrambled" ${editorState.initialRotationScrambled ? "checked" : ""}>
                <span>初始方向打乱</span>
              </label>
              <div class="hint">游戏开始时残片方向随机</div>
            </div>
            <div class="form-row">
              <label class="checkbox-label">
                <input type="checkbox" id="editorEnableFlip" ${editorState.enableFlip ? "checked" : ""}>
                <span>启用翻面判定</span>
              </label>
              <div class="hint">启用后，残片需要正面朝上才算归位</div>
            </div>
            <div class="form-row">
              <label class="checkbox-label">
                <input type="checkbox" id="editorInitialFlipScrambled" ${editorState.initialFlipScrambled ? "checked" : ""}>
                <span>初始翻面打乱</span>
              </label>
              <div class="hint">游戏开始时部分残片背面朝上</div>
            </div>
          </div>

          <div class="editor-section" style="margin-top:16px">
            <h2>可用工具箱</h2>
            <div class="tool-picker" id="toolPicker">
              ${renderToolPicker()}
            </div>
            <div class="hint" style="margin-top:8px;color:var(--theme-text-muted);font-size:12px">选择本关可以使用的修补工具</div>
          </div>

          <div class="editor-section" style="margin-top:16px">
            <h2>实时预览</h2>
            <div id="previewContainer" style="padding:4px">
              ${renderPreviewBoard()}
            </div>
          </div>

          <div class="editor-actions">
            <button class="secondary" id="editorCancelBtn">取消</button>
            <button class="secondary" id="editorPreviewBtn">试玩</button>
            <button id="editorSaveBtn">保存并添加</button>
          </div>
        </div>
      </div>
    `;

    bindEditorEvents();
    applyPreviewTheme();
  }

  function renderTextGridInputs() {
    let html = "";
    for (let i = 0; i < editorState.text.length; i++) {
      html += `<div class="text-grid-cell">
        <span class="cell-index">${i + 1}.</span>
        <input type="text" class="text-cell-input" data-idx="${i}" value="${escapeHtml(editorState.text[i])}" placeholder="残片${i + 1}文字" maxlength="8">
      </div>`;
    }
    return html;
  }

  function renderThemePicker(category) {
    const items = AppData.themes[category];
    const current = editorState.theme[category];
    const colors = category === "paper" ? AppData.paperColors :
                   category === "ink" ? AppData.inkColors : null;
    let html = "";
    Object.keys(items).forEach(key => {
      const item = items[key];
      const isActive = key === current;
      if (colors && colors[key]) {
        html += `<button class="theme-picker-btn color-swatch ${isActive ? "active" : ""}"
                 data-category="${category}" data-key="${key}" title="${item.name}"
                 style="background:${colors[key]};${isActive ? "border-color:var(--theme-btn-bg);box-shadow:0 0 0 2px rgba(138,79,45,0.3)" : ""}"></button>`;
      } else {
        html += `<button class="theme-picker-btn ${isActive ? "active" : ""}"
                 data-category="${category}" data-key="${key}">${item.name}</button>`;
      }
    });
    return html;
  }

  function renderScatterOptions() {
    const rules = AppData.scatterRules;
    let html = "";
    Object.keys(rules).forEach(key => {
      const rule = rules[key];
      const isActive = editorState.scatterRule === key;
      html += `<div class="scatter-option ${isActive ? "active" : ""}">
        <input type="radio" id="scatter_${key}" name="scatter" value="${key}" ${isActive ? "checked" : ""}>
        <label for="scatter_${key}">
          ${rule.name}
          <small>${rule.desc}</small>
        </label>
      </div>`;
    });
    return html;
  }

  function renderToolPicker() {
    const tools = [
      { id: "rotateCw", name: "顺时针旋转", icon: "↻", category: "transform" },
      { id: "rotateCcw", name: "逆时针旋转", icon: "↺", category: "transform" },
      { id: "flip", name: "水平翻面", icon: "⇋", category: "transform" },
      { id: "zoom", name: "放大观察", icon: "🔍", category: "view" },
      { id: "edgeAlign", name: "边缘对齐", icon: "▦", category: "assist" }
    ];
    let html = '<div class="tool-picker-grid">';
    tools.forEach(tool => {
      const isChecked = editorState.availableTools.includes(tool.id);
      html += `
        <label class="tool-picker-item ${isChecked ? "active" : ""}">
          <input type="checkbox" data-tool="${tool.id}" ${isChecked ? "checked" : ""}>
          <span class="tool-picker-icon">${tool.icon}</span>
          <span class="tool-picker-name">${tool.name}</span>
        </label>
      `;
    });
    html += '</div>';
    return html;
  }

  function renderPreviewBoard() {
    const paperClass = AppData.themes.paper[editorState.theme.paper].class;
    const borderClass = AppData.themes.border[editorState.theme.border].class;
    const inkColor = AppData.inkColors[editorState.theme.ink];
    const tableClass = AppData.themes.table[editorState.theme.table].class;

    const boardStyle = `--theme-board-bg: ${getBoardBgForTable(editorState.theme.table)};`;
    let html = `<div class="editor-preview-board ${paperClass} ${tableClass}" id="previewBoard" style="${boardStyle}">`;

    for (let r = 0; r < editorState.rows; r++) {
      for (let c = 0; c < editorState.cols; c++) {
        const idx = r * editorState.cols + c;
        const leftPct = (c * 100 / editorState.cols) + "%";
        const topPct = (r * 100 / editorState.rows) + "%";
        const wPct = (100 / editorState.cols) + "%";
        const hPct = (100 / editorState.rows) + "%";
        const label = editorState.text[idx] || ("残片" + (idx + 1));
        html += `<div class="editor-preview-cell ${borderClass}"
                  style="left:${leftPct};top:${topPct};width:${wPct};height:${hPct};color:${inkColor}">
                  ${escapeHtml(label)}
                </div>`;
      }
    }
    html += "</div>";
    html += `<div style="margin-top:10px;display:grid;gap:4px;font-size:12px;color:var(--theme-text-muted)">
      <div style="display:flex;justify-content:space-between"><span>限时</span><b>${editorState.timeLimit} 秒</b></div>
      <div style="display:flex;justify-content:space-between"><span>提示扣分</span><b>${editorState.hintPenalty} 分</b></div>
      <div style="display:flex;justify-content:space-between"><span>散落规则</span><b>${AppData.scatterRules[editorState.scatterRule].name}</b></div>
    </div>`;
    return html;
  }

  function getBoardBgForTable(tableKey) {
    const tableBgs = {
      base: "#d9caa8",
      wood: "#c9b896",
      stone: "#b8b5ac",
      silk: "#e0d4c0",
      bamboo: "#d0c8a8",
      lacquer: "#3a3025"
    };
    return tableBgs[tableKey] || "#d9caa8";
  }

  function applyPreviewTheme() {
    const preview = document.querySelector("#previewContainer");
    if (!preview) return;
    preview.innerHTML = renderPreviewBoard();
  }

  function refreshTextGridAndPreview() {
    const grid = document.querySelector("#textGridEditor");
    const preview = document.querySelector("#previewContainer");
    if (grid) grid.innerHTML = renderTextGridInputs();
    if (preview) preview.innerHTML = renderPreviewBoard();
    bindTextGridEvents();
  }

  function refreshThemePicker() {
    ["paper", "ink", "border", "table"].forEach(cat => {
      const picker = document.querySelector("#" + cat + "Picker");
      if (picker) picker.innerHTML = renderThemePicker(cat);
    });
    bindThemePickerEvents();
    applyPreviewTheme();
  }

  function refreshScatterPicker() {
    const picker = document.querySelector("#scatterPicker");
    if (picker) picker.innerHTML = renderScatterOptions();
    bindScatterEvents();
  }

  function bindEditorEvents() {
    const nameInput = document.querySelector("#editorName");
    if (nameInput) {
      nameInput.addEventListener("input", () => {
        editorState.name = nameInput.value;
      });
    }

    const colsInput = document.querySelector("#editorCols");
    if (colsInput) {
      colsInput.addEventListener("change", () => {
        let val = parseInt(colsInput.value) || 3;
        val = Math.max(2, Math.min(6, val));
        colsInput.value = val;
        editorState.cols = val;
        updateTextArray();
        refreshTextGridAndPreview();
      });
    }

    const rowsInput = document.querySelector("#editorRows");
    if (rowsInput) {
      rowsInput.addEventListener("change", () => {
        let val = parseInt(rowsInput.value) || 2;
        val = Math.max(2, Math.min(5, val));
        rowsInput.value = val;
        editorState.rows = val;
        updateTextArray();
        refreshTextGridAndPreview();
      });
    }

    const timeInput = document.querySelector("#editorTimeLimit");
    if (timeInput) {
      timeInput.addEventListener("change", () => {
        let val = parseInt(timeInput.value) || 120;
        val = Math.max(10, Math.min(600, val));
        timeInput.value = val;
        editorState.timeLimit = val;
        applyPreviewTheme();
      });
    }

    const penaltyInput = document.querySelector("#editorHintPenalty");
    if (penaltyInput) {
      penaltyInput.addEventListener("change", () => {
        let val = parseInt(penaltyInput.value) || 80;
        val = Math.max(0, Math.min(500, val));
        penaltyInput.value = val;
        editorState.hintPenalty = val;
        applyPreviewTheme();
      });
    }

    bindTextGridEvents();
    bindThemePickerEvents();
    bindScatterEvents();
    bindOrientationEvents();
    bindToolPickerEvents();

    const saveBtn = document.querySelector("#editorSaveBtn");
    const previewBtn = document.querySelector("#editorPreviewBtn");
    const cancelBtn = document.querySelector("#editorCancelBtn");
    const backBtn = document.querySelector("#editorBackBtn");

    if (saveBtn) saveBtn.onclick = handleSave;
    if (previewBtn) previewBtn.onclick = handlePreview;
    if (cancelBtn) cancelBtn.onclick = handleCancel;
    if (backBtn) backBtn.onclick = handleCancel;
  }

  function bindTextGridEvents() {
    document.querySelectorAll(".text-cell-input").forEach(input => {
      input.addEventListener("input", () => {
        const idx = parseInt(input.dataset.idx);
        editorState.text[idx] = input.value;
        const cells = document.querySelectorAll(".editor-preview-cell");
        if (cells[idx]) {
          cells[idx].textContent = input.value || ("残片" + (idx + 1));
        }
      });
    });
  }

  function bindThemePickerEvents() {
    document.querySelectorAll(".theme-picker-btn").forEach(btn => {
      btn.onclick = () => {
        const category = btn.dataset.category;
        const key = btn.dataset.key;
        editorState.theme[category] = key;
        refreshThemePicker();
      };
    });
  }

  function bindScatterEvents() {
    document.querySelectorAll('input[name="scatter"]').forEach(input => {
      input.onchange = () => {
        editorState.scatterRule = input.value;
        refreshScatterPicker();
        applyPreviewTheme();
      };
    });
  }

  function bindOrientationEvents() {
    const enableRotation = document.querySelector("#editorEnableRotation");
    if (enableRotation) {
      enableRotation.onchange = () => {
        editorState.enableRotation = enableRotation.checked;
        if (!editorState.enableRotation) {
          editorState.initialRotationScrambled = false;
          refreshOrientationUI();
        }
      };
    }
    const initialRotationScrambled = document.querySelector("#editorInitialRotationScrambled");
    if (initialRotationScrambled) {
      initialRotationScrambled.onchange = () => {
        editorState.initialRotationScrambled = initialRotationScrambled.checked;
        if (editorState.initialRotationScrambled) {
          editorState.enableRotation = true;
          const rotCheck = document.querySelector("#editorEnableRotation");
          if (rotCheck) rotCheck.checked = true;
        }
      };
    }
    const enableFlip = document.querySelector("#editorEnableFlip");
    if (enableFlip) {
      enableFlip.onchange = () => {
        editorState.enableFlip = enableFlip.checked;
        if (!editorState.enableFlip) {
          editorState.initialFlipScrambled = false;
          refreshOrientationUI();
        }
      };
    }
    const initialFlipScrambled = document.querySelector("#editorInitialFlipScrambled");
    if (initialFlipScrambled) {
      initialFlipScrambled.onchange = () => {
        editorState.initialFlipScrambled = initialFlipScrambled.checked;
        if (editorState.initialFlipScrambled) {
          editorState.enableFlip = true;
          const flipCheck = document.querySelector("#editorEnableFlip");
          if (flipCheck) flipCheck.checked = true;
        }
      };
    }
  }

  function refreshOrientationUI() {
    const rotCheck = document.querySelector("#editorEnableRotation");
    const initRotCheck = document.querySelector("#editorInitialRotationScrambled");
    const flipCheck = document.querySelector("#editorEnableFlip");
    const initFlipCheck = document.querySelector("#editorInitialFlipScrambled");
    if (rotCheck) rotCheck.checked = editorState.enableRotation;
    if (initRotCheck) initRotCheck.checked = editorState.initialRotationScrambled;
    if (flipCheck) flipCheck.checked = editorState.enableFlip;
    if (initFlipCheck) initFlipCheck.checked = editorState.initialFlipScrambled;
  }

  function bindToolPickerEvents() {
    const toolPicker = document.querySelector("#toolPicker");
    if (!toolPicker) return;
    toolPicker.querySelectorAll('input[type="checkbox"]').forEach(input => {
      input.onchange = () => {
        const toolId = input.dataset.tool;
        if (input.checked) {
          if (!editorState.availableTools.includes(toolId)) {
            editorState.availableTools.push(toolId);
          }
        } else {
          editorState.availableTools = editorState.availableTools.filter(t => t !== toolId);
        }
        const item = input.closest(".tool-picker-item");
        if (item) {
          item.classList.toggle("active", input.checked);
        }
      };
    });
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  return {
    open,
    close,
    resetState,
    setCallbacks
  };
})();

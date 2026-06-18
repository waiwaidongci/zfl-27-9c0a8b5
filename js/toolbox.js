const AppToolbox = (() => {
  const tools = {};
  let toolUsage = {};
  let selectedPiece = null;
  let container = null;
  let game = null;
  let puzzleConfig = null;
  let edgeAlignActive = false;
  let zoomActive = false;
  let zoomOverlay = null;

  function registerTool(id, toolDef) {
    tools[id] = { id, ...toolDef };
  }

  function init(deps) {
    container = document.querySelector("#toolboxContainer");
    game = deps.game;

    registerTool("rotateCw", {
      name: "顺时针旋转",
      icon: "↻",
      description: "将选中的残片顺时针旋转90度",
      category: "transform",
      isAvailable: (config) => AppPieceState.canRotate(config),
      onUse: (piece) => {
        if (!piece) return false;
        AppPieceState.rotatePiece(piece, 1);
        return true;
      }
    });

    registerTool("rotateCcw", {
      name: "逆时针旋转",
      icon: "↺",
      description: "将选中的残片逆时针旋转90度",
      category: "transform",
      isAvailable: (config) => AppPieceState.canRotate(config),
      onUse: (piece) => {
        if (!piece) return false;
        AppPieceState.rotatePiece(piece, -1);
        return true;
      }
    });

    registerTool("flip", {
      name: "水平翻面",
      icon: "⇋",
      description: "将选中的残片水平翻转",
      category: "transform",
      isAvailable: (config) => AppPieceState.canFlip(config),
      onUse: (piece) => {
        if (!piece) return false;
        AppPieceState.flipPiece(piece);
        return true;
      }
    });

    registerTool("zoom", {
      name: "放大观察",
      icon: "🔍",
      description: "放大查看选中的残片细节",
      category: "view",
      toggle: true,
      isAvailable: () => true,
      onUse: (piece) => {
        if (!piece) return false;
        toggleZoom(piece);
        return true;
      }
    });

    registerTool("edgeAlign", {
      name: "边缘对齐辅助",
      icon: "▦",
      description: "显示网格辅助线，帮助对齐残片边缘",
      category: "assist",
      toggle: true,
      isAvailable: () => true,
      onUse: () => {
        toggleEdgeAlign();
        return true;
      }
    });
  }

  function resetUsage() {
    toolUsage = {};
    Object.keys(tools).forEach(id => {
      toolUsage[id] = 0;
    });
    selectedPiece = null;
    edgeAlignActive = false;
    zoomActive = false;
    if (zoomOverlay) {
      zoomOverlay.remove();
      zoomOverlay = null;
    }
  }

  function getUsage() {
    return { ...toolUsage };
  }

  function getTotalUsage() {
    return Object.values(toolUsage).reduce((a, b) => a + b, 0);
  }

  function setSelectedPiece(piece) {
    selectedPiece = piece;
    updateToolStates();
  }

  function setPuzzleConfig(config) {
    puzzleConfig = config;
    resetUsage();
    render();
  }

  function useTool(toolId) {
    const tool = tools[toolId];
    if (!tool) return false;
    if (!isToolAvailable(toolId)) return false;

    const success = tool.onUse(selectedPiece, puzzleConfig);
    if (success) {
      toolUsage[toolId] = (toolUsage[toolId] || 0) + 1;
      if (game && game.onToolUsed) {
        game.onToolUsed(toolId, selectedPiece);
      }
      updateToolStates();
    }
    return success;
  }

  function isToolAvailable(toolId) {
    const tool = tools[toolId];
    if (!tool) return false;

    if (puzzleConfig && puzzleConfig.availableTools) {
      if (!puzzleConfig.availableTools.includes(toolId)) {
        return false;
      }
    }

    if (tool.isAvailable && puzzleConfig) {
      return tool.isAvailable(puzzleConfig);
    }
    return true;
  }

  function toggleEdgeAlign() {
    edgeAlignActive = !edgeAlignActive;
    const board = document.querySelector("#board");
    if (!board) return;

    if (edgeAlignActive) {
      board.classList.add("edge-align-active");
    } else {
      board.classList.remove("edge-align-active");
    }
  }

  function toggleZoom(piece) {
    if (zoomActive && zoomOverlay) {
      zoomOverlay.remove();
      zoomOverlay = null;
      zoomActive = false;
      return;
    }

    if (!piece) return;

    zoomActive = true;
    const overlay = document.createElement("div");
    overlay.className = "zoom-overlay";
    overlay.innerHTML = `
      <div class="zoom-content">
        <div class="zoom-piece">${piece.label}</div>
        <div class="zoom-label">残片${piece.id + 1}</div>
        <button class="zoom-close-btn">关闭</button>
      </div>
    `;
    document.body.appendChild(overlay);
    zoomOverlay = overlay;

    overlay.querySelector(".zoom-close-btn").onclick = () => {
      overlay.remove();
      zoomOverlay = null;
      zoomActive = false;
      updateToolStates();
    };
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        overlay.remove();
        zoomOverlay = null;
        zoomActive = false;
        updateToolStates();
      }
    };
  }

  function updateToolStates() {
    if (!container) return;
    const toolBtns = container.querySelectorAll(".tool-btn");
    toolBtns.forEach(btn => {
      const toolId = btn.dataset.tool;
      const tool = tools[toolId];
      const available = isToolAvailable(toolId);

      btn.disabled = !available;

      if (tool.toggle) {
        if (toolId === "edgeAlign" && edgeAlignActive) {
          btn.classList.add("active");
        } else if (toolId === "zoom" && zoomActive) {
          btn.classList.add("active");
        } else {
          btn.classList.remove("active");
        }
      }
    });
  }

  function render() {
    if (!container) return;

    let html = '<h2 class="toolbox-title">修补工具箱</h2>';

    const categories = [
      { id: "transform", title: "残片变换" },
      { id: "view", title: "观察工具" },
      { id: "assist", title: "辅助工具" }
    ];

    categories.forEach(cat => {
      const catTools = Object.values(tools).filter(t => t.category === cat.id);
      const availableTools = catTools.filter(t => isToolAvailable(t.id));
      if (availableTools.length === 0) return;

      html += `<div class="tool-category">`;
      html += `<div class="tool-category-title">${cat.title}</div>`;
      html += `<div class="tool-group">`;

      catTools.forEach(tool => {
        const available = isToolAvailable(tool.id);
        const activeClass = (tool.toggle && ((tool.id === "edgeAlign" && edgeAlignActive) || (tool.id === "zoom" && zoomActive))) ? " active" : "";
        html += `
          <button class="tool-btn ${available ? "" : "tool-disabled"}${activeClass}" 
                  data-tool="${tool.id}" 
                  title="${tool.description}"
                  ${available ? "" : "disabled"}>
            <span class="tool-icon">${tool.icon}</span>
            <span class="tool-name">${tool.name}</span>
            <span class="tool-usage-count">${toolUsage[tool.id] || 0}</span>
          </button>
        `;
      });

      html += `</div></div>`;
    });

    if (selectedPiece) {
      html += `
        <div class="selected-piece-info">
          <div class="selected-label">当前选中</div>
          <div class="selected-piece-name">残片${selectedPiece.id + 1}：${selectedPiece.label}</div>
        </div>
      `;
    } else {
      html += `
        <div class="selected-piece-info empty">
          <div class="selected-label">点击残片选择</div>
          <div class="selected-piece-name">可使用工具箱操作</div>
        </div>
      `;
    }

    container.innerHTML = html;

    container.querySelectorAll(".tool-btn").forEach(btn => {
      btn.onclick = () => {
        const toolId = btn.dataset.tool;
        useTool(toolId);
        render();
      };
    });
  }

  function isEdgeAlignActive() {
    return edgeAlignActive;
  }

  return {
    init,
    registerTool,
    render,
    useTool,
    setSelectedPiece,
    setPuzzleConfig,
    resetUsage,
    getUsage,
    getTotalUsage,
    isToolAvailable,
    isEdgeAlignActive
  };
})();

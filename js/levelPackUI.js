const LevelPackUI = (() => {
  let onImportComplete = null;
  let onExportComplete = null;
  let currentPackData = null;
  let currentPreview = null;
  let conflictResolutions = {};

  function setCallbacks(callbacks) {
    if (callbacks.onImportComplete) onImportComplete = callbacks.onImportComplete;
    if (callbacks.onExportComplete) onExportComplete = callbacks.onExportComplete;
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  function formatDate(ts) {
    if (!ts) return "未知";
    try {
      const d = new Date(ts);
      return d.getFullYear() + "-" +
        String(d.getMonth() + 1).padStart(2, "0") + "-" +
        String(d.getDate()).padStart(2, "0") + " " +
        String(d.getHours()).padStart(2, "0") + ":" +
        String(d.getMinutes()).padStart(2, "0");
    } catch (e) {
      return String(ts);
    }
  }

  function closeOverlay(overlay) {
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
  }

  function createOverlay(contentHtml, extraClass) {
    const overlay = document.createElement("div");
    overlay.className = "lp-overlay" + (extraClass ? " " + extraClass : "");
    overlay.innerHTML = contentHtml;
    document.body.appendChild(overlay);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        const hasNoDismiss = overlay.querySelector("[data-no-dismiss]");
        if (!hasNoDismiss) closeOverlay(overlay);
      }
    });
    return overlay;
  }

  function showToast(message, type) {
    const existing = document.querySelector(".lp-toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.className = "lp-toast lp-toast-" + (type || "info");
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add("show"));
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 400);
    }, 3200);
  }

  function openExportPicker() {
    const allPuzzles = AppData.getAllPuzzles();
    const builtinPuzzles = AppData.getBuiltinPuzzles();
    const customPuzzles = AppData.getCustomPuzzles();

    let html = '<div class="lp-modal" data-no-dismiss><div class="lp-modal-header">';
    html += '<h2>📦 导出关卡包</h2><span class="lp-close-btn" data-action="close">×</span></div>';
    html += '<div class="lp-modal-body">';

    html += '<div class="lp-form-section">';
    html += '<label class="lp-label">关卡包名称</label>';
    html += '<input type="text" id="lpPackName" class="lp-input" placeholder="例如：我的珍藏残页" value="我的关卡包">';
    html += '</div>';

    html += '<div class="lp-form-section">';
    html += '<label class="lp-label">关卡包描述（可选）</label>';
    html += '<textarea id="lpPackDesc" class="lp-textarea" placeholder="简要说明这个关卡包的内容……"></textarea>';
    html += '</div>';

    html += '<div class="lp-form-section">';
    html += '<div class="lp-picker-toolbar">';
    html += '<label class="lp-label" style="margin:0">选择要导出的关卡</label>';
    html += '<div class="lp-bulk-actions">';
    html += '<button type="button" class="lp-btn-small secondary" data-action="select-all">全选</button>';
    html += '<button type="button" class="lp-btn-small secondary" data-action="select-custom">仅自定义</button>';
    html += '<button type="button" class="lp-btn-small secondary" data-action="select-none">清空</button>';
    html += '</div></div>';

    if (customPuzzles.length > 0) {
      html += '<div class="lp-puzzle-group">';
      html += '<div class="lp-puzzle-group-title">我的残页（自定义）</div>';
      for (let i = 0; i < customPuzzles.length; i++) {
        const globalIdx = builtinPuzzles.length + i;
        const p = customPuzzles[i];
        html += renderPuzzleCheckbox(p, globalIdx);
      }
      html += '</div>';
    }

    html += '<div class="lp-puzzle-group">';
    html += '<div class="lp-puzzle-group-title">内置残页</div>';
    for (let i = 0; i < builtinPuzzles.length; i++) {
      const p = builtinPuzzles[i];
      html += renderPuzzleCheckbox(p, i);
    }
    html += '</div>';

    html += '</div>';
    html += '<div class="lp-modal-actions">';
    html += '<button class="secondary" data-action="cancel">取消</button>';
    html += '<button data-action="do-export" id="lpDoExportBtn">确认导出</button>';
    html += '</div></div></div>';

    const overlay = createOverlay(html);
    const selected = new Set();

    overlay.querySelectorAll(".lp-bulk-actions button").forEach(btn => {
      btn.onclick = () => {
        const action = btn.dataset.action;
        const checkboxes = overlay.querySelectorAll(".lp-puzzle-checkbox input[type=checkbox]");
        checkboxes.forEach(cb => {
          if (action === "select-all") cb.checked = true;
          else if (action === "select-none") cb.checked = false;
          else if (action === "select-custom") {
            cb.checked = cb.dataset.custom === "true";
          }
        });
      };
    });

    overlay.querySelector('[data-action="close"]').onclick = () => closeOverlay(overlay);
    overlay.querySelector('[data-action="cancel"]').onclick = () => closeOverlay(overlay);

    overlay.querySelector('[data-action="do-export"]').onclick = () => {
      const indices = [];
      overlay.querySelectorAll(".lp-puzzle-checkbox input[type=checkbox]:checked").forEach(cb => {
        indices.push(Number(cb.dataset.index));
      });
      if (indices.length === 0) {
        showToast("请至少选择一个关卡", "warn");
        return;
      }
      const name = overlay.querySelector("#lpPackName").value.trim() || "关卡包";
      const desc = overlay.querySelector("#lpPackDesc").value.trim();
      try {
        LevelPack.exportPackToFile(indices, { name, description: desc });
        showToast("成功导出 " + indices.length + " 个关卡！", "success");
        closeOverlay(overlay);
        if (onExportComplete) onExportComplete();
      } catch (e) {
        showToast("导出失败：" + e.message, "error");
      }
    };

    return overlay;
  }

  function renderPuzzleCheckbox(puzzle, index) {
    const previewColors = AppData.getThemePreviewColor(puzzle.theme);
    return '<label class="lp-puzzle-checkbox">' +
      '<input type="checkbox" data-index="' + index + '" data-custom="' + (puzzle.custom ? "true" : "false") + '">' +
      '<div class="lp-puzzle-checkbox-inner">' +
      '<div class="lp-theme-dots">' +
      '<div class="theme-dot" style="background:' + previewColors.paper + ';border-color:' + previewColors.ink + '"></div>' +
      '<div class="theme-dot" style="background:' + previewColors.ink + '"></div>' +
      '</div>' +
      '<div class="lp-puzzle-info">' +
      '<div class="lp-puzzle-name">' + escapeHtml(puzzle.name) +
      (puzzle.custom ? ' <span class="custom-tag">自定义</span>' : '') +
      '</div>' +
      '<div class="lp-puzzle-meta">' + puzzle.cols + '×' + puzzle.rows + ' · ' + (puzzle.cols * puzzle.rows) + '片 · 限时' + puzzle.timeLimit + '秒</div>' +
      '</div></div></label>';
  }

  function openImportFilePicker() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".zflpack.json,.json,application/json";
    input.style.display = "none";
    document.body.appendChild(input);

    input.onchange = (e) => {
      const file = e.target.files[0];
      document.body.removeChild(input);
      if (!file) return;
      handleImportFile(file);
    };

    input.click();
  }

  async function handleImportFile(file) {
    showLoadingOverlay("正在读取关卡包文件……");
    let parseResult;
    try {
      parseResult = await LevelPack.parsePackFile(file);
    } catch (e) {
      closeAllOverlays();
      showToast("读取失败：" + e.message, "error");
      return;
    }
    closeAllOverlays();

    if (!parseResult.ok) {
      showImportError(parseResult);
      return;
    }

    currentPackData = parseResult.raw;
    currentPreview = LevelPack.buildPreview(currentPackData);
    conflictResolutions = {};

    showImportPreview();
  }

  function showLoadingOverlay(message) {
    closeAllOverlays();
    createOverlay(
      '<div class="lp-modal lp-loading-modal" data-no-dismiss><div class="lp-spinner"></div>' +
      '<div class="lp-loading-text">' + escapeHtml(message || "处理中……") + '</div></div>'
    );
  }

  function closeAllOverlays() {
    document.querySelectorAll(".lp-overlay").forEach(el => el.remove());
  }

  function showImportError(parseResult) {
    let html = '<div class="lp-modal lp-error-modal" data-no-dismiss><div class="lp-modal-header">';
    html += '<h2>⚠️ 导入失败</h2><span class="lp-close-btn" data-action="close">×</span></div>';
    html += '<div class="lp-modal-body">';

    if (parseResult.stage === "read" || parseResult.stage === "parse") {
      html += '<div class="lp-error-banner lp-error-fatal">';
      html += '<div class="lp-error-title">文件格式错误</div>';
      html += '<div class="lp-error-msg">' + escapeHtml(parseResult.error) + '</div>';
      html += '</div>';
      html += '<p class="lp-hint">请确认选择的是本游戏导出的 .zflpack.json 文件。</p>';
    } else if (parseResult.stage === "validate" && parseResult.validation) {
      const v = parseResult.validation;
      if (v.fatalErrors.length > 0) {
        html += '<div class="lp-error-banner lp-error-fatal">';
        html += '<div class="lp-error-title">关卡包校验失败</div>';
        v.fatalErrors.forEach(e => {
          html += '<div class="lp-error-item">✗ ' + escapeHtml(e) + '</div>';
        });
        html += '</div>';
      }
      if (v.levelErrors.length > 0) {
        html += '<div class="lp-error-banner lp-error-errors">';
        html += '<div class="lp-error-title">关卡数据错误（' + v.levelErrors.length + ' 项）</div>';
        v.levelErrors.slice(0, 20).forEach(e => {
          html += '<div class="lp-error-item">✗ ' + escapeHtml(e) + '</div>';
        });
        if (v.levelErrors.length > 20) {
          html += '<div class="lp-error-item lp-hint">……还有 ' + (v.levelErrors.length - 20) + ' 项错误</div>';
        }
        html += '</div>';
      }
      if (v.levelWarnings.length > 0) {
        html += '<div class="lp-error-banner lp-error-warnings">';
        html += '<div class="lp-error-title">警告信息（' + v.levelWarnings.length + ' 项）</div>';
        v.levelWarnings.slice(0, 15).forEach(w => {
          html += '<div class="lp-warning-item">⚠ ' + escapeHtml(w) + '</div>';
        });
        html += '</div>';
      }
    }

    html += '</div><div class="lp-modal-actions">';
    html += '<button data-action="close">知道了</button>';
    html += '</div></div>';

    const overlay = createOverlay(html);
    overlay.querySelectorAll('[data-action="close"]').forEach(btn => {
      btn.onclick = () => closeOverlay(overlay);
    });
  }

  function showImportPreview() {
    const preview = currentPreview;
    let html = '<div class="lp-modal lp-preview-modal" data-no-dismiss><div class="lp-modal-header">';
    html += '<h2>📥 导入关卡包预览</h2><span class="lp-close-btn" data-action="close">×</span></div>';
    html += '<div class="lp-modal-body">';

    html += '<div class="lp-pack-meta">';
    html += '<div class="lp-pack-meta-row"><span>关卡包名称</span><b>' + escapeHtml(preview.meta.name || "未命名") + '</b></div>';
    if (preview.meta.description) {
      html += '<div class="lp-pack-meta-row lp-pack-desc"><span>描述</span><span>' + escapeHtml(preview.meta.description) + '</span></div>';
    }
    html += '<div class="lp-pack-meta-row"><span>格式版本</span><span>v' + preview.version + '</span></div>';
    html += '<div class="lp-pack-meta-row"><span>生成程序版本</span><span>' + escapeHtml(preview.appVersion || "未知") + '</span></div>';
    html += '<div class="lp-pack-meta-row"><span>导出时间</span><span>' + formatDate(preview.exportedAt) + '</span></div>';
    html += '<div class="lp-pack-meta-row"><span>关卡数量</span><b>' + preview.levelCount + ' 个</b></div>';
    html += '</div>';

    const conflictCount = preview.levels.filter(l => l.hasConflict).length;
    if (conflictCount > 0) {
      html += '<div class="lp-conflict-notice">';
      html += '⚠ 发现 <b>' + conflictCount + '</b> 个关卡与现有同名，请在下方逐个选择处理方式。';
      html += '<div class="lp-conflict-bulk">';
      html += '<span>批量设置冲突处理：</span>';
      html += '<button class="lp-btn-small secondary" data-bulk-conflict="copy">全部另存副本</button>';
      html += '<button class="lp-btn-small secondary" data-bulk-conflict="overwrite">覆盖（仅自定义）</button>';
      html += '<button class="lp-btn-small secondary" data-bulk-conflict="skip">全部跳过</button>';
      html += '</div></div>';
    }

    html += '<div class="lp-preview-levels">';
    preview.levels.forEach((level, idx) => {
      html += renderPreviewLevelCard(level, idx);
    });
    html += '</div>';

    html += '</div><div class="lp-modal-actions">';
    html += '<button class="secondary" data-action="cancel">取消</button>';
    html += '<button data-action="do-import" id="lpDoImportBtn">✓ 确认导入</button>';
    html += '</div></div>';

    const overlay = createOverlay(html);

    overlay.querySelectorAll('[data-bulk-conflict]').forEach(btn => {
      btn.onclick = () => {
        const action = btn.dataset.bulkConflict;
        preview.levels.forEach((level, idx) => {
          if (level.hasConflict) {
            const isBuiltin = level.conflicts.some(c => c.isBuiltin);
            if (action === "overwrite" && isBuiltin) {
              return;
            }
            const existingPuzzle = level.conflicts[0];
            const newPuzzle = { name: level.puzzleName };
            const allNames = new Set(AppData.getAllPuzzles().map(p => p.name));
            conflictResolutions[idx] = LevelPack.resolveConflictAction(
              existingPuzzle, newPuzzle, action, allNames
            );
          }
        });
        showImportPreview();
      };
    });

    overlay.querySelectorAll(".lp-conflict-select").forEach(sel => {
      sel.onchange = () => {
        const idx = Number(sel.dataset.index);
        const level = preview.levels[idx];
        const isBuiltin = level.conflicts.some(c => c.isBuiltin);
        const existingPuzzle = level.conflicts[0];
        const newPuzzle = { name: level.puzzleName };
        const allNames = new Set(AppData.getAllPuzzles().map(p => p.name));
        let action = sel.value;
        if (action === "overwrite" && isBuiltin) {
          showToast("内置关卡不能覆盖，已自动改为「另存副本」", "warn");
          action = "copy";
          sel.value = "copy";
        }
        conflictResolutions[idx] = LevelPack.resolveConflictAction(
          existingPuzzle, newPuzzle, action, allNames
        );
        if (action === "copy" && conflictResolutions[idx].newName) {
          const nameLabel = overlay.querySelector('.lp-new-name[data-index="' + idx + '"]');
          if (nameLabel) nameLabel.textContent = "→ " + conflictResolutions[idx].newName;
        }
      };
    });

    overlay.querySelector('[data-action="close"]').onclick = () => {
      currentPackData = null;
      currentPreview = null;
      closeOverlay(overlay);
    };
    overlay.querySelector('[data-action="cancel"]').onclick = () => {
      currentPackData = null;
      currentPreview = null;
      closeOverlay(overlay);
    };

    overlay.querySelector('[data-action="do-import"]').onclick = async () => {
      const hasUnresolved = preview.levels.some((l, i) =>
        l.hasConflict && !conflictResolutions[i]
      );
      if (hasUnresolved) {
        showToast("请为所有冲突关卡选择处理方式", "warn");
        return;
      }
      await executeImportFlow(overlay);
    };
  }

  function renderFieldDiffTable(conflict) {
    if (!conflict.fieldDifferences || conflict.fieldDifferences.length === 0) {
      return '<div class="lp-no-diff">所有字段均相同</div>';
    }

    let html = '<div class="lp-diff-table">';
    html += '<div class="lp-diff-header">' +
            '<div class="lp-diff-col">字段</div>' +
            '<div class="lp-diff-col">现有</div>' +
            '<div class="lp-diff-col">导入</div>' +
            '</div>';

    conflict.fieldDifferences.forEach(diff => {
      html += '<div class="lp-diff-row">' +
              '<div class="lp-diff-field">' + escapeHtml(diff.label) + '</div>' +
              '<div class="lp-diff-old">' + escapeHtml(diff.oldDisplay) + '</div>' +
              '<div class="lp-diff-new">' + escapeHtml(diff.newDisplay) + '</div>' +
              '</div>';
    });

    html += '</div>';
    return html;
  }

  function renderPreviewLevelCard(level, idx) {
    const resolution = conflictResolutions[idx];
    let conflictHtml = "";

    if (level.hasConflict) {
      const isBuiltin = level.conflicts.some(c => c.isBuiltin);
      const conflictNames = level.conflicts.map(c =>
        (c.isBuiltin ? "[内置] " : "[自定义] ") + c.name
      ).join("、");

      let selectedAction = resolution ? resolution.action : "";
      let newNameHint = "";
      if (resolution && resolution.action === "copy" && resolution.newName) {
        newNameHint = '<span class="lp-new-name" data-index="' + idx + '">→ ' + escapeHtml(resolution.newName) + '</span>';
      }

      const overwriteDisabled = isBuiltin ? ' disabled title="内置关卡不能覆盖，只能另存或跳过"' : '';
      const overwriteSelected = selectedAction === "overwrite" && !isBuiltin ? " selected" : "";

      let diffsHtml = "";
      level.conflicts.forEach((conflict, cIdx) => {
        const diffCount = conflict.fieldDifferences ? conflict.fieldDifferences.length : 0;
        diffsHtml += '<div class="lp-conflict-detail" data-conflict-idx="' + cIdx + '">' +
          '<div class="lp-conflict-detail-header">' +
          '<span class="lp-conflict-type">' + (conflict.isBuiltin ? "🔒 内置关卡" : "✏️ 自定义关卡") + '</span>' +
          '<span class="lp-conflict-diff-count">' + (diffCount > 0 ? diffCount + ' 处差异' : '无差异') + '</span>' +
          '</div>' +
          '<div class="lp-conflict-compare">' +
          '<div class="lp-conflict-side">' +
          '<div class="lp-side-label">现有</div>' +
          '<div class="lp-theme-preview">' +
          '<div class="theme-dot" style="background:' + conflict.previewColors.paper + ';border-color:' + conflict.previewColors.ink + '"></div>' +
          '<div class="theme-dot" style="background:' + conflict.previewColors.ink + '"></div>' +
          '<span class="lp-theme-preview-text">' +
          escapeHtml((AppData.themes.paper[conflict.theme.paper] || {}).name || conflict.theme.paper) + ' + ' +
          escapeHtml((AppData.themes.ink[conflict.theme.ink] || {}).name || conflict.theme.ink) +
          '</span></div>' +
          '<div class="lp-text-sample">' +
          conflict.textSample.map(t => '<span class="lp-text-chip">' + escapeHtml(t) + '</span>').join("") +
          '</div>' +
          '<div class="lp-side-meta">' + conflict.cols + '×' + conflict.rows + ' · 限时' + conflict.timeLimit + '秒</div>' +
          '</div>' +
          '<div class="lp-conflict-arrow">→</div>' +
          '<div class="lp-conflict-side">' +
          '<div class="lp-side-label">导入</div>' +
          '<div class="lp-theme-preview">' +
          '<div class="theme-dot" style="background:' + level.previewColors.paper + ';border-color:' + level.previewColors.ink + '"></div>' +
          '<div class="theme-dot" style="background:' + level.previewColors.ink + '"></div>' +
          '<span class="lp-theme-preview-text">' +
          escapeHtml((AppData.themes.paper[level.theme.paper] || {}).name || level.theme.paper) + ' + ' +
          escapeHtml((AppData.themes.ink[level.theme.ink] || {}).name || level.theme.ink) +
          '</span></div>' +
          '<div class="lp-text-sample">' +
          level.textSample.map(t => '<span class="lp-text-chip">' + escapeHtml(t) + '</span>').join("") +
          '</div>' +
          '<div class="lp-side-meta">' + level.cols + '×' + level.rows + ' · 限时' + level.timeLimit + '秒</div>' +
          '</div>' +
          '</div>' +
          renderFieldDiffTable(conflict) +
          '</div>';
      });

      conflictHtml = '<div class="lp-conflict-row">' +
        '<div class="lp-conflict-label">⚠ 同名冲突：' + escapeHtml(conflictNames) + '</div>' +
        diffsHtml +
        '<div class="lp-conflict-action-row">' +
        '<select class="lp-conflict-select" data-index="' + idx + '">' +
        '<option value="">请选择处理方式…</option>' +
        '<option value="copy"' + (selectedAction === "copy" ? " selected" : "") + '>另存副本</option>' +
        '<option value="overwrite"' + overwriteSelected + overwriteDisabled + '>覆盖（仅自定义）</option>' +
        '<option value="skip"' + (selectedAction === "skip" ? " selected" : "") + '>跳过此关</option>' +
        '</select>' + newNameHint +
        (isBuiltin ? '<div class="lp-builtin-hint">🔒 内置关卡只能「另存副本」或「跳过」</div>' : '') +
        '</div></div>';
    }

    const badges = [];
    if (level.hasProgress) badges.push('<span class="lp-badge lp-badge-progress">含进度</span>');
    if (level.hasColophon) badges.push('<span class="lp-badge lp-badge-colophon">含题跋</span>');
    if (level.hasLibraryEntry) badges.push('<span class="lp-badge lp-badge-library">含藏书阁记录</span>');
    if (level.hasNote) badges.push('<span class="lp-badge lp-badge-note">含备注</span>');
    if (level.hasConflict) badges.push('<span class="lp-badge lp-badge-conflict">同名冲突</span>');
    if (level.progressCompleted) badges.push('<span class="lp-badge lp-badge-done">已完成</span>');

    return '<div class="lp-preview-card' + (level.hasConflict ? " has-conflict" : "") + '">' +
      '<div class="lp-preview-card-header">' +
      '<div class="lp-preview-title-row">' +
      '<span class="lp-preview-level-num">#' + (idx + 1) + '</span>' +
      '<h3 class="lp-preview-level-name">' + escapeHtml(level.puzzleName) + '</h3>' +
      '<div class="lp-preview-badges">' + badges.join("") + '</div>' +
      '</div>' +
      '<div class="lp-preview-meta">' +
      level.cols + '×' + level.rows + ' · ' + level.pieceCount + '片' +
      ' · 限时' + level.timeLimit + '秒' +
      (level.progressCompleted ? ' · 最佳得分 ' + level.progressBestScore : '') +
      '</div></div>' +
      '<div class="lp-preview-card-body">' +
      '<div class="lp-theme-preview">' +
      '<div class="theme-dot" style="background:' + level.previewColors.paper + ';border-color:' + level.previewColors.ink + '"></div>' +
      '<div class="theme-dot" style="background:' + level.previewColors.ink + '"></div>' +
      '<span class="lp-theme-preview-text">' +
      escapeHtml((AppData.themes.paper[level.theme.paper] || {}).name || level.theme.paper) + ' + ' +
      escapeHtml((AppData.themes.ink[level.theme.ink] || {}).name || level.theme.ink) +
      '</span></div>' +
      '<div class="lp-text-sample">' +
      level.textSample.map(t => '<span class="lp-text-chip">' + escapeHtml(t) + '</span>').join("") +
      (level.pieceCount > 4 ? '<span class="lp-text-more">…+' + (level.pieceCount - 4) + '</span>' : '') +
      '</div></div>' +
      conflictHtml +
      '</div>';
  }

  async function executeImportFlow(prevOverlay) {
    closeOverlay(prevOverlay);
    showLoadingOverlay("正在备份当前存档……");

    const resolutions = {};
    for (let i = 0; i < currentPreview.levels.length; i++) {
      resolutions[i] = conflictResolutions[i] || { action: "copy" };
    }

    try {
      const report = await LevelPack.executeImport(
        currentPackData,
        resolutions,
        (cur, total) => {
          const loadingText = document.querySelector(".lp-loading-text");
          if (loadingText) {
            loadingText.textContent = "正在导入（" + (cur + 1) + "/" + total + "）……";
          }
        }
      );

      closeAllOverlays();
      showImportReport(report);

    } catch (e) {
      closeAllOverlays();
      showToast("导入发生错误：" + e.message, "error");
    }
  }

  function showImportReport(report) {
    let html = '<div class="lp-modal lp-report-modal" data-no-dismiss><div class="lp-modal-header">';

    if (report.ok) {
      html += '<h2>✅ 导入完成</h2>';
    } else {
      html += '<h2>❌ 导入失败</h2>';
    }
    html += '<span class="lp-close-btn" data-action="close">×</span></div>';
    html += '<div class="lp-modal-body">';

    if (!report.ok) {
      html += '<div class="lp-error-banner lp-error-fatal">';
      html += '<div class="lp-error-title">导入未成功</div>';
      html += '<div class="lp-error-msg">' + escapeHtml(report.error || "未知错误") + '</div>';
      if (report.stage === "preflight") {
        html += '<div class="lp-restored-msg" style="background:#e3f2fd;color:#1565c0">ℹ 预检阶段即发现问题，未执行任何写入操作，存档安全</div>';
        if (report.preflightIssues && report.preflightIssues.length > 0) {
          html += '<div style="margin-top:8px">';
          report.preflightIssues.forEach(msg => {
            html += '<div class="lp-error-item">✗ ' + escapeHtml(msg) + '</div>';
          });
          html += '</div>';
        }
      }
      if (report.restored) {
        html += '<div class="lp-restored-msg">✓ 已自动从备份恢复，您的存档未被修改</div>';
      }
      html += '</div>';
    }

    if (report.warnings && report.warnings.length > 0) {
      html += '<div class="lp-error-banner lp-error-warnings" style="margin-bottom:12px">';
      html += '<div class="lp-error-title">⚠ 警告</div>';
      report.warnings.forEach(w => {
        html += '<div class="lp-warning-item">' + escapeHtml(w) + '</div>';
      });
      html += '</div>';
    }

    html += '<div class="lp-report-stats">';
    html += '<div class="lp-stat-card lp-stat-ok"><span class="lp-stat-num">' + report.imported.length + '</span><span class="lp-stat-label">成功导入</span></div>';
    html += '<div class="lp-stat-card lp-stat-skip"><span class="lp-stat-num">' + report.skipped.length + '</span><span class="lp-stat-label">跳过</span></div>';
    html += '<div class="lp-stat-card lp-stat-err"><span class="lp-stat-num">' + report.errors.length + '</span><span class="lp-stat-label">出错</span></div>';
    html += '</div>';

    if (report.restored && report.imported.length > 0) {
      html += '<div class="lp-error-banner lp-error-warnings">';
      html += '<div class="lp-error-title">已回滚的写入操作</div>';
      html += '<div class="lp-warning-item">以下关卡曾写入但已回滚，不影响存档：</div>';
      report.imported.forEach(item => {
        html += '<div class="lp-warning-item">↩ ' + escapeHtml(item.name) + ' [' + escapeHtml(item.action) + ']</div>';
      });
      html += '</div>';
    }

    if (report.imported.length > 0 && !report.restored) {
      html += '<div class="lp-report-section"><h4>成功导入的关卡</h4><div class="lp-report-list">';
      report.imported.forEach(item => {
        const actionLabel = item.action === "overwrite" ? "覆盖" : (item.action === "copy" ? "另存为" : "新增");
        html += '<div class="lp-report-item lp-report-ok">✓ <b>' + escapeHtml(item.name) + '</b> <span class="lp-report-action">[' + actionLabel + ']</span></div>';
      });
      html += '</div></div>';
    }

    if (report.skipped.length > 0) {
      html += '<div class="lp-report-section"><h4>跳过的关卡</h4><div class="lp-report-list">';
      report.skipped.forEach(item => {
        html += '<div class="lp-report-item lp-report-skip">○ <b>' + escapeHtml(item.name) + '</b> <span class="lp-report-hint">（' + escapeHtml(item.reason || "跳过") + '）</span></div>';
      });
      html += '</div></div>';
    }

    if (report.errors.length > 0) {
      html += '<div class="lp-report-section"><h4>出错的关卡</h4><div class="lp-report-list">';
      report.errors.forEach(item => {
        html += '<div class="lp-report-item lp-report-err">✗ <b>' + escapeHtml(item.name) + '</b> <span class="lp-report-err-msg">：' + escapeHtml(item.error) + '</span></div>';
      });
      html += '</div></div>';
    }

    html += '</div><div class="lp-modal-actions">';
    html += '<button data-action="finish">完成</button>';
    html += '</div></div>';

    const overlay = createOverlay(html);

    overlay.querySelectorAll('[data-action="close"], [data-action="finish"]').forEach(btn => {
      btn.onclick = () => {
        closeOverlay(overlay);
        currentPackData = null;
        currentPreview = null;
        conflictResolutions = {};
        if (onImportComplete) onImportComplete(report);
      };
    });
  }

  return {
    setCallbacks,
    openExportPicker,
    openImportFilePicker,
    showToast
  };
})();

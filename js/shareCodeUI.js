const ShareCodeUI = (() => {
  let onStartTemp = null;
  let onSaveCustom = null;
  let onRefreshLevels = null;

  function setCallbacks(callbacks) {
    if (callbacks.onStartTemp) onStartTemp = callbacks.onStartTemp;
    if (callbacks.onSaveCustom) onSaveCustom = callbacks.onSaveCustom;
    if (callbacks.onRefreshLevels) onRefreshLevels = callbacks.onRefreshLevels;
  }

  function escapeHtml(str) {
    if (str == null) return "";
    const s = String(str);
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")
      .replace(/\//g, "&#x2F;")
      .replace(/`/g, "&#x60;")
      .replace(/=/g, "&#x3D;");
  }

  function safeText(val, fallback) {
    if (val == null || val === "") return fallback != null ? String(fallback) : "";
    return escapeHtml(val);
  }

  const TOOL_NAMES = {
    zoom: "缩放",
    edgeAlign: "边缘对齐",
    rotateCw: "顺时针旋转",
    rotateCcw: "逆时针旋转",
    flip: "翻转"
  };

  function formatThemeDisplay(theme, customColors) {
    const parts = [];
    const paperName = (AppData.themes.paper[theme.paper] || {}).name || theme.paper;
    const inkName = (AppData.themes.ink[theme.ink] || {}).name || theme.ink;
    const borderName = (AppData.themes.border[theme.border] || {}).name || theme.border;
    const tableName = (AppData.themes.table[theme.table] || {}).name || theme.table;
    parts.push(`${escapeHtml(paperName)} + ${escapeHtml(inkName)}`);
    parts.push(`边框：${escapeHtml(borderName)}`);
    parts.push(`台面：${escapeHtml(tableName)}`);
    let result = parts.join("，");
    if (customColors && Object.keys(customColors).length > 0) {
      const cc = [];
      const HEX_RE = /^#[0-9a-fA-F]{6}$/;
      if (customColors.paperColor && HEX_RE.test(customColors.paperColor)) cc.push("纸色" + customColors.paperColor);
      if (customColors.inkColor && HEX_RE.test(customColors.inkColor)) cc.push("墨色" + customColors.inkColor);
      if (customColors.tableColor && HEX_RE.test(customColors.tableColor)) cc.push("台色" + customColors.tableColor);
      if (cc.length > 0) result += " [自定义：" + cc.join("、") + "]";
    }
    return result;
  }

  function buildThemePreview(theme, customColors) {
    const colors = AppData.getThemePreviewColor({ ...theme, customColors });
    const HEX_RE = /^#[0-9a-fA-F]{6}$/;
    const pColor = HEX_RE.test(colors.paper) ? colors.paper : "#f5f5f0";
    const iColor = HEX_RE.test(colors.ink) ? colors.ink : "#2b2b2b";
    const tColor = HEX_RE.test(colors.table) ? colors.table : "#8B4513";
    return `
      <div class="share-theme-preview">
        <div class="theme-dot" style="background:${pColor}" title="纸张"></div>
        <div class="theme-dot" style="background:${iColor}" title="墨色"></div>
        <div class="theme-dot" style="background:${tColor}" title="台面"></div>
      </div>
    `;
  }

  function findConflicts(puzzle) {
    const allPuzzles = AppData.getAllPuzzles();
    const conflicts = [];
    allPuzzles.forEach((ep, idx) => {
      if (ep.name === puzzle.name) {
        const diff = LevelPack.calculateFieldDifferences(
          ep, AppProgress.getProgress()[idx] || null,
          (AppProgress.getProgress()[idx] || {}).colophon || "",
          { puzzle }
        );
        const safeDiff = diff.map(d => ({
          ...d,
          label: String(d.label || ""),
          oldDisplay: String(d.oldDisplay != null ? d.oldDisplay : ""),
          newDisplay: String(d.newDisplay != null ? d.newDisplay : "")
        }));
        conflicts.push({
          id: ep.id,
          name: ep.name,
          custom: ep.custom,
          isBuiltin: !ep.custom,
          cols: ep.cols,
          rows: ep.rows,
          theme: ep.theme,
          textSample: (ep.text || []).slice(0, 4).map(s => String(s || "")),
          fieldDifferences: safeDiff,
          hasFieldDifferences: safeDiff.length > 0
        });
      }
    });
    return conflicts;
  }

  function openExportModal(puzzle, opts) {
    const options = opts || {};
    let typeLabel = "自定义残页";
    let extraInfo = null;
    let encodeResult;

    if (options.isDaily && options.dailyResult) {
      typeLabel = "每日挑战结果";
      encodeResult = ShareCode.encodeDailyResult(options.dailyResult);
      extraInfo = {
        score: options.dailyResult.score,
        usedTime: options.dailyResult.usedTime,
        hintUsed: options.dailyResult.hintUsed,
        completed: options.dailyResult.completed,
        rating: options.dailyResult.rating
      };
    } else {
      encodeResult = ShareCode.encodePuzzle(puzzle, {
        author: options.author,
        source: options.source || "自定义残页",
        note: options.note
      });
    }

    if (!encodeResult.ok) {
      showSimpleModal("生成失败", encodeResult.error || "无法生成分享码");
      return;
    }

    const overlay = document.getElementById("shareOverlay");
    const modal = document.getElementById("shareExportModal");
    if (!overlay || !modal) {
      console.error("[ShareCodeUI] share export modal not found");
      return;
    }

    const codeDisplay = modal.querySelector("#shareExportCode");
    const copyBtn = modal.querySelector("#shareCopyBtn");
    const lengthInfo = modal.querySelector("#shareCodeLength");
    const typeDisplay = modal.querySelector("#shareExportType");
    const extraDisplay = modal.querySelector("#shareExportExtra");
    const closeBtn = modal.querySelector("#shareExportClose");

    if (typeDisplay) typeDisplay.textContent = typeLabel;
    if (codeDisplay) codeDisplay.value = encodeResult.code;
    if (lengthInfo) lengthInfo.textContent = `分享码长度：${encodeResult.length} 字符`;

    if (extraDisplay) {
      if (extraInfo) {
        extraDisplay.innerHTML = `
          <div class="share-extra-grid">
            <div class="share-extra-row"><span>挑战得分</span><b>${extraInfo.score}</b></div>
            <div class="share-extra-row"><span>使用时间</span><b>${extraInfo.usedTime} 秒</b></div>
            <div class="share-extra-row"><span>使用提示</span><b>${extraInfo.hintUsed ? "是" : "否"}</b></div>
            <div class="share-extra-row"><span>结果</span><b class="${extraInfo.completed ? 'share-ok' : 'share-fail'}">${extraInfo.completed ? (extraInfo.rating || "已完成") : "未通过"}</b></div>
          </div>
        `;
      } else {
        extraDisplay.innerHTML = "";
      }
    }

    if (copyBtn) {
      copyBtn.onclick = () => {
        if (codeDisplay) {
          codeDisplay.select();
          try {
            const ok = document.execCommand("copy");
            if (ok) {
              copyBtn.textContent = "✓ 已复制";
              copyBtn.classList.add("btn-success");
              setTimeout(() => {
                copyBtn.textContent = "📋 复制分享码";
                copyBtn.classList.remove("btn-success");
              }, 2000);
            } else {
              alert("复制失败，请手动选择文本复制");
            }
          } catch (e) {
            alert("复制失败，请手动选择文本复制");
          }
        }
      };
    }

    if (closeBtn) {
      closeBtn.onclick = closeExportModal;
    }

    overlay.classList.remove("hidden");
    modal.classList.remove("hidden");
  }

  function closeExportModal() {
    const overlay = document.getElementById("shareOverlay");
    const modal = document.getElementById("shareExportModal");
    if (overlay) overlay.classList.add("hidden");
    if (modal) modal.classList.add("hidden");
  }

  function openImportModal() {
    const overlay = document.getElementById("shareOverlay");
    const modal = document.getElementById("shareImportModal");
    if (!overlay || !modal) return;

    const input = modal.querySelector("#shareImportInput");
    const parseBtn = modal.querySelector("#shareParseBtn");
    const closeBtn = modal.querySelector("#shareImportClose");
    const errorBox = modal.querySelector("#shareImportError");
    const hintBox = modal.querySelector("#shareImportHint");

    if (input) {
      input.value = "";
      input.oninput = () => {
        if (errorBox) errorBox.classList.add("hidden");
        if (hintBox) {
          if (ShareCode.quickValidate(input.value)) {
            hintBox.classList.remove("hidden");
            hintBox.innerHTML = `<span class="share-hint-ok">✓ 检测到有效分享码格式</span>`;
          } else {
            hintBox.classList.add("hidden");
          }
        }
      };
      input.onpaste = () => {
        setTimeout(() => {
          if (input && ShareCode.quickValidate(input.value) && parseBtn) {
            parseBtn.click();
          }
        }, 50);
      };
    }

    if (parseBtn) {
      parseBtn.onclick = () => {
        if (!input) return;
        const code = input.value;
        if (!code || !code.trim()) {
          if (errorBox) {
            errorBox.classList.remove("hidden");
            errorBox.textContent = "请先粘贴分享码";
          }
          return;
        }
        const result = ShareCode.decode(code);
        if (!result.ok) {
          if (errorBox) {
            errorBox.classList.remove("hidden");
            let msg = result.error || "解析失败";
            if (result.hint) msg += "\n" + result.hint;
            if (result.stage === "checksum") {
              msg += "\n提示：校验失败可能是复制时遗漏了字符，分享码以冒号分隔为5段。";
            }
            errorBox.textContent = msg;
          }
          return;
        }
        closeImportModal();
        openPreviewModal(result);
      };
    }

    if (closeBtn) {
      closeBtn.onclick = closeImportModal;
    }

    if (errorBox) errorBox.classList.add("hidden");
    if (hintBox) hintBox.classList.add("hidden");

    overlay.classList.remove("hidden");
    modal.classList.remove("hidden");
    if (input) setTimeout(() => input.focus(), 100);
  }

  function closeImportModal() {
    const overlay = document.getElementById("shareOverlay");
    const modal = document.getElementById("shareImportModal");
    if (overlay) overlay.classList.add("hidden");
    if (modal) modal.classList.add("hidden");
  }

  function openPreviewModal(parseResult) {
    const overlay = document.getElementById("shareOverlay");
    const modal = document.getElementById("sharePreviewModal");
    if (!overlay || !modal) return;

    const isDaily = parseResult.type === "daily";
    const puzzle = isDaily ? parseResult.data.puzzle : parseResult.data;
    const warnings = parseResult.warnings || [];
    const wasTruncated = parseResult.wasTruncated;
    const version = parseResult.version;

    const typeLabel = isDaily ? "每日挑战结果" : "自定义残页";
    const conflicts = findConflicts(puzzle);

    const titleEl = modal.querySelector("#sharePreviewTitle");
    const typeEl = modal.querySelector("#sharePreviewType");
    const warningBox = modal.querySelector("#sharePreviewWarnings");
    const versionEl = modal.querySelector("#sharePreviewVersion");
    const contentEl = modal.querySelector("#sharePreviewContent");
    const actionsEl = modal.querySelector("#sharePreviewActions");
    const closeBtn = modal.querySelector("#sharePreviewClose");

    if (titleEl) titleEl.textContent = puzzle.name || "未命名残页";
    if (typeEl) typeEl.textContent = typeLabel;
    if (versionEl) versionEl.textContent = `分享码版本 v${version}`;

    if (warningBox) {
      if (warnings.length > 0 || wasTruncated) {
        warningBox.classList.remove("hidden");
        let html = '<div class="share-warning-title">⚠️ 导入说明（已自动处理）</div>';
        html += '<ul class="share-warning-list">';
        warnings.forEach(w => {
          html += `<li>${safeText(w)}</li>`;
        });
        if (wasTruncated) {
          html += `<li>部分内容过长，已自动截断</li>`;
        }
        html += '</ul>';
        warningBox.innerHTML = html;
      } else {
        warningBox.classList.add("hidden");
      }
    }

    const safeCols = Math.min(Math.max(parseInt(puzzle.cols, 10) || 2, 2), 6);
    const safeRows = Math.min(Math.max(parseInt(puzzle.rows, 10) || 2, 2), 5);
    const safeTimeLimit = parseInt(puzzle.timeLimit, 10) || 120;
    const safeHintPenalty = parseInt(puzzle.hintPenalty, 10) || 80;
    const safeTotal = safeCols * safeRows;
    const safeScatterName = safeText((AppData.scatterRules[puzzle.scatterRule] || {}).name || puzzle.scatterRule);

    const orientParts = [];
    if (puzzle.enableRotation) orientParts.push("支持旋转");
    if (puzzle.enableFlip) orientParts.push("支持翻转");
    if (puzzle.initialRotationScrambled) orientParts.push("初始旋转打乱");
    if (puzzle.initialFlipScrambled) orientParts.push("初始翻面打乱");

    const safeOrient = orientParts.length > 0 ? orientParts.map(p => safeText(p)).join("、") : "基础模式";
    const safeTools = puzzle.availableTools.map(t => safeText(TOOL_NAMES[t] || t)).join("、");
    const safeCreatedAt = (puzzle.createdAt && Number.isFinite(puzzle.createdAt) && puzzle.createdAt > 0)
      ? safeText(new Date(puzzle.createdAt).toLocaleString("zh-CN"))
      : "";

    let previewHtml = "";

    previewHtml += `
      <div class="share-section">
        <div class="share-section-title">残页预览</div>
        <div class="pz-preview-box share-pz-preview" style="grid-template-columns: repeat(${safeCols}, 1fr)">
          ${puzzle.text.slice(0, safeTotal).map(t => `<div class="pz-preview-item">${safeText(t, "残")}</div>`).join("")}
        </div>
      </div>
    `;

    previewHtml += `
      <div class="share-section">
        <div class="share-section-title">基本信息</div>
        <div class="share-info-grid">
          <div class="share-info-row">
            <span>残页名称</span>
            <b>${safeText(puzzle.name, "未命名残页")}</b>
          </div>
          <div class="share-info-row">
            <span>尺寸规格</span>
            <b>${safeCols} × ${safeRows}（${safeTotal} 片）</b>
          </div>
          <div class="share-info-row">
            <span>时间限制</span>
            <b>${safeTimeLimit} 秒</b>
          </div>
          <div class="share-info-row">
            <span>提示扣分</span>
            <b>${safeHintPenalty} 分</b>
          </div>
          <div class="share-info-row">
            <span>散落方式</span>
            <b>${safeScatterName}</b>
          </div>
        </div>
      </div>
    `;

    previewHtml += `
      <div class="share-section">
        <div class="share-section-title">主题风格</div>
        <div class="share-info-row">
          ${buildThemePreview(puzzle.theme, puzzle.customColors)}
          <span style="margin-left:8px">${formatThemeDisplay(puzzle.theme, puzzle.customColors)}</span>
        </div>
      </div>
    `;

    previewHtml += `
      <div class="share-section">
        <div class="share-section-title">功能配置</div>
        <div class="share-info-grid">
          <div class="share-info-row">
            <span>方向设置</span>
            <b>${safeOrient}</b>
          </div>
          <div class="share-info-row">
            <span>可用工具</span>
            <b>${safeTools}</b>
          </div>
        </div>
      </div>
    `;

    if (isDaily && parseResult.data) {
      const safeDailyDate = safeText(parseResult.data.dailyDate || "未知");
      const safeScore = parseInt(parseResult.data.score, 10) || 0;
      const safeUsed = parseInt(parseResult.data.usedTime, 10) || 0;
      const safeHint = parseResult.data.hintUsed ? "是" : "否";
      const safeCompleted = !!parseResult.data.completed;
      const safeRating = safeText(parseResult.data.rating || "已完成");
      const resultClass = safeCompleted ? 'share-ok' : 'share-fail';
      const resultText = safeCompleted ? safeRating : "未通过";
      previewHtml += `
        <div class="share-section">
          <div class="share-section-title">挑战结果</div>
          <div class="share-info-grid">
            <div class="share-info-row">
              <span>挑战日期</span>
              <b>${safeDailyDate}</b>
            </div>
            <div class="share-info-row">
              <span>最终得分</span>
              <b>${safeScore}</b>
            </div>
            <div class="share-info-row">
              <span>使用时间</span>
              <b>${safeUsed} 秒</b>
            </div>
            <div class="share-info-row">
              <span>使用提示</span>
              <b>${safeHint}</b>
            </div>
            <div class="share-info-row">
              <span>评级</span>
              <b class="${resultClass}">${resultText}</b>
            </div>
          </div>
        </div>
      `;
    }

    const hasSourceInfo = puzzle.source || puzzle.author || puzzle.note || safeCreatedAt;
    if (hasSourceInfo) {
      previewHtml += `
        <div class="share-section">
          <div class="share-section-title">来源信息</div>
          <div class="share-info-grid">
            ${puzzle.source ? `<div class="share-info-row"><span>来源</span><b>${safeText(puzzle.source)}</b></div>` : ""}
            ${puzzle.author ? `<div class="share-info-row"><span>作者</span><b>${safeText(puzzle.author)}</b></div>` : ""}
            ${safeCreatedAt ? `<div class="share-info-row"><span>生成时间</span><b>${safeCreatedAt}</b></div>` : ""}
            ${puzzle.note ? `<div class="share-info-row share-note-row"><span>备注</span><b>${safeText(puzzle.note)}</b></div>` : ""}
          </div>
        </div>
      `;
    }

    if (conflicts.length > 0) {
      previewHtml += `
        <div class="share-section share-conflict-section">
          <div class="share-section-title">⚠️ 检测到同名残页</div>
          <div class="share-conflict-list">
      `;
      conflicts.forEach(cf => {
        const safeCfName = safeText(cf.name);
        const cfTag = cf.isBuiltin ? "内置关卡" : "自定义残页";
        const cfTagClass = cf.isBuiltin ? 'builtin' : 'custom';
        const safeCfCols = parseInt(cf.cols, 10) || 0;
        const safeCfRows = parseInt(cf.rows, 10) || 0;
        const safeCfSample = cf.textSample.map(t => safeText(t)).join("、");
        let diffHtml = "";
        if (cf.hasFieldDifferences) {
          const diffItems = cf.fieldDifferences.slice(0, 5).map(d => `
            <li>
              <b>${safeText(d.label)}</b>：
              原「${safeText(d.oldDisplay)}」→
              新「${safeText(d.newDisplay)}」
            </li>
          `).join("");
          const moreHtml = cf.fieldDifferences.length > 5
            ? `<li>...还有 ${escapeHtml(String(cf.fieldDifferences.length - 5))} 项差异</li>`
            : "";
          diffHtml = `
            <div class="share-conflict-diff">
              <div class="share-conflict-diff-title">与导入残页的差异：</div>
              <ul>${diffItems}${moreHtml}</ul>
            </div>
          `;
        } else {
          diffHtml = '<div class="share-conflict-same">内容完全相同</div>';
        }
        previewHtml += `
          <div class="share-conflict-card">
            <div class="share-conflict-header">
              <span class="share-conflict-name">${safeCfName}</span>
              <span class="share-conflict-tag ${cfTagClass}">${cfTag}</span>
            </div>
            <div class="share-conflict-meta">
              尺寸 ${safeCfCols}×${safeCfRows}，文字示例：${safeCfSample}
            </div>
            ${diffHtml}
          </div>
        `;
      });
      previewHtml += `</div></div>`;
    }

    if (contentEl) contentEl.innerHTML = previewHtml;

    if (actionsEl) {
      let actionsHtml = "";

      if (conflicts.length > 0) {
        const hasBuiltinConflict = conflicts.some(c => c.isBuiltin);
        actionsHtml += `
          <div class="share-conflict-resolve">
            <label class="share-radio-label">
              <input type="radio" name="shareConflict" value="copy" checked>
              <span><strong>另存为副本</strong>（推荐，不会影响现有进度）</span>
            </label>
        `;
        if (!hasBuiltinConflict) {
          actionsHtml += `
            <label class="share-radio-label">
              <input type="radio" name="shareConflict" value="overwrite">
              <span><strong>覆盖现有</strong>（将替换同名自定义残页，其进度会被清除）</span>
            </label>
          `;
        }
        actionsHtml += `
            <label class="share-radio-label">
              <input type="radio" name="shareConflict" value="skip">
              <span><strong>仅试玩不保存</strong></span>
            </label>
          </div>
        `;
      }

      actionsHtml += `
        <div class="share-action-buttons">
          <button class="secondary" id="sharePreviewCancel">取消</button>
          <button class="secondary" id="sharePreviewPlay">🎮 先试玩</button>
          <button id="sharePreviewSave">💾 保存到我的残页</button>
        </div>
      `;
      actionsEl.innerHTML = actionsHtml;

      const cancelBtn = document.getElementById("sharePreviewCancel");
      const playBtn = document.getElementById("sharePreviewPlay");
      const saveBtn = document.getElementById("sharePreviewSave");

      if (cancelBtn) cancelBtn.onclick = closePreviewModal;

      if (playBtn) {
        playBtn.onclick = () => {
          closePreviewModal();
          const tempPuzzle = { ...puzzle };
          tempPuzzle.id = "share-temp-" + Date.now();
          tempPuzzle._shareSource = true;
          if (onStartTemp) onStartTemp(tempPuzzle);
        };
      }

      if (saveBtn) {
        saveBtn.onclick = () => {
          let conflictAction = "copy";
          const conflictRadios = document.querySelectorAll('input[name="shareConflict"]:checked');
          if (conflictRadios.length > 0) {
            conflictAction = conflictRadios[0].value;
          }

          if (conflictAction === "skip") {
            closePreviewModal();
            return;
          }

          const saveData = { ...puzzle };
          delete saveData.source;
          delete saveData.author;
          delete saveData.note;
          delete saveData.createdAt;

          if (conflictAction === "overwrite" && conflicts.length > 0) {
            const target = conflicts.find(c => c.custom);
            if (target) {
              if (!confirm(`确定要覆盖现有的「${target.name}」吗？\n覆盖后该残页的进度记录将被清除。`)) {
                return;
              }
              AppData.updateCustomPuzzle(target.id, saveData);
              AppStorage.deleteLevelSave(target.id);
              closePreviewModal();
              showSimpleModal("保存成功", `已更新残页「${puzzle.name}」`);
              if (onRefreshLevels) onRefreshLevels();
              return;
            }
          }

          let finalName = puzzle.name;
          if (conflictAction === "copy" && conflicts.length > 0) {
            const allNames = new Set(AppData.getAllPuzzles().map(p => p.name));
            let counter = 1;
            while (allNames.has(finalName)) {
              counter++;
              finalName = puzzle.name + " (导入" + counter + ")";
            }
          }
          saveData.name = finalName;

          const saved = AppData.addCustomPuzzle(saveData);
          AppProgress.ensureProgressSize();
          const allPuzzles = AppData.getAllPuzzles();
          const idx = allPuzzles.findIndex(p => p.id === saved.id);
          if (idx >= 0) {
            AppProgress.updateProgress(idx, { unlocked: true });
          }
          closePreviewModal();
          showSimpleModal("保存成功",
            conflicts.length > 0
              ? `已保存为「${finalName}」（自动重命名避免冲突）`
              : `已保存残页「${finalName}」`
          );
          if (onRefreshLevels) onRefreshLevels();
        };
      }
    }

    if (closeBtn) closeBtn.onclick = closePreviewModal;

    overlay.classList.remove("hidden");
    modal.classList.remove("hidden");
  }

  function closePreviewModal() {
    const overlay = document.getElementById("shareOverlay");
    const modal = document.getElementById("sharePreviewModal");
    if (overlay) overlay.classList.add("hidden");
    if (modal) modal.classList.add("hidden");
  }

  function closeAll() {
    const overlay = document.getElementById("shareOverlay");
    if (overlay) overlay.classList.add("hidden");
    ["shareExportModal", "shareImportModal", "sharePreviewModal"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add("hidden");
    });
  }

  function showSimpleModal(title, message) {
    const overlay = document.getElementById("shareOverlay");
    const modal = document.getElementById("shareSimpleModal");
    if (!overlay || !modal) {
      alert(title + "\n\n" + message);
      return;
    }
    const titleEl = modal.querySelector("#shareSimpleTitle");
    const msgEl = modal.querySelector("#shareSimpleMessage");
    const closeBtn = modal.querySelector("#shareSimpleClose");
    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.textContent = message;
    if (closeBtn) closeBtn.onclick = () => {
      overlay.classList.add("hidden");
      modal.classList.add("hidden");
    };
    overlay.classList.remove("hidden");
    modal.classList.remove("hidden");
  }

  function bindOverlayClicks() {
    const overlay = document.getElementById("shareOverlay");
    if (!overlay) return;
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        closeAll();
      }
    });
  }

  function exportCurrentPuzzle() {
    const idx = AppGame.getCurrentIndex();
    if (idx < 0) return;
    const puzzle = AppData.getPuzzleByIndex(idx);
    if (!puzzle) return;
    if (!puzzle.custom && !puzzle.daily) {
      if (!confirm("这是内置关卡，确定要分享吗？\n建议分享自定义残页或每日挑战结果。")) {
        return;
      }
    }
    openExportModal(puzzle, {
      source: puzzle.custom ? "自定义残页" : (puzzle.daily ? "每日挑战" : "内置关卡"),
      author: puzzle.custom ? "我" : undefined
    });
  }

  function exportEditorPuzzle(editorState) {
    const puzzle = {
      name: editorState.name,
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
    if (editorState.customColors && Object.keys(editorState.customColors).some(k => editorState.customColors[k])) {
      puzzle.customColors = {};
      if (editorState.customColors.paperColor) puzzle.customColors.paperColor = editorState.customColors.paperColor;
      if (editorState.customColors.inkColor) puzzle.customColors.inkColor = editorState.customColors.inkColor;
      if (editorState.customColors.tableColor) puzzle.customColors.tableColor = editorState.customColors.tableColor;
    }
    openExportModal(puzzle, {
      source: "编辑器草稿",
      author: "我"
    });
  }

  function exportDailyResult(dateStr, puzzle, record) {
    if (!record) return;
    const dailyData = {
      puzzle,
      score: record.score || 0,
      usedTime: record.usedTime || 0,
      hintUsed: record.hintUsed || false,
      completed: record.completed || false,
      rating: "",
      dailyDate: dateStr
    };
    if (record.completed && record.score != null) {
      if (record.score >= 1500) dailyData.rating = "完美修补 ★★★";
      else if (record.score >= 1200) dailyData.rating = "优秀修补 ★★☆";
      else if (record.score >= 900) dailyData.rating = "良好修补 ★☆☆";
      else if (record.score >= 600) dailyData.rating = "合格修补";
      else dailyData.rating = "勉强完成";
    }
    openExportModal(puzzle, {
      isDaily: true,
      dailyResult: dailyData
    });
  }

  return {
    setCallbacks,
    openExportModal,
    closeExportModal,
    openImportModal,
    closeImportModal,
    openPreviewModal,
    closePreviewModal,
    closeAll,
    bindOverlayClicks,
    exportCurrentPuzzle,
    exportEditorPuzzle,
    exportDailyResult,
    showSimpleModal
  };
})();

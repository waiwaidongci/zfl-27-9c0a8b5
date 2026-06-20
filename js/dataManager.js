const AppDataManager = (() => {
  let isOpen = false;
  let panelEl = null;
  let overlayEl = null;

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  }

  function open() {
    if (isOpen) return;
    createPanel();
    overlayEl.classList.remove("hidden");
    panelEl.classList.remove("hidden");
    isOpen = true;
    render();
  }

  function close() {
    if (!isOpen) return;
    overlayEl.classList.add("hidden");
    panelEl.classList.add("hidden");
    isOpen = false;
  }

  function toggle() {
    if (isOpen) close();
    else open();
  }

  function createPanel() {
    if (panelEl) return;

    overlayEl = document.createElement("div");
    overlayEl.className = "dm-overlay hidden";
    overlayEl.id = "dataManagerOverlay";
    overlayEl.onclick = (e) => {
      if (e.target === overlayEl) close();
    };

    panelEl = document.createElement("div");
    panelEl.className = "dm-panel hidden";
    panelEl.id = "dataManagerPanel";

    panelEl.innerHTML = `
      <div class="dm-header">
        <div class="dm-title-group">
          <span class="dm-icon">📦</span>
          <h2>数据管理中心</h2>
        </div>
        <button class="dm-close-btn" id="dmCloseBtn" title="关闭">×</button>
      </div>

      <div class="dm-tabs">
        <button class="dm-tab active" data-tab="overview">概览</button>
        <button class="dm-tab" data-tab="backup">备份与恢复</button>
        <button class="dm-tab" data-tab="import-export">导入导出</button>
        <button class="dm-tab" data-tab="danger">危险操作</button>
      </div>

      <div class="dm-content">
        <div class="dm-tab-content" id="dm-tab-overview"></div>
        <div class="dm-tab-content hidden" id="dm-tab-backup"></div>
        <div class="dm-tab-content hidden" id="dm-tab-import-export"></div>
        <div class="dm-tab-content hidden" id="dm-tab-danger"></div>
      </div>
    `;

    document.body.appendChild(overlayEl);
    document.body.appendChild(panelEl);

    panelEl.querySelector("#dmCloseBtn").onclick = close;

    panelEl.querySelectorAll(".dm-tab").forEach(tab => {
      tab.onclick = () => {
        const tabName = tab.dataset.tab;
        switchTab(tabName);
      };
    });
  }

  function switchTab(tabName) {
    panelEl.querySelectorAll(".dm-tab").forEach(t => {
      t.classList.toggle("active", t.dataset.tab === tabName);
    });
    panelEl.querySelectorAll(".dm-tab-content").forEach(c => {
      c.classList.add("hidden");
    });
    const contentEl = panelEl.querySelector("#dm-tab-" + tabName);
    if (contentEl) contentEl.classList.remove("hidden");
    renderTab(tabName);
  }

  function render() {
    renderTab("overview");
  }

  function renderTab(tabName) {
    switch (tabName) {
      case "overview":
        renderOverview();
        break;
      case "backup":
        renderBackup();
        break;
      case "import-export":
        renderImportExport();
        break;
      case "danger":
        renderDanger();
        break;
    }
  }

  function renderOverview() {
    const el = panelEl.querySelector("#dm-tab-overview");
    if (!el) return;

    const stats = AppStorage.getStats();
    const data = AppStorage.getDataCopy();
    const dataSize = new Blob([JSON.stringify(data)]).size;

    el.innerHTML = `
      <div class="dm-section">
        <h3>数据概览</h3>
        <div class="dm-stats-grid">
          <div class="dm-stat-card">
            <div class="dm-stat-icon">📋</div>
            <div class="dm-stat-value">${stats.schemaVersion}</div>
            <div class="dm-stat-label">Schema 版本</div>
          </div>
          <div class="dm-stat-card">
            <div class="dm-stat-icon">💾</div>
            <div class="dm-stat-value">${formatBytes(dataSize)}</div>
            <div class="dm-stat-label">数据大小</div>
          </div>
          <div class="dm-stat-card">
            <div class="dm-stat-icon">📚</div>
            <div class="dm-stat-value">${stats.libraryCount}</div>
            <div class="dm-stat-label">藏书阁记录</div>
          </div>
          <div class="dm-stat-card">
            <div class="dm-stat-icon">📝</div>
            <div class="dm-stat-value">${stats.libraryNotesCount}</div>
            <div class="dm-stat-label">藏书备注</div>
          </div>
          <div class="dm-stat-card">
            <div class="dm-stat-icon">🎯</div>
            <div class="dm-stat-value">${stats.progressCount}</div>
            <div class="dm-stat-label">进度记录</div>
          </div>
          <div class="dm-stat-card">
            <div class="dm-stat-icon">📅</div>
            <div class="dm-stat-value">${stats.dailyRecordsCount}</div>
            <div class="dm-stat-label">每日挑战记录</div>
          </div>
          <div class="dm-stat-card">
            <div class="dm-stat-icon">✏️</div>
            <div class="dm-stat-value">${stats.customPuzzlesCount}</div>
            <div class="dm-stat-label">自定义残页</div>
          </div>
          <div class="dm-stat-card">
            <div class="dm-stat-icon">🎨</div>
            <div class="dm-stat-value">${stats.customThemesCount}</div>
            <div class="dm-stat-label">自定义主题</div>
          </div>
          <div class="dm-stat-card">
            <div class="dm-stat-icon">💾</div>
            <div class="dm-stat-value">${stats.levelSavesCount}</div>
            <div class="dm-stat-label">关卡存档</div>
          </div>
          <div class="dm-stat-card">
            <div class="dm-stat-icon">📜</div>
            <div class="dm-stat-value">${stats.backups}</div>
            <div class="dm-stat-label">备份数量</div>
          </div>
        </div>
      </div>

      <div class="dm-section">
        <h3>迁移信息</h3>
        <div class="dm-info-card">
          <div class="dm-info-row">
            <span>当前 Schema 版本</span>
            <b>v${stats.schemaVersion}</b>
          </div>
          <div class="dm-info-row">
            <span>最后迁移时间</span>
            <b>${stats.migratedAt ? new Date(stats.migratedAt).toLocaleString("zh-CN") : "未迁移"}</b>
          </div>
          <div class="dm-info-row">
            <span>存储键名</span>
            <code>${AppStorage.UNIFIED_KEY}</code>
          </div>
        </div>
      </div>

      <div class="dm-section">
        <h3>快捷操作</h3>
        <div class="dm-action-row">
          <button class="dm-btn dm-btn-primary" data-action="create-backup">📦 立即备份</button>
          <button class="dm-btn" data-action="export-all">📤 导出全部数据</button>
          <button class="dm-btn" data-action="import-all">📥 导入数据文件</button>
        </div>
      </div>
    `;

    el.querySelectorAll("[data-action]").forEach(btn => {
      btn.onclick = () => handleAction(btn.dataset.action);
    });
  }

  function renderBackup() {
    const el = panelEl.querySelector("#dm-tab-backup");
    if (!el) return;

    const backups = AppStorage.listBackups();

    let backupsHtml = "";
    if (backups.length === 0) {
      backupsHtml = `
        <div class="dm-empty">
          <div class="dm-empty-icon">📭</div>
          <div class="dm-empty-text">暂无备份</div>
          <div class="dm-empty-hint">点击下方按钮创建第一个备份</div>
        </div>
      `;
    } else {
      backupsHtml = '<div class="dm-backup-list">';
      backups.forEach((backup, idx) => {
        backupsHtml += `
          <div class="dm-backup-item">
            <div class="dm-backup-info">
              <div class="dm-backup-date">${escapeHtml(backup.dateStr)}</div>
              <div class="dm-backup-meta">
                <span>Schema v${backup.schemaVersion}</span>
                <span class="dm-backup-key">${escapeHtml(backup.key)}</span>
              </div>
            </div>
            <div class="dm-backup-actions">
              <button class="dm-btn dm-btn-small" data-restore="${escapeHtml(backup.key)}">恢复</button>
              <button class="dm-btn dm-btn-small dm-btn-danger" data-delete="${escapeHtml(backup.key)}">删除</button>
            </div>
          </div>
        `;
      });
      backupsHtml += '</div>';
    }

    el.innerHTML = `
      <div class="dm-section">
        <h3>备份说明</h3>
        <div class="dm-info-card">
          <p>系统会在以下情况自动创建备份：</p>
          <ul>
            <li>数据迁移前</li>
            <li>每次修改数据时（保留最近 ${5} 个）</li>
            <li>导入数据前</li>
          </ul>
          <p>您也可以手动创建备份，用于重要操作前的安全保护。</p>
        </div>
      </div>

      <div class="dm-section">
        <div class="dm-section-header">
          <h3>备份列表</h3>
          <button class="dm-btn dm-btn-primary dm-btn-small" data-action="create-backup">+ 新建备份</button>
        </div>
        ${backupsHtml}
      </div>
    `;

    el.querySelectorAll("[data-action]").forEach(btn => {
      btn.onclick = () => handleAction(btn.dataset.action);
    });

    el.querySelectorAll("[data-restore]").forEach(btn => {
      btn.onclick = () => {
        const key = btn.dataset.restore;
        if (confirm("确定要从这个备份恢复数据吗？当前数据将会被覆盖，且会先创建一个当前数据的备份。")) {
          const result = AppStorage.restoreBackup(key);
          if (result) {
            alert("数据已成功从备份恢复！");
            renderBackup();
            refreshAppData();
          } else {
            alert("恢复失败，备份数据可能已损坏。");
          }
        }
      };
    });

    el.querySelectorAll("[data-delete]").forEach(btn => {
      btn.onclick = () => {
        const key = btn.dataset.delete;
        if (confirm("确定要删除这个备份吗？删除后无法恢复。")) {
          AppStorage.deleteBackup(key);
          renderBackup();
        }
      };
    });
  }

  function renderImportExport() {
    const el = panelEl.querySelector("#dm-tab-import-export");
    if (!el) return;

    el.innerHTML = `
      <div class="dm-section">
        <h3>导出全部数据</h3>
        <div class="dm-info-card">
          <p>导出当前所有存档数据为 JSON 文件，包括：</p>
          <ul>
            <li>自定义残页和主题</li>
            <li>进度记录和藏书阁</li>
            <li>每日挑战记录</li>
            <li>关卡存档</li>
            <li>生成器历史和收藏</li>
          </ul>
        </div>
        <button class="dm-btn dm-btn-primary" data-action="export-all">📤 导出全部数据</button>
      </div>

      <div class="dm-section">
        <h3>导入数据</h3>
        <div class="dm-info-card">
          <p>从之前导出的 JSON 文件导入数据。导入前会自动备份当前数据，可随时回滚。</p>
          <p><strong>注意：</strong>导入会覆盖现有数据，请确保已备份重要内容。</p>
        </div>
        <div class="dm-action-row">
          <button class="dm-btn dm-btn-primary" data-action="import-all">📥 选择文件导入</button>
          <input type="file" id="dmImportFile" accept=".json,application/json" style="display:none">
        </div>
      </div>

      <div class="dm-section">
        <h3>关卡包导入导出</h3>
        <div class="dm-info-card">
          <p>如需导入或导出关卡包（仅包含残页和进度，不含系统设置），请使用顶部工具栏的「导入关卡包」和「导出关卡包」按钮。</p>
        </div>
      </div>
    `;

    el.querySelectorAll("[data-action]").forEach(btn => {
      btn.onclick = () => handleAction(btn.dataset.action);
    });

    const fileInput = el.querySelector("#dmImportFile");
    if (fileInput) {
      fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) handleImportFile(file);
        fileInput.value = "";
      };
    }
  }

  function renderDanger() {
    const el = panelEl.querySelector("#dm-tab-danger");
    if (!el) return;

    el.innerHTML = `
      <div class="dm-section">
        <h3>数据修复</h3>
        <div class="dm-info-card dm-warning">
          <p>如果您发现数据异常或部分功能无法使用，可以尝试修复数据。修复会尝试保留所有可读取的数据，并重建损坏的部分。</p>
          <p><strong>修复前会自动创建备份。</strong></p>
        </div>
        <button class="dm-btn dm-btn-warning" data-action="repair-data">🔧 修复数据</button>
      </div>

      <div class="dm-section">
        <h3>重新迁移</h3>
        <div class="dm-info-card">
          <p>如果旧版数据还在 localStorage 中，可以重新执行迁移。这会从旧的分散存储键中重新读取数据并合并到当前统一存储中。</p>
          <p><strong>注意：</strong>重新迁移不会删除现有数据，只会补充缺失的部分。</p>
        </div>
        <button class="dm-btn" data-action="remigrate">🔄 重新迁移旧数据</button>
      </div>

      <div class="dm-section dm-danger-section">
        <h3>⚠️ 重置所有数据</h3>
        <div class="dm-info-card dm-danger">
          <p>此操作将删除所有存档数据，包括自定义残页、进度、藏书阁记录等。此操作不可撤销！</p>
          <p><strong>重置前会自动创建备份，您可以从备份中恢复。</strong></p>
        </div>
        <button class="dm-btn dm-btn-danger" data-action="reset-all">🗑️ 重置所有数据</button>
      </div>
    `;

    el.querySelectorAll("[data-action]").forEach(btn => {
      btn.onclick = () => handleAction(btn.dataset.action);
    });
  }

  function handleAction(action) {
    switch (action) {
      case "create-backup":
        handleCreateBackup();
        break;
      case "export-all":
        handleExportAll();
        break;
      case "import-all":
        const fileInput = panelEl.querySelector("#dmImportFile");
        if (fileInput) fileInput.click();
        break;
      case "repair-data":
        handleRepairData();
        break;
      case "remigrate":
        handleRemigrate();
        break;
      case "reset-all":
        handleResetAll();
        break;
    }
  }

  function handleCreateBackup() {
    const data = AppStorage.exportAllData();
    const key = AppStorage.createBackup(data);
    if (key) {
      alert("备份创建成功！备份键：" + key);
      renderBackup();
    } else {
      alert("备份创建失败！");
    }
  }

  function handleExportAll() {
    const data = AppStorage.exportAllData();
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const timestamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = "zfl27_data_backup_" + timestamp + ".json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleImportFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        const result = AppStorage.importAllData(data, { overwrite: true });
        if (result.success) {
          alert("数据导入成功！\n" + result.message + "\n\n备份键：" + (result.backupKey || "无"));
          refreshAppData();
          render();
        } else {
          alert("导入失败：" + result.message);
        }
      } catch (err) {
        alert("文件解析失败：" + err.message);
      }
    };
    reader.onerror = () => {
      alert("文件读取失败");
    };
    reader.readAsText(file);
  }

  function handleRepairData() {
    if (!confirm("确定要修复数据吗？修复前会自动创建当前数据的备份。")) return;
    const result = AppStorage.repairData();
    if (result.success) {
      alert("数据修复完成！\n" + result.message + "\n\n备份键：" + (result.backupKey || "无"));
      refreshAppData();
      render();
    } else {
      alert("修复失败");
    }
  }

  function handleRemigrate() {
    if (!confirm("确定要重新迁移旧数据吗？这会从旧的 localStorage 键中读取数据并合并到当前存储中。")) return;
    const result = AppStorage.migrate();
    alert(result.message);
    refreshAppData();
    render();
  }

  function handleResetAll() {
    if (!confirm("⚠️ 确定要重置所有数据吗？\n\n此操作将删除所有存档数据，包括自定义残页、进度、藏书阁记录等。\n\n重置前会自动创建备份，您可以从备份中恢复。")) return;
    if (!confirm("最后确认：真的要删除所有数据吗？此操作不可直接撤销（但有备份）。")) return;

    const result = AppStorage.resetAllData();
    alert("所有数据已重置！\n\n备份键：" + (result.backupKey || "无") + "\n您可以在「备份与恢复」中找到此备份。");
    refreshAppData();
    render();
  }

  function refreshAppData() {
    if (typeof AppProgress !== "undefined" && AppProgress.init) {
      AppProgress.init();
    }
    if (typeof App !== "undefined" && App.refreshLevels) {
      App.refreshLevels();
    }
  }

  function showDataCorruptedWarning(migrateResult) {
    const message = migrateResult?.message || "检测到数据损坏，可尝试从备份恢复或修复数据。";
    const overlay = document.createElement("div");
    overlay.className = "dm-alert-overlay";
    overlay.innerHTML = `
      <div class="dm-alert-modal">
        <div class="dm-alert-icon">⚠️</div>
        <h3>数据损坏提示</h3>
        <p>${escapeHtml(message)}</p>
        <div class="dm-alert-actions">
          <button class="dm-btn dm-btn-warning" id="dmAlertRepairBtn">🔧 修复数据</button>
          <button class="dm-btn" id="dmAlertBackupBtn">📦 查看备份</button>
          <button class="dm-btn secondary" id="dmAlertCloseBtn">暂时忽略</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector("#dmAlertCloseBtn").onclick = () => overlay.remove();
    overlay.querySelector("#dmAlertRepairBtn").onclick = () => {
      overlay.remove();
      open();
      switchTab("danger");
    };
    overlay.querySelector("#dmAlertBackupBtn").onclick = () => {
      overlay.remove();
      open();
      switchTab("backup");
    };
  }

  function showNewerSchemaWarning(migrateResult) {
    const message = migrateResult?.message || "本地数据版本高于当前支持版本，请升级应用。";
    const overlay = document.createElement("div");
    overlay.className = "dm-alert-overlay";
    overlay.innerHTML = `
      <div class="dm-alert-modal">
        <div class="dm-alert-icon">⬆️</div>
        <h3>数据版本过高</h3>
        <p>${escapeHtml(message)}</p>
        <p style="font-size:12px;color:var(--theme-text-muted)">继续使用可能会导致数据丢失或异常，建议升级应用后再使用。</p>
        <div class="dm-alert-actions">
          <button class="dm-btn" id="dmAlertExportBtn">📤 先导出数据备份</button>
          <button class="dm-btn secondary" id="dmAlertCloseBtn">我知道了</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector("#dmAlertCloseBtn").onclick = () => overlay.remove();
    overlay.querySelector("#dmAlertExportBtn").onclick = () => {
      handleExportAll();
    };
  }

  return {
    open,
    close,
    toggle,
    showDataCorruptedWarning,
    showNewerSchemaWarning
  };
})();

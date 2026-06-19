const LevelPack = (() => {
  const FORMAT_IDENTIFIER = "zfl27-level-pack";
  const FORMAT_VERSION = 1;
  const FORMAT_VERSION_MIN_COMPATIBLE = 1;
  const BACKUP_KEY_PREFIX = "zfl27Backup_";
  const CUSTOM_KEY = "zfl27CustomPuzzles";

  const REQUIRED_PUZZLE_FIELDS = ["name", "cols", "rows", "text", "theme"];

  const DEFAULT_PUZZLE = {
    timeLimit: 120,
    hintPenalty: 80,
    scatterRule: "random",
    enableRotation: false,
    enableFlip: false,
    initialRotationScrambled: false,
    initialFlipScrambled: false,
    availableTools: ["zoom", "edgeAlign"]
  };

  function getAppVersion() {
    return "1.0.0";
  }

  function getAvailablePapers() {
    return Object.keys(AppData.themes.paper);
  }
  function getAvailableInks() {
    return Object.keys(AppData.themes.ink);
  }
  function getAvailableBorders() {
    return Object.keys(AppData.themes.border);
  }
  function getAvailableTables() {
    return Object.keys(AppData.themes.table);
  }
  function getAvailableScatterRules() {
    return Object.keys(AppData.scatterRules);
  }
  function getAvailableTools() {
    return ["zoom", "edgeAlign", "rotateCw", "rotateCcw", "flip"];
  }

  function createBackup() {
    const timestamp = Date.now();
    const backupKey = BACKUP_KEY_PREFIX + timestamp;
    const backup = {
      timestamp: timestamp,
      customPuzzles: localStorage.getItem(CUSTOM_KEY) || null,
      progress: localStorage.getItem("zfl27Progress") || null,
      library: localStorage.getItem("zfl27Library") || null,
      notes: localStorage.getItem("zfl27LibraryNotes") || null
    };
    try {
      localStorage.setItem(backupKey, JSON.stringify(backup));
      cleanupOldBackups();
      return backupKey;
    } catch (e) {
      return null;
    }
  }

  function cleanupOldBackups() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(BACKUP_KEY_PREFIX)) {
        keys.push(key);
      }
    }
    keys.sort();
    while (keys.length > 5) {
      const oldest = keys.shift();
      localStorage.removeItem(oldest);
    }
  }

  function restoreBackup(backupKey) {
    try {
      const raw = localStorage.getItem(backupKey);
      if (!raw) return false;
      const backup = JSON.parse(raw);
      if (backup.customPuzzles !== null) {
        localStorage.setItem(CUSTOM_KEY, backup.customPuzzles);
      } else {
        localStorage.removeItem(CUSTOM_KEY);
      }
      if (backup.progress !== null) {
        localStorage.setItem("zfl27Progress", backup.progress);
      } else {
        localStorage.removeItem("zfl27Progress");
      }
      if (backup.library !== null) {
        localStorage.setItem("zfl27Library", backup.library);
      } else {
        localStorage.removeItem("zfl27Library");
      }
      if (backup.notes !== null) {
        localStorage.setItem("zfl27LibraryNotes", backup.notes);
      } else {
        localStorage.removeItem("zfl27LibraryNotes");
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  function validatePuzzle(puzzle) {
    const errors = [];
    const warnings = [];

    for (const field of REQUIRED_PUZZLE_FIELDS) {
      if (!(field in puzzle)) {
        errors.push("缺少必填字段: " + field);
      }
    }
    if (errors.length > 0) return { valid: false, errors, warnings };

    if (typeof puzzle.name !== "string" || !puzzle.name.trim()) {
      errors.push("关卡名称不能为空");
    }

    if (typeof puzzle.cols !== "number" || puzzle.cols < 2 || puzzle.cols > 6 || !Number.isInteger(puzzle.cols)) {
      errors.push("列数 cols 必须是 2-6 之间的整数");
    }
    if (typeof puzzle.rows !== "number" || puzzle.rows < 2 || puzzle.rows > 5 || !Number.isInteger(puzzle.rows)) {
      errors.push("行数 rows 必须是 2-5 之间的整数");
    }

    if (!Array.isArray(puzzle.text)) {
      errors.push("text 必须是数组");
    } else {
      const expected = (puzzle.cols || 0) * (puzzle.rows || 0);
      if (puzzle.text.length !== expected) {
        errors.push("text 数组长度 (" + puzzle.text.length + ") 与格子总数 (" + expected + ") 不匹配");
      }
      if (!puzzle.text.every(t => typeof t === "string" && t.trim().length > 0)) {
        errors.push("所有残片文字不能为空");
      }
    }

    if (!puzzle.theme || typeof puzzle.theme !== "object") {
      errors.push("theme 必须是对象");
    } else {
      if (!getAvailablePapers().includes(puzzle.theme.paper)) {
        errors.push("未知的纸张类型: " + puzzle.theme.paper);
      }
      if (!getAvailableInks().includes(puzzle.theme.ink)) {
        errors.push("未知的墨色: " + puzzle.theme.ink);
      }
      if (!getAvailableBorders().includes(puzzle.theme.border)) {
        warnings.push("未知的边框样式: " + puzzle.theme.border + "，将使用默认值");
      }
      if (!getAvailableTables().includes(puzzle.theme.table)) {
        warnings.push("未知的台面类型: " + puzzle.theme.table + "，将使用默认值");
      }
    }

    if ("timeLimit" in puzzle && (typeof puzzle.timeLimit !== "number" || puzzle.timeLimit < 10 || puzzle.timeLimit > 600)) {
      warnings.push("限时参数异常，将使用默认值 120");
    }
    if ("hintPenalty" in puzzle && (typeof puzzle.hintPenalty !== "number" || puzzle.hintPenalty < 0 || puzzle.hintPenalty > 500)) {
      warnings.push("提示扣分异常，将使用默认值 80");
    }
    if ("scatterRule" in puzzle && !getAvailableScatterRules().includes(puzzle.scatterRule)) {
      warnings.push("散落方式未知，将使用默认值 random");
    }

    if (puzzle.initialRotationScrambled) {
      const hasRotate = (puzzle.availableTools || []).some(t => t === "rotateCw" || t === "rotateCcw");
      if (!hasRotate) {
        warnings.push("启用了初始旋转打乱但缺少旋转工具");
      }
    }
    if (puzzle.initialFlipScrambled) {
      const hasFlip = (puzzle.availableTools || []).includes("flip");
      if (!hasFlip) {
        warnings.push("启用了初始翻面打乱但缺少翻面工具");
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  function validateProgress(progress) {
    const errors = [];
    if (!progress || typeof progress !== "object") {
      return { valid: false, errors: ["progress 必须是对象"] };
    }
    return { valid: true, errors, warnings: [] };
  }

  function validateColophon(colophon) {
    if (colophon == null) return { valid: true, errors: [], warnings: [] };
    if (typeof colophon !== "string") {
      return { valid: false, errors: ["colophon 必须是字符串"] };
    }
    return { valid: true, errors: [], warnings: [] };
  }

  function normalizePuzzle(raw) {
    const normalized = { ...DEFAULT_PUZZLE, ...raw };
    if (!getAvailableBorders().includes(normalized.theme.border)) {
      normalized.theme.border = "none";
    }
    if (!getAvailableTables().includes(normalized.theme.table)) {
      normalized.theme.table = "base";
    }
    if (!getAvailableScatterRules().includes(normalized.scatterRule)) {
      normalized.scatterRule = "random";
    }
    if (typeof normalized.timeLimit !== "number" || normalized.timeLimit < 10 || normalized.timeLimit > 600) {
      normalized.timeLimit = 120;
    }
    if (typeof normalized.hintPenalty !== "number" || normalized.hintPenalty < 0 || normalized.hintPenalty > 500) {
      normalized.hintPenalty = 80;
    }
    if (!Array.isArray(normalized.availableTools)) {
      normalized.availableTools = ["zoom", "edgeAlign"];
    } else {
      normalized.availableTools = normalized.availableTools.filter(t => getAvailableTools().includes(t));
    }
    normalized.text = normalized.text.map(String);
    normalized.cols = Number(normalized.cols);
    normalized.rows = Number(normalized.rows);
    normalized.theme = {
      paper: normalized.theme.paper,
      ink: normalized.theme.ink,
      border: normalized.theme.border,
      table: normalized.theme.table
    };
    return normalized;
  }

  function validatePack(raw) {
    const result = {
      valid: false,
      formatOk: false,
      versionOk: false,
      fatalErrors: [],
      levelErrors: [],
      levelWarnings: [],
      levelsSummary: []
    };

    if (!raw || typeof raw !== "object") {
      result.fatalErrors.push("文件内容不是有效的 JSON 对象");
      return result;
    }

    if (raw.format !== FORMAT_IDENTIFIER) {
      result.fatalErrors.push("格式标识不匹配，这不是本游戏的关卡包文件");
      return result;
    }
    result.formatOk = true;

    if (typeof raw.version !== "number") {
      result.fatalErrors.push("缺少版本号");
      return result;
    }
    if (raw.version < FORMAT_VERSION_MIN_COMPATIBLE || raw.version > FORMAT_VERSION) {
      result.fatalErrors.push(
        "版本不兼容：文件版本 v" + raw.version +
        "，当前支持 v" + FORMAT_VERSION_MIN_COMPATIBLE + "-v" + FORMAT_VERSION
      );
      return result;
    }
    result.versionOk = true;

    if (!Array.isArray(raw.levels)) {
      result.fatalErrors.push("缺少 levels 数组");
      return result;
    }

    raw.levels.forEach((level, idx) => {
      const levelResult = {
        index: idx,
        puzzleErrors: [],
        puzzleWarnings: [],
        progressErrors: [],
        colophonErrors: [],
        valid: true,
        puzzleName: level.puzzle ? (level.puzzle.name || "关卡 " + (idx + 1)) : ("关卡 " + (idx + 1))
      };

      const pv = validatePuzzle(level.puzzle || {});
      levelResult.puzzleErrors = pv.errors;
      levelResult.puzzleWarnings = pv.warnings;
      if (!pv.valid) levelResult.valid = false;

      if (level.progress) {
        const prv = validateProgress(level.progress);
        levelResult.progressErrors = prv.errors;
        if (!prv.valid) levelResult.valid = false;
      }

      if (level.colophon != null) {
        const cv = validateColophon(level.colophon);
        levelResult.colophonErrors = cv.errors;
        if (!cv.valid) levelResult.valid = false;
      }

      result.levelsSummary.push(levelResult);
      levelResult.puzzleErrors.forEach(e => result.levelErrors.push("[" + levelResult.puzzleName + "] " + e));
      levelResult.puzzleWarnings.forEach(w => result.levelWarnings.push("[" + levelResult.puzzleName + "] " + w));
    });

    result.valid = result.fatalErrors.length === 0 && result.levelErrors.length === 0;

    return result;
  }

  function buildPack(levelIndices, packMeta) {
    const allPuzzles = AppData.getAllPuzzles();
    const progress = AppProgress.getProgress();
    const library = AppLibrary.loadLibrary();
    const notes = (() => {
      try {
        const saved = localStorage.getItem("zfl27LibraryNotes");
        return saved ? JSON.parse(saved) : {};
      } catch (e) {
        return {};
      }
    })();

    const packLevels = [];

    levelIndices.forEach(idx => {
      const puzzle = allPuzzles[idx];
      if (!puzzle) return;

      const levelEntry = {
        puzzle: {
          id: puzzle.id,
          name: puzzle.name,
          custom: !!puzzle.custom,
          cols: puzzle.cols,
          rows: puzzle.rows,
          text: [...puzzle.text],
          theme: { ...puzzle.theme },
          timeLimit: puzzle.timeLimit,
          hintPenalty: puzzle.hintPenalty,
          scatterRule: puzzle.scatterRule,
          enableRotation: puzzle.enableRotation,
          enableFlip: puzzle.enableFlip,
          initialRotationScrambled: puzzle.initialRotationScrambled,
          initialFlipScrambled: puzzle.initialFlipScrambled,
          availableTools: [...puzzle.availableTools]
        }
      };

      if (progress[idx]) {
        levelEntry.progress = { ...progress[idx] };
        if (progress[idx].colophon) {
          levelEntry.colophon = progress[idx].colophon;
        }
      }

      const libEntry = library.find(r => r.puzzleId === puzzle.id);
      if (libEntry) {
        levelEntry.libraryEntry = { ...libEntry };
      }

      if (notes[puzzle.id]) {
        levelEntry.note = notes[puzzle.id];
      }

      packLevels.push(levelEntry);
    });

    return {
      format: FORMAT_IDENTIFIER,
      version: FORMAT_VERSION,
      appVersion: getAppVersion(),
      exportedAt: Date.now(),
      meta: packMeta || {
        name: "关卡包",
        description: ""
      },
      levels: packLevels
    };
  }

  function exportPackToFile(levelIndices, packMeta) {
    const pack = buildPack(levelIndices, packMeta);
    const jsonStr = JSON.stringify(pack, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeName = (packMeta && packMeta.name ? packMeta.name : "levelpack").replace(/[\\/:*?"<>|]/g, "_");
    const timestamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = safeName + "_" + timestamp + ".zflpack.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return pack;
  }

  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error("文件读取失败"));
      reader.readAsText(file);
    });
  }

  async function parsePackFile(file) {
    try {
      const text = await readFileAsText(file);
      let raw;
      try {
        raw = JSON.parse(text);
      } catch (e) {
        return {
          ok: false,
          stage: "parse",
          error: "JSON 解析失败：" + e.message
        };
      }
      const validation = validatePack(raw);
      if (!validation.valid) {
        return {
          ok: false,
          stage: "validate",
          error: "数据校验失败",
          validation: validation,
          raw: raw
        };
      }
      return {
        ok: true,
        raw: raw,
        validation: validation
      };
    } catch (e) {
      return {
        ok: false,
        stage: "read",
        error: e.message
      };
    }
  }

  function buildPreview(packData) {
    const preview = {
      meta: packData.meta || {},
      format: packData.format,
      version: packData.version,
      appVersion: packData.appVersion,
      exportedAt: packData.exportedAt,
      levelCount: packData.levels.length,
      levels: []
    };

    packData.levels.forEach((level, idx) => {
      const puzzle = normalizePuzzle(level.puzzle);
      const existingAll = AppData.getAllPuzzles();
      const conflicts = [];

      existingAll.forEach(ep => {
        if (ep.name === puzzle.name) {
          conflicts.push({
            id: ep.id,
            name: ep.name,
            custom: ep.custom,
            isBuiltin: !ep.custom
          });
        }
      });

      const previewColors = AppData.getThemePreviewColor(puzzle.theme);
      preview.levels.push({
        index: idx,
        puzzleName: puzzle.name,
        cols: puzzle.cols,
        rows: puzzle.rows,
        pieceCount: puzzle.cols * puzzle.rows,
        textSample: puzzle.text.slice(0, Math.min(4, puzzle.text.length)),
        theme: puzzle.theme,
        previewColors: previewColors,
        timeLimit: puzzle.timeLimit,
        hasProgress: !!level.progress,
        progressCompleted: level.progress ? level.progress.completed : false,
        progressBestScore: level.progress ? level.progress.bestScore : 0,
        hasColophon: !!level.colophon,
        hasLibraryEntry: !!level.libraryEntry,
        hasNote: !!level.note,
        conflicts: conflicts,
        hasConflict: conflicts.length > 0
      });
    });

    return preview;
  }

  function resolveConflictAction(existingPuzzle, newPuzzle, action, allNames) {
    switch (action) {
      case "overwrite":
        return { action: "overwrite", targetId: existingPuzzle.id };
      case "skip":
        return { action: "skip" };
      case "copy":
      default:
        let counter = 1;
        let baseName = newPuzzle.name;
        let newName = baseName + " (副本)";
        while (allNames.has(newName)) {
          counter++;
          newName = baseName + " (副本" + counter + ")";
        }
        return { action: "copy", newName: newName };
    }
  }

  async function executeImport(packData, conflictResolutions, onProgress) {
    const backupKey = createBackup();
    if (!backupKey) {
      return {
        ok: false,
        stage: "backup",
        error: "无法创建备份，导入已取消"
      };
    }

    const report = {
      ok: true,
      backupKey: backupKey,
      imported: [],
      skipped: [],
      errors: [],
      warnings: []
    };

    try {
      const allPuzzlesBefore = AppData.getAllPuzzles();
      const allNamesBefore = new Set(allPuzzlesBefore.map(p => p.name));

      for (let i = 0; i < packData.levels.length; i++) {
        if (onProgress) onProgress(i, packData.levels.length);
        const level = packData.levels[i];
        const resolution = conflictResolutions[i] || { action: "copy" };

        const normalizedPuzzle = normalizePuzzle(level.puzzle);
        delete normalizedPuzzle.id;
        delete normalizedPuzzle.custom;

        if (resolution.action === "skip") {
          report.skipped.push({ index: i, name: normalizedPuzzle.name, reason: "用户选择跳过" });
          continue;
        }

        try {
          let resultPuzzle;

          if (resolution.action === "overwrite" && resolution.targetId) {
            const targetPuzzle = allPuzzlesBefore.find(p => p.id === resolution.targetId);
            if (targetPuzzle && targetPuzzle.custom) {
              const overwriteData = { ...normalizedPuzzle };
              AppData.updateCustomPuzzle(resolution.targetId, overwriteData);
              resultPuzzle = { ...overwriteData, id: resolution.targetId, custom: true };
              report.imported.push({
                index: i,
                action: "overwrite",
                name: normalizedPuzzle.name,
                id: resolution.targetId
              });
            } else {
              report.skipped.push({ index: i, name: normalizedPuzzle.name, reason: "目标不是自定义关卡，无法覆盖" });
              continue;
            }
          } else {
            if (resolution.action === "copy" && resolution.newName) {
              normalizedPuzzle.name = resolution.newName;
            }
            resultPuzzle = AppData.addCustomPuzzle(normalizedPuzzle);
            report.imported.push({
              index: i,
              action: resolution.action || "add",
              name: normalizedPuzzle.name,
              id: resultPuzzle.id
            });
          }

          const puzzleId = resultPuzzle.id;
          AppProgress.ensureProgressSize();
          const newAllPuzzles = AppData.getAllPuzzles();
          const progressIndex = newAllPuzzles.findIndex(p => p.id === puzzleId);

          if (progressIndex >= 0) {
            if (level.progress) {
              const progressData = {
                completed: !!level.progress.completed,
                bestScore: level.progress.bestScore || 0,
                bestTime: level.progress.bestTime !== undefined ? level.progress.bestTime : null,
                hintUsed: !!level.progress.hintUsed,
                unlocked: true,
                colophon: level.colophon || level.progress.colophon || ""
              };
              AppProgress.updateProgress(progressIndex, progressData);
            } else {
              AppProgress.updateProgress(progressIndex, { unlocked: true });
            }
          }

          if (level.libraryEntry) {
            const libEntry = { ...level.libraryEntry };
            libEntry.puzzleId = puzzleId;
            if (resultPuzzle) {
              libEntry.name = resultPuzzle.name;
              libEntry.text = resultPuzzle.text;
              libEntry.cols = resultPuzzle.cols;
              libEntry.rows = resultPuzzle.rows;
              libEntry.theme = resultPuzzle.theme;
            }
            AppLibrary.addOrUpdateEntry(puzzleId, libEntry);
          }

          if (level.note) {
            AppLibrary.setNote(puzzleId, level.note);
          }

        } catch (err) {
          report.errors.push({
            index: i,
            name: normalizedPuzzle.name,
            error: err.message || String(err)
          });
        }
      }

      if (report.errors.length === packData.levels.length && packData.levels.length > 0) {
        report.ok = false;
        if (backupKey) {
          restoreBackup(backupKey);
          report.restored = true;
        }
      }

      return report;

    } catch (fatalErr) {
      if (backupKey) {
        restoreBackup(backupKey);
      }
      return {
        ok: false,
        stage: "execute",
        backupKey: backupKey,
        error: fatalErr.message || String(fatalErr),
        restored: true,
        imported: [],
        skipped: [],
        errors: []
      };
    }
  }

  return {
    FORMAT_IDENTIFIER,
    FORMAT_VERSION,
    createBackup,
    restoreBackup,
    validatePack,
    validatePuzzle,
    normalizePuzzle,
    buildPack,
    exportPackToFile,
    parsePackFile,
    buildPreview,
    resolveConflictAction,
    executeImport
  };
})();

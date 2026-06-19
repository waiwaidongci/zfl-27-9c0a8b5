const LevelPack = (() => {
  const FORMAT_IDENTIFIER = "zfl27-level-pack";
  const FORMAT_VERSION = 1;
  const FORMAT_VERSION_MIN_COMPATIBLE = 1;
  const BACKUP_KEY_PREFIX = "zfl27Backup_";
  const CUSTOM_KEY = "zfl27CustomPuzzles";

  const REQUIRED_PUZZLE_FIELDS = ["name", "cols", "rows", "text", "theme"];
  const REQUIRED_THEME_FIELDS = ["paper", "ink", "border", "table"];

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

  const DEFAULT_THEME = {
    paper: "xuanzhi",
    ink: "mohei",
    border: "none",
    table: "wood"
  };

  const FIELD_LABELS = {
    size: "尺寸",
    text: "文字片段",
    theme: "主题",
    timeLimit: "限时",
    scatterRule: "散落规则",
    orientation: "方向设置",
    tools: "工具配置",
    progress: "进度",
    colophon: "题跋"
  };

  function formatValue(field, value) {
    if (value == null) return "无";
    switch (field) {
      case "size":
        return value.cols + "×" + value.rows;
      case "theme":
        const pn = (AppData.themes.paper[value.paper] || {}).name || value.paper;
        const inkn = (AppData.themes.ink[value.ink] || {}).name || value.ink;
        const bn = (AppData.themes.border[value.border] || {}).name || value.border;
        const tn = (AppData.themes.table[value.table] || {}).name || value.table;
        return pn + " + " + inkn + "（边框：" + bn + "，台面：" + tn + "）";
      case "timeLimit":
        return value + " 秒";
      case "scatterRule":
        return (AppData.scatterRules[value] || {}).name || value;
      case "orientation":
        const parts = [];
        if (value.enableRotation) parts.push("支持旋转");
        if (value.enableFlip) parts.push("支持翻转");
        if (value.initialRotationScrambled) parts.push("初始旋转打乱");
        if (value.initialFlipScrambled) parts.push("初始翻面打乱");
        return parts.length > 0 ? parts.join("，") : "基础模式";
      case "tools":
        const toolNames = {
          "zoom": "缩放",
          "edgeAlign": "边缘对齐",
          "rotateCw": "顺时针旋转",
          "rotateCcw": "逆时针旋转",
          "flip": "翻转"
        };
        return Array.isArray(value) ? value.map(t => toolNames[t] || t).join("、") : "无";
      case "progress":
        const progParts = [];
        progParts.push(value.completed ? "已完成" : "未完成");
        progParts.push("最佳 " + (value.bestScore || 0) + " 分");
        if (value.bestTime != null) progParts.push("最快 " + value.bestTime + " 秒");
        if (value.hintUsed) progParts.push("使用过提示");
        progParts.push(value.unlocked ? "已解锁" : "未解锁");
        return progParts.join("，");
      case "colophon":
        return value ? value : "无";
      case "text":
        return Array.isArray(value) ? value.join("、") : String(value);
      default:
        return String(value);
    }
  }

  function calculateFieldDifferences(existingPuzzle, existingProgress, existingColophon, newLevel) {
    const differences = [];
    const newPuzzle = normalizePuzzle(newLevel.puzzle);
    const newProgress = newLevel.progress || {};
    const newColophon = newLevel.colophon || (newProgress && newProgress.colophon) || "";

    const sizeDiff = existingPuzzle.cols !== newPuzzle.cols || existingPuzzle.rows !== newPuzzle.rows;
    if (sizeDiff) {
      differences.push({
        field: "size",
        label: FIELD_LABELS.size,
        oldValue: { cols: existingPuzzle.cols, rows: existingPuzzle.rows },
        newValue: { cols: newPuzzle.cols, rows: newPuzzle.rows },
        oldDisplay: formatValue("size", { cols: existingPuzzle.cols, rows: existingPuzzle.rows }),
        newDisplay: formatValue("size", { cols: newPuzzle.cols, rows: newPuzzle.rows })
      });
    }

    const textDiff = JSON.stringify(existingPuzzle.text) !== JSON.stringify(newPuzzle.text);
    if (textDiff) {
      differences.push({
        field: "text",
        label: FIELD_LABELS.text,
        oldValue: existingPuzzle.text,
        newValue: newPuzzle.text,
        oldDisplay: formatValue("text", existingPuzzle.text),
        newDisplay: formatValue("text", newPuzzle.text)
      });
    }

    const themeDiff = existingPuzzle.theme.paper !== newPuzzle.theme.paper ||
                      existingPuzzle.theme.ink !== newPuzzle.theme.ink ||
                      existingPuzzle.theme.border !== newPuzzle.theme.border ||
                      existingPuzzle.theme.table !== newPuzzle.theme.table;
    if (themeDiff) {
      differences.push({
        field: "theme",
        label: FIELD_LABELS.theme,
        oldValue: existingPuzzle.theme,
        newValue: newPuzzle.theme,
        oldDisplay: formatValue("theme", existingPuzzle.theme),
        newDisplay: formatValue("theme", newPuzzle.theme)
      });
    }

    if (existingPuzzle.timeLimit !== newPuzzle.timeLimit) {
      differences.push({
        field: "timeLimit",
        label: FIELD_LABELS.timeLimit,
        oldValue: existingPuzzle.timeLimit,
        newValue: newPuzzle.timeLimit,
        oldDisplay: formatValue("timeLimit", existingPuzzle.timeLimit),
        newDisplay: formatValue("timeLimit", newPuzzle.timeLimit)
      });
    }

    if (existingPuzzle.scatterRule !== newPuzzle.scatterRule) {
      differences.push({
        field: "scatterRule",
        label: FIELD_LABELS.scatterRule,
        oldValue: existingPuzzle.scatterRule,
        newValue: newPuzzle.scatterRule,
        oldDisplay: formatValue("scatterRule", existingPuzzle.scatterRule),
        newDisplay: formatValue("scatterRule", newPuzzle.scatterRule)
      });
    }

    const orientDiff = existingPuzzle.enableRotation !== newPuzzle.enableRotation ||
                       existingPuzzle.enableFlip !== newPuzzle.enableFlip ||
                       existingPuzzle.initialRotationScrambled !== newPuzzle.initialRotationScrambled ||
                       existingPuzzle.initialFlipScrambled !== newPuzzle.initialFlipScrambled;
    if (orientDiff) {
      differences.push({
        field: "orientation",
        label: FIELD_LABELS.orientation,
        oldValue: {
          enableRotation: existingPuzzle.enableRotation,
          enableFlip: existingPuzzle.enableFlip,
          initialRotationScrambled: existingPuzzle.initialRotationScrambled,
          initialFlipScrambled: existingPuzzle.initialFlipScrambled
        },
        newValue: {
          enableRotation: newPuzzle.enableRotation,
          enableFlip: newPuzzle.enableFlip,
          initialRotationScrambled: newPuzzle.initialRotationScrambled,
          initialFlipScrambled: newPuzzle.initialFlipScrambled
        },
        oldDisplay: formatValue("orientation", {
          enableRotation: existingPuzzle.enableRotation,
          enableFlip: existingPuzzle.enableFlip,
          initialRotationScrambled: existingPuzzle.initialRotationScrambled,
          initialFlipScrambled: existingPuzzle.initialFlipScrambled
        }),
        newDisplay: formatValue("orientation", {
          enableRotation: newPuzzle.enableRotation,
          enableFlip: newPuzzle.enableFlip,
          initialRotationScrambled: newPuzzle.initialRotationScrambled,
          initialFlipScrambled: newPuzzle.initialFlipScrambled
        })
      });
    }

    const toolsDiff = JSON.stringify(existingPuzzle.availableTools.sort()) !== JSON.stringify(newPuzzle.availableTools.sort());
    if (toolsDiff) {
      differences.push({
        field: "tools",
        label: FIELD_LABELS.tools,
        oldValue: existingPuzzle.availableTools,
        newValue: newPuzzle.availableTools,
        oldDisplay: formatValue("tools", existingPuzzle.availableTools),
        newDisplay: formatValue("tools", newPuzzle.availableTools)
      });
    }

    const oldProg = existingProgress || { completed: false, bestScore: 0, bestTime: null, hintUsed: false, unlocked: false };
    const newProg = {
      completed: newProgress.completed === true,
      bestScore: newProgress.bestScore || 0,
      bestTime: newProgress.bestTime != null ? newProgress.bestTime : null,
      hintUsed: newProgress.hintUsed === true,
      unlocked: (newProgress.unlocked !== false)
    };
    const progDiff = oldProg.completed !== newProg.completed ||
                     oldProg.bestScore !== newProg.bestScore ||
                     oldProg.bestTime !== newProg.bestTime ||
                     oldProg.hintUsed !== newProg.hintUsed ||
                     oldProg.unlocked !== newProg.unlocked;
    if (progDiff) {
      differences.push({
        field: "progress",
        label: FIELD_LABELS.progress,
        oldValue: oldProg,
        newValue: newProg,
        oldDisplay: formatValue("progress", oldProg),
        newDisplay: formatValue("progress", newProg)
      });
    }

    const oldCol = existingColophon || "";
    const newCol = newColophon || "";
    if (oldCol !== newCol) {
      differences.push({
        field: "colophon",
        label: FIELD_LABELS.colophon,
        oldValue: oldCol,
        newValue: newCol,
        oldDisplay: formatValue("colophon", oldCol),
        newDisplay: formatValue("colophon", newCol)
      });
    }

    return differences;
  }

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

    if (puzzle == null || typeof puzzle !== "object" || Array.isArray(puzzle)) {
      errors.push("puzzle 必须是非空对象");
      return { valid: false, errors, warnings };
    }

    for (const field of REQUIRED_PUZZLE_FIELDS) {
      if (!(field in puzzle)) {
        errors.push("缺少必填字段: " + field);
      }
    }
    if (errors.length > 0) return { valid: false, errors, warnings };

    if (typeof puzzle.name !== "string" || !puzzle.name.trim()) {
      errors.push("关卡名称不能为空");
    }
    if (typeof puzzle.name === "string" && puzzle.name.length > 50) {
      warnings.push("关卡名称超过 50 字符，可能显示不全");
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
      const expected = (typeof puzzle.cols === "number" && typeof puzzle.rows === "number")
        ? puzzle.cols * puzzle.rows : 0;
      if (expected > 0 && puzzle.text.length !== expected) {
        errors.push("text 数组长度 (" + puzzle.text.length + ") 与格子总数 (" + expected + ") 不匹配");
      }
      for (let i = 0; i < puzzle.text.length; i++) {
        if (typeof puzzle.text[i] !== "string" || !puzzle.text[i].trim()) {
          errors.push("text[" + i + "] 不能为空字符串");
          break;
        }
      }
    }

    if (!puzzle.theme || typeof puzzle.theme !== "object" || Array.isArray(puzzle.theme)) {
      errors.push("theme 必须是非空对象");
    } else {
      for (const tf of REQUIRED_THEME_FIELDS) {
        if (!(tf in puzzle.theme)) {
          errors.push("theme 缺少必填字段: " + tf);
        }
      }
      if (!errors.some(e => e.includes("theme 缺少必填字段: paper"))) {
        if (puzzle.theme.paper !== undefined && !getAvailablePapers().includes(puzzle.theme.paper)) {
          errors.push("未知的纸张类型: " + puzzle.theme.paper);
        }
      }
      if (!errors.some(e => e.includes("theme 缺少必填字段: ink"))) {
        if (puzzle.theme.ink !== undefined && !getAvailableInks().includes(puzzle.theme.ink)) {
          errors.push("未知的墨色: " + puzzle.theme.ink);
        }
      }
      if (puzzle.theme.border !== undefined && !getAvailableBorders().includes(puzzle.theme.border)) {
        warnings.push("未知的边框样式: " + puzzle.theme.border + "，将使用默认值");
      }
      if (puzzle.theme.table !== undefined && !getAvailableTables().includes(puzzle.theme.table)) {
        warnings.push("未知的台面类型: " + puzzle.theme.table + "，将使用默认值");
      }
    }

    if ("timeLimit" in puzzle) {
      if (typeof puzzle.timeLimit !== "number" || !Number.isFinite(puzzle.timeLimit) || puzzle.timeLimit < 10 || puzzle.timeLimit > 600) {
        errors.push("限时 timeLimit 必须是 10-600 之间的数值");
      }
    }
    if ("hintPenalty" in puzzle) {
      if (typeof puzzle.hintPenalty !== "number" || !Number.isFinite(puzzle.hintPenalty) || puzzle.hintPenalty < 0 || puzzle.hintPenalty > 500) {
        errors.push("提示扣分 hintPenalty 必须是 0-500 之间的数值");
      }
    }
    if ("scatterRule" in puzzle && typeof puzzle.scatterRule === "string" && !getAvailableScatterRules().includes(puzzle.scatterRule)) {
      warnings.push("散落方式未知: " + puzzle.scatterRule + "，将使用默认值 random");
    }

    if (puzzle.enableRotation !== undefined && typeof puzzle.enableRotation !== "boolean") {
      warnings.push("enableRotation 应为布尔值，将使用默认值 false");
    }
    if (puzzle.enableFlip !== undefined && typeof puzzle.enableFlip !== "boolean") {
      warnings.push("enableFlip 应为布尔值，将使用默认值 false");
    }
    if (puzzle.initialRotationScrambled !== undefined && typeof puzzle.initialRotationScrambled !== "boolean") {
      warnings.push("initialRotationScrambled 应为布尔值，将使用默认值 false");
    }
    if (puzzle.initialFlipScrambled !== undefined && typeof puzzle.initialFlipScrambled !== "boolean") {
      warnings.push("initialFlipScrambled 应为布尔值，将使用默认值 false");
    }

    if ("availableTools" in puzzle) {
      if (!Array.isArray(puzzle.availableTools)) {
        warnings.push("availableTools 应为数组，将使用默认工具集");
      } else {
        const validTools = puzzle.availableTools.filter(t => typeof t === "string" && getAvailableTools().includes(t));
        if (validTools.length === 0) {
          warnings.push("availableTools 中无有效工具，将使用默认工具集");
        }
      }
    }

    if (puzzle.initialRotationScrambled === true) {
      const tools = Array.isArray(puzzle.availableTools) ? puzzle.availableTools : [];
      const hasRotate = tools.some(t => t === "rotateCw" || t === "rotateCcw");
      if (!hasRotate) {
        errors.push("启用了初始旋转打乱但缺少旋转工具，玩家无法修正方向");
      }
    }
    if (puzzle.initialFlipScrambled === true) {
      const tools = Array.isArray(puzzle.availableTools) ? puzzle.availableTools : [];
      const hasFlip = tools.includes("flip");
      if (!hasFlip) {
        errors.push("启用了初始翻面打乱但缺少翻面工具，玩家无法修正翻面");
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  function validateProgress(progress) {
    const errors = [];
    const warnings = [];

    if (progress == null || typeof progress !== "object" || Array.isArray(progress)) {
      return { valid: false, errors: ["progress 必须是非空对象"], warnings: [] };
    }

    if ("completed" in progress && typeof progress.completed !== "boolean") {
      errors.push("progress.completed 必须是布尔值");
    }
    if ("bestScore" in progress) {
      if (typeof progress.bestScore !== "number" || !Number.isFinite(progress.bestScore) || progress.bestScore < 0) {
        errors.push("progress.bestScore 必须是非负数值");
      }
    }
    if ("bestTime" in progress && progress.bestTime !== null) {
      if (typeof progress.bestTime !== "number" || !Number.isFinite(progress.bestTime) || progress.bestTime < 0) {
        errors.push("progress.bestTime 必须是非负数值或 null");
      }
    }
    if ("hintUsed" in progress && typeof progress.hintUsed !== "boolean") {
      errors.push("progress.hintUsed 必须是布尔值");
    }
    if ("unlocked" in progress && typeof progress.unlocked !== "boolean") {
      errors.push("progress.unlocked 必须是布尔值");
    }
    if ("colophon" in progress && progress.colophon !== null && progress.colophon !== undefined) {
      if (typeof progress.colophon !== "string") {
        errors.push("progress.colophon 必须是字符串或 null");
      } else if (progress.colophon.length > 500) {
        warnings.push("progress.colophon 超过 500 字符，将被截断");
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  function validateColophon(colophon) {
    if (colophon == null) return { valid: true, errors: [], warnings: [] };
    if (typeof colophon !== "string") {
      return { valid: false, errors: ["colophon 必须是字符串"], warnings: [] };
    }
    if (colophon.length > 500) {
      return { valid: true, errors: [], warnings: ["colophon 超过 500 字符，将被截断"] };
    }
    return { valid: true, errors: [], warnings: [] };
  }

  function validateLevel(level, idx) {
    const result = {
      index: idx,
      puzzleErrors: [],
      puzzleWarnings: [],
      progressErrors: [],
      progressWarnings: [],
      colophonErrors: [],
      colophonWarnings: [],
      valid: true,
      puzzleName: "关卡 " + (idx + 1)
    };

    if (level == null || typeof level !== "object" || Array.isArray(level)) {
      result.puzzleErrors.push("level 条目必须是非空对象");
      result.valid = false;
      return result;
    }

    if (!level.puzzle) {
      result.puzzleErrors.push("缺少 puzzle 字段");
      result.valid = false;
      return result;
    }

    const pv = validatePuzzle(level.puzzle);
    result.puzzleErrors = pv.errors;
    result.puzzleWarnings = pv.warnings;
    if (typeof level.puzzle.name === "string" && level.puzzle.name.trim()) {
      result.puzzleName = level.puzzle.name;
    }
    if (!pv.valid) result.valid = false;

    if (level.progress != null) {
      const prv = validateProgress(level.progress);
      result.progressErrors = prv.errors;
      result.progressWarnings = prv.warnings;
      if (!prv.valid) result.valid = false;
    }

    if (level.colophon != null) {
      const cv = validateColophon(level.colophon);
      result.colophonErrors = cv.errors;
      result.colophonWarnings = cv.warnings;
      if (!cv.valid) result.valid = false;
    }

    return result;
  }

  function normalizePuzzle(raw) {
    if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
      return { ...DEFAULT_PUZZLE, name: "未命名", cols: 2, rows: 2, text: ["残片1", "残片2", "残片3", "残片4"], theme: { ...DEFAULT_THEME } };
    }

    const normalized = { ...DEFAULT_PUZZLE };

    normalized.name = (typeof raw.name === "string" && raw.name.trim()) ? raw.name.trim() : "未命名";
    normalized.cols = (typeof raw.cols === "number" && Number.isFinite(raw.cols) && Number.isInteger(raw.cols) && raw.cols >= 2 && raw.cols <= 6) ? raw.cols : 3;
    normalized.rows = (typeof raw.rows === "number" && Number.isFinite(raw.rows) && Number.isInteger(raw.rows) && raw.rows >= 2 && raw.rows <= 5) ? raw.rows : 2;

    if (Array.isArray(raw.text) && raw.text.length === normalized.cols * normalized.rows && raw.text.every(t => typeof t === "string" && t.trim())) {
      normalized.text = raw.text.map(t => t.trim());
    } else {
      normalized.text = [];
      for (let i = 0; i < normalized.cols * normalized.rows; i++) {
        normalized.text.push("残片" + (i + 1));
      }
    }

    if (raw.theme && typeof raw.theme === "object" && !Array.isArray(raw.theme)) {
      normalized.theme = {
        paper: getAvailablePapers().includes(raw.theme.paper) ? raw.theme.paper : DEFAULT_THEME.paper,
        ink: getAvailableInks().includes(raw.theme.ink) ? raw.theme.ink : DEFAULT_THEME.ink,
        border: getAvailableBorders().includes(raw.theme.border) ? raw.theme.border : DEFAULT_THEME.border,
        table: getAvailableTables().includes(raw.theme.table) ? raw.theme.table : DEFAULT_THEME.table
      };
    } else {
      normalized.theme = { ...DEFAULT_THEME };
    }

    if (typeof raw.timeLimit === "number" && Number.isFinite(raw.timeLimit) && raw.timeLimit >= 10 && raw.timeLimit <= 600) {
      normalized.timeLimit = raw.timeLimit;
    }
    if (typeof raw.hintPenalty === "number" && Number.isFinite(raw.hintPenalty) && raw.hintPenalty >= 0 && raw.hintPenalty <= 500) {
      normalized.hintPenalty = raw.hintPenalty;
    }
    if (typeof raw.scatterRule === "string" && getAvailableScatterRules().includes(raw.scatterRule)) {
      normalized.scatterRule = raw.scatterRule;
    }
    if (typeof raw.enableRotation === "boolean") normalized.enableRotation = raw.enableRotation;
    if (typeof raw.enableFlip === "boolean") normalized.enableFlip = raw.enableFlip;
    if (typeof raw.initialRotationScrambled === "boolean") normalized.initialRotationScrambled = raw.initialRotationScrambled;
    if (typeof raw.initialFlipScrambled === "boolean") normalized.initialFlipScrambled = raw.initialFlipScrambled;

    if (Array.isArray(raw.availableTools)) {
      const valid = raw.availableTools.filter(t => typeof t === "string" && getAvailableTools().includes(t));
      normalized.availableTools = valid.length > 0 ? valid : ["zoom", "edgeAlign"];
    }

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
    if (raw.levels.length === 0) {
      result.fatalErrors.push("levels 数组为空，没有可导入的关卡");
      return result;
    }

    raw.levels.forEach((level, idx) => {
      const levelResult = validateLevel(level, idx);

      result.levelsSummary.push(levelResult);
      levelResult.puzzleErrors.forEach(e => result.levelErrors.push("[" + levelResult.puzzleName + "] " + e));
      levelResult.puzzleWarnings.forEach(w => result.levelWarnings.push("[" + levelResult.puzzleName + "] " + w));
      levelResult.progressErrors.forEach(e => result.levelErrors.push("[" + levelResult.puzzleName + " 进度] " + e));
      levelResult.colophonErrors.forEach(e => result.levelErrors.push("[" + levelResult.puzzleName + " 题跋] " + e));
      levelResult.progressWarnings.forEach(w => result.levelWarnings.push("[" + levelResult.puzzleName + " 进度] " + w));
      levelResult.colophonWarnings.forEach(w => result.levelWarnings.push("[" + levelResult.puzzleName + " 题跋] " + w));
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

    const allProgress = AppProgress.getProgress();

    packData.levels.forEach((level, idx) => {
      const puzzle = normalizePuzzle(level.puzzle);
      const existingAll = AppData.getAllPuzzles();
      const conflicts = [];

      existingAll.forEach((ep, epIdx) => {
        if (ep.name === puzzle.name) {
          const existingProgress = allProgress[epIdx] || null;
          const existingColophon = existingProgress ? (existingProgress.colophon || "") : "";
          const fieldDifferences = calculateFieldDifferences(ep, existingProgress, existingColophon, level);

          conflicts.push({
            id: ep.id,
            name: ep.name,
            custom: ep.custom,
            isBuiltin: !ep.custom,
            cols: ep.cols,
            rows: ep.rows,
            theme: ep.theme,
            previewColors: AppData.getThemePreviewColor(ep.theme),
            timeLimit: ep.timeLimit,
            textSample: ep.text.slice(0, Math.min(4, ep.text.length)),
            fieldDifferences: fieldDifferences,
            hasFieldDifferences: fieldDifferences.length > 0
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

  function preflightValidate(packData, conflictResolutions) {
    const issues = [];

    if (!packData || !Array.isArray(packData.levels)) {
      issues.push("关卡包数据结构无效");
      return issues;
    }

    const allExisting = AppData.getAllPuzzles();
    const existingIds = new Set(allExisting.map(p => p.id));
    const builtinIds = new Set(allExisting.filter(p => !p.custom).map(p => p.id));
    const reservedNames = new Set(allExisting.map(p => p.name));

    for (let i = 0; i < packData.levels.length; i++) {
      const level = packData.levels[i];
      const resolution = conflictResolutions[i] || { action: "copy" };

      if (resolution.action === "skip") continue;

      if (!level || !level.puzzle) {
        issues.push("关卡 #" + (i + 1) + "：缺少 puzzle 数据");
        continue;
      }

      const pv = validatePuzzle(level.puzzle);
      if (!pv.valid) {
        issues.push("关卡 #" + (i + 1) + " 「" + (level.puzzle.name || "未命名") + "」：" + pv.errors.join("；"));
        continue;
      }

      if (level.progress) {
        const prv = validateProgress(level.progress);
        if (!prv.valid) {
          issues.push("关卡 #" + (i + 1) + " 进度数据无效：" + prv.errors.join("；"));
        }
      }

      if (resolution.action === "overwrite" && resolution.targetId) {
        if (builtinIds.has(resolution.targetId)) {
          issues.push("关卡 #" + (i + 1) + "：不能覆盖内置关卡 " + resolution.targetId);
        }
        if (!existingIds.has(resolution.targetId)) {
          issues.push("关卡 #" + (i + 1) + "：覆盖目标 " + resolution.targetId + " 不存在");
        }
      }
    }

    return issues;
  }

  async function executeImport(packData, conflictResolutions, onProgress) {
    const preflightIssues = preflightValidate(packData, conflictResolutions);
    if (preflightIssues.length > 0) {
      return {
        ok: false,
        stage: "preflight",
        error: "导入前校验失败，未执行任何写入操作",
        preflightIssues: preflightIssues,
        imported: [],
        skipped: [],
        errors: preflightIssues.map((msg, i) => ({ index: i, name: "预检", error: msg }))
      };
    }

    const backupKey = createBackup();
    if (!backupKey) {
      return {
        ok: false,
        stage: "backup",
        error: "无法创建备份，导入已取消",
        imported: [],
        skipped: [],
        errors: []
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

    let anyWritePerformed = false;

    try {
      const allPuzzlesBefore = AppData.getAllPuzzles();
      const allNamesBefore = new Set(allPuzzlesBefore.map(p => p.name));

      for (let i = 0; i < packData.levels.length; i++) {
        if (onProgress) onProgress(i, packData.levels.length);
        const level = packData.levels[i];
        const resolution = conflictResolutions[i] || { action: "copy" };

        if (!level || !level.puzzle) {
          report.errors.push({ index: i, name: "关卡 " + (i + 1), error: "缺少 puzzle 数据" });
          continue;
        }

        const revalidation = validatePuzzle(level.puzzle);
        if (!revalidation.valid) {
          report.errors.push({ index: i, name: level.puzzle.name || "关卡 " + (i + 1), error: "校验失败: " + revalidation.errors.join("; ") });
          continue;
        }
        revalidation.warnings.forEach(w => report.warnings.push("[" + (level.puzzle.name || "关卡 " + (i + 1)) + "] " + w));

        if (level.progress) {
          const prv = validateProgress(level.progress);
          if (!prv.valid) {
            report.errors.push({ index: i, name: level.puzzle.name || "关卡 " + (i + 1), error: "进度校验失败: " + prv.errors.join("; ") });
            continue;
          }
        }

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
            if (!targetPuzzle) {
              report.errors.push({ index: i, name: normalizedPuzzle.name, error: "覆盖目标不存在" });
              continue;
            }
            if (!targetPuzzle.custom) {
              report.errors.push({ index: i, name: normalizedPuzzle.name, error: "不能覆盖内置关卡" });
              continue;
            }
            const overwriteData = { ...normalizedPuzzle };
            AppData.updateCustomPuzzle(resolution.targetId, overwriteData);
            resultPuzzle = { ...overwriteData, id: resolution.targetId, custom: true };
            anyWritePerformed = true;
            report.imported.push({
              index: i,
              action: "overwrite",
              name: normalizedPuzzle.name,
              id: resolution.targetId
            });
          } else {
            if (resolution.action === "copy" && resolution.newName) {
              normalizedPuzzle.name = resolution.newName;
            }
            resultPuzzle = AppData.addCustomPuzzle(normalizedPuzzle);
            anyWritePerformed = true;
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
            if (level.progress && typeof level.progress === "object") {
              const progressData = {
                completed: level.progress.completed === true,
                bestScore: (typeof level.progress.bestScore === "number" && Number.isFinite(level.progress.bestScore) && level.progress.bestScore >= 0) ? level.progress.bestScore : 0,
                bestTime: (level.progress.bestTime === null || level.progress.bestTime === undefined) ? null : ((typeof level.progress.bestTime === "number" && Number.isFinite(level.progress.bestTime) && level.progress.bestTime >= 0) ? level.progress.bestTime : null),
                hintUsed: level.progress.hintUsed === true,
                unlocked: true,
                colophon: (typeof level.colophon === "string") ? level.colophon.slice(0, 500) : ((typeof level.progress.colophon === "string") ? level.progress.colophon.slice(0, 500) : "")
              };
              AppProgress.updateProgress(progressIndex, progressData);
            } else {
              AppProgress.updateProgress(progressIndex, { unlocked: true });
            }
          }

          if (level.libraryEntry && typeof level.libraryEntry === "object") {
            const libEntry = { ...level.libraryEntry };
            libEntry.puzzleId = puzzleId;
            libEntry.name = resultPuzzle.name;
            libEntry.text = resultPuzzle.text;
            libEntry.cols = resultPuzzle.cols;
            libEntry.rows = resultPuzzle.rows;
            libEntry.theme = resultPuzzle.theme;
            AppLibrary.addOrUpdateEntry(puzzleId, libEntry);
          }

          if (level.note && typeof level.note === "string") {
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

      if (report.errors.length > 0) {
        report.ok = false;
        if (anyWritePerformed && backupKey) {
          const restored = restoreBackup(backupKey);
          report.restored = restored;
          if (restored) {
            report.imported = [];
            report.warnings.push("由于部分关卡导入出错，已回滚到导入前的存档状态");
          }
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
        errors: [{ index: -1, name: "系统", error: fatalErr.message || String(fatalErr) }]
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
    validateProgress,
    normalizePuzzle,
    buildPack,
    exportPackToFile,
    parsePackFile,
    buildPreview,
    resolveConflictAction,
    executeImport,
    preflightValidate,
    calculateFieldDifferences
  };
})();

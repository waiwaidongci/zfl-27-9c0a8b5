const ShareCode = (() => {
  const MAGIC_PREFIX = "ZFL27";
  const CURRENT_VERSION = 1;
  const MIN_COMPATIBLE_VERSION = 1;

  const TYPE_PUZZLE = "P";
  const TYPE_DAILY = "D";

  const MAX_CODE_LENGTH = 20000;
  const MAX_TEXT_LENGTH = 20;
  const MAX_NAME_LENGTH = 50;
  const MAX_NOTE_LENGTH = 200;

  const FIELD_ABBREV = {
    name: "n", cols: "c", rows: "r", text: "t", theme: "th",
    paper: "p", ink: "i", border: "b", table: "ta",
    timeLimit: "tl", hintPenalty: "hp", scatterRule: "sr",
    enableRotation: "er", enableFlip: "ef",
    initialRotationScrambled: "irs", initialFlipScrambled: "ifs",
    availableTools: "at", customColors: "cc",
    paperColor: "pc", inkColor: "ic", tableColor: "tc",
    source: "s", author: "a", note: "no", createdAt: "ca",
    score: "sc", usedTime: "ut", hintUsed: "hu", completed: "co",
    rating: "ra", dailyDate: "dd", puzzle: "pz"
  };

  const FIELD_EXPAND = {};
  Object.keys(FIELD_ABBREV).forEach(k => { FIELD_EXPAND[FIELD_ABBREV[k]] = k; });

  const VALID_SCATTER_RULES = ["random", "ordered", "reversed", "clustered"];
  const VALID_TOOLS = ["zoom", "edgeAlign", "rotateCw", "rotateCcw", "flip"];
  const VALID_PAPERS = ["xuanzhi", "mazhi", "juanzhi", "caizhi", "baizhi"];
  const VALID_INKS = ["mohei", "zhuhong", "zangqing", "tanxiang", "dai"];
  const VALID_BORDERS = ["none", "torn", "frayed", "chipped", "scalloped", "irregular"];
  const VALID_TABLES = ["base", "wood", "stone", "silk", "bamboo", "lacquer"];

  function fnv1a32(str) {
    let hash = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = (hash * 0x01000193) >>> 0;
    }
    return hash;
  }

  function hashToHex(hash) {
    return hash.toString(16).padStart(8, "0");
  }

  function base64UrlEncode(str) {
    const utf8 = unescape(encodeURIComponent(str));
    let b64 = "";
    for (let i = 0; i < utf8.length; i += 3) {
      const b1 = utf8.charCodeAt(i);
      const b2 = i + 1 < utf8.length ? utf8.charCodeAt(i + 1) : 0;
      const b3 = i + 2 < utf8.length ? utf8.charCodeAt(i + 2) : 0;
      const triple = (b1 << 16) | (b2 << 8) | b3;
      b64 += "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"[(triple >> 18) & 0x3f];
      b64 += "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"[(triple >> 12) & 0x3f];
      b64 += "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"[(triple >> 6) & 0x3f];
      b64 += "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"[triple & 0x3f];
    }
    const pad = utf8.length % 3;
    if (pad === 1) b64 = b64.slice(0, -2);
    else if (pad === 2) b64 = b64.slice(0, -1);
    return b64;
  }

  function base64UrlDecode(b64) {
    b64 = b64.replace(/[^A-Za-z0-9\-_]/g, "");
    while (b64.length % 4 !== 0) b64 += "=";
    b64 = b64.replace(/-/g, "+").replace(/_/g, "/");
    try {
      const binary = atob(b64);
      return decodeURIComponent(escape(binary));
    } catch (e) {
      return null;
    }
  }

  function abbreviateFields(obj) {
    if (obj == null || typeof obj !== "object") return obj;
    if (Array.isArray(obj)) return obj.map(abbreviateFields);
    const result = {};
    Object.keys(obj).forEach(k => {
      const shortKey = FIELD_ABBREV[k] || k;
      result[shortKey] = abbreviateFields(obj[k]);
    });
    return result;
  }

  function expandFields(obj) {
    if (obj == null || typeof obj !== "object") return obj;
    if (Array.isArray(obj)) return obj.map(expandFields);
    const result = {};
    Object.keys(obj).forEach(k => {
      const longKey = FIELD_EXPAND[k] || k;
      result[longKey] = expandFields(obj[k]);
    });
    return result;
  }

  function sanitizeString(str, maxLen, fallback) {
    if (typeof str !== "string") return fallback;
    const trimmed = str.trim();
    if (!trimmed) return fallback;
    if (trimmed.length > maxLen) return trimmed.slice(0, maxLen);
    return trimmed;
  }

  function sanitizeInt(val, min, max, fallback) {
    if (typeof val !== "number" || !Number.isFinite(val) || !Number.isInteger(val)) return fallback;
    if (val < min || val > max) return fallback;
    return val;
  }

  function sanitizeBool(val, fallback) {
    if (typeof val === "boolean") return val;
    if (typeof val === "number") return val !== 0;
    if (typeof val === "string") return val.toLowerCase() === "true" || val === "1";
    return fallback;
  }

  function sanitizeHexColor(val) {
    if (typeof val !== "string") return undefined;
    if (/^#[0-9a-fA-F]{6}$/.test(val)) return val;
    return undefined;
  }

  function sanitizePuzzle(raw) {
    const warnings = [];
    const errors = [];

    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return { valid: false, puzzle: null, errors: ["puzzle数据不是有效对象"], warnings: [] };
    }

    const cols = sanitizeInt(raw.cols, 2, 6, 0);
    const rows = sanitizeInt(raw.rows, 2, 5, 0);
    if (cols === 0 || rows === 0) {
      errors.push("尺寸无效，列数需2-6，行数需2-5");
      return { valid: false, puzzle: null, errors, warnings };
    }

    const totalPieces = cols * rows;
    let text = [];
    if (Array.isArray(raw.text) && raw.text.length > 0) {
      raw.text.forEach((t, i) => {
        const clean = sanitizeString(t, MAX_TEXT_LENGTH, "残" + (i + 1));
        text.push(clean);
      });
      if (text.length < totalPieces) {
        warnings.push("文字片段不足，已自动补齐");
        for (let i = text.length; i < totalPieces; i++) {
          text.push("残" + (i + 1));
        }
      } else if (text.length > totalPieces) {
        warnings.push("文字片段过多，已截断多余部分");
        text = text.slice(0, totalPieces);
      }
    } else {
      warnings.push("文字内容缺失，已使用占位文字");
      for (let i = 0; i < totalPieces; i++) {
        text.push("残" + (i + 1));
      }
    }

    const themeRaw = raw.theme || {};
    const theme = {};
    if (VALID_PAPERS.includes(themeRaw.paper)) theme.paper = themeRaw.paper;
    else { warnings.push("未知纸张类型，使用默认(宣纸)"); theme.paper = "xuanzhi"; }
    if (VALID_INKS.includes(themeRaw.ink)) theme.ink = themeRaw.ink;
    else { warnings.push("未知墨色，使用默认(墨黑)"); theme.ink = "mohei"; }
    if (VALID_BORDERS.includes(themeRaw.border)) theme.border = themeRaw.border;
    else { warnings.push("未知边框样式，使用默认(无)"); theme.border = "none"; }
    if (VALID_TABLES.includes(themeRaw.table)) theme.table = themeRaw.table;
    else { warnings.push("未知台面类型，使用默认(基础)"); theme.table = "base"; }

    const customColors = {};
    if (raw.customColors && typeof raw.customColors === "object") {
      const pc = sanitizeHexColor(raw.customColors.paperColor);
      const ic = sanitizeHexColor(raw.customColors.inkColor);
      const tc = sanitizeHexColor(raw.customColors.tableColor);
      if (pc) customColors.paperColor = pc;
      if (ic) customColors.inkColor = ic;
      if (tc) customColors.tableColor = tc;
    }

    const puzzle = {
      name: sanitizeString(raw.name, MAX_NAME_LENGTH, "未命名残页"),
      cols,
      rows,
      text,
      theme,
      timeLimit: sanitizeInt(raw.timeLimit, 10, 600, 120),
      hintPenalty: sanitizeInt(raw.hintPenalty, 0, 500, 80),
      scatterRule: VALID_SCATTER_RULES.includes(raw.scatterRule) ? raw.scatterRule : "random",
      enableRotation: sanitizeBool(raw.enableRotation, false),
      enableFlip: sanitizeBool(raw.enableFlip, false),
      initialRotationScrambled: sanitizeBool(raw.initialRotationScrambled, false),
      initialFlipScrambled: sanitizeBool(raw.initialFlipScrambled, false),
      availableTools: Array.isArray(raw.availableTools)
        ? raw.availableTools.filter(t => typeof t === "string" && VALID_TOOLS.includes(t))
        : ["zoom", "edgeAlign"]
    };

    if (Object.keys(customColors).length > 0) {
      puzzle.customColors = customColors;
    }

    if (puzzle.initialRotationScrambled &&
        !puzzle.availableTools.some(t => t === "rotateCw" || t === "rotateCcw")) {
      warnings.push("启用了初始旋转打乱但缺少旋转工具，已自动添加");
      puzzle.availableTools.push("rotateCw", "rotateCcw");
    }
    if (puzzle.initialFlipScrambled && !puzzle.availableTools.includes("flip")) {
      warnings.push("启用了初始翻面打乱但缺少翻面工具，已自动添加");
      puzzle.availableTools.push("flip");
    }

    if (typeof raw.source === "string" && raw.source.trim()) {
      puzzle.source = sanitizeString(raw.source, MAX_NAME_LENGTH, "");
    }
    if (typeof raw.author === "string" && raw.author.trim()) {
      puzzle.author = sanitizeString(raw.author, MAX_NAME_LENGTH, "");
    }
    if (typeof raw.note === "string" && raw.note.trim()) {
      puzzle.note = sanitizeString(raw.note, MAX_NOTE_LENGTH, "");
    }
    if (typeof raw.createdAt === "number" && Number.isFinite(raw.createdAt)) {
      puzzle.createdAt = Math.min(Math.max(raw.createdAt, 0), Date.now());
    } else {
      puzzle.createdAt = Date.now();
    }

    if (puzzle.enableRotation === false) {
      puzzle.initialRotationScrambled = false;
    }
    if (puzzle.enableFlip === false) {
      puzzle.initialFlipScrambled = false;
    }

    return {
      valid: errors.length === 0,
      puzzle,
      errors,
      warnings
    };
  }

  function sanitizeDailyResult(raw) {
    const warnings = [];
    const errors = [];

    const puzzleSan = sanitizePuzzle(raw.puzzle || raw);
    if (!puzzleSan.valid) {
      return { valid: false, result: null, errors: puzzleSan.errors, warnings: puzzleSan.warnings };
    }
    warnings.push(...puzzleSan.warnings);

    const result = {
      puzzle: puzzleSan.puzzle,
      score: sanitizeInt(raw.score, 0, 99999, 0),
      usedTime: sanitizeInt(raw.usedTime, 0, 9999, 0),
      hintUsed: sanitizeBool(raw.hintUsed, false),
      completed: sanitizeBool(raw.completed, false)
    };

    if (typeof raw.rating === "string" && raw.rating.trim()) {
      result.rating = sanitizeString(raw.rating, 30, "");
    }
    if (typeof raw.dailyDate === "string" && raw.dailyDate.trim()) {
      result.dailyDate = sanitizeString(raw.dailyDate, 20, "");
    }

    return { valid: true, result, errors, warnings };
  }

  function encodePuzzle(puzzle, options) {
    const opts = options || {};
    const payload = {
      name: puzzle.name,
      cols: puzzle.cols,
      rows: puzzle.rows,
      text: puzzle.text,
      theme: puzzle.theme,
      timeLimit: puzzle.timeLimit,
      hintPenalty: puzzle.hintPenalty,
      scatterRule: puzzle.scatterRule,
      enableRotation: puzzle.enableRotation,
      enableFlip: puzzle.enableFlip,
      initialRotationScrambled: puzzle.initialRotationScrambled,
      initialFlipScrambled: puzzle.initialFlipScrambled,
      availableTools: puzzle.availableTools,
      createdAt: Date.now()
    };

    if (puzzle.customColors && Object.keys(puzzle.customColors).length > 0) {
      payload.customColors = { ...puzzle.customColors };
    }
    if (opts.author) payload.author = String(opts.author).slice(0, MAX_NAME_LENGTH);
    if (opts.source) payload.source = String(opts.source).slice(0, MAX_NAME_LENGTH);
    if (opts.note) payload.note = String(opts.note).slice(0, MAX_NOTE_LENGTH);

    const abbrev = abbreviateFields(payload);
    const jsonStr = JSON.stringify(abbrev);
    const encoded = base64UrlEncode(jsonStr);
    const checksum = hashToHex(fnv1a32(encoded));
    const code = `${MAGIC_PREFIX}:v${CURRENT_VERSION}:${TYPE_PUZZLE}:${encoded}:${checksum}`;

    if (code.length > MAX_CODE_LENGTH) {
      return { ok: false, error: "分享码过长（超过" + MAX_CODE_LENGTH + "字符），请减少文字内容或自定义颜色" };
    }

    return { ok: true, code, length: code.length };
  }

  function encodeDailyResult(dailyData) {
    const payload = {
      puzzle: {
        name: dailyData.puzzle.name,
        cols: dailyData.puzzle.cols,
        rows: dailyData.puzzle.rows,
        text: dailyData.puzzle.text,
        theme: dailyData.puzzle.theme,
        timeLimit: dailyData.puzzle.timeLimit,
        hintPenalty: dailyData.puzzle.hintPenalty,
        scatterRule: dailyData.puzzle.scatterRule,
        enableRotation: dailyData.puzzle.enableRotation,
        enableFlip: dailyData.puzzle.enableFlip,
        initialRotationScrambled: dailyData.puzzle.initialRotationScrambled,
        initialFlipScrambled: dailyData.puzzle.initialFlipScrambled,
        availableTools: dailyData.puzzle.availableTools
      },
      score: dailyData.score || 0,
      usedTime: dailyData.usedTime || 0,
      hintUsed: dailyData.hintUsed || false,
      completed: dailyData.completed || false,
      rating: dailyData.rating || "",
      dailyDate: dailyData.dailyDate || "",
      createdAt: Date.now()
    };

    if (dailyData.puzzle.customColors && Object.keys(dailyData.puzzle.customColors).length > 0) {
      payload.puzzle.customColors = { ...dailyData.puzzle.customColors };
    }

    const abbrev = abbreviateFields(payload);
    const jsonStr = JSON.stringify(abbrev);
    const encoded = base64UrlEncode(jsonStr);
    const checksum = hashToHex(fnv1a32(encoded));
    const code = `${MAGIC_PREFIX}:v${CURRENT_VERSION}:${TYPE_DAILY}:${encoded}:${checksum}`;

    if (code.length > MAX_CODE_LENGTH) {
      return { ok: false, error: "分享码过长（超过" + MAX_CODE_LENGTH + "字符）" };
    }

    return { ok: true, code, length: code.length };
  }

  function decode(code) {
    if (!code || typeof code !== "string") {
      return { ok: false, error: "分享码为空", stage: "format" };
    }

    const trimmed = code.trim().replace(/\s+/g, "");
    if (trimmed.length === 0) {
      return { ok: false, error: "分享码为空", stage: "format" };
    }
    if (trimmed.length > MAX_CODE_LENGTH) {
      return { ok: false, error: "分享码过长（超过" + MAX_CODE_LENGTH + "字符），可能已损坏", stage: "format" };
    }

    if (!trimmed.startsWith(MAGIC_PREFIX + ":")) {
      return {
        ok: false,
        error: "无效的分享码格式，缺少游戏标识前缀 ZFL27",
        stage: "format",
        hint: "请确认这是来自「古籍修补台」的分享码"
      };
    }

    const parts = trimmed.split(":");
    if (parts.length < 5) {
      return {
        ok: false,
        error: "分享码格式不完整，段数不足",
        stage: "format",
        hint: "分享码可能被截断，请复制完整内容"
      };
    }

    const [magic, versionStr, type, ...rest] = parts;
    const checksum = rest.pop();
    const encoded = rest.join(":");

    if (magic !== MAGIC_PREFIX) {
      return { ok: false, error: "分享码前缀不正确", stage: "format" };
    }

    const versionMatch = /^v(\d+)$/.exec(versionStr);
    if (!versionMatch) {
      return { ok: false, error: "无法识别的版本格式: " + versionStr, stage: "version" };
    }
    const version = parseInt(versionMatch[1], 10);
    if (version < MIN_COMPATIBLE_VERSION) {
      return {
        ok: false,
        error: "分享码版本过旧（v" + version + "），当前最低支持 v" + MIN_COMPATIBLE_VERSION,
        stage: "version",
        hint: "请让分享者使用新版本游戏重新生成分享码"
      };
    }
    if (version > CURRENT_VERSION) {
      return {
        ok: false,
        error: "分享码版本过新（v" + version + "），当前最高支持 v" + CURRENT_VERSION,
        stage: "version",
        hint: "请更新游戏到最新版本后再导入"
      };
    }

    if (type !== TYPE_PUZZLE && type !== TYPE_DAILY) {
      return { ok: false, error: "未知的分享码类型: " + type, stage: "format" };
    }

    const expectedChecksum = hashToHex(fnv1a32(encoded));
    if (expectedChecksum.toLowerCase() !== checksum.toLowerCase()) {
      return {
        ok: false,
        error: "校验和不匹配，分享码可能已损坏或被篡改",
        stage: "checksum",
        hint: "请重新复制分享码，确保内容完整无误"
      };
    }

    const decodedStr = base64UrlDecode(encoded);
    if (!decodedStr) {
      return {
        ok: false,
        error: "Base64解码失败，分享码内容已损坏",
        stage: "decode"
      };
    }

    let rawData;
    try {
      rawData = JSON.parse(decodedStr);
    } catch (e) {
      return {
        ok: false,
        error: "JSON解析失败: " + e.message,
        stage: "parse",
        hint: "分享码内容可能已损坏"
      };
    }

    if (!rawData || typeof rawData !== "object") {
      return { ok: false, error: "解码后的数据不是有效对象", stage: "parse" };
    }

    const expanded = expandFields(rawData);

    if (type === TYPE_PUZZLE) {
      const san = sanitizePuzzle(expanded);
      return {
        ok: san.valid,
        type: "puzzle",
        data: san.puzzle,
        errors: san.errors,
        warnings: san.warnings,
        version,
        wasTruncated: san.warnings.some(w => w.includes("截断") || w.includes("过长"))
      };
    } else {
      const san = sanitizeDailyResult(expanded);
      return {
        ok: san.valid,
        type: "daily",
        data: san.result,
        errors: san.errors,
        warnings: san.warnings,
        version,
        wasTruncated: san.warnings.some(w => w.includes("截断") || w.includes("过长"))
      };
    }
  }

  function quickValidate(code) {
    if (!code || typeof code !== "string") return false;
    const trimmed = code.trim().replace(/\s+/g, "");
    if (!trimmed.startsWith(MAGIC_PREFIX + ":")) return false;
    if (trimmed.length > MAX_CODE_LENGTH) return false;
    const parts = trimmed.split(":");
    return parts.length >= 5;
  }

  function isShareCode(text) {
    return quickValidate(text);
  }

  return {
    MAGIC_PREFIX,
    CURRENT_VERSION,
    MIN_COMPATIBLE_VERSION,
    TYPE_PUZZLE,
    TYPE_DAILY,
    MAX_CODE_LENGTH,
    encodePuzzle,
    encodeDailyResult,
    decode,
    quickValidate,
    isShareCode,
    sanitizePuzzle,
    sanitizeDailyResult
  };
})();

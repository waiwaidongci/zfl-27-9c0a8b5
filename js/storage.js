const AppStorage = (() => {
  const UNIFIED_KEY = "zfl27_unified_data";
  const SCHEMA_VERSION = 1;
  const BACKUP_KEY_PREFIX = "zfl27_backup_";
  const MAX_BACKUPS = 5;
  const OLD_KEYS = {
    CUSTOM_PUZZLES: "zfl27CustomPuzzles",
    CUSTOM_THEMES: "zfl27CustomThemes",
    LIBRARY: "zfl27Library",
    LIBRARY_NOTES: "zfl27LibraryNotes",
    PROGRESS: "zfl27Progress",
    DAILY_RECORDS: "zfl27DailyRecords",
    DAILY_SESSION: "zfl27DailySession",
    LEVEL_SAVE_PREFIX: "zfl27LevelSave_",
    TEMP_SAVE: "zfl27TempSave",
    TEMP_SAVE_PREFIX: "zfl27TempSave_",
    TUTORIAL: "zfl27TutorialCompleted",
    GEN_HISTORY: "zfl27GenHistory",
    GEN_FAVORITES: "zfl27GenFavorites"
  };

  function createEmptyData() {
    return {
      schemaVersion: SCHEMA_VERSION,
      migratedAt: null,
      customPuzzles: [],
      customThemes: [],
      library: [],
      libraryNotes: {},
      progress: [],
      daily: {
        records: [],
        session: null
      },
      levelSaves: {},
      tempSaves: {},
      ui: {
        tutorialCompleted: false
      },
      generator: {
        history: [],
        favorites: []
      }
    };
  }

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function safeParse(raw, fallback) {
    try {
      if (raw == null) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function validateDataStructure(data) {
    if (!data || typeof data !== "object") return false;
    if (typeof data.schemaVersion !== "number") return false;
    if (!Array.isArray(data.customPuzzles)) return false;
    if (!Array.isArray(data.customThemes)) return false;
    if (!Array.isArray(data.library)) return false;
    if (!data.libraryNotes || typeof data.libraryNotes !== "object") return false;
    if (!Array.isArray(data.progress)) return false;
    if (!data.daily || typeof data.daily !== "object") return false;
    if (!Array.isArray(data.daily.records)) return false;
    if (!data.levelSaves || typeof data.levelSaves !== "object") return false;
    if (!data.tempSaves || typeof data.tempSaves !== "object") return false;
    if (!data.ui || typeof data.ui !== "object") return false;
    if (!data.generator || typeof data.generator !== "object") return false;
    return true;
  }

  function readOldCustomPuzzles() {
    return safeParse(localStorage.getItem(OLD_KEYS.CUSTOM_PUZZLES), []);
  }
  function readOldCustomThemes() {
    return safeParse(localStorage.getItem(OLD_KEYS.CUSTOM_THEMES), []);
  }
  function readOldLibrary() {
    return safeParse(localStorage.getItem(OLD_KEYS.LIBRARY), []);
  }
  function readOldLibraryNotes() {
    return safeParse(localStorage.getItem(OLD_KEYS.LIBRARY_NOTES), {});
  }
  function readOldProgress() {
    return safeParse(localStorage.getItem(OLD_KEYS.PROGRESS), null);
  }
  function readOldDailyRecords() {
    return safeParse(localStorage.getItem(OLD_KEYS.DAILY_RECORDS), []);
  }
  function readOldDailySession() {
    return safeParse(localStorage.getItem(OLD_KEYS.DAILY_SESSION), null);
  }
  function readOldTutorial() {
    return localStorage.getItem(OLD_KEYS.TUTORIAL) === "true";
  }
  function readOldGenHistory() {
    return safeParse(localStorage.getItem(OLD_KEYS.GEN_HISTORY), []);
  }
  function readOldGenFavorites() {
    return safeParse(localStorage.getItem(OLD_KEYS.GEN_FAVORITES), []);
  }
  function readOldLevelSaves() {
    const saves = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(OLD_KEYS.LEVEL_SAVE_PREFIX)) {
        const puzzleId = key.slice(OLD_KEYS.LEVEL_SAVE_PREFIX.length);
        const data = safeParse(localStorage.getItem(key), null);
        if (data) saves[puzzleId] = data;
      }
    }
    return saves;
  }
  function readOldTempSaves() {
    const saves = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(OLD_KEYS.TEMP_SAVE_PREFIX) && key !== OLD_KEYS.TEMP_SAVE) {
        const sig = key.slice(OLD_KEYS.TEMP_SAVE_PREFIX.length);
        const data = safeParse(localStorage.getItem(key), null);
        if (data) saves[sig] = data;
      }
    }
    const plainTemp = safeParse(localStorage.getItem(OLD_KEYS.TEMP_SAVE), null);
    if (plainTemp) saves["default"] = plainTemp;
    return saves;
  }

  function hasAnyOldData() {
    for (const key of Object.values(OLD_KEYS)) {
      if (key.endsWith("_")) {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(key)) return true;
        }
      } else if (localStorage.getItem(key) !== null) {
        return true;
      }
    }
    return false;
  }

  function createBackup(data) {
    const timestamp = Date.now();
    const backupKey = BACKUP_KEY_PREFIX + timestamp;
    const backup = {
      timestamp,
      schemaVersion: data ? data.schemaVersion : SCHEMA_VERSION,
      data: data ? deepClone(data) : null
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
    while (keys.length > MAX_BACKUPS) {
      const oldest = keys.shift();
      localStorage.removeItem(oldest);
    }
  }

  function listBackups() {
    const backups = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(BACKUP_KEY_PREFIX)) {
        try {
          const raw = localStorage.getItem(key);
          const backup = JSON.parse(raw);
          backups.push({
            key,
            timestamp: backup.timestamp,
            schemaVersion: backup.schemaVersion,
            dateStr: new Date(backup.timestamp).toLocaleString("zh-CN")
          });
        } catch (e) {}
      }
    }
    backups.sort((a, b) => b.timestamp - a.timestamp);
    return backups;
  }

  function restoreBackup(backupKey) {
    try {
      const raw = localStorage.getItem(backupKey);
      if (!raw) return false;
      const backup = JSON.parse(raw);
      if (!backup.data) return false;
      if (!validateDataStructure(backup.data)) return false;
      const current = loadRaw();
      if (current) {
        createBackup(current);
      }
      saveRaw(backup.data);
      return true;
    } catch (e) {
      return false;
    }
  }

  function deleteBackup(backupKey) {
    localStorage.removeItem(backupKey);
  }

  function loadRaw() {
    try {
      const raw = localStorage.getItem(UNIFIED_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function saveRaw(data) {
    localStorage.setItem(UNIFIED_KEY, JSON.stringify(data));
  }

  function readTutorialFromOldIfPresent(data) {
    if (!data.ui.tutorialCompleted) {
      data.ui.tutorialCompleted = readOldTutorial();
    }
  }

  function migrateFromScratch() {
    const data = createEmptyData();
    data.customPuzzles = readOldCustomPuzzles();
    data.customThemes = readOldCustomThemes();
    data.library = readOldLibrary();
    data.libraryNotes = readOldLibraryNotes();

    const oldProgress = readOldProgress();
    if (oldProgress && Array.isArray(oldProgress)) {
      data.progress = oldProgress;
    }

    data.daily.records = readOldDailyRecords();
    data.daily.session = readOldDailySession();
    data.levelSaves = readOldLevelSaves();
    data.tempSaves = readOldTempSaves();
    data.ui.tutorialCompleted = readOldTutorial();
    data.generator.history = readOldGenHistory();
    data.generator.favorites = readOldGenFavorites();
    data.migratedAt = Date.now();
    data.schemaVersion = SCHEMA_VERSION;
    return data;
  }

  function migrateV0ToV1(data) {
    return migrateFromScratch();
  }

  const migrators = [
    migrateV0ToV1
  ];

  function migrate() {
    let data = loadRaw();
    const preMigrationBackupKey = data ? createBackup(data) : null;

    if (!data) {
      if (hasAnyOldData()) {
        data = migrateFromScratch();
        data.schemaVersion = SCHEMA_VERSION;
        saveRaw(data);
        return {
          success: true,
          migrated: true,
          fromVersion: 0,
          toVersion: SCHEMA_VERSION,
          backupKey: preMigrationBackupKey,
          message: "已从旧版分散数据迁移到统一存储 v" + SCHEMA_VERSION
        };
      } else {
        data = createEmptyData();
        saveRaw(data);
        return {
          success: true,
          migrated: false,
          fromVersion: null,
          toVersion: SCHEMA_VERSION,
          backupKey: null,
          message: "初始化全新统一存储 v" + SCHEMA_VERSION
        };
      }
    }

    if (!validateDataStructure(data)) {
      const repairResult = repairData();
      return {
        success: repairResult.success,
        migrated: false,
        fromVersion: data ? data.schemaVersion : null,
        toVersion: SCHEMA_VERSION,
        backupKey: preMigrationBackupKey,
        repairBackupKey: repairResult.backupKey,
        corrupted: true,
        repaired: repairResult.success,
        message: repairResult.success
          ? "检测到数据损坏，已自动修复。请检查数据完整性。"
          : "检测到数据损坏，自动修复失败。请尝试从备份恢复或重置数据。"
      };
    }

    if (data.schemaVersion === SCHEMA_VERSION) {
      return {
        success: true,
        migrated: false,
        fromVersion: SCHEMA_VERSION,
        toVersion: SCHEMA_VERSION,
        backupKey: null,
        message: "数据已是最新版本 v" + SCHEMA_VERSION
      };
    }

    if (data.schemaVersion > SCHEMA_VERSION) {
      return {
        success: false,
        migrated: false,
        fromVersion: data.schemaVersion,
        toVersion: SCHEMA_VERSION,
        backupKey: preMigrationBackupKey,
        newerSchema: true,
        message: "数据版本 v" + data.schemaVersion + " 高于当前支持版本 v" + SCHEMA_VERSION + "，请升级应用"
      };
    }

    let currentData = deepClone(data);
    const startVersion = currentData.schemaVersion;

    for (let v = startVersion; v < SCHEMA_VERSION; v++) {
      const migrator = migrators[v];
      if (migrator) {
        currentData = migrator(currentData);
      } else {
        currentData.schemaVersion = v + 1;
      }
    }

    currentData.schemaVersion = SCHEMA_VERSION;
    currentData.migratedAt = Date.now();

    saveRaw(currentData);

    return {
      success: true,
      migrated: true,
      fromVersion: startVersion,
      toVersion: SCHEMA_VERSION,
      backupKey: preMigrationBackupKey,
      message: "数据已从 v" + startVersion + " 升级到 v" + SCHEMA_VERSION
    };
  }

  let cachedData = null;
  let cacheDirty = true;

  function getData() {
    if (!cacheDirty && cachedData) return cachedData;
    let data = loadRaw();
    if (!data || !validateDataStructure(data)) {
      data = createEmptyData();
      saveRaw(data);
    }
    cachedData = data;
    cacheDirty = false;
    return cachedData;
  }

  function setData(mutator) {
    const data = getData();
    const backupKey = createBackup(data);
    const result = mutator(data);
    saveRaw(data);
    cacheDirty = true;
    return { backupKey, result };
  }

  function getDataCopy() {
    return deepClone(getData());
  }

  function repairData() {
    const data = loadRaw();
    const backupKey = data ? createBackup(data) : null;

    const fresh = createEmptyData();

    if (data && typeof data === "object") {
      if (Array.isArray(data.customPuzzles)) fresh.customPuzzles = data.customPuzzles;
      if (Array.isArray(data.customThemes)) fresh.customThemes = data.customThemes;
      if (Array.isArray(data.library)) fresh.library = data.library;
      if (data.libraryNotes && typeof data.libraryNotes === "object") fresh.libraryNotes = data.libraryNotes;
      if (Array.isArray(data.progress)) fresh.progress = data.progress;
      if (data.daily && typeof data.daily === "object") {
        if (Array.isArray(data.daily.records)) fresh.daily.records = data.daily.records;
        if (data.daily.session !== undefined) fresh.daily.session = data.daily.session;
      }
      if (data.levelSaves && typeof data.levelSaves === "object") fresh.levelSaves = data.levelSaves;
      if (data.tempSaves && typeof data.tempSaves === "object") fresh.tempSaves = data.tempSaves;
      if (data.ui && typeof data.ui === "object") {
        if (typeof data.ui.tutorialCompleted === "boolean") fresh.ui.tutorialCompleted = data.ui.tutorialCompleted;
      }
      if (data.generator && typeof data.generator === "object") {
        if (Array.isArray(data.generator.history)) fresh.generator.history = data.generator.history;
        if (Array.isArray(data.generator.favorites)) fresh.generator.favorites = data.generator.favorites;
      }
    }

    if (hasAnyOldData()) {
      const repaired = migrateFromScratch();
      if (fresh.customPuzzles.length === 0 && repaired.customPuzzles.length > 0) fresh.customPuzzles = repaired.customPuzzles;
      if (fresh.customThemes.length === 0 && repaired.customThemes.length > 0) fresh.customThemes = repaired.customThemes;
      if (fresh.library.length === 0 && repaired.library.length > 0) fresh.library = repaired.library;
      if (Object.keys(fresh.libraryNotes).length === 0 && Object.keys(repaired.libraryNotes).length > 0) fresh.libraryNotes = repaired.libraryNotes;
      if (fresh.progress.length === 0 && repaired.progress.length > 0) fresh.progress = repaired.progress;
      if (fresh.daily.records.length === 0 && repaired.daily.records.length > 0) fresh.daily.records = repaired.daily.records;
      if (!fresh.daily.session && repaired.daily.session) fresh.daily.session = repaired.daily.session;
      if (Object.keys(fresh.levelSaves).length === 0 && Object.keys(repaired.levelSaves).length > 0) fresh.levelSaves = repaired.levelSaves;
      if (Object.keys(fresh.tempSaves).length === 0 && Object.keys(repaired.tempSaves).length > 0) fresh.tempSaves = repaired.tempSaves;
      if (!fresh.ui.tutorialCompleted && repaired.ui.tutorialCompleted) fresh.ui.tutorialCompleted = true;
      if (fresh.generator.history.length === 0 && repaired.generator.history.length > 0) fresh.generator.history = repaired.generator.history;
      if (fresh.generator.favorites.length === 0 && repaired.generator.favorites.length > 0) fresh.generator.favorites = repaired.generator.favorites;
    }

    fresh.migratedAt = Date.now();
    fresh.schemaVersion = SCHEMA_VERSION;
    saveRaw(fresh);
    cacheDirty = true;

    return {
      success: true,
      backupKey,
      message: "数据修复完成，已尽可能恢复可读取的部分"
    };
  }

  function resetAllData() {
    const data = loadRaw();
    const backupKey = data ? createBackup(data) : null;
    const fresh = createEmptyData();
    fresh.migratedAt = Date.now();
    saveRaw(fresh);
    cacheDirty = true;
    return { backupKey };
  }

  function exportAllData() {
    return deepClone(getData());
  }

  function importAllData(importedData, options) {
    const opts = options || {};
    const overwrite = opts.overwrite !== false;

    if (!importedData || typeof importedData !== "object") {
      return { success: false, message: "导入数据格式无效" };
    }

    const current = getDataCopy();
    const backupKey = createBackup(current);

    if (!validateDataStructure(importedData)) {
      return { success: false, message: "导入数据结构校验失败", backupKey };
    }

    let merged;
    if (overwrite) {
      merged = deepClone(importedData);
    } else {
      merged = deepClone(current);
      merged.customPuzzles = [...merged.customPuzzles, ...(importedData.customPuzzles || [])];
      merged.customThemes = [...merged.customThemes, ...(importedData.customThemes || [])];
      merged.library = [...merged.library, ...(importedData.library || [])];
      merged.libraryNotes = { ...merged.libraryNotes, ...(importedData.libraryNotes || {}) };
      if ((importedData.progress || []).length > merged.progress.length) {
        merged.progress = importedData.progress;
      }
      merged.daily.records = [...merged.daily.records, ...(importedData.daily?.records || [])];
      if (importedData.daily?.session) merged.daily.session = importedData.daily.session;
      merged.levelSaves = { ...merged.levelSaves, ...(importedData.levelSaves || {}) };
      merged.tempSaves = { ...merged.tempSaves, ...(importedData.tempSaves || {}) };
      if (importedData.ui?.tutorialCompleted) merged.ui.tutorialCompleted = true;
      merged.generator.history = [...merged.generator.history, ...(importedData.generator?.history || [])];
      merged.generator.favorites = [...merged.generator.favorites, ...(importedData.generator?.favorites || [])];
    }

    merged.schemaVersion = SCHEMA_VERSION;
    merged.migratedAt = Date.now();
    saveRaw(merged);
    cacheDirty = true;

    return {
      success: true,
      backupKey,
      message: overwrite ? "数据已覆盖导入" : "数据已合并导入"
    };
  }

  function getCustomPuzzles() {
    return deepClone(getData().customPuzzles);
  }
  function setCustomPuzzles(puzzles) {
    return setData(d => { d.customPuzzles = deepClone(puzzles); });
  }
  function addCustomPuzzle(puzzle) {
    const result = setData(d => {
      const copy = deepClone(puzzle);
      copy.id = "custom-" + Date.now();
      copy.custom = true;
      d.customPuzzles.push(copy);
      return copy;
    });
    return result.result;
  }
  function updateCustomPuzzle(id, puzzle) {
    const result = setData(d => {
      const idx = d.customPuzzles.findIndex(p => p.id === id);
      if (idx >= 0) {
        const copy = deepClone(puzzle);
        copy.id = id;
        copy.custom = true;
        d.customPuzzles[idx] = copy;
        return true;
      }
      return false;
    });
    return result.result;
  }
  function deleteCustomPuzzle(id) {
    return setData(d => {
      d.customPuzzles = d.customPuzzles.filter(p => p.id !== id);
    });
  }

  function getCustomThemes() {
    return deepClone(getData().customThemes);
  }
  function setCustomThemes(themes) {
    return setData(d => { d.customThemes = deepClone(themes); });
  }
  function addCustomTheme(theme) {
    const result = setData(d => {
      const copy = deepClone(theme);
      copy.id = "custom-theme-" + Date.now();
      copy.custom = true;
      d.customThemes.push(copy);
      return copy;
    });
    return result.result;
  }
  function updateCustomTheme(id, theme) {
    const result = setData(d => {
      const idx = d.customThemes.findIndex(t => t.id === id);
      if (idx >= 0) {
        const copy = deepClone(theme);
        copy.id = id;
        copy.custom = true;
        d.customThemes[idx] = copy;
        return true;
      }
      return false;
    });
    return result.result;
  }
  function deleteCustomTheme(id) {
    return setData(d => {
      d.customThemes = d.customThemes.filter(t => t.id !== id);
    });
  }
  function getCustomThemeById(id) {
    return getData().customThemes.find(t => t.id === id) || null;
  }

  function getLibrary() {
    return deepClone(getData().library);
  }
  function setLibrary(records) {
    return setData(d => { d.library = deepClone(records); });
  }
  function addOrUpdateLibraryEntry(puzzleId, entry) {
    const result = setData(d => {
      const existingIdx = d.library.findIndex(r => r.puzzleId === puzzleId);
      if (existingIdx >= 0) {
        const existing = d.library[existingIdx];
        const merged = {
          ...existing,
          ...entry,
          bestScore: Math.max(existing.bestScore || 0, entry.bestScore || 0),
          bestTime: existing.bestTime !== null && entry.bestTime !== null
            ? Math.min(existing.bestTime, entry.bestTime)
            : (entry.bestTime !== null ? entry.bestTime : existing.bestTime),
          hintUsed: existing.hintUsed || entry.hintUsed,
          completionDate: entry.completionDate || existing.completionDate,
          rating: entry.rating || existing.rating,
          colophon: entry.colophon || existing.colophon,
          text: entry.text || existing.text,
          theme: entry.theme || existing.theme,
          name: entry.name || existing.name,
          cols: entry.cols || existing.cols,
          rows: entry.rows || existing.rows,
          puzzleId: puzzleId
        };
        if (entry.customColors) {
          merged.customColors = { ...entry.customColors };
        }
        d.library[existingIdx] = merged;
      } else {
        const newEntry = deepClone({ puzzleId, ...entry });
        if (entry.customColors) {
          newEntry.customColors = { ...entry.customColors };
        }
        d.library.push(newEntry);
      }
      return d.library;
    });
    return deepClone(result.result);
  }
  function deleteLibraryEntry(puzzleId) {
    return setData(d => {
      d.library = d.library.filter(r => r.puzzleId !== puzzleId);
    });
  }

  function getLibraryNotes() {
    return deepClone(getData().libraryNotes);
  }
  function getLibraryNote(puzzleId) {
    return getData().libraryNotes[puzzleId] || "";
  }
  function setLibraryNote(puzzleId, text) {
    return setData(d => {
      if (text && text.trim()) {
        d.libraryNotes[puzzleId] = text.trim();
      } else {
        delete d.libraryNotes[puzzleId];
      }
    });
  }
  function deleteLibraryNote(puzzleId) {
    return setData(d => {
      delete d.libraryNotes[puzzleId];
    });
  }

  function getProgress() {
    return deepClone(getData().progress);
  }
  function setProgress(progress) {
    return setData(d => { d.progress = deepClone(progress); });
  }
  function getProgressAt(index) {
    const data = getData();
    return data.progress[index] ? deepClone(data.progress[index]) : null;
  }
  function updateProgress(index, updates) {
    return setData(d => {
      if (!d.progress[index]) {
        d.progress[index] = {
          completed: false,
          bestScore: 0,
          bestTime: null,
          hintUsed: false,
          unlocked: false,
          colophon: ""
        };
      }
      d.progress[index] = { ...d.progress[index], ...updates };
    });
  }

  function getDailyRecords() {
    return deepClone(getData().daily.records);
  }
  function setDailyRecords(records) {
    return setData(d => { d.daily.records = deepClone(records); });
  }
  function addOrUpdateDailyRecord(record) {
    const result = setData(d => {
      const existingIdx = d.daily.records.findIndex(r => r.date === record.date);
      if (existingIdx >= 0) {
        const existing = d.daily.records[existingIdx];
        if (!existing.completed && record.completed) {
          d.daily.records[existingIdx] = { ...existing, ...record };
        } else if (record.completed && record.score > existing.score) {
          d.daily.records[existingIdx] = { ...existing, ...record };
        } else if (!existing.completed) {
          d.daily.records[existingIdx] = { ...existing, ...record };
        }
      } else {
        d.daily.records.push(deepClone(record));
      }
      d.daily.records.sort((a, b) => b.date.localeCompare(a.date));
      d.daily.records = d.daily.records.slice(0, 7);
      return d.daily.records;
    });
    return deepClone(result.result);
  }
  function getDailySession() {
    return getData().daily.session ? deepClone(getData().daily.session) : null;
  }
  function setDailySession(session) {
    return setData(d => { d.daily.session = session ? deepClone(session) : null; });
  }
  function clearDailySession() {
    return setData(d => { d.daily.session = null; });
  }

  function getLevelSave(puzzleId) {
    const data = getData();
    return data.levelSaves[puzzleId] ? deepClone(data.levelSaves[puzzleId]) : null;
  }
  function setLevelSave(puzzleId, state) {
    return setData(d => {
      if (state) {
        d.levelSaves[puzzleId] = deepClone(state);
      } else {
        delete d.levelSaves[puzzleId];
      }
    });
  }
  function deleteLevelSave(puzzleId) {
    return setData(d => {
      delete d.levelSaves[puzzleId];
    });
  }
  function getAllLevelSaves() {
    return deepClone(getData().levelSaves);
  }

  function getTempSave(signature) {
    const data = getData();
    const key = signature || "default";
    return data.tempSaves[key] ? deepClone(data.tempSaves[key]) : null;
  }
  function setTempSave(signature, state) {
    return setData(d => {
      const key = signature || "default";
      if (state) {
        d.tempSaves[key] = deepClone(state);
      } else {
        delete d.tempSaves[key];
      }
    });
  }
  function deleteTempSave(signature) {
    return setData(d => {
      const key = signature || "default";
      delete d.tempSaves[key];
    });
  }
  function clearAllTempSaves() {
    return setData(d => {
      d.tempSaves = {};
    });
  }

  function isTutorialCompleted() {
    return getData().ui.tutorialCompleted === true;
  }
  function setTutorialCompleted(val) {
    return setData(d => {
      d.ui.tutorialCompleted = val === true;
    });
  }

  function getGenHistory() {
    return deepClone(getData().generator.history);
  }
  function setGenHistory(history) {
    return setData(d => {
      d.generator.history = deepClone(history).slice(0, 20);
    });
  }
  function getGenFavorites() {
    return deepClone(getData().generator.favorites);
  }
  function setGenFavorites(favorites) {
    return setData(d => {
      d.generator.favorites = deepClone(favorites).slice(0, 50);
    });
  }

  function getStats() {
    const data = getData();
    return {
      schemaVersion: data.schemaVersion,
      migratedAt: data.migratedAt,
      customPuzzlesCount: data.customPuzzles.length,
      customThemesCount: data.customThemes.length,
      libraryCount: data.library.length,
      libraryNotesCount: Object.keys(data.libraryNotes).length,
      progressCount: data.progress.length,
      dailyRecordsCount: data.daily.records.length,
      hasDailySession: !!data.daily.session,
      levelSavesCount: Object.keys(data.levelSaves).length,
      tempSavesCount: Object.keys(data.tempSaves).length,
      tutorialCompleted: data.ui.tutorialCompleted,
      genHistoryCount: data.generator.history.length,
      genFavoritesCount: data.generator.favorites.length,
      backups: listBackups().length
    };
  }

  return {
    SCHEMA_VERSION,
    UNIFIED_KEY,
    migrate,
    validateDataStructure,
    createBackup,
    listBackups,
    restoreBackup,
    deleteBackup,
    repairData,
    resetAllData,
    exportAllData,
    importAllData,
    getDataCopy,
    getStats,

    getCustomPuzzles,
    setCustomPuzzles,
    addCustomPuzzle,
    updateCustomPuzzle,
    deleteCustomPuzzle,

    getCustomThemes,
    setCustomThemes,
    addCustomTheme,
    updateCustomTheme,
    deleteCustomTheme,
    getCustomThemeById,

    getLibrary,
    setLibrary,
    addOrUpdateLibraryEntry,
    deleteLibraryEntry,

    getLibraryNotes,
    getLibraryNote,
    setLibraryNote,
    deleteLibraryNote,

    getProgress,
    setProgress,
    getProgressAt,
    updateProgress,

    getDailyRecords,
    setDailyRecords,
    addOrUpdateDailyRecord,
    getDailySession,
    setDailySession,
    clearDailySession,

    getLevelSave,
    setLevelSave,
    deleteLevelSave,
    getAllLevelSaves,

    getTempSave,
    setTempSave,
    deleteTempSave,
    clearAllTempSaves,

    isTutorialCompleted,
    setTutorialCompleted,

    getGenHistory,
    setGenHistory,
    getGenFavorites,
    setGenFavorites
  };
})();

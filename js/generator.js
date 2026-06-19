const AppGenerator = (() => {
  function createRNG(seed) {
    const normalizedSeed = hashSeed(seed);
    let s = normalizedSeed >>> 0;

    function next() {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    }

    function nextInt(min, max) {
      return Math.floor(next() * (max - min + 1)) + min;
    }

    function nextBoolean(probability = 0.5) {
      return next() < probability;
    }

    function pick(arr) {
      return arr[Math.floor(next() * arr.length)];
    }

    function shuffle(arr) {
      const result = [...arr];
      for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
      }
      return result;
    }

    function getState() {
      return s;
    }

    function setState(newState) {
      s = newState >>> 0;
    }

    return { next, nextInt, nextBoolean, pick, shuffle, getState, setState, seed: normalizedSeed };
  }

  function hashSeed(seed) {
    if (typeof seed === "number") return seed;
    if (typeof seed === "string") {
      let hash = 0;
      for (let i = 0; i < seed.length; i++) {
        const char = seed.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return Math.abs(hash) || 1;
    }
    if (seed instanceof Date) {
      return seed.getTime();
    }
    return Date.now();
  }

  function generateRandomSeed() {
    return Math.floor(Math.random() * 1000000) + "-" + Date.now().toString(36);
  }

  const damageRules = {
    none: {
      name: "完好",
      apply: (pieces, rng) => {
        const types = ["torn", "frayed", "chipped", "scalloped", "irregular"];
        return pieces.map(p => {
          rng.nextBoolean(0.5);
          rng.pick(types);
          return { ...p, damage: "none" };
        });
      }
    },
    torn: {
      name: "撕裂",
      apply: (pieces, rng) => {
        const types = ["torn", "frayed", "chipped", "scalloped", "irregular"];
        return pieces.map(p => {
          const b = rng.nextBoolean(0.3);
          rng.pick(types);
          return { ...p, damage: b ? "torn" : "none" };
        });
      }
    },
    frayed: {
      name: "磨损",
      apply: (pieces, rng) => {
        const types = ["torn", "frayed", "chipped", "scalloped", "irregular"];
        return pieces.map(p => {
          const b = rng.nextBoolean(0.4);
          rng.pick(types);
          return { ...p, damage: b ? "frayed" : "none" };
        });
      }
    },
    chipped: {
      name: "缺口",
      apply: (pieces, rng) => {
        const types = ["torn", "frayed", "chipped", "scalloped", "irregular"];
        return pieces.map(p => {
          const b = rng.nextBoolean(0.25);
          rng.pick(types);
          return { ...p, damage: b ? "chipped" : "none" };
        });
      }
    },
    scalloped: {
      name: "扇贝",
      apply: (pieces, rng) => {
        const types = ["torn", "frayed", "chipped", "scalloped", "irregular"];
        return pieces.map(p => {
          const b = rng.nextBoolean(0.35);
          rng.pick(types);
          return { ...p, damage: b ? "scalloped" : "none" };
        });
      }
    },
    irregular: {
      name: "不规则",
      apply: (pieces, rng) => {
        const types = ["torn", "frayed", "chipped", "scalloped", "irregular"];
        return pieces.map(p => {
          const b = rng.nextBoolean(0.45);
          rng.pick(types);
          return { ...p, damage: b ? "irregular" : "none" };
        });
      }
    },
    mixed: {
      name: "混合破损",
      apply: (pieces, rng) => {
        const types = ["torn", "frayed", "chipped", "scalloped", "irregular"];
        return pieces.map(p => {
          const b = rng.nextBoolean(0.5);
          const t = rng.pick(types);
          return { ...p, damage: b ? t : "none" };
        });
      }
    }
  };

  const difficultyPresets = {
    1: {
      name: "入门",
      minPieces: 4,
      maxPieces: 6,
      similarity: 0,
      rotationEnabled: false,
      flipEnabled: false,
      scrambleRotation: false,
      scrambleFlip: false,
      timeMultiplier: 1.5,
      hintPenalty: 50
    },
    2: {
      name: "简单",
      minPieces: 6,
      maxPieces: 9,
      similarity: 0.1,
      rotationEnabled: false,
      flipEnabled: false,
      scrambleRotation: false,
      scrambleFlip: false,
      timeMultiplier: 1.3,
      hintPenalty: 60
    },
    3: {
      name: "普通",
      minPieces: 8,
      maxPieces: 10,
      similarity: 0.2,
      rotationEnabled: true,
      flipEnabled: false,
      scrambleRotation: true,
      scrambleFlip: false,
      timeMultiplier: 1.0,
      hintPenalty: 80
    },
    4: {
      name: "困难",
      minPieces: 10,
      maxPieces: 15,
      similarity: 0.35,
      rotationEnabled: true,
      flipEnabled: true,
      scrambleRotation: true,
      scrambleFlip: true,
      timeMultiplier: 0.9,
      hintPenalty: 100
    },
    5: {
      name: "噩梦",
      minPieces: 12,
      maxPieces: 20,
      similarity: 0.5,
      rotationEnabled: true,
      flipEnabled: true,
      scrambleRotation: true,
      scrambleFlip: true,
      timeMultiplier: 0.75,
      hintPenalty: 120
    }
  };

  function generatePuzzle(options = {}) {
    const seed = options.seed || generateRandomSeed();
    const rng = createRNG(seed);

    const difficulty = options.difficulty || 3;
    const diffConfig = difficultyPresets[difficulty] || difficultyPresets[3];

    const randomTheme = AppThesaurus.getRandomTheme(rng);
    const themeId = options.theme || randomTheme;

    const randomSize = AppLevelAdapter.getOptimalSize(difficulty, rng);
    const size = options.cols && options.rows
      ? { cols: options.cols, rows: options.rows }
      : randomSize;
    const cols = size.cols;
    const rows = size.rows;
    const pieceCount = cols * rows;

    const wordCount = Math.max(diffConfig.minPieces, Math.min(diffConfig.maxPieces, pieceCount));

    const similarity = options.similarity ?? diffConfig.similarity;
    const words = AppThesaurus.getRandomWords(
      themeId,
      wordCount,
      rng,
      similarity
    );

    const text = words.slice(0, pieceCount);

    const themeBank = AppThesaurus.getWordBank(themeId);
    const themeName = themeBank ? themeBank.name : "古籍";

    const randomPuzzleTheme = selectRandomTheme(rng);
    const puzzleTheme = options.puzzleTheme || randomPuzzleTheme;

    const baseTime = pieceCount * 15 + 30;
    const timeLimit = options.timeLimit || Math.round(baseTime * diffConfig.timeMultiplier);

    const damageRule = options.damageRule || "none";
    const damageConfig = damageRules[damageRule] || damageRules.none;

    const rawPieces = text.map((label, i) => ({
      id: i,
      label,
      col: i % cols,
      row: Math.floor(i / cols)
    }));

    const piecesWithDamage = damageConfig.apply(rawPieces, rng);

    const randomScatterRule = rng.nextBoolean(0.7) ? "random" : "ordered";
    const scatterRule = options.scatterRule || randomScatterRule;

    const enableRotation = options.enableRotation ?? diffConfig.rotationEnabled;
    const enableFlip = options.enableFlip ?? diffConfig.flipEnabled;
    const initialRotationScrambled = options.initialRotationScrambled ?? diffConfig.scrambleRotation;
    const initialFlipScrambled = options.initialFlipScrambled ?? diffConfig.scrambleFlip;

    const hintPenalty = options.hintPenalty ?? diffConfig.hintPenalty;

    const availableTools = ["zoom", "edgeAlign"];
    if (enableRotation) {
      availableTools.push("rotateCw", "rotateCcw");
    }
    if (enableFlip) {
      availableTools.push("flip");
    }

    const pieceIds = rawPieces.map(p => p.id);
    const initialPieceOrder = rng.shuffle(pieceIds);

    const ROTATION_OPTIONS = [0, 90, 180, 270];
    const initialRotations = rawPieces.map(() => {
      if (initialRotationScrambled) {
        return rng.pick(ROTATION_OPTIONS);
      }
      return 0;
    });

    const initialFlips = rawPieces.map(() => {
      if (initialFlipScrambled) {
        return rng.nextBoolean(0.5);
      }
      return false;
    });

    const initialScatterOffsets = initialPieceOrder.map(() => ({
      x: rng.next() * 8,
      y: rng.next() * 6
    }));

    const puzzle = {
      id: "gen-" + seed.toString().replace(/[^a-z0-9]/gi, "-"),
      name: options.name || `${themeName}·第${difficulty}关`,
      theme: puzzleTheme,
      cols,
      rows,
      text,
      timeLimit,
      hintPenalty,
      scatterRule,
      enableRotation,
      enableFlip,
      initialRotationScrambled,
      initialFlipScrambled,
      availableTools,
      generated: true,
      generatorSeed: seed,
      initialPieceOrder,
      initialRotations,
      initialFlips,
      initialScatterOffsets,
      generatorOptions: {
        difficulty,
        theme: themeId,
        damageRule,
        similarity,
        cols,
        rows,
        enableRotation,
        enableFlip,
        initialRotationScrambled,
        initialFlipScrambled,
        timeLimit,
        hintPenalty,
        scatterRule,
        puzzleTheme
      },
      pieceDamage: piecesWithDamage.reduce((acc, p) => {
        acc[p.id] = p.damage;
        return acc;
      }, {})
    };

    const validatedPuzzle = ensureUniquePositions(puzzle, rng);

    return {
      puzzle: validatedPuzzle,
      seed,
      rngState: rng.getState(),
      difficulty: diffConfig.name
    };
  }

  function selectRandomTheme(rng) {
    const papers = Object.keys(AppData.themes.paper);
    const inks = Object.keys(AppData.themes.ink);
    const borders = Object.keys(AppData.themes.border);
    const tables = Object.keys(AppData.themes.table);

    return {
      paper: rng.pick(papers),
      ink: rng.pick(inks),
      border: rng.pick(borders),
      table: rng.pick(tables)
    };
  }

  function generateByDifficulty(difficulty, seed = null) {
    return generatePuzzle({
      seed: seed || generateRandomSeed(),
      difficulty
    });
  }

  function regenerateFromSeed(seed, existingOptions = null) {
    if (existingOptions && existingOptions.generatorOptions) {
      const opts = existingOptions.generatorOptions;
      return generatePuzzle({
        seed,
        difficulty: opts.difficulty,
        theme: opts.theme,
        damageRule: opts.damageRule,
        similarity: opts.similarity,
        cols: opts.cols,
        rows: opts.rows,
        enableRotation: opts.enableRotation,
        enableFlip: opts.enableFlip,
        initialRotationScrambled: opts.initialRotationScrambled,
        initialFlipScrambled: opts.initialFlipScrambled,
        timeLimit: opts.timeLimit,
        hintPenalty: opts.hintPenalty,
        scatterRule: opts.scatterRule,
        puzzleTheme: opts.puzzleTheme
      });
    }
    return generatePuzzle({ seed });
  }

  function validatePuzzle(puzzle) {
    if (!puzzle.cols || !puzzle.rows) return { valid: false, error: "缺少行列信息" };
    if (!puzzle.text || !Array.isArray(puzzle.text)) return { valid: false, error: "缺少文字数组" };
    if (puzzle.text.length !== puzzle.cols * puzzle.rows) return { valid: false, error: "文字数量与网格不匹配" };

    const uniqueWords = new Set(puzzle.text);
    if (uniqueWords.size !== puzzle.text.length) {
      return { valid: false, error: "存在重复文字，可能导致位置不唯一" };
    }

    return { valid: true };
  }

  function ensureUniquePositions(puzzle, rng) {
    const words = [...puzzle.text];
    const seen = new Set();
    const duplicates = [];

    for (let i = 0; i < words.length; i++) {
      if (seen.has(words[i])) {
        duplicates.push(i);
      } else {
        seen.add(words[i]);
      }
    }

    if (duplicates.length === 0) return puzzle;

    const themeId = puzzle.generatorOptions?.theme || AppThesaurus.getRandomTheme(rng);
    const allWords = AppThesaurus.getWordBank(themeId)?.words || [];
    const availableWords = allWords.filter(w => !seen.has(w));

    for (const idx of duplicates) {
      if (availableWords.length > 0) {
        const newWordIdx = Math.floor(rng.next() * availableWords.length);
        words[idx] = availableWords.splice(newWordIdx, 1)[0];
        seen.add(words[idx]);
      } else {
        words[idx] = words[idx] + "·" + (idx + 1);
      }
    }

    return { ...puzzle, text: words };
  }

  function getDifficultyPresets() {
    return Object.entries(difficultyPresets).map(([level, config]) => ({
      level: parseInt(level),
      ...config
    }));
  }

  function getDamageRules() {
    return Object.entries(damageRules).map(([id, rule]) => ({
      id,
      name: rule.name
    }));
  }

  return {
    createRNG,
    hashSeed,
    generateRandomSeed,
    generatePuzzle,
    generateByDifficulty,
    regenerateFromSeed,
    validatePuzzle,
    ensureUniquePositions,
    getDifficultyPresets,
    getDamageRules,
    damageRules
  };
})();

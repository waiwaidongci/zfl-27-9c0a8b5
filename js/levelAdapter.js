const AppLevelAdapter = (() => {
  const boardSizes = [
    { cols: 2, rows: 2, minDifficulty: 1, maxDifficulty: 1, aspectRatio: "1:1" },
    { cols: 3, rows: 2, minDifficulty: 1, maxDifficulty: 2, aspectRatio: "3:2" },
    { cols: 3, rows: 3, minDifficulty: 2, maxDifficulty: 3, aspectRatio: "1:1" },
    { cols: 4, rows: 2, minDifficulty: 2, maxDifficulty: 3, aspectRatio: "2:1" },
    { cols: 4, rows: 3, minDifficulty: 3, maxDifficulty: 4, aspectRatio: "4:3" },
    { cols: 5, rows: 3, minDifficulty: 4, maxDifficulty: 5, aspectRatio: "5:3" },
    { cols: 4, rows: 4, minDifficulty: 5, maxDifficulty: 5, aspectRatio: "1:1" },
    { cols: 5, rows: 4, minDifficulty: 5, maxDifficulty: 5, aspectRatio: "5:4" }
  ];

  function getAvailableSizes(difficulty) {
    return boardSizes.filter(
      size => difficulty >= size.minDifficulty && difficulty <= size.maxDifficulty
    );
  }

  function getOptimalSize(difficulty, rng = null) {
    const available = getAvailableSizes(difficulty);
    if (available.length === 0) return { cols: 3, rows: 2 };
    if (rng) {
      const idx = Math.floor(rng.next() * available.length);
      return available[idx];
    }
    return available[Math.floor(available.length / 2)];
  }

  function calculateTimeLimit(cols, rows, difficulty) {
    const pieceCount = cols * rows;
    const baseTime = pieceCount * 12 + 20;

    const difficultyMultipliers = {
      1: 1.6,
      2: 1.4,
      3: 1.1,
      4: 0.9,
      5: 0.75
    };

    return Math.round(baseTime * (difficultyMultipliers[difficulty] || 1.0));
  }

  function calculateHintPenalty(difficulty) {
    const penalties = {
      1: 40,
      2: 60,
      3: 80,
      4: 100,
      5: 120
    };
    return penalties[difficulty] || 80;
  }

  function calculateScrambleLevel(difficulty) {
    return {
      rotation: difficulty >= 3,
      flip: difficulty >= 4,
      scrambleInitialRotation: difficulty >= 3,
      scrambleInitialFlip: difficulty >= 4,
      similarity: Math.min(0.1 + difficulty * 0.1, 0.5)
    };
  }

  function getAvailableTools(difficulty) {
    const tools = ["zoom", "edgeAlign"];
    if (difficulty >= 2) tools.push("rotateCw", "rotateCcw");
    if (difficulty >= 4) tools.push("flip");
    return tools;
  }

  function adaptPuzzleToDifficulty(puzzle, difficulty) {
    const scramble = calculateScrambleLevel(difficulty);
    const tools = getAvailableTools(difficulty);

    return {
      ...puzzle,
      timeLimit: calculateTimeLimit(puzzle.cols, puzzle.rows, difficulty),
      hintPenalty: calculateHintPenalty(difficulty),
      enableRotation: scramble.rotation,
      enableFlip: scramble.flip,
      initialRotationScrambled: scramble.scrambleInitialRotation,
      initialFlipScrambled: scramble.scrambleInitialFlip,
      availableTools: tools,
      adaptedDifficulty: difficulty
    };
  }

  function generateLevelConfig(difficulty, options = {}) {
    const seed = options.seed || AppGenerator.generateRandomSeed();
    const rng = AppGenerator.createRNG(seed);
    const size = getOptimalSize(difficulty, rng);
    const scramble = calculateScrambleLevel(difficulty);
    const themeId = options.theme || AppThesaurus.getRandomTheme(rng);

    const pieceCount = size.cols * size.rows;
    const words = AppThesaurus.getRandomWords(
      themeId,
      pieceCount,
      rng,
      options.similarity ?? scramble.similarity
    );

    const puzzleTheme = {
      paper: options.paper || rng.pick(Object.keys(AppData.themes.paper)),
      ink: options.ink || rng.pick(Object.keys(AppData.themes.ink)),
      border: options.border || rng.pick(Object.keys(AppData.themes.border)),
      table: options.table || rng.pick(Object.keys(AppData.themes.table))
    };

    const themeBank = AppThesaurus.getWordBank(themeId);
    const themeName = themeBank ? themeBank.name : "古籍";

    return {
      seed,
      difficulty,
      difficultyName: AppGenerator.getDifficultyPresets().find(d => d.level === difficulty)?.name || "普通",
      cols: size.cols,
      rows: size.rows,
      pieceCount,
      themeId,
      themeName,
      puzzleTheme,
      words,
      timeLimit: calculateTimeLimit(size.cols, size.rows, difficulty),
      hintPenalty: calculateHintPenalty(difficulty),
      enableRotation: scramble.rotation,
      enableFlip: scramble.flip,
      initialRotationScrambled: scramble.scrambleInitialRotation,
      initialFlipScrambled: scramble.scrambleInitialFlip,
      availableTools: getAvailableTools(difficulty),
      scatterRule: options.scatterRule || (rng.nextBoolean(0.6) ? "random" : "ordered"),
      similarity: scramble.similarity,
      aspectRatio: size.aspectRatio
    };
  }

  function buildPuzzleFromConfig(config) {
    const puzzle = {
      id: "gen-" + config.seed.toString().replace(/[^a-z0-9]/gi, "-"),
      name: config.name || `${config.themeName}·${config.difficultyName}`,
      theme: config.puzzleTheme,
      cols: config.cols,
      rows: config.rows,
      text: config.words,
      timeLimit: config.timeLimit,
      hintPenalty: config.hintPenalty,
      scatterRule: config.scatterRule,
      enableRotation: config.enableRotation,
      enableFlip: config.enableFlip,
      initialRotationScrambled: config.initialRotationScrambled,
      initialFlipScrambled: config.initialFlipScrambled,
      availableTools: config.availableTools,
      generated: true,
      generatorSeed: config.seed,
      generatorOptions: {
        difficulty: config.difficulty,
        theme: config.themeId,
        similarity: config.similarity
      }
    };

    const validation = AppGenerator.validatePuzzle(puzzle);
    if (!validation.valid) {
      console.warn("Puzzle validation warning:", validation.error);
      const fixedPuzzle = AppGenerator.ensureUniquePositions(puzzle, AppGenerator.createRNG(config.seed));
      return fixedPuzzle;
    }

    return puzzle;
  }

  function getDifficultyInfo(level) {
    const presets = AppGenerator.getDifficultyPresets();
    const preset = presets.find(p => p.level === level);
    if (!preset) return null;

    return {
      ...preset,
      description: getDifficultyDescription(level),
      recommendedSizes: getAvailableSizes(level).map(s => `${s.cols}×${s.rows}`),
      timeMultiplier: preset.timeMultiplier,
      expectedTimePerPiece: Math.round(12 * preset.timeMultiplier) + "秒"
    };
  }

  function getDifficultyDescription(level) {
    const descriptions = {
      1: "适合初学者。残片较少，无需旋转翻转，文字差异明显。",
      2: "略有挑战。残片数量适中，可使用旋转工具。",
      3: "标准难度。需要旋转操作，部分文字相似度增加。",
      4: "较高难度。需要旋转和翻转，文字相似度更高，时间更紧。",
      5: "专家模式。大量残片，需要旋转翻转，文字高度相似，时间紧迫。"
    };
    return descriptions[level] || "标准难度";
  }

  function getQuickGenerate(difficulty = 3) {
    const config = generateLevelConfig(difficulty);
    const puzzle = buildPuzzleFromConfig(config);
    return {
      config,
      puzzle,
      difficultyInfo: getDifficultyInfo(difficulty)
    };
  }

  return {
    getAvailableSizes,
    getOptimalSize,
    calculateTimeLimit,
    calculateHintPenalty,
    calculateScrambleLevel,
    getAvailableTools,
    adaptPuzzleToDifficulty,
    generateLevelConfig,
    buildPuzzleFromConfig,
    getDifficultyInfo,
    getDifficultyDescription,
    getQuickGenerate
  };
})();

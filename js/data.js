const AppData = (() => {
  const themes = {
    paper: {
      xuanzhi: { name: "宣纸", class: "paper-xuanzhi" },
      mazhi: { name: "麻纸", class: "paper-mazhi" },
      juanzhi: { name: "绢纸", class: "paper-juanzhi" },
      caizhi: { name: "彩纸", class: "paper-caizhi" },
      baizhi: { name: "白纸", class: "paper-baizhi" }
    },
    ink: {
      mohei: { name: "墨黑", class: "ink-mohei" },
      zhuhong: { name: "朱红", class: "ink-zhuhong" },
      zangqing: { name: "藏青", class: "ink-zangqing" },
      tanxiang: { name: "檀香", class: "ink-tanxiang" },
      dai: { name: "黛色", class: "ink-dai" }
    },
    border: {
      none: { name: "无", class: "border-none" },
      torn: { name: "撕裂", class: "border-torn" },
      frayed: { name: "磨损", class: "border-frayed" },
      chipped: { name: "缺口", class: "border-chipped" },
      scalloped: { name: "扇贝", class: "border-scalloped" },
      irregular: { name: "不规则", class: "border-irregular" }
    },
    table: {
      base: { name: "基础", class: "table-base" },
      wood: { name: "木桌", class: "table-wood" },
      stone: { name: "石桌", class: "table-stone" },
      silk: { name: "丝缎", class: "table-silk" },
      bamboo: { name: "竹席", class: "table-bamboo" },
      lacquer: { name: "漆案", class: "table-lacquer" }
    }
  };

  const paperColors = {
    xuanzhi: "#f7ebcd",
    mazhi: "#e8d9bc",
    juanzhi: "#f0e4c8",
    caizhi: "#e5d5b5",
    baizhi: "#faf5e8"
  };

  const inkColors = {
    mohei: "#2b251d",
    zhuhong: "#8b2500",
    zangqing: "#1a3a4a",
    tanxiang: "#5a4a2a",
    dai: "#4a3a5a"
  };

  const tableColors = {
    base: "#d9caa8",
    wood: "#c9b896",
    stone: "#b8b5ac",
    silk: "#e0d4c0",
    bamboo: "#d0c8a8",
    lacquer: "#3a3025"
  };

  function getCustomThemes() {
    return AppStorage.getCustomThemes();
  }

  function saveCustomThemes(themes) {
    AppStorage.setCustomThemes(themes);
  }

  function addCustomTheme(theme) {
    return AppStorage.addCustomTheme(theme);
  }

  function updateCustomTheme(id, theme) {
    return AppStorage.updateCustomTheme(id, theme);
  }

  function deleteCustomTheme(id) {
    AppStorage.deleteCustomTheme(id);
  }

  function getCustomThemeById(id) {
    return AppStorage.getCustomThemeById(id);
  }

  function isBuiltinThemeKey(category, key) {
    return !!(themes[category] && themes[category][key]);
  }

  function resolveThemeColor(themeObj, category) {
    if (!themeObj) return null;
    if (themeObj.customColors && themeObj.customColors[category + "Color"]) {
      return themeObj.customColors[category + "Color"];
    }
    const key = themeObj[category];
    if (category === "paper") return paperColors[key] || null;
    if (category === "ink") return inkColors[key] || null;
    if (category === "table") return tableColors[key] || null;
    return null;
  }

  const builtinPuzzles = [
    {
      id: "builtin-1",
      name: "第1页",
      custom: false,
      cols: 3, rows: 2,
      text: ["山雨","残卷","归舟","松风","旧墨","灯影"],
      theme: { paper: "xuanzhi", ink: "mohei", border: "none", table: "wood" },
      timeLimit: 120,
      hintPenalty: 80,
      scatterRule: "random",
      enableRotation: false,
      enableFlip: false,
      initialRotationScrambled: false,
      initialFlipScrambled: false,
      availableTools: ["zoom", "edgeAlign"]
    },
    {
      id: "builtin-2",
      name: "第2页",
      custom: false,
      cols: 4, rows: 2,
      text: ["竹简","秋水","石桥","远钟","青灯","薄纸","行书","残印"],
      theme: { paper: "mazhi", ink: "zhuhong", border: "torn", table: "stone" },
      timeLimit: 130,
      hintPenalty: 80,
      scatterRule: "random",
      enableRotation: true,
      enableFlip: false,
      initialRotationScrambled: true,
      initialFlipScrambled: false,
      availableTools: ["rotateCw", "rotateCcw", "zoom", "edgeAlign"]
    },
    {
      id: "builtin-3",
      name: "第3页",
      custom: false,
      cols: 3, rows: 3,
      text: ["云根","药谱","温火","井泉","纸背","朱批","草堂","夜读","藏印"],
      theme: { paper: "juanzhi", ink: "zangqing", border: "frayed", table: "silk" },
      timeLimit: 140,
      hintPenalty: 80,
      scatterRule: "random",
      enableRotation: true,
      enableFlip: true,
      initialRotationScrambled: true,
      initialFlipScrambled: true,
      availableTools: ["rotateCw", "rotateCcw", "flip", "zoom", "edgeAlign"]
    },
    {
      id: "builtin-4",
      name: "第4页",
      custom: false,
      cols: 4, rows: 3,
      text: ["海棠","卷首","虫蛀","补纸","墨脉","断栏","夹注","边款","残页","古香","修痕","归档"],
      theme: { paper: "caizhi", ink: "tanxiang", border: "chipped", table: "bamboo" },
      timeLimit: 150,
      hintPenalty: 80,
      scatterRule: "random",
      enableRotation: true,
      enableFlip: true,
      initialRotationScrambled: true,
      initialFlipScrambled: true,
      availableTools: ["rotateCw", "rotateCcw", "flip", "zoom", "edgeAlign"]
    },
    {
      id: "builtin-5",
      name: "第5页",
      custom: false,
      cols: 5, rows: 3,
      text: ["金石","拓痕","旧题","飞白","鱼尾","牌记","小篆","暗纹","碑阴","残角","书林","校勘","虫孔","云笺","收束"],
      theme: { paper: "baizhi", ink: "dai", border: "irregular", table: "lacquer" },
      timeLimit: 180,
      hintPenalty: 80,
      scatterRule: "random",
      enableRotation: true,
      enableFlip: true,
      initialRotationScrambled: true,
      initialFlipScrambled: true,
      availableTools: ["rotateCw", "rotateCcw", "flip", "zoom", "edgeAlign"]
    }
  ];

  const scatterRules = {
    random: { name: "随机散落", desc: "纸片随机分布在托盘各处" },
    ordered: { name: "按序排列", desc: "按编号顺序整齐排列在托盘" },
    reversed: { name: "逆序排列", desc: "按编号倒序排列在托盘" },
    clustered: { name: "分组聚集", desc: "按行分组聚集在托盘" }
  };

  function getThemePreviewColor(theme) {
    return {
      paper: resolveThemeColor(theme, "paper") || "#f7ebcd",
      ink: resolveThemeColor(theme, "ink") || "#2b251d",
      table: resolveThemeColor(theme, "table") || "#d9caa8"
    };
  }

  function getAllPuzzles() {
    const custom = getCustomPuzzles();
    return [...builtinPuzzles, ...custom];
  }

  function getBuiltinPuzzles() {
    return builtinPuzzles;
  }

  function getCustomPuzzles() {
    return AppStorage.getCustomPuzzles();
  }

  function saveCustomPuzzles(puzzles) {
    AppStorage.setCustomPuzzles(puzzles);
  }

  function addCustomPuzzle(puzzle) {
    return AppStorage.addCustomPuzzle(puzzle);
  }

  function updateCustomPuzzle(id, puzzle) {
    return AppStorage.updateCustomPuzzle(id, puzzle);
  }

  function deleteCustomPuzzle(id) {
    AppStorage.deleteCustomPuzzle(id);
  }

  function getPuzzleIndex(id) {
    const all = getAllPuzzles();
    return all.findIndex(p => p.id === id);
  }

  function getPuzzleById(id) {
    const all = getAllPuzzles();
    return all.find(p => p.id === id);
  }

  function getPuzzleByIndex(index) {
    const all = getAllPuzzles();
    return all[index];
  }

  function getBuiltinCount() {
    return builtinPuzzles.length;
  }

  return {
    themes,
    builtinPuzzles,
    scatterRules,
    paperColors,
    inkColors,
    tableColors,
    getThemePreviewColor,
    getAllPuzzles,
    getBuiltinPuzzles,
    getCustomPuzzles,
    addCustomPuzzle,
    updateCustomPuzzle,
    deleteCustomPuzzle,
    getPuzzleIndex,
    getPuzzleById,
    getPuzzleByIndex,
    getBuiltinCount,
    getCustomThemes,
    addCustomTheme,
    updateCustomTheme,
    deleteCustomTheme,
    getCustomThemeById,
    isBuiltinThemeKey,
    resolveThemeColor
  };
})();

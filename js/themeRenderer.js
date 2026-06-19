const AppThemeRenderer = (() => {
  const themeMappings = {
    landscape: {
      name: "山水",
      preferredPapers: ["xuanzhi", "mazhi", "baizhi"],
      preferredInks: ["mohei", "zangqing", "dai"],
      preferredBorders: ["none", "torn", "irregular"],
      preferredTables: ["wood", "stone", "bamboo"],
      colorPalette: {
        primary: "#3a5a4a",
        secondary: "#5a7a6a",
        accent: "#8a7a5a"
      }
    },
    ancient: {
      name: "古籍",
      preferredPapers: ["mazhi", "juanzhi", "xuanzhi"],
      preferredInks: ["mohei", "zhuhong", "tanxiang"],
      preferredBorders: ["torn", "frayed", "chipped"],
      preferredTables: ["wood", "lacquer", "silk"],
      colorPalette: {
        primary: "#5a3d2a",
        secondary: "#8a5a3a",
        accent: "#c08850"
      }
    },
    poetry: {
      name: "诗词",
      preferredPapers: ["xuanzhi", "baizhi", "caizhi"],
      preferredInks: ["mohei", "zangqing", "dai"],
      preferredBorders: ["none", "scalloped", "irregular"],
      preferredTables: ["silk", "wood", "stone"],
      colorPalette: {
        primary: "#4a3a5a",
        secondary: "#6a5a7a",
        accent: "#9a8aaa"
      }
    },
    study: {
      name: "书房",
      preferredPapers: ["xuanzhi", "juanzhi", "baizhi"],
      preferredInks: ["mohei", "tanxiang", "zhuhong"],
      preferredBorders: ["none", "frayed", "chipped"],
      preferredTables: ["wood", "lacquer", "bamboo"],
      colorPalette: {
        primary: "#5a4a2a",
        secondary: "#7a6a4a",
        accent: "#aa8a5a"
      }
    },
    zen: {
      name: "禅意",
      preferredPapers: ["baizhi", "xuanzhi", "juanzhi"],
      preferredInks: ["mohei", "zangqing", "dai"],
      preferredBorders: ["none", "irregular", "torn"],
      preferredTables: ["stone", "silk", "wood"],
      colorPalette: {
        primary: "#3a3a4a",
        secondary: "#5a5a6a",
        accent: "#8a8a9a"
      }
    },
    seasons: {
      name: "四季",
      preferredPapers: ["caizhi", "xuanzhi", "mazhi"],
      preferredInks: ["zhuhong", "tanxiang", "zangqing"],
      preferredBorders: ["scalloped", "torn", "mixed"],
      preferredTables: ["bamboo", "wood", "stone"],
      colorPalette: {
        primary: "#7a4a3a",
        secondary: "#aa6a5a",
        accent: "#daa88a"
      }
    }
  };

  function getThemeMapping(themeId) {
    return themeMappings[themeId] || null;
  }

  function getRecommendedTheme(themeId, rng = null) {
    const mapping = getThemeMapping(themeId);
    if (!mapping) return null;

    const random = rng || { pick: arr => arr[Math.floor(Math.random() * arr.length)] };

    return {
      paper: random.pick(mapping.preferredPapers),
      ink: random.pick(mapping.preferredInks),
      border: random.pick(mapping.preferredBorders),
      table: random.pick(mapping.preferredTables)
    };
  }

  function applyThemeToElement(element, theme) {
    if (!element || !theme) return;

    const paperClass = AppData.themes.paper[theme.paper]?.class;
    const inkClass = AppData.themes.ink[theme.ink]?.class;
    const borderClass = AppData.themes.border[theme.border]?.class;
    const tableClass = AppData.themes.table[theme.table]?.class;

    if (paperClass) {
      element.classList.remove(...Object.values(AppData.themes.paper).map(t => t.class));
      element.classList.add(paperClass);
    }
    if (inkClass) {
      element.classList.remove(...Object.values(AppData.themes.ink).map(t => t.class));
      element.classList.add(inkClass);
    }
    if (borderClass) {
      element.classList.remove(...Object.values(AppData.themes.border).map(t => t.class));
      element.classList.add(borderClass);
    }
    if (tableClass && element.closest("body")) {
      document.body.classList.remove(...Object.values(AppData.themes.table).map(t => t.class));
      document.body.classList.add(tableClass);
    }
  }

  function createPreview(theme, themeId = null) {
    const mapping = themeId ? getThemeMapping(themeId) : null;
    const colors = mapping ? mapping.colorPalette : {
      primary: "#5a3d2a",
      secondary: "#8a5a3a",
      accent: "#c08850"
    };

    return {
      colors,
      paperColor: AppData.paperColors[theme.paper] || "#f7ebcd",
      inkColor: AppData.inkColors[theme.ink] || "#2b251d",
      paperName: AppData.themes.paper[theme.paper]?.name || theme.paper,
      inkName: AppData.themes.ink[theme.ink]?.name || theme.ink,
      borderName: AppData.themes.border[theme.border]?.name || theme.border,
      tableName: AppData.themes.table[theme.table]?.name || theme.table
    };
  }

  function renderThemePicker(container, options = {}) {
    if (!container) return;

    const {
      onSelect = null,
      selectedTheme = null,
      showAllThemes = true
    } = options;

    const themes = AppThesaurus.getThemeNames();

    let html = '<div class="theme-picker-container">';
    html += '<h3 class="picker-title">选择主题</h3>';
    html += '<div class="theme-picker-grid">';

    themes.forEach(theme => {
      const mapping = getThemeMapping(theme.id);
      const colors = mapping ? mapping.colorPalette : { primary: "#888", secondary: "#aaa", accent: "#ccc" };
      const isSelected = selectedTheme === theme.id;

      html += `
        <div class="theme-picker-card ${isSelected ? 'selected' : ''}" data-theme="${theme.id}">
          <div class="theme-preview-strip" style="background: linear-gradient(135deg, ${colors.primary}, ${colors.secondary});">
            <div class="theme-accent-dot" style="background: ${colors.accent};"></div>
          </div>
          <div class="theme-picker-info">
            <div class="theme-picker-name">${theme.name}</div>
            <div class="theme-picker-desc">${theme.description}</div>
          </div>
        </div>
      `;
    });

    html += '</div></div>';
    container.innerHTML = html;

    if (onSelect) {
      container.querySelectorAll('.theme-picker-card').forEach(card => {
        card.addEventListener('click', () => {
          const themeId = card.dataset.theme;
          container.querySelectorAll('.theme-picker-card').forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
          onSelect(themeId);
        });
      });
    }
  }

  function renderDifficultyPicker(container, options = {}) {
    if (!container) return;

    const {
      onSelect = null,
      selectedDifficulty = 3
    } = options;

    const presets = AppGenerator.getDifficultyPresets();

    let html = '<div class="difficulty-picker-container">';
    html += '<h3 class="picker-title">选择难度</h3>';
    html += '<div class="difficulty-picker-list">';

    presets.forEach(preset => {
      const isSelected = selectedDifficulty === preset.level;
      const info = AppLevelAdapter.getDifficultyInfo(preset.level);

      html += `
        <div class="difficulty-picker-card ${isSelected ? 'selected' : ''}" data-level="${preset.level}">
          <div class="difficulty-level">${preset.level}</div>
          <div class="difficulty-info">
            <div class="difficulty-name">${preset.name}</div>
            <div class="difficulty-desc">${info?.description || ''}</div>
            <div class="difficulty-meta">
              <span>残片 ${preset.minPieces}-${preset.maxPieces}</span>
              <span>×${preset.timeMultiplier} 时间</span>
              ${preset.rotationEnabled ? '<span>旋转</span>' : ''}
              ${preset.flipEnabled ? '<span>翻转</span>' : ''}
            </div>
          </div>
        </div>
      `;
    });

    html += '</div></div>';
    container.innerHTML = html;

    if (onSelect) {
      container.querySelectorAll('.difficulty-picker-card').forEach(card => {
        card.addEventListener('click', () => {
          const level = parseInt(card.dataset.level);
          container.querySelectorAll('.difficulty-picker-card').forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
          onSelect(level);
        });
      });
    }
  }

  function getAllThemeIds() {
    return Object.keys(themeMappings);
  }

  return {
    getThemeMapping,
    getRecommendedTheme,
    applyThemeToElement,
    createPreview,
    renderThemePicker,
    renderDifficultyPicker,
    getAllThemeIds
  };
})();

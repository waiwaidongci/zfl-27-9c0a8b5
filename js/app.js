const App = (() => {
  function init() {
    AppData;
    AppProgress.init();
    AppTutorial.setGame(AppGame);

    LevelPackUI.setCallbacks({
      onImportComplete: (report) => {
        AppProgress.init();
        refreshLevels();
        if (report && report.ok && report.imported.length > 0) {
          const startIdx = AppProgress.findStartIndex();
          AppGame.start(startIdx);
        }
      },
      onExportComplete: () => {
        refreshLevels();
      }
    });

    AppProgress.setOnLevelClick((index) => {
      if (AppTutorial.isActive()) return;
      AppGame.start(index);
    });
    AppProgress.setOnDeleteCustom((id) => {
      if (!confirm("确定要删除这个自定义残页吗？其进度记录也会一并删除。")) return;
      const currentPuzzle = AppData.getPuzzleByIndex(AppGame.getCurrentIndex());
      const currentId = currentPuzzle ? currentPuzzle.id : null;
      const deleteIndex = AppData.getPuzzleIndex(id);
      const saveKey = "zfl27LevelSave_" + id;
      localStorage.removeItem(saveKey);
      AppLibrary.deleteEntry(id);
      AppData.deleteCustomPuzzle(id);
      AppProgress.handleCustomDeleted(deleteIndex);
      refreshLevels();
      const newIdx = currentId && currentId !== id
        ? AppData.getPuzzleIndex(currentId)
        : -1;
      if (newIdx >= 0) {
        AppGame.start(newIdx);
      } else {
        const startIdx = AppProgress.findStartIndex();
        AppGame.start(startIdx);
      }
    });

    AppProgress.setOnEditCustom((id) => {
      const puzzle = AppData.getPuzzleById(id);
      if (!puzzle) return;
      AppEditor.open(puzzle);
    });

    AppEditor.setCallbacks({
      onSave: (puzzle, editingId) => {
        if (editingId) {
          const oldPuzzle = AppData.getPuzzleById(editingId);
          const dimensionsChanged = oldPuzzle && (
            oldPuzzle.cols !== puzzle.cols ||
            oldPuzzle.rows !== puzzle.rows
          );

          AppData.updateCustomPuzzle(editingId, puzzle);

          if (dimensionsChanged) {
            const saveKey = "zfl27LevelSave_" + editingId;
            localStorage.removeItem(saveKey);
          }

          const libraryEntry = AppLibrary.loadLibrary().find(e => e.puzzleId === editingId);
          if (libraryEntry) {
            AppLibrary.addOrUpdateEntry(editingId, {
              name: puzzle.name,
              text: puzzle.text,
              cols: puzzle.cols,
              rows: puzzle.rows,
              theme: puzzle.theme
            });
          }

          refreshLevels();

          const currentPuzzle = AppData.getPuzzleByIndex(AppGame.getCurrentIndex());
          if (currentPuzzle && currentPuzzle.id === editingId) {
            setTimeout(() => {
              const newIdx = AppData.getPuzzleIndex(editingId);
              if (newIdx >= 0) AppGame.start(newIdx);
            }, 50);
          }
        } else {
          const saved = AppData.addCustomPuzzle(puzzle);
          AppProgress.ensureProgressSize();
          const allPuzzles = AppData.getAllPuzzles();
          const idx = allPuzzles.findIndex(p => p.id === saved.id);
          if (idx >= 0) {
            AppProgress.updateProgress(idx, { unlocked: true });
          }
          refreshLevels();
          setTimeout(() => {
            const newIdx = AppData.getAllPuzzles().findIndex(p => p.id === saved.id);
            if (newIdx >= 0) AppGame.start(newIdx);
          }, 50);
        }
      },
      onCancel: () => {
        refreshLevels();
      },
      onStartPreview: (puzzle) => {
        AppEditor.close();
        setTimeout(() => {
          AppGame.startTemp(puzzle);
        }, 50);
      }
    });
    AppGame.init({
      tutorial: AppTutorial,
      progress: AppProgress,
      onLevelsRefresh: refreshLevels,
      onTempExit: () => {
        AppEditor.open();
      },
      onDailyExit: () => {
        const startIdx = AppProgress.findStartIndex();
        AppGame.start(startIdx);
      },
      onDailyFinish: (result) => {
        AppDailyChallenge.recordResult(result);
      }
    });
    AppDebugPanel.init({
      onStartGenerated: (puzzle) => {
        AppGame.startTemp(puzzle);
      },
      onToggleState: (isOpen) => {
        const btn = document.querySelector("#generatorEntryBtn");
        if (btn) btn.classList.toggle("is-active", isOpen);
      }
    });
    AppLibrary.setOnExit(() => {
      refreshLevels();
    });
    AppLibrary.setOnStartPuzzle((puzzleId) => {
      const idx = AppData.getPuzzleIndex(puzzleId);
      if (idx >= 0) {
        AppGame.start(idx);
        return;
      }
      const entry = AppLibrary.loadLibrary().find(item => item.puzzleId === puzzleId);
      if (entry && entry.text && entry.cols && entry.rows && entry.theme) {
        AppGame.startTemp({
          id: entry.puzzleId,
          name: entry.name || "藏书残页",
          text: entry.text,
          cols: entry.cols,
          rows: entry.rows,
          theme: entry.theme,
          timeLimit: 120,
          hintPenalty: 80,
          scatterRule: "random"
        });
      }
    });
    AppTutorial.bindUI();
    const editorEntryBtn = document.querySelector("#editorEntryBtn");
    if (editorEntryBtn) {
      editorEntryBtn.onclick = () => {
        if (AppTutorial.isActive()) return;
        AppEditor.resetState();
        AppEditor.open();
      };
    }
    const generatorEntryBtn = document.querySelector("#generatorEntryBtn");
    if (generatorEntryBtn) {
      generatorEntryBtn.onclick = () => {
        if (AppTutorial.isActive()) return;
        AppDebugPanel.toggle();
      };
    }
    const dailyChallengeBtn = document.querySelector("#dailyChallengeBtn");
    if (dailyChallengeBtn) {
      dailyChallengeBtn.onclick = () => {
        if (AppTutorial.isActive()) return;
        const puzzle = AppDailyChallenge.getTodayPuzzle();
        const restoreState = AppDailyChallenge.getSessionGameState();
        AppGame.startDaily(puzzle, restoreState);
      };
    }
    const libraryBtn = document.querySelector("#libraryBtn");
    if (libraryBtn) {
      libraryBtn.onclick = () => {
        if (AppTutorial.isActive()) return;
        AppLibrary.open();
      };
    }
    const packExportBtn = document.querySelector("#packExportBtn");
    if (packExportBtn) {
      packExportBtn.onclick = () => {
        if (AppTutorial.isActive()) return;
        LevelPackUI.openExportPicker();
      };
    }
    const packImportBtn = document.querySelector("#packImportBtn");
    if (packImportBtn) {
      packImportBtn.onclick = () => {
        if (AppTutorial.isActive()) return;
        LevelPackUI.openImportFilePicker();
      };
    }
    const startIdx = AppProgress.findStartIndex();
    AppGame.start(startIdx);
    AppTutorial.maybeAutoStart();
  }

  function refreshLevels() {
    const container = document.querySelector("#levels");
    if (container) {
      AppProgress.renderLevels(container, AppGame.getCurrentIndex());
    }
  }

  document.addEventListener("DOMContentLoaded", init);
  return { init, refreshLevels };
})();

const App = (() => {
  function init() {
    const migrateResult = AppStorage.migrate();
    if (migrateResult && !migrateResult.success) {
      if (migrateResult.corrupted) {
        console.warn("[App] 数据损坏，已尝试修复。请检查数据完整性。", migrateResult);
        if (typeof AppDataManager !== "undefined" && AppDataManager.showDataCorruptedWarning) {
          setTimeout(() => {
          AppDataManager.showDataCorruptedWarning(migrateResult);
        }, 500);
      }
    }
      if (migrateResult.newerSchema) {
        console.warn("[App] 本地数据 schema 版本比当前程序新，请更新应用。", migrateResult);
        if (typeof AppDataManager !== "undefined" && AppDataManager.showNewerSchemaWarning) {
          setTimeout(() => {
          AppDataManager.showNewerSchemaWarning(migrateResult);
        }, 500);
      }
    }
    }
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
      AppStorage.deleteLevelSave(id);
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
            AppStorage.deleteLevelSave(editingId);
          }

          const libraryEntry = AppLibrary.loadLibrary().find(e => e.puzzleId === editingId);
          if (libraryEntry) {
            const updateData = {
              name: puzzle.name,
              text: puzzle.text,
              cols: puzzle.cols,
              rows: puzzle.rows,
              theme: puzzle.theme
            };
            if (puzzle.customColors) {
              updateData.customColors = { ...puzzle.customColors };
            }
            AppLibrary.addOrUpdateEntry(editingId, updateData);
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
        if (window._genTempReturn) {
          window._genTempReturn = false;
          AppGeneratorUI.openPreview();
        } else {
          AppEditor.open();
        }
      },
      onTempDailyExit: () => {
        AppDailyChallenge.openCalendar();
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
    AppGeneratorUI.setCallbacks({
      onStartPreview: (puzzle) => {
        AppGeneratorUI.close();
        setTimeout(() => {
          AppGame.startTemp(puzzle);
        }, 50);
      },
      onSaveCustom: (puzzle) => {
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
      },
      onOpenEditor: (puzzle) => {
        AppEditor.open(puzzle);
      },
      onBack: () => {
        refreshLevels();
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
        const tempPuzzle = {
          id: entry.puzzleId,
          name: entry.name || "藏书残页",
          text: entry.text,
          cols: entry.cols,
          rows: entry.rows,
          theme: entry.theme,
          timeLimit: 120,
          hintPenalty: 80,
          scatterRule: "random"
        };
        if (entry.customColors) {
          tempPuzzle.customColors = { ...entry.customColors };
        }
        AppGame.startTemp(tempPuzzle);
      }
    });
    AppTutorial.bindUI();
    AppDailyChallenge.setCallbacks({
      onStartToday: (puzzle, restoreState) => {
        AppGame.startDaily(puzzle, restoreState);
      },
      onStartTempPlay: (puzzle) => {
        AppGame.startTempDaily(puzzle);
      }
    });

    ShareCodeUI.setCallbacks({
      onStartTemp: (puzzle) => {
        AppGame.startTemp(puzzle);
      },
      onSaveCustom: (puzzle) => {
        const saved = AppData.addCustomPuzzle(puzzle);
        AppProgress.ensureProgressSize();
        const allPuzzles = AppData.getAllPuzzles();
        const idx = allPuzzles.findIndex(p => p.id === saved.id);
        if (idx >= 0) {
          AppProgress.updateProgress(idx, { unlocked: true });
        }
        refreshLevels();
        return saved;
      },
      onRefreshLevels: refreshLevels
    });
    ShareCodeUI.bindOverlayClicks();

    const shareExportClose2 = document.querySelector("#shareExportClose2");
    if (shareExportClose2) shareExportClose2.onclick = ShareCodeUI.closeExportModal;
    const shareImportClose2 = document.querySelector("#shareImportClose2");
    if (shareImportClose2) shareImportClose2.onclick = ShareCodeUI.closeImportModal;

    const shareExportBtn = document.querySelector("#shareExportBtn");
    if (shareExportBtn) {
      shareExportBtn.onclick = () => {
        if (AppTutorial.isActive()) return;
        ShareCodeUI.exportCurrentPuzzle();
      };
    }
    const shareImportBtn = document.querySelector("#shareImportBtn");
    if (shareImportBtn) {
      shareImportBtn.onclick = () => {
        if (AppTutorial.isActive()) return;
        ShareCodeUI.openImportModal();
      };
    }

    const editorShareBtn = document.querySelector("#editorShareBtn");
    if (editorShareBtn) {
      editorShareBtn.onclick = () => {
        if (typeof AppEditor !== "undefined" && AppEditor.getState) {
          ShareCodeUI.exportEditorPuzzle(AppEditor.getState());
        }
      };
    }

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
        AppGeneratorUI.open();
      };
    }
    const dailyChallengeBtn = document.querySelector("#dailyChallengeBtn");
    if (dailyChallengeBtn) {
      dailyChallengeBtn.onclick = () => {
        if (AppTutorial.isActive()) return;
        AppDailyChallenge.openCalendar();
      };
    }
    const libraryBtn = document.querySelector("#libraryBtn");
    if (libraryBtn) {
      libraryBtn.onclick = () => {
        if (AppTutorial.isActive()) return;
        AppLibrary.open();
      };
    }
    const dataManagerBtn = document.querySelector("#dataManagerBtn");
    if (dataManagerBtn) {
      dataManagerBtn.onclick = () => {
        if (AppTutorial.isActive()) return;
        if (typeof AppDataManager !== "undefined") {
          AppDataManager.open();
        }
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

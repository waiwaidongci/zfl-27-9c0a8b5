const App = (() => {
  function init() {
    AppData;
    AppProgress.init();
    AppTutorial.setGame(AppGame);
    AppProgress.setOnLevelClick((index) => {
      if (AppTutorial.isActive()) return;
      AppGame.start(index);
    });
    AppProgress.setOnDeleteCustom((id) => {
      if (!confirm("确定要删除这个自定义残页吗？其进度记录也会一并删除。")) return;
      const currentPuzzle = AppData.getPuzzleByIndex(AppGame.getCurrentIndex());
      const currentId = currentPuzzle ? currentPuzzle.id : null;
      const deleteIndex = AppData.getPuzzleIndex(id);
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
    AppEditor.setCallbacks({
      onSave: (puzzle) => {
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

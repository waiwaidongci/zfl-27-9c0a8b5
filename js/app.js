const App = (() => {
  let lastMainlineIndex = 0;

  function init() {
    AppData;
    AppProgress.init();
    AppTutorial.setGame(AppGame);

    AppDailyChallenge.setCountdownCallbacks({
      onUpdate: (formatted) => {
        const el = document.getElementById('dailyCountdownTime');
        if (el) el.textContent = formatted;
      },
      onEnd: handleDayEnded
    });
    AppDailyChallenge.startCountdownTimer();

    AppProgress.setOnLevelClick((index) => {
      if (AppTutorial.isActive()) return;
      if (AppGame.getIsDailyMode()) lastMainlineIndex = index;
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
      },
      onDailyExit: () => {
        handleExitDaily();
      },
      onDailyFinish: (result) => {
        AppDailyChallenge.recordResult(result);
        refreshDailyPanel();
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

    const dailyBtn = document.querySelector("#dailyChallengeBtn");
    if (dailyBtn) {
      dailyBtn.onclick = () => {
        if (AppTutorial.isActive()) return;
        handleStartDaily();
      };
    }

    refreshDailyPanel();

    const hasActiveSession = AppDailyChallenge.hasActiveSession();
    const savedGameState = AppDailyChallenge.getSessionGameState();
    const todayRecord = AppDailyChallenge.getTodayRecord();
    const startIdx = AppProgress.findStartIndex();
    lastMainlineIndex = startIdx;

    if (hasActiveSession && savedGameState && todayRecord && !todayRecord.completed) {
      const lockedCount = savedGameState.pieceStates ? savedGameState.pieceStates.filter(p => p.locked).length : 0;
      const totalCount = savedGameState.pieceStates ? savedGameState.pieceStates.length : 0;
      const msg = `检测到今日有未完成的每日挑战（已完成 ${lockedCount}/${totalCount} 片），是否恢复进度？\n\n点击「确定」恢复之前进度，点击「取消」重新开始挑战。`;
      if (confirm(msg)) {
        handleStartDaily(true);
        return;
      } else {
        AppDailyChallenge.clearSession();
      }
    } else if (hasActiveSession && todayRecord && !todayRecord.completed) {
      if (confirm("检测到今日有未完成的每日挑战，是否继续挑战？")) {
        handleStartDaily(true);
        return;
      } else {
        AppDailyChallenge.clearSession();
      }
    }

    AppGame.start(startIdx);
    AppTutorial.maybeAutoStart();
  }

  function handleStartDaily(resuming = false) {
    if (!AppDailyChallenge.isSameDay(AppDailyChallenge.getDateString())) {
      alert("今日挑战已过期，请刷新页面获取新的挑战。");
      return;
    }
    let restoreState = null;
    if (resuming) {
      restoreState = AppDailyChallenge.getSessionGameState();
    } else {
      if (!AppGame.getIsDailyMode()) {
        lastMainlineIndex = AppGame.getCurrentIndex();
      }
    }
    const todayPuzzle = AppDailyChallenge.getTodayPuzzle();
    AppGame.startDaily(todayPuzzle, restoreState);
    refreshDailyPanel();
    updateDailyBtnState();
  }

  function handleExitDaily() {
    const targetIdx = lastMainlineIndex >= 0 ? lastMainlineIndex : AppProgress.findStartIndex();
    AppGame.start(targetIdx);
    refreshDailyPanel();
    updateDailyBtnState();
  }

  function handleDayEnded() {
    if (AppGame.getIsDailyMode()) {
      alert("今日挑战时间已结束！即将返回主线进度。");
      handleExitDaily();
    }
    refreshDailyPanel();
    updateDailyBtnState();
  }

  function refreshDailyPanel() {
    const container = document.querySelector("#dailyChallengePanel");
    if (!container) return;
    AppDailyChallenge.renderRecordsPanel(container, (dateStr) => {
      if (AppDailyChallenge.isSameDay(dateStr)) {
        handleStartDaily();
      }
    });
    const todayCard = container.querySelector('.daily-record-card[data-date="' + AppDailyChallenge.getDateString() + '"]');
    if (todayCard && !AppGame.getIsDailyMode()) {
      const enterBtn = document.createElement('button');
      enterBtn.className = 'daily-return-btn';
      const todayRecord = AppDailyChallenge.getTodayRecord();
      if (todayRecord && todayRecord.completed) {
        enterBtn.textContent = '再次挑战';
      } else if (todayRecord && todayRecord.hasAttempt) {
        enterBtn.textContent = '继续挑战';
      } else {
        enterBtn.textContent = '开始今日挑战';
      }
      enterBtn.onclick = (e) => {
        e.stopPropagation();
        handleStartDaily();
      };
      todayCard.appendChild(enterBtn);
    }
  }

  function updateDailyBtnState() {
    const btn = document.querySelector("#dailyChallengeBtn");
    if (!btn) return;
    if (AppGame.getIsDailyMode()) {
      btn.classList.add('is-active');
    } else {
      btn.classList.remove('is-active');
    }
    const todayRecord = AppDailyChallenge.getTodayRecord();
    let badge = btn.querySelector('.daily-badge');
    if (!todayRecord || !todayRecord.completed) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'daily-badge';
        badge.textContent = '新';
        btn.appendChild(badge);
      }
    } else if (badge) {
      badge.remove();
    }
  }

  function refreshLevels() {
    const container = document.querySelector("#levels");
    if (container) {
      AppProgress.renderLevels(container, AppGame.getCurrentIndex());
    }
    refreshDailyPanel();
    updateDailyBtnState();
  }

  document.addEventListener("DOMContentLoaded", init);
  return { init, refreshLevels };
})();

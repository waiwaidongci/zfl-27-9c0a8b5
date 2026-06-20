const AppHistoryManager = (() => {
  const MAX_HISTORY = 50;
  let undoStack = [];
  let redoStack = [];

  let captureSnapshot = null;
  let applySnapshot = null;
  let undoBtn = null;
  let redoBtn = null;

  function init(options) {
    captureSnapshot = options.captureSnapshot;
    applySnapshot = options.applySnapshot;
    undoBtn = options.undoBtn;
    redoBtn = options.redoBtn;
    clear();
  }

  function clear() {
    undoStack = [];
    redoStack = [];
    updateButtons();
  }

  function push() {
    try {
      if (!captureSnapshot) return;
      const snapshot = captureSnapshot();
      undoStack.push(snapshot);
      if (undoStack.length > MAX_HISTORY) {
        undoStack.shift();
      }
      redoStack = [];
      updateButtons();
    } catch (e) {}
  }

  function popLast() {
    if (undoStack.length > 0) {
      undoStack.pop();
      updateButtons();
    }
  }

  function canUndo() {
    return undoStack.length > 0;
  }

  function canRedo() {
    return redoStack.length > 0;
  }

  function undo() {
    if (undoStack.length === 0) return false;
    if (!captureSnapshot || !applySnapshot) return false;
    const currentSnapshot = captureSnapshot();
    const prevSnapshot = undoStack.pop();
    redoStack.push(currentSnapshot);
    applySnapshot(prevSnapshot);
    updateButtons();
    return true;
  }

  function redo() {
    if (redoStack.length === 0) return false;
    if (!captureSnapshot || !applySnapshot) return false;
    const currentSnapshot = captureSnapshot();
    const nextSnapshot = redoStack.pop();
    undoStack.push(currentSnapshot);
    applySnapshot(nextSnapshot);
    updateButtons();
    return true;
  }

  function updateButtons() {
    if (undoBtn) {
      undoBtn.disabled = undoStack.length === 0;
      undoBtn.classList.toggle("history-disabled", undoStack.length === 0);
    }
    if (redoBtn) {
      redoBtn.disabled = redoStack.length === 0;
      redoBtn.classList.toggle("history-disabled", redoStack.length === 0);
    }
  }

  function setButtons(undoBtnEl, redoBtnEl) {
    undoBtn = undoBtnEl;
    redoBtn = redoBtnEl;
    updateButtons();
  }

  function getStackSizes() {
    return {
      undo: undoStack.length,
      redo: redoStack.length,
      max: MAX_HISTORY
    };
  }

  return {
    init,
    clear,
    push,
    popLast,
    undo,
    redo,
    canUndo,
    canRedo,
    updateButtons,
    setButtons,
    getStackSizes
  };
})();

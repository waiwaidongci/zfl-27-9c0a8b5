const AppTutorial = (() => {
  let tutorialActive = false;
  let tutorialStep = 0;
  let tutorialFirstDropDone = false;
  let tutorialHintUsed = false;
  let tutorialCompletedSteps = {};
  let game = null;

  const tutorialMask = () => document.querySelector("#tutorialMask");
  const tutorialHighlight = () => document.querySelector("#tutorialHighlight");
  const tutorialTooltip = () => document.querySelector("#tutorialTooltip");
  const tutorialStepText = () => document.querySelector("#tutorialStepText");
  const tutorialTitle = () => document.querySelector("#tutorialTitle");
  const tutorialDesc = () => document.querySelector("#tutorialDesc");
  const tutorialNextBtn = () => document.querySelector("#tutorialNextBtn");
  const tutorialSkipBtn = () => document.querySelector("#tutorialSkipBtn");
  const tutorialEntryBtn = () => document.querySelector("#tutorialEntryBtn");

  const tutorialSteps = [
    {
      title: "欢迎来到古籍修补台",
      desc: "在这里，你将学习如何修补古籍残页。通过拖拽纸片到正确位置，完成残页的修复。让我们开始吧！",
      target: null,
      position: "center",
      arrow: null,
      nextText: "开始学习",
      action: "next"
    },
    {
      title: "认识右侧的纸片托盘",
      desc: "这里存放着需要修补的古籍残片。每一张纸片都有编号和文字，请试着将鼠标移到纸片上，按住并拖动它。",
      target: "#tray",
      position: "left",
      arrow: "right",
      nextText: "下一步",
      action: "next",
      waitFor: "dragStart",
      allowDrag: true
    },
    {
      title: "把纸片拖到残页上",
      desc: "将纸片拖到左侧的残页区域。当纸片靠近正确位置时，会自动吸附上去。试试拖动第一张纸片吧！",
      target: "#board",
      position: "right",
      arrow: "left",
      nextText: "我知道了",
      action: "next",
      waitFor: "firstDrop",
      allowDrag: true
    },
    {
      title: "使用提示功能",
      desc: "如果不知道纸片该放哪里，可以点击左侧的「使用提示」按钮，它会高亮显示一个尚未归位的位置。使用提示会扣减分数哦。",
      target: "#hintBtn",
      position: "right",
      arrow: "left",
      nextText: "我知道了",
      action: "next",
      waitFor: "hint"
    },
    {
      title: "完成修补，恭喜通关！",
      desc: "继续把所有纸片都拖到正确位置。全部归位后，残页就修补完成啦，届时会记录引导完成状态。",
      target: "#board",
      position: "right",
      arrow: "left",
      nextText: "完成本关后继续",
      action: "finish",
      waitFor: "win",
      allowDrag: true
    }
  ];

  function setGame(gameRef) {
    game = gameRef;
  }

  function isTutorialDone() {
    return AppStorage.isTutorialCompleted();
  }

  function markTutorialDone() {
    AppStorage.setTutorialCompleted(true);
  }

  function isActive() {
    return tutorialActive;
  }

  function getCurrentStep() {
    return tutorialSteps[tutorialStep];
  }

  function isDragAllowed() {
    if (!tutorialActive) return true;
    const step = tutorialSteps[tutorialStep];
    return step && step.allowDrag;
  }

  function isWaitForHint() {
    if (!tutorialActive) return false;
    const step = tutorialSteps[tutorialStep];
    return step && step.waitFor === "hint";
  }

  function startTutorial() {
    if (!game) return;
    tutorialActive = true;
    tutorialStep = 0;
    tutorialFirstDropDone = false;
    tutorialHintUsed = false;
    tutorialCompletedSteps = {};
    game.start(0);
    game.pauseTimer();
    const state = game.getState();
    game.setState({ time: state.totalTime, score: 1000 });
    game.updateHud();
    showTutorialStep(0);
  }

  function showTutorialStep(stepIdx) {
    tutorialStep = stepIdx;
    const step = tutorialSteps[stepIdx];

    const stepEl = tutorialStepText();
    const titleEl = tutorialTitle();
    const descEl = tutorialDesc();
    const nextBtnEl = tutorialNextBtn();
    const tooltipEl = tutorialTooltip();
    const maskEl = tutorialMask();
    const highlightEl = tutorialHighlight();

    stepEl.textContent = "第 " + (stepIdx + 1) + " 步 / 共 " + tutorialSteps.length + " 步";
    titleEl.textContent = step.title;
    descEl.textContent = step.desc;
    nextBtnEl.textContent = step.nextText;
    nextBtnEl.disabled = isTutorialStepWaiting(step);

    tooltipEl.classList.remove("hidden");
    maskEl.classList.add("active");
    highlightEl.classList.remove("hidden");
    tooltipEl.classList.remove("arrow-bottom", "arrow-top", "arrow-left", "arrow-right");

    if (step.arrow) {
      tooltipEl.classList.add("arrow-" + step.arrow);
    }

    if (step.target) {
      const targetEl = document.querySelector(step.target);
      if (targetEl) {
        positionHighlight(targetEl);
        positionTooltip(targetEl, step.position);
      }
    } else {
      positionCenter();
    }

    updateTutorialControls();
  }

  function positionHighlight(el) {
    const rect = el.getBoundingClientRect();
    const padding = 8;
    const highlightEl = tutorialHighlight();
    highlightEl.style.left = (rect.left - padding) + "px";
    highlightEl.style.top = (rect.top - padding) + "px";
    highlightEl.style.width = (rect.width + padding * 2) + "px";
    highlightEl.style.height = (rect.height + padding * 2) + "px";
  }

  function positionTooltip(el, position) {
    const rect = el.getBoundingClientRect();
    const tooltipEl = tutorialTooltip();
    const tooltipRect = tooltipEl.getBoundingClientRect();
    let left, top;
    const offset = 16;

    switch (position) {
      case "left":
        left = rect.left - tooltipRect.width - offset;
        top = rect.top + rect.height / 2 - tooltipRect.height / 2;
        break;
      case "right":
        left = rect.right + offset;
        top = rect.top + rect.height / 2 - tooltipRect.height / 2;
        break;
      case "top":
        left = rect.left + rect.width / 2 - tooltipRect.width / 2;
        top = rect.top - tooltipRect.height - offset;
        break;
      case "bottom":
        left = rect.left + rect.width / 2 - tooltipRect.width / 2;
        top = rect.bottom + offset;
        break;
    }

    left = Math.max(16, Math.min(left, window.innerWidth - tooltipRect.width - 16));
    top = Math.max(16, Math.min(top, window.innerHeight - tooltipRect.height - 16));

    tooltipEl.style.left = left + "px";
    tooltipEl.style.top = top + "px";
  }

  function positionCenter() {
    const highlightEl = tutorialHighlight();
    highlightEl.style.left = "-9999px";
    highlightEl.style.top = "-9999px";
    highlightEl.style.width = "0";
    highlightEl.style.height = "0";

    const tooltipEl = tutorialTooltip();
    const tooltipRect = tooltipEl.getBoundingClientRect();
    tooltipEl.style.left = (window.innerWidth / 2 - tooltipRect.width / 2) + "px";
    tooltipEl.style.top = (window.innerHeight / 2 - tooltipRect.height / 2) + "px";
  }

  function nextTutorialStep() {
    const step = tutorialSteps[tutorialStep];

    if (isTutorialStepWaiting(step)) return;

    if (step.action === "finish") {
      endTutorial();
      return;
    }

    if (tutorialStep < tutorialSteps.length - 1) {
      showTutorialStep(tutorialStep + 1);
    } else {
      endTutorial();
    }
  }

  function completeTutorialStep(expectedWait) {
    if (!tutorialActive) return;
    const step = tutorialSteps[tutorialStep];
    if (step.waitFor !== expectedWait) return;
    tutorialCompletedSteps[tutorialStep] = true;
    updateTutorialControls();
  }

  function updateTutorialControls() {
    const step = tutorialSteps[tutorialStep];
    const nextBtnEl = tutorialNextBtn();
    nextBtnEl.disabled = isTutorialStepWaiting(step);
  }

  function isTutorialStepWaiting(step) {
    return Boolean(step && step.waitFor && !tutorialCompletedSteps[tutorialStep]);
  }

  function endTutorial() {
    tutorialActive = false;
    tutorialTooltip().classList.add("hidden");
    tutorialMask().classList.remove("active");
    tutorialHighlight().classList.add("hidden");
    markTutorialDone();
    if (game) {
      game.resumeTimer();
    }
  }

  function skipTutorial() {
    tutorialActive = false;
    tutorialTooltip().classList.add("hidden");
    tutorialMask().classList.remove("active");
    tutorialHighlight().classList.add("hidden");
    markTutorialDone();
    if (game) {
      game.resumeTimer();
    }
  }

  function onDragStart() {
    if (!tutorialActive) return;
    const step = tutorialSteps[tutorialStep];
    if (step.waitFor === "dragStart") {
      completeTutorialStep("dragStart");
      setTimeout(() => {
        if (tutorialStep === 1) {
          nextTutorialStep();
        }
      }, 500);
    }
  }

  function onFirstDrop() {
    if (!tutorialActive) return;
    if (tutorialFirstDropDone) return;
    tutorialFirstDropDone = true;
    const step = tutorialSteps[tutorialStep];
    if (step.waitFor === "firstDrop") {
      completeTutorialStep("firstDrop");
      setTimeout(() => {
        if (tutorialStep === 2) {
          nextTutorialStep();
        }
      }, 800);
    }
  }

  function onHint() {
    if (!tutorialActive) return;
    if (tutorialHintUsed) return;
    tutorialHintUsed = true;
    const step = tutorialSteps[tutorialStep];
    if (step.waitFor === "hint") {
      completeTutorialStep("hint");
      setTimeout(() => {
        if (tutorialStep === 3) {
          nextTutorialStep();
        }
      }, 1200);
    }
  }

  function onWin() {
    if (!tutorialActive) return;
    completeTutorialStep("win");
    endTutorial();
  }

  function bindUI() {
    const nextBtnEl = tutorialNextBtn();
    const skipBtnEl = tutorialSkipBtn();
    const entryBtnEl = tutorialEntryBtn();

    if (nextBtnEl) nextBtnEl.onclick = () => nextTutorialStep();
    if (skipBtnEl) skipBtnEl.onclick = () => skipTutorial();
    if (entryBtnEl) entryBtnEl.onclick = () => startTutorial();

    window.addEventListener("resize", () => {
      if (!tutorialActive) return;
      const step = tutorialSteps[tutorialStep];
      if (step.target) {
        const targetEl = document.querySelector(step.target);
        if (targetEl) {
          positionHighlight(targetEl);
          positionTooltip(targetEl, step.position);
        }
      } else {
        positionCenter();
      }
    });
  }

  function maybeAutoStart() {
    if (!isTutorialDone()) {
      setTimeout(() => startTutorial(), 300);
    }
  }

  return {
    setGame,
    isActive,
    getCurrentStep,
    isDragAllowed,
    isWaitForHint,
    startTutorial,
    bindUI,
    maybeAutoStart,
    onDragStart,
    onFirstDrop,
    onHint,
    onWin
  };
})();

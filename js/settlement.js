const AppSettlement = (() => {
  let errorAttempts = 0;
  let toolUsage = {};
  let baseScore = 0;
  let timeBonus = 0;
  let finalScore = 0;
  let usedTime = 0;
  let totalTime = 0;
  let win = false;
  let hintUsed = false;
  let rating = "";

  function reset() {
    errorAttempts = 0;
    toolUsage = {};
    baseScore = 0;
    timeBonus = 0;
    finalScore = 0;
    usedTime = 0;
    totalTime = 0;
    win = false;
    hintUsed = false;
    rating = "";
  }

  function incrementErrorAttempts() {
    errorAttempts++;
  }

  function getErrorAttempts() {
    return errorAttempts;
  }

  function setToolUsage(usage) {
    toolUsage = { ...usage };
  }

  function calculateRating() {
    if (!win) {
      rating = "未完成";
      return rating;
    }
    if (finalScore >= 1500) {
      rating = "完美修补 ★★★";
    } else if (finalScore >= 1200) {
      rating = "优秀修补 ★★☆";
    } else if (finalScore >= 900) {
      rating = "良好修补 ★☆☆";
    } else if (finalScore >= 600) {
      rating = "合格修补";
    } else {
      rating = "勉强完成";
    }
    return rating;
  }

  function computeScore(options) {
    const {
      baseScore: base,
      timeRemaining,
      timeLimit,
      pieceCount,
      lockedCount,
      errorPenalty = 50,
      toolPenalty = 10,
      hintPenalty = 80
    } = options;

    baseScore = base;
    usedTime = timeLimit - timeRemaining;
    totalTime = timeLimit;

    const timeRatio = timeRemaining / timeLimit;
    timeBonus = Math.floor(200 * timeRatio);

    const errorPenaltyTotal = errorAttempts * errorPenalty;

    const totalToolUses = Object.values(toolUsage).reduce((a, b) => a + b, 0);
    const toolPenaltyTotal = Math.floor(totalToolUses * toolPenalty * 0.5);

    const hintPenaltyTotal = hintUsed ? hintPenalty : 0;

    finalScore = Math.max(0, baseScore + timeBonus - errorPenaltyTotal - toolPenaltyTotal - hintPenaltyTotal);

    return finalScore;
  }

  function setWin(isWin) {
    win = isWin;
    calculateRating();
  }

  function setHintUsed(used) {
    hintUsed = used;
  }

  function getRating() {
    return rating;
  }

  function getFinalScore() {
    return finalScore;
  }

  function getToolUsageDetails() {
    const names = {
      rotateCw: "顺时针旋转",
      rotateCcw: "逆时针旋转",
      flip: "水平翻面",
      zoom: "放大观察",
      edgeAlign: "边缘对齐辅助"
    };
    const details = [];
    Object.keys(toolUsage).forEach(id => {
      if (toolUsage[id] > 0) {
        details.push({ id, name: names[id] || id, count: toolUsage[id] });
      }
    });
    return details;
  }

  function renderResult(container, options) {
    const {
      score,
      usedTime: ut,
      totalTime: tt,
      hintUsed: hu,
      win: w,
      puzzleName
    } = options;

    finalScore = score;
    usedTime = ut;
    totalTime = tt;
    hintUsed = hu;
    win = w;
    calculateRating();

    let html = `
      <div class="settlement-header">
        <div class="settlement-title">${win ? "🎉 修补完成" : "⏰ 时间耗尽"}</div>
        ${puzzleName ? `<div class="settlement-puzzle">${puzzleName}</div>` : ""}
        <div class="settlement-rating ${win ? "" : "fail"}">${rating}</div>
      </div>
    `;

    html += '<div class="settlement-section">';
    html += '<div class="settlement-section-title">核心数据</div>';
    html += '<div class="settlement-grid">';
    html += `<div class="settlement-item"><span class="settlement-label">最终得分</span><span class="settlement-value score">${finalScore}</span></div>`;
    html += `<div class="settlement-item"><span class="settlement-label">用时</span><span class="settlement-value">${usedTime}秒</span></div>`;
    html += `<div class="settlement-item"><span class="settlement-label">错误尝试</span><span class="settlement-value error">${errorAttempts}次</span></div>`;
    html += `<div class="settlement-item"><span class="settlement-label">使用提示</span><span class="settlement-value">${hintUsed ? "是" : "否"}</span></div>`;
    html += '</div></div>';

    const toolDetails = getToolUsageDetails();
    if (toolDetails.length > 0) {
      html += '<div class="settlement-section">';
      html += '<div class="settlement-section-title">工具使用</div>';
      html += '<div class="settlement-grid">';
      toolDetails.forEach(item => {
        html += `<div class="settlement-item"><span class="settlement-label">${item.name}</span><span class="settlement-value">${item.count}次</span></div>`;
      });
      html += '</div></div>';
    }

    if (win) {
      html += '<div class="settlement-section">';
      html += '<div class="settlement-section-title">评分构成</div>';
      html += '<div class="settlement-breakdown">';
      html += `<div class="breakdown-row"><span>基础分</span><span>+${baseScore || score}</span></div>`;
      if (timeBonus > 0) {
        html += `<div class="breakdown-row"><span>时间奖励</span><span>+${timeBonus}</span></div>`;
      }
      if (errorAttempts > 0) {
        html += `<div class="breakdown-row negative"><span>错误扣分(${errorAttempts}次)</span><span>-${errorAttempts * 50}</span></div>`;
      }
      const totalToolUses = Object.values(toolUsage).reduce((a, b) => a + b, 0);
      if (totalToolUses > 0) {
        const toolPenalty = Math.floor(totalToolUses * 10 * 0.5);
        html += `<div class="breakdown-row negative"><span>工具使用扣分</span><span>-${toolPenalty}</span></div>`;
      }
      if (hintUsed) {
        html += `<div class="breakdown-row negative"><span>提示扣分</span><span>-80</span></div>`;
      }
      html += `<div class="breakdown-row total"><span>最终得分</span><span>${finalScore}</span></div>`;
      html += '</div></div>';
    }

    container.innerHTML = html;
  }

  function getStats() {
    return {
      errorAttempts,
      toolUsage: { ...toolUsage },
      finalScore,
      rating,
      usedTime,
      win,
      hintUsed
    };
  }

  function generateColophon() {
    if (!win) return "";
    return AppLibrary.generateColophon(rating, hintUsed, usedTime);
  }

  return {
    reset,
    incrementErrorAttempts,
    getErrorAttempts,
    setToolUsage,
    computeScore,
    setWin,
    setHintUsed,
    getRating,
    getFinalScore,
    getToolUsageDetails,
    renderResult,
    getStats,
    generateColophon
  };
})();

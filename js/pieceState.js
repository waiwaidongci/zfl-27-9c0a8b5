const AppPieceState = (() => {
  const ROTATION_STEP = 90;
  const ROTATION_OPTIONS = [0, 90, 180, 270];

  function createPieceState(id, options = {}) {
    return {
      id,
      rotation: options.rotation || 0,
      flipped: options.flipped || false,
      locked: false,
      col: options.col || 0,
      row: options.row || 0,
      label: options.label || ""
    };
  }

  function rotatePiece(piece, direction = 1) {
    if (piece.locked) return piece.rotation;
    const currentIdx = ROTATION_OPTIONS.indexOf(piece.rotation);
    const nextIdx = (currentIdx + direction + ROTATION_OPTIONS.length) % ROTATION_OPTIONS.length;
    piece.rotation = ROTATION_OPTIONS[nextIdx];
    return piece.rotation;
  }

  function flipPiece(piece) {
    if (piece.locked) return piece.flipped;
    piece.flipped = !piece.flipped;
    return piece.flipped;
  }

  function isOrientationCorrect(piece, puzzleConfig) {
    const requireRotation = puzzleConfig.enableRotation !== false;
    const requireFlip = puzzleConfig.enableFlip === true;

    let rotationCorrect = true;
    let flipCorrect = true;

    if (requireRotation) {
      rotationCorrect = piece.rotation === 0;
    }
    if (requireFlip) {
      flipCorrect = !piece.flipped;
    }

    return rotationCorrect && flipCorrect;
  }

  function isPieceCorrect(piece, puzzleConfig) {
    if (!piece.locked) return false;
    return isOrientationCorrect(piece, puzzleConfig);
  }

  function applyTransformToElement(el, piece) {
    const scaleX = piece.flipped ? -1 : 1;
    el.style.transform = `rotate(${piece.rotation}deg) scaleX(${scaleX})`;
    el.style.transition = "transform 0.25s ease";
  }

  function randomizeOrientation(piece, puzzleConfig) {
    if (puzzleConfig.initialRotationScrambled) {
      const rotations = [0, 90, 180, 270];
      piece.rotation = rotations[Math.floor(Math.random() * rotations.length)];
    }
    if (puzzleConfig.initialFlipScrambled) {
      piece.flipped = Math.random() > 0.5;
    }
    return piece;
  }

  function canRotate(puzzleConfig) {
    return puzzleConfig.enableRotation !== false;
  }

  function canFlip(puzzleConfig) {
    return puzzleConfig.enableFlip === true;
  }

  return {
    createPieceState,
    rotatePiece,
    flipPiece,
    isOrientationCorrect,
    isPieceCorrect,
    applyTransformToElement,
    randomizeOrientation,
    canRotate,
    canFlip,
    ROTATION_STEP
  };
})();

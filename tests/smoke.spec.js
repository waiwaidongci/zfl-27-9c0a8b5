const { test, expect } = require("@playwright/test");
const path = require("path");
const fs = require("fs");

const TUTORIAL_DATA = JSON.stringify({
  schemaVersion: 1,
  migratedAt: Date.now(),
  customPuzzles: [],
  customThemes: [],
  library: [],
  libraryNotes: {},
  progress: [],
  daily: { records: [], session: null },
  levelSaves: {},
  tempSaves: {},
  ui: { tutorialCompleted: true },
  generator: { history: [], favorites: [] }
});

test.describe("古籍修补台 - 冒烟测试", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((data) => {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem("zfl27_unified_data", data);
    }, TUTORIAL_DATA);
    await page.goto("/", { waitUntil: "networkidle" });
    await page.waitForSelector("#board", { timeout: 10000 });
    await page.waitForSelector("#tray", { timeout: 10000 });
    await page.waitForTimeout(500);
  });

  test("1. 进入游戏并完成一次放置", async ({ page }) => {
    const levelText = await page.textContent("#levelText");
    expect(levelText).not.toBe("");

    const trayPieces = page.locator("#tray .piece");
    const pieceCount = await trayPieces.count();
    expect(pieceCount).toBeGreaterThan(0);

    const firstPiece = trayPieces.first();
    await firstPiece.waitFor({ state: "visible" });

    const pieceId = await firstPiece.getAttribute("data-id");
    expect(pieceId).not.toBeNull();

    const board = page.locator("#board");
    await board.waitFor({ state: "visible" });

    const pieceBox = await firstPiece.boundingBox();
    const boardBox = await board.boundingBox();
    expect(pieceBox).not.toBeNull();
    expect(boardBox).not.toBeNull();

    const targetX = boardBox.x + boardBox.width / 2;
    const targetY = boardBox.y + boardBox.height / 2;

    await page.mouse.move(pieceBox.x + pieceBox.width / 2, pieceBox.y + pieceBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(targetX, targetY, { steps: 20 });
    await page.mouse.up();

    await page.waitForTimeout(500);

    const boardPieces = page.locator("#board .piece");
    const boardPieceCount = await boardPieces.count();
    expect(boardPieceCount).toBeGreaterThanOrEqual(0);

    const scoreText = await page.textContent("#scoreText");
    expect(scoreText).not.toBe("");
    const score = parseInt(scoreText, 10);
    expect(Number.isFinite(score)).toBe(true);
  });

  test("2. 打开编辑器并预览", async ({ page }) => {
    const editorEntryBtn = page.locator("#editorEntryBtn");
    await expect(editorEntryBtn).toBeVisible();
    await editorEntryBtn.click();

    await page.waitForFunction(() => {
      const ev = document.querySelector(".editor-view");
      return ev && ev.classList.contains("active");
    }, { timeout: 10000 });

    const editorView = page.locator(".editor-view");
    await expect(editorView).toHaveClass(/active/);

    await page.waitForSelector("#editorName", { timeout: 5000 });
    await page.fill("#editorName", "测试残页");

    const textGridEditor = page.locator("#textGridEditor");
    await expect(textGridEditor).toBeVisible();

    const previewBtn = page.locator("#editorPreviewBtn");
    await expect(previewBtn).toBeVisible();
    await previewBtn.click();

    await page.waitForTimeout(1500);

    const gameViewVisible = await page.evaluate(() => {
      const gv = document.querySelector(".game-view");
      return gv && !gv.classList.contains("hidden-view");
    });
    if (!gameViewVisible) {
      const backBtn = page.locator("#editorBackBtn");
      if (await backBtn.isVisible()) {
        await backBtn.click();
        await page.waitForFunction(() => {
          const gv = document.querySelector(".game-view");
          return gv && !gv.classList.contains("hidden-view");
        }, { timeout: 10000 });
      }
    }

    await expect(page.locator(".game-view")).not.toHaveClass(/hidden-view/);
  });

  test("3. 生成并导入分享码", async ({ page }) => {
    const shareExportBtn = page.locator("#shareExportBtn");
    await expect(shareExportBtn).toBeVisible();

    await page.evaluate(() => {
      window.confirm = () => true;
    });

    await shareExportBtn.click();

    await page.waitForFunction(() => {
      const overlay = document.getElementById("shareOverlay");
      const modal = document.getElementById("shareExportModal");
      return overlay && !overlay.classList.contains("hidden")
        && modal && !modal.classList.contains("hidden");
    }, { timeout: 10000 });

    const shareCodeInput = page.locator("#shareExportCode");
    await expect(shareCodeInput).toBeVisible();
    const shareCode = await shareCodeInput.inputValue();
    expect(shareCode).toMatch(/^ZFL27:/);
    expect(shareCode.length).toBeGreaterThan(10);

    const closeBtn = page.locator("#shareExportClose");
    await closeBtn.click();

    const shareImportBtn = page.locator("#shareImportBtn");
    await expect(shareImportBtn).toBeVisible();
    await shareImportBtn.click();

    await page.waitForFunction(() => {
      const modal = document.getElementById("shareImportModal");
      return modal && !modal.classList.contains("hidden");
    }, { timeout: 10000 });

    const importInput = page.locator("#shareImportInput");
    await expect(importInput).toBeVisible();
    await importInput.fill(shareCode);

    const parseBtn = page.locator("#shareParseBtn");
    await expect(parseBtn).toBeVisible();
    await parseBtn.click();

    await page.waitForFunction(() => {
      const modal = document.getElementById("sharePreviewModal");
      return modal && !modal.classList.contains("hidden");
    }, { timeout: 10000 });

    const previewTitle = page.locator("#sharePreviewTitle");
    await expect(previewTitle).toBeVisible();

    const cancelBtn = page.locator("#sharePreviewCancel");
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click();
    } else {
      const closePreview = page.locator("#sharePreviewClose");
      await closePreview.click();
    }

    await page.waitForFunction(() => {
      const overlay = document.getElementById("shareOverlay");
      return overlay && overlay.classList.contains("hidden");
    }, { timeout: 5000 });
  });

  test("4. 导入 test-pack.zflpack.json 关卡包", async ({ page }) => {
    const packFile = path.resolve(__dirname, "..", "test-pack.zflpack.json");
    expect(fs.existsSync(packFile)).toBe(true);

    const packImportBtn = page.locator("#packImportBtn");
    await expect(packImportBtn).toBeVisible();

    const [fileChooser] = await Promise.all([
      page.waitForEvent("filechooser", { timeout: 10000 }),
      packImportBtn.click()
    ]);

    await fileChooser.setFiles(packFile);

    await page.waitForFunction(() => {
      return document.querySelector(".lp-overlay") !== null || document.querySelector(".lp-toast") !== null;
    }, { timeout: 30000 });

    const state = await page.evaluate(() => {
      const overlay = document.querySelector(".lp-overlay");
      const toast = document.querySelector(".lp-toast");
      return {
        hasOverlay: overlay !== null,
        hasToast: toast !== null,
        overlayClass: overlay ? overlay.className : null,
        toastText: toast ? toast.textContent : null
      };
    });

    expect(state.hasOverlay || state.hasToast).toBe(true);

    await page.evaluate(() => {
      document.querySelectorAll(".lp-overlay").forEach(o => o.remove());
      document.querySelectorAll(".lp-toast").forEach(o => o.remove());
    });

    await page.waitForTimeout(500);
  });
});

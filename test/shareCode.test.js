global.atob = (str) => Buffer.from(str, "base64").toString("binary");
global.btoa = (str) => Buffer.from(str, "binary").toString("base64");

const fs = require("fs");
const path = require("path");

const src = fs.readFileSync(path.join(__dirname, "..", "js", "shareCode.js"), "utf8");
let ShareCode;
const fn = new Function("atob", src + "\nreturn ShareCode;");
ShareCode = fn(global.atob);

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, msg) {
  if (condition) {
    passed++;
  } else {
    failed++;
    failures.push(msg);
  }
}

function assertEqual(actual, expected, msg) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    passed++;
  } else {
    failed++;
    failures.push(`${msg} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertIncludes(arr, item, msg) {
  if (typeof arr === "string" && arr.includes(item)) {
    passed++;
  } else if (Array.isArray(arr) && arr.includes(item)) {
    passed++;
  } else {
    failed++;
    failures.push(`${msg} — expected to include ${JSON.stringify(item)}, got ${JSON.stringify(arr)}`);
  }
}

function assertNotHasOwnKey(obj, key, msg) {
  if (!obj || !Object.prototype.hasOwnProperty.call(obj, key)) {
    passed++;
  } else {
    failed++;
    failures.push(`${msg} — object should NOT have own key "${key}", but it does: ${JSON.stringify(obj[key])}`);
  }
}

function makePuzzle(overrides) {
  return {
    name: "测试残页",
    cols: 3,
    rows: 2,
    text: ["春", "风", "拂", "柳", "岸", "边"],
    theme: { paper: "xuanzhi", ink: "mohei", border: "none", table: "base" },
    timeLimit: 120,
    hintPenalty: 80,
    scatterRule: "random",
    enableRotation: false,
    enableFlip: false,
    initialRotationScrambled: false,
    initialFlipScrambled: false,
    availableTools: ["zoom", "edgeAlign"],
    ...overrides
  };
}

function makeDaily(overrides) {
  return {
    puzzle: makePuzzle(),
    score: 1500,
    usedTime: 60,
    hintUsed: false,
    completed: true,
    rating: "完美修补 ★★★",
    dailyDate: "2025-06-20",
    ...overrides
  };
}

console.log("=== ShareCode 纯逻辑测试 ===\n");

console.log("--- 1. 普通残页编码解码往返 ---");
{
  const puzzle = makePuzzle();
  const enc = ShareCode.encodePuzzle(puzzle);
  assert(enc.ok, "encodePuzzle 应成功");
  assert(typeof enc.code === "string" && enc.code.length > 0, "应生成非空分享码");
  assert(enc.code.startsWith("ZFL27:"), "分享码应以 ZFL27: 开头");

  const dec = ShareCode.decode(enc.code);
  assert(dec.ok, "decode 应成功");
  assertEqual(dec.type, "puzzle", "类型应为 puzzle");

  const d = dec.data;
  assertEqual(d.name, puzzle.name, "名称往返一致");
  assertEqual(d.cols, puzzle.cols, "列数往返一致");
  assertEqual(d.rows, puzzle.rows, "行数往返一致");
  assertEqual(d.text, puzzle.text, "文字往返一致");
  assertEqual(d.theme, puzzle.theme, "主题往返一致");
  assertEqual(d.timeLimit, puzzle.timeLimit, "时间限制往返一致");
  assertEqual(d.hintPenalty, puzzle.hintPenalty, "提示扣分往返一致");
  assertEqual(d.scatterRule, puzzle.scatterRule, "散落规则往返一致");
  assertEqual(d.enableRotation, puzzle.enableRotation, "旋转开关往返一致");
  assertEqual(d.enableFlip, puzzle.enableFlip, "翻转开关往返一致");
  assertEqual(d.availableTools, puzzle.availableTools, "可用工具往返一致");
}

console.log("--- 2. 普通残页带可选字段往返 ---");
{
  const puzzle = makePuzzle({
    customColors: { paperColor: "#f5f5f0", inkColor: "#2b2b2b", tableColor: "#8B4513" },
    enableRotation: true,
    initialRotationScrambled: true,
    availableTools: ["zoom", "edgeAlign", "rotateCw", "rotateCcw"]
  });
  const enc = ShareCode.encodePuzzle(puzzle, { author: "张三", source: "测试源", note: "测试备注" });
  assert(enc.ok, "带可选字段编码应成功");

  const dec = ShareCode.decode(enc.code);
  assert(dec.ok, "带可选字段解码应成功");
  assertEqual(dec.data.customColors.paperColor, "#f5f5f0", "自定义纸色往返");
  assertEqual(dec.data.customColors.inkColor, "#2b2b2b", "自定义墨色往返");
  assertEqual(dec.data.customColors.tableColor, "#8B4513", "自定义台色往返");
  assertEqual(dec.data.author, "张三", "作者往返");
  assertEqual(dec.data.source, "测试源", "来源往返");
  assertEqual(dec.data.note, "测试备注", "备注往返");
  assertEqual(dec.data.enableRotation, true, "旋转启用往返");
  assertEqual(dec.data.initialRotationScrambled, true, "旋转打乱往返");
}

console.log("--- 3. 每日挑战编码解码往返 ---");
{
  const daily = makeDaily();
  const enc = ShareCode.encodeDailyResult(daily);
  assert(enc.ok, "encodeDailyResult 应成功");
  assert(enc.code.startsWith("ZFL27:v1:D:"), "每日分享码类型标记应为 D");

  const dec = ShareCode.decode(enc.code);
  assert(dec.ok, "每日挑战解码应成功");
  assertEqual(dec.type, "daily", "类型应为 daily");

  const d = dec.data;
  assertEqual(d.score, daily.score, "分数往返");
  assertEqual(d.usedTime, daily.usedTime, "用时往返");
  assertEqual(d.hintUsed, daily.hintUsed, "提示使用往返");
  assertEqual(d.completed, daily.completed, "完成状态往返");
  assertEqual(d.rating, daily.rating, "评级往返");
  assertEqual(d.dailyDate, daily.dailyDate, "日期往返");
  assert(d.puzzle, "应包含 puzzle 字段");
  assertEqual(d.puzzle.name, daily.puzzle.name, "每日谜题名称往返");
}

console.log("--- 4. 每日挑战未完成场景 ---");
{
  const daily = makeDaily({ score: 0, usedTime: 30, hintUsed: true, completed: false, rating: "", dailyDate: "2025-01-01" });
  const enc = ShareCode.encodeDailyResult(daily);
  assert(enc.ok, "未完成每日编码应成功");

  const dec = ShareCode.decode(enc.code);
  assert(dec.ok, "未完成每日解码应成功");
  assertEqual(dec.data.completed, false, "未完成状态往返");
  assertEqual(dec.data.hintUsed, true, "使用了提示往返");
}

console.log("--- 5. 非法分享码报错 ---");
{
  let r;

  r = ShareCode.decode("");
  assert(!r.ok, "空字符串应报错");
  assertIncludes(r.error, "为空", "空字符串错误信息");

  r = ShareCode.decode(null);
  assert(!r.ok, "null 应报错");

  r = ShareCode.decode(undefined);
  assert(!r.ok, "undefined 应报错");

  r = ShareCode.decode("   ");
  assert(!r.ok, "纯空白应报错");

  r = ShareCode.decode("ABCDEF:v1:P:xyz:1234");
  assert(!r.ok, "错误前缀应报错");

  r = ShareCode.decode("ZFL27:x1:P:xyz:1234");
  assert(!r.ok, "错误版本格式应报错");

  r = ShareCode.decode("ZFL27:v1:X:xyz:1234");
  assert(!r.ok, "未知类型应报错");

  r = ShareCode.decode("ZFL27:v1:P:xyz:00000000");
  assert(!r.ok, "校验和不匹配应报错");
  assertEqual(r.stage, "checksum", "校验和不匹配应标记为 checksum 阶段");

  r = ShareCode.decode("ZFL27:v2:P:xyz:1234");
  assert(!r.ok, "版本过新应报错");

  r = ShareCode.decode("ZFL27:v1:P:short");
  assert(!r.ok, "段数不足应报错");

  const longCode = "ZFL27:v1:P:" + "a".repeat(25000) + ":abcd1234";
  r = ShareCode.decode(longCode);
  assert(!r.ok, "超长分享码应报错");
  assertEqual(r.stage, "format", "超长码应在 format 阶段报错");
}

console.log("--- 6. 篡改内容报错 ---");
{
  const puzzle = makePuzzle();
  const enc = ShareCode.encodePuzzle(puzzle);
  const code = enc.code;
  const tampered = code.slice(0, -5) + "XXXXX";
  const dec = ShareCode.decode(tampered);
  assert(!dec.ok, "篡改分享码应解码失败");
  assertEqual(dec.stage, "checksum", "篡改码应在 checksum 阶段失败");
}

console.log("--- 7. 超长字段截断 ---");
{
  const longName = "超".repeat(100);
  const longText = Array.from({ length: 30 }, (_, i) => "字".repeat(30) + i);
  const puzzle = makePuzzle({ name: longName, text: longText });
  const enc = ShareCode.encodePuzzle(puzzle);
  assert(enc.ok, "超长字段编码应成功");

  const dec = ShareCode.decode(enc.code);
  assert(dec.ok, "超长字段解码应成功");
  assert(dec.data.name.length <= 50, "名称应被截断到50字符");
  assert(dec.data.text.length <= 6, "文字片段数应被截断到 cols*rows");
  dec.data.text.forEach((t, i) => {
    assert(t.length <= 20, `文字片段[${i}]应被截断到20字符，实际长度${t.length}`);
  });
  assert(dec.wasTruncated === true || dec.warnings.length > 0, "应有截断警告");
}

console.log("--- 8. 超长作者/来源/备注截断 ---");
{
  const puzzle = makePuzzle();
  const enc = ShareCode.encodePuzzle(puzzle, {
    author: "A".repeat(200),
    source: "S".repeat(200),
    note: "N".repeat(500)
  });
  assert(enc.ok, "超长可选字段编码应成功");
  const dec = ShareCode.decode(enc.code);
  assert(dec.ok, "超长可选字段解码应成功");
  assert(dec.data.author.length <= 50, "作者应被截断到50字符");
  assert(dec.data.source.length <= 50, "来源应被截断到50字符");
  assert(dec.data.note.length <= 200, "备注应被截断到200字符");
}

console.log("--- 9. 未知主题回退 ---");
{
  const puzzle = makePuzzle({
    theme: { paper: "unknown_paper", ink: "unknown_ink", border: "unknown_border", table: "unknown_table" }
  });
  const enc = ShareCode.encodePuzzle(puzzle);
  assert(enc.ok, "未知主题编码应成功");

  const dec = ShareCode.decode(enc.code);
  assert(dec.ok, "未知主题解码应成功");
  assertEqual(dec.data.theme.paper, "xuanzhi", "未知纸张应回退到宣纸");
  assertEqual(dec.data.theme.ink, "mohei", "未知墨色应回退到墨黑");
  assertEqual(dec.data.theme.border, "none", "未知边框应回退到无");
  assertEqual(dec.data.theme.table, "base", "未知台面应回退到基础");
  assert(dec.warnings.length >= 4, "应有4个主题回退警告");
}

console.log("--- 10. 主题部分未知 ---");
{
  const puzzle = makePuzzle({
    theme: { paper: "xuanzhi", ink: "bad_ink", border: "torn", table: "bad_table" }
  });
  const enc = ShareCode.encodePuzzle(puzzle);
  const dec = ShareCode.decode(enc.code);
  assertEqual(dec.data.theme.paper, "xuanzhi", "合法纸张应保留");
  assertEqual(dec.data.theme.ink, "mohei", "非法墨色应回退");
  assertEqual(dec.data.theme.border, "torn", "合法边框应保留");
  assertEqual(dec.data.theme.table, "base", "非法台面应回退");
}

console.log("--- 11. 自定义颜色校验 ---");
{
  const puzzle = makePuzzle({
    customColors: {
      paperColor: "#aabbcc",
      inkColor: "#112233",
      tableColor: "#ddeeff"
    }
  });
  const enc = ShareCode.encodePuzzle(puzzle);
  const dec = ShareCode.decode(enc.code);
  assert(dec.ok, "合法自定义颜色应成功");
  assert(dec.data.customColors, "应保留 customColors");
  assertEqual(dec.data.customColors.paperColor, "#aabbcc", "合法纸色应保留");
  assertEqual(dec.data.customColors.inkColor, "#112233", "合法墨色应保留");
  assertEqual(dec.data.customColors.tableColor, "#ddeeff", "合法台色应保留");
}

console.log("--- 12. 非法自定义颜色被过滤 ---");
{
  const puzzle = makePuzzle({
    customColors: {
      paperColor: "not-a-color",
      inkColor: "#123",
      tableColor: "#gggggg",
    }
  });
  const enc = ShareCode.encodePuzzle(puzzle);
  const dec = ShareCode.decode(enc.code);
  assert(dec.ok, "非法颜色编码解码应成功");
  assertNotHasOwnKey(dec.data.customColors || {}, "paperColor", "非法纸色应被过滤");
  assertNotHasOwnKey(dec.data.customColors || {}, "inkColor", "3位hex色应被过滤");
  assertNotHasOwnKey(dec.data.customColors || {}, "tableColor", "含非hex字符色应被过滤");
}

console.log("--- 13. 自定义颜色部分合法 ---");
{
  const puzzle = makePuzzle({
    customColors: {
      paperColor: "#ff0000",
      inkColor: "bad",
      tableColor: "#00ff00"
    }
  });
  const enc = ShareCode.encodePuzzle(puzzle);
  const dec = ShareCode.decode(enc.code);
  assert(dec.ok, "部分合法颜色应成功");
  assertEqual(dec.data.customColors.paperColor, "#ff0000", "合法纸色保留");
  assertEqual(dec.data.customColors.tableColor, "#00ff00", "合法台色保留");
  assertNotHasOwnKey(dec.data.customColors, "inkColor", "非法墨色被过滤");
}

console.log("--- 14. __proto__ 及危险字段过滤 ---");
{
  const malicious = makePuzzle();
  Object.defineProperty(malicious, "__proto__", {
    value: { polluted: true },
    enumerable: true,
    configurable: true
  });
  malicious.constructor = { danger: true };
  malicious["__defineGetter__"] = { danger: true };
  malicious["__lookupSetter__"] = { danger: true };

  const enc = ShareCode.encodePuzzle(malicious);
  const dec = ShareCode.decode(enc.code);
  assert(dec.ok, "含危险字段的puzzle应可解码");
  assertNotHasOwnKey(dec.data, "__proto__", "__proto__ 应被过滤");
  assertNotHasOwnKey(dec.data, "constructor", "constructor 应被过滤");
  assertNotHasOwnKey(dec.data, "__defineGetter__", "__defineGetter__ 应被过滤");
  assertNotHasOwnKey(dec.data, "__lookupSetter__", "__lookupSetter__ 应被过滤");
  assertNotHasOwnKey(dec.data, "polluted", "原型链污染属性不应出现");
}

console.log("--- 15. 解码时嵌入的 __proto__ 被过滤 ---");
{
  const puzzle = makePuzzle();
  const enc = ShareCode.encodePuzzle(puzzle);
  const code = enc.code;
  const parts = code.split(":");
  const payload = parts[3];

  const maliciousObj = Object.create(null);
  maliciousObj.__proto__ = { admin: true };
  maliciousObj.constructor = { isAdmin: true };
  maliciousObj.n = "被注入的名字";
  maliciousObj.c = 3;
  maliciousObj.r = 2;
  maliciousObj.t = ["一", "二", "三", "四", "五", "六"];
  maliciousObj.th = { paper: "xuanzhi", ink: "mohei", border: "none", table: "base" };
  maliciousObj.tl = 120;
  maliciousObj.hp = 80;
  maliciousObj.sr = "random";
  maliciousObj.er = false;
  maliciousObj.ef = false;
  maliciousObj.irs = false;
  maliciousObj.ifs = false;
  maliciousObj.at = ["zoom", "edgeAlign"];
  const maliciousJson = JSON.stringify(maliciousObj);
  assertIncludes(maliciousJson, "\"__proto__\"", "测试payload应真实包含 __proto__ 自有字段");
  const maliciousEncoded = (() => {
    const utf8 = unescape(encodeURIComponent(maliciousJson));
    let b64 = "";
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    for (let i = 0; i < utf8.length; i += 3) {
      const b1 = utf8.charCodeAt(i);
      const b2 = i + 1 < utf8.length ? utf8.charCodeAt(i + 1) : 0;
      const b3 = i + 2 < utf8.length ? utf8.charCodeAt(i + 2) : 0;
      const triple = (b1 << 16) | (b2 << 8) | b3;
      b64 += chars[(triple >> 18) & 0x3f];
      b64 += chars[(triple >> 12) & 0x3f];
      b64 += chars[(triple >> 6) & 0x3f];
      b64 += chars[triple & 0x3f];
    }
    const pad = utf8.length % 3;
    if (pad === 1) b64 = b64.slice(0, -2);
    else if (pad === 2) b64 = b64.slice(0, -1);
    return b64;
  })();

  const fnv1a32 = (str) => {
    let hash = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = (hash * 0x01000193) >>> 0;
    }
    return hash.toString(16).padStart(8, "0");
  };
  const newChecksum = fnv1a32(maliciousEncoded);
  const tamperedCode = `ZFL27:v1:P:${maliciousEncoded}:${newChecksum}`;

  const dec = ShareCode.decode(tamperedCode);
  assert(dec.ok, "手动构造的含 __proto__ 码应可解码");
  assertNotHasOwnKey(dec.data, "__proto__", "解码后 __proto__ 应被过滤");
  assertNotHasOwnKey(dec.data, "constructor", "解码后 constructor 应被过滤");
  assertNotHasOwnKey(dec.data, "admin", "原型链污染属性不应出现在结果中");
  assertNotHasOwnKey(dec.data, "isAdmin", "constructor 中的属性不应出现");
}

console.log("--- 16. sanitizePuzzle 直接测试 ---");
{
  const r = ShareCode.sanitizePuzzle(null);
  assert(!r.valid, "null puzzle 应无效");

  const r2 = ShareCode.sanitizePuzzle("string");
  assert(!r2.valid, "字符串 puzzle 应无效");

  const r3 = ShareCode.sanitizePuzzle([]);
  assert(!r3.valid, "数组 puzzle 应无效");

  const r4 = ShareCode.sanitizePuzzle({ cols: 1, rows: 2 });
  assert(!r4.valid, "列数太小应无效");

  const r5 = ShareCode.sanitizePuzzle({ cols: 3, rows: 2 });
  assert(r5.valid, "仅有合法尺寸应有效");
  assert(r5.puzzle.text.length === 6, "应自动补齐文字");
  assertIncludes(r5.warnings, "文字内容缺失，已使用占位文字" , "应有文字缺失警告");
}

console.log("--- 17. sanitizeDailyResult 直接测试 ---");
{
  const r = ShareCode.sanitizeDailyResult({ puzzle: makePuzzle() });
  assert(r.valid, "合法每日数据应有效");
  assert(r.result.puzzle, "结果应包含 puzzle");
  assertEqual(r.result.score, 0, "缺省分数为0");

  let r2;
  try { r2 = ShareCode.sanitizeDailyResult(null); } catch (e) { r2 = null; }
  assert(r2 === null || !r2.valid, "null 每日数据应无效或抛异常");
}

console.log("--- 18. quickValidate / isShareCode ---");
{
  const puzzle = makePuzzle();
  const enc = ShareCode.encodePuzzle(puzzle);

  assert(ShareCode.quickValidate(enc.code), "有效码应通过快速验证");
  assert(!ShareCode.quickValidate(""), "空字符串不应通过");
  assert(!ShareCode.quickValidate("random text"), "随机文本不应通过");
  assert(!ShareCode.quickValidate(null), "null 不应通过");
  assert(ShareCode.isShareCode(enc.code), "isShareCode 应与 quickValidate 一致");
  assert(!ShareCode.isShareCode("ZFL27"), "不完整的码不应通过");
}

console.log("--- 19. 尺寸边界值测试 ---");
{
  const minPuzzle = makePuzzle({ cols: 2, rows: 2, text: ["一", "二", "三", "四"] });
  const enc1 = ShareCode.encodePuzzle(minPuzzle);
  const dec1 = ShareCode.decode(enc1.code);
  assert(dec1.ok, "2x2 最小尺寸应有效");
  assertEqual(dec1.data.cols, 2, "2列保留");

  const maxPuzzle = makePuzzle({ cols: 6, rows: 5, text: Array.from({ length: 30 }, (_, i) => "字" + i) });
  const enc2 = ShareCode.encodePuzzle(maxPuzzle);
  const dec2 = ShareCode.decode(enc2.code);
  assert(dec2.ok, "6x5 最大尺寸应有效");
  assertEqual(dec2.data.cols, 6, "6列保留");
  assertEqual(dec2.data.rows, 5, "5行保留");
}

console.log("--- 20. 散落规则验证 ---");
{
  const rules = ["random", "ordered", "reversed", "clustered"];
  rules.forEach(rule => {
    const p = makePuzzle({ scatterRule: rule });
    const enc = ShareCode.encodePuzzle(p);
    const dec = ShareCode.decode(enc.code);
    assertEqual(dec.data.scatterRule, rule, `散落规则 ${rule} 应往返一致`);
  });

  const badRule = makePuzzle({ scatterRule: "unknown_rule" });
  const enc = ShareCode.encodePuzzle(badRule);
  const dec = ShareCode.decode(enc.code);
  assertEqual(dec.data.scatterRule, "random", "未知散落规则应回退到 random");
}

console.log("--- 21. 工具列表验证 ---");
{
  const validTools = ["zoom", "edgeAlign", "rotateCw", "rotateCcw", "flip"];
  const p = makePuzzle({ availableTools: validTools });
  const enc = ShareCode.encodePuzzle(p);
  const dec = ShareCode.decode(enc.code);
  assertEqual(dec.data.availableTools.sort(), validTools.sort(), "全部合法工具应保留");

  const p2 = makePuzzle({ availableTools: ["zoom", "hackTool", "edgeAlign"] });
  const enc2 = ShareCode.encodePuzzle(p2);
  const dec2 = ShareCode.decode(enc2.code);
  assert(!dec2.data.availableTools.includes("hackTool"), "非法工具应被过滤");
  assert(dec2.data.availableTools.includes("zoom"), "合法工具应保留");
}

console.log("--- 22. 旋转打乱但缺少旋转工具应自动补齐 ---");
{
  const p = makePuzzle({
    enableRotation: true,
    initialRotationScrambled: true,
    availableTools: ["zoom"]
  });
  const enc = ShareCode.encodePuzzle(p);
  const dec = ShareCode.decode(enc.code);
  assert(dec.data.availableTools.includes("rotateCw"), "应自动补齐 rotateCw");
  assert(dec.data.availableTools.includes("rotateCcw"), "应自动补齐 rotateCcw");
}

console.log("--- 23. 翻面打乱但缺少翻面工具应自动补齐 ---");
{
  const p = makePuzzle({
    enableFlip: true,
    initialFlipScrambled: true,
    availableTools: ["zoom"]
  });
  const enc = ShareCode.encodePuzzle(p);
  const dec = ShareCode.decode(enc.code);
  assert(dec.data.availableTools.includes("flip"), "应自动补齐 flip");
}

console.log("--- 24. 关闭旋转时强制关闭旋转打乱 ---");
{
  const p = makePuzzle({
    enableRotation: false,
    initialRotationScrambled: true,
  });
  const enc = ShareCode.encodePuzzle(p);
  const dec = ShareCode.decode(enc.code);
  assertEqual(dec.data.initialRotationScrambled, false, "关闭旋转时旋转打乱应被强制关闭");
}

console.log("--- 25. 关闭翻转时强制关闭翻面打乱 ---");
{
  const p = makePuzzle({
    enableFlip: false,
    initialFlipScrambled: true,
  });
  const enc = ShareCode.encodePuzzle(p);
  const dec = ShareCode.decode(enc.code);
  assertEqual(dec.data.initialFlipScrambled, false, "关闭翻转时翻面打乱应被强制关闭");
}

console.log("--- 26. XSS 注入字段净化 ---");
{
  const p = makePuzzle({
    name: '<script>alert("xss")</script>test',
    text: ['<img src=x onerror=alert(1)>', 'javascript:evil()', 'normal']
  });
  const enc = ShareCode.encodePuzzle(p);
  const dec = ShareCode.decode(enc.code);
  assert(dec.ok, "含XSS字段应成功解码");
  assert(!dec.data.name.includes("<script>"), "name 中 script 标签应被移除");
  assert(!dec.data.text[0].includes("onerror"), "text 中事件处理应被移除");
  assert(!dec.data.text[1].includes("javascript:"), "text 中 javascript: 应被移除");
}

console.log("--- 27. 控制字符净化 ---");
{
  const p = makePuzzle({
    name: "test\x00name\x01",
  });
  const enc = ShareCode.encodePuzzle(p);
  const dec = ShareCode.decode(enc.code);
  assert(!dec.data.name.includes("\x00"), "控制字符应被移除");
  assert(!dec.data.name.includes("\x01"), "控制字符应被移除");
}

console.log("--- 28. 每日挑战中 __proto__ 过滤 ---");
{
  const daily = makeDaily();
  daily.__proto__ = { hacked: true };
  daily.rating = "<script>xss</script>";

  const enc = ShareCode.encodeDailyResult(daily);
  const dec = ShareCode.decode(enc.code);
  assert(dec.ok, "含 __proto__ 的每日数据应可解码");
  assertNotHasOwnKey(dec.data, "__proto__", "__proto__ 应被过滤");
  assertNotHasOwnKey(dec.data, "hacked", "原型链污染不应出现");
}

console.log("--- 29. 非数字时间限制回退 ---");
{
  const p = makePuzzle({ timeLimit: "notanumber", hintPenalty: -10 });
  const enc = ShareCode.encodePuzzle(p);
  const dec = ShareCode.decode(enc.code);
  assertEqual(dec.data.timeLimit, 120, "非数字时间限制应回退到默认120");
  assertEqual(dec.data.hintPenalty, 80, "负数提示扣分应回退到默认80");
}

console.log("--- 30. 空文字自动补齐 ---");
{
  const p = makePuzzle({ text: [] });
  const enc = ShareCode.encodePuzzle(p);
  const dec = ShareCode.decode(enc.code);
  assertEqual(dec.data.text.length, 6, "空文字应补齐到 cols*rows");
}

console.log("\n=== 测试结果 ===");
console.log(`通过: ${passed}`);
console.log(`失败: ${failed}`);

if (failures.length > 0) {
  console.log("\n失败详情:");
  failures.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
  process.exit(1);
} else {
  console.log("\n✓ 全部测试通过！");
  process.exit(0);
}

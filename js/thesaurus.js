const AppThesaurus = (() => {
  const wordBanks = {
    landscape: {
      name: "山水",
      description: "自然山水、风雨云月",
      words: [
        "山雨", "松风", "归舟", "秋水", "石桥", "远钟", "云根", "井泉",
        "海棠", "金石", "拓痕", "旧题", "飞白", "鱼尾", "牌记", "小篆",
        "暗纹", "碑阴", "残角", "书林", "校勘", "虫孔", "云笺", "收束",
        "竹影", "梅香", "兰韵", "菊霜", "枫丹", "柳烟", "荷塘", "松涛",
        "石泉", "溪声", "峰青", "岭白", "谷幽", "涧深", "潭清", "瀑飞"
      ],
      similarPairs: [
        ["山雨", "松风"], ["秋水", "春波"], ["石桥", "木桥"],
        ["远钟", "近钟"], ["云根", "泉眼"], ["竹影", "梅香"],
        ["松涛", "柳烟"], ["峰青", "岭翠"], ["潭清", "涧幽"]
      ]
    },
    ancient: {
      name: "古籍",
      description: "典籍、文书、印章",
      words: [
        "残卷", "旧墨", "灯影", "竹简", "青灯", "薄纸", "行书", "残印",
        "药谱", "温火", "纸背", "朱批", "草堂", "夜读", "藏印", "卷首",
        "虫蛀", "补纸", "墨脉", "断栏", "夹注", "边款", "残页", "古香",
        "修痕", "归档", "跋文", "序文", "凡例", "目录", "笺注", "校注",
        "版本", "善本", "孤本", "抄本", "刻本", "拓本", "稿本", "钞本"
      ],
      similarPairs: [
        ["残卷", "旧卷"], ["旧墨", "古墨"], ["竹简", "木简"],
        ["行书", "草书"], ["残印", "古印"], ["朱批", "墨批"],
        ["残页", "断页"], ["修痕", "补痕"], ["善本", "珍本"]
      ]
    },
    poetry: {
      name: "诗词",
      description: "诗意、文雅、典故",
      words: [
        "月落", "星垂", "风清", "露白", "霜重", "雪轻", "雨晴", "烟淡",
        "酒酣", "茶香", "琴幽", "棋闲", "书香", "画静", "歌清", "舞轻",
        "梦远", "愁深", "思切", "情浓", "意长", "心遥", "神驰", "魂牵",
        "春华", "秋实", "夏雨", "冬雪", "朝云", "暮雨", "晨风", "夜月"
      ],
      similarPairs: [
        ["月落", "星沉"], ["风清", "月明"], ["霜重", "雪寒"],
        ["酒酣", "茶浓"], ["琴幽", "棋静"], ["梦远", "愁深"],
        ["春华", "秋实"], ["朝云", "暮雨"], ["晨风", "夜露"]
      ]
    },
    study: {
      name: "书房",
      description: "文房四宝、书斋雅器",
      words: [
        "笔花", "墨池", "砚田", "纸阵", "笔山", "墨海", "砚石", "笺谱",
        "镇纸", "笔搁", "墨床", "水盂", "笔洗", "印泥", "印章", "印盒",
        "笔筒", "卷缸", "画轴", "书函", "经折", "册页", "手卷", "镜片",
        "扇面", "对联", "中堂", "条屏", "横批", "斗方", "立轴", "横轴"
      ],
      similarPairs: [
        ["笔花", "墨花"], ["墨池", "砚田"], ["砚石", "墨石"],
        ["镇纸", "压纸"], ["笔搁", "笔架"], ["笔筒", "笔匣"],
        ["画轴", "书轴"], ["册页", "折页"], ["扇面", "团扇"]
      ]
    },
    zen: {
      name: "禅意",
      description: "禅理、佛理、空灵",
      words: [
        "禅心", "佛性", "空明", "寂灭", "涅槃", "般若", "菩提", "明镜",
        "非台", "无物", "尘埃", "清净", "自在", "随缘", "放下", "悟空",
        "入定", "出定", "打坐", "参禅", "悟道", "证真", "观空", "见性",
        "法身", "报身", "化身", "净土", "彼岸", "迷途", "觉岸", "禅灯"
      ],
      similarPairs: [
        ["禅心", "佛心"], ["空明", "空灵"], ["涅槃", "解脱"],
        ["菩提", "觉悟"], ["明镜", "止水"], ["清净", "无尘"],
        ["自在", "逍遥"], ["参禅", "问道"], ["悟道", "证道"]
      ]
    },
    seasons: {
      name: "四季",
      description: "春生、夏长、秋收、冬藏",
      words: [
        "春风", "夏雨", "秋霜", "冬雪", "新绿", "残红", "落叶", "枯枝",
        "惊蛰", "清明", "芒种", "白露", "寒露", "霜降", "小雪", "大寒",
        "迎春", "消夏", "悲秋", "藏冬", "踏青", "避暑", "登高", "围炉",
        "花朝", "上巳", "端午", "七夕", "中秋", "重阳", "腊八", "除夕"
      ],
      similarPairs: [
        ["春风", "春雨"], ["夏雨", "夏荷"], ["秋霜", "秋露"],
        ["冬雪", "冬梅"], ["新绿", "嫩绿"], ["残红", "落红"],
        ["惊蛰", "清明"], ["踏青", "登高"], ["中秋", "重阳"]
      ]
    }
  };

  const allThemes = Object.keys(wordBanks);

  function getThemeNames() {
    return allThemes.map(key => ({
      id: key,
      name: wordBanks[key].name,
      description: wordBanks[key].description
    }));
  }

  function getWordBank(themeId) {
    return wordBanks[themeId] || null;
  }

  function getRandomWords(themeId, count, rng, similarity = 0) {
    const bank = getWordBank(themeId);
    if (!bank) return [];

    const words = [...bank.words];
    const result = [];
    const used = new Set();

    if (similarity > 0 && bank.similarPairs && bank.similarPairs.length > 0) {
      const similarPairs = [...bank.similarPairs];
      const pairCount = Math.min(Math.floor(count * similarity / 2), similarPairs.length, Math.floor(count / 2));

      for (let i = 0; i < pairCount; i++) {
        const idx = Math.floor(rng.next() * similarPairs.length);
        const pair = similarPairs.splice(idx, 1)[0];
        for (const w of pair) {
          if (!used.has(w) && result.length < count) {
            result.push(w);
            used.add(w);
          }
        }
      }
    }

    while (result.length < count) {
      const idx = Math.floor(rng.next() * words.length);
      const word = words[idx];
      if (!used.has(word)) {
        result.push(word);
        used.add(word);
      }
    }

    return result.slice(0, count);
  }

  function getRandomTheme(rng) {
    const idx = Math.floor(rng.next() * allThemes.length);
    return allThemes[idx];
  }

  function validateWord(word, themeId) {
    const bank = getWordBank(themeId);
    if (!bank) return false;
    return bank.words.includes(word);
  }

  function getSimilarWords(word, themeId, limit = 3) {
    const bank = getWordBank(themeId);
    if (!bank || !bank.similarPairs) return [];

    const result = [];
    for (const pair of bank.similarPairs) {
      if (pair[0] === word) result.push(pair[1]);
      else if (pair[1] === word) result.push(pair[0]);
    }

    return result.slice(0, limit);
  }

  return {
    getThemeNames,
    getWordBank,
    getRandomWords,
    getRandomTheme,
    validateWord,
    getSimilarWords
  };
})();

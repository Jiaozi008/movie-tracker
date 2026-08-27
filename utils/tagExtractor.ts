/**
 * 影视智能标签提取器
 * 根据影视作品的标题、类型、剧情简介、国家、评分与关键词智能生成 2~4 个具象化中文标签
 * 规则：当标签与类型 (Genre) 完全相同时，保留类型，标签中剔除该重复项
 */

interface TagExtractorInput {
  title?: string;
  genre?: string;
  overview?: string;
  country?: string;
  voteAverage?: number;
  keywords?: string[];
  mediaType?: 'movie' | 'tv';
}

const SEMANTIC_TAG_RULES: Array<{
  tag: string;
  patterns: RegExp[];
}> = [
  {
    tag: '悬疑烧脑',
    patterns: [/悬疑/, /烧脑/, /反转/, /推理/, /密室/, /真相/, /凶手/, /破案/, /侦探/, /阴谋/, /疑案/, /解谜/, /心理战/, /盗梦/, /禁闭岛/i]
  },
  {
    tag: '时空穿越',
    patterns: [/穿越/, /时空/, /时间循环/, /平行宇宙/, /回到过去/, /虫洞/, /穿梭/i]
  },
  {
    tag: '赛博朋克',
    patterns: [/赛博/, /赛博朋克/, /人工智能/, /仿生人/, /机械/, /AI/, /黑客/, /虚拟现实/, /银翼杀手/, /黑客帝国/i]
  },
  {
    tag: '太空探索',
    patterns: [/太空/, /宇宙/, /星际/, /外星/, /宇航/, /火星/, /深空/, /星舰/, /空间站/, /三体/, /流浪地球/, /阿凡达/i]
  },
  {
    tag: '硬核科幻',
    patterns: [/科幻/, /硬科幻/, /未来世界/, /基因工程/, /超能力/i]
  },
  {
    tag: '硬核动作',
    patterns: [/动作/, /特工/, /特种兵/, /枪战/, /追逐/, /搏击/, /格斗/, /杀手/, /谍战/, /007/, /碟中谍/, /疾速追杀/i]
  },
  {
    tag: '犯罪警匪',
    patterns: [/犯罪/, /警匪/, /卧底/, /黑帮/, /毒品/, /缉毒/, /抢劫/, /贪腐/, /黑道/, /无间道/, /教父/, /狂飙/i]
  },
  {
    tag: '温暖治愈',
    patterns: [/治愈/, /温暖/, /感动/, /救赎/, /温情/, /成长/, /亲情/, /温馨/, /陪伴/, /小森林/, /入殓师/, /海街/i]
  },
  {
    tag: '轻松解压',
    patterns: [/喜剧/, /爆笑/, /沙雕/, /搞笑/, /幽默/, /解压/, /荒诞/, /无厘头/, /欢乐/, /开心/i]
  },
  {
    tag: '惊悚刺激',
    patterns: [/惊悚/, /恐怖/, /丧尸/, /惊叫/, /血腥/, /异形/, /生化/, /活死人/, /鬼/, /幽灵/, /怪兽/, /逃生/, /灾难/i]
  },
  {
    tag: '浪漫爱情',
    patterns: [/爱情/, /浪漫/, /恋爱/, /情侣/, /心动/, /初恋/, /暗恋/, /相濡以沫/, /爱乐之城/, /泰坦尼克/, /真爱/i]
  },
  {
    tag: '史诗奇幻',
    patterns: [/奇幻/, /魔幻/, /魔法/, /巫师/, /神话/, /史诗/, /巨龙/, /指环王/, /哈利波特/, /权力的游戏/i]
  },
  {
    tag: '仙侠武侠',
    patterns: [/武侠/, /仙侠/, /修仙/, /江湖/, /门派/, /剑客/, /刀剑/, /金庸/, /古龙/, /大侠/i]
  },
  {
    tag: '谍战权谋',
    patterns: [/权谋/, /宫斗/, /宫廷/, /王朝/, /朝廷/, /间谍/, /暗战/, /琅琊榜/, /潜伏/, /大明/i]
  },
  {
    tag: '青春成长',
    patterns: [/青春/, /校园/, /高考/, /学生/, /少年/, /少女/, /初中/, /高中/, /大学/, /热血/i]
  },
  {
    tag: '末日生存',
    patterns: [/末日/, /末世/, /生存/, /核辐射/, /荒野/, /末日废土/, /辐射/, /幸存者/, /后天/, /2012/i]
  },
  {
    tag: '经典动画',
    patterns: [/动画/, /动漫/, /二次元/, /新海诚/, /宫崎骏/, /皮克斯/, /迪士尼/, /吉卜力/i]
  },
  {
    tag: '历史风云',
    patterns: [/历史/, /二战/, /抗战/, /古代/, /传记/, /伟人/, /帝国/, /战役/, /奥本海默/, /辛德勒/i]
  },
  {
    tag: '黑色幽默',
    patterns: [/黑色幽默/, /讽刺/, /反讽/, /黑色喜剧/, /昆汀/, /姜文/i]
  }
];

export function extractSmartTags(input: TagExtractorInput): string[] {
  const { title = '', genre = '', overview = '', country = '', voteAverage = 0, keywords = [], mediaType } = input;
  const combinedText = `${title} ${genre} ${overview} ${keywords.join(' ')}`;
  const tagsSet = new Set<string>();

  // 提取当前影视已包含的类型词汇集合 (用于后续去重与冲突消除)
  const genreTokens = new Set(
    (genre || '')
      .split(/[,，/、\s]+/)
      .map(g => g.trim().toLowerCase())
      .filter(Boolean)
  );

  // 1. 高分口碑优先入选
  if (voteAverage >= 8.3) {
    tagsSet.add('高分神作');
  } else if (voteAverage >= 7.8) {
    tagsSet.add('口碑佳作');
  }

  // 2. 匹配深度语义规则
  for (const rule of SEMANTIC_TAG_RULES) {
    if (tagsSet.size >= 5) break;
    const isMatched = rule.patterns.some(p => p.test(combinedText));
    if (isMatched) {
      tagsSet.add(rule.tag);
    }
  }

  // 3. 根据类型 (Genre) 进行补充具象修饰标签（绝不使用原始宽泛类型原词）
  if (tagsSet.size < 3 && genre) {
    const rawGenres = genre.split(/[,，/、\s]+/).filter(g => g.trim().length > 0);
    const genreMap: Record<string, string> = {
      '科幻': '硬核科幻',
      '悬疑': '悬疑烧脑',
      '动作': '硬核动作',
      '动画': '经典动画',
      '喜剧': '轻松解压',
      '爱情': '浪漫爱情',
      '惊悚': '惊悚刺激',
      '恐怖': '惊悚刺激',
      '犯罪': '犯罪警匪',
      '奇幻': '史诗奇幻',
      '冒险': '奇幻冒险',
      '纪录': '人文纪录',
      '战争': '历史风云',
      '历史': '历史风云',
      '家庭': '温暖治愈',
      '音乐': '原声音悦'
    };

    for (const g of rawGenres) {
      if (tagsSet.size >= 5) break;
      const mapped = genreMap[g];
      if (mapped && !tagsSet.has(mapped)) {
        tagsSet.add(mapped);
      }
    }
  }

  // 4. 特色地域标签补充（在标签过少时）
  if (tagsSet.size < 2) {
    if (country.includes('香港') || country.includes('HK')) {
      tagsSet.add('港片情怀');
    } else if ((country.includes('日本') || country.includes('JP')) && genre.includes('动画')) {
      tagsSet.add('日漫经典');
    } else if (mediaType === 'tv') {
      tagsSet.add('高能追剧');
    }
  }

  // 5. 核心去重：当 标签 与 类型 (Genre) 有相同时，保留类型，标签自动剔除该重复项
  const nonGenreTags = Array.from(tagsSet).filter(tag => {
    const clean = tag.trim().toLowerCase();
    return !genreTokens.has(clean);
  });

  // 6. 兜底标签（若全部被类型过滤，补充精选修饰词）
  if (nonGenreTags.length === 0) {
    const fallback = mediaType === 'tv' ? '精品剧集' : '精彩电影';
    if (!genreTokens.has(fallback.toLowerCase())) {
      nonGenreTags.push(fallback);
    }
  }

  return nonGenreTags.slice(0, 4);
}

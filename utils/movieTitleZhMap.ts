import { normalizeTitle } from './titleNormalizer';

/**
 * 经典与全球热门影视中国公映/华语标准官方译名映射字典 (China Mainland Theatrical / Chinese Standard Title Map)
 * 覆盖世界知名导演、奥斯卡、三大电影节、全球经典电影与剧集
 */
export const MOVIE_TITLE_ZH_MAP: Record<string, string> = {
    // Dan Trachtenberg (丹·特拉亨伯格)
    '10 cloverfield lane': '科洛弗道10号',
    'prey': '铁血战士：狩猎',
    'predator: badlands': '铁血战士：杀戮之地',
    'predator: killer of men': '铁血战士：杀戮之王',
    'the lost symbol': '失落的秘符',
    'the boys': '黑袍纠察队',
    'black mirror': '黑镜',
    'portal: no escape': '传送门：无法逃脱',
    'freddy the 13th': '十三号星期五：弗莱迪',
    'more than you can chew': '难以招架',
    'blackboxtv presents': '黑箱TV特别呈现',
    'blackboxtv': '黑箱TV',
    'kickin\'': '踢击',
    'kickin': '踢击',

    // Christopher Nolan (克里斯托弗·诺兰)
    'oppenheimer': '奥本海默',
    'tenet': '信条',
    'dunkirk': '敦刻尔克',
    'interstellar': '星际穿越',
    'the dark knight rises': '黑暗骑士崛起',
    'the dark knight': '蝙蝠侠：黑暗骑士',
    'batman begins': '蝙蝠侠：侠影之谜',
    'inception': '盗梦空间',
    'the prestige': '致命魔术',
    'insomnia': '白夜追凶',
    'memento': '记忆碎片',
    'following': '追随',
    'doodlebug': '蚁蛉',
    'quay': '奎氏兄弟',

    // Hayao Miyazaki & Studio Ghibli (宫崎骏)
    'the boy and the heron': '你想活出怎样的人生',
    'how do you live?': '你想活出怎样的人生',
    'kimitachi wa dou ikiru ka': '你想活出怎样的人生',
    'the wind rises': '起风了',
    'kaze tachinu': '起风了',
    'ponyo': '悬崖上的金鱼姬',
    'ponyo on the cliff by the sea': '悬崖上的金鱼姬',
    'gake no ue no ponyo': '悬崖上的金鱼姬',
    "howl's moving castle": '哈尔的移动城堡',
    'hauru no ugoku shiro': '哈尔的移动城堡',
    'spirited away': '千与千寻',
    'sen to chihiro no kamikakushi': '千与千寻',
    'princess mononoke': '幽灵公主',
    'mononoke hime': '幽灵公主',
    'porco rosso': '红猪',
    'kurenai no buta': '红猪',
    "kiki's delivery service": '魔女宅急便',
    'majo no takkyuubin': '魔女宅急便',
    'my neighbor totoro': '龙猫',
    'tonari no totoro': '龙猫',
    'castle in the sky': '天空之城',
    'tenkuu no shiro rapyuta': '天空之城',
    'nausicaa of the valley of the wind': '风之谷',
    'kaze no tani no naushika': '风之谷',
    'the castle of cagliostro': '鲁邦三世：卡里奥斯特罗之城',
    'the tale of the princess kaguya': '辉夜姬物语',
    'grave of the fireflies': '萤火虫之墓',
    'whisper of the heart': '侧耳倾听',
    'the secret world of arrietty': '借东西的小人阿莉埃蒂',
    'when marnie was there': '回忆中的玛妮',
    'the cat returns': '猫的报恩',
    'from up on poppy hill': '虞美人盛开的山坡',

    // Denis Villeneuve (丹尼斯·维伦纽瓦)
    'dune: part two': '沙丘2',
    'dune: part 2': '沙丘2',
    'dune 2': '沙丘2',
    'dune: part one': '沙丘',
    'dune': '沙丘',
    'blade runner 2049': '银翼杀手2049',
    'arrival': '降临',
    'sicario': '边境杀手',
    'enemy': '宿敌',
    'prisoners': '囚徒',
    'incendies': '焦土之城',
    'polytechnique': '理工学院',
    'maelstrom': '漩涡',

    // Quentin Tarantino (昆汀·塔伦蒂诺)
    'once upon a time in hollywood': '好莱坞往事',
    'the hateful eight': '八恶人',
    'django unchained': '被解救的姜戈',
    'inglourious basterds': '无耻混蛋',
    'death proof': '金刚不坏',
    'kill bill: vol. 1': '杀死比尔',
    'kill bill: vol. 2': '杀死比尔2',
    'kill bill': '杀死比尔',
    'jackie brown': '危险关系',
    'four rooms': '四个房间',
    'pulp fiction': '低俗小说',
    'reservoir dogs': '落水狗',
    'from dusk till dawn': '杀出个黎明',

    // David Fincher (大卫·芬奇)
    'the killer': '杀手',
    'mank': '曼克',
    'mindhunter': '心灵猎人',
    'gone girl': '消失的爱人',
    'the girl with the dragon tattoo': '龙纹身的女孩',
    'the social network': '社交网络',
    'the curious case of benjamin button': '本杰明·巴顿奇事',
    'zodiac': '十二宫',
    'panic room': '战栗空间',
    'fight club': '搏击俱乐部',
    'the game': '心理游戏',
    'se7en': '七宗罪',
    'seven': '七宗罪',
    'alien 3': '异形3',
    'alien 3: assembly cut': '异形3',
    'love, death & robots': '爱，死亡和机器人',

    // Steven Spielberg (史蒂文·斯皮尔伯格)
    'the fabelmans': '造梦之家',
    'west side story': '西区故事',
    'ready player one': '头号玩家',
    'the post': '华盛顿邮报',
    'the bfg': '圆梦巨人',
    'bridge of spies': '间谍之桥',
    'lincoln': '林肯',
    'war horse': '战马',
    'the adventures of tintin': '丁丁历险记',
    'indiana jones and the kingdom of the crystal skull': '印第安纳琼斯：水晶头骨王国',
    'munich': '慕尼黑',
    'war of the worlds': '世界之战',
    'the terminal': '幸福终点站',
    'catch me if you can': '猫鼠游戏',
    'minority report': '少数派报告',
    'a.i. artificial intelligence': '人工智能',
    'saving private ryan': '拯救大兵瑞恩',
    'the lost world: jurassic park': '侏罗纪公园2：失落的世界',
    'schindler\'s list': '辛德勒的名单',
    'schindlers list': '辛德勒的名单',
    'jurassic park': '侏罗纪公园',
    'hook': '铁钩船长',
    'empire of the sun': '太阳帝国',
    'the color purple': '紫色',
    'indiana jones and the temple of doom': '魔宫传奇',
    'e.t. the extra-terrestrial': '外星人E.T.',
    'e.t.': '外星人E.T.',
    'raiders of the lost ark': '夺宝奇兵',
    'close encounters of the third kind': '第三类接触',
    'jaws': '大白鲨',
    'duel': '决斗',

    // James Cameron (詹姆斯·卡梅隆)
    'avatar: fire and ash': '阿凡达3：火与烬',
    'avatar: the way of water': '阿凡达：水之道',
    'avatar 2': '阿凡达：水之道',
    'avatar': '阿凡达',
    'titanic': '泰坦尼克号',
    'true lies': '真实的谎言',
    'terminator 2: judgment day': '终结者2：审判日',
    'terminator 2': '终结者2',
    'the abyss': '深渊',
    'aliens': '异形2',
    'the terminator': '终结者',

    // Makoto Shinkai (新海诚)
    'suzume': '铃芽之旅',
    'suzume no tojimari': '铃芽之旅',
    'weathering with you': '天气之子',
    'tenki no ko': '天气之子',
    'your name.': '你的名字。',
    'your name': '你的名字。',
    'kimi no na wa.': '你的名字。',
    'kimi no na wa': '你的名字。',
    'the garden of words': '言叶之庭',
    'kotonoha no niwa': '言叶之庭',
    'children who chase lost voices': '追逐繁星的孩子',
    '5 centimeters per second': '秒速5厘米',
    'byousoku 5 centimeter': '秒速5厘米',
    'the place promised in our early days': '云之彼端，约定的地方',
    'voices of a distant star': '星之声',
    'she and her cat': '她和她的猫',

    // Bong Joon-ho & Park Chan-wook (奉俊昊、朴赞郁)
    'mickey 17': '米奇17',
    'parasite': '寄生虫',
    'gisaengchung': '寄生虫',
    'okja': '玉子',
    'snowpiercer': '雪国列车',
    'mother': '母亲',
    'madeo': '母亲',
    'the host': '汉江怪物',
    'gwoemul': '汉江怪物',
    'memories of murder': '杀人回忆',
    'salinui chueok': '杀人回忆',
    'barking dogs never bite': '绑架门口狗',
    'decision to leave': '分手的决心',
    'the sympathizer': '同情者',
    'the handmaiden': '小姐',
    'agassi': '小姐',
    'stoker': '斯托克',
    'thirst': '蝙蝠',
    'sympathy for lady vengeance': '亲切的金子',
    'oldboy': '老男孩',
    'sympathy for mr. vengeance': '我要复仇',
    'joint security area': '共同警备区',

    // Hirokazu Kore-eda (是枝裕和)
    'monster': '怪物',
    'kaibutsu': '怪物',
    'broker': '掮客',
    'the truth': '真相',
    'shoplifters': '小偷家族',
    'manbiki kazoku': '小偷家族',
    'the third murder': '第三度嫌疑人',
    'after the storm': '比海更深',
    'our little sister': '海街日记',
    'umimachi diary': '海街日记',
    'like father, like son': '如父如子',
    'i wish': '奇迹',
    'air doll': '空气人偶',
    'still walking': '步履不停',
    'nobody knows': '无人知晓',
    'after life': '下一站，天国',
    'maborosi': '幻之光',

    // Wes Anderson (韦斯·安德森)
    'asteroid city': '小行星城',
    'the wonderful story of henry sugar': '亨利·休格的神奇故事',
    'the french dispatch': '法兰西特派',
    'isle of dogs': '犬之岛',
    'the grand budapest hotel': '布达佩斯大饭店',
    'moonrise kingdom': '月升王国',
    'fantastic mr. fox': '了不起的狐狸爸爸',
    'the darjeeling limited': '大吉岭有限公司',
    'the life aquatic with steve zissou': '水中生活',
    'the royal tenenbaums': '天才一族',
    'rushmore': '青春年少',
    'bottle rocket': '瓶装火箭',

    // Martin Scorsese (马丁·斯科塞斯)
    'killers of the flower moon': '花月杀手',
    'the irishman': '爱尔兰人',
    'silence': '沉默',
    'the wolf of wall street': '华尔街之狼',
    'hugo': '雨果',
    'shutter island': '禁闭岛',
    'the departed': '无间道风云',
    'the aviator': '飞行家',
    'gangs of new york': '纽约黑帮',
    'casino': '赌场风云',
    'goodfellas': '好家伙',
    'the last temptation of christ': '基督最后的诱惑',
    'raging bull': '愤怒的公牛',
    'taxi driver': '出租车司机',

    // Stanley Kubrick (斯坦利·库布里克)
    'eyes wide shut': '大开眼界',
    'full metal jacket': '全金属外壳',
    'the shining': '闪灵',
    'barry lyndon': '巴里·林登',
    'a clockwork orange': '发条橙',
    '2001: a space odyssey': '2001太空漫游',
    'dr. strangelove': '奇爱博士',
    'lolita': '洛丽塔',
    'spartacus': '斯巴达克斯',
    'paths of glory': '光荣之路',
    'the killing': '杀手',

    // Alfred Hitchcock (阿尔弗雷德·希区柯克)
    'family plot': '奇谋妙计巧偷闲',
    'frenzy': '狂凶记',
    'the birds': '群鸟',
    'psycho': '惊魂记',
    'north by northwest': '西北偏北',
    'vertigo': '迷魂记',
    'rear window': '后窗',
    'dial m for murder': '电话谋杀案',
    'strangers on a train': '火车怪客',
    'rope': '夺魂索',
    'spellbound': '爱德华大夫',
    'rebecca': '蝴蝶梦',
    'the lady vanishes': '贵妇失踪记',
    'the 39 steps': '三十九级台阶',

    // Global Masterpieces & Franchises (Leonardo, Tom Hanks, Keanu Reeves, Brad Pitt, etc.)
    'the revenant': '荒野猎人',
    'the great gatsby': '了不起的盖茨比',
    'blood diamond': '血钻',
    'the basketball diaries': '边缘日记',
    'romeo + juliet': '罗密欧与朱丽叶',
    'whats eating gilbert grape': '不一样的天空',
    "what's eating gilbert grape": '不一样的天空',
    'forrest gump': '阿甘正传',
    'cast away': '荒岛余生',
    'the green mile': '绿里奇迹',
    'apollo 13': '阿波罗13号',
    'philadelphia': '费城故事',
    'sleepless in seattle': '西雅图夜未眠',
    'youve got mail': '电子情书',
    "you've got mail": '电子情书',
    'sully': '萨利机长',
    'captain phillips': '菲利普斯船长',
    'a man called otto': '生无可恋的奥托',
    'the matrix': '黑客帝国',
    'the matrix reloaded': '黑客帝国2：重装上阵',
    'the matrix revolutions': '黑客帝国3：矩阵革命',
    'the matrix resurrections': '黑客帝国：矩阵重启',
    'john wick': '疾速追杀',
    'john wick: chapter 2': '疾速特攻',
    'john wick: chapter 3 - parabellum': '疾速备战',
    'john wick: chapter 4': '疾速追杀4',
    'constantine': '地狱神探',
    'speed': '生死时速',
    'point break': '惊爆点',
    'the shawshank redemption': '肖申克的救赎',
    'the godfather': '教父',
    'the godfather part ii': '教父2',
    'the godfather part iii': '教父3',
    '12 angry men': '十二怒汉',
    'the lord of the rings: the fellowship of the ring': '指环王1：护戒使者',
    'the lord of the rings: the two towers': '指环王2：双塔奇兵',
    'the lord of the rings: the return of the king': '指环王3：王者无敌',
    'the hobbit: an unexpected journey': '霍比特人1：意外之旅',
    'the hobbit: the desolation of smaug': '霍比特人2：史矛革之战',
    'the hobbit: the battle of the five armies': '霍比特人3：五军之战',
    'harry potter and the philosopher\'s stone': '哈利·波特与魔法石',
    'harry potter and the sorcerer\'s stone': '哈利·波特与魔法石',
    'harry potter and the chamber of secrets': '哈利·波特与密室',
    'harry potter and the prisoner of azkaban': '哈利·波特与阿兹卡班的囚徒',
    'harry potter and the goblet of fire': '哈利·波特与火焰杯',
    'harry potter and the order of the phoenix': '哈利·波特与凤凰社',
    'harry potter and the half-blood prince': '哈利·波特与混血王子',
    'harry potter and the deathly hallows: part 1': '哈利·波特与死亡圣器(上)',
    'harry potter and the deathly hallows: part 2': '哈利·波特与死亡圣器(下)',
    'gladiator': '角斗士',
    'gladiator ii': '角斗士2',
    'gladiator 2': '角斗士2',
    'the silence of the lambs': '沉默的羔羊',
    'star wars: episode iv - a new hope': '星球大战4：新希望',
    'star wars: episode v - the empire strikes back': '星球大战5：帝国反击战',
    'star wars: episode vi - return of the jedi': '星球大战6：绝地归来',
    'good will hunting': '心灵捕手',
    'the pianist': '钢琴家',
    'life is beautiful': '美丽人生',
    'cinema paradiso': '天堂电影院',
    'leon: the professional': '这个杀手不太冷',
    'the professional': '这个杀手不太冷',
    'leon': '这个杀手不太冷',
    'modern times': '摩登时代',
    'city lights': '城市之光',
    'the great dictator': '大独裁者',
    'casablanca': '卡萨布兰卡',
    'citizen kane': '公民凯恩',
    'one flew over the cuckoo\'s nest': '飞越疯人院',
    'apocalypse now': '现代启示录',
    'back to the future': '回到未来',
    'back to the future part ii': '回到未来2',
    'back to the future part iii': '回到未来3',
    'the truman show': '楚门的世界',
    'eternal sunshine of the spotless mind': '美丽心灵的永恒阳光',
    'american beauty': '美国丽人',
    'braveheart': '勇敢的心',
    'amelie': '天使爱美丽',
    'le fabuleux destin d\'amelie poulain': '天使爱美丽',
    'whiplash': '爆裂鼓手',
    'la la land': '爱乐之城',
    'coco': '寻梦环游记',
    'soul': '心灵奇旅',
    'inside out': '头脑特工队',
    'inside out 2': '头脑特工队2',
    'wall-e': '机器人总动员',
    'walle': '机器人总动员',
    'up': '飞屋环游记',
    'toy story': '玩具总动员',
    'toy story 2': '玩具总动员2',
    'toy story 3': '玩具总动员3',
    'toy story 4': '玩具总动员4',
    'finding nemo': '海底总动员',
    'finding dory': '海底总动员2：多莉去哪儿',
    'monsters, inc.': '怪兽电力公司',
    'monsters university': '怪兽大学',
    'ratatouille': '料理鼠王',
    'the incredibles': '超人总动员',
    'incredibles 2': '超人总动员2',
    'zootopia': '疯狂动物城',
    'frozen': '冰雪奇缘',
    'frozen ii': '冰雪奇缘2',
    'spider-man: into the spider-verse': '蜘蛛侠：平行宇宙',
    'spider-man: across the spider-verse': '蜘蛛侠：纵横宇宙',
    'avengers: endgame': '复仇者联盟4：终局之战',
    'avengers: infinity war': '复仇者联盟3：无限战争',
    'the avengers': '复仇者联盟',
    'iron man': '钢铁侠',
    'iron man 2': '钢铁侠2',
    'iron man 3': '钢铁侠3',
    'captain america: the first avenger': '美国队长',
    'captain america: the winter soldier': '美国队长2：冬日战士',
    'captain america: civil war': '美国队长3：内战',
    'guardians of the galaxy': '银河护卫队',
    'guardians of the galaxy vol. 2': '银河护卫队2',
    'guardians of the galaxy vol. 3': '银河护卫队3',
    'thor: ragnarok': '雷神3：诸神黄昏',
    'black panther': '黑豹',
    'doctor strange': '奇异博士',
    'everything everywhere all at once': '瞬息全宇宙',
    'wonka': '旺卡',
    'barbie': '芭比',
    'poor things': '可怜的东西',
    'the holdovers': '留校联盟',
    'anatomy of a fall': '坠落的审判',
    'the zone of interest': '利益区域',
    'past lives': '过往人生',
    'perfect days': '完美的日子',
    'challengers': '挑战者',
    'civil war': '帝国浩劫：美国内战',
    'furiosa: a mad max saga': '疯狂的麦克斯：狂暴女神',
    'mad max: fury road': '疯狂的麦克斯4：狂暴之路',
    'a quiet place': '寂静之地',
    'a quiet place: day one': '寂静之地：第一天',
    'alien: romulus': '异形：夺命舰',
    'deadpool & wolverine': '死侍与金刚狼',
    'deadpool 2': '死侍2',
    'deadpool': '死侍',
    'joker: folie a deux': '小丑2：双重狂想',
    'joker': '小丑',
    'wicked': '魔法坏女巫',
    'moana 2': '海洋奇缘2',
    'moana': '海洋奇缘',
    'the batman': '新蝙蝠侠',
    'the substance': '某种物质',
    'anora': '阿诺拉',
};

// 本地内存与持久化缓存
export const dynamicTitleCache = new Map<string, string>();

function loadTitleCache() {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            const raw = localStorage.getItem('cine_title_zh_cache');
            if (raw) {
                const parsed = JSON.parse(raw);
                Object.entries(parsed).forEach(([k, v]) => {
                    if (typeof v === 'string') dynamicTitleCache.set(k.toLowerCase(), v);
                });
            }
        }
    } catch {}
}

export function saveTitleCache(key: string, val: string) {
    if (!key || !val) return;
    dynamicTitleCache.set(key.toLowerCase(), val);
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            const obj: Record<string, string> = {};
            dynamicTitleCache.forEach((v, k) => { obj[k] = v; });
            localStorage.setItem('cine_title_zh_cache', JSON.stringify(obj));
        }
    } catch {}
}

loadTitleCache();

/**
 * 将任意电影名称汉化为中国大陆正式上映/华语标准片名（同步方法）
 */
export function localizeChineseMovieTitle(title: string, originalTitle?: string): string {
    if (!title || !title.trim()) return '';

    const cleanInput = title.trim();

    // 1. 如果输入本身已经包含足够的中文字符
    if (/[\u4e00-\u9fa5]{2,}/.test(cleanInput)) {
        return cleanInput;
    }

    // 2. 查静态字典
    const key1 = cleanInput.toLowerCase().replace(/['"“”‘’]/g, '');
    if (MOVIE_TITLE_ZH_MAP[key1]) {
        return MOVIE_TITLE_ZH_MAP[key1];
    }

    // 查动态缓存
    if (dynamicTitleCache.has(key1)) {
        return dynamicTitleCache.get(key1)!;
    }

    // 去除年份后缀例如 " (2023)"
    const titleWithoutYear = cleanInput.replace(/\s*\(\d{4}\)$/, '').trim().toLowerCase().replace(/['"“”‘’]/g, '');
    if (MOVIE_TITLE_ZH_MAP[titleWithoutYear]) {
        return MOVIE_TITLE_ZH_MAP[titleWithoutYear];
    }
    if (dynamicTitleCache.has(titleWithoutYear)) {
        return dynamicTitleCache.get(titleWithoutYear)!;
    }

    // 3. 如果有 originalTitle，再查一次
    if (originalTitle && originalTitle.trim()) {
        const keyOrig = originalTitle.trim().toLowerCase().replace(/['"“”‘’]/g, '');
        if (MOVIE_TITLE_ZH_MAP[keyOrig]) {
            return MOVIE_TITLE_ZH_MAP[keyOrig];
        }
        if (dynamicTitleCache.has(keyOrig)) {
            return dynamicTitleCache.get(keyOrig)!;
        }
        if (/[\u4e00-\u9fa5]{2,}/.test(originalTitle)) {
            return originalTitle.trim();
        }
    }

    // 如果已经包含单字汉字，直接返回
    if (/[\u4e00-\u9fa5]/.test(cleanInput)) {
        return cleanInput;
    }

    return cleanInput;
}

/**
 * 异步翻译未匹配的外文片名至中文（采用公共快速翻译服务 + 本地双层持久缓存）
 */
export async function translateForeignTitleOnline(title: string): Promise<string> {
    if (!title || !title.trim()) return '';
    const clean = title.trim();
    if (/[\u4e00-\u9fa5]{2,}/.test(clean)) return clean;

    const key = clean.toLowerCase();
    const syncResult = localizeChineseMovieTitle(clean);
    if (/[\u4e00-\u9fa5]/.test(syncResult)) {
        return syncResult;
    }

    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=zh-CN&dt=t&q=${encodeURIComponent(clean)}`;
        const res = await fetch(url);
        if (res.ok) {
            const data = await res.json();
            const translated = data?.[0]?.[0]?.[0];
            if (translated && typeof translated === 'string' && /[\u4e00-\u9fa5]/.test(translated)) {
                saveTitleCache(key, translated.trim());
                return translated.trim();
            }
        }
    } catch {
        // Fallback gracefully
    }

    return clean;
}

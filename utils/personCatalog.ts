import { normalizeTitle } from './titleNormalizer';
import { localizeChineseMovieTitle } from './movieTitleZhMap';
import { Movie } from '../types';

export interface FamousWork {
    title: string;
    year: string;
    role: string;
    rating?: number;
    overview?: string;
    posterUrl?: string;
}

export interface CuratedPerson {
    name: string;
    aliases: string[];
    role: string;
    avatar?: string;
    bio: string;
    works: FamousWork[];
}

/**
 * 经典名导与影人代表作智库（零延迟离线高品质数据，覆盖全球顶尖电影大师与演员）
 */
export const CURATED_PERSON_CATALOG: CuratedPerson[] = [
    {
        name: '克里斯托弗·诺兰',
        aliases: ['诺兰', 'Christopher Nolan', 'Nolan'],
        role: '导演 / 编剧 / 制片',
        bio: '当代好莱坞极具影响力的视效与非线性叙事大师，擅长硬科幻与复杂时间结构。',
        works: [
            { title: '奥本海默', year: '2023', role: '导演/编剧', rating: 8.8, overview: '原子弹之父的荣耀与道德困境。' },
            { title: '信条', year: '2020', role: '导演/编剧', rating: 7.7, overview: '时间逆转与谍战危机。' },
            { title: '敦刻尔克', year: '2017', role: '导演/编剧', rating: 8.4, overview: '海陆空三线交织的二战大撤退。' },
            { title: '星际穿越', year: '2014', role: '导演/编剧', rating: 9.4, overview: '爱与物理学超越时空的救赎之旅。' },
            { title: '黑暗骑士崛起', year: '2012', role: '导演/编剧', rating: 8.8, overview: '蝙蝠侠三部曲终章，黑暗骑士的涅槃。' },
            { title: '盗梦空间', year: '2010', role: '导演/编剧', rating: 9.3, overview: '多层梦境潜意识植入的教科书级神作。' },
            { title: '黑暗骑士', year: '2008', role: '导演/编剧', rating: 9.2, overview: '超级英雄影史巅峰，小丑与蝙蝠侠的秩序之战。' },
            { title: '致命魔术', year: '2006', role: '导演/编剧', rating: 8.9, overview: '两名魔术大师的宿命对决与极端执念。' },
            { title: '蝙蝠侠：侠影之谜', year: '2005', role: '导演/编剧', rating: 8.6, overview: '蝙蝠侠重塑之作，恐惧与正义的起源。' },
            { title: '白夜追凶', year: '2002', role: '导演', rating: 7.6, overview: '极昼之下的人性心理悬疑。' },
            { title: '记忆碎片', year: '2000', role: '导演/编剧', rating: 8.7, overview: '逆向倒叙视角的失忆复仇悬疑经典。' },
            { title: '追随', year: '1998', role: '导演/编剧', rating: 8.9, overview: '诺兰长片处女作，低成本黑白精巧叙事。' },
        ]
    },
    {
        name: '宫崎骏',
        aliases: ['宫崎 骏', 'Hayao Miyazaki', 'Miyazaki'],
        role: '动画导演 / 编剧 / 画家',
        bio: '吉卜力工作室灵魂人物，两度奥斯卡终身成就与最佳动画长片得主，充满自然与人文哲思。',
        works: [
            { title: '你想活出怎样的人生', year: '2023', role: '导演/编剧', rating: 7.7, overview: '少年成长与跨越时空的人生寓言。' },
            { title: '起风了', year: '2013', role: '导演/编剧', rating: 8.2, overview: '飞机设计师堀越二郎的梦想与现实。' },
            { title: '悬崖上的金鱼姬', year: '2008', role: '导演/编剧', rating: 8.6, overview: '人鱼波妞与宗介的纯真童话。' },
            { title: '哈尔的移动城堡', year: '2004', role: '导演/编剧', rating: 9.1, overview: '反战与自我接纳的奇幻浪漫史诗。' },
            { title: '千与千寻', year: '2001', role: '导演/编剧', rating: 9.4, overview: '柏林金熊奖与奥斯卡最佳动画，神隐世界的成长历险。' },
            { title: '幽灵公主', year: '1997', role: '导演/编剧', rating: 8.9, overview: '自然神明与人类文明不可调和的宏大思辨。' },
            { title: '红猪', year: '1992', role: '导演/编剧', rating: 8.6, overview: '亚得里亚海上的浪漫飞行员与中年情怀。' },
            { title: '魔女宅急便', year: '1989', role: '导演/编剧', rating: 8.7, overview: '小魔女琪琪的独立修行与青春蜕变。' },
            { title: '龙猫', year: '1988', role: '导演/编剧', rating: 9.2, overview: '温暖几代人的乡间精灵与童年回忆。' },
            { title: '天空之城', year: '1986', role: '导演/编剧', rating: 9.2, overview: '拉普达遗迹与飞行石的探险史诗。' },
            { title: '风之谷', year: '1984', role: '导演/编剧', rating: 8.9, overview: '末世生态与人与自然共存的早期集大成之作。' },
            { title: '鲁邦三世：卡里奥斯特罗之城', year: '1979', role: '导演/编剧', rating: 8.3, overview: '宫崎骏长片电影导演处女作。' },
        ]
    },
    {
        name: '姜文',
        aliases: ['Jiang Wen'],
        role: '导演 / 编剧 / 演员',
        bio: '中国当代极具作者风格与荷尔蒙气息的电影大师，隐喻与讽刺功力深厚。',
        works: [
            { title: '邪不压正', year: '2018', role: '导演/主演', rating: 7.2, overview: '民国北平屋顶上的快意恩仇与荒诞抗日。' },
            { title: '一步之遥', year: '2014', role: '导演/主演', rating: 6.6, overview: '花国大选引发的狂欢魔幻讽刺大戏。' },
            { title: '让子弹飞', year: '2010', role: '导演/主演', rating: 9.0, overview: '鹅城斗智斗勇，华语影史黑色幽默与政治隐喻巅峰。' },
            { title: '太阳照常升起', year: '2007', role: '导演/主演', rating: 8.3, overview: '诗意浪漫与魔幻现实主义的四段式绝美篇章。' },
            { title: '鬼子来了', year: '2000', role: '导演/主演', rating: 9.3, overview: '戛纳评委会大奖，深刻剖析国民性与战争本质的殿堂神作。' },
            { title: '阳光灿烂的日子', year: '1994', role: '导演/编剧', rating: 8.8, overview: '威尼斯影帝之作，部队大院青春荷尔蒙的永恒记忆。' },
        ]
    },
    {
        name: '李安',
        aliases: ['Ang Lee'],
        role: '导演 / 制片',
        bio: '兼具东西方文化精髓的国际电影大师，三获奥斯卡金像奖，情感细腻深刻。',
        works: [
            { title: '双子杀手', year: '2019', role: '导演', rating: 6.9, overview: '高帧率120帧技术革新之作。' },
            { title: '比利·林恩的中场战事', year: '2016', role: '导演', rating: 8.4, overview: '战争创伤与虚伪狂欢的微表情探索。' },
            { title: '少年派的奇幻漂流', year: '2012', role: '导演', rating: 9.1, overview: '奥斯卡最佳导演，信仰与人性的视觉哲学奇观。' },
            { title: '色，戒', year: '2007', role: '导演', rating: 8.7, overview: '威尼斯金狮奖，动荡年代下的肉体与情感博弈。' },
            { title: '断背山', year: '2005', role: '导演', rating: 8.8, overview: '威尼斯金狮奖与奥斯卡最佳导演，怀俄明群山间的隐秘深情。' },
            { title: '绿巨人浩克', year: '2003', role: '导演', rating: 6.8, overview: '将心理创伤融入超英大片的独创尝试。' },
            { title: '卧虎藏龙', year: '2000', role: '导演', rating: 8.4, overview: '奥斯卡最佳外语片，东方儒道哲思与武侠意境的完美融合。' },
            { title: '饮食男女', year: '1994', role: '导演/编剧', rating: 9.2, overview: '父亲三部曲终章，家庭伦理与美食人生的温情流淌。' },
            { title: '喜宴', year: '1993', role: '导演/编剧', rating: 9.0, overview: '柏林金熊奖，中西文化与家庭代际冲突的喜剧呈现。' },
            { title: '推手', year: '1991', role: '导演/编剧', rating: 8.5, overview: '太极拳师异国养老的文化孤独与和解。' },
        ]
    },
    {
        name: '丹尼斯·维伦纽瓦',
        aliases: ['维伦纽瓦', 'Denis Villeneuve', 'Villeneuve'],
        role: '导演 / 编剧',
        bio: '当代科幻与悬疑美学掌门人，极具辨识度的巨物崇拜与冷峻视听风格。',
        works: [
            { title: '沙丘2', year: '2024', role: '导演/编剧', rating: 8.3, overview: '厄拉科斯沙漠圣战与保罗的命运抉择。' },
            { title: '沙丘', year: '2021', role: '导演/编剧', rating: 7.7, overview: '视听震撼的太空歌剧序章。' },
            { title: '银翼杀手2049', year: '2017', role: '导演', rating: 8.3, overview: '赛博朋克影史神作续篇，复制人关于灵魂的追寻。' },
            { title: '降临', year: '2016', role: '导演', rating: 7.8, overview: '非线性语言与预知未来的科幻诗篇。' },
            { title: '边境杀手', year: '2015', role: '导演', rating: 7.7, overview: '美墨边境缉毒的残酷道德灰度。' },
            { title: '宿敌', year: '2013', role: '导演', rating: 7.4, overview: '潜意识心理与分身暗喻。' },
            { title: '囚徒', year: '2013', role: '导演', rating: 8.2, overview: '雨夜绑架案下的宗教与私刑救赎。' },
            { title: '焦土之城', year: '2010', role: '导演/编剧', rating: 8.6, overview: '震撼人心的中东家族寻亲悲歌与战争创伤。' },
        ]
    },
    {
        name: '王家卫',
        aliases: ['Wong Kar-wai', 'Kar-wai Wong'],
        role: '导演 / 编剧 / 制片',
        bio: '香港电影新浪潮旗手，独树一帜的抽帧慢镜、旗袍光影与都市疏离感金句大师。',
        works: [
            { title: '繁花', year: '2023', role: '导演/监制', rating: 8.7, overview: '90年代上海黄河路商海浮沉与时代情义。' },
            { title: '一代宗师', year: '2013', role: '导演/编剧', rating: 8.2, overview: '民国武林逝去的光辉与见天地见众生。' },
            { title: '蓝莓之夜', year: '2007', role: '导演/编剧', rating: 7.7, overview: '横跨全美的公路治愈爱情。' },
            { title: '2046', year: '2004', role: '导演/编剧', rating: 7.7, overview: '记忆列车与无法回头的旧日恋情。' },
            { title: '花样年华', year: '2000', role: '导演/编剧', rating: 8.8, overview: '戛纳影史经典，留白与旗袍下的欲说还休。' },
            { title: '春光乍泄', year: '1997', role: '导演/编剧', rating: 9.0, overview: '戛纳最佳导演，布宜诺斯艾利斯瀑布下的相聚与离散。' },
            { title: '堕落天使', year: '1995', role: '导演/编剧', rating: 8.4, overview: '广角镜头下的暗夜香港杀手与边缘人。' },
            { title: '东邪西毒', year: '1994', role: '导演/编剧', rating: 8.6, overview: '借武侠之壳写尽现代都市情感的醉生梦死。' },
            { title: '重庆森林', year: '1994', role: '导演/编剧', rating: 8.8, overview: '凤梨罐头与金城武、王菲的都市爱情寓言。' },
            { title: '阿飞正传', year: '1990', role: '导演/编剧', rating: 8.5, overview: '无脚鸟的追寻与一分钟朋友的宿命浪漫。' },
            { title: '旺角卡门', year: '1988', role: '导演/编剧', rating: 7.8, overview: '王家卫长片处女作，热血江湖与宿命爱情。' },
        ]
    },
    {
        name: '昆汀·塔伦蒂诺',
        aliases: ['昆汀', 'Quentin Tarantino', 'Tarantino'],
        role: '导演 / 编剧 / 演员',
        bio: '电影奇才，非线性叙事、话痨对白与暴力美学的集大成者，迷影文化至尊。',
        works: [
            { title: '好莱坞往事', year: '2019', role: '导演/编剧', rating: 7.4, overview: '致敬好莱坞黄金年代的浪漫童话改写。' },
            { title: '八恶人', year: '2015', role: '导演/编剧', rating: 8.5, overview: '70毫米超宽胶片雪夜木屋密室博弈。' },
            { title: '被解救的姜戈', year: '2012', role: '导演/编剧', rating: 8.8, overview: '西部赏金猎人与黑奴复仇血战。' },
            { title: '无耻混蛋', year: '2009', role: '导演/编剧', rating: 8.7, overview: '改写二战历史的影院刺杀大快人心。' },
            { title: '杀死比尔', year: '2003', role: '导演/编剧', rating: 8.4, overview: '新娘黄服复仇，致敬邵氏武侠与日本剑戟片。' },
            { title: '低俗小说', year: '1994', role: '导演/编剧', rating: 8.9, overview: '戛纳金棕榈，圆形环状多线叙事的影史丰碑。' },
            { title: '落水狗', year: '1992', role: '导演/编剧', rating: 8.4, overview: '抢劫珠宝店后的仓库抓卧底经典对峙。' },
        ]
    },
    {
        name: '周星驰',
        aliases: ['星爷', 'Stephen Chow'],
        role: '导演 / 主演 / 编剧',
        bio: '华语无厘头喜剧之王与电影大师，擅长以荒诞喜剧包裹底层小人物的悲喜。',
        works: [
            { title: '功夫女足', year: '2026', role: '导演/编剧', rating: 7.5, overview: '经典功夫足球女足新篇章。' },
            { title: '新喜剧之王', year: '2019', role: '导演/编剧', rating: 5.7, overview: '小镇大龄女龙套如梦的追梦心路。' },
            { title: '西游伏妖篇', year: '2017', role: '监制/编剧', rating: 5.5, overview: '驱魔师唐僧与孙悟空的师徒博弈。' },
            { title: '美人鱼', year: '2016', role: '导演/编剧', rating: 6.7, overview: '环保主题的童话式无厘头喜剧。' },
            { title: '西游·降魔篇', year: '2013', role: '导演/编剧', rating: 7.2, overview: '暗黑系西游奇幻，大爱与小爱的顿悟。' },
            { title: '长江七号', year: '2008', role: '导演/主演', rating: 7.1, overview: '外星萌宠与父子温情科幻。' },
            { title: '功夫', year: '2004', role: '导演/主演', rating: 8.9, overview: '华语动作喜剧视效巅峰，向经典武学致敬。' },
            { title: '少林足球', year: '2001', role: '导演/主演', rating: 8.1, overview: '少林功夫与现代足球结合的励志狂想。' },
            { title: '千王之王2000', year: '1999', role: '主演', rating: 7.1, overview: '赌术千王黄飞虎与千术江湖博弈。' },
            { title: '喜剧之王', year: '1999', role: '导演/主演', rating: 8.8, overview: '尹天仇的龙套辛酸，“我养你啊”的纯真承诺。' },
            { title: '行运一条龙', year: '1998', role: '主演', rating: 7.1, overview: '茶餐厅蛋挞王子何金水的爱情奇遇。' },
            { title: '算死草', year: '1997', role: '主演', rating: 7.1, overview: '状王陈梦吉智斗荒诞公堂。' },
            { title: '食神', year: '1996', role: '导演/主演', rating: 8.2, overview: '从商界狂傲到撒尿牛丸的烹饪悟道。' },
            { title: '大内密探零零发', year: '1996', role: '导演/主演', rating: 8.0, overview: '宫廷保龙一族与无厘头小发明。' },
            { title: '百变星君', year: '1995', role: '主演', rating: 7.7, overview: '人体改造与无厘头超能变身狂想。' },
            { title: '回魂夜', year: '1995', role: '主演', rating: 8.1, overview: '捉鬼大师里昂与捉鬼邪典黑色幽默。' },
            { title: '大话西游之大圣娶亲', year: '1995', role: '主演', rating: 9.2, overview: '一生所爱的宿命绝唱，至尊宝与紫霞仙子。' },
            { title: '大话西游之月光宝盒', year: '1995', role: '主演', rating: 9.0, overview: '五百年时空穿梭的无厘头爱情悲剧序幕。' },
            { title: '国产凌凌漆', year: '1994', role: '导演/主演', rating: 8.4, overview: '经典猪肉佬与金枪人谍战恶搞。' },
            { title: '九品芝麻官', year: '1994', role: '主演', rating: 8.7, overview: '包龙星智斗贪官污吏的公堂断案神作。' },
            { title: '破坏之王', year: '1994', role: '主演', rating: 7.9, overview: '外卖仔何金银苦练无敌风火轮战胜断水流大师兄。' },
            { title: '济公', year: '1993', role: '主演', rating: 7.5, overview: '降龙罗汉下凡度化三世恶人与九世野鸡。' },
            { title: '唐伯虎点秋香', year: '1993', role: '主演', rating: 8.7, overview: '华府书童9527与还我漂漂拳的合家欢喜剧。' },
            { title: '逃学威龙3龙过鸡年', year: '1993', role: '主演', rating: 7.4, overview: '周星星卧底亿万富翁王百万命案调查。' },
            { title: '武状元苏乞儿', year: '1992', role: '主演', rating: 8.1, overview: '广州提督之子落难成乞丐，悟出降龙十八掌。' },
            { title: '鹿鼎记2：神龙教', year: '1992', role: '主演', rating: 8.2, overview: '韦小宝智斗神龙教主与吴三桂。' },
            { title: '鹿鼎记', year: '1992', role: '主演', rating: 8.2, overview: '金庸武侠改编经典，市井小民韦小宝的清宫升职记。' },
            { title: '审死官', year: '1992', role: '主演', rating: 7.9, overview: '广东第一大状宋世杰封笔与替冤妇伸冤。' },
            { title: '逃学威龙2', year: '1992', role: '主演', rating: 7.9, overview: '交通警周星星卧底国际学校瓦解恐怖分子。' },
            { title: '漫画威龙', year: '1992', role: '主演', rating: 7.1, overview: '刘晶电角神拳对决黑帮郑横刀。' },
            { title: '家有喜事', year: '1992', role: '主演', rating: 8.5, overview: '常家三兄弟笑料百出的合家欢贺岁经典。' },
            { title: '情圣', year: '1991', role: '主演', rating: 7.4, overview: '骗术大师程胜与盲女阿萍的乌龙行骗。' },
            { title: '逃学威龙', year: '1991', role: '主演', rating: 8.1, overview: '飞虎队头目卧底圣德堡中学寻找善良之枪。' },
            { title: '赌侠2：上海滩赌圣', year: '1991', role: '主演', rating: 7.6, overview: '周星祖穿梭1937年上海滩对决川岛芳子。' },
            { title: '新精武门1991', year: '1991', role: '主演', rating: 7.4, overview: '右臂天生神力的大陆青年刘晶闯荡香港。' },
            { title: '整蛊专家', year: '1991', role: '主演', rating: 7.8, overview: '整蛊界之王古晶受雇拆散车文杰与程乐儿。' },
            { title: '龙的传人', year: '1991', role: '主演', rating: 7.4, overview: '大澳周小龙以高超台球技艺保卫祖产大戏。' },
            { title: '赌圣', year: '1990', role: '主演', rating: 7.8, overview: '左颂星特异功能看穿扑克牌，一战封神成赌圣。' },
            { title: '赌侠', year: '1990', role: '主演', rating: 7.8, overview: '赌侠陈刀仔与赌圣阿星联手铲除侯赛因。' },
            { title: '望夫成龙', year: '1990', role: '主演', rating: 7.6, overview: '石金水与吴带娣患难夫妻的都市打拼与救赎。' },
            { title: '一本漫画闯天涯', year: '1990', role: '主演', rating: 7.1, overview: '夜总会服务生阿星误打误撞卷入黑帮争斗。' },
            { title: '霹雳先锋', year: '1988', role: '主演', rating: 7.3, overview: '周星驰大银幕成名作，获金马奖最佳男配角。' },
        ]
    },
    {
        name: '大卫·芬奇',
        aliases: ['芬奇', 'David Fincher', 'Fincher'],
        role: '导演 / 制片',
        bio: '当代心理悬疑与暗黑美学宗师，精准考究的视听强迫症与人性阴暗面解构大师。',
        works: [
            { title: '杀手', year: '2023', role: '导演', rating: 7.2, overview: '职业杀手的精准内省与致命反击。' },
            { title: '曼克', year: '2020', role: '导演', rating: 7.4, overview: '黑白光影重回《公民凯恩》编剧风云。' },
            { title: '消失的爱人', year: '2014', role: '导演', rating: 8.7, overview: '婚姻杀机与媒体审判下的极端控制。' },
            { title: '龙纹身的女孩', year: '2011', role: '导演', rating: 8.0, overview: '冷峻硬核的北欧家族连环杀人案调查。' },
            { title: '社交网络', year: '2010', role: '导演', rating: 8.2, overview: 'Facebook 诞生记，数字时代友情与权力的撕裂。' },
            { title: '本杰明·巴顿奇事', year: '2008', role: '导演', rating: 8.9, overview: '逆向生长的一生，时间与爱恋的史诗。' },
            { title: '十二宫', year: '2007', role: '导演', rating: 7.6, overview: '未解悬案下的执念与时代心理创伤。' },
            { title: '搏击俱乐部', year: '1999', role: '导演', rating: 9.0, overview: '消费主义反叛与人格分裂的邪典影史神作。' },
            { title: '心理游戏', year: '1997', role: '导演', rating: 7.8, overview: '富豪的定制荒诞险境与心理重构。' },
            { title: '七宗罪', year: '1995', role: '导演', rating: 8.9, overview: '连环宗教杀人案，黑暗雨夜与绝望终局。' },
        ]
    },
    {
        name: '史蒂文·斯皮尔伯格',
        aliases: ['斯皮尔伯格', 'Steven Spielberg', 'Spielberg'],
        role: '导演 / 制片 / 编剧',
        bio: '好莱坞商业大片开创者与电影巨匠，童心造梦与严肃人道历史史诗的双重巅峰。',
        works: [
            { title: '造梦之家', year: '2022', role: '导演/编剧', rating: 7.8, overview: '斯皮尔伯格半自传电影，献给电影与家庭的情书。' },
            { title: '头号玩家', year: '2018', role: '导演', rating: 8.7, overview: '流行文化彩蛋与绿洲虚拟宇宙的冒险狂欢。' },
            { title: '林肯', year: '2012', role: '导演', rating: 7.9, overview: '废除奴隶制与南北战争决胜时刻的政治博弈。' },
            { title: '猫鼠游戏', year: '2002', role: '导演', rating: 9.1, overview: '天才伪造犯与 FBI 探员的猫鼠双雄传奇。' },
            { title: '少数派报告', year: '2002', role: '导演', rating: 7.9, overview: '预知犯罪与自由意志的硬科幻思辨。' },
            { title: '拯救大兵瑞恩', year: '1998', role: '导演', rating: 9.1, overview: '奥斯卡五项大奖，诺曼底登陆与生命价值的战争丰碑。' },
            { title: '辛德勒的名单', year: '1993', role: '导演', rating: 9.5, overview: '奥斯卡最佳影片，大屠杀中人性良知的黑白救赎。' },
            { title: '侏罗纪公园', year: '1993', role: '导演', rating: 8.2, overview: '影史视效奇迹，恐龙基因复活的生态灾难。' },
            { title: 'E.T.外星人', year: '1982', role: '导演', rating: 8.6, overview: '穿越星际的纯真友谊与自行车飞越月亮的经典瞬间。' },
            { title: '大白鲨', year: '1975', role: '导演', rating: 7.8, overview: '现代好莱坞暑期大片鼻祖，深海恐惧与惊悚经典。' },
        ]
    },
    {
        name: '詹姆斯·卡梅隆',
        aliases: ['卡神', '卡梅隆', 'James Cameron', 'Cameron'],
        role: '导演 / 编剧 / 制片',
        bio: '影史票房之神与电影工业技术先驱，视效革新与宏大叙事的极客导演。',
        works: [
            { title: '阿凡达：水之道', year: '2022', role: '导演/编剧', rating: 7.9, overview: '潘多拉水下生态视效奇观与家族守护。' },
            { title: '阿凡达', year: '2009', role: '导演/编剧', rating: 8.8, overview: '3D 电影工业革命，潘多拉星球的壮丽史诗。' },
            { title: '泰坦尼克号', year: '1997', role: '导演/编剧', rating: 9.5, overview: '影史传奇，旷世海难下的杰克与露丝生死绝恋。' },
            { title: '真实的谎言', year: '1994', role: '导演/编剧', rating: 8.3, overview: '特工家庭危机与好莱坞动作喜剧经典。' },
            { title: '终结者2：审判日', year: '1991', role: '导演/编剧', rating: 8.8, overview: '液态金属 T-1000 与科幻动作片里程碑。' },
            { title: '异形2', year: '1986', role: '导演/编剧', rating: 8.1, overview: '太空陆战队血战异形母体，硬派动作科幻巅峰。' },
            { title: '终结者', year: '1984', role: '导演/编剧', rating: 8.2, overview: '时间悖论与杀手机器人的开山之作。' },
        ]
    },
    {
        name: '奉俊昊',
        aliases: ['Bong Joon-ho', 'Bong Joon Ho'],
        role: '导演 / 编剧',
        bio: '韩国首位戛纳金棕榈与奥斯卡最佳影片双料得主，擅长阶级寓言与类型片颠覆。',
        works: [
            { title: '寄生虫', year: '2019', role: '导演/编剧', rating: 8.8, overview: '金棕榈与奥斯卡四项大奖，贫富阶级寄生的社会寓言。' },
            { title: '玉子', year: '2017', role: '导演/编剧', rating: 6.7, overview: '少女与基因巨猪的跨国救援与资本讽刺。' },
            { title: '雪国列车', year: '2013', role: '导演/编剧', rating: 7.6, overview: '永动机末日列车上的车尾底层暴动。' },
            { title: '母亲', year: '2009', role: '导演/编剧', rating: 8.3, overview: '为智障儿子洗冤的极度母爱与道德崩塌。' },
            { title: '汉江怪物', year: '2006', role: '导演/编剧', rating: 7.6, overview: '汉江变异怪物袭击下的平民家庭营救。' },
            { title: '杀人回忆', year: '2003', role: '导演/编剧', rating: 8.9, overview: '华城连环杀人案，亚洲悬疑犯罪电影殿堂神作。' },
            { title: '绑架门口狗', year: '2000', role: '导演/编剧', rating: 7.5, overview: '奉俊昊长片处女作，公寓寻狗黑色荒诞喜剧。' },
        ]
    },
    {
        name: '是枝裕和',
        aliases: ['Hirokazu Kore-eda', 'Koreeda Hirokazu'],
        role: '导演 / 编剧',
        bio: '日本当代家庭人文主义大师，戛纳金棕榈得主，以克制细腻的日常流淌探寻血缘与情感本质。',
        works: [
            { title: '怪物', year: '2023', role: '导演', rating: 8.6, overview: '戛纳最佳编剧，罗生门三重视角下的少年心事与偏见。' },
            { title: '掮客', year: '2022', role: '导演/编剧', rating: 6.8, overview: '婴儿暂存箱引出的非血缘公路温情。' },
            { title: '小偷家族', year: '2018', role: '导演/编剧', rating: 8.7, overview: '戛纳金棕榈，没有血缘却胜似家人的边缘人群羁绊。' },
            { title: '第三度嫌疑人', year: '2017', role: '导演/编剧', rating: 7.1, overview: '法庭罗生门与真相盲区的悬疑探讨。' },
            { title: '比海更深', year: '2016', role: '导演/编剧', rating: 8.8, overview: '台风夜的废柴中年与母子日常哲思。' },
            { title: '海街日记', year: '2015', role: '导演/编剧', rating: 8.8, overview: '镰仓四季流转，四姐妹的美丽与哀愁。' },
            { title: '如父如子', year: '2013', role: '导演/编剧', rating: 8.7, overview: '抱错婴儿事件下的血缘与陪伴思辨。' },
            { title: '步履不停', year: '2008', role: '导演/编剧', rating: 8.8, overview: '家庭忌日的暗流涌动与人生总是慢半拍的遗憾。' },
            { title: '无人知晓', year: '2004', role: '导演/编剧', rating: 9.1, overview: '被遗弃四兄妹的残酷生存物语，戛纳最年轻影帝。' },
        ]
    },
    {
        name: '丹·特拉亨伯格',
        aliases: ['Dan Trachtenberg', '特拉亨伯格'],
        role: '导演',
        bio: '好莱坞青年新锐科幻导演，擅长密闭空间博弈与经典 IP 的惊艳重启。',
        works: [
            { title: '铁血战士：杀戮之地', year: '2025', role: '导演', rating: 7.5, overview: '铁血战士全新世界观续篇。' },
            { title: '铁血战士：狩猎', year: '2022', role: '导演', rating: 6.4, overview: '300年前印第安科曼奇少女与外星铁血战士的原始猎杀。' },
            { title: '黑镜：终结测试', year: '2016', role: '导演', rating: 8.8, overview: '沉浸式 VR 恐怖游戏与深层脑神经恐惧。' },
            { title: '科洛弗道10号', year: '2016', role: '导演', rating: 6.9, overview: '地下防空洞三人的心理猜忌与末日未知。' },
            { title: '黑袍纠察队', year: '2019', role: '导演', rating: 8.6, overview: '执导第一季先导集，颠覆伪善超级英雄。' },
        ]
    },
    {
        name: '成龙',
        aliases: ['Jackie Chan', '房仕龙', '陈港生'],
        role: '导演 / 主演 / 动作指导',
        bio: '华语功夫喜剧巨星，奥斯卡终身成就奖得主，开创搏命杂耍式硬核动作喜剧先河。',
        works: [
            { title: '新警察故事', year: '2004', role: '主演/动作指导', rating: 7.9, overview: '荣光背后的挫败与湾仔会展中心巅峰对决。' },
            { title: '宝贝计划', year: '2006', role: '主演/动作指导', rating: 7.6, overview: '贼盗三人组与萌宝的温情救赎。' },
            { title: '神话', year: '2005', role: '主演/动作指导', rating: 7.1, overview: '蒙毅将军与玉漱公主跨越千年的凄美爱恋。' },
            { title: '尖峰时刻', year: '1998', role: '主演', rating: 7.4, overview: '好莱坞跨国双雄搭档警匪喜剧典范。' },
            { title: '红番区', year: '1995', role: '主演/动作指导', rating: 7.6, overview: '成龙挺进好莱坞的里程碑之作，跳气垫船惊世一跃。' },
            { title: '醉拳2', year: '1994', role: '主演/动作指导', rating: 8.0, overview: '工业时代的黄飞鸿醉八仙与传统武术尊严。' },
            { title: '城市猎人', year: '1993', role: '主演', rating: 7.7, overview: '孟波街头霸王变身与豪华游轮大乱斗。' },
            { title: '双龙会', year: '1992', role: '主演/动作指导', rating: 7.6, overview: '失散孪生兄弟互换人生的爆笑乌龙。' },
            { title: '飞鹰计划', year: '1991', role: '导演/主演', rating: 8.0, overview: '撒哈拉大沙漠寻宝与风洞基地终极对决。' },
            { title: '奇迹', year: '1989', role: '导演/主演', rating: 8.0, overview: '致敬好莱坞经典黑帮喜剧，长镜头调度巅峰。' },
            { title: '警察故事续集', year: '1988', role: '导演/主演', rating: 7.9, overview: '陈家驹智斗炸弹狂徒与废弃厂房血战。' },
            { title: 'A计划续集', year: '1987', role: '导演/主演', rating: 8.0, overview: '清末香港警署多方势力大乱斗。' },
            { title: '警察故事', year: '1985', role: '导演/主演', rating: 8.2, overview: '香港金像奖最佳影片，商场跳吊灯影史传奇。' },
            { title: '快餐车', year: '1984', role: '主演/动作指导', rating: 7.7, overview: '西班牙巴塞罗那街头飞车与古堡决战喷气机宾尼。' },
            { title: 'A计划', year: '1983', role: '导演/主演', rating: 8.1, overview: '水警与陆警联手剿灭罗三炮，钟楼下坠经典特技。' },
            { title: '醉拳', year: '1978', role: '主演/动作指导', rating: 7.7, overview: '苏乞儿传授醉八仙，成龙功夫喜剧开山之作。' },
            { title: '蛇形刁手', year: '1978', role: '主演/动作指导', rating: 7.4, overview: '猫爪融合蛇形拳破鹰爪门，崭露头角成名作。' },
        ]
    },
    {
        name: '刘德华',
        aliases: ['Andy Lau', '华仔', '华哥'],
        role: '主演 / 监制 / 歌手',
        bio: '华语影坛劳模巨星与三届香港金像奖影帝，塑造无数警匪、枭雄与市井平民经典形象。',
        works: [
            { title: '流浪地球2', year: '2023', role: '主演', rating: 8.3, overview: '图恒宇数字生命与父女时空相见。' },
            { title: '拆弹专家2', year: '2020', role: '主演/监制', rating: 7.5, overview: '潘乘风双重记忆与青马大桥核弹危机。' },
            { title: '追龙', year: '2017', role: '主演/监制', rating: 7.2, overview: '雷洛与跛豪称霸六七十年代香港黑白两道。' },
            { title: '桃姐', year: '2011', role: '主演/监制', rating: 8.3, overview: '少爷与老佣人之间至真至纯的人间温情。' },
            { title: '投名状', year: '2007', role: '主演', rating: 7.8, overview: '清末乱世兄弟结义与权欲背叛悲歌。' },
            { title: '门徒', year: '2007', role: '主演', rating: 7.9, overview: '毒枭林昆的家族宿命与毒品危害警世录。' },
            { title: '天下无贼', year: '2004', role: '主演', rating: 8.1, overview: '列车盗贼夫妻守护傻根纯真的救赎之旅。' },
            { title: '无间道3：终极无间', year: '2003', role: '主演', rating: 8.1, overview: '刘建明精神分裂与想做个好人的无尽折磨。' },
            { title: '大块头有大智慧', year: '2003', role: '主演', rating: 6.8, overview: '金像奖最佳男主角，因果业力与放下执念。' },
            { title: '无间道', year: '2002', role: '主演', rating: 9.3, overview: '天台对峙“给我一个机会，我想做个好人”。' },
            { title: '瘦身男女', year: '2001', role: '主演', rating: 7.0, overview: '肥佬与肥燕的励志爱情贺岁经典。' },
            { title: '暗战', year: '1999', role: '主演', rating: 8.6, overview: '首夺金像影帝，72小时绝症大盗与谈判专家的智谋博弈。' },
            { title: '天若有情', year: '1990', role: '主演', rating: 8.4, overview: '华弟骑摩托载婚纱 JoJo，浪漫江湖绝唱。' },
            { title: '赌侠', year: '1990', role: '主演', rating: 7.8, overview: '赌神徒弟陈刀仔与赌圣联手惩恶。' },
            { title: '五亿探长雷洛传', year: '1991', role: '主演', rating: 7.9, overview: '清廉警察到掌控三万警力总华探长的枭雄史诗。' },
            { title: '旺角卡门', year: '1988', role: '主演', rating: 7.8, overview: '王家卫处女作，阿杰与乌蝇的江湖宿命。' },
        ]
    },
    {
        name: '梁朝伟',
        aliases: ['Tony Leung', '伟仔'],
        role: '主演',
        bio: '华语殿堂级演技之神，戛纳影帝与威尼斯终身成就奖得主，擅长眼神微表情与忧郁深邃刻画。',
        works: [
            { title: '金手指', year: '2023', role: '主演', rating: 6.2, overview: '佳宁集团百亿金融巨骗风云。' },
            { title: '无名', year: '2023', role: '主演', rating: 6.6, overview: '抗战时期隐蔽战线地下党生死博弈。' },
            { title: '一代宗师', year: '2013', role: '主演', rating: 8.2, overview: '叶问的一生与逝去的民国武林风骨。' },
            { title: '色，戒', year: '2007', role: '主演', rating: 8.7, overview: '易先生的谨慎阴冷与人性深渊的情欲纠缠。' },
            { title: '2046', year: '2004', role: '主演', rating: 7.7, overview: '周慕云在文字与过往女子中追寻遗失记忆。' },
            { title: '无间道', year: '2002', role: '主演', rating: 9.3, overview: '陈永仁“对不起，我是警察”，影史卧底巅峰。' },
            { title: '英雄', year: '2002', role: '主演', rating: 7.7, overview: '残剑断绝天下私仇，领悟天下大义。' },
            { title: '花样年华', year: '2000', role: '主演', rating: 8.8, overview: '戛纳最佳男主角，吴哥窟树洞倾诉秘密。' },
            { title: '暗花', year: '1998', role: '主演', rating: 8.4, overview: '澳门黑帮火拼夜，命运棋子的残酷死局。' },
            { title: '春光乍泄', year: '1997', role: '主演', rating: 9.0, overview: '黎耀辉与何宝荣在阿根廷瀑布下的爱与痛。' },
            { title: '重庆森林', year: '1994', role: '主演', rating: 8.8, overview: '警察663与快餐店阿菲的梦幻邂逅。' },
            { title: '东邪西毒', year: '1994', role: '主演', rating: 8.6, overview: '盲武士在桃花树下的最后决绝一战。' },
            { title: '辣手神探', year: '1992', role: '主演', rating: 8.1, overview: '吴宇森暴力美学，卧底阿浪与神探袁浩云医院大战。' },
            { title: '喋血街头', year: '1990', role: '主演', rating: 8.3, overview: '越南动荡战火下的兄弟反目与人性崩解。' },
            { title: '悲情城市', year: '1989', role: '主演', rating: 9.0, overview: '威尼斯金狮奖，侯孝贤镜头下的林家家族史诗。' },
        ]
    },
    {
        name: '张艺谋',
        aliases: ['Zhang Yimou', '老谋子'],
        role: '导演 / 摄影 / 演员',
        bio: '中国第五代导演领军人物，两度威尼斯金狮、柏林金熊得主，极具震撼力的色彩美学与宏大场面大师。',
        works: [
            { title: '第二十条', year: '2024', role: '导演', rating: 7.5, overview: '正当防卫与法条背后的人情世故。' },
            { title: '满江红', year: '2023', role: '导演', rating: 7.0, overview: '南宋行辕反转悬疑与岳飞遗篇壮志。' },
            { title: '悬崖之上', year: '2021', role: '导演', rating: 7.5, overview: '伪满洲国哈尔滨冰雪谍战死斗。' },
            { title: '一秒钟', year: '2020', role: '导演/编剧', rating: 7.7, overview: '胶片时代献给电影的情书与父女深情。' },
            { title: '影', year: '2018', role: '导演', rating: 7.2, overview: '水墨阴阳美学与替身权谋厮杀。' },
            { title: '归来', year: '2014', role: '导演', rating: 8.0, overview: '动荡岁月后的相见不相识与默默守候。' },
            { title: '金陵十三钗', year: '2011', role: '导演', rating: 8.3, overview: '南京沦陷浩劫下青楼女子的舍生取义。' },
            { title: '英雄', year: '2002', role: '导演/编剧', rating: 7.7, overview: '开启中国商业大片时代，刺秦天下大义。' },
            { title: '我的父亲母亲', year: '1999', role: '导演', rating: 8.2, overview: '柏林银熊奖，乡村纯真爱恋的彩色回忆。' },
            { title: '一个都不能少', year: '1999', role: '导演', rating: 8.1, overview: '威尼斯金狮奖，农村代课小老师寻学生。' },
            { title: '活着', year: '1994', role: '导演', rating: 9.3, overview: '戛纳评审团大奖，福贵在时代风暴中的生命韧性。' },
            { title: '秋菊打官司', year: '1992', role: '导演', rating: 8.2, overview: '威尼斯金狮奖，农村妇女为要个说法层层告状。' },
            { title: '大红灯笼高高挂', year: '1991', role: '导演', rating: 8.8, overview: '乔家大院封建礼教吃人的红黑绝望美学。' },
            { title: '菊豆', year: '1990', role: '导演', rating: 8.2, overview: '染坊里的欲望挣扎与封建悲剧。' },
            { title: '红高粱', year: '1987', role: '导演', rating: 8.5, overview: '柏林金熊奖，十八里坡高粱地里的原始生命力。' },
        ]
    },
    {
        name: '杜琪峰',
        aliases: ['Johnnie To', '杜sir'],
        role: '导演 / 监制',
        bio: '银河映像掌门人，华语黑色警匪与站位调度宗师，宿命论与兄弟情义的冷峻描摹者。',
        works: [
            { title: '毒战', year: '2012', role: '导演/监制', rating: 7.6, overview: '公安缉毒与亡命毒贩的残酷纪实枪战。' },
            { title: '夺命金', year: '2011', role: '导演/监制', rating: 7.3, overview: '欧债危机下股灾众生相的荒诞讽刺。' },
            { title: '神探', year: '2007', role: '导演/监制', rating: 8.5, overview: '割耳神探看穿每个人心中的多重鬼魅。' },
            { title: '放·逐', year: '2006', role: '导演/监制', rating: 8.3, overview: '澳门回归前夕五位杀手的快意恩仇与金条宿命。' },
            { title: '黑社会2：以和为贵', year: '2006', role: '导演/监制', rating: 8.2, overview: '吉米仔为做生意被迫陷入更深政治权力漩涡。' },
            { title: '黑社会', year: '2005', role: '导演/监制', rating: 8.4, overview: '戛纳主竞赛，龙头棍争夺战下的帮派权力更迭。' },
            { title: '柔道龙虎榜', year: '2004', role: '导演/监制', rating: 7.8, overview: '致敬黑泽明，失明柔道手的热血重生。' },
            { title: 'PTU', year: '2003', role: '导演/监制', rating: 8.1, overview: '九龙暗夜失枪事件引出的机动部队寻枪之旅。' },
            { title: '枪火', year: '1999', role: '导演/监制', rating: 8.8, overview: '商场静止站位保卫文哥，华语黑帮神级调度。' },
            { title: '暗战', year: '1999', role: '导演/监制', rating: 8.6, overview: '谈判专家与绝症贼王跨越三天的智力博弈。' },
            { title: '再见阿郎', year: '1999', role: '导演/监制', rating: 8.0, overview: '过气黑道大哥出狱后的尊严与爱情。' },
            { title: '阿郎的故事', year: '1989', role: '导演', rating: 8.6, overview: '浪子赛车手阿郎的父子情与赛道终极绝唱。' },
        ]
    },
    {
        name: '阿尔弗雷德·希区柯克',
        aliases: ['希区柯克', 'Alfred Hitchcock', 'Hitchcock'],
        role: '导演 / 编剧 / 制片',
        bio: '影史悬疑惊悚电影之父，麦格芬与视线操控宗师，影响后世百年的视听语言发明家。',
        works: [
            { title: '惊魂记', year: '1960', role: '导演', rating: 9.0, overview: '浴室谋杀与贝茨旅馆人格分裂的影史惊悚丰碑。' },
            { title: '西北偏北', year: '1959', role: '导演', rating: 8.3, overview: '麦田飞机追杀与总统雕像悬崖对决，特工片鼻祖。' },
            { title: '迷魂记', year: '1958', role: '导演', rating: 8.8, overview: '影史视效变焦镜头与恐高症侦探的幻象执念。' },
            { title: '后窗', year: '1954', role: '导演', rating: 8.7, overview: '骨折摄影师通过长焦镜头窥视邻居谋杀案。' },
            { title: '电话谋杀案', year: '1954', role: '导演', rating: 8.8, overview: '密室完美谋杀与关键钥匙的精巧破案。' },
            { title: '索绳', year: '1948', role: '导演', rating: 8.1, overview: '伪一镜到底的客厅谋杀案哲学挑战。' },
            { title: '蝴蝶梦', year: '1940', role: '导演', rating: 8.2, overview: '奥斯卡最佳影片，曼德利庄园前女主人阴魂不散。' },
        ]
    },
    {
        name: '斯坦利·库布里克',
        aliases: ['库布里克', 'Stanley Kubrick', 'Kubrick'],
        role: '导演 / 编剧 / 制片',
        bio: '影史无可超越的哲学与视听巨匠，单点透视对称构图与对人类文明终极思辨的电影哲学家。',
        works: [
            { title: '大开眼戒', year: '1999', role: '导演/编剧', rating: 8.0, overview: '库布里克遗作，中产阶级婚姻与秘密假面会社。' },
            { title: '全金属外壳', year: '1987', role: '导演/编剧', rating: 8.6, overview: '越战军营泯灭人性训练与战场残酷异化。' },
            { title: '闪灵', year: '1980', role: '导演/编剧', rating: 8.3, overview: '远望饭店大雪封山，作家杰克疯狂斧劈门经典。' },
            { title: '乱世儿女', year: '1975', role: '导演/编剧', rating: 8.8, overview: '全自然烛光拍摄，18世纪欧洲贵族浮沉史诗。' },
            { title: '发条橙', year: '1971', role: '导演/编剧', rating: 8.6, overview: '反乌托邦社会对暴力少年的洗脑治疗与自由意志探讨。' },
            { title: '2001太空漫游', year: '1968', role: '导演/编剧', rating: 8.9, overview: '科幻影史第一神作，骨头跨越百万年化作宇宙飞船。' },
            { title: '奇爱博士', year: '1964', role: '导演/编剧', rating: 8.9, overview: '冷战核毁灭阴云下的极致黑色荒诞讽刺。' },
            { title: '光荣之路', year: '1957', role: '导演/编剧', rating: 9.1, overview: '一战法军军官为无辜士兵抗辩军法处决。' },
        ]
    },
    {
        name: '新海诚',
        aliases: ['Makoto Shinkai', '新海 诚'],
        role: '动画导演 / 编剧',
        bio: '日本当代动画电影领军人物，光影桌面壁纸画风与距离、思念、灾难救赎的诗意书写者。',
        works: [
            { title: '铃芽之旅', year: '2022', role: '导演/编剧', rating: 7.3, overview: '废墟关门之旅与日本311大地震心灵创伤救赎。' },
            { title: '天气之子', year: '2019', role: '导演/编剧', rating: 7.1, overview: '连绵暴雨东京与为了你宁可让世界淹没的少年执念。' },
            { title: '你的名字。', year: '2016', role: '导演/编剧', rating: 8.5, overview: '时空互换彗星灾难，黄昏之时追寻不知姓名之人。' },
            { title: '言叶之庭', year: '2013', role: '导演/编剧', rating: 8.3, overview: '雨季新宿御苑，制鞋高中生与文学女教师的心灵避难所。' },
            { title: '秒速5厘米', year: '2007', role: '导演/编剧', rating: 8.3, overview: '樱花下落的速度，少年与少女被时间距离冲淡的初恋。' },
            { title: '云之彼端，约定的地方', year: '2004', role: '导演/编剧', rating: 7.7, overview: '平行世界巨塔与沉睡少女的约定。' },
            { title: '星之声', year: '2002', role: '导演/编剧', rating: 8.1, overview: '相距光年的宇宙短信与跨越时空的爱恋。' },
        ]
    },
    {
        name: '韦斯·安德森',
        aliases: ['Wes Anderson', '安德森'],
        role: '导演 / 编剧 / 制片',
        bio: '强迫症对称美学与马卡龙撞色大师，绘本式童话感与冷幽默叙事的视觉造梦师。',
        works: [
            { title: '亨利·休格的神奇故事', year: '2023', role: '导演/编剧', rating: 8.2, overview: '罗尔德·达尔短篇小说改编，剧场化极速叙事。' },
            { title: '小行星城', year: '2023', role: '导演/编剧', rating: 6.8, overview: '50年代复古沙漠小镇与外星人造访的戏中戏。' },
            { title: '法兰西特派', year: '2021', role: '导演/编剧', rating: 7.7, overview: '献给纸媒黄金年代记者的三段式杂志风情画。' },
            { title: '犬之岛', year: '2018', role: '导演/编剧', rating: 8.3, overview: '柏林最佳导演，垃圾岛寻狗定格动画寓言。' },
            { title: '布达佩斯大饭店', year: '2014', role: '导演/编剧', rating: 8.9, overview: '粉色欧洲昔日文明余晖，大堂经理与门童传奇。' },
            { title: '月升王国', year: '2012', role: '导演/编剧', rating: 8.4, overview: '童子军小男孩与叛逆少女的童真岛屿私奔。' },
            { title: '了不起的狐狸爸爸', year: '2009', role: '导演/编剧', rating: 8.6, overview: '狐狸一家的农场大劫案定格动画神作。' },
            { title: '穿越大吉岭', year: '2007', role: '导演/编剧', rating: 7.8, overview: '三兄弟穿越印度的火车心灵治愈之旅。' },
        ]
    }
];

/**
 * 根据影人姓名获取预置代表作
 */
export function getCuratedPerson(name: string): CuratedPerson | null {
    if (!name || !name.trim()) return null;
    const norm = normalizeTitle(name.trim());
    return CURATED_PERSON_CATALOG.find(p => {
        const pNorm = normalizeTitle(p.name);
        if (pNorm.includes(norm) || norm.includes(pNorm)) return true;
        return p.aliases.some(alias => {
            const aNorm = normalizeTitle(alias);
            return aNorm.includes(norm) || norm.includes(aNorm);
        });
    }) || null;
}

export interface UnifiedWorkItem {
    title: string;
    year?: string;
    role?: string;
    rating?: number;
    overview?: string;
    posterUrl?: string;
    isWatched?: boolean;
    isWatching?: boolean;
    isPlanning?: boolean;
    localMovie?: Movie;
}

/**
 * 统一构建影人生涯代表作全景清单（智库 + TMDB 履历 + 本地记录三源去重合并）
 * 确保「影人宇宙」与「专栏详情」两处使用的代表作清单与总数 100% 绝对一致
 */
export function buildUnifiedCareerWorks(
    personName: string,
    curated: CuratedPerson | null,
    tmdbCredits: any[] | null | undefined,
    localMovies: Movie[]
): UnifiedWorkItem[] {
    const worksMap = new Map<string, UnifiedWorkItem>();

    // 1. 优先载入名导智库官方代表作
    if (curated && curated.works) {
        curated.works.forEach(w => {
            const localized = localizeChineseMovieTitle(w.title);
            const norm = normalizeTitle(localized);
            worksMap.set(norm, {
                title: localized,
                year: w.year,
                role: w.role,
                rating: w.rating,
                overview: w.overview
            });
        });
    }

    // 2. 载入 TMDB 权威履历作品
    if (tmdbCredits && Array.isArray(tmdbCredits)) {
        tmdbCredits.forEach(c => {
            if (!c || !c.title) return;
            const localized = localizeChineseMovieTitle(c.title, c.originalTitle);
            const norm = normalizeTitle(localized);
            if (!worksMap.has(norm)) {
                worksMap.set(norm, {
                    title: localized,
                    year: c.year,
                    role: c.role,
                    rating: c.voteAverage || c.rating,
                    overview: c.overview,
                    posterUrl: c.posterUrl || undefined
                });
            }
        });
    }

    // 3. 载入本地已收录作品
    if (localMovies && Array.isArray(localMovies)) {
        localMovies.forEach(m => {
            if (!m || !m.title) return;
            const localized = localizeChineseMovieTitle(m.title, m.originalTitle);
            const norm = normalizeTitle(localized);
            if (!worksMap.has(norm)) {
                worksMap.set(norm, {
                    title: localized,
                    year: m.year || '',
                    role: m.director?.includes(personName) ? '导演' : '参演',
                    rating: m.rating,
                    overview: m.overview,
                    posterUrl: m.posterImage || undefined
                });
            }
        });
    }

    return Array.from(worksMap.values()).sort((a, b) => {
        const yA = parseInt(a.year || '') || 0;
        const yB = parseInt(b.year || '') || 0;
        return yB - yA;
    });
}

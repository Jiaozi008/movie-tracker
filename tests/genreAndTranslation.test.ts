import { describe, it, expect } from 'vitest';
import { translateCountry, parseTmdbGenres, TMDB_GENRE_MAP } from '../services/tmdbService';
import { buildInitialState } from '../hooks/useMovieForm';
import { Movie, MovieStatus } from '../types';

describe('TMDB Multi-language Country Translation Tests', () => {
    it('应正确翻译主要影视国家及地区代码', () => {
        expect(translateCountry('US')).toBe('美国');
        expect(translateCountry('CN')).toBe('中国');
        expect(translateCountry('HK')).toBe('中国香港');
        expect(translateCountry('TW')).toBe('中国台湾');
        expect(translateCountry('JP')).toBe('日本');
        expect(translateCountry('KR')).toBe('韩国');
        expect(translateCountry('GB')).toBe('英国');
        expect(translateCountry('UK')).toBe('英国');
        expect(translateCountry('FR')).toBe('法国');
        expect(translateCountry('DE')).toBe('德国');
        expect(translateCountry('IT')).toBe('意大利');
        expect(translateCountry('ES')).toBe('西班牙');
        expect(translateCountry('CA')).toBe('加拿大');
        expect(translateCountry('IN')).toBe('印度');
        expect(translateCountry('TH')).toBe('泰国');
        expect(translateCountry('RU')).toBe('俄罗斯');
    });

    it('应支持扩展的全球多国语言及地区代码（大洋洲、欧洲、拉美、东南亚等）', () => {
        expect(translateCountry('AU')).toBe('澳大利亚');
        expect(translateCountry('NZ')).toBe('新西兰');
        expect(translateCountry('SE')).toBe('瑞典');
        expect(translateCountry('NO')).toBe('挪威');
        expect(translateCountry('DK')).toBe('丹麦');
        expect(translateCountry('FI')).toBe('芬兰');
        expect(translateCountry('NL')).toBe('荷兰');
        expect(translateCountry('BE')).toBe('比利时');
        expect(translateCountry('PL')).toBe('波兰');
        expect(translateCountry('IE')).toBe('爱尔兰');
        expect(translateCountry('BR')).toBe('巴西');
        expect(translateCountry('MX')).toBe('墨西哥');
        expect(translateCountry('AR')).toBe('阿根廷');
        expect(translateCountry('IR')).toBe('伊朗');
        expect(translateCountry('TR')).toBe('土耳其');
        expect(translateCountry('SG')).toBe('新加坡');
        expect(translateCountry('MY')).toBe('马来西亚');
        expect(translateCountry('VN')).toBe('越南');
        expect(translateCountry('ID')).toBe('印度尼西亚');
        expect(translateCountry('PH')).toBe('菲律宾');
        expect(translateCountry('CH')).toBe('瑞士');
        expect(translateCountry('AT')).toBe('奥地利');
        expect(translateCountry('GR')).toBe('希腊');
        expect(translateCountry('PT')).toBe('葡萄牙');
        expect(translateCountry('CZ')).toBe('捷克');
        expect(translateCountry('HU')).toBe('匈牙利');
        expect(translateCountry('ZA')).toBe('南非');
        expect(translateCountry('EG')).toBe('埃及');
        expect(translateCountry('IS')).toBe('冰岛');
        expect(translateCountry('CL')).toBe('智利');
        expect(translateCountry('CO')).toBe('哥伦比亚');
        expect(translateCountry('UA')).toBe('乌克兰');
    });

    it('已是中文的国名应直接保留', () => {
        expect(translateCountry('FR', '法国')).toBe('法国');
        expect(translateCountry('', '冰岛')).toBe('冰岛');
    });
});

describe('TMDB Genre and Category Auto-fill Tests', () => {
    it('单一「剧情」或「Drama」作品绝不能被误清空', () => {
        expect(parseTmdbGenres([{ id: 18 }])).toBe('剧情');
        expect(parseTmdbGenres([{ name: 'Drama' }])).toBe('剧情');
        expect(parseTmdbGenres([{ name: '剧情' }])).toBe('剧情');
    });

    it('应正确解析 TMDB 电影标准分类与多标签去重', () => {
        expect(parseTmdbGenres([{ id: 28 }, { id: 12 }, { id: 878 }])).toBe('动作, 冒险, 科幻');
        expect(parseTmdbGenres([{ name: 'Action' }, { name: 'Science Fiction' }])).toBe('动作, 科幻');
        expect(parseTmdbGenres([{ name: 'Crime' }, { name: 'Mystery' }, { name: 'Drama' }])).toBe('犯罪, 悬疑, 剧情');
    });

    it('应正确解析 TMDB 电视剧复合类型（如 Sci-Fi & Fantasy, Action & Adventure）', () => {
        expect(parseTmdbGenres([{ id: 10765 }])).toBe('科幻, 奇幻');
        expect(parseTmdbGenres([{ name: 'Sci-Fi & Fantasy' }])).toBe('科幻, 奇幻');
        expect(parseTmdbGenres([{ id: 10759 }])).toBe('动作, 冒险');
        expect(parseTmdbGenres([{ name: 'Action & Adventure' }])).toBe('动作, 冒险');
        expect(parseTmdbGenres([{ id: 10768 }])).toBe('战争, 政治');
        expect(parseTmdbGenres([{ name: 'War & Politics' }])).toBe('战争, 政治');
        expect(parseTmdbGenres([{ name: 'Animation' }, { name: 'Comedy' }])).toBe('动画, 喜剧');
    });

    it('应支持多语种（日文、韩文、法文、西班牙文）分类名称直接汉化', () => {
        expect(parseTmdbGenres([{ name: 'アニメ' }])).toBe('动画');
        expect(parseTmdbGenres([{ name: '액션' }, { name: '스릴러' }])).toBe('动作, 惊悚');
        expect(parseTmdbGenres([{ name: 'Comédie' }])).toBe('喜剧');
        expect(parseTmdbGenres([{ name: 'Terror' }])).toBe('恐怖');
    });

    it('空列表应安全返回空字符串', () => {
        expect(parseTmdbGenres([])).toBe('');
        expect(parseTmdbGenres(null as any)).toBe('');
    });
});

describe('Classic Quote Auto-fill & State Preservation Tests', () => {
    it('表单初始状态应能正确读取和承载 quote 经典台词', () => {
        const sampleMovie: Movie = {
            id: 'quote-test-1',
            title: '肖申克的救赎',
            year: '1994',
            genre: '剧情, 犯罪',
            rating: 5,
            status: MovieStatus.WATCHED,
            review: '希望是美好的，也许是人间至善。',
            quote: '恐惧让你沦为囚犯，希望让你重获自由。',
            posterColor: '#1e293b',
            addedAt: Date.now(),
            lastUpdated: Date.now(),
            mediaType: 'movie',
        };

        const state = buildInitialState(sampleMovie);
        expect(state.quote).toBe('恐惧让你沦为囚犯，希望让你重获自由。');
    });

    it('无 quote 时表单状态初始应为空字符串', () => {
        const state = buildInitialState(null);
        expect(state.quote).toBe('');
    });
});

describe('China Theatrical Chinese Title Localization Tests (中国公映片名完全汉化测试)', () => {
    it('英文与外文片名应精准匹配映射至中国正式公映片名', async () => {
        const { localizeChineseMovieTitle } = await import('../utils/movieTitleZhMap');

        // 诺兰经典代表作
        expect(localizeChineseMovieTitle('Oppenheimer')).toBe('奥本海默');
        expect(localizeChineseMovieTitle('Interstellar')).toBe('星际穿越');
        expect(localizeChineseMovieTitle('Inception')).toBe('盗梦空间');
        expect(localizeChineseMovieTitle('The Dark Knight')).toBe('蝙蝠侠：黑暗骑士');
        expect(localizeChineseMovieTitle('Dunkirk')).toBe('敦刻尔克');
        expect(localizeChineseMovieTitle('Tenet')).toBe('信条');
        expect(localizeChineseMovieTitle('Memento')).toBe('记忆碎片');

        // 宫崎骏与日系经典
        expect(localizeChineseMovieTitle('Spirited Away')).toBe('千与千寻');
        expect(localizeChineseMovieTitle('Princess Mononoke')).toBe('幽灵公主');
        expect(localizeChineseMovieTitle('The Boy and the Heron')).toBe('你想活出怎样的人生');
        expect(localizeChineseMovieTitle('Your Name.')).toBe('你的名字。');
        expect(localizeChineseMovieTitle('Suzume')).toBe('铃芽之旅');

        // 全球影史神作
        expect(localizeChineseMovieTitle('Pulp Fiction')).toBe('低俗小说');
        expect(localizeChineseMovieTitle('Fight Club')).toBe('搏击俱乐部');
        expect(localizeChineseMovieTitle('Blade Runner 2049')).toBe('银翼杀手2049');
        expect(localizeChineseMovieTitle('Dune: Part Two')).toBe('沙丘2');
        expect(localizeChineseMovieTitle('Avatar: The Way of Water')).toBe('阿凡达：水之道');
        expect(localizeChineseMovieTitle('John Wick: Chapter 4')).toBe('疾速追杀4');
    });

    it('已是中文的片名应保持不变', async () => {
        const { localizeChineseMovieTitle } = await import('../utils/movieTitleZhMap');
        expect(localizeChineseMovieTitle('让子弹飞')).toBe('让子弹飞');
        expect(localizeChineseMovieTitle('流浪地球2')).toBe('流浪地球2');
        expect(localizeChineseMovieTitle('霸王别姬')).toBe('霸王别姬');
    });
});

describe('Director and Cast Name Chinese Localization Tests (导演与主演全名中文汉化测试)', () => {
    it('英文导演与主演姓名应精准汉化为中国大陆官方标准中文译名', async () => {
        const { localizePersonNames, localizeSinglePersonName } = await import('../utils/personNameZhMap');

        // 单个导演
        expect(localizeSinglePersonName('Dan Trachtenberg')).toBe('丹·特拉亨伯格');
        expect(localizeSinglePersonName('Christopher Nolan')).toBe('克里斯托弗·诺兰');
        expect(localizeSinglePersonName('Denis Villeneuve')).toBe('丹尼斯·维伦纽瓦');
        expect(localizeSinglePersonName('Quentin Tarantino')).toBe('昆汀·塔伦蒂诺');
        expect(localizeSinglePersonName('Hayao Miyazaki')).toBe('宫崎骏');
        expect(localizeSinglePersonName('Bong Joon-ho')).toBe('奉俊昊');

        // 多个演员名单逗号/顿号/斜杠分隔
        const rawCast = 'Leonardo DiCaprio, Joseph Gordon-Levitt, Elliot Page, Tom Hardy';
        expect(localizePersonNames(rawCast)).toBe('莱昂纳多·迪卡普里奥, 约瑟夫·高登-莱维特, 艾伦·佩吉, 汤姆·哈迪');

        const rawNolanCast = 'Cillian Murphy, Robert Downey Jr., Matt Damon, Florence Pugh';
        expect(localizePersonNames(rawNolanCast)).toBe('基里安·墨菲, 小罗伯特·唐尼, 马特·达蒙, 弗洛伦丝·皮尤');
    });

    it('已是中文的人名应保持不变', async () => {
        const { localizePersonNames } = await import('../utils/personNameZhMap');
        expect(localizePersonNames('姜文, 葛优, 周润发')).toBe('姜文, 葛优, 周润发');
        expect(localizePersonNames('张艺谋')).toBe('张艺谋');
    });
});

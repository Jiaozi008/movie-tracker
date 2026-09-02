import { describe, it, expect } from 'vitest';
import { Movie, MovieStatus } from '../types';
import { normalizeTitle } from '../utils/titleNormalizer';

describe('Person Filmography Collection Progress Tests (影人全收录与阅片进度条测试)', () => {
    const mockMovies: Movie[] = [
        {
            id: 'm1',
            title: '盗梦空间',
            director: '克里斯托弗·诺兰',
            cast: '莱昂纳多·迪卡普里奥, 约瑟夫·高登-莱维特',
            status: MovieStatus.WATCHED,
            rating: 5,
            duration: 148,
            addedAt: Date.now(),
            lastUpdated: Date.now()
        },
        {
            id: 'm2',
            title: '星际穿越',
            director: '克里斯托弗·诺兰',
            cast: '马修·麦康纳, 安妮·海瑟薇',
            status: MovieStatus.WATCHED,
            rating: 5,
            duration: 169,
            addedAt: Date.now(),
            lastUpdated: Date.now()
        },
        {
            id: 'm3',
            title: '奥本海默',
            director: '克里斯托弗·诺兰',
            cast: '基里安·墨菲, 小罗伯特·唐尼',
            status: MovieStatus.WATCHED,
            rating: 4.8,
            duration: 180,
            addedAt: Date.now(),
            lastUpdated: Date.now()
        },
        {
            id: 'm4',
            title: '信条',
            director: '克里斯托弗·诺兰',
            cast: '约翰·大卫·华盛顿, 罗伯特·帕丁森',
            status: MovieStatus.PLANNING,
            rating: 0,
            duration: 150,
            addedAt: Date.now(),
            lastUpdated: Date.now()
        },
        {
            id: 'm5',
            title: '泰坦尼克号',
            director: '詹姆斯·卡梅隆',
            cast: '莱昂纳多·迪卡普里奥, 凯特·温丝莱特',
            status: MovieStatus.WATCHED,
            rating: 4.9,
            duration: 194,
            addedAt: Date.now(),
            lastUpdated: Date.now()
        }
    ];

    it('应准确计算克里斯托弗·诺兰的收录与阅片进度 (3/4部, 75%, 均分4.9)', () => {
        const target = '克里斯托弗·诺兰';
        const normTarget = normalizeTitle(target);

        const matched = mockMovies.filter(m => {
            const dirNorm = normalizeTitle(m.director || '');
            const castNorm = normalizeTitle(m.cast || '');
            return dirNorm.includes(normTarget) || castNorm.includes(normTarget);
        });

        expect(matched).toHaveLength(4);

        const watched = matched.filter(m => m.status === MovieStatus.WATCHED);
        const planning = matched.filter(m => m.status === MovieStatus.PLANNING);
        const progressPercent = Math.round((watched.length / matched.length) * 100);

        expect(watched).toHaveLength(3);
        expect(planning).toHaveLength(1);
        expect(progressPercent).toBe(75);

        const rated = matched.filter(m => m.rating && m.rating > 0);
        const avg = (rated.reduce((sum, m) => sum + (m.rating || 0), 0) / rated.length).toFixed(1);
        expect(avg).toBe('4.9');
    });

    it('应准确匹配主演莱昂纳多·迪卡普里奥的作品 (2/2部, 100% 完美全收集)', () => {
        const target = '莱昂纳多·迪卡普里奥';
        const normTarget = normalizeTitle(target);

        const matched = mockMovies.filter(m => {
            const dirNorm = normalizeTitle(m.director || '');
            const castNorm = normalizeTitle(m.cast || '');
            return dirNorm.includes(normTarget) || castNorm.includes(normTarget);
        });

        expect(matched).toHaveLength(2);
        const titles = matched.map(m => m.title);
        expect(titles).toContain('盗梦空间');
        expect(titles).toContain('泰坦尼克号');

        const watched = matched.filter(m => m.status === MovieStatus.WATCHED);
        expect(watched.length).toBe(matched.length);
        const progressPercent = Math.round((watched.length / matched.length) * 100);
        expect(progressPercent).toBe(100);
    });

    it('应在多刷/多条同名打卡记录时准确去重，不重复计算总部数', () => {
        const moviesWithMultiRewatch: Movie[] = [
            ...mockMovies,
            {
                id: 'm1-rewatch-1',
                title: '盗梦空间',
                director: '克里斯托弗·诺兰',
                status: MovieStatus.WATCHED,
                watchIteration: 2,
                rating: 5,
                duration: 148,
                addedAt: Date.now(),
                lastUpdated: Date.now()
            },
            {
                id: 'm1-rewatch-2',
                title: '盗梦空间',
                director: '克里斯托弗·诺兰',
                status: MovieStatus.WATCHED,
                watchIteration: 3,
                rating: 5,
                duration: 148,
                addedAt: Date.now(),
                lastUpdated: Date.now()
            }
        ];

        const target = '克里斯托弗·诺兰';
        const normTarget = normalizeTitle(target);

        const matched = moviesWithMultiRewatch.filter(m => {
            const dirNorm = normalizeTitle(m.director || '');
            const castNorm = normalizeTitle(m.cast || '');
            return dirNorm.includes(normTarget) || castNorm.includes(normTarget);
        });

        // 原始未去重记录有 6 条
        expect(matched).toHaveLength(6);

        // 去重后应为 4 部真实作品（《盗梦空间》《星际穿越》《奥本海默》《信条》）
        const distinctTitles = new Set(matched.map(m => normalizeTitle(m.title)));
        expect(distinctTitles.size).toBe(4);

        const watchedTitles = new Set(matched.filter(m => m.status === MovieStatus.WATCHED).map(m => normalizeTitle(m.title)));
        expect(watchedTitles.size).toBe(3); // 真实已看3部
    });

    it('多影人逗号/斜杠/空格分隔应正确拆分与点击交互', () => {
        const rawCast = '莱昂纳多·迪卡普里奥, 约瑟夫·高登-莱维特 / 艾伦·佩吉';
        const actors = rawCast.split(/[,，/、]+/).map(a => a.trim()).filter(Boolean);

        expect(actors).toHaveLength(3);
        expect(actors).toContain('莱昂纳多·迪卡普里奥');
        expect(actors).toContain('约瑟夫·高登-莱维特');
        expect(actors).toContain('艾伦·佩吉');
    });

    it('周星驰代表作智库应包含40+部经典华语神作，且 buildUnifiedCareerWorks 正确聚合', async () => {
        const { getCuratedPerson, buildUnifiedCareerWorks } = await import('../utils/personCatalog');
        const stephenChow = getCuratedPerson('周星驰');
        expect(stephenChow).not.toBeNull();
        expect(stephenChow!.works.length).toBeGreaterThanOrEqual(40);

        const titles = stephenChow!.works.map(w => w.title);
        expect(titles).toContain('功夫');
        expect(titles).toContain('少林足球');
        expect(titles).toContain('大话西游之大圣娶亲');
        expect(titles).toContain('九品芝麻官');
        expect(titles).toContain('破坏之王');
        expect(titles).toContain('龙的传人');
        expect(titles).toContain('逃学威龙');
        expect(titles).toContain('鹿鼎记');
        expect(titles).toContain('武状元苏乞儿');
        expect(titles).toContain('审死官');
        expect(titles).toContain('赌圣');
        expect(titles).toContain('整蛊专家');

        const localMovies: Movie[] = [
            {
                id: 'c1',
                title: '九品芝麻官',
                director: '王晶',
                cast: '周星驰, 吴孟达, 张敏',
                status: MovieStatus.WATCHED,
                addedAt: Date.now(),
                lastUpdated: Date.now()
            },
            {
                id: 'c2',
                title: '龙的传人',
                director: '李修贤',
                cast: '周星驰, 梁家仁, 毛舜筠',
                status: MovieStatus.WATCHED,
                addedAt: Date.now(),
                lastUpdated: Date.now()
            }
        ];

        const unified = buildUnifiedCareerWorks('周星驰', stephenChow, null, localMovies);
        expect(unified.length).toBeGreaterThanOrEqual(40);
        const unifiedTitles = unified.map(u => u.title);
        expect(unifiedTitles).toContain('九品芝麻官');
        expect(unifiedTitles).toContain('龙的传人');
    });

    it('本地作品的海报应取自 posterImage（防 posterUrl 字段错配导致海报恒为空）', async () => {
        const { buildUnifiedCareerWorks } = await import('../utils/personCatalog');

        const localMovies = [
            {
                id: 'p1',
                title: '功夫',
                director: '周星驰',
                cast: '周星驰, 元秋',
                status: MovieStatus.WATCHED,
                posterImage: 'data:image/png;base64,POSTER',
                addedAt: Date.now(),
                lastUpdated: Date.now()
            }
        ] as Movie[];

        const unified = buildUnifiedCareerWorks('周星驰', null, null, localMovies);
        const kungFu = unified.find(u => u.title === '功夫');

        expect(kungFu).toBeDefined();
        expect(kungFu!.posterUrl).toBe('data:image/png;base64,POSTER');
    });

    it('所有核心影人智库 (成龙, 刘德华, 梁朝伟, 张艺谋, 诺兰, 宫崎骏) 均应具备丰富代表作基准', async () => {
        const { getCuratedPerson } = await import('../utils/personCatalog');
        
        const jackie = getCuratedPerson('成龙');
        expect(jackie).not.toBeNull();
        expect(jackie!.works.length).toBeGreaterThanOrEqual(15);
        expect(jackie!.works.map(w => w.title)).toContain('警察故事');

        const andy = getCuratedPerson('刘德华');
        expect(andy).not.toBeNull();
        expect(andy!.works.length).toBeGreaterThanOrEqual(15);
        expect(andy!.works.map(w => w.title)).toContain('无间道');

        const tony = getCuratedPerson('梁朝伟');
        expect(tony).not.toBeNull();
        expect(tony!.works.length).toBeGreaterThanOrEqual(15);
        expect(tony!.works.map(w => w.title)).toContain('花样年华');

        const yimou = getCuratedPerson('张艺谋');
        expect(yimou).not.toBeNull();
        expect(yimou!.works.length).toBeGreaterThanOrEqual(15);
        expect(yimou!.works.map(w => w.title)).toContain('活着');

        const nolan = getCuratedPerson('克里斯托弗·诺兰');
        expect(nolan).not.toBeNull();
        expect(nolan!.works.length).toBeGreaterThanOrEqual(12);

        const miyazaki = getCuratedPerson('宫崎骏');
        expect(miyazaki).not.toBeNull();
        expect(miyazaki!.works.length).toBeGreaterThanOrEqual(12);
    });
});

import { describe, it, expect } from 'vitest';
import { Movie, MovieStatus } from '../types';
import { convertToCSV } from '../utils/fileUtils';
import { fuzzyMatch } from '../utils/searchUtils';
import { extractSmartTags } from '../utils/tagExtractor';
import { formatLocalDateKey } from '../utils/dateUtils';

describe('Phase 2 - 标签体系与数据转换测试', () => {
    const mockMovies: Movie[] = [
        {
            id: 'm-1',
            title: '盗梦空间',
            year: '2010',
            genre: '科幻',
            rating: 5,
            status: MovieStatus.WATCHED,
            review: '神作烧脑',
            posterColor: '#333333',
            addedAt: 1700000000000,
            lastUpdated: 1700000000000,
            mediaType: 'movie',
            tags: ['高分烧脑', '诺兰', '神作']
        },
        {
            id: 'm-2',
            title: '星际穿越',
            year: '2014',
            genre: '科幻',
            rating: 5,
            status: MovieStatus.WATCHED,
            review: '感动',
            posterColor: '#333333',
            addedAt: 1700000000000,
            lastUpdated: 1700000000000,
            mediaType: 'movie',
            tags: ['诺兰', '太空经典']
        },
        {
            id: 'm-3',
            title: '未打标电影',
            year: '2020',
            genre: '未知',
            rating: 4,
            status: MovieStatus.WATCHED,
            review: '',
            posterColor: '#333333',
            addedAt: 1700000000000,
            lastUpdated: 1700000000000,
            mediaType: 'movie'
        }
    ];

    it('模糊搜索能正确匹配自定义标签', () => {
        expect(fuzzyMatch('高分烧脑', '烧脑')).toBe(true);
        expect(fuzzyMatch('太空经典', '太空')).toBe(true);

        const hasNolanTag = mockMovies[0].tags?.some(t => fuzzyMatch(t, '诺兰'));
        expect(hasNolanTag).toBe(true);
    });

    it('convertToCSV 应该正确包含标签列并使用分号拼接', () => {
        const csv = convertToCSV(mockMovies);
        expect(csv).toContain('标签');
        expect(csv).toContain('高分烧脑;诺兰;神作');
        expect(csv).toContain('诺兰;太空经典');
    });

    it('标签过滤条件应准确筛选包含该标签的作品', () => {
        const targetTag = '高分烧脑';
        const filtered = mockMovies.filter(m => m.tags && m.tags.includes(targetTag));
        expect(filtered).toHaveLength(1);
        expect(filtered[0].title).toBe('盗梦空间');

        const nolanFiltered = mockMovies.filter(m => m.tags && m.tags.includes('诺兰'));
        expect(nolanFiltered).toHaveLength(2);
    });

    it('标签偏好统计仅统计 tags 字段，不回退类型，类型分布排除未知', () => {
        const tagCounts: Record<string, number> = {};
        const genreCounts: Record<string, number> = {};

        mockMovies.forEach(m => {
            // Genre: 排除未知
            if (m.genre && m.genre.trim() !== '未知') {
                const genres = m.genre.split(/[,，/、\s]+/).filter(g => g.trim().length > 0 && g.trim() !== '未知');
                genres.forEach(g => {
                    genreCounts[g] = (genreCounts[g] || 0) + 1;
                });
            }

            // Tags: 仅统计 tags，绝不加入类型
            if (m.tags && Array.isArray(m.tags)) {
                m.tags.forEach(t => {
                    const clean = t.trim();
                    if (clean && clean !== '未知') {
                        tagCounts[clean] = (tagCounts[clean] || 0) + 1;
                    }
                });
            }
        });

        // 验证类型分布中没有 '未知'
        expect(genreCounts['未知']).toBeUndefined();
        expect(genreCounts['科幻']).toBe(2);

        // 验证标签统计中没有混入未打标电影的 genre
        expect(tagCounts['未知']).toBeUndefined();
        expect(tagCounts['科幻']).toBeUndefined();
        expect(tagCounts['诺兰']).toBe(2);
        expect(tagCounts['神作']).toBe(1);
    });
});

describe('Smart Tag Extractor Tests', () => {
    it('当标签与类型有相同时，保留类型，标签中剔除重复项', () => {
        const tags = extractSmartTags({
            title: '复仇者联盟',
            genre: '动作, 科幻',
            overview: '超级英雄集结拯救世界，动作激烈，科幻特效震撼。',
            voteAverage: 8.5,
            keywords: ['动作', '科幻', '超级英雄'],
            mediaType: 'movie'
        });

        // 类型中有 "动作"、"科幻"，标签中绝对不能再出现 "动作" 或 "科幻"
        expect(tags).not.toContain('动作');
        expect(tags).not.toContain('科幻');
        // 应该保留具象特征标签
        expect(tags).toContain('高分神作');
    });

    it('应根据片名、类型与剧情简介提取精准中文标签且不生成单一宽泛类型词', () => {
        const tagsInterstellar = extractSmartTags({
            title: '星际穿越',
            genre: '科幻, 冒险',
            overview: '世界末日探险家通过虫洞跨越时空寻找人类未来。',
            voteAverage: 8.7,
            mediaType: 'movie'
        });

        expect(tagsInterstellar).toContain('时空穿越');
        expect(tagsInterstellar).toContain('太空探索');
        expect(tagsInterstellar).toContain('高分神作');
        // 不应包含原始宽泛类型词 "科幻" / "冒险"
        expect(tagsInterstellar).not.toContain('科幻');
        expect(tagsInterstellar).not.toContain('冒险');
    });

    it('应准确识别悬疑烧脑与惊悚类型', () => {
        const tagsSuspense = extractSmartTags({
            title: '禁闭岛',
            genre: '悬疑, 惊悚',
            overview: '联邦警官来到精神病院调查神秘失踪案，陷入重重阴谋与反转。',
            voteAverage: 8.2,
            mediaType: 'movie'
        });

        expect(tagsSuspense).toContain('悬疑烧脑');
        expect(tagsSuspense).toContain('惊悚刺激');
        expect(tagsSuspense).not.toContain('悬疑');
        expect(tagsSuspense).not.toContain('惊悚');
    });

    it('应准确识别治愈温情与轻松喜剧', () => {
        const tagsHealing = extractSmartTags({
            title: '海街日记',
            genre: '剧情, 家庭',
            overview: '三姐妹在父亲去世后接纳同父异母的妹妹，四季更迭中互相陪伴与治愈。',
            country: '日本',
            voteAverage: 8.0,
            mediaType: 'movie'
        });

        expect(tagsHealing).toContain('温暖治愈');
        expect(tagsHealing).not.toContain('剧情');
        expect(tagsHealing).not.toContain('家庭');
    });
});

describe('Phase 2 - 观影热力图数据统计与连续打卡计算', () => {
    it('应正确从 watchHistory 及 addedAt 提取打卡足迹', () => {
        const tvWithHistory: Movie = {
            id: 'tv-1',
            title: '绝命毒师',
            year: '2008',
            genre: '犯罪',
            rating: 5,
            status: MovieStatus.WATCHING,
            review: '封神',
            posterColor: '#333333',
            addedAt: new Date('2026-08-20').getTime(),
            lastUpdated: new Date('2026-08-26').getTime(),
            mediaType: 'tv',
            currentEpisode: 3,
            totalEpisodes: 62,
            watchHistory: [
                { episode: 1, date: new Date('2026-08-24T12:00:00').getTime() },
                { episode: 2, date: new Date('2026-08-25T12:00:00').getTime() },
                { episode: 3, date: new Date('2026-08-26T12:00:00').getTime() },
            ]
        };

        const logs = tvWithHistory.watchHistory || [];
        expect(logs).toHaveLength(3);

        const days = new Set(logs.map(l => formatLocalDateKey(l.date)));
        expect(days.size).toBe(3);
        expect(days.has('2026-08-24')).toBe(true);
        expect(days.has('2026-08-25')).toBe(true);
        expect(days.has('2026-08-26')).toBe(true);
    });
});

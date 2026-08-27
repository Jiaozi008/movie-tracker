import { describe, it, expect } from 'vitest';
import { Movie, MovieStatus } from '../types';
import { convertToCSV, parseImportFile } from '../utils/fileUtils';
import { fuzzyMatch } from '../utils/searchUtils';

describe('Phase 1 & Phase 2 & Phase 3 Advance Features Test', () => {
    const mockMovies: Movie[] = [
        {
            id: 'm-1',
            title: '奥本海默',
            year: '2023',
            genre: '剧情, 传记, 历史',
            director: '克里斯托弗·诺兰',
            cast: '基里安·墨菲, 小罗伯特·唐尼, 艾米莉·布朗特',
            rating: 5,
            status: MovieStatus.WATCHED,
            review: '影史级传记巨作',
            posterColor: '#000',
            addedAt: Date.now(),
            lastUpdated: Date.now(),
            mediaType: 'movie',
            tags: ['高分神作', '历史风云']
        },
        {
            id: 'm-2',
            title: '盗梦空间',
            year: '2010',
            genre: '科幻, 悬疑',
            director: '克里斯托弗·诺兰',
            cast: '莱昂纳多·迪卡普里奥, 约瑟夫·高登-莱维特',
            rating: 4.8,
            status: MovieStatus.WATCHED,
            review: '极致脑洞',
            posterColor: '#000',
            addedAt: Date.now(),
            lastUpdated: Date.now(),
            mediaType: 'movie',
            tags: ['悬疑烧脑', '时空穿越']
        },
        {
            id: 'm-3',
            title: '星际穿越',
            year: '2014',
            genre: '科幻, 冒险',
            director: '克里斯托弗·诺兰',
            cast: '马修·麦康纳, 安妮·海瑟薇',
            rating: 5,
            status: MovieStatus.WATCHED,
            review: '爱是唯一可以超越时间与空间的事物',
            posterColor: '#000',
            addedAt: Date.now(),
            lastUpdated: Date.now(),
            mediaType: 'movie',
            tags: ['太空探索', '高分神作']
        }
    ];

    it('导演偏好度聚合能够正确统计诺兰作品并计算均分', () => {
        const directorMap = new Map<string, { count: number; ratings: number[] }>();
        mockMovies.forEach(m => {
            if (m.director) {
                const dirs = m.director.split(/[,，/、\s]+/).map(d => d.trim()).filter(Boolean);
                dirs.forEach(d => {
                    const cur = directorMap.get(d) || { count: 0, ratings: [] };
                    cur.count += 1;
                    if (m.rating > 0) cur.ratings.push(m.rating);
                    directorMap.set(d, cur);
                });
            }
        });

        const nolan = directorMap.get('克里斯托弗·诺兰');
        expect(nolan).toBeDefined();
        expect(nolan?.count).toBe(3);
        const avg = nolan!.ratings.reduce((a, b) => a + b, 0) / nolan!.ratings.length;
        expect(Number(avg.toFixed(1))).toBe(4.9);
    });

    it('主演偏好度聚合能够正确解析多位主演演员', () => {
        const castMap = new Map<string, number>();
        mockMovies.forEach(m => {
            if (m.cast) {
                const acts = m.cast.split(/[,，/、\s]+/).map(a => a.trim()).filter(Boolean);
                acts.forEach(a => {
                    castMap.set(a, (castMap.get(a) || 0) + 1);
                });
            }
        });

        expect(castMap.get('基里安·墨菲')).toBe(1);
        expect(castMap.get('小罗伯特·唐尼')).toBe(1);
        expect(castMap.get('莱昂纳多·迪卡普里奥')).toBe(1);
        expect(castMap.get('马修·麦康纳')).toBe(1);
    });

    it('convertToCSV 导出应包含导演、主演、平台等完整字段', () => {
        const csv = convertToCSV(mockMovies);
        expect(csv).toContain('导演');
        expect(csv).toContain('主演');
        expect(csv).toContain('克里斯托弗·诺兰');
        expect(csv).toContain('基里安·墨菲');
    });

    it('点击导演或演员时，搜索过滤能正确匹配到相关作品', () => {
        // 搜索导演：克里斯托弗·诺兰 -> 3 部作品全部匹配
        const directorSearch = '克里斯托弗·诺兰';
        const directorMatches = mockMovies.filter(m => 
            fuzzyMatch(m.title, directorSearch) ||
            fuzzyMatch(m.director, directorSearch) ||
            fuzzyMatch(m.cast, directorSearch)
        );
        expect(directorMatches.length).toBe(3);

        // 搜索演员：基里安·墨菲 -> 匹配《奥本海默》
        const actorSearch = '基里安·墨菲';
        const actorMatches = mockMovies.filter(m => 
            fuzzyMatch(m.title, actorSearch) ||
            fuzzyMatch(m.director, actorSearch) ||
            fuzzyMatch(m.cast, actorSearch)
        );
        expect(actorMatches.length).toBe(1);
        expect(actorMatches[0].title).toBe('奥本海默');
    });
});

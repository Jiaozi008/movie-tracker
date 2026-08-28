import { describe, it, expect } from 'vitest';
import { Movie, MovieStatus } from '../types';

describe('条件筛选增强测试 - 分类 (电影/电视剧) 与 类型 (Genre)', () => {
    const mockMovies: Movie[] = [
        {
            id: '1',
            title: '星际穿越',
            year: '2014',
            genre: '科幻, 冒险, 剧情',
            country: '美国',
            rating: 5,
            status: MovieStatus.WATCHED,
            mediaType: 'movie',
            addedAt: 1700000000000,
            lastUpdated: 1700000000000,
        },
        {
            id: '2',
            title: '黑袍纠察队 第四季',
            year: '2024',
            genre: '动作 / 剧情 / 科幻',
            country: '美国',
            rating: 4,
            status: MovieStatus.WATCHING,
            mediaType: 'tv',
            currentEpisode: 6,
            totalEpisodes: 8,
            addedAt: 1700000000000,
            lastUpdated: 1700000000000,
        },
        {
            id: '3',
            title: '狂飙',
            year: '2023',
            genre: '剧情 / 犯罪',
            country: '中国大陆',
            rating: 5,
            status: MovieStatus.WATCHED,
            mediaType: 'tv',
            currentEpisode: 39,
            totalEpisodes: 39,
            addedAt: 1700000000000,
            lastUpdated: 1700000000000,
        },
        {
            id: '4',
            title: '盗梦空间',
            year: '2010',
            genre: '科幻 / 动作 / 悬疑',
            country: '美国',
            rating: 5,
            status: MovieStatus.WATCHED,
            mediaType: 'movie',
            addedAt: 1700000000000,
            lastUpdated: 1700000000000,
        }
    ];

    it('能够动态提取并去重排序所有影视类型 (Genre)', () => {
        const genreSet = new Set<string>();
        mockMovies.forEach(m => {
            if (m.genre) {
                const parts = m.genre.split(/[,，/、\s+]+/).map(g => g.trim());
                parts.forEach(g => {
                    if (g && g.length > 0) genreSet.add(g);
                });
            }
        });
        const genreOptions = Array.from(genreSet).sort((a, b) => a.localeCompare(b, 'zh-CN'));

        expect(genreOptions).toContain('科幻');
        expect(genreOptions).toContain('剧情');
        expect(genreOptions).toContain('动作');
        expect(genreOptions).toContain('犯罪');
        expect(genreOptions).toContain('悬疑');
        expect(genreOptions).toContain('冒险');
    });

    it('能够根据分类 (电影 / 电视剧) 正确筛选作品', () => {
        const filterMovies = (mediaType: 'all' | 'movie' | 'tv') => {
            return mockMovies.filter(m => {
                if (mediaType === 'movie') {
                    return m.mediaType !== 'tv' && (!m.totalEpisodes || m.totalEpisodes <= 1);
                } else if (mediaType === 'tv') {
                    return m.mediaType === 'tv' || (!!m.totalEpisodes && m.totalEpisodes > 1) || (!!m.currentEpisode && m.currentEpisode > 0);
                }
                return true;
            });
        };

        const moviesOnly = filterMovies('movie');
        expect(moviesOnly.map(m => m.title)).toEqual(['星际穿越', '盗梦空间']);

        const tvOnly = filterMovies('tv');
        expect(tvOnly.map(m => m.title)).toEqual(['黑袍纠察队 第四季', '狂飙']);
    });

    it('能够根据类型 (Genre) 正确筛选作品', () => {
        const filterByGenre = (genre: string) => {
            return mockMovies.filter(m => {
                return genre === 'all' || (m.genre && m.genre.includes(genre));
            });
        };

        const sciFiMovies = filterByGenre('科幻');
        expect(sciFiMovies.map(m => m.title)).toEqual(['星际穿越', '黑袍纠察队 第四季', '盗梦空间']);

        const crimeMovies = filterByGenre('犯罪');
        expect(crimeMovies.map(m => m.title)).toEqual(['狂飙']);
    });

    it('分类与类型组合筛选正常运作', () => {
        const filterCombined = (mediaType: 'all' | 'movie' | 'tv', genre: string) => {
            return mockMovies.filter(m => {
                let matchesMedia = true;
                if (mediaType === 'movie') {
                    matchesMedia = m.mediaType !== 'tv' && (!m.totalEpisodes || m.totalEpisodes <= 1);
                } else if (mediaType === 'tv') {
                    matchesMedia = m.mediaType === 'tv' || (!!m.totalEpisodes && m.totalEpisodes > 1) || (!!m.currentEpisode && m.currentEpisode > 0);
                }
                const matchesGenre = genre === 'all' || (m.genre && m.genre.includes(genre));
                return matchesMedia && matchesGenre;
            });
        };

        // 筛选: 电影 + 动作
        const actionMovies = filterCombined('movie', '动作');
        expect(actionMovies.map(m => m.title)).toEqual(['盗梦空间']);

        // 筛选: 电视剧 + 剧情
        const dramaTvs = filterCombined('tv', '剧情');
        expect(dramaTvs.map(m => m.title)).toEqual(['黑袍纠察队 第四季', '狂飙']);
    });
});

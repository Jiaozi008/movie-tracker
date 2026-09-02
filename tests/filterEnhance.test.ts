import { describe, it, expect } from 'vitest';
import { Movie, MovieStatus } from '../types';

describe('条件筛选增强测试 - 分类 (电影/电视剧)、类型 (Genre)、观看平台 (Platform) 与 时间 (TimeFrame)', () => {
    const mockMovies: Movie[] = [
        {
            id: '1',
            title: '星际穿越',
            year: '2014',
            genre: '科幻, 冒险, 剧情',
            country: '美国',
            platform: '院线, Bilibili',
            rating: 5,
            status: MovieStatus.WATCHED,
            mediaType: 'movie',
            addedAt: new Date('2024-05-10').getTime(),
            lastUpdated: new Date('2024-05-10').getTime(),
        },
        {
            id: '2',
            title: '黑袍纠察队 第四季',
            year: '2024',
            genre: '动作 / 剧情 / 科幻',
            country: '美国',
            platform: 'Prime Video',
            rating: 4,
            status: MovieStatus.WATCHING,
            mediaType: 'tv',
            currentEpisode: 6,
            totalEpisodes: 8,
            addedAt: new Date('2024-06-20').getTime(),
            lastUpdated: new Date('2024-06-20').getTime(),
        },
        {
            id: '3',
            title: '狂飙',
            year: '2023',
            genre: '剧情 / 犯罪',
            country: '中国大陆',
            platform: '爱奇艺',
            rating: 5,
            status: MovieStatus.WATCHED,
            mediaType: 'tv',
            currentEpisode: 39,
            totalEpisodes: 39,
            addedAt: new Date('2023-02-15').getTime(),
            lastUpdated: new Date('2023-02-15').getTime(),
            watchHistory: [
                {
                    date: new Date('2024-01-05').getTime(),
                    episode: 39,
                    iteration: 2
                }
            ]
        },
        {
            id: '4',
            title: '盗梦空间',
            year: '2010',
            genre: '科幻 / 动作 / 悬疑',
            country: '美国',
            platform: 'Netflix',
            rating: 5,
            status: MovieStatus.WATCHED,
            mediaType: 'movie',
            addedAt: new Date('2022-11-01').getTime(),
            lastUpdated: new Date('2022-11-01').getTime(),
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

    it('能够动态提取并去重排序所有观看平台 (Platform)', () => {
        const platforms = new Set<string>();
        mockMovies.forEach(m => {
            if (m.platform && m.platform.trim()) {
                const parts = m.platform.split(/[,，/、]+/).map(p => p.trim());
                parts.forEach(p => {
                    if (p && p.length > 0) platforms.add(p);
                });
            }
        });
        const platformOptions = Array.from(platforms).sort((a, b) => a.localeCompare(b, 'zh-CN'));

        expect(platformOptions).toContain('Bilibili');
        expect(platformOptions).toContain('Netflix');
        expect(platformOptions).toContain('Prime Video');
        expect(platformOptions).toContain('爱奇艺');
        expect(platformOptions).toContain('院线');
        expect(platformOptions.length).toBe(5);
    });

    it('能够根据观看平台 (Platform) 正确筛选作品', () => {
        const filterByPlatform = (platform: string) => {
            return mockMovies.filter(m => {
                return platform === 'all' || (m.platform && m.platform.includes(platform));
            });
        };

        const netflixMovies = filterByPlatform('Netflix');
        expect(netflixMovies.map(m => m.title)).toEqual(['盗梦空间']);

        const biliMovies = filterByPlatform('Bilibili');
        expect(biliMovies.map(m => m.title)).toEqual(['星际穿越']);

        const allMovies = filterByPlatform('all');
        expect(allMovies.length).toBe(4);
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

    it('能够根据统计面板时间 (全部/按年/按月) 联动筛选作品并聚合 watchHistory', () => {
        const filterByTimeFrame = (timeFrame: 'all' | 'year' | 'month', selectedYear: string, selectedMonth: string) => {
            return mockMovies.filter(movie => {
                if (timeFrame === 'all') return true;

                const hasWatchHistoryInYear = movie.watchHistory && movie.watchHistory.some(log => {
                    return new Date(log.date).getFullYear().toString() === selectedYear;
                });
                const hasWatchHistoryInMonth = movie.watchHistory && movie.watchHistory.some(log => {
                    const logDate = new Date(log.date);
                    const logYM = `${logDate.getFullYear()}-${String(logDate.getMonth() + 1).padStart(2, '0')}`;
                    return logYM === selectedMonth;
                });

                const d = new Date(movie.addedAt);
                if (timeFrame === 'year') {
                    return d.getFullYear().toString() === selectedYear || !!hasWatchHistoryInYear;
                } else if (timeFrame === 'month') {
                    const movieMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                    return movieMonth === selectedMonth || !!hasWatchHistoryInMonth;
                }
                return true;
            });
        };

        // 2024 年筛选：应包含 2024 添加的《星际穿越》《黑袍纠察队》以及 2024 打卡二刷的《狂飙》
        const year2024Movies = filterByTimeFrame('year', '2024', '2024-01');
        expect(year2024Movies.map(m => m.title)).toEqual(['星际穿越', '黑袍纠察队 第四季', '狂飙']);

        // 2024-05 月筛选：仅有《星际穿越》
        const may2024Movies = filterByTimeFrame('month', '2024', '2024-05');
        expect(may2024Movies.map(m => m.title)).toEqual(['星际穿越']);

        // 2024-01 月筛选：包含 2024-01 打卡记录的《狂飙》
        const jan2024Movies = filterByTimeFrame('month', '2024', '2024-01');
        expect(jan2024Movies.map(m => m.title)).toEqual(['狂飙']);
    });

    it('分类、平台、类型与时间多条件组合筛选正常运作', () => {
        const filterCombined = (
            mediaType: 'all' | 'movie' | 'tv',
            genre: string,
            platform: string,
            timeFrame: 'all' | 'year' | 'month',
            year: string
        ) => {
            return mockMovies.filter(m => {
                let matchesMedia = true;
                if (mediaType === 'movie') {
                    matchesMedia = m.mediaType !== 'tv' && (!m.totalEpisodes || m.totalEpisodes <= 1);
                } else if (mediaType === 'tv') {
                    matchesMedia = m.mediaType === 'tv' || (!!m.totalEpisodes && m.totalEpisodes > 1) || (!!m.currentEpisode && m.currentEpisode > 0);
                }
                const matchesGenre = genre === 'all' || (m.genre && m.genre.includes(genre));
                const matchesPlatform = platform === 'all' || (m.platform && m.platform.includes(platform));
                
                let matchesTime = true;
                if (timeFrame === 'year') {
                    const hasWatchHistoryInYear = m.watchHistory && m.watchHistory.some(log => {
                        return new Date(log.date).getFullYear().toString() === year;
                    });
                    const d = new Date(m.addedAt);
                    matchesTime = d.getFullYear().toString() === year || !!hasWatchHistoryInYear;
                }

                return matchesMedia && matchesGenre && matchesPlatform && matchesTime;
            });
        };

        // 筛选: 电影 + 科幻 + Bilibili + 2024年
        const result = filterCombined('movie', '科幻', 'Bilibili', 'year', '2024');
        expect(result.map(m => m.title)).toEqual(['星际穿越']);

        // 筛选: 电视剧 + 剧情 + 爱奇艺 + 2024年 (通过二刷命中)
        const tvResult = filterCombined('tv', '剧情', '爱奇艺', 'year', '2024');
        expect(tvResult.map(m => m.title)).toEqual(['狂飙']);
    });
});

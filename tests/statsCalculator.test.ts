/**
 * 统计计算测试
 * 验证倍速功能对总观影时长的计算是否正确
 */

import { describe, it, expect } from 'vitest';
import {
    calculateMovieDuration,
    calculateTvDuration,
    calculateTotalEpisodes,
    calculateActualWatchTime,
    calculateWatchTimeStats,
    formatDuration,
    getRecommendedIteration
} from '../utils/statsCalculator';
import { Movie, MovieStatus } from '../types';

// 创建测试用 Movie 数据的辅助函数
function createMovie(overrides: Partial<Movie> = {}): Movie {
    return {
        id: crypto.randomUUID(),
        title: 'Test Movie',
        year: '2024',
        genre: 'Action',
        rating: 4,
        status: MovieStatus.WATCHED,
        review: '',
        posterColor: '#000',
        addedAt: Date.now(),
        lastUpdated: Date.now(),
        mediaType: 'movie',
        ...overrides
    };
}

describe('calculateActualWatchTime', () => {
    describe('电影时长计算', () => {
        it('应该正确计算原速 (1.0x) 电影时长', () => {
            const result = calculateActualWatchTime(120, 1.0, 1, 'movie');
            expect(result).toBe(120);
        });

        it('应该正确计算 1.5 倍速电影时长', () => {
            const result = calculateActualWatchTime(120, 1.5, 1, 'movie');
            expect(result).toBe(80); // 120 / 1.5 = 80
        });

        it('应该正确计算 2.0 倍速电影时长', () => {
            const result = calculateActualWatchTime(120, 2.0, 1, 'movie');
            expect(result).toBe(60); // 120 / 2 = 60
        });

        it('应该正确计算自定义倍速 (1.25x) 电影时长', () => {
            const result = calculateActualWatchTime(100, 1.25, 1, 'movie');
            expect(result).toBe(80); // 100 / 1.25 = 80
        });
    });

    describe('电视剧时长计算', () => {
        it('应该正确计算电视剧多集原速时长', () => {
            // 3集，每集60分钟，1.0x
            const result = calculateActualWatchTime(60, 1.0, 3, 'tv');
            expect(result).toBe(180); // 3 * 60 / 1 = 180
        });

        it('应该正确计算电视剧多集 2.0 倍速时长', () => {
            // 3集，每集60分钟，2.0x
            const result = calculateActualWatchTime(60, 2.0, 3, 'tv');
            expect(result).toBe(90); // 3 * 60 / 2 = 90
        });

        it('应该正确计算电视剧多集 1.75 倍速时长', () => {
            // 10集，每集45分钟，1.75x
            const result = calculateActualWatchTime(45, 1.75, 10, 'tv');
            expect(result).toBe(257); // Math.round(10 * 45 / 1.75) = 257
        });
    });

    describe('边界情况', () => {
        it('倍速为0时应回退到1.0x', () => {
            const result = calculateActualWatchTime(120, 0, 1, 'movie');
            expect(result).toBe(120);
        });

        it('负数倍速应回退到1.0x', () => {
            const result = calculateActualWatchTime(120, -2, 1, 'movie');
            expect(result).toBe(120);
        });
    });
});

describe('calculateMovieDuration', () => {
    it('应该优先使用 actualWatchTime', () => {
        const movies = [
            createMovie({ duration: 120, actualWatchTime: 60, playbackSpeed: 2.0 }),
            createMovie({ duration: 90, actualWatchTime: 45, playbackSpeed: 2.0 })
        ];

        const result = calculateMovieDuration(movies);
        expect(result).toBe(105); // 60 + 45
    });

    it('应该在无 actualWatchTime 时回退到 duration', () => {
        const movies = [
            createMovie({ duration: 120 }),
            createMovie({ duration: 90 })
        ];

        const result = calculateMovieDuration(movies);
        expect(result).toBe(210); // 120 + 90
    });

    it('应该忽略电视剧类型', () => {
        const movies = [
            createMovie({ duration: 120, mediaType: 'movie' }),
            createMovie({ duration: 60, mediaType: 'tv', currentEpisode: 5 })
        ];

        const result = calculateMovieDuration(movies);
        expect(result).toBe(120); // 只计算电影
    });

    it('应该处理混合数据（有和无 actualWatchTime）', () => {
        const movies = [
            createMovie({ duration: 120, actualWatchTime: 60 }), // 使用 60
            createMovie({ duration: 90 }) // 使用 90
        ];

        const result = calculateMovieDuration(movies);
        expect(result).toBe(150); // 60 + 90
    });
});

describe('calculateTvDuration', () => {
    it('应该优先使用 actualWatchTime', () => {
        const movies = [
            createMovie({
                title: '三体',
                mediaType: 'tv',
                duration: 60,
                currentEpisode: 3,
                actualWatchTime: 90, // 已按2.0倍速计算
                playbackSpeed: 2.0
            })
        ];

        const result = calculateTvDuration(movies);
        expect(result).toBe(90);
    });

    it('应该在无 actualWatchTime 时按集数*时长计算', () => {
        const movies = [
            createMovie({
                title: '三体',
                mediaType: 'tv',
                duration: 60,
                currentEpisode: 3
            })
        ];

        const result = calculateTvDuration(movies);
        expect(result).toBe(180); // 3 * 60
    });

    it('应该累加多条电视剧记录的时长', () => {
        const movies = [
            createMovie({
                title: '三体',
                mediaType: 'tv',
                actualWatchTime: 90
            }),
            createMovie({
                title: '开端',
                mediaType: 'tv',
                actualWatchTime: 45
            })
        ];

        const result = calculateTvDuration(movies);
        expect(result).toBe(135); // 90 + 45
    });

    it('应该能正确区分不同重温轮次并独立累加时长', () => {
        const movies = [
            createMovie({
                title: '三体',
                mediaType: 'tv',
                duration: 60,
                currentEpisode: 3,
                actualWatchTime: 180,
                watchIteration: 1
            }),
            createMovie({
                title: '三体',
                mediaType: 'tv',
                duration: 60,
                currentEpisode: 3,
                actualWatchTime: 180,
                watchIteration: 2
            })
        ];

        const duration = calculateTvDuration(movies);
        const episodes = calculateTotalEpisodes(movies);

        expect(duration).toBe(360); // 180 + 180
        expect(episodes).toBe(6); // 3 + 3
    });
});

describe('calculateTotalEpisodes', () => {
    it('应该按剧名去重并取最大集数', () => {
        const movies = [
            createMovie({ title: '三体', mediaType: 'tv', currentEpisode: 5 }),
            createMovie({ title: '三体', mediaType: 'tv', currentEpisode: 10 }), // 取这个
            createMovie({ title: '开端', mediaType: 'tv', currentEpisode: 8 })
        ];

        const result = calculateTotalEpisodes(movies);
        expect(result).toBe(18); // 10 + 8
    });
});

describe('calculateWatchTimeStats', () => {
    it('应该正确计算混合类型的总时长', () => {
        const movies = [
            createMovie({
                title: '盗梦空间',
                mediaType: 'movie',
                duration: 148,
                actualWatchTime: 74, // 2.0x
                playbackSpeed: 2.0
            }),
            createMovie({
                title: '三体',
                mediaType: 'tv',
                duration: 60,
                currentEpisode: 5,
                actualWatchTime: 150, // 5*60/2.0
                playbackSpeed: 2.0
            })
        ];

        const stats = calculateWatchTimeStats(movies);

        expect(stats.movieDuration).toBe(74);
        expect(stats.tvDuration).toBe(150);
        expect(stats.totalMinutes).toBe(224);
        expect(stats.totalEpisodesWatched).toBe(5);
    });
});

describe('formatDuration', () => {
    it('应该正确格式化时长', () => {
        expect(formatDuration(90)).toEqual({ hours: 1, minutes: 30 });
        expect(formatDuration(60)).toEqual({ hours: 1, minutes: 0 });
        expect(formatDuration(45)).toEqual({ hours: 0, minutes: 45 });
        expect(formatDuration(150)).toEqual({ hours: 2, minutes: 30 });
    });
});

// 综合场景测试
describe('用户真实场景', () => {
    it('场景：用户当天看了3集电视剧，倍速2.0x，应计算90分钟', () => {
        // 需求描述的例子：单集60分钟，看了3集，倍速2.0x，应统计90分钟
        const watchTime = calculateActualWatchTime(60, 2.0, 3, 'tv');
        expect(watchTime).toBe(90);
    });

    it('场景：修改旧记录的倍速后，总时长应更新', () => {
        // 模拟：原记录 120分钟电影，1.0x速 -> 改为 2.0x速
        const oldRecord = createMovie({ duration: 120, actualWatchTime: 120, playbackSpeed: 1.0 });
        const newRecord = { ...oldRecord, actualWatchTime: 60, playbackSpeed: 2.0 };

        const oldStats = calculateMovieDuration([oldRecord]);
        const newStats = calculateMovieDuration([newRecord]);

        expect(oldStats).toBe(120);
        expect(newStats).toBe(60);
        expect(newStats).toBe(oldStats / 2);
    });

    it('场景：跨月电视剧集数与时长计算（例如4月看7集，5月看到第10集，5月当月应统计3集及对应时长）', () => {
        // 4月22日：看《博斯》到第3集
        const recordApril1 = createMovie({
            id: 'bosch-ep3',
            title: '博斯',
            mediaType: 'tv',
            duration: 45,
            currentEpisode: 3,
            playbackSpeed: 1.0,
            actualWatchTime: 135,
            addedAt: new Date('2026-04-22T10:00:00Z').getTime()
        });

        // 4月23日：看《博斯》到第7集
        const recordApril2 = createMovie({
            id: 'bosch-ep7',
            title: '博斯',
            mediaType: 'tv',
            duration: 45,
            currentEpisode: 7,
            playbackSpeed: 1.5,
            actualWatchTime: 210, // 210分钟，平均单集 210 / 7 = 30分钟
            addedAt: new Date('2026-04-23T10:00:00Z').getTime()
        });

        // 5月6日：看《博斯》到第10集
        const recordMay = createMovie({
            id: 'bosch-ep10',
            title: '博斯',
            mediaType: 'tv',
            duration: 45,
            currentEpisode: 10,
            playbackSpeed: 1.5,
            actualWatchTime: 300, // 300分钟，平均单集 300 / 10 = 30分钟
            addedAt: new Date('2026-05-06T10:00:00Z').getTime()
        });

        const allMovies = [recordApril1, recordApril2, recordMay];

        // 1. 测试4月份的统计
        const aprilMovies = [recordApril1, recordApril2];
        const aprilEpisodes = calculateTotalEpisodes(aprilMovies, allMovies);
        const aprilTvDuration = calculateTvDuration(aprilMovies, allMovies);

        // 4月份最大看到第7集，所以应该是7集
        expect(aprilEpisodes).toBe(7);
        // 时长贡献：
        // 第1-3集：135分钟
        // 第4-7集：4集 * 30分钟/集 = 120分钟
        // 总计：255分钟
        expect(aprilTvDuration).toBe(255);

        // 2. 测试5月份的统计
        const mayMovies = [recordMay];
        const mayEpisodes = calculateTotalEpisodes(mayMovies, allMovies);
        const mayTvDuration = calculateTvDuration(mayMovies, allMovies);

        // 5月份从第7集看到第10集，增量应该是3集
        expect(mayEpisodes).toBe(3);
        // 时长贡献：
        // 第8-10集：3集 * 30分钟/集 = 90分钟
        expect(mayTvDuration).toBe(90);
    });
});

describe('getRecommendedIteration', () => {
    it('空标题应返回 "1"', () => {
        expect(getRecommendedIteration('', 'movie', [])).toBe('1');
        expect(getRecommendedIteration('  ', 'tv', [])).toBe('1');
    });

    describe('电影推荐轮次', () => {
        it('无历史记录时，应推荐 "1"', () => {
            expect(getRecommendedIteration('盗梦空间', 'movie', [])).toBe('1');
        });

        it('有1部已看历史记录时，应推荐 "2"', () => {
            const history = [
                createMovie({ title: '盗梦空间', mediaType: 'movie', status: MovieStatus.WATCHED, watchIteration: 1 })
            ];
            expect(getRecommendedIteration('盗梦空间', 'movie', history)).toBe('2');
        });

        it('即使历史记录是在看状态，只要是电影，新纪录也应推荐 "2"', () => {
            const history = [
                createMovie({ title: '盗梦空间', mediaType: 'movie', status: MovieStatus.WATCHING, watchIteration: 1 })
            ];
            expect(getRecommendedIteration('盗梦空间', 'movie', history)).toBe('2');
        });
    });

    describe('电视剧推荐轮次', () => {
        it('无历史记录时，应推荐 "1"', () => {
            expect(getRecommendedIteration('三体', 'tv', [])).toBe('1');
        });

        it('历史记录中最新的轮次尚未完结时，应推荐该最新轮次（不应加1）', () => {
            const history = [
                createMovie({ title: '三体', mediaType: 'tv', status: MovieStatus.WATCHING, currentEpisode: 1, watchIteration: 1 })
            ];
            // 记第2集时，应该依然算第1刷
            expect(getRecommendedIteration('三体', 'tv', history)).toBe('1');
        });

        it('历史记录中最新的轮次已完结（存在完结状态记录）时，应推荐新轮次（加1）', () => {
            const history = [
                createMovie({ title: '三体', mediaType: 'tv', status: MovieStatus.WATCHING, currentEpisode: 1, watchIteration: 1 }),
                createMovie({ title: '三体', mediaType: 'tv', status: MovieStatus.WATCHED, currentEpisode: 30, watchIteration: 1 })
            ];
            // 第1刷已完结，新纪录应推荐第2刷
            expect(getRecommendedIteration('三体', 'tv', history)).toBe('2');
        });

        it('二刷进行中时，应继续推荐二刷', () => {
            const history = [
                createMovie({ title: '三体', mediaType: 'tv', status: MovieStatus.WATCHING, currentEpisode: 1, watchIteration: 1 }),
                createMovie({ title: '三体', mediaType: 'tv', status: MovieStatus.WATCHED, currentEpisode: 30, watchIteration: 1 }),
                createMovie({ title: '三体', mediaType: 'tv', status: MovieStatus.WATCHING, currentEpisode: 1, watchIteration: 2 })
            ];
            // 二刷还在看，记二刷第2集时应推荐第2刷
            expect(getRecommendedIteration('三体', 'tv', history)).toBe('2');
        });
    });
});


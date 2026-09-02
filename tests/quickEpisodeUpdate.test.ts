import { describe, it, expect, vi } from 'vitest';
import { calculateEpisodeUpdate, formatRelativeWatchDate, clusterWatchHistoryByDay } from '../utils/episodeUtils';
import { calculateTvDuration, calculateTotalEpisodes } from '../utils/statsCalculator';
import { Movie, MovieStatus, EpisodeWatchLog } from '../types';

describe('calculateEpisodeUpdate - 追剧快捷打卡逻辑测试', () => {
    const baseTv: Movie = {
        id: 'tv-1',
        title: '怪奇物语',
        year: '2022',
        genre: '科幻 / 悬疑',
        rating: 5,
        status: MovieStatus.WATCHING,
        review: '好看',
        posterColor: '#333333',
        addedAt: 1700000000000,
        lastUpdated: 1700000000000,
        mediaType: 'tv',
        currentEpisode: 3,
        totalEpisodes: 8,
        watchHistory: [
            { episode: 1, date: 1700000000000 },
            { episode: 2, date: 1700000100000 },
            { episode: 3, date: 1700000200000 },
        ]
    };

    it('非电视剧类型应该返回 null', () => {
        const movie: Movie = { ...baseTv, mediaType: 'movie' };
        const result = calculateEpisodeUpdate(movie, 1);
        expect(result).toBeNull();
    });

    it('点击 +1 时应该正确递增集数、更新 actualWatchTime 并追加 watchHistory 日志', () => {
        const beforeTime = Date.now();
        const baseWithDuration: Movie = {
            ...baseTv,
            duration: 45,
            playbackSpeed: 1.0,
            actualWatchTime: 135 // 3 * 45
        };
        const res = calculateEpisodeUpdate(baseWithDuration, 1);
        expect(res).not.toBeNull();
        expect(res!.updatedMovie.currentEpisode).toBe(4);
        expect(res!.updatedMovie.actualWatchTime).toBe(180); // 4 * 45
        expect(res!.updatedMovie.watchHistory).toHaveLength(4);
        expect(res!.updatedMovie.watchHistory![3].episode).toBe(4);
        expect(res!.updatedMovie.watchHistory![3].date).toBeGreaterThanOrEqual(beforeTime);
        expect(res!.updatedMovie.lastUpdated).toBeGreaterThanOrEqual(beforeTime);
        expect(res!.isCompleted).toBe(false);
        expect(res!.message).toContain('已打卡至第 4 集');
    });

    it('点击 -1 时应该回退集数、更新 actualWatchTime 并移除最后一条 watchHistory', () => {
        const baseWithDuration: Movie = {
            ...baseTv,
            duration: 45,
            playbackSpeed: 1.0,
            actualWatchTime: 135 // 3 * 45
        };
        const res = calculateEpisodeUpdate(baseWithDuration, -1);
        expect(res).not.toBeNull();
        expect(res!.updatedMovie.currentEpisode).toBe(2);
        expect(res!.updatedMovie.actualWatchTime).toBe(90); // 2 * 45
        expect(res!.updatedMovie.watchHistory).toHaveLength(2);
        expect(res!.updatedMovie.watchHistory![1].episode).toBe(2);
    });

    it('追完最后一集（如第 8/8 集）时应自动流转状态为 WATCHED（完结）', () => {
        const nearlyFinishedTv: Movie = {
            ...baseTv,
            currentEpisode: 7,
            totalEpisodes: 8,
            status: MovieStatus.WATCHING
        };

        const res = calculateEpisodeUpdate(nearlyFinishedTv, 1);
        expect(res).not.toBeNull();
        expect(res!.updatedMovie.currentEpisode).toBe(8);
        expect(res!.updatedMovie.status).toBe(MovieStatus.WATCHED);
        expect(res!.isCompleted).toBe(true);
        expect(res!.message).toContain('已全剧完结打卡');
    });

    it('已完结状态下再次 +1 应保持当前集数并提示已追完', () => {
        const finishedTv: Movie = {
            ...baseTv,
            currentEpisode: 8,
            totalEpisodes: 8,
            status: MovieStatus.WATCHED
        };

        const res = calculateEpisodeUpdate(finishedTv, 1);
        expect(res).not.toBeNull();
        expect(res!.updatedMovie.currentEpisode).toBe(8);
        expect(res!.isCompleted).toBe(true);
        expect(res!.message).toContain('已追完全部 8 集');
    });

    it('当前集数为 0 时点击 -1 应该返回 null 不做处理', () => {
        const zeroEpTv: Movie = { ...baseTv, currentEpisode: 0 };
        const res = calculateEpisodeUpdate(zeroEpTv, -1);
        expect(res).toBeNull();
    });

    it('打卡 +1 后，calculateTvDuration 和 calculateTotalEpisodes 应实时动态增加', () => {
        const tv: Movie = {
            ...baseTv,
            currentEpisode: 2,
            totalEpisodes: 10,
            duration: 50,
            playbackSpeed: 1.0,
            actualWatchTime: 100
        };

        const initialDuration = calculateTvDuration([tv]);
        const initialEpisodes = calculateTotalEpisodes([tv]);
        expect(initialDuration).toBe(100);
        expect(initialEpisodes).toBe(2);

        const updateResult = calculateEpisodeUpdate(tv, 1);
        expect(updateResult).not.toBeNull();

        const updatedDuration = calculateTvDuration([updateResult!.updatedMovie]);
        const updatedEpisodes = calculateTotalEpisodes([updateResult!.updatedMovie]);
        expect(updatedDuration).toBe(150); // 100 + 50
        expect(updatedEpisodes).toBe(3); // 2 + 1
    });

    it('当剧集初始无 watchHistory 时，点击 +1 绝对不能发生集数或时长倒扣减少', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-08-01T12:00:00Z'));
        try {
            const tvWithoutHistory: Movie = {
                id: 'tv-legacy',
                title: '权力的游戏',
                year: '2024',
                genre: '奇幻',
                rating: 5,
                status: MovieStatus.WATCHING,
                review: '',
                posterColor: '#000',
                addedAt: new Date('2026-08-01T10:00:00Z').getTime(),
                lastUpdated: new Date('2026-08-01T10:00:00Z').getTime(),
                mediaType: 'tv',
                currentEpisode: 5, // 已看到第 5 集
                totalEpisodes: 10,
                duration: 60,
                playbackSpeed: 1.0,
                actualWatchTime: 300 // 5 * 60 = 300 分钟
                // watchHistory 为 undefined
            };

            // 打卡前全量统计与当月统计
            const beforeTotalEps = calculateTotalEpisodes([tvWithoutHistory]);
            const beforeTotalDur = calculateTvDuration([tvWithoutHistory]);
            expect(beforeTotalEps).toBe(5);
            expect(beforeTotalDur).toBe(300);

            // 用户在卡片点击 +1
            const updateResult = calculateEpisodeUpdate(tvWithoutHistory, 1);
            expect(updateResult).not.toBeNull();
            const updated = updateResult!.updatedMovie;

            // 必须自动补齐 1..5 集底账并追加第 6 集
            expect(updated.currentEpisode).toBe(6);
            expect(updated.watchHistory).toHaveLength(6);
            expect(updated.actualWatchTime).toBe(360);

            // 打卡后全量统计与当月统计（必须单调递增，绝对不能变为 1 集 / 60 分钟）
            const afterTotalEps = calculateTotalEpisodes([updated]);
            const afterTotalDur = calculateTvDuration([updated]);
            expect(afterTotalEps).toBe(6);
            expect(afterTotalDur).toBe(360);

            const afterMonthEps = calculateTotalEpisodes([updated], [updated], { timeFrame: 'month', selectedMonth: '2026-08' });
            const afterMonthDur = calculateTvDuration([updated], [updated], { timeFrame: 'month', selectedMonth: '2026-08' });
            expect(afterMonthEps).toBe(6);
            expect(afterMonthDur).toBe(360);
        } finally {
            vi.useRealTimers();
        }
    });
});

describe('clusterWatchHistoryByDay - 单日连续打卡智能聚类测试', () => {
    it('空流水应返回空数组', () => {
        expect(clusterWatchHistoryByDay([])).toEqual([]);
        expect(clusterWatchHistoryByDay(undefined)).toEqual([]);
    });

    it('当天连续看第1、2、3集时，应正确聚类为第1-3集', () => {
        const todayNoon = new Date(2026, 7, 28, 12, 0).getTime();
        const logs: EpisodeWatchLog[] = [
            { episode: 1, date: todayNoon, playbackSpeed: 1.0 },
            { episode: 2, date: todayNoon + 3600000, playbackSpeed: 1.0 },
            { episode: 3, date: todayNoon + 7200000, playbackSpeed: 1.0 },
        ];

        const groups = clusterWatchHistoryByDay(logs);
        expect(groups).toHaveLength(1);
        expect(groups[0].startEp).toBe(1);
        expect(groups[0].endEp).toBe(3);
        expect(groups[0].count).toBe(3);
        expect(groups[0].playbackSpeed).toBe(1.0);
    });

    it('多天观看时应按天划分区间（如第1-3集，第4集，第5-9集）', () => {
        const day1 = new Date(2026, 7, 26, 14, 0).getTime();
        const day2 = new Date(2026, 7, 27, 20, 0).getTime();
        const day3 = new Date(2026, 7, 28, 15, 0).getTime();

        const logs: EpisodeWatchLog[] = [
            // Day 1: 看 1, 2, 3 集
            { episode: 1, date: day1, playbackSpeed: 1.5 },
            { episode: 2, date: day1 + 3600000, playbackSpeed: 1.5 },
            { episode: 3, date: day1 + 7200000, playbackSpeed: 1.5 },
            // Day 2: 看 4 集
            { episode: 4, date: day2, playbackSpeed: 1.5 },
            // Day 3: 看 5, 6, 7, 8, 9 集
            { episode: 5, date: day3, playbackSpeed: 1.5 },
            { episode: 6, date: day3 + 3600000, playbackSpeed: 1.5 },
            { episode: 7, date: day3 + 7200000, playbackSpeed: 1.5 },
            { episode: 8, date: day3 + 10800000, playbackSpeed: 1.5 },
            { episode: 9, date: day3 + 14400000, playbackSpeed: 1.5 },
        ];

        const groups = clusterWatchHistoryByDay(logs);
        expect(groups).toHaveLength(3);

        // Day 1: 第 1-3 集
        expect(groups[0].startEp).toBe(1);
        expect(groups[0].endEp).toBe(3);
        expect(groups[0].count).toBe(3);

        // Day 2: 第 4 集
        expect(groups[1].startEp).toBe(4);
        expect(groups[1].endEp).toBe(4);
        expect(groups[1].count).toBe(1);

        // Day 3: 第 5-9 集
        expect(groups[2].startEp).toBe(5);
        expect(groups[2].endEp).toBe(9);
        expect(groups[2].count).toBe(5);
    });

    it('同一天内倍速不同时，应按倍速拆分区间', () => {
        const todayNoon = new Date(2026, 7, 28, 12, 0).getTime();
        const logs: EpisodeWatchLog[] = [
            { episode: 1, date: todayNoon, playbackSpeed: 1.0 },
            { episode: 2, date: todayNoon + 3600000, playbackSpeed: 1.0 },
            { episode: 3, date: todayNoon + 7200000, playbackSpeed: 1.5 },
        ];

        const groups = clusterWatchHistoryByDay(logs);
        expect(groups).toHaveLength(2);
        expect(groups[0].startEp).toBe(1);
        expect(groups[0].endEp).toBe(2);
        expect(groups[0].playbackSpeed).toBe(1.0);

        expect(groups[1].startEp).toBe(3);
        expect(groups[1].endEp).toBe(3);
        expect(groups[1].playbackSpeed).toBe(1.5);
    });
});

describe('formatRelativeWatchDate - 友好时间格式化测试', () => {
    it('timestamp 为空时返回空字符串', () => {
        expect(formatRelativeWatchDate(undefined)).toBe('');
    });

    it('当前时间应格式化为 "刚刚"', () => {
        expect(formatRelativeWatchDate(Date.now())).toBe('刚刚');
    });

    it('10 分钟前应返回 "10 分钟前"', () => {
        const tenMinsAgo = Date.now() - 10 * 60 * 1000;
        expect(formatRelativeWatchDate(tenMinsAgo)).toBe('10 分钟前');
    });
});

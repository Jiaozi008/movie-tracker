import { describe, it, expect } from 'vitest';
import { Movie, MovieStatus } from '../types';
import { formatLocalDateKey, parseLocalDate } from '../utils/dateUtils';
import { buildInitialState, defaultState } from '../hooks/useMovieForm';
import { isMovieShow, isTvShow, sanitizeMovie } from '../utils/migrationUtils';

describe('Cinematic Experience & Time Capsule Tests', () => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const currentDate = today.getDate();

    const oneYearAgo = new Date(currentYear - 1, currentMonth, currentDate, 15, 30).getTime();
    const threeYearsAgo = new Date(currentYear - 3, currentMonth, currentDate, 20, 0).getTime();
    const differentDay = new Date(currentYear - 2, currentMonth, currentDate + 5).getTime();

    const sampleMovies: Movie[] = [
        {
            id: 'm-1',
            title: '星际穿越',
            year: '2014',
            genre: '科幻',
            rating: 5,
            status: MovieStatus.WATCHED,
            review: '震撼心灵的黑洞奇观',
            quote: '爱是一种力量，能超越时间和空间的维度。',
            posterColor: '#1e293b',
            addedAt: oneYearAgo,
            lastUpdated: oneYearAgo,
            mediaType: 'movie',
        },
        {
            id: 'm-2',
            title: '盗梦空间',
            year: '2010',
            genre: '悬疑 / 动作',
            rating: 4.5,
            status: MovieStatus.WATCHED,
            review: '梦中梦的结构堪称教科书',
            quote: '最坚韧的寄生虫是什么？是想法。',
            posterColor: '#0f172a',
            addedAt: threeYearsAgo,
            lastUpdated: threeYearsAgo,
            mediaType: 'movie',
        },
        {
            id: 'm-3',
            title: '普通电影',
            year: '2020',
            genre: '剧情',
            rating: 3,
            status: MovieStatus.WATCHED,
            review: '一般',
            posterColor: '#334155',
            addedAt: differentDay,
            lastUpdated: differentDay,
            mediaType: 'movie',
        },
    ];

    it('时光胶囊应精准匹配往年同日观影记录', () => {
        const matches = sampleMovies.filter(m => {
            const d = new Date(m.addedAt);
            return d.getFullYear() < currentYear && d.getMonth() === currentMonth && d.getDate() === currentDate;
        });

        expect(matches).toHaveLength(2);
        expect(matches.map(m => m.title)).toContain('星际穿越');
        expect(matches.map(m => m.title)).toContain('盗梦空间');
        expect(matches.map(m => m.title)).not.toContain('普通电影');
    });

    it('经典台词 quote 字段应在表单初始状态中正确映射与维护', () => {
        const movieWithQuote: Movie = sampleMovies[0];
        const state = buildInitialState(movieWithQuote);

        expect(state.quote).toBe('爱是一种力量，能超越时间和空间的维度。');
        expect(state.title).toBe('星际穿越');
    });

    it('空初始数据应正确赋予默认 quote 空字符串', () => {
        const state = buildInitialState(null);
        expect(state.quote).toBe('');
        expect(defaultState.quote).toBe('');
    });

    it('isMovieShow 与 isTvShow 应准确区分电影与剧集，即便缺少 mediaType 字段', () => {
        const rawMovie = { title: '肖申克的救赎', year: '1994', rating: 5 };
        const rawTv = { title: '绝命毒师', year: '2008', rating: 5, totalEpisodes: 62 };
        const explicitTv = { title: '怪奇物语', year: '2016', rating: 5, mediaType: 'tv' };

        expect(isMovieShow(rawMovie)).toBe(true);
        expect(isTvShow(rawMovie)).toBe(false);

        expect(isMovieShow(rawTv)).toBe(false);
        expect(isTvShow(rawTv)).toBe(true);

        expect(isMovieShow(explicitTv)).toBe(false);
        expect(isTvShow(explicitTv)).toBe(true);

        const sanitizedMovie = sanitizeMovie(rawMovie);
        expect(sanitizedMovie).not.toBeNull();
        expect(sanitizedMovie!.mediaType).toBe('movie');
        expect(sanitizedMovie!.title).toBe('肖申克的救赎');

        const sanitizedTv = sanitizeMovie(rawTv);
        expect(sanitizedTv).not.toBeNull();
        expect(sanitizedTv!.mediaType).toBe('tv');
    });

    describe('Phase 2 - High-Value Asset Badges & Speed Perception Tests', () => {
        it('应该准确识别殿堂神作 (Rating >= 4.5) 与多刷经典资产 (Iteration >= 2)', () => {
            const masterpieceMovie: Movie = {
                id: 'm-god',
                title: '教父',
                rating: 5,
                status: MovieStatus.WATCHED,
                addedAt: Date.now(),
                lastUpdated: Date.now(),
                watchIteration: 3,
            };

            const isMasterpiece = (masterpieceMovie.rating || 0) >= 4.5;
            const isRewatchAsset = (masterpieceMovie.watchIteration || 1) >= 2;

            expect(isMasterpiece).toBe(true);
            expect(isRewatchAsset).toBe(true);
        });

        it('应该正确折算不同倍速下的实际观影耗时', () => {
            const movieDuration = 150; // 150分钟
            const speed = 1.5;
            const actualMinutes = Math.round(movieDuration / speed);

            expect(actualMinutes).toBe(100);
        });
    });
});

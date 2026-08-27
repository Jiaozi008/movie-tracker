import { describe, it, expect } from 'vitest';
import { Movie, MovieStatus } from '../types';
import {
    calculateMovieDuration,
    calculateTvDuration,
    calculateTotalEpisodes,
    calculateJudgePersona,
    calculateRewatchKing,
    calculateSpeedDemon
} from '../utils/statsCalculator';

describe('Phase 3 - 观影报告长图统计聚合测试', () => {
    const mockMovies: Movie[] = [
        {
            id: 'm-1',
            title: '盗梦空间',
            year: '2010',
            genre: '科幻, 悬疑',
            rating: 5,
            status: MovieStatus.WATCHED,
            review: '神作',
            posterColor: '#333333',
            addedAt: 1700000000000,
            lastUpdated: 1700000000000,
            mediaType: 'movie',
            duration: 148,
            playbackSpeed: 1.0,
            watchIteration: 3,
            tags: ['诺兰', '烧脑']
        },
        {
            id: 'tv-1',
            title: '权力的游戏',
            year: '2011',
            genre: '奇幻, 剧情',
            rating: 4.8,
            status: MovieStatus.WATCHED,
            review: '前六季封神',
            posterColor: '#222222',
            addedAt: 1700000000000,
            lastUpdated: 1700000000000,
            mediaType: 'tv',
            currentEpisode: 10,
            totalEpisodes: 73,
            duration: 60,
            playbackSpeed: 1.25,
            actualWatchTime: 480,
            tags: ['史诗', 'HBO']
        }
    ];

    it('应准确计算电影时长与电视剧集数及折算时长', () => {
        const movieDuration = calculateMovieDuration(mockMovies);
        expect(movieDuration).toBe(148);

        const tvDuration = calculateTvDuration(mockMovies);
        // (10 * 60) / 1.25 = 480
        expect(tvDuration).toBe(480);

        const totalEpisodes = calculateTotalEpisodes(mockMovies);
        expect(totalEpisodes).toBe(10);
    });

    it('应正确计算重温之王、倍速狂人与影评人设', () => {
        const rewatchKing = calculateRewatchKing(mockMovies);
        expect(rewatchKing).not.toBeNull();
        expect(rewatchKing?.title).toBe('盗梦空间');
        expect(rewatchKing?.iteration).toBe(3);

        const speedDemon = calculateSpeedDemon(mockMovies);
        expect(speedDemon).not.toBeNull();
        expect(speedDemon?.title).toBe('权力的游戏');
        expect(speedDemon?.speed).toBe(1.25);

        const persona = calculateJudgePersona(mockMovies);
        expect(typeof persona).toBe('string');
        expect(persona.length).toBeGreaterThan(0);
    });
});

describe('Phase 3 - SSE 流式数据解析逻辑验证', () => {
    it('应正确解析 SSE data 行并累加文本', () => {
        const sseLines = [
            'data: {"candidates": [{"content": {"parts": [{"text": "这"}]}}]}',
            'data: {"candidates": [{"content": {"parts": [{"text": "部"}]}}]}',
            'data: {"candidates": [{"content": {"parts": [{"text": "电影"}]}}]}',
            'data: {"candidates": [{"content": {"parts": [{"text": "非常棒！"}]}}]}',
            'data: [DONE]'
        ];

        let accumulated = '';
        const receivedChunks: string[] = [];

        sseLines.forEach(line => {
            if (!line.startsWith('data:')) return;
            const jsonStr = line.replace(/^data:\s*/, '');
            if (jsonStr === '[DONE]') return;

            const parsed = JSON.parse(jsonStr);
            const chunk = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (chunk) {
                accumulated += chunk;
                receivedChunks.push(chunk);
            }
        });

        expect(accumulated).toBe('这部电影非常棒！');
        expect(receivedChunks).toEqual(['这', '部', '电影', '非常棒！']);
    });
});

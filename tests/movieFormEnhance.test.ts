import { describe, it, expect, vi } from 'vitest';
import { generateUUID } from '../utils/uuidUtils';
import { buildInitialState, defaultState } from '../hooks/useMovieForm';
import { convertToCSV } from '../utils/fileUtils';
import { Movie, MovieStatus } from '../types';

describe('MovieForm Enhancement Tests', () => {
  describe('generateUUID', () => {
    it('should generate valid 36-character UUID string', () => {
      const id1 = generateUUID();
      const id2 = generateUUID();
      expect(id1).toHaveLength(36);
      expect(id2).toHaveLength(36);
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('should work even if crypto.randomUUID throws or is unavailable', () => {
      const spy = vi.spyOn(crypto, 'randomUUID').mockImplementation(() => {
        throw new Error('randomUUID unavailable');
      });

      const fallbackId = generateUUID();
      expect(fallbackId).toHaveLength(36);
      expect(fallbackId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

      spy.mockRestore();
    });
  });

  describe('buildInitialState and defaults', () => {
    it('should initialize with today date and default values including overview and tmdbRating', () => {
      const state = buildInitialState(null);
      expect(state.title).toBe('');
      expect(state.mediaType).toBe('movie');
      expect(state.status).toBe(MovieStatus.WATCHED);
      expect(state.watchedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(state.playbackSpeed).toBe('1.0');
      expect(state.overview).toBe('');
      expect(state.tmdbRating).toBeUndefined();
    });

    it('should accurately parse speed presets and inherit overview & tmdbRating', () => {
      const state = buildInitialState({
        id: 'test-1',
        title: '星际穿越',
        year: '2014',
        genre: '科幻, 冒险',
        rating: 5,
        tmdbRating: 8.7,
        overview: '世界末日临近，一群探险家通过虫洞寻找人类新家园。',
        status: MovieStatus.WATCHED,
        addedAt: Date.now(),
        lastUpdated: Date.now(),
        playbackSpeed: 1.25,
      });

      expect(state.playbackSpeed).toBe('1.25');
      expect(state.tmdbRating).toBe(8.7);
      expect(state.overview).toBe('世界末日临近，一群探险家通过虫洞寻找人类新家园。');
    });
  });

  describe('CSV Export with overview and tmdbRating', () => {
    it('should include 平台评分 and 剧情简介 headers and fields in CSV export', () => {
      const movies: Movie[] = [
        {
          id: 'test-csv-1',
          title: '盗梦空间',
          year: '2010',
          genre: '科幻',
          rating: 4.5,
          tmdbRating: 8.4,
          overview: '造梦师进入他人潜意识盗取机密。',
          status: MovieStatus.WATCHED,
          review: '经典烧脑神作',
          posterColor: '#4f46e5',
          addedAt: 1700000000000,
          lastUpdated: 1700000000000,
          mediaType: 'movie',
          tags: ['烧脑', '科幻'],
        }
      ];

      const csv = convertToCSV(movies);
      expect(csv).toContain('平台评分');
      expect(csv).toContain('剧情简介');
      expect(csv).toContain('8.4');
      expect(csv).toContain('造梦师进入他人潜意识盗取机密。');
    });
  });

  describe('Phase 1 - 5 Core Elements & Silent Autofill Data Flow', () => {
    it('should properly support 5 core interactive fields upfront', () => {
      const state = buildInitialState({
        id: 'core-test',
        title: '奥本海默',
        rating: 5,
        quote: '我现在成了死神，世界的毁灭者。',
        review: '诺兰的巅峰传记片，视听语言震撼。',
        playbackSpeed: 1.0,
        status: MovieStatus.WATCHED,
        addedAt: 1710000000000,
        lastUpdated: 1710000000000,
      });

      // 5 核心要素验证
      expect(state.title).toBe('奥本海默');
      expect(state.rating).toBe(5);
      expect(state.quote).toBe('我现在成了死神，世界的毁灭者。');
      expect(state.review).toBe('诺兰的巅峰传记片，视听语言震撼。');
      expect(state.playbackSpeed).toBe('1.0');
      expect(state.watchedDate).toBeTruthy();
    });

    it('should seamlessly accommodate background autofilled secondary metadata', () => {
      const state = buildInitialState({
        id: 'autofill-test',
        title: '沙丘2',
        year: '2024',
        country: '美国',
        genre: '科幻, 冒险, 动作',
        director: '丹尼斯·维伦纽瓦',
        cast: '提莫西·查拉梅, 赞达亚, 丽贝卡·弗格森',
        duration: 166,
        platform: 'IMAX 院线',
        tmdbRating: 8.5,
        overview: '保罗·厄崔迪携手契妮和弗雷曼人，对毁灭他家族的阴谋者展开报复。',
        tags: ['科幻史诗', '沙丘', '维伦纽瓦'],
        rating: 4.5,
        quote: '愿你的刀刃碎裂破损。',
        review: '年度最佳科幻视听！',
        playbackSpeed: 1.0,
        status: MovieStatus.WATCHED,
        addedAt: 1710000000000,
        lastUpdated: 1710000000000,
      });

      expect(state.year).toBe('2024');
      expect(state.country).toBe('美国');
      expect(state.genre).toBe('科幻, 冒险, 动作');
      expect(state.director).toBe('丹尼斯·维伦纽瓦');
      expect(state.cast).toContain('提莫西·查拉梅');
      expect(state.duration).toBe('166');
      expect(state.platform).toBe('IMAX 院线');
      expect(state.tmdbRating).toBe(8.5);
      expect(state.overview).toContain('保罗·厄崔迪');
      expect(state.tags).toEqual(['科幻史诗', '沙丘', '维伦纽瓦']);
    });
  });
});

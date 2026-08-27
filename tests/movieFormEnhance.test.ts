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
});

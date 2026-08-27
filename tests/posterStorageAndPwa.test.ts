import { describe, it, expect, beforeEach, vi } from 'vitest';
import { savePoster, getPoster, deletePoster, getAllPosters } from '../utils/posterStorage';
import manifest from '../public/manifest.json';

describe('Phase 4 - PWA Manifest 与配置校验', () => {
    it('manifest.json 应包含正确的应用名称、显示模式和图标配置', () => {
        expect(manifest.name).toBe('CineLog AI - 观影记录');
        expect(manifest.short_name).toBe('CineLog');
        expect(manifest.display).toBe('standalone');
        expect(manifest.theme_color).toBe('#0f172a');
        expect(manifest.icons).toBeDefined();
        expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
    });
});

describe('Phase 4 - IndexedDB 海报存储与安全降级测试', () => {
    it('在非浏览器/无 IndexedDB 环境下应能优雅降级不抛出致命异常', async () => {
        const testId = 'movie-poster-test-1';
        const sampleDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

        await expect(savePoster(testId, sampleDataUrl)).resolves.not.toThrow();
        const poster = await getPoster(testId);
        expect(poster === null || typeof poster === 'string').toBe(true);

        const allPosters = await getAllPosters();
        expect(typeof allPosters).toBe('object');

        await expect(deletePoster(testId)).resolves.not.toThrow();
    });
});

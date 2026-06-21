import { describe, it, expect } from 'vitest';
import { mergeMovies } from '../utils/syncUtils';
import { Movie, MovieStatus } from '../types';

// 辅助方法，用于快速生成 Movie 测试数据
const createMovie = (id: string, title: string, lastUpdated: number, addedAt: number = Date.now()): Movie => {
    return {
        id,
        title,
        year: '2026',
        genre: 'Sci-Fi',
        rating: 5,
        status: MovieStatus.WATCHED,
        review: 'Excellent',
        posterColor: 'from-blue-600 to-indigo-900',
        addedAt,
        lastUpdated,
        mediaType: 'movie'
    };
};

describe('mergeMovies Sync Algorithm Tests', () => {
    it('应能合并云端和本地不冲突的新增记录', () => {
        const local = [createMovie('1', 'Local Movie 1', 100)];
        const cloud = [createMovie('2', 'Cloud Movie 2', 100)];
        const deleted = {};

        const res = mergeMovies(local, cloud, deleted);

        expect(res.merged.length).toBe(2);
        expect(res.merged.find(m => m.id === '1')).toBeDefined();
        expect(res.merged.find(m => m.id === '2')).toBeDefined();
        expect(res.hasLocalChanges).toBe(true);  // 本地合并了云端电影2，需要本地持久化
        expect(res.hasRemoteChanges).toBe(true); // 云端缺失电影1，需要上传
    });

    it('如果记录在本地被更新（lastUpdated 较新），应保留本地并标记云端需要上传', () => {
        const local = [createMovie('1', 'Movie 1 (Updated)', 200)];
        const cloud = [createMovie('1', 'Movie 1 (Old)', 100)];
        const deleted = {};

        const res = mergeMovies(local, cloud, deleted);

        expect(res.merged.length).toBe(1);
        expect(res.merged[0].title).toBe('Movie 1 (Updated)');
        expect(res.hasLocalChanges).toBe(false);
        expect(res.hasRemoteChanges).toBe(true); // 本地比云端更新，需上传
    });

    it('如果记录在云端被更新（lastUpdated 较新），应使用云端并标记本地需要更新', () => {
        const local = [createMovie('1', 'Movie 1 (Old)', 100)];
        const cloud = [createMovie('1', 'Movie 1 (Updated)', 200)];
        const deleted = {};

        const res = mergeMovies(local, cloud, deleted);

        expect(res.merged.length).toBe(1);
        expect(res.merged[0].title).toBe('Movie 1 (Updated)');
        expect(res.hasLocalChanges).toBe(true);  // 云端比本地更新，需保存到本地
        expect(res.hasRemoteChanges).toBe(false);
    });

    it('如果记录在本地已被删除（在 Tombstone 中），且云端没有更新的修改，应从云端同步删除', () => {
        const local: Movie[] = [];
        const cloud = [createMovie('1', 'Movie 1', 100)];
        const deleted = { '1': 150 }; // 在时间戳 150 被删，云端更新时间是 100

        const res = mergeMovies(local, cloud, deleted);

        expect(res.merged.length).toBe(0);
        expect(res.hasRemoteChanges).toBe(true); // 本地已删除，云端还没删，需上传告诉云端删掉
        expect(res.hasLocalChanges).toBe(false);
    });

    it('如果记录在本地已被删除，但云端在此之后进行了更新（lastUpdated > deletedAt），应恢复该记录', () => {
        const local: Movie[] = [];
        const cloud = [createMovie('1', 'Movie 1 (New Modification)', 200)];
        const deleted = { '1': 150 }; // 在时间戳 150 被删，但云端在 200 又被修改了

        const res = mergeMovies(local, cloud, deleted);

        expect(res.merged.length).toBe(1);
        expect(res.merged[0].title).toBe('Movie 1 (New Modification)');
        expect(res.updatedDeletedRecords['1']).toBeUndefined(); // 该记录重新被激活，移出删除库
        expect(res.hasLocalChanges).toBe(true); // 恢复了，本地需保存
    });
});

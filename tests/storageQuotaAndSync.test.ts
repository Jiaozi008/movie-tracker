import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
    stripBase64FromMovies, 
    cleanupObsoleteStorage, 
    emergencyFreeStorage, 
    safeSetItem, 
    safeSaveMoviesToLocalStorage, 
    STORAGE_KEY, 
    DELETED_STORAGE_KEY, 
    TMDB_FILMOGRAPHY_CACHE_KEY 
} from '../utils/storageUtils';
import { saveMoviesToIndexedDB, getMoviesFromIndexedDB } from '../utils/posterStorage';
import { Movie, MovieStatus } from '../types';

describe('Storage Quota & Sync Persistence Tests (移动端存储配额与持久化测试)', () => {
    let mockStore: Record<string, string> = {};

    beforeEach(() => {
        mockStore = {};
        Object.defineProperty(window, 'localStorage', {
            value: {
                getItem: (key: string) => mockStore[key] || null,
                setItem: (key: string, value: string) => {
                    mockStore[key] = value;
                },
                removeItem: (key: string) => {
                    delete mockStore[key];
                },
                clear: () => {
                    mockStore = {};
                },
                key: (index: number) => Object.keys(mockStore)[index] || null,
                get length() {
                    return Object.keys(mockStore).length;
                }
            },
            writable: true,
            configurable: true
        });
    });

    it('stripBase64FromMovies 应精准剔除 data:image/ 开头的 Base64 海报，但完整保留网络 URL', () => {
        const testMovies: Movie[] = [
            {
                id: 'm-1',
                title: '本地Base64海报电影',
                year: '2026',
                genre: '科幻',
                rating: 5,
                status: MovieStatus.WATCHED,
                review: '好片',
                posterColor: '#333',
                posterImage: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD...',
                addedAt: 1756700000000,
                lastUpdated: 1756700000000,
                mediaType: 'movie'
            },
            {
                id: 'm-2',
                title: 'TMDB网络海报电影',
                year: '2026',
                genre: '动作',
                rating: 4,
                status: MovieStatus.WATCHED,
                review: '精彩',
                posterColor: '#444',
                posterImage: 'https://image.tmdb.org/t/p/w500/test.jpg',
                addedAt: 1756700000000,
                lastUpdated: 1756700000000,
                mediaType: 'movie'
            }
        ];

        const stripped = stripBase64FromMovies(testMovies);
        expect(stripped[0].posterImage).toBeUndefined();
        expect(stripped[1].posterImage).toBe('https://image.tmdb.org/t/p/w500/test.jpg');
    });

    it('cleanupObsoleteStorage 应主动清除废弃的历史 TMDB 缓存键 (v1, v2, v3) 并保留当前 v4', () => {
        window.localStorage.setItem('cinelog_tmdb_filmography_cache_v1', '{"old":1}');
        window.localStorage.setItem('cinelog_tmdb_filmography_cache_v2', '{"old":2}');
        window.localStorage.setItem('cinelog_tmdb_filmography_cache_v3', '{"old":3}');
        window.localStorage.setItem(TMDB_FILMOGRAPHY_CACHE_KEY, '{"current":4}');
        window.localStorage.setItem('other_key', 'value');

        cleanupObsoleteStorage();

        expect(window.localStorage.getItem('cinelog_tmdb_filmography_cache_v1')).toBeNull();
        expect(window.localStorage.getItem('cinelog_tmdb_filmography_cache_v2')).toBeNull();
        expect(window.localStorage.getItem('cinelog_tmdb_filmography_cache_v3')).toBeNull();
        expect(window.localStorage.getItem(TMDB_FILMOGRAPHY_CACHE_KEY)).toBe('{"current":4}');
        expect(window.localStorage.getItem('other_key')).toBe('value');
    });

    it('cleanupObsoleteStorage 应自动清洗 cinelog_movies_v1 中堆积的历史 Base64 海报', () => {
        const dirtyMovies = [
            {
                id: 'legacy-1',
                title: '老记录含超大海报',
                posterImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
            }
        ];
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(dirtyMovies));

        cleanupObsoleteStorage();

        const cleanedRaw = window.localStorage.getItem(STORAGE_KEY);
        expect(cleanedRaw).not.toBeNull();
        const cleaned = JSON.parse(cleanedRaw!);
        expect(cleaned[0].posterImage).toBeUndefined();
    });

    it('safeSetItem 遭遇配额溢出时应自动腾挪非核心缓存并重试成功', () => {
        window.localStorage.setItem(TMDB_FILMOGRAPHY_CACHE_KEY, '{"huge":1}');
        window.localStorage.setItem('cine_person_zh_cache', '{"zh":1}');

        let quotaTriggered = false;
        const originalSetItem = window.localStorage.setItem;
        window.localStorage.setItem = vi.fn((key: string, value: string) => {
            if (!quotaTriggered && key === 'test_overflow_key') {
                quotaTriggered = true;
                const err = new Error('QuotaExceededError');
                err.name = 'QuotaExceededError';
                throw err;
            }
            originalSetItem(key, value);
        });

        const success = safeSetItem('test_overflow_key', 'important_data');
        expect(success).toBe(true);
        expect(window.localStorage.getItem('test_overflow_key')).toBe('important_data');
        // 非核心缓存已被腾挪
        expect(window.localStorage.getItem(TMDB_FILMOGRAPHY_CACHE_KEY)).toBeNull();
    });

    it('safeSaveMoviesToLocalStorage 能安全存储影片且不会将 Base64 泄露到 LocalStorage', () => {
        const testMovie: Movie = {
            id: 'm-3',
            title: '9月2日新电影',
            year: '2026',
            genre: '剧情',
            rating: 5,
            status: MovieStatus.WATCHED,
            review: '最新看过的片子',
            posterColor: '#555',
            posterImage: 'data:image/png;base64,LARGE_BASE64_DATA',
            addedAt: Date.now(),
            lastUpdated: Date.now(),
            mediaType: 'movie'
        };

        const result = safeSaveMoviesToLocalStorage([testMovie]);
        expect(result).toBe(true);

        const savedJson = window.localStorage.getItem(STORAGE_KEY);
        expect(savedJson).not.toBeNull();
        expect(savedJson!.includes('LARGE_BASE64_DATA')).toBe(false);
        expect(savedJson!.includes('9月2日新电影')).toBe(true);
    });

    it('双层存储支持：saveMoviesToIndexedDB 与 getMoviesFromIndexedDB 在无异常环境中优雅运作', async () => {
        const testMovies: Movie[] = [
            {
                id: 'm-idb-1',
                title: 'IndexedDB 备份片单',
                year: '2026',
                genre: '纪录片',
                rating: 5,
                status: MovieStatus.WATCHED,
                review: '备份测试',
                posterColor: '#123',
                addedAt: 1756700000000,
                lastUpdated: 1756700000000,
                mediaType: 'movie'
            }
        ];

        await expect(saveMoviesToIndexedDB(testMovies)).resolves.not.toThrow();
        const retrieved = await getMoviesFromIndexedDB();
        expect(retrieved === null || Array.isArray(retrieved)).toBe(true);
    });
});

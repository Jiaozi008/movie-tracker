/**
 * IndexedDB 海报存储工具库
 * 用于将体积庞大的 Base64 本地海报图片存储于 IndexedDB，
 * 避免膨胀 LocalStorage（突破 5MB 限制）及避免云同步 Gist 超限。
 */

import { Movie } from '../types';

const DB_NAME = 'cinelog_posters_db';
const DB_VERSION = 2;
const STORE_NAME = 'posters';
const MOVIES_STORE_NAME = 'movies_cache';

let dbPromise: Promise<IDBDatabase> | null = null;

const isIndexedDBAvailable = (): boolean => {
    return typeof window !== 'undefined' && 'indexedDB' in window;
};

/**
 * 获取或初始化 IndexedDB 实例
 */
export const getDB = (): Promise<IDBDatabase> => {
    if (!isIndexedDBAvailable()) {
        return Promise.reject(new Error('当前环境不支持 IndexedDB'));
    }

    if (!dbPromise) {
        dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
            try {
                const request = indexedDB.open(DB_NAME, DB_VERSION);

                request.onupgradeneeded = (event) => {
                    const db = (event.target as IDBOpenDBRequest).result;
                    if (!db.objectStoreNames.contains(STORE_NAME)) {
                        db.createObjectStore(STORE_NAME);
                    }
                    if (!db.objectStoreNames.contains(MOVIES_STORE_NAME)) {
                        db.createObjectStore(MOVIES_STORE_NAME);
                    }
                };

                request.onsuccess = () => {
                    resolve(request.result);
                };

                request.onerror = () => {
                    reject(request.error || new Error('打开 IndexedDB 失败'));
                };
            } catch (err) {
                reject(err);
            }
        });
    }

    return dbPromise;
};

/**
 * 存储单张海报图片（Base64 或 Blob DataURL）
 */
export const savePoster = async (movieId: string, dataUrl: string): Promise<void> => {
    if (!isIndexedDBAvailable() || !movieId || !dataUrl) return;

    try {
        const db = await getDB();
        return new Promise<void>((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.put(dataUrl, movieId);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (err) {
        console.warn('IndexedDB savePoster error:', err);
    }
};

/**
 * 根据影片 ID 读取海报图片
 */
export const getPoster = async (movieId: string): Promise<string | null> => {
    if (!isIndexedDBAvailable() || !movieId) return null;

    try {
        const db = await getDB();
        return new Promise<string | null>((resolve) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.get(movieId);

            request.onsuccess = () => {
                resolve((request.result as string) || null);
            };
            request.onerror = () => {
                resolve(null);
            };
        });
    } catch (err) {
        console.warn('IndexedDB getPoster error:', err);
        return null;
    }
};

/**
 * 批量获取所有海报映射表 { [movieId]: posterDataUrl }
 */
export const getAllPosters = async (): Promise<Record<string, string>> => {
    if (!isIndexedDBAvailable()) return {};

    try {
        const db = await getDB();
        return new Promise<Record<string, string>>((resolve) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const postersMap: Record<string, string> = {};

            // Use openCursor to traverse all keys and values
            const cursorReq = store.openCursor();
            cursorReq.onsuccess = (e) => {
                const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
                if (cursor) {
                    postersMap[cursor.key as string] = cursor.value as string;
                    cursor.continue();
                } else {
                    resolve(postersMap);
                }
            };

            cursorReq.onerror = () => {
                resolve(postersMap);
            };
        });
    } catch (err) {
        console.warn('IndexedDB getAllPosters error:', err);
        return {};
    }
};

/**
 * 删除单张海报图片
 */
export const deletePoster = async (movieId: string): Promise<void> => {
    if (!isIndexedDBAvailable() || !movieId) return;

    try {
        const db = await getDB();
        return new Promise<void>((resolve) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.delete(movieId);

            request.onsuccess = () => resolve();
            request.onerror = () => resolve();
        });
    } catch (err) {
        console.warn('IndexedDB deletePoster error:', err);
    }
};

/**
 * 清理孤立海报（已从影片库中彻底删除的海报缓存）
 */
export const cleanupOrphanPosters = async (activeMovieIds: string[]): Promise<void> => {
    if (!isIndexedDBAvailable() || !activeMovieIds) return;

    try {
        const db = await getDB();
        const activeSet = new Set(activeMovieIds);

        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const cursorReq = store.openCursor();

        cursorReq.onsuccess = (e) => {
            const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
            if (cursor) {
                const key = cursor.key as string;
                if (!activeSet.has(key)) {
                    cursor.delete();
                }
                cursor.continue();
            }
        };
    } catch (err) {
        console.warn('IndexedDB cleanupOrphanPosters error:', err);
    }
};

/**
 * 将全部影片列表存入 IndexedDB（作为超大片库双层备份与容灾持久化）
 */
export const saveMoviesToIndexedDB = async (movies: Movie[]): Promise<void> => {
    if (!isIndexedDBAvailable() || !Array.isArray(movies)) return;

    try {
        const db = await getDB();
        if (!db.objectStoreNames.contains(MOVIES_STORE_NAME)) return;

        return new Promise<void>((resolve, reject) => {
            const tx = db.transaction(MOVIES_STORE_NAME, 'readwrite');
            const store = tx.objectStore(MOVIES_STORE_NAME);
            const request = store.put(movies, 'latest_movies');

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (err) {
        console.warn('IndexedDB saveMoviesToIndexedDB error:', err);
    }
};

/**
 * 从 IndexedDB 读取影片备份列表
 */
export const getMoviesFromIndexedDB = async (): Promise<Movie[] | null> => {
    if (!isIndexedDBAvailable()) return null;

    try {
        const db = await getDB();
        if (!db.objectStoreNames.contains(MOVIES_STORE_NAME)) return null;

        return new Promise<Movie[] | null>((resolve) => {
            const tx = db.transaction(MOVIES_STORE_NAME, 'readonly');
            const store = tx.objectStore(MOVIES_STORE_NAME);
            const request = store.get('latest_movies');

            request.onsuccess = () => {
                const result = request.result;
                resolve(Array.isArray(result) ? result : null);
            };
            request.onerror = () => {
                resolve(null);
            };
        });
    } catch (err) {
        console.warn('IndexedDB getMoviesFromIndexedDB error:', err);
        return null;
    }
};

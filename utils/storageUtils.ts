import { Movie } from '../types';
import { savePoster } from './posterStorage';

export const STORAGE_KEY = 'cinelog_movies_v1';
export const DELETED_STORAGE_KEY = 'cinelog_deleted_movies_v1';
export const TMDB_FILMOGRAPHY_CACHE_KEY = 'cinelog_tmdb_filmography_cache_v4';

/**
 * 剥离影片中的巨大 Base64 本地海报图片，转换为轻量对象以存入 LocalStorage。
 * Base64 海报由 IndexedDB 专项存储，杜绝 LocalStorage 突破 5MB 移动端硬限制。
 * （外部 HTTP/HTTPS 链接或 TMDB 相对路径体积仅数十字节，完整保留）
 */
export const stripBase64FromMovies = (movies: Movie[]): Movie[] => {
    return movies.map(m => {
        if (m.posterImage && m.posterImage.startsWith('data:image/')) {
            const copy = { ...m };
            delete copy.posterImage;
            return copy;
        }
        return m;
    });
};

/**
 * 清理历史遗留及废弃的 LocalStorage 缓存
 * 1. 彻底清除 TMDB 历史废弃版本缓存键 (如 v1, v2, v3 等)
 * 2. 检查现有 cinelog_movies_v1 中是否塞满了 Base64，如存在则一键转存 IndexedDB 并清洗 LocalStorage，瞬间腾出数兆空间
 */
export const cleanupObsoleteStorage = (): void => {
    if (typeof window === 'undefined' || !window.localStorage) return;

    try {
        // 1. 清除历史版本的 TMDB 缓存键 (v1, v2, v3 等)
        for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key && key.startsWith('cinelog_tmdb_filmography_cache_') && key !== TMDB_FILMOGRAPHY_CACHE_KEY) {
                localStorage.removeItem(key);
            }
        }

        // 2. 清洗已存在于 LocalStorage 的 Base64 海报，释放宝贵空间
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved && saved.includes('data:image/')) {
            const list: Movie[] = JSON.parse(saved);
            let hasBase64 = false;
            const cleaned = list.map(m => {
                if (m.posterImage && m.posterImage.startsWith('data:image/')) {
                    hasBase64 = true;
                    savePoster(m.id, m.posterImage).catch(() => {});
                    const copy = { ...m };
                    delete copy.posterImage;
                    return copy;
                }
                return m;
            });

            if (hasBase64) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
                console.log('[Storage] 已将 LocalStorage 中堆积的历史 Base64 海报迁出至 IndexedDB，释放数 MB 空间');
            }
        }
    } catch (e) {
        console.warn('cleanupObsoleteStorage error:', e);
    }
};

/**
 * 紧急腾挪存储空间（当遇到 QuotaExceededError 配额告警时自动调用）
 */
export const emergencyFreeStorage = (): void => {
    if (typeof window === 'undefined' || !window.localStorage) return;

    try {
        // 优先清除可随时重新拉取/重新生成的非核心查询缓存
        localStorage.removeItem(TMDB_FILMOGRAPHY_CACHE_KEY);
        localStorage.removeItem('cine_person_zh_cache');
        localStorage.removeItem('cine_title_zh_cache');
        console.warn('[Storage] 已触发紧急存储空间释放机制');
    } catch (e) {
        console.warn('emergencyFreeStorage error:', e);
    }
};

/**
 * 安全地将键值对写入 LocalStorage，带有配额溢出自动救护与重试
 */
export const safeSetItem = (key: string, value: string): boolean => {
    if (typeof window === 'undefined' || !window.localStorage) return false;

    try {
        localStorage.setItem(key, value);
        return true;
    } catch (err: any) {
        console.warn(`[Storage] LocalStorage setItem failed for key "${key}":`, err);
        // 若遭遇配额限制，尝试紧急腾挪后重试
        emergencyFreeStorage();
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (retryErr) {
            console.error(`[Storage] LocalStorage setItem failed after emergency relief for key "${key}":`, retryErr);
            return false;
        }
    }
};

/**
 * 安全保存影片列表至 LocalStorage（自动剔除 Base64 并防范 QuotaExceededError）
 */
export const safeSaveMoviesToLocalStorage = (movies: Movie[]): boolean => {
    if (typeof window === 'undefined' || !window.localStorage) return false;

    // 确保把所有内存中的 Base64 同步暂存至 IndexedDB
    movies.forEach(m => {
        if (m.posterImage && m.posterImage.startsWith('data:image/')) {
            savePoster(m.id, m.posterImage).catch(() => {});
        }
    });

    const leanMovies = stripBase64FromMovies(movies);
    const serialized = JSON.stringify(leanMovies);

    return safeSetItem(STORAGE_KEY, serialized);
};

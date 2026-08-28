/**
 * 统计计算工具函数
 * 提取自 Stats.tsx，用于单元测试
 */

import { Movie, MovieStatus } from '../types';
import { normalizeTitle } from './titleNormalizer';

export interface WatchTimeStats {
    movieDuration: number;      // 电影总观影时长（分钟）
    tvDuration: number;         // 电视剧总观影时长（分钟）
    totalMinutes: number;       // 总观影时长（分钟）
    totalEpisodesWatched: number; // 累计追剧集数
}

/**
 * 计算电影的观影时长
 * 优先使用 actualWatchTime（已考虑倍速），否则回退到原始 duration
 */
export function calculateMovieDuration(movies: Movie[]): number {
    return movies.reduce((sum, m) => {
        // 跳过"想看"条目 - 还没观看不产生时长
        if (m.status === MovieStatus.PLANNING) return sum;
        if (!m.mediaType || m.mediaType === 'movie') {
            if (m.actualWatchTime !== undefined) {
                return sum + m.actualWatchTime;
            }
            const duration = m.duration || 0;
            const speed = m.playbackSpeed || 1.0;
            return sum + Math.round(duration / speed);
        }
        return sum;
    }, 0);
}

export interface TimeFilterOptions {
    timeFrame?: 'all' | 'year' | 'month';
    selectedYear?: string;
    selectedMonth?: string;
}

/**
 * 计算电视剧的观影时长
 * 优先使用 actualWatchTime（已考虑倍速），否则按 集数 * 单集时长 回退
 * 支持传入 allMovies 作为全局上下文以处理跨时间段统计增量，支持 timeFilter 进行精确时间范围打卡统计
 */
export function calculateTvDuration(
    movies: Movie[],
    allMovies?: Movie[],
    timeFilter?: TimeFilterOptions
): number {
    const contextMovies = allMovies || movies;
    const activeMovieIds = new Set(movies.map(m => m.id));
    const tf = timeFilter?.timeFrame || 'all';

    const tvEntries = contextMovies.filter(m => m.mediaType === 'tv' && m.status !== MovieStatus.PLANNING);

    // Group by title and iteration to handle duplicate records and rewatches for the same show
    const tvGroups = new Map<string, Movie[]>();
    for (const m of tvEntries) {
        const key = `${normalizeTitle(m.title)}-iteration-${m.watchIteration || 1}`;
        if (!tvGroups.has(key)) {
            tvGroups.set(key, []);
        }
        tvGroups.get(key)!.push(m);
    }

    let totalDuration = 0;

    for (const entries of tvGroups.values()) {
        const hasHistory = entries.some(m => m.watchHistory && m.watchHistory.length > 0);

        if (tf !== 'all' && hasHistory) {
            // Precise watchHistory log duration for the specific month/year
            for (const m of entries) {
                if (activeMovieIds.has(m.id) && m.watchHistory) {
                    const matchingLogs = m.watchHistory.filter(log => {
                        const d = new Date(log.date);
                        if (tf === 'year') {
                            return d.getFullYear().toString() === timeFilter?.selectedYear;
                        }
                        if (tf === 'month') {
                            const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                            return ym === timeFilter?.selectedMonth;
                        }
                        return true;
                    });

                    if (matchingLogs.length > 0) {
                        const dur = m.duration || 0;
                        const defaultSpeed = m.playbackSpeed || 1.0;
                        const logDuration = matchingLogs.reduce((sum, log) => {
                            const speed = log.playbackSpeed || defaultSpeed;
                            return sum + (dur / speed);
                        }, 0);
                        totalDuration += logDuration;
                    }
                }
            }
        } else {
            // Sort by episode number and addedAt to calculate stable incremental progress
            entries.sort((a, b) => {
                const epDiff = (a.currentEpisode || 0) - (b.currentEpisode || 0);
                if (epDiff !== 0) return epDiff;
                return (a.addedAt || 0) - (b.addedAt || 0);
            });

            let lastMaxEpisode = 0;

            for (const m of entries) {
                const currentEp = m.currentEpisode || 0;

                // Handle records with no episode number (Specials, Movies marked as TV, or miscellaneous)
                if (currentEp === 0) {
                    if (activeMovieIds.has(m.id)) {
                        totalDuration += m.actualWatchTime !== undefined ? m.actualWatchTime : (m.duration || 0);
                    }
                    continue;
                }

                // Only count "new" episodes that haven't been counted yet
                const deltaEpisodes = Math.max(0, currentEp - lastMaxEpisode);

                if (deltaEpisodes > 0) {
                    if (activeMovieIds.has(m.id)) {
                        let segmentDuration = 0;

                        if (m.actualWatchTime !== undefined) {
                            const avgTimePerEp = currentEp > 0 ? (m.actualWatchTime / currentEp) : 0;
                            segmentDuration = deltaEpisodes * avgTimePerEp;
                        } else {
                            const dur = m.duration || 0;
                            const speed = m.playbackSpeed || 1.0;
                            segmentDuration = deltaEpisodes * (dur / speed);
                        }

                        totalDuration += segmentDuration;
                    }
                    lastMaxEpisode = currentEp;
                }
            }
        }
    }

    return Math.round(totalDuration);
}

/**
 * 计算电视剧累计追剧集数（支持传入 allMovies 作为全局上下文以处理跨时间段统计增量，支持 timeFilter）
 */
export function calculateTotalEpisodes(
    movies: Movie[],
    allMovies?: Movie[],
    timeFilter?: TimeFilterOptions
): number {
    const contextMovies = allMovies || movies;
    const activeMovieIds = new Set(movies.map(m => m.id));
    const tf = timeFilter?.timeFrame || 'all';

    const tvEntries = contextMovies.filter(m => m.mediaType === 'tv' && m.status !== MovieStatus.PLANNING);

    // Group by title and iteration to handle duplicate records and rewatches for the same show
    const tvGroups = new Map<string, Movie[]>();
    for (const m of tvEntries) {
        const key = `${normalizeTitle(m.title)}-iteration-${m.watchIteration || 1}`;
        if (!tvGroups.has(key)) {
            tvGroups.set(key, []);
        }
        tvGroups.get(key)!.push(m);
    }

    let totalEpisodes = 0;

    for (const entries of tvGroups.values()) {
        const hasHistory = entries.some(m => m.watchHistory && m.watchHistory.length > 0);

        if (tf !== 'all' && hasHistory) {
            for (const m of entries) {
                if (activeMovieIds.has(m.id) && m.watchHistory) {
                    const matchingLogs = m.watchHistory.filter(log => {
                        const d = new Date(log.date);
                        if (tf === 'year') {
                            return d.getFullYear().toString() === timeFilter?.selectedYear;
                        }
                        if (tf === 'month') {
                            const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                            return ym === timeFilter?.selectedMonth;
                        }
                        return true;
                    });
                    totalEpisodes += matchingLogs.length;
                }
            }
        } else {
            // Sort to calculate incremental progression
            entries.sort((a, b) => {
                const epDiff = (a.currentEpisode || 0) - (b.currentEpisode || 0);
                if (epDiff !== 0) return epDiff;
                return (a.addedAt || 0) - (b.addedAt || 0);
            });

            let lastMaxEpisode = 0;

            for (const m of entries) {
                const currentEp = m.currentEpisode || 0;
                const deltaEpisodes = Math.max(0, currentEp - lastMaxEpisode);

                if (deltaEpisodes > 0) {
                    if (activeMovieIds.has(m.id)) {
                        totalEpisodes += deltaEpisodes;
                    }
                    lastMaxEpisode = currentEp;
                }
            }
        }
    }

    return totalEpisodes;
}

/**
 * 计算所有观影时长统计
 */
export function calculateWatchTimeStats(movies: Movie[], allMovies?: Movie[]): WatchTimeStats {
    const movieDuration = calculateMovieDuration(movies);
    const tvDuration = calculateTvDuration(movies, allMovies);
    const totalMinutes = movieDuration + tvDuration;
    const totalEpisodesWatched = calculateTotalEpisodes(movies, allMovies);

    return {
        movieDuration,
        tvDuration,
        totalMinutes,
        totalEpisodesWatched
    };
}

/**
 * 计算实际观影时长（考虑倍速）
 * @param duration 原始时长（电影总时长 或 电视剧单集时长）
 * @param speed 播放倍速
 * @param episodes 观看集数（仅电视剧）
 * @param mediaType 媒体类型
 */
export function calculateActualWatchTime(
    duration: number,
    speed: number,
    episodes: number = 1,
    mediaType: 'movie' | 'tv' = 'movie'
): number {
    if (speed <= 0) speed = 1;

    if (mediaType === 'tv') {
        return Math.round((episodes * duration) / speed);
    }
    return Math.round(duration / speed);
}

/**
 * 格式化时长为 { hours, minutes } 格式
 */
export function formatDuration(totalMinutes: number): { hours: number; minutes: number } {
    return {
        hours: Math.floor(totalMinutes / 60),
        minutes: totalMinutes % 60
    };
}

/**
 * 根据历史观影记录，推荐下一轮的观影轮次
 */
export function getRecommendedIteration(
    movieTitle: string,
    mediaType: 'movie' | 'tv',
    existingMovies: Movie[],
    excludeId?: string
): string {
    if (!movieTitle.trim()) return '1';
    const norm = normalizeTitle(movieTitle);

    if (mediaType === 'tv') {
        const tvRecords = existingMovies.filter(m =>
            normalizeTitle(m.title) === norm &&
            (m.mediaType || 'movie') === 'tv' &&
            m.id !== excludeId
        );

        if (tvRecords.length === 0) return '1';

        // 获取历史记录中的最大刷数
        const maxIteration = tvRecords.reduce((max, m) => {
            return Math.max(max, m.watchIteration || 1);
        }, 1);

        // 检查该最大刷数是否已经完结（即存在 status === WATCHED 的记录）
        const isMaxIterationCompleted = tvRecords.some(m =>
            (m.watchIteration || 1) === maxIteration &&
            m.status === MovieStatus.WATCHED
        );

        const recommended = isMaxIterationCompleted ? maxIteration + 1 : maxIteration;
        return recommended.toString();
    } else {
        const movieRecords = existingMovies.filter(m =>
            normalizeTitle(m.title) === norm &&
            (m.mediaType || 'movie') === 'movie' &&
            m.id !== excludeId
        );

        const watchedCount = movieRecords.filter(m => m.status === MovieStatus.WATCHED).length;

        const maxIteration = movieRecords.reduce((max, m) => {
            return Math.max(max, m.watchIteration || 1);
        }, 0);

        const recommended = Math.max(watchedCount, maxIteration) + 1;
        return recommended.toString();
    }
}

/**
 * 电视剧继续追剧还是开启新一刷的集数与状态计算
 */
export interface TvInheritedHabits {
    currentEpisode: string;
    status: MovieStatus;
}

export function calculateTvInheritedHabits(
    lastEpisode: number,
    totalEpisodes: number,
    lastIteration: number,
    recommendedIteration: number
): TvInheritedHabits {
    if (recommendedIteration > lastIteration) {
        return {
            currentEpisode: '0',
            status: MovieStatus.WATCHING
        };
    }
    
    const nextEp = lastEpisode + 1;
    const currentEpisode = totalEpisodes > 0 ? Math.min(nextEp, totalEpisodes).toString() : nextEp.toString();
    const status = totalEpisodes > 0 && nextEp >= totalEpisodes ? MovieStatus.WATCHED : MovieStatus.WATCHING;

    return {
        currentEpisode,
        status
    };
}

/**
 * 计算重温最多的作品 (重温之王)
 */
export function calculateRewatchKing(movies: Movie[]): { title: string; iteration: number } | null {
    const rewatchMap = new Map<string, { title: string; maxIteration: number }>();

    movies.forEach(m => {
        if (m.status === MovieStatus.PLANNING) return;
        const key = `${normalizeTitle(m.title)}-${m.mediaType || 'movie'}`;
        const iteration = m.watchIteration || 1;
        const existing = rewatchMap.get(key);
        if (!existing || iteration > existing.maxIteration) {
            rewatchMap.set(key, { title: m.title, maxIteration: iteration });
        }
    });

    const rewatchList = Array.from(rewatchMap.values())
        .filter(item => item.maxIteration > 1)
        .sort((a, b) => b.maxIteration - a.maxIteration);

    return rewatchList.length > 0 ? { title: rewatchList[0].title, iteration: rewatchList[0].maxIteration } : null;
}

/**
 * 计算最高倍速记录 (倍速狂人)
 */
export function calculateSpeedDemon(movies: Movie[]): { title: string; speed: number } | null {
    const activeRecords = movies.filter(m => m.status !== MovieStatus.PLANNING);
    const maxSpeedRecord = activeRecords.reduce((max, m) => {
        const speed = m.playbackSpeed || 1.0;
        const maxSpeed = max?.playbackSpeed || 1.0;
        return speed > maxSpeed ? m : max;
    }, null as Movie | null);

    return maxSpeedRecord && (maxSpeedRecord.playbackSpeed || 1.0) > 1.0
        ? { title: maxSpeedRecord.title, speed: maxSpeedRecord.playbackSpeed || 1.0 }
        : null;
}

/**
 * 计算影评人设
 */
export function calculateJudgePersona(movies: Movie[]): string {
    const rated = movies.filter(m => m.rating > 0);
    if (rated.length === 0) return '暂无评分';

    const avg = rated.reduce((acc, m) => acc + m.rating, 0) / rated.length;
    if (avg >= 4.2) return '慷慨看客 💖';
    if (avg <= 3.0) return '冷酷判官 🧐';
    return '理性影迷 ⚖️';
}



/**
 * 统计计算工具函数
 * 提取自 Stats.tsx，用于单元测试
 */

import { Movie } from '../types';
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
        if (!m.mediaType || m.mediaType === 'movie') {
            if (m.actualWatchTime !== undefined) {
                return sum + m.actualWatchTime;
            }
            return sum + (m.duration || 0);
        }
        return sum;
    }, 0);
}

/**
 * 计算电视剧的观影时长
 * 优先使用 actualWatchTime（已考虑倍速），否则按 集数 * 单集时长 回退
 */
export function calculateTvDuration(movies: Movie[]): number {
    const tvEntries = movies.filter(m => m.mediaType === 'tv');

    // Group by title to handle duplicate records for the same show
    const tvGroups = new Map<string, Movie[]>();
    for (const m of tvEntries) {
        const title = normalizeTitle(m.title);
        if (!tvGroups.has(title)) {
            tvGroups.set(title, []);
        }
        tvGroups.get(title)!.push(m);
    }

    let totalDuration = 0;

    for (const entries of tvGroups.values()) {
        // Sort by episode number to calculate incremental progress
        entries.sort((a, b) => (a.currentEpisode || 0) - (b.currentEpisode || 0));

        let lastMaxEpisode = 0;

        for (const m of entries) {
            const currentEp = m.currentEpisode || 0;

            // Handle records with no episode number (Specials, Movies marked as TV, or miscellaneous)
            // Treat them as standalone additions and do not update progression state
            if (currentEp === 0) {
                totalDuration += m.actualWatchTime !== undefined ? m.actualWatchTime : (m.duration || 0);
                continue;
            }

            // Only count "new" episodes that haven't been counted yet
            const deltaEpisodes = Math.max(0, currentEp - lastMaxEpisode);

            if (deltaEpisodes > 0) {
                let segmentDuration = 0;

                // Calculate duration contribution for the delta episodes
                if (m.actualWatchTime !== undefined) {
                    // actualWatchTime is typically cumulative for currentEpisode.
                    // Derive average time per episode for this record
                    const avgTimePerEp = currentEp > 0 ? (m.actualWatchTime / currentEp) : 0;
                    segmentDuration = deltaEpisodes * avgTimePerEp;
                } else {
                    // Fallback using duration (assumes duration is per episode)
                    const dur = m.duration || 0;
                    segmentDuration = deltaEpisodes * dur;
                }

                totalDuration += segmentDuration;
                lastMaxEpisode = currentEp;
            }
        }
    }

    return Math.round(totalDuration);
}

/**
 * 计算电视剧累计追剧集数（按剧名去重，取最大集数）
 */
export function calculateTotalEpisodes(movies: Movie[]): number {
    const tvEntries = movies.filter(m => m.mediaType === 'tv');
    const tvEpMap = new Map<string, number>();

    tvEntries.forEach(m => {
        const title = normalizeTitle(m.title);
        const ep = m.currentEpisode || 0;
        const existing = tvEpMap.get(title) || 0;
        tvEpMap.set(title, Math.max(existing, ep));
    });

    return Array.from(tvEpMap.values()).reduce((sum, ep) => sum + ep, 0);
}

/**
 * 计算所有观影时长统计
 */
export function calculateWatchTimeStats(movies: Movie[]): WatchTimeStats {
    const movieDuration = calculateMovieDuration(movies);
    const tvDuration = calculateTvDuration(movies);
    const totalMinutes = movieDuration + tvDuration;
    const totalEpisodesWatched = calculateTotalEpisodes(movies);

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

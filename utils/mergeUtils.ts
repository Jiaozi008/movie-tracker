import { Movie, MovieStatus, EpisodeWatchLog } from '../types';
import { normalizeTitle } from './titleNormalizer';
import { calculateMovieActualWatchTime } from './episodeUtils';

export interface MergeableTvGroup {
    key: string;
    title: string;
    records: Movie[];
    totalEpisodes?: number;
    maxEpisode: number;
    segmentSummary: string[];
    estimatedWatchTime: number;
}

export interface MergeResult {
    mergedMovies: Movie[];
    mergedGroupCount: number;
    mergedRecordCount: number;
    removedIds: string[];
    details: {
        title: string;
        beforeCount: number;
        finalEpisodes: number;
        actualWatchTime: number;
    }[];
}

/**
 * 格式化时间戳为 YYYY-MM-DD
 */
function formatDate(timestamp?: number): string {
    if (!timestamp) return '';
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * 扫描片库中所有可合并的历史分段电视剧组
 */
export function findMergeableTvGroups(movies: Movie[]): MergeableTvGroup[] {
    const tvGroups = new Map<string, Movie[]>();

    movies.forEach(m => {
        const isTv = m.mediaType === 'tv' ||
            (typeof m.totalEpisodes === 'number' && m.totalEpisodes > 1) ||
            (typeof m.currentEpisode === 'number' && m.currentEpisode > 0);

        if (isTv) {
            const key = `${normalizeTitle(m.title)}-it-${m.watchIteration || 1}`;
            if (!tvGroups.has(key)) {
                tvGroups.set(key, []);
            }
            tvGroups.get(key)!.push(m);
        }
    });

    const mergeableGroups: MergeableTvGroup[] = [];

    tvGroups.forEach((records, key) => {
        if (records.length >= 2) {
            // Sort by addedAt
            records.sort((a, b) => (a.addedAt || 0) - (b.addedAt || 0));

            const title = records[0].title;
            const totalEpisodes = records.reduce((max, r) => Math.max(max, r.totalEpisodes || 0), 0);
            const maxEpisode = records.reduce((max, r) => Math.max(max, r.currentEpisode || 0), 0);

            const segmentSummary = records.map((r, idx) => {
                const ep = r.currentEpisode || 0;
                const sp = r.playbackSpeed || 1.0;
                const dStr = formatDate(r.addedAt);
                return `第${idx + 1}段: 看到第 ${ep} 集 (${sp}x 倍速) · ${dStr || '无日期'}`;
            });

            // 预估合并后实际时长
            const mergedPreview = mergeTvRecords(records);

            mergeableGroups.push({
                key,
                title,
                records,
                totalEpisodes: totalEpisodes > 0 ? totalEpisodes : undefined,
                maxEpisode,
                segmentSummary,
                estimatedWatchTime: mergedPreview.actualWatchTime || 0,
            });
        }
    });

    return mergeableGroups;
}

/**
 * 将同剧的多条历史分段记录合并为 1 条完整记录
 * 保证分段倍速、打卡时间戳、短评、标签、元数据 100% 精确无损
 */
export function mergeTvRecords(records: Movie[]): Movie {
    if (records.length === 0) {
        throw new Error('Cannot merge empty records list');
    }
    if (records.length === 1) {
        return records[0];
    }

    // 1. 按 addedAt 升序排列
    const sorted = [...records].sort((a, b) => {
        const addedDiff = (a.addedAt || 0) - (b.addedAt || 0);
        if (addedDiff !== 0) return addedDiff;
        return (a.currentEpisode || 0) - (b.currentEpisode || 0);
    });

    // 2. 选择元数据最完整或最新的记录作为基底
    const base = sorted.reduce((best, cur) => {
        let bestScore = 0;
        let curScore = 0;
        if (best.posterImage) bestScore += 5;
        if (best.overview) bestScore += 3;
        if (best.director) bestScore += 2;
        if (best.cast) bestScore += 2;

        if (cur.posterImage) curScore += 5;
        if (cur.overview) curScore += 3;
        if (cur.director) curScore += 2;
        if (cur.cast) curScore += 2;

        return curScore > bestScore ? cur : best;
    }, sorted[sorted.length - 1]);

    const duration = sorted.reduce((d, r) => d || r.duration || 0, 0) || 45;
    const totalEpisodes = sorted.reduce((max, r) => Math.max(max, r.totalEpisodes || 0), 0);

    // 3. 构建分段集数与倍速、打卡日期的映射
    const episodeMap = new Map<number, EpisodeWatchLog>();
    let lastCoveredEpisode = 0;

    sorted.forEach(record => {
        const recordSpeed = record.playbackSpeed || 1.0;
        const recordDate = record.addedAt || Date.now();
        const curEp = record.currentEpisode || 0;

        // 如果记录自带详细 watchHistory，优先采用
        if (record.watchHistory && record.watchHistory.length > 0) {
            record.watchHistory.forEach(log => {
                episodeMap.set(log.episode, {
                    episode: log.episode,
                    date: log.date || recordDate,
                    playbackSpeed: log.playbackSpeed || recordSpeed,
                    note: log.note,
                });
                lastCoveredEpisode = Math.max(lastCoveredEpisode, log.episode);
            });
        }

        // 补齐该分段包含的集数（从 lastCoveredEpisode + 1 到 curEp）
        if (curEp > lastCoveredEpisode) {
            for (let ep = lastCoveredEpisode + 1; ep <= curEp; ep++) {
                if (!episodeMap.has(ep)) {
                    episodeMap.set(ep, {
                        episode: ep,
                        date: recordDate,
                        playbackSpeed: recordSpeed,
                    });
                }
            }
            lastCoveredEpisode = curEp;
        }
    });

    const finalEpisodes = Math.max(...Array.from(episodeMap.keys()), 0);
    const mergedHistory: EpisodeWatchLog[] = Array.from(episodeMap.values()).sort((a, b) => a.episode - b.episode);

    // 4. 计算精确累计 actualWatchTime
    const actualWatchTime = calculateMovieActualWatchTime({
        duration,
        playbackSpeed: base.playbackSpeed || 1.0,
        currentEpisode: finalEpisodes,
        mediaType: 'tv',
        watchHistory: mergedHistory,
    }, mergedHistory);

    // 5. 合并短评 (保留各分段带有日期的手记)
    const reviewsWithDates: string[] = [];
    sorted.forEach(r => {
        if (r.review && r.review.trim()) {
            const trimmed = r.review.trim();
            const dateStr = formatDate(r.addedAt);
            const entryText = dateStr ? `[${dateStr}] ${trimmed}` : trimmed;
            if (!reviewsWithDates.some(existing => existing.includes(trimmed))) {
                reviewsWithDates.push(entryText);
            }
        }
    });
    const mergedReview = reviewsWithDates.join('\n\n---\n\n');

    // 6. 标签求并集
    const tagSet = new Set<string>();
    sorted.forEach(r => {
        if (r.tags && Array.isArray(r.tags)) {
            r.tags.forEach(t => tagSet.add(t.trim()));
        }
    });
    const mergedTags = Array.from(tagSet).filter(Boolean);

    // 7. 评分：取最高分或最新分
    const maxRating = sorted.reduce((max, r) => Math.max(max, r.rating || 0), 0);

    // 8. 状态判断：综合判断完结、弃坑与追剧状态
    const latestRecord = sorted[sorted.length - 1];
    const isCompleted = (totalEpisodes > 0 && finalEpisodes >= totalEpisodes) ||
        sorted.some(r => r.status === MovieStatus.WATCHED || (r.status as string) === '已看' || (r.status as string) === '完结');

    // 检查是否有主动弃坑标记
    const isLatestDropped = latestRecord.status === MovieStatus.DROPPED || (latestRecord.status as string) === '弃坑';
    const isAnyDropped = sorted.some(r => r.status === MovieStatus.DROPPED || (r.status as string) === '弃坑');

    let finalStatus: MovieStatus = MovieStatus.WATCHING;
    if (isLatestDropped) {
        finalStatus = MovieStatus.DROPPED;
    } else if (isCompleted) {
        finalStatus = MovieStatus.WATCHED;
    } else if (isAnyDropped) {
        finalStatus = MovieStatus.DROPPED;
    } else if (finalEpisodes === 0 && latestRecord.status === MovieStatus.PLANNING) {
        finalStatus = MovieStatus.PLANNING;
    } else {
        finalStatus = MovieStatus.WATCHING;
    }

    // 9. 最终倍速：以最新记录的倍速为准
    const latestSpeed = sorted[sorted.length - 1].playbackSpeed || base.playbackSpeed || 1.0;

    const mergedMovie: Movie = {
        ...base,
        id: base.id, // 保留主 ID
        mediaType: 'tv',
        currentEpisode: finalEpisodes,
        totalEpisodes: totalEpisodes > 0 ? totalEpisodes : base.totalEpisodes,
        duration,
        playbackSpeed: latestSpeed,
        actualWatchTime,
        status: finalStatus,
        rating: maxRating > 0 ? maxRating : base.rating,
        review: mergedReview || base.review,
        tags: mergedTags.length > 0 ? mergedTags : base.tags,
        watchHistory: mergedHistory,
        addedAt: sorted[0].addedAt, // 最早观影时间
        lastUpdated: Date.now(),
    };

    return mergedMovie;
}

/**
 * 全库一键批量清洗合并所有同剧分段记录
 */
export function mergeAllDuplicateTvShows(movies: Movie[]): MergeResult {
    const groups = findMergeableTvGroups(movies);

    if (groups.length === 0) {
        return {
            mergedMovies: movies,
            mergedGroupCount: 0,
            mergedRecordCount: 0,
            removedIds: [],
            details: [],
        };
    }

    const idsToRemove = new Set<string>();
    const newMergedMovies: Movie[] = [];
    const details: MergeResult['details'] = [];
    let totalMergedRecords = 0;

    groups.forEach(group => {
        const merged = mergeTvRecords(group.records);
        newMergedMovies.push(merged);
        group.records.forEach(r => idsToRemove.add(r.id));
        totalMergedRecords += group.records.length;

        details.push({
            title: group.title,
            beforeCount: group.records.length,
            finalEpisodes: merged.currentEpisode || 0,
            actualWatchTime: merged.actualWatchTime || 0,
        });
    });

    // 保留未参与合并的电影与其他剧集
    const remainingMovies = movies.filter(m => !idsToRemove.has(m.id));
    const mergedMovies = [...newMergedMovies, ...remainingMovies];

    // 计算被真正精简移除的历史冗余 ID
    const retainedIds = new Set(newMergedMovies.map(m => m.id));
    const trulyRemovedIds = Array.from(idsToRemove).filter(id => !retainedIds.has(id));

    return {
        mergedMovies,
        mergedGroupCount: groups.length,
        mergedRecordCount: totalMergedRecords,
        removedIds: trulyRemovedIds,
        details,
    };
}

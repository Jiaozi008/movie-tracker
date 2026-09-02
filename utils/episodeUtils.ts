import { Movie, MovieStatus, EpisodeWatchLog } from '../types';
import { formatLocalDateKey, formatRelativeWatchDate } from './dateUtils';

export { formatRelativeWatchDate };

export interface EpisodeUpdateResult {
    updatedMovie: Movie;
    isCompleted: boolean;
    message: string;
}

export interface DailyWatchHistoryGroup {
    startEp: number;
    endEp: number;
    date: number; // 该组最新打卡时间戳
    playbackSpeed?: number;
    count: number;
    note?: string;
}

/**
 * 智能聚合同一天内连续观看的单集打卡记录
 * 示例：当天连续打卡第1、2、3集 -> 自动聚类为 第1-3集
 */
export function clusterWatchHistoryByDay(history?: EpisodeWatchLog[]): DailyWatchHistoryGroup[] {
    if (!history || history.length === 0) return [];

    const groups: DailyWatchHistoryGroup[] = [];
    let current: DailyWatchHistoryGroup | null = null;
    let currentDayKey = '';

    for (const log of history) {
        const dayKey = formatLocalDateKey(log.date);
        const speed = log.playbackSpeed || 1.0;

        if (!current) {
            current = {
                startEp: log.episode,
                endEp: log.episode,
                date: log.date,
                playbackSpeed: speed,
                count: 1,
                note: log.note
            };
            currentDayKey = dayKey;
        } else {
            const isSameDay = dayKey === currentDayKey;
            const isConsecutive = log.episode === current.endEp + 1;
            const isSameSpeed = (log.playbackSpeed || 1.0) === (current.playbackSpeed || 1.0);

            if (isSameDay && isConsecutive && isSameSpeed) {
                current.endEp = log.episode;
                current.date = log.date;
                current.count += 1;
                if (log.note) current.note = log.note;
            } else {
                groups.push(current);
                current = {
                    startEp: log.episode,
                    endEp: log.episode,
                    date: log.date,
                    playbackSpeed: speed,
                    count: 1,
                    note: log.note
                };
                currentDayKey = dayKey;
            }
        }
    }

    if (current) {
        groups.push(current);
    }

    return groups;
}

/**
 * 依据单集流水中的独立倍速精确计算总实际观影时长
 */
export function calculateMovieActualWatchTime(
    movie: { duration?: number; playbackSpeed?: number; currentEpisode?: number; mediaType?: string; watchHistory?: EpisodeWatchLog[] },
    history?: EpisodeWatchLog[]
): number {
    const logs = history !== undefined ? history : movie.watchHistory;
    const duration = movie.duration || 0;
    const defaultSpeed = movie.playbackSpeed || 1.0;

    if (movie.mediaType === 'movie') {
        return Math.round(duration / defaultSpeed);
    }

    if (logs && logs.length > 0) {
        return Math.round(
            logs.reduce((sum, log) => {
                const speed = log.playbackSpeed || defaultSpeed;
                return sum + (duration / speed);
            }, 0)
        );
    }

    const eps = movie.currentEpisode || 0;
    return Math.round((eps * duration) / defaultSpeed);
}

/**
 * 智能计算剧集打卡变化 (+1 或 -1)
 * 包含观看历史流水追加、每集独立倍速记录、时间戳刷新、自动完结流转保护
 */
export function calculateEpisodeUpdate(
    movie: Movie,
    delta: 1 | -1
): EpisodeUpdateResult | null {
    if (movie.mediaType !== 'tv') return null;

    const current = movie.currentEpisode || 0;
    const total = movie.totalEpisodes || 0;
    const currentSpeed = movie.playbackSpeed || 1.0;
    const now = Date.now();

    if (delta === 1) {
        if (total > 0 && current >= total) {
            return {
                updatedMovie: movie,
                isCompleted: true,
                message: `《${movie.title}》已追完全部 ${total} 集`
            };
        }

        const nextEp = current + 1;
        const isCompleted = total > 0 && nextEp >= total;

        // 智能保障：若之前没有历史流水或历史长度小于当前集数，以 addedAt 时间与当前倍速自动补齐前序集数底账
        const existingHistory: EpisodeWatchLog[] = (movie.watchHistory && movie.watchHistory.length > 0)
            ? movie.watchHistory.slice(0, current)
            : Array.from({ length: current }, (_, i) => ({
                episode: i + 1,
                date: movie.addedAt || now,
                playbackSpeed: currentSpeed
            }));

        if (existingHistory.length < current) {
            const padCount = current - existingHistory.length;
            for (let i = 0; i < padCount; i++) {
                existingHistory.push({
                    episode: existingHistory.length + 1,
                    date: movie.addedAt || now,
                    playbackSpeed: currentSpeed
                });
            }
        }

        const newLog: EpisodeWatchLog = {
            episode: nextEp,
            date: now,
            playbackSpeed: currentSpeed
        };
        const newHistory = [...existingHistory, newLog];
        const actualWatchTime = calculateMovieActualWatchTime(movie, newHistory);

        const updatedMovie: Movie = {
            ...movie,
            currentEpisode: nextEp,
            actualWatchTime,
            status: isCompleted ? MovieStatus.WATCHED : (movie.status === MovieStatus.PLANNING ? MovieStatus.WATCHING : movie.status),
            lastUpdated: now,
            watchHistory: newHistory
        };

        const todayGroups = clusterWatchHistoryByDay(newHistory);
        const lastGroup = todayGroups.length > 0 ? todayGroups[todayGroups.length - 1] : null;
        const rangeText = (lastGroup && lastGroup.startEp < lastGroup.endEp)
            ? `（今日已打卡第 ${lastGroup.startEp}-${lastGroup.endEp} 集）`
            : '';

        return {
            updatedMovie,
            isCompleted,
            message: isCompleted
                ? `🎉 恭喜！《${movie.title}》已全剧完结打卡（${nextEp}/${total} 集）`
                : `《${movie.title}》已打卡至第 ${nextEp} 集 ${rangeText}`.trim()
        };
    } else {
        if (current <= 0) return null;

        const prevEp = current - 1;

        const existingHistory: EpisodeWatchLog[] = (movie.watchHistory && movie.watchHistory.length > 0)
            ? movie.watchHistory.slice(0, current)
            : Array.from({ length: current }, (_, i) => ({
                episode: i + 1,
                date: movie.addedAt || now,
                playbackSpeed: currentSpeed
            }));

        if (existingHistory.length > 0) {
            existingHistory.pop();
        }

        const actualWatchTime = calculateMovieActualWatchTime(movie, existingHistory);

        const updatedMovie: Movie = {
            ...movie,
            currentEpisode: prevEp,
            actualWatchTime,
            status: movie.status === MovieStatus.WATCHED && total > 0 && prevEp < total ? MovieStatus.WATCHING : movie.status,
            lastUpdated: now,
            watchHistory: existingHistory
        };

        return {
            updatedMovie,
            isCompleted: false,
            message: `《${movie.title}》已调整至第 ${prevEp} 集`
        };
    }
}

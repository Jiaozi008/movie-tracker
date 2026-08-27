import { Movie, MovieStatus, EpisodeWatchLog } from '../types';

export interface EpisodeUpdateResult {
    updatedMovie: Movie;
    isCompleted: boolean;
    message: string;
}

/**
 * 智能计算剧集打卡变化 (+1 或 -1)
 * 包含观看历史流水追加、时间戳刷新、自动完结流转保护
 */
export function calculateEpisodeUpdate(
    movie: Movie,
    delta: 1 | -1
): EpisodeUpdateResult | null {
    if (movie.mediaType !== 'tv') return null;

    const current = movie.currentEpisode || 0;
    const total = movie.totalEpisodes || 0;

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
        const now = Date.now();

        // 智能保障：若之前没有历史流水或历史长度小于当前集数，以 addedAt 时间自动补齐前序集数底账
        const existingHistory: EpisodeWatchLog[] = (movie.watchHistory && movie.watchHistory.length > 0)
            ? [...movie.watchHistory]
            : Array.from({ length: current }, (_, i) => ({
                episode: i + 1,
                date: movie.addedAt || now
            }));

        if (existingHistory.length < current) {
            const padCount = current - existingHistory.length;
            for (let i = 0; i < padCount; i++) {
                existingHistory.push({
                    episode: existingHistory.length + 1,
                    date: movie.addedAt || now
                });
            }
        }

        const newLog: EpisodeWatchLog = { episode: nextEp, date: now };
        const newHistory = [...existingHistory, newLog];

        const actualSpeed = movie.playbackSpeed || 1.0;
        const duration = movie.duration || 0;
        const actualWatchTime = Math.round((nextEp * duration) / actualSpeed);

        const updatedMovie: Movie = {
            ...movie,
            currentEpisode: nextEp,
            actualWatchTime,
            status: isCompleted ? MovieStatus.WATCHED : (movie.status === MovieStatus.PLANNING ? MovieStatus.WATCHING : movie.status),
            lastUpdated: now,
            watchHistory: newHistory
        };

        return {
            updatedMovie,
            isCompleted,
            message: isCompleted
                ? `🎉 恭喜！《${movie.title}》已全剧完结打卡（${nextEp}/${total} 集）`
                : `《${movie.title}》已打卡至第 ${nextEp} 集`
        };
    } else {
        if (current <= 0) return null;

        const prevEp = current - 1;
        const now = Date.now();

        const existingHistory: EpisodeWatchLog[] = (movie.watchHistory && movie.watchHistory.length > 0)
            ? [...movie.watchHistory]
            : Array.from({ length: current }, (_, i) => ({
                episode: i + 1,
                date: movie.addedAt || now
            }));

        if (existingHistory.length > 0) {
            existingHistory.pop();
        }

        const actualSpeed = movie.playbackSpeed || 1.0;
        const duration = movie.duration || 0;
        const actualWatchTime = Math.round((prevEp * duration) / actualSpeed);

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

/**
 * 格式化最近打卡友好时间（刚刚、X分钟前、今天 12:30、8月26日）
 */
export function formatRelativeWatchDate(timestamp?: number): string {
    if (!timestamp) return '';
    const now = new Date();
    const date = new Date(timestamp);

    if (isNaN(date.getTime())) return '';

    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);

    if (diffMinutes < 1) return '刚刚';
    if (diffMinutes < 60) return `${diffMinutes} 分钟前`;

    const isToday = date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth() &&
        date.getDate() === now.getDate();

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.getFullYear() === yesterday.getFullYear() &&
        date.getMonth() === yesterday.getMonth() &&
        date.getDate() === yesterday.getDate();

    const timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

    if (isToday) return `今天 ${timeStr}`;
    if (isYesterday) return `昨天 ${timeStr}`;

    return `${date.getMonth() + 1}月${date.getDate()}日`;
}

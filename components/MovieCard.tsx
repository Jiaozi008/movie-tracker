
import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Movie, MovieStatus } from '../types';
import { StarRating } from './StarRating';
import { Trash2, Edit2, Calendar, Tv, Film, Check, ChevronDown, ChevronUp, User, Users, Tag, Trophy, Clock, Monitor, Share2, Plus, Minus, CheckCircle2, Copy, Star, FileText, Quote, Sparkles, Flame, Zap, X } from 'lucide-react';
import { ShareCard } from './ShareCard';
import { normalizeTitle } from '../utils/titleNormalizer';
import { safeFormatDate, formatRelativeWatchDate } from '../utils/dateUtils';
import { clusterWatchHistoryByDay } from '../utils/episodeUtils';
import { exportMovieToMarkdown } from '../utils/markdownArchiveUtils';

interface MovieCardProps {
    movie: Movie;
    allMovies?: Movie[];
    onEdit: (movie: Movie) => void;
    onDelete: (id: string) => void;
    onQuickEpisodeUpdate?: (movie: Movie, delta: 1 | -1) => void;
    onSelectPerson?: (name: string) => void;
    isSelectionMode?: boolean;
    isSelected?: boolean;
    onToggleSelect?: (id: string) => void;
    onToast?: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export const MovieCard: React.FC<MovieCardProps> = ({
    movie,
    allMovies = [],
    onEdit,
    onDelete,
    onQuickEpisodeUpdate,
    onSelectPerson,
    isSelectionMode = false,
    isSelected = false,
    onToggleSelect,
    onToast
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showShareCard, setShowShareCard] = useState(false);

    const rewatchRecords = useMemo(() => {
        if (!allMovies || allMovies.length === 0 || !movie.title) return [];
        const norm = normalizeTitle(movie.title);
        return allMovies
            .filter(m => normalizeTitle(m.title) === norm && (m.mediaType || 'movie') === (movie.mediaType || 'movie'))
            .sort((a, b) => (a.watchIteration || 1) - (b.watchIteration || 1));
    }, [allMovies, movie.title, movie.mediaType]);

    // 最大刷数，只有 > 1 时才认为有多刷
    const maxIteration = useMemo(() => {
        return rewatchRecords.reduce((max, r) => Math.max(max, r.watchIteration || 1), 1);
    }, [rewatchRecords]);

    // 智能聚类电视剧多倍速分段流水 (如: 1-3集 1.0x, 4-8集 1.5x)
    const speedSegments = useMemo(() => {
        if (!movie.watchHistory || movie.watchHistory.length === 0) return [];
        const segments: { startEp: number; endEp: number; speed: number; date: number; note?: string }[] = [];
        let currentSeg: { startEp: number; endEp: number; speed: number; date: number; note?: string } | null = null;

        movie.watchHistory.forEach(log => {
            const speed = log.playbackSpeed || movie.playbackSpeed || 1.0;
            if (!currentSeg) {
                currentSeg = { startEp: log.episode, endEp: log.episode, speed, date: log.date, note: log.note };
            } else if (currentSeg.speed === speed) {
                currentSeg.endEp = log.episode;
            } else {
                segments.push(currentSeg);
                currentSeg = { startEp: log.episode, endEp: log.episode, speed, date: log.date, note: log.note };
            }
        });
        if (currentSeg) {
            segments.push(currentSeg);
        }
        return segments;
    }, [movie.watchHistory, movie.playbackSpeed]);

    // 智能聚合同一天内连续追剧集数 (如当天看完第1-3集，聚类展示为第1-3集)
    const dailyHistoryGroups = useMemo(() => {
        return clusterWatchHistoryByDay(movie.watchHistory);
    }, [movie.watchHistory]);

    // Status Badge Colors (Existing)
    const statusColors = {
        [MovieStatus.WATCHED]: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        [MovieStatus.PLANNING]: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
        [MovieStatus.WATCHING]: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        [MovieStatus.DROPPED]: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    };

    const isTv = movie.mediaType === 'tv';
    const currentEp = movie.currentEpisode || 0;
    const totalEp = movie.totalEpisodes || 0;
    const progressPercent = totalEp > 0 ? Math.min(100, Math.max(0, (currentEp / totalEp) * 100)) : 0;

    // 1. Media Type Distinct Styles
    const mediaStyles = isTv
        ? {
            badgeGradient: 'bg-gradient-to-r from-purple-600 to-fuchsia-600',
            borderHover: 'hover:border-fuchsia-500/50',
            shadowHover: 'hover:shadow-fuchsia-500/20',
            progressColor: 'bg-fuchsia-500',
            progressGlow: 'group-hover:shadow-[0_0_8px_rgba(217,70,239,0.6)]',
            label: 'TV Series',
            icon: <Tv size={11} className="text-white" />
        }
        : {
            badgeGradient: 'bg-gradient-to-r from-blue-600 to-cyan-600',
            borderHover: 'hover:border-cyan-500/50',
            shadowHover: 'hover:shadow-cyan-500/20',
            progressColor: 'bg-indigo-500', // Fallback if movies had progress
            progressGlow: '',
            label: 'Movie',
            icon: <Film size={11} className="text-white" />
        };

    // 2. Rating Level Indicators
    const getRatingMeta = (r: number) => {
        if (r >= 4.5) return { label: '神作', color: 'text-amber-400 bg-amber-400/10 border-amber-400/25', iconColor: 'text-amber-400' };
        if (r >= 4.0) return { label: '推荐', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/25', iconColor: 'text-emerald-400' };
        if (r >= 3.0) return { label: '良作', color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/25', iconColor: 'text-cyan-400' };
        if (r > 0) return { label: '一般', color: 'text-slate-300 bg-slate-700/40 border-slate-600/50', iconColor: 'text-slate-400' };
        return { label: '暂无', color: 'text-slate-500 bg-slate-500/5 border-slate-500/10', iconColor: 'text-slate-600' };
    };

    const ratingMeta = getRatingMeta(movie.rating);

    const handleCardClick = () => {
        if (isSelectionMode && onToggleSelect) {
            onToggleSelect(movie.id);
        }
    };

    const handleToggleExpand = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsExpanded(!isExpanded);
    };

    useEffect(() => {
        if (!isExpanded) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsExpanded(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = originalOverflow;
        };
    }, [isExpanded]);

    const latestWatchLog = isTv && movie.watchHistory && movie.watchHistory.length > 0
        ? movie.watchHistory[movie.watchHistory.length - 1]
        : null;
    const relativeWatchTime = latestWatchLog ? formatRelativeWatchDate(latestWatchLog.date) : null;

    return (
        <div
            onClick={handleCardClick}
            className={`group relative bg-slate-800 rounded-xl overflow-hidden border transition-all duration-300 ease-out flex flex-col h-full
        ${isSelectionMode ? 'cursor-pointer' : `hover:scale-[1.02] hover:-translate-y-2 hover:shadow-2xl ${mediaStyles.shadowHover}`}
        ${isSelected ? 'border-indigo-500 ring-2 ring-indigo-500/50 scale-[0.98]' : `border-slate-700 ${!isSelectionMode && mediaStyles.borderHover}`}
        `}
        >
            {/* Visual Header */}
            <div
                className="h-32 w-full relative overflow-hidden"
                style={movie.posterImage ? {} : {
                    background: `linear-gradient(135deg, ${movie.posterColor || '#334155'} 0%, #0f172a 100%)`
                }}
            >
                {movie.posterImage ? (
                    <>
                        <img
                            src={movie.posterImage}
                            alt={movie.title}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent transition-opacity duration-500" />
                    </>
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent transition-opacity duration-500" />
                )}

                {/* Type Badge - Differentiated by Color */}
                <div className="absolute top-3 left-3 z-10 transform transition-transform duration-300 group-hover:scale-105">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider font-bold text-white shadow-lg ${mediaStyles.badgeGradient}`}>
                        {mediaStyles.icon}
                        {mediaStyles.label}
                    </span>
                </div>

                {/* Top Right: Platform Badge only (Clean & uncrowded) */}
                {movie.platform && (
                    <div className="absolute top-3 right-3 z-10">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold bg-black/60 text-slate-200 border border-white/15 backdrop-blur-md uppercase tracking-tighter shadow-sm">
                            <Monitor size={10} />
                            {movie.platform}
                        </span>
                    </div>
                )}

                {/* Selection Checkbox Overlay */}
                {isSelectionMode && (
                    <div className={`absolute top-2 right-2 z-30 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'bg-black/40 border-white/60'}`}>
                        {isSelected && <Check size={14} className="text-white" />}
                    </div>
                )}

                <div className="absolute bottom-3 left-4 right-4 z-10 transition-transform duration-300 group-hover:-translate-y-1">
                    <h3 className="text-xl font-bold text-white leading-tight truncate shadow-sm group-hover:text-indigo-300 transition-colors duration-300 drop-shadow-md">{movie.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-slate-200 mt-1 font-medium text-shadow opacity-90 group-hover:opacity-100 drop-shadow-sm flex-wrap">
                        {movie.year && <span>{movie.year}</span>}
                        {movie.year && (movie.country || movie.genre || movie.director) && <span>•</span>}
                        {movie.director && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const firstDir = movie.director?.split(/[,，/、\s]+/)[0]?.trim();
                                    if (firstDir && onSelectPerson) onSelectPerson(firstDir);
                                }}
                                className="text-indigo-200 hover:text-white hover:underline transition-colors cursor-pointer"
                                title={`点击查看「${movie.director}」作品收录进度`}
                            >
                                {movie.director}
                            </button>
                        )}
                        {movie.director && (movie.country || movie.genre) && <span>•</span>}
                        {movie.country && <span>{movie.country}</span>}
                        {movie.country && movie.genre && <span>•</span>}
                        {movie.genre && <span className="truncate">{movie.genre}</span>}
                    </div>
                </div>

                {/* Action Buttons - Mobile: in content area, Desktop: overlay on hover */}
                {!isSelectionMode && (
                    <>
                        {/* Desktop: overlay buttons in header (hidden by default, show on hover) */}
                        <div className="absolute top-2 right-2 gap-2 z-20 hidden sm:flex">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const md = exportMovieToMarkdown(movie);
                                    navigator.clipboard.writeText(md);
                                    onToast?.('已复制 Markdown 笔记至剪贴板', 'success');
                                }}
                                className="p-1.5 bg-slate-900/80 rounded-full text-slate-300 hover:text-white hover:bg-indigo-600 backdrop-blur-sm border border-white/10 shadow-lg transition-all duration-300 
                    sm:opacity-0 sm:translate-x-8 sm:group-hover:translate-x-0 sm:group-hover:opacity-100 sm:delay-[10ms]"
                                title="复制 Markdown 笔记 (Obsidian/Notion)"
                            >
                                <FileText size={14} />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowShareCard(true); }}
                                className="p-1.5 bg-slate-900/80 rounded-full text-slate-300 hover:text-white hover:bg-indigo-600 backdrop-blur-sm border border-white/10 shadow-lg transition-all duration-300 
                    sm:opacity-0 sm:translate-x-8 sm:group-hover:translate-x-0 sm:group-hover:opacity-100 sm:delay-[25ms]"
                                title="生成分享海报"
                            >
                                <Share2 size={14} />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onEdit(movie); }}
                                className="p-1.5 bg-slate-900/80 rounded-full text-slate-300 hover:text-white hover:bg-indigo-600 backdrop-blur-sm border border-white/10 shadow-lg transition-all duration-300 
                    sm:opacity-0 sm:translate-x-8 sm:group-hover:translate-x-0 sm:group-hover:opacity-100 sm:delay-75"
                                title="编辑"
                            >
                                <Edit2 size={14} />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onDelete(movie.id); }}
                                className="p-1.5 bg-red-900/80 rounded-full text-red-300 hover:text-white hover:bg-red-600 backdrop-blur-sm border border-white/10 shadow-lg transition-all duration-300 
                    sm:opacity-0 sm:translate-x-8 sm:group-hover:translate-x-0 sm:group-hover:opacity-100 sm:delay-100"
                                title="删除"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* Content Body */}
            <div className={`p-4 flex flex-col flex-grow relative bg-slate-800 transition-colors duration-300 ${!isSelectionMode && 'group-hover:bg-slate-800/80'}`}>

                {/* Rating and Status Row */}
                <div className="flex items-center justify-between gap-2 mb-3.5 flex-wrap sm:flex-nowrap">
                    <div className="flex items-center flex-wrap gap-1.5 min-w-0">
                        {/* Status Badge */}
                        <span className={`inline-flex items-center justify-center h-6 px-2 rounded-md text-[11px] font-bold border whitespace-nowrap shrink-0 shadow-sm leading-none ${statusColors[movie.status]}`}>
                            {movie.status}
                        </span>

                        {/* Rating Level Badge */}
                        {movie.rating > 0 && (
                            <div className={`inline-flex items-center justify-center gap-1 h-6 px-2 rounded-md text-[11px] font-bold border whitespace-nowrap shrink-0 shadow-sm leading-none ${ratingMeta.color}`}>
                                <Trophy size={11} className={ratingMeta.iconColor} />
                                <span>{ratingMeta.label}</span>
                            </div>
                        )}

                        {/* 多刷·经典资产 Badge */}
                        {movie.watchIteration && movie.watchIteration > 1 && (
                            <span
                                className="inline-flex items-center gap-1 h-6 px-2 rounded-md text-[11px] font-black bg-gradient-to-r from-orange-500/20 to-amber-500/20 text-orange-300 border border-orange-500/40 shadow-sm whitespace-nowrap shrink-0 leading-none"
                                title={`历史累计重温 ${movie.watchIteration} 刷`}
                            >
                                <Flame size={11} className="text-orange-400 fill-orange-400" />
                                <span>{movie.watchIteration} 刷</span>
                            </span>
                        )}

                        {/* 倍速感知 Badge */}
                        {((movie.playbackSpeed && movie.playbackSpeed !== 1) || speedSegments.length > 1) && (
                            <span
                                className={`inline-flex items-center gap-1 h-6 px-2 rounded-md text-[11px] font-bold border whitespace-nowrap shrink-0 shadow-sm leading-none ${
                                    speedSegments.length > 1
                                        ? 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30'
                                        : 'bg-slate-700/50 text-amber-300 border-amber-500/30'
                                }`}
                                title={
                                    speedSegments.length > 1
                                        ? `包含 ${speedSegments.length} 段不同倍速打卡记录`
                                        : `观看倍速: ${movie.playbackSpeed || 1.0}x ${movie.duration ? `(实际耗时: ${Math.round(movie.duration / movie.playbackSpeed)}分钟)` : ''}`
                                }
                            >
                                <Zap size={11} className="text-amber-400" />
                                <span>{movie.playbackSpeed || 1.0}x</span>
                                {movie.duration && movie.playbackSpeed && movie.playbackSpeed !== 1.0 && (
                                    <span className="text-[9px] opacity-75 font-normal">
                                        ({Math.round(movie.duration / movie.playbackSpeed)}m)
                                    </span>
                                )}
                            </span>
                        )}

                        {/* TMDB Platform Score Badge */}
                        {movie.tmdbRating && movie.tmdbRating > 0 && (
                            <div className="inline-flex items-center justify-center gap-1 h-6 px-2 rounded-md text-[11px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30 whitespace-nowrap shrink-0 shadow-sm leading-none" title={`TMDB 权威评分: ${movie.tmdbRating.toFixed(1)} / 10`}>
                                <Star size={11} className="text-amber-400 fill-amber-400" />
                                <span>TMDB {movie.tmdbRating.toFixed(1)}</span>
                            </div>
                        )}
                    </div>

                    <div className="shrink-0 flex items-center transform transition-transform duration-300 origin-right hover:scale-105 ml-auto">
                        <StarRating rating={movie.rating} readonly size={13} />
                    </div>
                </div>

                {/* Mobile action buttons (hidden on sm+) */}
                {!isSelectionMode && (
                    <div className="flex sm:hidden items-center gap-2 mb-3">
                        <button
                            onClick={(e) => { e.stopPropagation(); setShowShareCard(true); }}
                            className="p-1.5 bg-slate-700/80 rounded-full text-slate-300 hover:text-white hover:bg-indigo-600 transition-colors"
                            title="生成分享海报"
                        >
                            <Share2 size={14} />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onEdit(movie); }}
                            className="p-1.5 bg-slate-700/80 rounded-full text-slate-300 hover:text-white hover:bg-indigo-600 transition-colors"
                            title="编辑"
                        >
                            <Edit2 size={14} />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(movie.id); }}
                            className="p-1.5 bg-red-900/60 rounded-full text-red-300 hover:text-white hover:bg-red-600 transition-colors"
                            title="删除"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                )}

                {/* Classic Golden Quote Callout (if exists) */}
                {movie.quote && (
                    <div className="mb-2.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-1.5 text-xs text-amber-200/90 italic font-serif">
                        <Quote size={12} className="text-amber-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">“{movie.quote}”</span>
                    </div>
                )}

                {/* Episode Progress for TV with Quick +1 / -1 Buttons */}
                {isTv && (
                    <div className="mb-3 group/progress">
                        <div className="flex justify-between items-center text-xs text-slate-400 mb-1.5 gap-1">
                            <div className="flex items-center gap-1.5 truncate">
                                <span>进度: <span className="text-slate-200 font-bold">{currentEp}</span> / {totalEp || '?'} 集</span>
                                {relativeWatchTime && (
                                    <span className="text-[10px] text-fuchsia-400 bg-fuchsia-950/60 px-1.5 py-0.5 rounded border border-fuchsia-800/40 truncate" title={`最近打卡: ${relativeWatchTime}`}>
                                        {relativeWatchTime}打卡
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                <span className="text-[11px] text-slate-400">{Math.round(progressPercent)}%</span>
                                {!isSelectionMode && onQuickEpisodeUpdate && (
                                    <div className="flex items-center bg-slate-900/95 rounded-md border border-slate-700 p-0.5 shadow-sm touch-manipulation">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onQuickEpisodeUpdate(movie, -1);
                                            }}
                                            disabled={currentEp <= 0}
                                            className="w-6 h-6 sm:w-5 sm:h-5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700/80 active:bg-slate-700 rounded disabled:opacity-30 disabled:hover:bg-transparent transition-all touch-manipulation"
                                            title="回退 1 集"
                                        >
                                            <Minus size={12} />
                                        </button>
                                        <div className="w-[1px] h-3 bg-slate-700 mx-0.5" />
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onQuickEpisodeUpdate(movie, 1);
                                            }}
                                            disabled={totalEp > 0 && currentEp >= totalEp}
                                            className="px-2 sm:px-1.5 h-6 sm:h-5 flex items-center gap-0.5 text-xs font-bold text-fuchsia-300 hover:text-white hover:bg-fuchsia-600 active:bg-fuchsia-700 rounded disabled:opacity-30 disabled:hover:bg-transparent transition-all shadow-sm active:scale-90 touch-manipulation"
                                            title="打卡 +1 集"
                                        >
                                            <Plus size={12} />
                                            <span>1</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                            <div
                                className={`${mediaStyles.progressColor} h-full rounded-full transition-all duration-500 ease-out ${mediaStyles.progressGlow}`}
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Review Teaser & Front Tags (Always preserved on front card face) */}
                <div className="flex flex-col flex-grow mb-4">
                    {movie.review && (
                        <p className="text-slate-400 text-sm line-clamp-3 mb-2 italic flex-grow group-hover:text-slate-300 transition-colors duration-300">
                            "{movie.review}"
                        </p>
                    )}
                    {!movie.review && <div className="flex-grow"></div>}

                    {movie.tags && movie.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-auto pt-1">
                            {movie.tags.slice(0, 3).map(t => (
                                <span key={t} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-900/80 text-indigo-300 border border-slate-700/80">
                                    #{t}
                                </span>
                            ))}
                            {movie.tags.length > 3 && (
                                <span className="text-[10px] text-slate-500 self-center">+{movie.tags.length - 3}</span>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="pt-3 border-t border-slate-700/50 flex justify-between items-center text-xs text-slate-500 mt-auto">
                    <div className="flex items-center gap-1 group-hover:text-slate-400 transition-colors">
                        <Calendar size={12} />
                        <span>{safeFormatDate(movie.addedAt)}</span>
                    </div>

                    {!isSelectionMode && (
                        <button
                            type="button"
                            onClick={handleToggleExpand}
                            className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition-colors px-2 py-1 rounded hover:bg-slate-700/50 cursor-pointer"
                            title="独立放大展开详情"
                        >
                            详情 <ChevronDown size={12} />
                        </button>
                    )}
                </div>
            </div>

            {/* Enlarged Detail Modal (独立放大展开聚焦视窗，绝不破坏网格整行排版) */}
            {isExpanded && typeof document !== 'undefined' && createPortal(
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
                    onClick={() => setIsExpanded(false)}
                >
                    <div
                        className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ring-1 ring-white/10 animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Visual Header */}
                        <div
                            className="h-44 sm:h-52 w-full relative overflow-hidden shrink-0"
                            style={movie.posterImage ? {} : {
                                background: `linear-gradient(135deg, ${movie.posterColor || '#334155'} 0%, #0f172a 100%)`
                            }}
                        >
                            {movie.posterImage ? (
                                <>
                                    <img
                                        src={movie.posterImage}
                                        alt={movie.title}
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />
                                </>
                            ) : (
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/30 to-transparent" />
                            )}

                            {/* Top Left Badges */}
                            <div className="absolute top-3.5 left-3.5 z-10 flex items-center gap-2">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] uppercase tracking-wider font-bold text-white shadow-lg ${mediaStyles.badgeGradient}`}>
                                    {mediaStyles.icon}
                                    {mediaStyles.label}
                                </span>
                                {movie.platform && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-black/60 text-slate-200 border border-white/15 backdrop-blur-md uppercase tracking-tighter shadow-sm">
                                        <Monitor size={11} />
                                        {movie.platform}
                                    </span>
                                )}
                            </div>

                            {/* Top Right Action Buttons + Close */}
                            <div className="absolute top-3.5 right-3.5 z-20 flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const md = exportMovieToMarkdown(movie);
                                        navigator.clipboard.writeText(md);
                                        onToast?.('已复制 Markdown 笔记至剪贴板', 'success');
                                    }}
                                    className="p-2 bg-slate-900/80 rounded-full text-slate-300 hover:text-white hover:bg-indigo-600 backdrop-blur-sm border border-white/10 shadow-lg transition-all"
                                    title="复制 Markdown 笔记"
                                >
                                    <FileText size={15} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowShareCard(true)}
                                    className="p-2 bg-slate-900/80 rounded-full text-slate-300 hover:text-white hover:bg-indigo-600 backdrop-blur-sm border border-white/10 shadow-lg transition-all"
                                    title="生成分享海报"
                                >
                                    <Share2 size={15} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsExpanded(false);
                                        onEdit(movie);
                                    }}
                                    className="p-2 bg-slate-900/80 rounded-full text-slate-300 hover:text-white hover:bg-indigo-600 backdrop-blur-sm border border-white/10 shadow-lg transition-all"
                                    title="编辑"
                                >
                                    <Edit2 size={15} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsExpanded(false);
                                        onDelete(movie.id);
                                    }}
                                    className="p-2 bg-red-900/80 rounded-full text-red-300 hover:text-white hover:bg-red-600 backdrop-blur-sm border border-white/10 shadow-lg transition-all"
                                    title="删除"
                                >
                                    <Trash2 size={15} />
                                </button>
                                <div className="w-[1px] h-5 bg-white/20 mx-0.5" />
                                <button
                                    type="button"
                                    onClick={() => setIsExpanded(false)}
                                    className="p-2 bg-slate-900/90 rounded-full text-slate-300 hover:text-white hover:bg-slate-700 backdrop-blur-sm border border-white/20 shadow-lg transition-all"
                                    title="收起详情 (Esc)"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            {/* Title and metadata in header */}
                            <div className="absolute bottom-3 left-4 right-4 z-10">
                                <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight drop-shadow-lg truncate">
                                    {movie.title}
                                </h2>
                                <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-200 mt-1.5 font-medium flex-wrap drop-shadow">
                                    {movie.year && <span>{movie.year}</span>}
                                    {movie.year && (movie.country || movie.genre || movie.director) && <span>•</span>}
                                    {movie.director && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const firstDir = movie.director?.split(/[,，/、\s]+/)[0]?.trim();
                                                if (firstDir && onSelectPerson) {
                                                    setIsExpanded(false);
                                                    onSelectPerson(firstDir);
                                                }
                                            }}
                                            className="text-indigo-300 hover:text-white hover:underline transition-colors cursor-pointer"
                                            title={`查看「${movie.director}」作品`}
                                        >
                                            {movie.director}
                                        </button>
                                    )}
                                    {movie.director && (movie.country || movie.genre) && <span>•</span>}
                                    {movie.country && <span>{movie.country}</span>}
                                    {movie.country && movie.genre && <span>•</span>}
                                    {movie.genre && <span>{movie.genre}</span>}
                                </div>
                            </div>
                        </div>

                        {/* Scrollable Body */}
                        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 custom-scrollbar flex-1 text-slate-200">
                            {/* Rating and Status Row */}
                            <div className="flex items-center justify-between gap-3 flex-wrap bg-slate-950/40 p-3 rounded-xl border border-slate-800">
                                <div className="flex items-center flex-wrap gap-2">
                                    {/* Status Badge */}
                                    <span className={`inline-flex items-center justify-center h-7 px-2.5 rounded-lg text-xs font-bold border leading-none shadow-sm ${statusColors[movie.status]}`}>
                                        {movie.status}
                                    </span>

                                    {/* Rating Level Badge */}
                                    {movie.rating > 0 && (
                                        <div className={`inline-flex items-center justify-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-bold border leading-none shadow-sm ${ratingMeta.color}`}>
                                            <Trophy size={13} className={ratingMeta.iconColor} />
                                            <span>{ratingMeta.label}</span>
                                        </div>
                                    )}

                                    {/* 多刷 Badge */}
                                    {movie.watchIteration && movie.watchIteration > 1 && (
                                        <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-black bg-gradient-to-r from-orange-500/20 to-amber-500/20 text-orange-300 border border-orange-500/40 shadow-sm leading-none">
                                            <Flame size={13} className="text-orange-400 fill-orange-400" />
                                            <span>{movie.watchIteration} 刷</span>
                                        </span>
                                    )}

                                    {/* 倍速 Badge */}
                                    {((movie.playbackSpeed && movie.playbackSpeed !== 1) || speedSegments.length > 1) && (
                                        <span className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-bold border leading-none shadow-sm ${
                                            speedSegments.length > 1
                                                ? 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30'
                                                : 'bg-slate-700/50 text-amber-300 border-amber-500/30'
                                        }`}>
                                            <Zap size={13} className="text-amber-400" />
                                            <span>{movie.playbackSpeed || 1.0}x</span>
                                            {movie.duration && movie.playbackSpeed && movie.playbackSpeed !== 1.0 && (
                                                <span className="text-[10px] opacity-80 font-normal">
                                                    ({Math.round(movie.duration / movie.playbackSpeed)}m)
                                                </span>
                                            )}
                                        </span>
                                    )}

                                    {/* TMDB Platform Score */}
                                    {movie.tmdbRating && movie.tmdbRating > 0 && (
                                        <div className="inline-flex items-center justify-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30 shadow-sm leading-none">
                                            <Star size={13} className="text-amber-400 fill-amber-400" />
                                            <span>TMDB {movie.tmdbRating.toFixed(1)}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="shrink-0 flex items-center gap-1 ml-auto">
                                    <StarRating rating={movie.rating} readonly size={16} />
                                </div>
                            </div>

                            {/* Golden Quote */}
                            {movie.quote && (
                                <div className="px-3.5 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2 text-sm text-amber-200/95 italic font-serif">
                                    <Quote size={15} className="text-amber-400 shrink-0 mt-0.5" />
                                    <span>“{movie.quote}”</span>
                                </div>
                            )}

                            {/* TV Episode Progress with Quick Update */}
                            {isTv && (
                                <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-800 space-y-2">
                                    <div className="flex justify-between items-center text-xs sm:text-sm text-slate-300 gap-2">
                                        <div className="flex items-center gap-2">
                                            <span>追剧进度: <span className="text-white font-bold">{currentEp}</span> / {totalEp || '?'} 集</span>
                                            {relativeWatchTime && (
                                                <span className="text-[11px] text-fuchsia-400 bg-fuchsia-950/70 px-2 py-0.5 rounded-md border border-fuchsia-800/40">
                                                    {relativeWatchTime}打卡
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <span className="text-xs text-slate-400 font-medium">{Math.round(progressPercent)}%</span>
                                            {onQuickEpisodeUpdate && (
                                                <div className="flex items-center bg-slate-900 rounded-lg border border-slate-700 p-0.5 shadow-sm">
                                                    <button
                                                        type="button"
                                                        onClick={() => onQuickEpisodeUpdate(movie, -1)}
                                                        disabled={currentEp <= 0}
                                                        className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 active:bg-slate-700 rounded-md disabled:opacity-30 transition-all"
                                                        title="回退 1 集"
                                                    >
                                                        <Minus size={14} />
                                                    </button>
                                                    <div className="w-[1px] h-3.5 bg-slate-700 mx-1" />
                                                    <button
                                                        type="button"
                                                        onClick={() => onQuickEpisodeUpdate(movie, 1)}
                                                        disabled={totalEp > 0 && currentEp >= totalEp}
                                                        className="px-2.5 h-7 flex items-center gap-1 text-xs font-bold text-fuchsia-300 hover:text-white hover:bg-fuchsia-600 active:bg-fuchsia-700 rounded-md disabled:opacity-30 transition-all shadow-sm active:scale-95"
                                                        title="打卡 +1 集"
                                                    >
                                                        <Plus size={14} />
                                                        <span>1</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                                        <div
                                            className={`${mediaStyles.progressColor} h-full rounded-full transition-all duration-500 ease-out`}
                                            style={{ width: `${progressPercent}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Metadata Details Grid */}
                            <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-800 space-y-2.5 text-xs sm:text-sm">
                                {movie.director && (
                                    <div className="flex items-start gap-2 pt-0.5">
                                        <User size={14} className="text-slate-500 shrink-0 mt-1" />
                                        <span className="text-slate-400 shrink-0 mt-0.5">导演:</span>
                                        <div className="flex flex-wrap gap-1.5">
                                            {movie.director.split(/[,，/、\s]+/).map(d => d.trim()).filter(Boolean).map(dir => (
                                                <button
                                                    key={dir}
                                                    type="button"
                                                    onClick={() => {
                                                        setIsExpanded(false);
                                                        onSelectPerson?.(dir);
                                                    }}
                                                    className="px-2 py-0.5 rounded-md bg-indigo-950/70 text-indigo-300 hover:bg-indigo-600 hover:text-white border border-indigo-500/30 transition-all text-xs font-medium cursor-pointer"
                                                    title={`查看 ${dir} 作品`}
                                                >
                                                    {dir}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {movie.cast && (
                                    <div className="flex items-start gap-2 pt-0.5">
                                        <Users size={14} className="text-slate-500 shrink-0 mt-1" />
                                        <span className="text-slate-400 shrink-0 mt-0.5">主演:</span>
                                        <div className="flex flex-wrap gap-1.5">
                                            {movie.cast.split(/[,，/、]+/).map(a => a.trim()).filter(Boolean).map(actor => (
                                                <button
                                                    key={actor}
                                                    type="button"
                                                    onClick={() => {
                                                        setIsExpanded(false);
                                                        onSelectPerson?.(actor);
                                                    }}
                                                    className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 hover:bg-indigo-600 hover:text-white border border-slate-700 hover:border-indigo-500 transition-all text-xs cursor-pointer"
                                                    title={`查看 ${actor} 作品`}
                                                >
                                                    {actor}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {movie.duration && movie.duration > 0 && (
                                    <div className="flex items-center gap-2">
                                        <Clock size={14} className="text-slate-500" />
                                        <span>
                                            <span className="text-slate-400">{isTv ? '单集时长:' : '时长:'}</span> {movie.duration} 分钟
                                        </span>
                                    </div>
                                )}

                                <div className="flex items-center gap-2">
                                    <Tag size={14} className="text-slate-500" />
                                    <span><span className="text-slate-400">类型:</span> {movie.genre || '未分类'}</span>
                                </div>

                                {movie.tags && movie.tags.length > 0 && (
                                    <div className="flex items-start gap-2 pt-0.5">
                                        <Tag size={14} className="text-indigo-400 mt-1 shrink-0" />
                                        <div className="flex flex-wrap gap-1.5">
                                            {movie.tags.map(t => (
                                                <span key={t} className="px-2 py-0.5 rounded-md text-xs font-semibold bg-indigo-950/70 text-indigo-300 border border-indigo-800/50">
                                                    #{t}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {movie.platform && (
                                    <div className="flex items-center gap-2">
                                        <Monitor size={14} className="text-slate-500" />
                                        <span><span className="text-slate-400">观看平台:</span> {movie.platform}</span>
                                    </div>
                                )}
                            </div>

                            {/* 剧情简介 */}
                            {movie.overview && (
                                <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800">
                                    <div className="flex items-center gap-2 mb-2 text-xs text-slate-400 font-bold uppercase tracking-wider">
                                        <FileText size={13} className="text-indigo-400" />
                                        <span>剧情简介</span>
                                    </div>
                                    <p className="text-slate-300 leading-relaxed text-xs sm:text-sm whitespace-pre-wrap select-text">
                                        {movie.overview}
                                    </p>
                                </div>
                            )}

                            {/* 影评 / 追剧随笔 */}
                            {movie.review && (
                                <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                                            <Quote size={13} className="text-indigo-400" /> 影评 / 追剧随笔
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                navigator.clipboard.writeText(movie.review);
                                                onToast?.('短评已复制到剪贴板', 'success');
                                            }}
                                            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 hover:underline p-1 cursor-pointer"
                                            title="复制短评"
                                        >
                                            <Copy size={12} /> 复制
                                        </button>
                                    </div>
                                    {movie.review.includes('\n\n---\n\n') ? (
                                        <div className="space-y-2">
                                            {movie.review.split('\n\n---\n\n').map((rev, idx) => (
                                                <div key={idx} className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-xs sm:text-sm text-slate-300 leading-relaxed italic">
                                                    "{rev.trim()}"
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="italic text-slate-300 leading-relaxed text-xs sm:text-sm bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
                                            "{movie.review}"
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* 分段倍速打卡流水 */}
                            {isTv && speedSegments.length > 1 && (
                                <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800">
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                                        <span className="flex items-center gap-1.5">
                                            <Clock size={13} className="text-fuchsia-400" /> 分段倍速流水 ({speedSegments.length} 段)
                                        </span>
                                        <span className="text-xs text-emerald-400 font-medium">
                                            实际观影: {movie.actualWatchTime ? `${Math.floor(movie.actualWatchTime / 60)}小时${movie.actualWatchTime % 60}分` : `${movie.duration || 0}分钟`}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {speedSegments.map((seg, idx) => (
                                            <div key={idx} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-900/90 border border-slate-800 text-xs">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-fuchsia-400"></span>
                                                    <span className="text-fuchsia-300 font-bold">第 {seg.startEp}{seg.startEp === seg.endEp ? '' : `-${seg.endEp}`} 集</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                                        {seg.speed}x 倍速
                                                    </span>
                                                    <span className="text-slate-500 text-[11px]">{safeFormatDate(seg.date)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 追剧打卡足迹流水 */}
                            {isTv && movie.watchHistory && movie.watchHistory.length > 0 && (
                                <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800">
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                                        <span className="flex items-center gap-1.5">
                                            <CheckCircle2 size={13} className="text-fuchsia-400" /> 追剧打卡足迹 ({movie.watchHistory.length} 集 · {dailyHistoryGroups.length} 次打卡)
                                        </span>
                                        <span className="text-xs text-slate-400 font-normal">最近: {formatRelativeWatchDate(movie.watchHistory[movie.watchHistory.length - 1].date)}</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto custom-scrollbar p-2 bg-slate-900/60 rounded-lg border border-slate-800">
                                        {dailyHistoryGroups.slice(-30).reverse().map((group, idx) => (
                                            <div key={idx} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/90 border border-slate-700/60 text-xs">
                                                <span className="text-fuchsia-300 font-bold">
                                                    {group.startEp === group.endEp ? `第 ${group.startEp} 集` : `第 ${group.startEp}-${group.endEp} 集`}
                                                </span>
                                                {group.playbackSpeed && group.playbackSpeed !== 1.0 && (
                                                    <span className="text-[11px] text-amber-400 font-medium">({group.playbackSpeed}x)</span>
                                                )}
                                                <span className="text-slate-500">·</span>
                                                <span className="text-slate-400 text-[11px]">{safeFormatDate(group.date)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 重温足迹微缩时间轴 */}
                            {((rewatchRecords.length > 1 && maxIteration > 1) || (movie.rewatchHistory && movie.rewatchHistory.length > 1) || (movie.watchIteration && movie.watchIteration > 1)) && (
                                <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800">
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                        <Clock size={13} className="text-amber-500" /> 重温足迹 ({Math.max(maxIteration, movie.watchIteration || 1)} 刷)
                                    </div>
                                    <div className="relative border-l border-slate-700 pl-4 ml-2 space-y-3">
                                        {rewatchRecords.length > 1 ? (
                                            rewatchRecords.map(r => {
                                                const isCurrent = r.id === movie.id;
                                                return (
                                                    <div key={r.id} className="relative">
                                                        <div className={`absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full border transition-all ${isCurrent ? 'bg-indigo-500 border-indigo-300 ring-2 ring-indigo-500/30' : 'bg-slate-800 border-slate-600'}`} />
                                                        <div className={`p-3 rounded-lg text-xs transition-all ${isCurrent ? 'bg-indigo-600/10 border border-indigo-500/20' : 'bg-slate-900/60 border border-slate-800'}`}>
                                                            <div className="flex justify-between items-center mb-1">
                                                                <span className={`font-bold ${isCurrent ? 'text-indigo-400' : 'text-slate-300'}`}>
                                                                    第 {r.watchIteration || 1} 刷 {isCurrent && <span className="text-[10px] bg-indigo-600 text-white px-1.5 py-0.5 rounded-sm ml-1 font-normal">当前</span>}
                                                                </span>
                                                                <span className="text-slate-500 text-[10px]">{safeFormatDate(r.addedAt)}</span>
                                                            </div>
                                                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-slate-400 mb-1">
                                                                {r.rating > 0 && <span className="text-yellow-500 font-medium">★ {r.rating}</span>}
                                                                {r.playbackSpeed && r.playbackSpeed !== 1 && <span className="text-slate-400">⚡ {r.playbackSpeed}x</span>}
                                                                {r.platform && <span className="text-slate-400">📺 {r.platform}</span>}
                                                            </div>
                                                            {r.review && (
                                                                <p className="text-slate-300 italic mt-1 leading-relaxed">"{r.review}"</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            (movie.rewatchHistory || [
                                                { iteration: 1, date: movie.addedAt },
                                                { iteration: movie.watchIteration || 2, date: movie.lastUpdated || movie.addedAt, rating: movie.rating, note: movie.review }
                                            ]).map((rh, idx) => {
                                                const isLatest = idx === (movie.rewatchHistory ? movie.rewatchHistory.length - 1 : 1);
                                                return (
                                                    <div key={idx} className="relative">
                                                        <div className={`absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full border transition-all ${isLatest ? 'bg-indigo-500 border-indigo-300 ring-2 ring-indigo-500/30' : 'bg-slate-800 border-slate-600'}`} />
                                                        <div className={`p-3 rounded-lg text-xs transition-all ${isLatest ? 'bg-indigo-600/10 border border-indigo-500/20' : 'bg-slate-900/60 border border-slate-800'}`}>
                                                            <div className="flex justify-between items-center mb-1">
                                                                <span className={`font-bold ${isLatest ? 'text-indigo-400' : 'text-slate-300'}`}>
                                                                    第 {rh.iteration} 刷 {isLatest && <span className="text-[10px] bg-indigo-600 text-white px-1.5 py-0.5 rounded-sm ml-1 font-normal">最新</span>}
                                                                </span>
                                                                <span className="text-slate-500 text-[10px]">{safeFormatDate(rh.date)}</span>
                                                            </div>
                                                            {rh.rating && rh.rating > 0 && <div className="text-yellow-500 font-medium text-xs">★ {rh.rating}</div>}
                                                            {rh.note && <p className="text-slate-300 italic mt-1 leading-relaxed">"{rh.note}"</p>}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-3.5 sm:p-4 border-t border-slate-800/80 bg-slate-950/80 flex justify-between items-center text-xs text-slate-400 shrink-0">
                            <div className="flex items-center gap-1.5">
                                <Calendar size={13} />
                                <span>记录于 {safeFormatDate(movie.addedAt)}</span>
                            </div>

                            <button
                                type="button"
                                onClick={() => setIsExpanded(false)}
                                className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition-colors px-3 py-1.5 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/70 border border-indigo-800/40 text-xs font-semibold cursor-pointer"
                            >
                                收起卡片 <ChevronUp size={13} />
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Share Card Modal */}
            {showShareCard && (
                <ShareCard
                    movie={movie}
                    onClose={() => setShowShareCard(false)}
                    onToast={onToast}
                />
            )}
        </div>
    );
};


import React, { useState, useMemo } from 'react';
import { Movie, MovieStatus } from '../types';
import { StarRating } from './StarRating';
import { Trash2, Edit2, Calendar, Tv, Film, Check, ChevronDown, ChevronUp, User, Users, Tag, Trophy, Clock, Monitor, Share2 } from 'lucide-react';
import { ShareCard } from './ShareCard';
import { normalizeTitle } from '../utils/titleNormalizer';

const safeFormatDate = (timestamp: any): string => {
    if (!timestamp) return '未知时间';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '未知时间';
    try {
        return date.toLocaleDateString('zh-CN');
    } catch {
        return '未知时间';
    }
};

interface MovieCardProps {
    movie: Movie;
    allMovies?: Movie[];
    onEdit: (movie: Movie) => void;
    onDelete: (id: string) => void;
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

    // Status Badge Colors (Existing)
    const statusColors = {
        [MovieStatus.WATCHED]: 'bg-green-500/20 text-green-400 border-green-500/30',
        [MovieStatus.PLANNING]: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        [MovieStatus.WATCHING]: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        [MovieStatus.DROPPED]: 'bg-red-500/20 text-red-400 border-red-500/30',
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
        if (r >= 4.5) return { label: '神作', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20 shadow-yellow-900/20', iconColor: 'text-yellow-500' };
        if (r >= 4.0) return { label: '推荐', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20 shadow-emerald-900/20', iconColor: 'text-emerald-500' };
        if (r >= 3.0) return { label: '良作', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20 shadow-blue-900/20', iconColor: 'text-blue-500' };
        if (r > 0) return { label: '一般', color: 'text-slate-400 bg-slate-400/10 border-slate-400/20 shadow-none', iconColor: 'text-slate-500' };
        return { label: '暂无', color: 'text-slate-500 bg-slate-500/5 border-slate-500/10 shadow-none', iconColor: 'text-slate-600' };
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

                {/* Top Right Badges */}
                <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-1.5">
                    {movie.platform && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold bg-black/40 text-slate-200 border border-white/10 backdrop-blur-md uppercase tracking-tighter shadow-sm">
                            <Monitor size={10} />
                            {movie.platform}
                        </span>
                    )}
                    {movie.watchIteration && movie.watchIteration > 1 && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[9px] font-extrabold bg-gradient-to-r from-amber-500 to-orange-500 text-white border border-orange-400/20 shadow-md uppercase tracking-tight">
                            ⚡ {movie.watchIteration} 刷
                        </span>
                    )}
                </div>

                {/* Selection Checkbox Overlay */}
                {isSelectionMode && (
                    <div className={`absolute top-2 right-2 z-30 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'bg-black/40 border-white/60'}`}>
                        {isSelected && <Check size={14} className="text-white" />}
                    </div>
                )}

                <div className="absolute bottom-3 left-4 right-4 z-10 transition-transform duration-300 group-hover:-translate-y-1">
                    <h3 className="text-xl font-bold text-white leading-tight truncate shadow-sm group-hover:text-indigo-300 transition-colors duration-300 drop-shadow-md">{movie.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-slate-200 mt-1 font-medium text-shadow opacity-90 group-hover:opacity-100 drop-shadow-sm">
                        {movie.year && <span>{movie.year}</span>}
                        {movie.year && (movie.country || movie.genre) && <span>•</span>}
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
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium border ${statusColors[movie.status]}`}>
                            {movie.status}
                        </span>

                        {/* Rating Level Badge */}
                        {movie.rating > 0 && (
                            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-bold shadow-sm ${ratingMeta.color}`}>
                                <Trophy size={10} className={ratingMeta.iconColor} />
                                {ratingMeta.label}
                            </div>
                        )}
                    </div>

                    <div className="transform transition-transform duration-300 origin-right hover:scale-110">
                        <StarRating rating={movie.rating} readonly size={14} />
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

                {/* Episode Progress for TV */}
                {isTv && (
                    <div className="mb-3 group/progress">
                        <div className="flex justify-between text-xs text-slate-400 mb-1">
                            <span>进度: <span className="text-slate-200 font-medium">{currentEp}</span> / {totalEp || '?'} 集</span>
                            <span>{Math.round(progressPercent)}%</span>
                        </div>
                        <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                            <div
                                className={`${mediaStyles.progressColor} h-full rounded-full transition-all duration-1000 ease-out ${mediaStyles.progressGlow}`}
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Expandable Details Section */}
                <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isExpanded ? 'max-h-[500px] opacity-100 mb-3' : 'max-h-0 opacity-0'}`}>
                    <div className="space-y-2 text-xs text-slate-300 bg-slate-900/50 p-2 rounded-lg border border-slate-700/50 max-h-[400px] overflow-y-auto custom-scrollbar">
                        {movie.director && (
                            <div className="flex items-center gap-2">
                                <User size={12} className="text-slate-500" />
                                <span><span className="text-slate-500">导演:</span> {movie.director}</span>
                            </div>
                        )}
                        {movie.cast && (
                            <div className="flex items-center gap-2">
                                <Users size={12} className="text-slate-500" />
                                <span className="truncate"><span className="text-slate-500">主演:</span> {movie.cast}</span>
                            </div>
                        )}
                        {movie.duration && movie.duration > 0 && (
                            <div className="flex items-center gap-2">
                                <Clock size={12} className="text-slate-500" />
                                <span>
                                    <span className="text-slate-500">{isTv ? '单集时长:' : '时长:'}</span> {movie.duration} 分钟
                                </span>
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                            <Tag size={12} className="text-slate-500" />
                            <span><span className="text-slate-500">类型:</span> {movie.genre || '未分类'}</span>
                        </div>
                        {movie.platform && (
                            <div className="flex items-center gap-2">
                                <Monitor size={12} className="text-slate-500" />
                                <span><span className="text-slate-500">平台:</span> {movie.platform}</span>
                            </div>
                        )}
                        {movie.review && (
                            <div className="pt-1 border-t border-slate-700/50 mt-1">
                                <p className="italic">"{movie.review}"</p>
                            </div>
                        )}

                        {/* 重温足迹微缩时间轴 */}
                        {rewatchRecords.length > 1 && (
                            <div className="mt-3 pt-3 border-t border-slate-700/50">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <Clock size={11} className="text-amber-500" /> 重温足迹 ({rewatchRecords.length} 刷)
                                </div>
                                <div className="relative border-l border-slate-700 pl-3 ml-1.5 space-y-3 mt-2">
                                    {rewatchRecords.map(r => {
                                        const isCurrent = r.id === movie.id;
                                        return (
                                            <div key={r.id} className="relative group/timeline-item">
                                                {/* Timeline Node dot */}
                                                <div className={`absolute -left-[16.5px] top-1.5 w-2.5 h-2.5 rounded-full border transition-all ${isCurrent ? 'bg-indigo-500 border-indigo-300 ring-2 ring-indigo-500/30' : 'bg-slate-800 border-slate-600'}`} />

                                                <div className={`p-2 rounded-lg text-[11px] transition-all ${isCurrent ? 'bg-indigo-600/10 border border-indigo-500/20' : 'bg-slate-900/30 border border-slate-800/80'}`}>
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className={`font-bold ${isCurrent ? 'text-indigo-400' : 'text-slate-300'}`}>
                                                            第 {r.watchIteration || 1} 刷 {isCurrent && <span className="text-[9px] bg-indigo-600 text-white px-1 rounded-sm ml-1 font-normal">当前</span>}
                                                        </span>
                                                        <span className="text-slate-500 text-[9px]">{safeFormatDate(r.addedAt)}</span>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-slate-400 mb-1">
                                                        {r.rating > 0 && <span className="text-yellow-500 font-medium">★ {r.rating}</span>}
                                                        {r.playbackSpeed && r.playbackSpeed !== 1 && <span className="text-slate-500">⚡ {r.playbackSpeed}x</span>}
                                                        {r.platform && <span className="text-slate-500">📺 {r.platform}</span>}
                                                    </div>
                                                    {r.review && (
                                                        <p className="text-slate-400 italic mt-0.5 leading-relaxed">"{r.review}"</p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Review Teaser */}
                {!isExpanded && movie.review && (
                    <p className="text-slate-400 text-sm line-clamp-3 mb-4 italic flex-grow group-hover:text-slate-300 transition-colors duration-300">
                        "{movie.review}"
                    </p>
                )}
                {!movie.review && !isExpanded && <div className="flex-grow"></div>}

                {/* Footer */}
                <div className="pt-3 border-t border-slate-700/50 flex justify-between items-center text-xs text-slate-500 mt-auto">
                    <div className="flex items-center gap-1 group-hover:text-slate-400 transition-colors">
                        <Calendar size={12} />
                        <span>{safeFormatDate(movie.addedAt)}</span>
                    </div>

                    {!isSelectionMode && (
                        <button
                            onClick={handleToggleExpand}
                            className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition-colors px-2 py-1 rounded hover:bg-slate-700/50"
                        >
                            {isExpanded ? (
                                <>收起 <ChevronUp size={12} /></>
                            ) : (
                                <>详情 <ChevronDown size={12} /></>
                            )}
                        </button>
                    )}
                </div>
            </div>

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

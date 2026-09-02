import React, { useState } from 'react';
import { Movie, MovieStatus } from '../types';
import { StarRating } from './StarRating';
import { Sparkles, Plus, Tv, Film, Quote, Edit2, Trash2, Share2, Clock, Ticket, RefreshCw, FileText } from 'lucide-react';
import { safeFormatDate } from '../utils/dateUtils';
import { playMechanicalClick } from '../utils/audioFeedback';
import { exportMovieToMarkdown } from '../utils/markdownArchiveUtils';

interface CinematicCardProps {
    movie: Movie;
    isDimmed?: boolean;
    onHoverChange?: (isHovered: boolean) => void;
    onEdit: (movie: Movie) => void;
    onDelete: (id: string) => void;
    onQuickEpisodeUpdate?: (movie: Movie, delta: 1 | -1) => void;
    onSelectPerson?: (name: string) => void;
    onSelect?: (movie: Movie) => void;
    onShare?: (movie: Movie) => void;
}

export const CinematicCard: React.FC<CinematicCardProps> = ({
    movie,
    isDimmed = false,
    onHoverChange,
    onEdit,
    onDelete,
    onQuickEpisodeUpdate,
    onSelectPerson,
    onSelect,
    onShare
}) => {
    const [isFlipped, setIsFlipped] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    const isTv = movie.mediaType === 'tv';
    const currentEp = movie.currentEpisode || 0;
    const totalEp = movie.totalEpisodes || 0;
    const progressPercent = totalEp > 0 ? Math.min(100, Math.round((currentEp / totalEp) * 100)) : 0;
    const isCompleted = movie.status === MovieStatus.WATCHED;

    const maxIteration = Math.max(
        movie.watchIteration || 1,
        movie.rewatchHistory?.length || 1
    );

    // Status badges
    const statusBadges = {
        [MovieStatus.WATCHED]: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        [MovieStatus.WATCHING]: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
        [MovieStatus.PLANNING]: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        [MovieStatus.DROPPED]: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    };

    const handleFlip = (e: React.MouseEvent) => {
        e.stopPropagation();
        playMechanicalClick();
        setIsFlipped(prev => !prev);
    };

    return (
        <div
            className={`group relative flex flex-col transition-all duration-500 ease-out ${
                isDimmed
                    ? 'opacity-40 scale-[0.97] brightness-75 filter transition-all duration-500'
                    : isHovered
                    ? 'z-30 scale-105 transition-all duration-500'
                    : 'opacity-100 scale-100 z-10 transition-all duration-500'
            }`}
            onMouseEnter={() => {
                setIsHovered(true);
                onHoverChange?.(true);
            }}
            onMouseLeave={() => {
                setIsHovered(false);
                setIsFlipped(false);
                onHoverChange?.(false);
            }}
        >
            {/* Cinema Spotlight Multi-layer Ambient Glow */}
            <div
                className={`pointer-events-none absolute -inset-2 rounded-3xl blur-2xl transition-opacity duration-700 ${
                    isHovered ? 'opacity-60' : 'opacity-0'
                }`}
                style={{
                    backgroundColor: movie.posterColor || '#6366f1',
                    boxShadow: `0 0 50px 10px ${movie.posterColor || '#6366f1'}40`
                }}
            />

            {/* Main 2.5D Poster Container */}
            <div
                className={`relative aspect-[2/3] w-full overflow-hidden rounded-2xl border transition-all duration-500 ${
                    isHovered
                        ? 'border-amber-500/70 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] ring-1 ring-amber-500/30'
                        : 'border-slate-800 bg-slate-950/90 shadow-xl'
                }`}
            >
                {/* Front Side: Poster & Visual Highlights */}
                {!isFlipped ? (
                    <div className="relative h-full w-full">
                        {movie.posterImage ? (
                            <img
                                src={movie.posterImage}
                                alt={movie.title}
                                className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                                loading="lazy"
                            />
                        ) : (
                            <div
                                className="flex h-full w-full flex-col items-center justify-center p-4 text-center select-none"
                                style={{ backgroundColor: movie.posterColor || '#1e293b' }}
                            >
                                <span className="mb-2 rounded-full bg-white/10 p-3 backdrop-blur-md">
                                    {isTv ? <Tv size={28} className="text-white/80" /> : <Film size={28} className="text-white/80" />}
                                </span>
                                <h3 className="font-bold text-white text-base leading-snug line-clamp-3">
                                    {movie.title}
                                </h3>
                                <p className="text-xs text-white/60 mt-1">{movie.year}</p>
                            </div>
                        )}

                        {/* Top Gradient & Badges */}
                        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/85 via-black/40 to-transparent p-2.5 flex items-start justify-between">
                            <div className="flex flex-wrap items-center gap-1 pointer-events-auto">
                                <span className={`rounded-md border px-1.5 py-0.5 text-[9px] font-bold backdrop-blur-md ${statusBadges[movie.status] || 'bg-slate-800 text-slate-300'}`}>
                                    {movie.status}
                                </span>
                                {movie.rating >= 4.5 && (
                                    <span className="rounded-md border border-amber-400/60 bg-gradient-to-r from-amber-500/30 to-yellow-500/20 px-1.5 py-0.5 text-[9px] font-black text-amber-300 backdrop-blur-md flex items-center gap-0.5 shadow-sm">
                                        <Sparkles size={9} className="text-amber-300" /> 殿堂神作
                                    </span>
                                )}
                                {maxIteration > 1 && (
                                    <span className="rounded-md border border-orange-500/50 bg-gradient-to-r from-orange-500/30 to-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold text-orange-300 backdrop-blur-md flex items-center gap-0.5 shadow-sm">
                                        <Clock size={9} /> {maxIteration}刷·资产
                                    </span>
                                )}
                                {movie.playbackSpeed && movie.playbackSpeed !== 1.0 && (
                                    <span className="rounded-md border border-amber-500/40 bg-black/60 px-1.5 py-0.5 text-[9px] font-bold text-amber-300 backdrop-blur-md">
                                        ⚡{movie.playbackSpeed}x
                                    </span>
                                )}
                            </div>

                            {/* Flip to Vintage Ticket Button */}
                            {(movie.quote || movie.review) && (
                                <button
                                    onClick={handleFlip}
                                    className="pointer-events-auto flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-[10px] font-semibold text-amber-300 backdrop-blur-md transition-all hover:scale-105 hover:bg-amber-500 hover:text-black border border-amber-500/40 shadow-lg"
                                    title="翻转查看电影票根与经典台词"
                                >
                                    <Quote size={11} /> 票根
                                </button>
                            )}
                        </div>

                        {/* TV Episode Quick Tracker Progress Bar */}
                        {isTv && totalEp > 0 && (
                            <div className="absolute inset-x-0 bottom-0 h-1.5 bg-black/60 backdrop-blur-sm">
                                <div
                                    className={`h-full transition-all duration-500 ${isCompleted ? 'bg-emerald-400' : 'bg-gradient-to-r from-indigo-500 to-fuchsia-500'}`}
                                    style={{ width: `${progressPercent}%` }}
                                />
                            </div>
                        )}

                        {/* Floating Quick +1 Action for TV Series */}
                        {isTv && onQuickEpisodeUpdate && !isCompleted && (
                            <div className="absolute bottom-3 right-3 transition-all duration-300 group-hover:scale-100 opacity-90 group-hover:opacity-100">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        playMechanicalClick();
                                        onQuickEpisodeUpdate(movie, 1);
                                    }}
                                    className="flex items-center gap-1 rounded-full bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-3 py-1.5 text-xs font-bold text-white shadow-lg transition-transform hover:scale-105 active:scale-95 border border-white/20"
                                    title={`打卡第 ${currentEp + 1} 集`}
                                >
                                    <Plus size={13} /> {currentEp}/{totalEp || '?'}
                                </button>
                            </div>
                        )}

                        {/* Overlay Hover Actions */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex flex-col justify-end p-3.5 pointer-events-none">
                            <div className="pointer-events-auto flex items-center justify-between gap-2 pt-2 border-t border-white/10">
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onEdit(movie);
                                        }}
                                        className="rounded-lg bg-white/10 p-2 text-slate-200 backdrop-blur-md transition-colors hover:bg-white/20 hover:text-white"
                                        title="编辑作品"
                                    >
                                        <Edit2 size={13} />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const md = exportMovieToMarkdown(movie);
                                            navigator.clipboard.writeText(md);
                                        }}
                                        className="rounded-lg bg-white/10 p-2 text-slate-200 backdrop-blur-md transition-colors hover:bg-amber-600 hover:text-white"
                                        title="复制 Markdown 笔记 (Obsidian/Notion)"
                                    >
                                        <FileText size={13} />
                                    </button>
                                    {onShare && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onShare(movie);
                                            }}
                                            className="rounded-lg bg-white/10 p-2 text-slate-200 backdrop-blur-md transition-colors hover:bg-white/20 hover:text-white"
                                            title="生成分享卡片"
                                        >
                                            <Share2 size={13} />
                                        </button>
                                    )}
                                </div>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDelete(movie.id);
                                    }}
                                    className="rounded-lg bg-rose-500/20 p-2 text-rose-300 backdrop-blur-md transition-colors hover:bg-rose-600 hover:text-white"
                                    title="删除作品"
                                >
                                    <Trash2 size={13} />
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Back Side: Vintage Cinema Ticket & Film Quote Card */
                    <div
                        onClick={handleFlip}
                        className="relative h-full w-full cursor-pointer flex flex-col justify-between p-4 bg-gradient-to-b from-slate-950 via-zinc-900 to-slate-950 text-slate-200 border-2 border-dashed border-amber-500/30 select-none animate-in fade-in zoom-in-95 duration-300"
                    >
                        {/* Perforated ticket cutouts (Left & Right semicircles) */}
                        <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-950 border-r border-amber-500/40" />
                        <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-950 border-l border-amber-500/40" />

                        {/* Ticket Header */}
                        <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                            <div className="flex items-center gap-1.5">
                                <Ticket size={13} className="text-amber-400" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-300 font-mono">
                                    CINEMA TICKET
                                </span>
                            </div>
                            <span className="text-[9px] font-mono text-amber-500/70 border border-amber-500/30 px-1.5 py-0.2 rounded">
                                NO. {movie.id.slice(0, 6).toUpperCase()}
                            </span>
                        </div>

                        {/* Ticket Quote & Review Body */}
                        <div className="my-auto space-y-2.5 overflow-y-auto custom-scrollbar px-1 py-2 text-center">
                            {movie.quote ? (
                                <blockquote className="text-xs sm:text-sm font-serif italic text-amber-100/95 leading-relaxed tracking-wide">
                                    “{movie.quote}”
                                </blockquote>
                            ) : null}

                            {movie.review && (
                                <p className="text-[11px] text-slate-300/85 leading-relaxed font-sans line-clamp-4">
                                    {movie.review}
                                </p>
                            )}

                            {!movie.quote && !movie.review && (
                                <p className="text-[11px] text-slate-500 italic">
                                    点击翻转海报或在编辑中添加台词
                                </p>
                            )}
                        </div>

                        {/* Ticket Footer / Wax Seal Stamp */}
                        <div className="border-t border-amber-500/20 pt-2 flex items-end justify-between text-[10px] text-slate-400 font-mono">
                            <div className="text-left">
                                <div className="font-bold text-amber-400 truncate max-w-[110px] font-sans text-xs">
                                    《{movie.title}》
                                </div>
                                <div className="text-[9px] text-slate-500">
                                    {safeFormatDate(movie.addedAt)}
                                </div>
                            </div>

                            {/* Vintage Admit Stamp */}
                            <div className="rounded border border-amber-500/60 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-black tracking-widest text-amber-400 -rotate-6 uppercase">
                                ★ ADMIT ONE
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Card Title & Rating Info */}
            <div className="mt-2.5 px-1">
                <div className="flex items-center justify-between gap-1.5">
                    <h3
                        onClick={() => onSelect ? onSelect(movie) : onEdit(movie)}
                        className="cursor-pointer font-bold text-slate-200 text-sm tracking-tight hover:text-amber-400 transition-colors line-clamp-1"
                        title={movie.title}
                    >
                        {movie.title}
                    </h3>
                    <span className="text-[11px] text-slate-500 font-medium">{movie.year}</span>
                </div>

                <div className="mt-1 flex items-center justify-between">
                    <div className="scale-85 origin-left">
                        <StarRating rating={movie.rating} readonly />
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium truncate max-w-[120px]">
                        {movie.director && onSelectPerson ? (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const dir = movie.director?.split(/[,，/、\s]+/)[0]?.trim();
                                    if (dir) onSelectPerson(dir);
                                }}
                                className="text-amber-400/90 hover:text-amber-300 hover:underline truncate"
                                title={`查看「${movie.director}」作品收录进度`}
                            >
                                🎬 {movie.director.split(/[,，/、\s]+/)[0]}
                            </button>
                        ) : (
                            <span className="truncate">
                                {movie.genre ? movie.genre.split(/[,/、 ]/)[0] : (isTv ? '剧集' : '电影')}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

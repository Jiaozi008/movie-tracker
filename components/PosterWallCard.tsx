import React, { useState } from 'react';
import { Movie, MovieStatus, MediaType } from '../types';
import { Star, Film, Tv, Edit2, Trash2, Share2, Check, PlayCircle, Plus } from 'lucide-react';
import { StarRating } from './StarRating';
import { ShareCard } from './ShareCard';

interface PosterWallCardProps {
    movie: Movie;
    allMovies?: Movie[];
    onEdit: (movie: Movie) => void;
    onDelete: (id: string) => void;
    onQuickEpisodeUpdate?: (id: string, newEpisode: number) => void;
    onSelectPerson?: (name: string) => void;
    isSelectionMode?: boolean;
    isSelected?: boolean;
    onToggleSelect?: (id: string) => void;
    onToast?: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export const PosterWallCard: React.FC<PosterWallCardProps> = ({
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
    const [showShareCard, setShowShareCard] = useState(false);
    const isTv = movie.mediaType === 'tv';
    const currentEp = movie.currentEpisode || 0;
    const totalEp = movie.totalEpisodes || 0;

    const handleCardClick = () => {
        if (isSelectionMode && onToggleSelect) {
            onToggleSelect(movie.id);
        } else {
            onEdit(movie);
        }
    };

    const handleQuickEpisode = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!onQuickEpisodeUpdate) return;
        const nextEp = currentEp + 1;
        if (totalEp > 0 && nextEp > totalEp) {
            onToast?.(`已达到总集数 (${totalEp}集)`, 'info');
            return;
        }
        onQuickEpisodeUpdate(movie.id, nextEp);
        onToast?.(`「${movie.title}」已更新至第 ${nextEp} 集`, 'success');
    };

    return (
        <>
            <div
                onClick={handleCardClick}
                className={`group relative rounded-2xl overflow-hidden aspect-[2/3] bg-slate-900 border transition-all duration-300 cursor-pointer shadow-lg hover:shadow-2xl hover:scale-[1.03] hover:z-20 select-none ${
                    isSelected ? 'ring-2 ring-indigo-500 border-indigo-500 shadow-indigo-500/20' : 'border-slate-800 hover:border-indigo-500/50'
                }`}
            >
                {/* 1. Poster Image / Gradient Background */}
                {movie.posterImage ? (
                    <img
                        src={movie.posterImage}
                        alt={movie.title}
                        className="w-full h-full object-cover transform transition-transform duration-500 group-hover:scale-110"
                        loading="lazy"
                    />
                ) : (
                    <div
                        className="w-full h-full flex flex-col items-center justify-center p-4 text-center"
                        style={{ backgroundColor: movie.posterColor || '#1e293b' }}
                    >
                        {isTv ? <Tv size={36} className="text-white/40 mb-2" /> : <Film size={36} className="text-white/40 mb-2" />}
                        <span className="text-sm font-black text-white/90 line-clamp-3 leading-snug drop-shadow-md">
                            {movie.title}
                        </span>
                        {movie.year && <span className="text-xs text-white/60 mt-1">{movie.year}</span>}
                    </div>
                )}

                {/* 2. Top Badges Overlay */}
                <div className="absolute top-2.5 left-2.5 right-2.5 flex items-start justify-between gap-1.5 pointer-events-none z-10">
                    {/* Media Type & Status */}
                    <div className="flex flex-col gap-1">
                        <span className={`inline-flex items-center gap-1 h-5 px-2 rounded-md text-[10px] font-bold text-white shadow-md backdrop-blur-md ${
                            isTv ? 'bg-fuchsia-600/90' : 'bg-blue-600/90'
                        }`}>
                            {isTv ? <Tv size={10} /> : <Film size={10} />}
                            <span>{isTv ? '剧集' : '电影'}</span>
                        </span>

                        {movie.status && movie.status !== MovieStatus.WATCHED && (
                            <span className="inline-flex items-center h-5 px-1.5 rounded-md text-[10px] font-bold bg-amber-500/90 text-white shadow-md backdrop-blur-md">
                                {movie.status}
                            </span>
                        )}
                    </div>

                    {/* Masterpiece, Speed & Rewatch Assets */}
                    <div className="flex flex-col items-end gap-1">
                        {movie.rating >= 4.5 && (
                            <span className="inline-flex items-center gap-0.5 h-5 px-1.5 rounded-md text-[9px] font-black bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow-md">
                                ★ 殿堂
                            </span>
                        )}

                        {movie.tmdbRating && movie.tmdbRating > 0 && (
                            <span className="inline-flex items-center gap-0.5 h-5 px-1.5 rounded-md text-[10px] font-extrabold bg-black/70 text-amber-300 border border-amber-400/30 backdrop-blur-md shadow-md">
                                <Star size={9} className="text-amber-400 fill-amber-400" />
                                <span>{movie.tmdbRating.toFixed(1)}</span>
                            </span>
                        )}

                        {movie.watchIteration && movie.watchIteration > 1 && (
                            <span className="inline-flex items-center h-5 px-1.5 rounded-md text-[9px] font-extrabold bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-md">
                                🔥 {movie.watchIteration}刷
                            </span>
                        )}

                        {movie.playbackSpeed && movie.playbackSpeed !== 1.0 && (
                            <span className="inline-flex items-center h-4.5 px-1.5 rounded-md text-[9px] font-bold bg-black/70 text-amber-300 border border-amber-500/30 backdrop-blur-md">
                                ⚡{movie.playbackSpeed}x
                            </span>
                        )}
                    </div>
                </div>

                {/* 3. TV Progress Bar (If TV) */}
                {isTv && totalEp > 0 && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-black/60 z-10">
                        <div
                            className="h-full bg-gradient-to-r from-fuchsia-500 to-pink-500 transition-all duration-300"
                            style={{ width: `${Math.min(100, (currentEp / totalEp) * 100)}%` }}
                        />
                    </div>
                )}

                {/* 4. Selection Checkbox */}
                {isSelectionMode && (
                    <div className={`absolute top-2.5 right-2.5 z-30 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                        isSelected ? 'bg-indigo-600 border-indigo-600' : 'bg-black/60 border-white/60'
                    }`}>
                        {isSelected && <Check size={14} className="text-white" />}
                    </div>
                )}

                {/* 5. Bottom Dark Vignette Gradient */}
                <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent pointer-events-none z-10" />

                {/* 6. Title and Star Rating Info at Bottom */}
                <div className="absolute bottom-3 left-3 right-3 z-10 flex flex-col gap-1 transition-transform duration-300 group-hover:-translate-y-2">
                    <h3 className="text-sm sm:text-base font-extrabold text-white leading-snug line-clamp-2 drop-shadow-md group-hover:text-indigo-300 transition-colors">
                        {movie.title}
                    </h3>
                    <div className="flex items-center justify-between text-xs text-slate-300">
                        {movie.rating > 0 ? (
                            <StarRating rating={movie.rating} readonly size={12} />
                        ) : (
                            <span className="text-[10px] text-slate-400">{movie.year || '未定档'}</span>
                        )}
                        {isTv && totalEp > 0 && (
                            <span className="text-[10px] font-bold text-fuchsia-300">
                                {currentEp}/{totalEp}集
                            </span>
                        )}
                    </div>
                </div>

                {/* 7. Hover Actions Glassmorphism Bar */}
                {!isSelectionMode && (
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 flex flex-col items-center justify-center p-4 gap-2 text-center pointer-events-none group-hover:pointer-events-auto">
                        <h4 className="text-sm font-bold text-white line-clamp-2">{movie.title}</h4>
                        <p className="text-xs text-slate-300 line-clamp-2 italic">
                            {movie.review ? `"${movie.review}"` : (movie.overview || `${movie.genre || ''} · ${movie.year || ''}`)}
                        </p>

                        {movie.director && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const dir = movie.director?.split(/[,，/、\s]+/)[0]?.trim();
                                    if (dir && onSelectPerson) onSelectPerson(dir);
                                }}
                                className="px-2 py-0.5 rounded-full bg-indigo-950/70 hover:bg-indigo-600 border border-indigo-500/40 text-indigo-300 hover:text-white text-[11px] font-medium transition-all shadow-sm active:scale-95"
                                title={`查看「${movie.director}」作品收录进度`}
                            >
                                🎬 {movie.director}
                            </button>
                        )}

                        <div className="flex items-center gap-2 mt-1">
                            {isTv && (
                                <button
                                    onClick={handleQuickEpisode}
                                    className="p-2 rounded-full bg-fuchsia-600 hover:bg-fuchsia-500 text-white shadow-lg transition-transform active:scale-95"
                                    title="打卡 +1 集"
                                >
                                    <Plus size={15} />
                                </button>
                            )}
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowShareCard(true); }}
                                className="p-2 rounded-full bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white border border-slate-700 shadow-lg transition-colors"
                                title="生成海报"
                            >
                                <Share2 size={15} />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onEdit(movie); }}
                                className="p-2 rounded-full bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white border border-slate-700 shadow-lg transition-colors"
                                title="编辑"
                            >
                                <Edit2 size={15} />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onDelete(movie.id); }}
                                className="p-2 rounded-full bg-slate-800 hover:bg-red-600 text-slate-200 hover:text-white border border-slate-700 shadow-lg transition-colors"
                                title="删除"
                            >
                                <Trash2 size={15} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Share Poster Modal */}
            {showShareCard && (
                <ShareCard
                    movie={movie}
                    allMovies={allMovies}
                    onClose={() => setShowShareCard(false)}
                    onToast={onToast}
                />
            )}
        </>
    );
};

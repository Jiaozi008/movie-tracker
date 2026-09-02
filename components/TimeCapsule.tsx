import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Movie, MovieStatus } from '../types';
import { StarRating } from './StarRating';
import { Sparkles, Calendar, X, ChevronRight, Quote, Clock, Film, Tv, Dices, Play, RefreshCw } from 'lucide-react';
import { safeFormatDate } from '../utils/dateUtils';
import { isTvShow } from '../utils/migrationUtils';
import { playMechanicalClick, playProjectorTick } from '../utils/audioFeedback';

interface TimeCapsuleProps {
    movies: Movie[];
    onSelectMovie: (movie: Movie) => void;
}

interface MemoryMatch {
    movie: Movie;
    yearsAgo: number;
    exactDate: number;
    matchType: 'watch' | 'added' | 'rewatch';
}

export const TimeCapsule: React.FC<TimeCapsuleProps> = ({ movies, onSelectMovie }) => {
    const [isDismissed, setIsDismissed] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);

    // 1. Match historical anniversary memories for today
    const memories = useMemo<MemoryMatch[]>(() => {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        const currentDate = now.getDate();

        const results: MemoryMatch[] = [];

        movies.forEach(movie => {
            // Check addedAt
            if (movie.addedAt) {
                const d = new Date(movie.addedAt);
                if (d.getFullYear() < currentYear && d.getMonth() === currentMonth && d.getDate() === currentDate) {
                    results.push({
                        movie,
                        yearsAgo: currentYear - d.getFullYear(),
                        exactDate: movie.addedAt,
                        matchType: 'added'
                    });
                    return;
                }
            }

            // Check rewatchHistory
            if (movie.rewatchHistory && movie.rewatchHistory.length > 0) {
                for (const r of movie.rewatchHistory) {
                    if (r.date) {
                        const d = new Date(r.date);
                        if (d.getFullYear() < currentYear && d.getMonth() === currentMonth && d.getDate() === currentDate) {
                            results.push({
                                movie,
                                yearsAgo: currentYear - d.getFullYear(),
                                exactDate: r.date,
                                matchType: 'rewatch'
                            });
                            return;
                        }
                    }
                }
            }

            // Check watchHistory for TV
            if (movie.watchHistory && movie.watchHistory.length > 0) {
                for (const w of movie.watchHistory) {
                    if (w.date) {
                        const d = new Date(w.date);
                        if (d.getFullYear() < currentYear && d.getMonth() === currentMonth && d.getDate() === currentDate) {
                            results.push({
                                movie,
                                yearsAgo: currentYear - d.getFullYear(),
                                exactDate: w.date,
                                matchType: 'watch'
                            });
                            return;
                        }
                    }
                }
            }
        });

        // Sort: highest rating first
        return results.sort((a, b) => (b.movie.rating || 0) - (a.movie.rating || 0));
    }, [movies]);

    // 2. Time Projector (时光放映机) candidate pool when no anniversary is found
    const candidates = useMemo(() => {
        if (memories.length > 0) return [];
        // Candidate pool: rating >= 3.5 or watched movies
        const pool = movies.filter(m => m.rating >= 3.5 || m.status === MovieStatus.WATCHED);
        return pool.length > 0 ? pool : movies;
    }, [movies, memories.length]);

    const [projectorMovie, setProjectorMovie] = useState<Movie | null>(null);
    const [isSpinning, setIsSpinning] = useState(false);
    const spinTimerRef = useRef<any>(null);

    // Pick initial random candidate
    useEffect(() => {
        if (memories.length === 0 && candidates.length > 0 && !projectorMovie) {
            const randomIndex = Math.floor(Math.random() * candidates.length);
            setProjectorMovie(candidates[randomIndex]);
        }
    }, [memories.length, candidates, projectorMovie]);

    const handleSpinReel = () => {
        if (candidates.length <= 1 || isSpinning) return;
        setIsSpinning(true);
        playMechanicalClick();

        let count = 0;
        const maxSpins = 12;
        const interval = 70;

        if (spinTimerRef.current) clearInterval(spinTimerRef.current);

        spinTimerRef.current = setInterval(() => {
            count++;
            playProjectorTick();
            const randomIndex = Math.floor(Math.random() * candidates.length);
            setProjectorMovie(candidates[randomIndex]);

            if (count >= maxSpins) {
                clearInterval(spinTimerRef.current);
                setIsSpinning(false);
                playMechanicalClick();
            }
        }, interval);
    };

    if (isDismissed || (memories.length === 0 && (!projectorMovie || candidates.length === 0))) {
        return null;
    }

    // ==========================================
    // CASE A: 往年今日命中历史记忆 (Time Capsule)
    // ==========================================
    if (memories.length > 0) {
        const currentMemory = memories[currentIndex % memories.length];
        const { movie, yearsAgo, exactDate } = currentMemory;

        return (
            <div className="relative mb-6 overflow-hidden rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-950/60 via-slate-900/90 to-amber-900/40 p-4 shadow-2xl backdrop-blur-md transition-all duration-300 hover:border-amber-500/60 animate-in fade-in slide-in-from-top-3">
                {/* Ambient gold glow */}
                <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-amber-500/15 blur-3xl" />

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    {/* Left: Poster & Highlights */}
                    <div
                        onClick={() => onSelectMovie(movie)}
                        className="flex items-center gap-3.5 cursor-pointer group/memory flex-1"
                    >
                        <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-xl border border-amber-500/40 shadow-lg group-hover/memory:scale-105 transition-transform">
                            {movie.posterImage ? (
                                <img src={movie.posterImage} alt={movie.title} className="h-full w-full object-cover" />
                            ) : (
                                <div
                                    className="h-full w-full flex items-center justify-center text-white"
                                    style={{ backgroundColor: movie.posterColor || '#1e293b' }}
                                >
                                    {isTvShow(movie) ? <Tv size={16} /> : <Film size={16} />}
                                </div>
                            )}
                        </div>

                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-500/50 px-2.5 py-0.5 text-[11px] font-bold text-amber-300 shadow-sm">
                                    <Sparkles size={11} /> 那年今日 · {yearsAgo} 年前
                                </span>
                                <span className="text-xs text-slate-400 font-medium">
                                    {safeFormatDate(exactDate)}
                                </span>
                            </div>

                            <div className="flex items-center gap-2 mt-1">
                                <h3 className="text-sm sm:text-base font-bold text-white group-hover/memory:text-amber-300 transition-colors truncate">
                                    《{movie.title}》
                                </h3>
                                <div className="scale-75 origin-left shrink-0">
                                    <StarRating rating={movie.rating} readonly />
                                </div>
                            </div>

                            {/* Quote or Review */}
                            {movie.quote ? (
                                <p className="text-xs font-serif italic text-amber-200/90 truncate mt-0.5 max-w-xl">
                                    “{movie.quote}”
                                </p>
                            ) : movie.review ? (
                                <p className="text-xs text-slate-300/80 truncate mt-0.5 max-w-xl">
                                    {movie.review}
                                </p>
                            ) : (
                                <p className="text-xs text-slate-400 mt-0.5">重温那年此时的心动与触动</p>
                            )}
                        </div>
                    </div>

                    {/* Right: Switcher & Actions */}
                    <div className="flex items-center gap-2 justify-end shrink-0 border-t sm:border-t-0 border-slate-800/80 pt-2 sm:pt-0">
                        {memories.length > 1 && (
                            <div className="flex items-center gap-1 bg-black/40 px-2 py-1 rounded-xl border border-white/10 text-xs text-slate-300 font-mono">
                                <button
                                    onClick={() => {
                                        playMechanicalClick();
                                        setCurrentIndex(i => (i - 1 + memories.length) % memories.length);
                                    }}
                                    className="p-1 hover:text-amber-400"
                                >
                                    &lt;
                                </button>
                                <span>{currentIndex + 1}/{memories.length}</span>
                                <button
                                    onClick={() => {
                                        playMechanicalClick();
                                        setCurrentIndex(i => (i + 1) % memories.length);
                                    }}
                                    className="p-1 hover:text-amber-400"
                                >
                                    &gt;
                                </button>
                            </div>
                        )}

                        <button
                            onClick={() => onSelectMovie(movie)}
                            className="flex items-center gap-1 rounded-xl bg-amber-500 px-3.5 py-1.5 text-xs font-bold text-slate-950 shadow-md hover:brightness-110 active:scale-95 transition-all"
                        >
                            <Play size={12} fill="currentColor" /> 重温佳作
                        </button>

                        <button
                            onClick={() => setIsDismissed(true)}
                            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
                            title="暂且收起"
                        >
                            <X size={15} />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ==========================================
    // CASE B: 空窗期时光放映机 (Time Projector)
    // ==========================================
    if (!projectorMovie) return null;

    return (
        <div className="relative mb-6 overflow-hidden rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 via-slate-900/90 to-purple-950/40 p-3.5 sm:p-4 shadow-xl backdrop-blur-md transition-all duration-300 hover:border-indigo-500/50 animate-in fade-in">
            {/* Ambient projector glow */}
            <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-indigo-500/10 blur-3xl" />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {/* Left: Projector Film Reel */}
                <div
                    onClick={() => onSelectMovie(projectorMovie)}
                    className="flex items-center gap-3.5 cursor-pointer group/projector flex-1 min-w-0"
                >
                    <div className="relative h-14 w-11 shrink-0 overflow-hidden rounded-xl border border-indigo-500/40 shadow-lg group-hover/projector:scale-105 transition-transform">
                        {projectorMovie.posterImage ? (
                            <img src={projectorMovie.posterImage} alt={projectorMovie.title} className="h-full w-full object-cover" />
                        ) : (
                            <div
                                className="h-full w-full flex items-center justify-center text-white"
                                style={{ backgroundColor: projectorMovie.posterColor || '#1e293b' }}
                            >
                                {isTvShow(projectorMovie) ? <Tv size={15} /> : <Film size={15} />}
                            </div>
                        )}
                    </div>

                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 px-2 py-0.5 text-[10px] font-bold text-indigo-300">
                                <Film size={10} /> 🎞️ 时光放映机
                            </span>
                            <span className="text-[11px] text-slate-400 font-sans">
                                摇一部尘封经典重温
                            </span>
                        </div>

                        <div className="flex items-center gap-2 mt-0.5">
                            <h3 className="text-sm font-bold text-white group-hover/projector:text-indigo-300 transition-colors truncate">
                                《{projectorMovie.title}》
                            </h3>
                            <span className="text-xs text-slate-400">({projectorMovie.year})</span>
                            <div className="scale-75 origin-left shrink-0">
                                <StarRating rating={projectorMovie.rating} readonly />
                            </div>
                        </div>

                        {projectorMovie.quote ? (
                            <p className="text-xs font-serif italic text-indigo-200/90 truncate mt-0.5 max-w-lg">
                                “{projectorMovie.quote}”
                            </p>
                        ) : projectorMovie.review ? (
                            <p className="text-xs text-slate-300/80 truncate mt-0.5 max-w-lg">
                                {projectorMovie.review}
                            </p>
                        ) : (
                            <p className="text-xs text-slate-400 mt-0.5">
                                {projectorMovie.genre || '好片值得一次次重逢'}
                            </p>
                        )}
                    </div>
                </div>

                {/* Right: Roll Reel Action */}
                <div className="flex items-center gap-2 justify-end shrink-0 border-t sm:border-t-0 border-slate-800/80 pt-2 sm:pt-0">
                    <button
                        onClick={handleSpinReel}
                        disabled={isSpinning}
                        className={`flex items-center gap-1.5 rounded-xl border border-indigo-500/40 bg-indigo-500/20 px-3 py-1.5 text-xs font-bold text-indigo-300 shadow-sm transition-all hover:bg-indigo-500/30 active:scale-95 ${
                            isSpinning ? 'animate-pulse cursor-wait' : ''
                        }`}
                        title="转动放映机换一部老片"
                    >
                        <RefreshCw size={12} className={isSpinning ? 'animate-spin' : ''} /> 换一部
                    </button>

                    <button
                        onClick={() => onSelectMovie(projectorMovie)}
                        className="flex items-center gap-1 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-md hover:brightness-110 active:scale-95 transition-all"
                    >
                        <Play size={11} fill="currentColor" /> 重温
                    </button>

                    <button
                        onClick={() => setIsDismissed(true)}
                        className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
                        title="收起放映机"
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
};

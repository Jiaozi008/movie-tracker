import React, { useState, useMemo } from 'react';
import { Movie, MovieStatus } from '../types';
import { CinematicCard } from './CinematicCard';
import { TimeCapsule } from './TimeCapsule';
import { Sparkles, Film, Tv, Star, Clock, Plus, Search, X, ArrowUpDown, Flame, BookmarkCheck } from 'lucide-react';
import { isMovieShow, isTvShow } from '../utils/migrationUtils';
import { fuzzyMatch } from '../utils/searchUtils';

import { PersonCollectionBanner } from './PersonCollectionBanner';

interface CinematicViewProps {
    movies: Movie[];
    allMovies: Movie[];
    onEdit: (movie: Movie) => void;
    onDelete: (id: string) => void;
    onQuickEpisodeUpdate?: (movie: Movie, delta: 1 | -1) => void;
    onSelectMovie: (movie: Movie) => void;
    onShareMovie?: (movie: Movie) => void;
    onAddNew: () => void;
    onSwitchToClassic?: () => void;
    selectedPerson?: string | null;
    onSelectPerson?: (name: string | null) => void;
    onQuickAddPlanning?: (title: string, meta?: any) => void;
}

type CuratedTab = 'all' | 'movies' | 'tv' | 'masterpiece' | 'rewatch' | 'watching' | 'planning';

export const CinematicView: React.FC<CinematicViewProps> = ({
    movies,
    allMovies,
    onEdit,
    onDelete,
    onQuickEpisodeUpdate,
    onSelectMovie,
    onShareMovie,
    onAddNew,
    onSwitchToClassic,
    selectedPerson,
    onSelectPerson,
    onQuickAddPlanning
}) => {
    // 始终以全局最新片库 allMovies 为基准，保障数据 100% 实时同步一致
    const sourceMovies = allMovies && allMovies.length > 0 ? allMovies : movies;

    const [searchTerm, setSearchTerm] = useState('');
    const [curatedTab, setCuratedTab] = useState<CuratedTab>('all');
    const [sortBy, setSortBy] = useState<'addedAt-desc' | 'rating-desc' | 'year-desc' | 'title-asc'>('addedAt-desc');

    // 统计各分类实际数量
    const tabCounts = useMemo(() => {
        let movieCount = 0;
        let tvCount = 0;
        let masterpieceCount = 0;
        let rewatchCount = 0;
        let watchingCount = 0;
        let planningCount = 0;

        sourceMovies.forEach(m => {
            if (isMovieShow(m)) movieCount++;
            if (isTvShow(m)) tvCount++;
            if (m.rating >= 4.5) masterpieceCount++;
            if ((m.watchIteration && m.watchIteration > 1) || (m.rewatchHistory && m.rewatchHistory.length > 1)) rewatchCount++;
            if (m.status === MovieStatus.WATCHING) watchingCount++;
            if (m.status === MovieStatus.PLANNING) planningCount++;
        });

        return {
            all: sourceMovies.length,
            movies: movieCount,
            tv: tvCount,
            masterpiece: masterpieceCount,
            rewatch: rewatchCount,
            watching: watchingCount,
            planning: planningCount
        };
    }, [sourceMovies]);

    // 过滤与搜索
    const filteredMovies = useMemo(() => {
        const term = searchTerm.trim();

        return sourceMovies.filter(m => {
            // 1. 搜索匹配
            if (term) {
                const matches = fuzzyMatch(m.title, term) ||
                    fuzzyMatch(m.director, term) ||
                    fuzzyMatch(m.cast, term) ||
                    fuzzyMatch(m.genre, term) ||
                    fuzzyMatch(m.review, term) ||
                    fuzzyMatch(m.overview, term) ||
                    fuzzyMatch(m.quote, term) ||
                    (m.tags ? m.tags.some(t => fuzzyMatch(t, term)) : false);

                if (!matches) return false;
            }

            // 2. 分类匹配（精准使用 isMovieShow 与 isTvShow 规避类型缺失问题）
            if (curatedTab === 'movies') return isMovieShow(m);
            if (curatedTab === 'tv') return isTvShow(m);
            if (curatedTab === 'masterpiece') return m.rating >= 4.5;
            if (curatedTab === 'rewatch') return (m.watchIteration && m.watchIteration > 1) || (m.rewatchHistory && m.rewatchHistory.length > 1);
            if (curatedTab === 'watching') return m.status === MovieStatus.WATCHING;
            if (curatedTab === 'planning') return m.status === MovieStatus.PLANNING;

            return true;
        });
    }, [sourceMovies, searchTerm, curatedTab]);

    // 排序
    const sortedMovies = useMemo(() => {
        const list = [...filteredMovies];

        list.sort((a, b) => {
            if (sortBy === 'rating-desc') {
                const diff = (b.rating || 0) - (a.rating || 0);
                if (diff !== 0) return diff;
            } else if (sortBy === 'year-desc') {
                const yearA = parseInt(String(a.year)) || 0;
                const yearB = parseInt(String(b.year)) || 0;
                const diff = yearB - yearA;
                if (diff !== 0) return diff;
            } else if (sortBy === 'title-asc') {
                const diff = String(a.title).localeCompare(String(b.title), 'zh-CN');
                if (diff !== 0) return diff;
            }

            // 默认按添加时间倒序
            const timeA = a.addedAt || 0;
            const timeB = b.addedAt || 0;
            return timeB - timeA;
        });

        return list;
    }, [filteredMovies, sortBy]);

    const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);

    return (
        <div className="space-y-6 animate-fade-in">
            {/* 1. Time Capsule Banner */}
            <TimeCapsule movies={sourceMovies} onSelectMovie={onSelectMovie} />

            {/* 1.5 Person Filmography Progress Banner (If Person Selected) */}
            {selectedPerson && (
                <PersonCollectionBanner
                    personName={selectedPerson}
                    allMovies={sourceMovies}
                    onClose={() => onSelectPerson?.(null)}
                    onQuickAddPlanning={onQuickAddPlanning}
                />
            )}

            {/* 2. Cinematic Header: Search & Curated Filter Tabs */}
            <div className="space-y-3 bg-slate-900/70 p-3 sm:p-4 rounded-2xl border border-slate-800 backdrop-blur-md shadow-xl">
                {/* Top Row: Search & Sort Bar */}
                <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
                    <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-amber-500/70">
                            <Search size={16} />
                        </div>
                        <input
                            type="text"
                            placeholder="在电影殿堂中搜索片名、导演、主演、台词或手记..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-9 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-xs sm:text-sm transition-all"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                        <div className="relative min-w-[130px]">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500/70 pointer-events-none">
                                <ArrowUpDown size={13} />
                            </div>
                            <select
                                value={sortBy}
                                onChange={(e: any) => setSortBy(e.target.value)}
                                className="w-full appearance-none bg-slate-950/60 border border-slate-800 rounded-xl pl-8 pr-7 py-2 text-xs focus:ring-2 focus:ring-amber-500/50 outline-none text-slate-300 hover:text-white cursor-pointer transition-colors"
                            >
                                <option value="addedAt-desc">最近添加</option>
                                <option value="rating-desc">评分最高</option>
                                <option value="year-desc">年份最新</option>
                                <option value="title-asc">片名拼音</option>
                            </select>
                        </div>

                        {onSwitchToClassic && (
                            <button
                                onClick={onSwitchToClassic}
                                className="flex items-center gap-1 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white transition-all whitespace-nowrap active:scale-95"
                                title="返回经典数据仪表盘"
                            >
                                <span>🏛️</span> <span className="hidden sm:inline">经典仪表盘</span>
                            </button>
                        )}

                        <button
                            onClick={onAddNew}
                            className="flex items-center gap-1 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-3 py-2 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/20 hover:brightness-110 active:scale-95 transition-all whitespace-nowrap"
                        >
                            <Plus size={14} /> 录入
                        </button>
                    </div>
                </div>

                {/* Bottom Row: Curated Category Filter Pills */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
                    <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto custom-scrollbar py-0.5">
                        <button
                            onClick={() => setCuratedTab('all')}
                            className={`px-3 py-1 rounded-lg text-xs transition-all ${curatedTab === 'all' ? 'bg-amber-500 text-slate-950 shadow-sm font-bold' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'}`}
                        >
                            全部 ({tabCounts.all})
                        </button>

                        <button
                            onClick={() => setCuratedTab('movies')}
                            className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs transition-all ${curatedTab === 'movies' ? 'bg-amber-500 text-slate-950 shadow-sm font-bold' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'}`}
                        >
                            <Film size={12} /> 电影 ({tabCounts.movies})
                        </button>

                        <button
                            onClick={() => setCuratedTab('tv')}
                            className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs transition-all ${curatedTab === 'tv' ? 'bg-amber-500 text-slate-950 shadow-sm font-bold' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'}`}
                        >
                            <Tv size={12} /> 剧集 ({tabCounts.tv})
                        </button>

                        <button
                            onClick={() => setCuratedTab('masterpiece')}
                            className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs transition-all ${curatedTab === 'masterpiece' ? 'bg-amber-500 text-slate-950 shadow-sm font-bold' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'}`}
                        >
                            <Star size={12} className={curatedTab === 'masterpiece' ? 'fill-current' : 'text-amber-400'} /> 5星殿堂 ({tabCounts.masterpiece})
                        </button>

                        <button
                            onClick={() => setCuratedTab('rewatch')}
                            className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs transition-all ${curatedTab === 'rewatch' ? 'bg-amber-500 text-slate-950 shadow-sm font-bold' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'}`}
                        >
                            <Clock size={12} className={curatedTab === 'rewatch' ? 'text-slate-950' : 'text-indigo-400'} /> 重温 ({tabCounts.rewatch})
                        </button>

                        <button
                            onClick={() => setCuratedTab('watching')}
                            className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs transition-all ${curatedTab === 'watching' ? 'bg-amber-500 text-slate-950 shadow-sm font-bold' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'}`}
                        >
                            <Flame size={12} className={curatedTab === 'watching' ? 'text-slate-950' : 'text-rose-400'} /> 追剧中 ({tabCounts.watching})
                        </button>

                        <button
                            onClick={() => setCuratedTab('planning')}
                            className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs transition-all ${curatedTab === 'planning' ? 'bg-amber-500 text-slate-950 shadow-sm font-bold' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'}`}
                        >
                            <BookmarkCheck size={12} className={curatedTab === 'planning' ? 'text-slate-950' : 'text-amber-400'} /> 想看 ({tabCounts.planning})
                        </button>
                    </div>

                    <span className="text-[11px] text-slate-400 shrink-0">
                        当前展示: <strong className="text-amber-400 font-bold">{sortedMovies.length}</strong> 部
                    </span>
                </div>
            </div>

            {/* 3. Cinematic Gallery Grid */}
            {sortedMovies.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
                    {sortedMovies.map((movie) => (
                        <CinematicCard
                            key={movie.id}
                            movie={movie}
                            isDimmed={hoveredCardId !== null && hoveredCardId !== movie.id}
                            onHoverChange={(hovering) => setHoveredCardId(hovering ? movie.id : null)}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onQuickEpisodeUpdate={onQuickEpisodeUpdate}
                            onSelect={onSelectMovie}
                            onShare={onShareMovie}
                            onSelectPerson={onSelectPerson}
                        />
                    ))}
                </div>
            ) : (
                /* Empty State */
                <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-800 bg-slate-900/40 py-16 text-center">
                    <div className="rounded-full bg-amber-500/10 p-4 text-amber-400 mb-3">
                        <Sparkles size={32} />
                    </div>
                    <h3 className="text-base font-bold text-slate-200">未找到符合条件的作品</h3>
                    <p className="mt-1 text-xs text-slate-400 max-w-sm">
                        {searchTerm ? `未找到与「${searchTerm}」匹配的电影或剧集` : '此分类下暂无记录，可尝试切换其他分类'}
                    </p>
                    <div className="mt-4 flex items-center gap-2">
                        {(searchTerm || curatedTab !== 'all') && (
                            <button
                                onClick={() => {
                                    setSearchTerm('');
                                    setCuratedTab('all');
                                }}
                                className="rounded-xl bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition-colors"
                            >
                                清除搜索与筛选
                            </button>
                        )}
                        <button
                            onClick={onAddNew}
                            className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 shadow-lg shadow-amber-500/20 hover:brightness-110 active:scale-95 transition-all"
                        >
                            <Plus size={14} /> 录入新作品
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

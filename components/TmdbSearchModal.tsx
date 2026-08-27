import React, { useState, useEffect, useRef } from 'react';
import { searchTmdb, getDetails, downloadPosterAsBase64, getPosterUrl, TmdbSearchResult, TmdbDetailResult, TmdbSeasonInfo } from '../services/tmdbService';
import { useDebounce } from '../hooks/useDebounce';
import { Search, X, Film, Tv, Star, Loader2, ArrowLeft, Layers } from 'lucide-react';

interface TmdbSearchModalProps {
    initialQuery: string;
    onSelect: (detail: TmdbDetailResult, posterBase64: string | null) => void;
    onClose: () => void;
    onError: (msg: string) => void;
}

export const TmdbSearchModal: React.FC<TmdbSearchModalProps> = ({ initialQuery, onSelect, onClose, onError }) => {
    const [query, setQuery] = useState(initialQuery);
    const debouncedQuery = useDebounce(query, 400);
    const [results, setResults] = useState<TmdbSearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [selectingTvDetail, setSelectingTvDetail] = useState<TmdbDetailResult | null>(null);
    const [loadingSeasonNum, setLoadingSeasonNum] = useState<number | 'all' | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    useEffect(() => {
        if (!debouncedQuery || debouncedQuery.length < 1) {
            setResults([]);
            return;
        }

        let cancelled = false;
        const doSearch = async () => {
            setIsSearching(true);
            try {
                const data = await searchTmdb(debouncedQuery);
                if (!cancelled) setResults(data);
            } catch (err: any) {
                if (!cancelled) onError(err.message);
            } finally {
                if (!cancelled) setIsSearching(false);
            }
        };
        doSearch();
        return () => { cancelled = true; };
    }, [debouncedQuery, onError]);

    const handleSelectResult = async (result: TmdbSearchResult) => {
        setSelectedId(result.id);
        setIsLoading(true);
        try {
            const detail = await getDetails(result);

            // 如果是电视剧且有多季，展示分季选择面板
            if (detail.mediaType === 'tv' && detail.seasons && detail.seasons.length > 0) {
                setSelectingTvDetail(detail);
                setIsLoading(false);
                setSelectedId(null);
                return;
            }

            // 电影或无分季数据的剧集，直接下载海报并提交
            await finalizeSelection(detail);
        } catch (err: any) {
            onError(err.message || '获取详情失败');
            setIsLoading(false);
            setSelectedId(null);
        }
    };

    const handleSelectSeason = async (season: TmdbSeasonInfo | 'all') => {
        if (!selectingTvDetail) return;

        setLoadingSeasonNum(typeof season === 'object' ? season.seasonNumber : 'all');
        try {
            let finalDetail: TmdbDetailResult;

            if (season === 'all') {
                finalDetail = {
                    ...selectingTvDetail,
                };
            } else {
                // 拼接季数规范标题，例如「怪奇物语 第4季」或「Slow Horses 第1季」
                const seasonTitle = season.name.includes('季')
                    ? `${selectingTvDetail.title} ${season.name}`
                    : `${selectingTvDetail.title} 第${season.seasonNumber}季`;

                finalDetail = {
                    ...selectingTvDetail,
                    title: seasonTitle,
                    year: season.year || selectingTvDetail.year,
                    totalEpisodes: season.episodeCount || selectingTvDetail.totalEpisodes,
                    posterUrl: season.posterUrl || selectingTvDetail.posterUrl,
                    overview: season.overview || selectingTvDetail.overview,
                    selectedSeason: season,
                };
            }

            await finalizeSelection(finalDetail);
        } catch (err: any) {
            onError(err.message || '处理分季数据失败');
            setLoadingSeasonNum(null);
        }
    };

    const finalizeSelection = async (detail: TmdbDetailResult) => {
        let posterBase64: string | null = null;
        if (detail.posterUrl) {
            try {
                posterBase64 = await downloadPosterAsBase64(detail.posterUrl);
            } catch {
                console.warn('Poster download failed, using URL fallback');
            }
        }

        onSelect(detail, posterBase64);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[85vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* 视图 1：分季选择列表 */}
                {selectingTvDetail ? (
                    <>
                        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900">
                            <div className="flex items-center gap-2 min-w-0">
                                <button
                                    onClick={() => setSelectingTvDetail(null)}
                                    className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                                    title="返回搜索列表"
                                >
                                    <ArrowLeft size={18} />
                                </button>
                                <div className="min-w-0">
                                    <h3 className="text-sm font-semibold text-white truncate">
                                        选择「{selectingTvDetail.title}」的季数
                                    </h3>
                                    <p className="text-xs text-slate-400">
                                        共 {selectingTvDetail.seasons?.length} 季 · 支持单季独立集数与海报
                                    </p>
                                </div>
                            </div>
                            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                            {/* 选项 0：整部剧集全量汇总 */}
                            <button
                                type="button"
                                onClick={() => handleSelectSeason('all')}
                                disabled={loadingSeasonNum !== null}
                                className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all text-left ${loadingSeasonNum === 'all'
                                    ? 'bg-indigo-600/20 border-indigo-500'
                                    : 'bg-slate-800/60 hover:bg-indigo-600/10 border-slate-700/60 hover:border-indigo-500/40'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                                        <Layers size={20} />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-semibold text-white">全剧汇总（全 {selectingTvDetail.seasons?.length} 季）</h4>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            首播 {selectingTvDetail.year || '未知'} 年 · 累计共 {selectingTvDetail.totalEpisodes || 0} 集
                                        </p>
                                    </div>
                                </div>
                                {loadingSeasonNum === 'all' ? (
                                    <Loader2 className="text-indigo-400 animate-spin" size={18} />
                                ) : (
                                    <span className="text-xs text-indigo-400 font-medium">选择整剧 →</span>
                                )}
                            </button>

                            {/* 各季独立选项 */}
                            <div className="pt-2">
                                <div className="text-xs font-medium text-slate-400 px-1 mb-2">按季度独立记录：</div>
                                <div className="space-y-2">
                                    {selectingTvDetail.seasons?.map(s => {
                                        const isSeasonLoading = loadingSeasonNum === s.seasonNumber;
                                        return (
                                            <button
                                                key={s.id}
                                                type="button"
                                                onClick={() => handleSelectSeason(s)}
                                                disabled={loadingSeasonNum !== null}
                                                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${isSeasonLoading
                                                    ? 'bg-indigo-600/20 border-indigo-500'
                                                    : 'bg-slate-800/40 hover:bg-slate-800/90 border-slate-700/50 hover:border-indigo-500/40'
                                                    }`}
                                            >
                                                {/* Season Poster */}
                                                <div className="w-10 h-14 rounded-md overflow-hidden bg-slate-800 shrink-0 border border-slate-700">
                                                    {s.posterUrl ? (
                                                        <img src={s.posterUrl} alt={s.name} className="w-full h-full object-cover" loading="lazy" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-slate-600">
                                                            <Tv size={16} />
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="text-sm font-semibold text-white truncate">
                                                            {s.name}
                                                        </h4>
                                                        {s.year && (
                                                            <span className="text-[11px] px-1.5 py-0.2 rounded bg-slate-700/60 text-slate-300">
                                                                {s.year} 年
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-slate-400 mt-1">
                                                        本季单季共 <strong className="text-indigo-300 font-semibold">{s.episodeCount}</strong> 集
                                                    </p>
                                                    {s.overview && (
                                                        <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{s.overview}</p>
                                                    )}
                                                </div>

                                                {isSeasonLoading ? (
                                                    <Loader2 className="text-indigo-400 animate-spin shrink-0" size={18} />
                                                ) : (
                                                    <span className="text-xs text-slate-400 hover:text-indigo-300 shrink-0 font-medium">
                                                        录入本季 →
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    /* 视图 2：主搜索列表 */
                    <>
                        {/* Header */}
                        <div className="flex items-center gap-3 p-4 border-b border-slate-800">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="搜索 TMDB 电影 / 电视剧..."
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-base sm:text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-slate-500"
                                />
                                {isSearching && (
                                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-400 animate-spin" size={16} />
                                )}
                            </div>
                            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Results */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {results.length === 0 && !isSearching && debouncedQuery && (
                                <div className="p-8 text-center text-slate-500 text-sm">
                                    未找到「{debouncedQuery}」的结果
                                </div>
                            )}
                            {results.length === 0 && !debouncedQuery && (
                                <div className="p-8 text-center text-slate-500 text-sm">
                                    输入标题开始搜索
                                </div>
                            )}

                            {results.map(r => {
                                const posterThumb = getPosterUrl(r.posterPath, 'w185');
                                const isCurrentlyLoading = isLoading && selectedId === r.id;

                                return (
                                    <button
                                        key={`${r.mediaType}-${r.id}`}
                                        onClick={() => handleSelectResult(r)}
                                        disabled={isLoading}
                                        className={`w-full flex items-start gap-3 p-3 text-left transition-all border-b border-slate-800/50 ${isCurrentlyLoading
                                            ? 'bg-indigo-500/10'
                                            : 'hover:bg-slate-800/80'
                                            } ${isLoading && !isCurrentlyLoading ? 'opacity-50' : ''}`}
                                    >
                                        {/* Poster Thumbnail */}
                                        <div className="w-12 h-[72px] rounded-md overflow-hidden bg-slate-800 shrink-0 border border-slate-700">
                                            {posterThumb ? (
                                                <img src={posterThumb} alt={r.title} className="w-full h-full object-cover" loading="lazy" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-600">
                                                    {r.mediaType === 'movie' ? <Film size={16} /> : <Tv size={16} />}
                                                </div>
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${r.mediaType === 'movie'
                                                    ? 'bg-blue-500/20 text-blue-400'
                                                    : 'bg-purple-500/20 text-purple-400'
                                                    }`}>
                                                    {r.mediaType === 'movie' ? <Film size={9} /> : <Tv size={9} />}
                                                    {r.mediaType === 'movie' ? 'Movie' : 'TV'}
                                                </span>
                                                {r.voteAverage > 0 && (
                                                    <span className="flex items-center gap-0.5 text-[10px] text-amber-400">
                                                        <Star size={10} fill="currentColor" />
                                                        {r.voteAverage.toFixed(1)}
                                                    </span>
                                                )}
                                            </div>
                                            <h4 className="text-sm font-medium text-white truncate">{r.title}</h4>
                                            {r.originalTitle !== r.title && (
                                                <p className="text-xs text-slate-500 truncate">{r.originalTitle}</p>
                                            )}
                                            <p className="text-xs text-slate-400 mt-0.5">{r.year || '年份未知'}</p>
                                            {r.overview && (
                                                <p className="text-xs text-slate-500 line-clamp-2 mt-1">{r.overview}</p>
                                            )}
                                        </div>

                                        {/* Loading indicator */}
                                        {isCurrentlyLoading && (
                                            <div className="shrink-0 self-center">
                                                <Loader2 className="text-indigo-400 animate-spin" size={20} />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Footer */}
                        <div className="p-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
                            <span>数据来源：TMDB</span>
                            <span>{results.length > 0 ? `${results.length} 条结果` : ''}</span>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

import React, { useState, useEffect, useRef } from 'react';
import { searchTmdb, getDetails, downloadPosterAsBase64, getPosterUrl, TmdbSearchResult, TmdbDetailResult } from '../services/tmdbService';
import { useDebounce } from '../hooks/useDebounce';
import { Search, X, Film, Tv, Star, Loader2 } from 'lucide-react';

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

    const handleSelect = async (result: TmdbSearchResult) => {
        setSelectedId(result.id);
        setIsLoading(true);
        try {
            const detail = await getDetails(result);

            // Try to download poster as base64
            let posterBase64: string | null = null;
            if (detail.posterUrl) {
                try {
                    posterBase64 = await downloadPosterAsBase64(detail.posterUrl);
                } catch {
                    // Poster download failed, continue without it
                    console.warn('Poster download failed, using URL fallback');
                }
            }

            onSelect(detail, posterBase64);
            onClose();
        } catch (err: any) {
            onError(err.message || '获取详情失败');
        } finally {
            setIsLoading(false);
            setSelectedId(null);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[80vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
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
                                onClick={() => handleSelect(r)}
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
            </div>
        </div>
    );
};

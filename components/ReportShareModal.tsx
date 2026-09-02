import React, { useRef, useState, useMemo } from 'react';
import { Movie, MovieStatus } from '../types';
import html2canvas from 'html2canvas';
import { X, Download, Star, Film, Tv, Clock, Copy, Sparkles, Flame, Trophy, Smile, Zap, Tag, Calendar, BarChart3, Check } from 'lucide-react';
import { calculateMovieDuration, calculateTvDuration, calculateTotalEpisodes, calculateRewatchKing, calculateSpeedDemon, calculateJudgePersona } from '../utils/statsCalculator';
import { normalizeTitle } from '../utils/titleNormalizer';
import { formatLocalDateKey, getTodayLocalDateString, safeFormatDate } from '../utils/dateUtils';

interface ReportShareModalProps {
    movies: Movie[];
    onClose: () => void;
    onToast?: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

const REPORT_THEMES = [
    {
        id: 'midnight',
        name: '深空曜黑',
        bgGradient: 'from-slate-950 via-slate-900 to-black',
        cardBg: 'bg-slate-900/80 border-slate-800',
        accentText: 'text-amber-400',
        accentBorder: 'border-amber-400/40',
        accentBg: 'bg-amber-400/10',
        glowColor: 'bg-amber-500/10'
    },
    {
        id: 'neon',
        name: '赛博霓虹',
        bgGradient: 'from-slate-950 via-indigo-950 to-purple-950',
        cardBg: 'bg-slate-900/80 border-indigo-900/50',
        accentText: 'text-fuchsia-400',
        accentBorder: 'border-fuchsia-400/40',
        accentBg: 'bg-fuchsia-400/10',
        glowColor: 'bg-fuchsia-500/15'
    },
    {
        id: 'aurora',
        name: '极光幽林',
        bgGradient: 'from-slate-950 via-teal-950 to-emerald-950',
        cardBg: 'bg-slate-900/80 border-emerald-900/50',
        accentText: 'text-emerald-400',
        accentBorder: 'border-emerald-400/40',
        accentBg: 'bg-emerald-400/10',
        glowColor: 'bg-emerald-500/15'
    },
    {
        id: 'ocean',
        name: '蔚蓝星海',
        bgGradient: 'from-slate-950 via-sky-950 to-blue-950',
        cardBg: 'bg-slate-900/80 border-cyan-900/50',
        accentText: 'text-cyan-400',
        accentBorder: 'border-cyan-400/40',
        accentBg: 'bg-cyan-400/10',
        glowColor: 'bg-cyan-500/15'
    }
];

export const ReportShareModal: React.FC<ReportShareModalProps> = ({ movies, onClose, onToast }) => {
    const reportRef = useRef<HTMLDivElement>(null);
    const [selectedThemeIndex, setSelectedThemeIndex] = useState(0);
    const [timeRange, setTimeRange] = useState<string>('all'); // 'all' | 'pastYear' | specific year e.g. '2026'
    const [isSaving, setIsSaving] = useState(false);
    const [copied, setCopied] = useState(false);

    const theme = REPORT_THEMES[selectedThemeIndex];

    // 1. Calculate available years
    const availableYears = useMemo(() => {
        const years = new Set<string>();
        movies.forEach(m => {
            if (m.addedAt) {
                years.add(new Date(m.addedAt).getFullYear().toString());
            }
        });
        return Array.from(years).sort((a, b) => b.localeCompare(a));
    }, [movies]);

    // 2. Filter movies by time range
    const filteredMovies = useMemo(() => {
        if (timeRange === 'all') return movies;

        const now = new Date();
        if (timeRange === 'pastYear') {
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(now.getFullYear() - 1);
            return movies.filter(m => new Date(m.addedAt) >= oneYearAgo);
        }

        const yearNum = parseInt(timeRange);
        return movies.filter(m => new Date(m.addedAt).getFullYear() === yearNum);
    }, [movies, timeRange]);

    // 3. Compute Report Statistics
    const stats = useMemo(() => {
        // Unique media entity map (deduplicate multiple rewatch records for title count)
        const uniqueMediaMap = new Map<string, Movie>();
        filteredMovies.forEach(m => {
            const key = normalizeTitle(m.title);
            if (!uniqueMediaMap.has(key)) {
                uniqueMediaMap.set(key, m);
            }
        });

        const uniqueMovies = Array.from(uniqueMediaMap.values());
        const movieCount = uniqueMovies.filter(m => m.mediaType !== 'tv').length;
        const tvCount = uniqueMovies.filter(m => m.mediaType === 'tv').length;

        const timeFilterOpt = {
            timeFrame: (timeRange === 'all' || timeRange === 'pastYear') ? ('all' as const) : ('year' as const),
            selectedYear: timeRange.startsWith('year_') ? timeRange.replace('year_', '') : undefined
        };

        const movieDuration = calculateMovieDuration(filteredMovies);
        const tvDuration = calculateTvDuration(filteredMovies, movies, timeFilterOpt);
        const totalDurationMin = movieDuration + tvDuration;
        const durationHours = Math.floor(totalDurationMin / 60);
        const durationMinutes = totalDurationMin % 60;

        const totalEpisodesWatched = calculateTotalEpisodes(filteredMovies, movies, timeFilterOpt);

        // Average rating
        const ratedMovies = filteredMovies.filter(m => m.rating > 0);
        const avgRating = ratedMovies.length > 0
            ? (ratedMovies.reduce((acc, m) => acc + m.rating, 0) / ratedMovies.length).toFixed(1)
            : '0.0';

        // Genre distribution
        const genreCountMap: Record<string, number> = {};
        filteredMovies.forEach(m => {
            if (m.genre) {
                const parts = m.genre.split(/[,，/、\s]+/).map(g => g.trim()).filter(Boolean);
                parts.forEach(g => {
                    genreCountMap[g] = (genreCountMap[g] || 0) + 1;
                });
            }
        });
        const topGenres = Object.entries(genreCountMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        // Tag distribution
        const tagCountMap: Record<string, number> = {};
        filteredMovies.forEach(m => {
            if (m.tags && Array.isArray(m.tags)) {
                m.tags.forEach(t => {
                    const tr = t.trim();
                    if (tr) tagCountMap[tr] = (tagCountMap[tr] || 0) + 1;
                });
            }
        });
        const topTags = Object.entries(tagCountMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6);

        // Top 5 Star / Masterpiece list
        const topRated = [...filteredMovies]
            .filter(m => m.rating >= 4.5 && m.status === MovieStatus.WATCHED)
            .sort((a, b) => b.rating - a.rating || b.addedAt - a.addedAt)
            .slice(0, 4);

        // Personas & Highlights
        const judgePersona = calculateJudgePersona(filteredMovies);
        const rewatchKing = calculateRewatchKing(filteredMovies);
        const speedDemon = calculateSpeedDemon(filteredMovies);

        // Active days
        const activeDaysSet = new Set<string>();
        filteredMovies.forEach(m => {
            if (m.status !== MovieStatus.PLANNING) {
                if (m.watchHistory && m.watchHistory.length > 0) {
                    m.watchHistory.forEach(h => {
                        const k = formatLocalDateKey(h.date);
                        if (k) activeDaysSet.add(k);
                    });
                } else if (m.addedAt) {
                    const k = formatLocalDateKey(m.addedAt);
                    if (k) activeDaysSet.add(k);
                }
                if (m.rewatchHistory && m.rewatchHistory.length > 0) {
                    m.rewatchHistory.forEach(rh => {
                        const k = formatLocalDateKey(rh.date);
                        if (k) activeDaysSet.add(k);
                    });
                }
            }
        });

        // Director distribution
        const directorCountMap: Record<string, number> = {};
        filteredMovies.forEach(m => {
            if (m.director && m.director.trim() && m.director.trim() !== '未知') {
                const dirs = m.director.split(/[,，/、\s]+/).map(d => d.trim()).filter(d => d.length > 0 && d !== '未知');
                dirs.forEach(d => {
                    directorCountMap[d] = (directorCountMap[d] || 0) + 1;
                });
            }
        });
        const topDirectors = Object.entries(directorCountMap).sort((a, b) => b[1] - a[1]).slice(0, 3);

        // Cast distribution
        const castCountMap: Record<string, number> = {};
        filteredMovies.forEach(m => {
            if (m.cast && m.cast.trim() && m.cast.trim() !== '未知') {
                const acts = m.cast.split(/[,，/、\s]+/).map(a => a.trim()).filter(a => a.length > 0 && a !== '未知');
                acts.forEach(a => {
                    castCountMap[a] = (castCountMap[a] || 0) + 1;
                });
            }
        });
        const topCast = Object.entries(castCountMap).sort((a, b) => b[1] - a[1]).slice(0, 3);

        return {
            totalRecords: filteredMovies.length,
            uniqueTotal: uniqueMovies.length,
            movieCount,
            tvCount,
            durationHours,
            durationMinutes,
            totalDurationMin,
            totalEpisodesWatched,
            avgRating,
            activeDays: activeDaysSet.size,
            topGenres,
            topTags,
            topRated,
            topDirectors,
            topCast,
            judgePersona,
            rewatchKing,
            speedDemon
        };
    }, [filteredMovies]);

    const reportTitle = useMemo(() => {
        if (timeRange === 'all') return '我的观影全景报告';
        if (timeRange === 'pastYear') return '近一年 观影报告';
        return `${timeRange} 年度观影报告`;
    }, [timeRange]);

    const handleSaveImage = async () => {
        if (!reportRef.current || isSaving) return;
        setIsSaving(true);

        try {
            const canvas = await html2canvas(reportRef.current, {
                backgroundColor: null,
                scale: 3, // High-res 3x
                useCORS: true,
                logging: false,
            });

            canvas.toBlob((blob) => {
                if (blob) {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `CineLog_${reportTitle}_${getTodayLocalDateString()}.png`;
                    a.click();
                    URL.revokeObjectURL(url);
                    onToast?.('观影报告长图已成功保存到本地', 'success');
                }
            }, 'image/png', 1.0);
        } catch (error) {
            console.error('Export report error:', error);
            onToast?.('生成长图失败，请重试', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCopyImage = async () => {
        if (!reportRef.current) return;
        try {
            const canvas = await html2canvas(reportRef.current, {
                backgroundColor: null,
                scale: 2.5,
                useCORS: true,
                logging: false,
            });

            canvas.toBlob(async (blob) => {
                if (blob) {
                    try {
                        await navigator.clipboard.write([
                            new ClipboardItem({ 'image/png': blob })
                        ]);
                        setCopied(true);
                        onToast?.('报告图片已复制到剪贴板', 'success');
                        setTimeout(() => setCopied(false), 2500);
                    } catch {
                        onToast?.('复制失败，请使用保存长图按钮', 'info');
                    }
                }
            }, 'image/png');
        } catch (error) {
            onToast?.('生成图片失败', 'error');
        }
    };

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
            <div className="bg-slate-900 w-full max-w-2xl rounded-2xl border border-slate-700 shadow-2xl flex flex-col my-auto max-h-[92vh] overflow-hidden">
                {/* Header Controls Bar */}
                <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/90 shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                            <Sparkles size={18} />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-white">生成观影报告长图</h3>
                            <p className="text-xs text-slate-400">一键导出高清年度/全景影视手账海报</p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Range & Theme Selector Toolbar */}
                <div className="px-4 py-3 bg-slate-900/60 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
                    {/* Time Range Selector */}
                    <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
                        <button
                            onClick={() => setTimeRange('all')}
                            className={`px-2.5 py-1 rounded font-medium transition-all ${timeRange === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                            全部记录
                        </button>
                        <button
                            onClick={() => setTimeRange('pastYear')}
                            className={`px-2.5 py-1 rounded font-medium transition-all ${timeRange === 'pastYear' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                            近一年
                        </button>
                        {availableYears.map(y => (
                            <button
                                key={y}
                                onClick={() => setTimeRange(y)}
                                className={`px-2.5 py-1 rounded font-medium transition-all ${timeRange === y ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                            >
                                {y}年
                            </button>
                        ))}
                    </div>

                    {/* Theme Switcher */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <span>主题:</span>
                        <div className="flex gap-1.5">
                            {REPORT_THEMES.map((t, idx) => (
                                <button
                                    key={t.id}
                                    onClick={() => setSelectedThemeIndex(idx)}
                                    className={`px-2 py-0.5 rounded text-xs border transition-all ${selectedThemeIndex === idx ? 'bg-slate-800 text-white border-indigo-500 font-semibold' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'}`}
                                >
                                    {t.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Poster Preview Container (Scrollable) */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar bg-slate-950/70 flex justify-center">
                    {/* The Render Target Canvas Card */}
                    <div
                        ref={reportRef}
                        className={`w-full max-w-lg rounded-2xl bg-gradient-to-b ${theme.bgGradient} p-6 sm:p-8 text-white border border-slate-800 shadow-2xl relative overflow-hidden`}
                    >
                        {/* Glow Ambient Blobs */}
                        <div className={`absolute top-0 right-0 w-64 h-64 ${theme.glowColor} rounded-full blur-3xl pointer-events-none`} />
                        <div className={`absolute bottom-20 left-0 w-64 h-64 ${theme.glowColor} rounded-full blur-3xl pointer-events-none`} />

                        {/* 1. Header Banner */}
                        <div className="relative z-10 flex justify-between items-start border-b border-slate-800/80 pb-5 mb-6">
                            <div>
                                <div className="flex items-center gap-2 mb-1.5">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                                        <Film size={18} />
                                    </div>
                                    <span className="text-xs font-extrabold tracking-widest text-slate-400 uppercase">
                                        CineLog Studio
                                    </span>
                                </div>
                                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-1">
                                    {reportTitle}
                                </h2>
                                <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                                    <span>共记录 {stats.totalRecords} 次观影足迹</span>
                                    <span>·</span>
                                    <span>{safeFormatDate(Date.now())} 生成</span>
                                </p>
                            </div>

                            <div className="text-right">
                                <span className={`inline-block text-[11px] font-bold px-2.5 py-1 rounded-full border ${theme.accentBorder} ${theme.accentBg} ${theme.accentText}`}>
                                    {stats.judgePersona}
                                </span>
                            </div>
                        </div>

                        {/* 2. Core Numbers Grid */}
                        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                            {/* Total Watch Time */}
                            <div className={`${theme.cardBg} p-3.5 rounded-xl border flex flex-col justify-between col-span-2 sm:col-span-1`}>
                                <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5 mb-1">
                                    <Clock size={13} className={theme.accentText} /> 观影总时长
                                </div>
                                <div className="text-xl font-extrabold text-white">
                                    {stats.durationHours} <span className="text-xs font-normal text-slate-400">h</span> {stats.durationMinutes} <span className="text-xs font-normal text-slate-400">m</span>
                                </div>
                            </div>

                            {/* Total Media Count */}
                            <div className={`${theme.cardBg} p-3.5 rounded-xl border flex flex-col justify-between`}>
                                <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5 mb-1">
                                    <Film size={13} className="text-emerald-400" /> 影视作品
                                </div>
                                <div className="text-xl font-extrabold text-emerald-400">
                                    {stats.uniqueTotal} <span className="text-xs font-normal text-slate-400">部</span>
                                </div>
                                <div className="text-[10px] text-slate-500 mt-0.5">
                                    电影 {stats.movieCount} · 剧集 {stats.tvCount}
                                </div>
                            </div>

                            {/* Total Episodes */}
                            <div className={`${theme.cardBg} p-3.5 rounded-xl border flex flex-col justify-between`}>
                                <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5 mb-1">
                                    <Tv size={13} className="text-amber-400" /> 累计追剧
                                </div>
                                <div className="text-xl font-extrabold text-amber-400">
                                    {stats.totalEpisodesWatched} <span className="text-xs font-normal text-slate-400">集</span>
                                </div>
                                <div className="text-[10px] text-slate-500 mt-0.5">
                                    活跃 {stats.activeDays} 天
                                </div>
                            </div>
                        </div>

                        {/* 3. Favorite Masterpieces (High Rated) */}
                        {stats.topRated.length > 0 && (
                            <div className="relative z-10 mb-6">
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                                    <Star size={13} className="text-yellow-400 fill-yellow-400" /> 年度高分 / 挚爱精选
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    {stats.topRated.map(movie => (
                                        <div
                                            key={movie.id}
                                            className={`${theme.cardBg} p-3 rounded-xl border flex items-start gap-3`}
                                        >
                                            <div
                                                className="w-10 h-14 rounded-lg bg-cover bg-center shrink-0 border border-slate-700/60 shadow flex items-center justify-center"
                                                style={{
                                                    backgroundImage: movie.posterImage ? `url(${movie.posterImage})` : undefined,
                                                    backgroundColor: movie.posterColor || '#4f46e5'
                                                }}
                                            >
                                                {!movie.posterImage && (
                                                    <Film size={16} className="text-white/60" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start gap-1">
                                                    <h4 className="text-xs font-bold text-white truncate">{movie.title}</h4>
                                                    <span className="text-[10px] text-yellow-400 font-bold shrink-0">★ {movie.rating}</span>
                                                </div>
                                                <p className="text-[10px] text-slate-400 mt-0.5 truncate">{movie.genre || '影视'}</p>
                                                {movie.review ? (
                                                    <p className="text-[10px] text-slate-300 italic mt-1 line-clamp-1">"{movie.review}"</p>
                                                ) : (
                                                    <p className="text-[10px] text-slate-500 mt-1">{movie.year ? `${movie.year}年` : ''}</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 4. Top Genres & Custom Tags */}
                        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                            {/* Top Genres */}
                            {stats.topGenres.length > 0 && (
                                <div className={`${theme.cardBg} p-3.5 rounded-xl border`}>
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <BarChart3 size={13} className={theme.accentText} /> 偏好类型 TOP
                                    </div>
                                    <div className="space-y-1.5">
                                        {stats.topGenres.map(([genre, count], idx) => (
                                            <div key={genre} className="flex items-center justify-between text-xs">
                                                <span className="text-slate-300 flex items-center gap-1.5">
                                                    <span className="text-[10px] text-slate-500 w-3">{idx + 1}.</span>
                                                    {genre}
                                                </span>
                                                <span className="text-slate-400 font-semibold">{count} 部</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Top Custom Tags */}
                            <div className={`${theme.cardBg} p-3.5 rounded-xl border flex flex-col justify-between`}>
                                <div>
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <Tag size={13} className="text-indigo-400" /> 常用自定义标签
                                    </div>
                                    {stats.topTags.length > 0 ? (
                                        <div className="flex flex-wrap gap-1.5 mt-1">
                                            {stats.topTags.map(([tag, count]) => (
                                                <span
                                                    key={tag}
                                                    className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-950/80 text-indigo-300 border border-indigo-800/60"
                                                >
                                                    #{tag} ({count})
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-slate-500 italic mt-2">暂未添加自定义标签</p>
                                    )}
                                </div>

                                {/* Highlights row */}
                                <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-[11px] text-slate-400 flex flex-wrap gap-x-3 gap-y-1">
                                    {stats.topDirectors.length > 0 && (
                                        <span className="flex items-center gap-1">
                                            <span>🎬 最爱导演:</span>
                                            <span className="text-indigo-300 font-bold">{stats.topDirectors[0][0]}</span>
                                            <span className="text-[10px] text-slate-500">({stats.topDirectors[0][1]}部)</span>
                                        </span>
                                    )}
                                    {stats.topCast.length > 0 && (
                                        <span className="flex items-center gap-1">
                                            <span>🎭 心仪主演:</span>
                                            <span className="text-pink-300 font-bold">{stats.topCast[0][0]}</span>
                                            <span className="text-[10px] text-slate-500">({stats.topCast[0][1]}部)</span>
                                        </span>
                                    )}
                                    {stats.rewatchKing && (
                                        <span className="flex items-center gap-1">
                                            <Trophy size={11} className="text-amber-400" /> 重温之王: {stats.rewatchKing.title} ({stats.rewatchKing.iteration}刷)
                                        </span>
                                    )}
                                    {stats.speedDemon && (
                                        <span className="flex items-center gap-1">
                                            <Zap size={11} className="text-teal-400" /> 倍速高玩: {stats.speedDemon.speed}x
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* 5. Footer Watermark */}
                        <div className="relative z-10 pt-4 border-t border-slate-800/80 flex justify-between items-center text-xs text-slate-500">
                            <div className="flex items-center gap-2">
                                <Film size={14} className="text-indigo-400" />
                                <span className="font-semibold text-slate-400">CineLog · 记录每一段光影人生</span>
                            </div>
                            <span className="text-[10px] text-slate-600">Personal Movie Log</span>
                        </div>
                    </div>
                </div>

                {/* Footer Action Buttons */}
                <div
                    className="p-4 border-t border-slate-800 bg-slate-900/95 flex flex-wrap justify-between items-center gap-3 shrink-0"
                    style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)' }}
                >
                    <span className="text-xs text-slate-500 hidden sm:inline">
                        提示: 长图将以 300% 高清分辨率渲染导出
                    </span>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={handleCopyImage}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all touch-manipulation active:scale-95"
                        >
                            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                            {copied ? '已复制' : '复制图片'}
                        </button>

                        <button
                            type="button"
                            onClick={handleSaveImage}
                            disabled={isSaving}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-5 py-2.5 sm:py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 touch-manipulation active:scale-95"
                        >
                            {isSaving ? <Sparkles size={14} className="animate-spin" /> : <Download size={14} />}
                            {isSaving ? '正在生成...' : '保存高清长图'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

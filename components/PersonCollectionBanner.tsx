import React, { useState, useEffect, useMemo } from 'react';
import { Movie, MovieStatus } from '../types';
import { User, Film, Star, Trophy, Clock, X, Sparkles, CheckCircle2, Bookmark, Flame, Video, Globe, Plus, Check, RefreshCw, ExternalLink, ChevronRight, Award } from 'lucide-react';
import { normalizeTitle } from '../utils/titleNormalizer';
import { getCuratedPerson, CuratedPerson, FamousWork, buildUnifiedCareerWorks } from '../utils/personCatalog';
import {
    fetchPersonFilmography, TmdbPersonFilmographyResult, TmdbPersonCredit,
    getCachedPersonFilmographyMap, TMDB_FILMOGRAPHY_CACHE_KEY, describeFilmographyFailure
} from '../services/tmdbService';
import { localizeChineseMovieTitle, translateForeignTitleOnline } from '../utils/movieTitleZhMap';

interface PersonCollectionBannerProps {
    personName: string;
    allMovies: Movie[];
    onClose: () => void;
    currentFilterStatus?: string;
    onFilterStatusChange?: (status: string) => void;
    onQuickAddPlanning?: (title: string, meta?: { year?: string; genre?: string; director?: string; posterUrl?: string }) => void;
}

export const PersonCollectionBanner: React.FC<PersonCollectionBannerProps> = ({
    personName,
    allMovies,
    onClose,
    currentFilterStatus = '全部',
    onFilterStatusChange,
    onQuickAddPlanning
}) => {
    const [activeTab, setActiveTab] = useState<'local' | 'career'>('career');
    
    // 初始化时直接读取统一持久化缓存，确保与「影人宇宙」瞬间保持 100% 相同数据
    const [tmdbFilmography, setTmdbFilmography] = useState<TmdbPersonFilmographyResult | null>(() => {
        if (!personName || !personName.trim()) return null;
        const map = getCachedPersonFilmographyMap();
        return map[normalizeTitle(personName.trim())] || null;
    });
    const [isLoadingTmdb, setIsLoadingTmdb] = useState(false);
    const [isManualRefreshing, setIsManualRefreshing] = useState(false);
    const [hasAttemptedTmdb, setHasAttemptedTmdb] = useState(false);
    const [refreshToast, setRefreshToast] = useState<{ text: string; type: 'success' | 'warn' } | null>(null);

    const showBannerToast = (text: string, type: 'success' | 'warn' = 'success') => {
        setRefreshToast({ text, type });
        setTimeout(() => setRefreshToast(null), 3500);
    };

    // 手动强制穿透缓存刷新最新全网生平
    const handleManualRefresh = async () => {
        if (!personName || !personName.trim() || isManualRefreshing) return;
        setIsManualRefreshing(true);
        try {
            const res = await fetchPersonFilmography(personName.trim(), true);
            if (res && res.totalWorksCount > 0) {
                setTmdbFilmography(res);
                showBannerToast(`已成功从 TMDB 获取「${personName.trim()}」作品 ${res.totalWorksCount} 部`, 'success');
            } else if (res) {
                setTmdbFilmography(res);
                showBannerToast(`已完成「${personName.trim()}」生平校验`, 'success');
            } else {
                showBannerToast(`未在 TMDB 查询到「${personName.trim()}」更多作品`, 'warn');
            }
        } catch (err) {
            console.warn('刷新生平失败:', err);
            showBannerToast(describeFilmographyFailure(err, personName.trim()), 'warn');
        } finally {
            setIsManualRefreshing(false);
        }
    };

    // 1. 本地影库数据聚合与严格去重 (解决多刷片子算多部的问题)
    const localStats = useMemo(() => {
        if (!personName || !personName.trim()) return null;
        const normTarget = normalizeTitle(personName.trim());

        // 匹配与该影人相关的所有条目
        const matchedEntries = allMovies.filter(m => {
            const dirNorm = normalizeTitle(m.director || '');
            const castNorm = normalizeTitle(m.cast || '');
            return dirNorm.includes(normTarget) || castNorm.includes(normTarget);
        });

        // 按片名严格去重聚合
        const distinctMap = new Map<string, {
            primaryMovie: Movie;
            entries: Movie[];
            isWatched: boolean;
            isWatching: boolean;
            isPlanning: boolean;
            maxRating: number;
            totalIterations: number;
            totalMinutes: number;
        }>();

        matchedEntries.forEach(m => {
            const normTitle = normalizeTitle(m.title);
            const cur = distinctMap.get(normTitle) || {
                primaryMovie: m,
                entries: [],
                isWatched: false,
                isWatching: false,
                isPlanning: false,
                maxRating: 0,
                totalIterations: 0,
                totalMinutes: 0
            };

            cur.entries.push(m);
            if (m.status === MovieStatus.WATCHED) cur.isWatched = true;
            else if (m.status === MovieStatus.WATCHING) cur.isWatching = true;
            else if (m.status === MovieStatus.PLANNING && !cur.isWatched && !cur.isWatching) cur.isPlanning = true;

            if (m.rating && m.rating > cur.maxRating) cur.maxRating = m.rating;
            cur.totalIterations += (m.watchIteration || (m.status === MovieStatus.WATCHED ? 1 : 0));

            // 观影耗时
            if (m.duration && m.duration > 0) {
                const speed = m.playbackSpeed || 1.0;
                if (m.mediaType === 'tv') {
                    const ep = m.currentEpisode || m.totalEpisodes || 1;
                    cur.totalMinutes += Math.round((ep * m.duration) / speed);
                } else {
                    cur.totalMinutes += Math.round(m.duration / speed);
                }
            }

            distinctMap.set(normTitle, cur);
        });

        const distinctList = Array.from(distinctMap.values());
        const totalDistinctCount = distinctList.length; // 去重后真实作品数
        const watchedDistinctCount = distinctList.filter(d => d.isWatched).length;
        const watchingDistinctCount = distinctList.filter(d => d.isWatching).length;
        const planningDistinctCount = distinctList.filter(d => d.isPlanning).length;

        let masterpieceCount = 0;
        let ratedCount = 0;
        let totalRatingSum = 0;
        let totalTimeMinutes = 0;
        let totalRewatches = 0;
        let directorCount = 0;
        let castCount = 0;

        distinctList.forEach(d => {
            const m = d.primaryMovie;
            const isDir = normalizeTitle(m.director || '').includes(normTarget);
            const isActor = normalizeTitle(m.cast || '').includes(normTarget);
            if (isDir) directorCount++;
            if (isActor) castCount++;

            if (d.maxRating > 0) {
                totalRatingSum += d.maxRating;
                ratedCount++;
                if (d.maxRating >= 4.5) masterpieceCount++;
            }

            totalTimeMinutes += d.totalMinutes;
            totalRewatches += d.totalIterations;
        });

        const avgRating = ratedCount > 0 ? (totalRatingSum / ratedCount).toFixed(1) : '0';
        const hours = Math.floor(totalTimeMinutes / 60);
        const mins = totalTimeMinutes % 60;

        // 角色身份
        let role = '影人';
        if (directorCount > 0 && castCount > 0) role = '导演 / 主演';
        else if (directorCount > 0) role = '导演主创';
        else if (castCount > 0) role = '主演阵容';

        return {
            totalDistinctCount,
            watchedDistinctCount,
            watchingDistinctCount,
            planningDistinctCount,
            masterpieceCount,
            avgRating,
            totalRewatches,
            directorCount,
            castCount,
            role,
            distinctList,
            timeStr: hours > 0 ? `${hours}小时${mins > 0 ? `${mins}分` : ''}` : `${mins}分钟`
        };
    }, [personName, allMovies]);

    // 2. 匹配预置名导智库
    const curatedPerson = useMemo(() => {
        return getCuratedPerson(personName);
    }, [personName]);

    // 3. 异步获取 TMDB 全量生涯代表作（获取后写入统一缓存）
    useEffect(() => {
        let isMounted = true;
        const loadTmdb = async () => {
            if (!personName || !personName.trim()) return;
            setIsLoadingTmdb(true);
            try {
                const res = await fetchPersonFilmography(personName.trim());
                if (isMounted && res) {
                    setTmdbFilmography(res);
                    setHasAttemptedTmdb(true);
                }
            } catch (err) {
                if (isMounted) setHasAttemptedTmdb(true);
            } finally {
                if (isMounted) setIsLoadingTmdb(false);
            }
        };

        loadTmdb();
        return () => { isMounted = false; };
    }, [personName]);

    // 监听 storage 事件：当影人宇宙或其他 tab 更新了缓存，本组件自动同步，无需重新请求网络
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key !== TMDB_FILMOGRAPHY_CACHE_KEY || !personName) return;
            const map = getCachedPersonFilmographyMap();
            const norm = normalizeTitle(personName.trim());
            const updated = map[norm];
            if (updated) {
                setTmdbFilmography(updated);
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [personName]);

    // 4. 构建全网/生涯全量代表作清单（统一调用 buildUnifiedCareerWorks，与影人宇宙 100% 绝对一致）
    const careerWorks = useMemo(() => {
        const localWatchedMap = new Map<string, Movie>();
        allMovies.forEach(m => {
            localWatchedMap.set(normalizeTitle(m.title), m);
        });

        const targetNorm = normalizeTitle(personName);
        const personLocalMovies = allMovies.filter(m => {
            const dirNorm = normalizeTitle(m.director || '');
            const castNorm = normalizeTitle(m.cast || '');
            return dirNorm.includes(targetNorm) || castNorm.includes(targetNorm);
        });

        const unifiedList = buildUnifiedCareerWorks(
            personName,
            curatedPerson,
            tmdbFilmography?.credits,
            personLocalMovies
        );

        return unifiedList.map(item => {
            const norm = normalizeTitle(item.title);
            const local = localWatchedMap.get(norm);
            return {
                ...item,
                title: item.title,
                year: item.year || '',
                role: item.role || (item.localMovie?.director?.includes(personName) ? '导演' : '参演'),
                isWatched: local?.status === MovieStatus.WATCHED,
                isWatching: local?.status === MovieStatus.WATCHING,
                isPlanning: local?.status === MovieStatus.PLANNING,
                localMovie: local
            };
        });
    }, [personName, curatedPerson, tmdbFilmography, allMovies]);

    const [, setForceUpdate] = useState(0);

    // 自动补齐尚未汉化的外文片名
    useEffect(() => {
        let isMounted = true;
        const untranslated = careerWorks.filter(w => !/[\u4e00-\u9fa5]/.test(w.title));
        if (untranslated.length === 0) return;

        Promise.all(untranslated.map(async (w) => {
            const zh = await translateForeignTitleOnline(w.title);
            return { title: w.title, zh };
        })).then((results) => {
            if (isMounted && results.some(r => r.zh && r.zh !== r.title)) {
                setForceUpdate(c => c + 1);
            }
        });

        return () => { isMounted = false; };
    }, [careerWorks]);

    // 5. 计算全网/生涯代表作的全收集指标
    const careerStats = useMemo(() => {
        const total = careerWorks.length;
        const watched = careerWorks.filter(w => w.isWatched).length;
        const watching = careerWorks.filter(w => w.isWatching).length;
        const planning = careerWorks.filter(w => w.isPlanning).length;
        const percent = total > 0 ? Math.round((watched / total) * 100) : 0;

        // 全收集成就称号
        let achievement = { label: '探索者 · 生涯全收集起航', color: 'text-indigo-300 bg-indigo-500/15 border-indigo-500/30' };
        if (percent === 100 && total >= 3) {
            achievement = { label: '🏆 生涯大满贯 · 完美全收集', color: 'text-amber-300 bg-amber-500/20 border-amber-400/50 shadow-amber-500/20' };
        } else if (percent >= 75) {
            achievement = { label: '🥇 资深影迷 · 生涯阅片大户', color: 'text-yellow-300 bg-yellow-500/20 border-yellow-400/40' };
        } else if (percent >= 50) {
            achievement = { label: '🥈 进阶拥趸 · 生涯过半达成', color: 'text-emerald-300 bg-emerald-500/20 border-emerald-400/40' };
        } else if (watched > 0) {
            achievement = { label: '🥉 阅片探索者', color: 'text-cyan-300 bg-cyan-500/20 border-cyan-400/40' };
        }

        return {
            total,
            watched,
            watching,
            planning,
            percent,
            achievement
        };
    }, [careerWorks]);

    if (!localStats && careerWorks.length === 0) return null;

    return (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900/95 via-indigo-950/40 to-slate-900/95 border border-indigo-500/30 p-4 sm:p-5 shadow-2xl backdrop-blur-xl mb-6 animate-in fade-in slide-in-from-top-3 duration-300">
            {/* Background Ambient Glow */}
            <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-indigo-500/15 blur-3xl" />
            <div className="pointer-events-none absolute -left-10 -bottom-10 h-48 w-48 rounded-full bg-amber-500/10 blur-3xl" />

            <div className="relative z-10 flex flex-col gap-4">
                {/* Header Row: Person Info & Close Button */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-tr from-indigo-600 via-amber-500 to-yellow-400 p-0.5 shadow-lg shadow-indigo-500/20 flex items-center justify-center shrink-0">
                            {curatedPerson?.avatar || tmdbFilmography?.profileUrl ? (
                                <img
                                    src={curatedPerson?.avatar || tmdbFilmography?.profileUrl || ''}
                                    alt={personName}
                                    className="w-full h-full object-cover rounded-[10px]"
                                />
                            ) : (
                                <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center text-amber-300 font-bold text-lg">
                                    <User size={24} className="text-amber-400" />
                                </div>
                            )}
                        </div>

                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-base sm:text-xl font-black text-white tracking-tight flex items-center gap-1.5">
                                    <span>{personName}</span>
                                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-sans">
                                        {curatedPerson?.role || localStats?.role || '电影人'}
                                    </span>
                                </h2>
                                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border shadow-sm ${careerStats.achievement.color}`}>
                                    {careerStats.achievement.label}
                                </span>
                            </div>

                            <p className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                                {curatedPerson?.bio ? (
                                    <span className="text-slate-300 line-clamp-1 max-w-lg">{curatedPerson.bio}</span>
                                ) : (
                                    <>
                                        <span>本地已录入 <strong className="text-slate-200">{localStats?.totalDistinctCount || 0}</strong> 部 (去重)</span>
                                        {localStats?.totalRewatches && localStats.totalRewatches > localStats.totalDistinctCount ? (
                                            <span className="text-orange-400 font-semibold flex items-center gap-0.5">
                                                <Flame size={11} /> 累计重温 {localStats.totalRewatches} 刷
                                            </span>
                                        ) : null}
                                        {Number(localStats?.avgRating) > 0 && (
                                            <span className="text-amber-300 font-semibold flex items-center gap-0.5">
                                                <Star size={11} className="fill-amber-400 text-amber-400" /> 均分 {localStats?.avgRating}
                                            </span>
                                        )}
                                    </>
                                )}
                            </p>
                        </div>
                    </div>

                    {/* Action Area: Refresh & Close Button */}
                    <div className="flex items-center gap-2 shrink-0 relative">
                        {refreshToast && (
                            <div className="absolute right-0 top-12 z-50 animate-fade-in pointer-events-none whitespace-nowrap">
                                <div className={`px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xl border backdrop-blur-md ${
                                    refreshToast.type === 'success'
                                        ? 'bg-emerald-950/95 text-emerald-300 border-emerald-500/40 shadow-emerald-950/50'
                                        : 'bg-amber-950/95 text-amber-300 border-amber-500/40 shadow-amber-950/50'
                                }`}>
                                    <span>{refreshToast.type === 'success' ? '✅ ' : '⚠️ '}{refreshToast.text}</span>
                                </div>
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={handleManualRefresh}
                            disabled={isManualRefreshing || isLoadingTmdb}
                            className="rounded-xl bg-indigo-950/60 hover:bg-indigo-900/80 p-2 text-indigo-300 hover:text-white transition-all active:scale-95 border border-indigo-500/30 shadow-sm flex items-center gap-1.5 text-xs font-medium"
                            title="强制联网从 TMDB 获取最新上映或立项作品"
                        >
                            <RefreshCw size={14} className={isManualRefreshing || isLoadingTmdb ? 'animate-spin text-amber-400' : ''} />
                            <span className="hidden sm:inline">{isManualRefreshing || isLoadingTmdb ? '更新中...' : '更新生平'}</span>
                        </button>

                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl bg-slate-800/80 hover:bg-slate-700 p-2 text-slate-400 hover:text-white transition-all active:scale-95 border border-slate-700/60 shadow-sm shrink-0 flex items-center gap-1 text-xs"
                            title="退出影人专栏，查看全部作品"
                        >
                            <X size={16} />
                            <span className="hidden sm:inline">退出专栏</span>
                        </button>
                    </div>
                </div>

                {/* Dual-Track Progress Section (本地影库 vs 全网生涯代表作全收集) */}
                <div className="space-y-3 bg-slate-950/70 p-3.5 sm:p-4 rounded-xl border border-slate-800/80 shadow-inner">
                    {/* Top Progress Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/60 pb-2.5">
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setActiveTab('career')}
                                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                    activeTab === 'career'
                                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20'
                                        : 'bg-slate-800 text-slate-300 hover:text-white'
                                }`}
                            >
                                <Globe size={13} />
                                生涯代表作全景 ({careerStats.watched}/{careerStats.total} 部)
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('local')}
                                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                    activeTab === 'local'
                                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                                        : 'bg-slate-800 text-slate-300 hover:text-white'
                                }`}
                            >
                                <Film size={13} />
                                本地影库 ({localStats?.watchedDistinctCount || 0}/{localStats?.totalDistinctCount || 0} 部)
                            </button>
                        </div>

                        <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                            <Sparkles size={13} className="text-amber-400" />
                            {activeTab === 'career' ? (
                                <span>生涯代表作全收集率: <strong className="text-amber-300 text-sm">{careerStats.percent}%</strong> ({careerStats.watched}/{careerStats.total}部)</span>
                            ) : (
                                <span>本地已看: <strong className="text-indigo-300 text-sm">{localStats?.watchedDistinctCount || 0}</strong> / {localStats?.totalDistinctCount || 0} 部去重</span>
                            )}
                        </div>
                    </div>

                    {/* Glow Progress Bar */}
                    <div className="w-full bg-slate-800/90 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
                        <div
                            className={`h-full rounded-full transition-all duration-700 ease-out shadow-[0_0_12px_rgba(251,191,36,0.5)] ${
                                activeTab === 'career'
                                    ? 'bg-gradient-to-r from-indigo-500 via-amber-400 to-yellow-400'
                                    : 'bg-gradient-to-r from-indigo-500 to-fuchsia-500'
                            }`}
                            style={{
                                width: `${activeTab === 'career' ? careerStats.percent : (localStats?.totalDistinctCount ? Math.round((localStats.watchedDistinctCount / localStats.totalDistinctCount) * 100) : 0)}%`
                            }}
                        />
                    </div>

                    {/* Stats Metrics Row */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 text-[11px] text-slate-400">
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="flex items-center gap-1 text-emerald-400 font-medium">
                                <CheckCircle2 size={12} /> 已看 {careerStats.watched} 部
                            </span>
                            {careerStats.watching > 0 && (
                                <span className="flex items-center gap-1 text-indigo-400 font-medium">
                                    <Flame size={12} /> 追剧中 {careerStats.watching} 部
                                </span>
                            )}
                            {careerStats.planning > 0 && (
                                <span className="flex items-center gap-1 text-amber-400 font-medium">
                                    <Bookmark size={12} /> 想看 {careerStats.planning} 部
                                </span>
                            )}
                            {localStats?.masterpieceCount ? (
                                <span className="flex items-center gap-1 text-yellow-300 font-bold">
                                    <Trophy size={12} /> 殿堂神作 {localStats.masterpieceCount} 部
                                </span>
                            ) : null}
                            {localStats?.totalRewatches && localStats.totalRewatches > localStats.totalDistinctCount ? (
                                <span className="flex items-center gap-1 text-orange-300 font-medium">
                                    🔥 累计重温 {localStats.totalRewatches} 刷
                                </span>
                            ) : null}
                        </div>

                        {localStats?.timeStr && localStats.timeStr !== '0分钟' && (
                            <span className="text-slate-400 flex items-center gap-1">
                                <Clock size={11} className="text-indigo-400" /> 本地耗时 {localStats.timeStr}
                            </span>
                        )}
                    </div>
                </div>

                {/* Career Masterpieces Horizontal Visual Collector (全量生涯代表作全景打卡清单) */}
                {activeTab === 'career' && (
                    <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                                <Award size={13} className="text-amber-400" />
                                {personName} 生涯精选代表作清单 ({careerWorks.length} 部)
                            </span>
                            {isLoadingTmdb && (
                                <span className="text-[11px] text-indigo-400 flex items-center gap-1 animate-pulse">
                                    <RefreshCw size={11} className="animate-spin" /> TMDB 智库同步中...
                                </span>
                            )}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 max-h-72 overflow-y-auto custom-scrollbar p-1">
                            {careerWorks.map((work) => (
                                <div
                                    key={work.title + work.year}
                                    className={`relative flex flex-col justify-between p-2.5 rounded-xl border transition-all ${
                                        work.isWatched
                                            ? 'bg-slate-900/90 border-emerald-500/40 shadow-sm'
                                            : work.isWatching
                                                ? 'bg-slate-900/90 border-indigo-500/40'
                                                : work.isPlanning
                                                    ? 'bg-slate-900/90 border-amber-500/40'
                                                    : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                                    }`}
                                >
                                    <div>
                                        <div className="flex items-start justify-between gap-1 mb-1">
                                            <span className="text-[10px] text-slate-500 font-mono font-medium">{work.year || '未定档'}</span>
                                            {work.isWatched ? (
                                                <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/40 px-1 py-0.2 rounded flex items-center gap-0.5">
                                                    <Check size={9} /> 已看
                                                </span>
                                            ) : work.isWatching ? (
                                                <span className="text-[9px] font-bold text-indigo-300 bg-indigo-950/80 border border-indigo-500/40 px-1 py-0.2 rounded">
                                                    在看
                                                </span>
                                            ) : work.isPlanning ? (
                                                <span className="text-[9px] font-bold text-amber-300 bg-amber-950/80 border border-amber-500/40 px-1 py-0.2 rounded">
                                                    想看
                                                </span>
                                            ) : (
                                                <span className="text-[9px] text-slate-500 bg-slate-800/60 px-1 py-0.2 rounded">
                                                    未收录
                                                </span>
                                            )}
                                        </div>

                                        <h4 className="text-xs font-bold text-slate-200 line-clamp-1" title={work.title}>
                                            {work.title}
                                        </h4>
                                        <div className="text-[10px] text-slate-400 mt-0.5 flex items-center justify-between">
                                            <span>{work.role || '代表作'}</span>
                                            {work.rating && work.rating > 0 ? (
                                                <span className="text-amber-400 font-semibold flex items-center gap-0.5">
                                                    ★ {work.rating}
                                                </span>
                                            ) : null}
                                        </div>
                                    </div>

                                    {/* Action Button: Quick Add if not recorded */}
                                    {!work.isWatched && !work.isWatching && !work.isPlanning && onQuickAddPlanning && (
                                        <button
                                            type="button"
                                            onClick={() => onQuickAddPlanning(work.title, {
                                                year: work.year,
                                                director: work.role.includes('导') ? personName : undefined,
                                                posterUrl: work.posterUrl
                                            })}
                                            className="mt-2 w-full py-1 rounded-lg bg-indigo-600/80 hover:bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center gap-0.5 transition-all active:scale-95 shadow-sm"
                                        >
                                            <Plus size={11} /> 收入想看
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Quick Sub-filter Pills for Local Movie List */}
                {onFilterStatusChange && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-800/60">
                        <span className="text-xs text-slate-400 mr-1">本地影库筛选：</span>
                        {[
                            { label: '全部作品', val: '全部', count: localStats?.totalDistinctCount || 0 },
                            { label: '已看', val: MovieStatus.WATCHED, count: localStats?.watchedDistinctCount || 0 },
                            ...(localStats?.watchingDistinctCount ? [{ label: '追剧中', val: MovieStatus.WATCHING, count: localStats.watchingDistinctCount }] : []),
                            ...(localStats?.planningDistinctCount ? [{ label: '想看', val: MovieStatus.PLANNING, count: localStats.planningDistinctCount }] : []),
                        ].map(pill => (
                            <button
                                key={pill.val}
                                type="button"
                                onClick={() => onFilterStatusChange(pill.val)}
                                className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all border touch-manipulation active:scale-95 ${
                                    currentFilterStatus === pill.val
                                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm font-bold'
                                        : 'bg-slate-800/80 border-slate-700/80 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                                }`}
                            >
                                {pill.label} ({pill.count})
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

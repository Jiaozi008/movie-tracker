import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Movie, MovieStatus } from '../types';
import { CURATED_PERSON_CATALOG, getCuratedPerson, CuratedPerson, buildUnifiedCareerWorks } from '../utils/personCatalog';
import { normalizeTitle } from '../utils/titleNormalizer';
import {
    fetchPersonFilmography, getCachedPersonFilmographyMap, saveCachedPersonFilmography, TMDB_FILMOGRAPHY_CACHE_KEY,
    PersonFilmographyError, FilmographyFailureReason, describeFilmographyFailure, getFilmographyFailureHint
} from '../services/tmdbService';
import {
    User, Film, Trophy, Award, Sparkles, Star, Flame, ArrowRight,
    Search, CheckCircle2, Bookmark, Plus, X, ChevronRight, BarChart3,
    Compass, Eye, Check, Globe, RefreshCw, Loader2, Play
} from 'lucide-react';

/** 从失败原因计数中挑出占比最高的真实失败原因（排除「TMDB 未收录」这一正常结果） */
function dominantFailureReason(counts: Map<FilmographyFailureReason, number>): FilmographyFailureReason {
    let best: FilmographyFailureReason = 'unknown';
    let bestCount = 0;
    counts.forEach((count, reason) => {
        if (reason === 'not_found') return;
        if (count > bestCount) {
            best = reason;
            bestCount = count;
        }
    });
    return best;
}

interface PersonUniverseModalProps {
    isOpen: boolean;
    onClose: () => void;
    movies: Movie[];
    onSelectPerson: (personName: string) => void;
    onQuickAddPlanning?: (title: string, meta?: { year?: string; genre?: string; director?: string; posterUrl?: string }) => void;
}

export const PersonUniverseModal: React.FC<PersonUniverseModalProps> = ({
    isOpen,
    onClose,
    movies,
    onSelectPerson,
    onQuickAddPlanning
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState<'all' | 'curated' | 'completed' | 'in_progress'>('all');
    const [addedTitles, setAddedTitles] = useState<Set<string>>(new Set());

    // 本地持久化 TMDB 生平作品真实基准缓存（统一读取共享缓存）
    const [tmdbWorksMap, setTmdbWorksMap] = useState<Record<string, any>>(() => {
        return getCachedPersonFilmographyMap();
    });

    const [syncingPersons, setSyncingPersons] = useState<Set<string>>(new Set());
    const [isBatchSyncing, setIsBatchSyncing] = useState(false);
    const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; currentName: string } | null>(null);
    const cancelBatchRef = useRef(false);
    const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'warn' | 'info' } | null>(null);

    const showToast = useCallback((text: string, type: 'success' | 'warn' | 'info' = 'success') => {
        setToastMessage({ text, type });
        setTimeout(() => {
            setToastMessage(prev => prev?.text === text ? null : prev);
        }, 3500);
    }, []);

    // 联网同步单人 TMDB 生平作品 (支持强制穿透缓存拉取最新)
    const handleSyncPersonWorks = useCallback(async (personName: string, force = true) => {
        if (!personName || !personName.trim()) return;
        const norm = normalizeTitle(personName.trim());
        setSyncingPersons(prev => new Set([...prev, norm]));

        try {
            const res = await fetchPersonFilmography(personName.trim(), force);
            if (res && res.totalWorksCount > 0) {
                setTmdbWorksMap(getCachedPersonFilmographyMap());
                showToast(`已成功获取「${personName.trim()}」全网生平代表作共 ${res.totalWorksCount} 部`, 'success');
            } else if (res) {
                setTmdbWorksMap(getCachedPersonFilmographyMap());
                showToast(`已校验「${personName.trim()}」生平数据`, 'info');
            } else {
                showToast(`未在 TMDB 查询到「${personName.trim()}」的新作品，已保留现有基准`, 'warn');
            }
        } catch (err) {
            console.warn('同步影人生平失败:', err);
            showToast(describeFilmographyFailure(err, personName.trim()), 'warn');
        } finally {
            setSyncingPersons(prev => {
                const next = new Set(prev);
                next.delete(norm);
                return next;
            });
        }
    }, [showToast]);

    // 1. 汇总所有导演与影人数据
    const directorStatsList = useMemo(() => {
        // 构建本地片名规范化集合（按片名去重）
        const watchedTitlesSet = new Set(
            movies.filter(m => m.status === MovieStatus.WATCHED).map(m => normalizeTitle(m.title))
        );
        const watchingTitlesSet = new Set(
            movies.filter(m => m.status === MovieStatus.WATCHING).map(m => normalizeTitle(m.title))
        );
        const planningTitlesSet = new Set(
            movies.filter(m => m.status === MovieStatus.PLANNING).map(m => normalizeTitle(m.title))
        );

        // 收集所有在本地库中出现过的影人（全面包含导演与主演/参演）
        const localPersonMap = new Map<string, Movie[]>();
        movies.forEach(m => {
            const dirs = (m.director || '').split(/[,，/、|]+/).map(d => d.trim()).filter(Boolean);
            const casts = (m.cast || '').split(/[,，/、|]+/).map(c => c.trim()).filter(Boolean);
            const allNames = new Set([...dirs, ...casts]);
            allNames.forEach(name => {
                if (!localPersonMap.has(name)) {
                    localPersonMap.set(name, []);
                }
                localPersonMap.get(name)!.push(m);
            });
        });

        // 融合名导智库 + 本地影人
        const allDirectorNames = new Set<string>();
        CURATED_PERSON_CATALOG.forEach(p => allDirectorNames.add(p.name));
        localPersonMap.forEach((_, name) => allDirectorNames.add(name));

        const list = Array.from(allDirectorNames).map(name => {
            const normName = normalizeTitle(name);
            const curated = getCuratedPerson(name);
            const localMovies = localPersonMap.get(name) || [];
            const tmdbData = tmdbWorksMap[normName];

            // 去重计算本地已看片目
            const uniqueWatchedTitles = new Set<string>();
            let repeatCountTotal = 0;
            let totalRatingSum = 0;
            let ratedCount = 0;

            localMovies.forEach(m => {
                const norm = normalizeTitle(m.title);
                if (m.status === MovieStatus.WATCHED) {
                    uniqueWatchedTitles.add(norm);
                    repeatCountTotal += (m.watchIteration || 1);
                    if (m.rating && m.rating > 0) {
                        totalRatingSum += m.rating;
                        ratedCount++;
                    }
                }
            });

            const localWatchedCount = uniqueWatchedTitles.size;

            // 科学基准计算：名导智库代表作 > TMDB 全网生平作品数 > 本地未校验
            const isCurated = Boolean(curated && curated.works && curated.works.length > 0);
            const hasTmdb = Boolean(tmdbData && (tmdbData.totalWorksCount > 0 || (tmdbData.credits && tmdbData.credits.length > 0)));
            const hasVerifiedBenchmark = isCurated || hasTmdb;

            // 统一调用 buildUnifiedCareerWorks 构建代表作全景清单（与专栏详情页 100% 绝对一致）
            const unifiedWorks = buildUnifiedCareerWorks(name, curated, tmdbData?.credits, localMovies);

            const totalWorksBenchmark = hasVerifiedBenchmark ? unifiedWorks.length : localWatchedCount;
            const benchmarkSource: 'curated' | 'tmdb' | 'local_unverified' = isCurated ? 'curated' : (hasTmdb ? 'tmdb' : 'local_unverified');

            // 收集率计算：必须基于已验证基准，纯本地非智库影人不可盲目设为 100%
            const percent = hasVerifiedBenchmark && totalWorksBenchmark > 0
                ? Math.min(100, Math.round((localWatchedCount / totalWorksBenchmark) * 100))
                : 0;

            const avgRating = ratedCount > 0 ? (totalRatingSum / ratedCount).toFixed(1) : null;

            // 找出未看代表作推荐（从统一代表作清单中提取）
            const uncollectedWorks = unifiedWorks
                .filter(w => !watchedTitlesSet.has(normalizeTitle(w.title)) && !watchingTitlesSet.has(normalizeTitle(w.title)))
                .map(w => ({
                    ...w,
                    isPlanning: planningTitlesSet.has(normalizeTitle(w.title))
                }));

            // 段位称号（只有在已验证权威基准下，且至少3部以上，才能评定为真正的大满贯）
            let badge = { text: '探索起步', color: 'text-zinc-400 bg-zinc-800/60 border-zinc-700', isGrandSlam: false };
            if (hasVerifiedBenchmark) {
                if (percent === 100 && totalWorksBenchmark >= 3) {
                    badge = { text: '🏆 生涯大满贯', color: 'text-amber-300 bg-amber-500/20 border-amber-500/40 shadow-sm shadow-amber-500/20', isGrandSlam: true };
                } else if (percent >= 75) {
                    badge = { text: '🥇 资深影迷', color: 'text-yellow-300 bg-yellow-500/20 border-yellow-500/40', isGrandSlam: false };
                } else if (percent >= 50) {
                    badge = { text: '🥈 进阶拥趸', color: 'text-emerald-300 bg-emerald-500/20 border-emerald-500/40', isGrandSlam: false };
                } else if (localWatchedCount > 0) {
                    badge = { text: '🥉 阅片启蒙', color: 'text-cyan-300 bg-cyan-500/20 border-cyan-500/40', isGrandSlam: false };
                }
            } else {
                badge = { text: `📚 本地收录 ${localWatchedCount} 部`, color: 'text-indigo-300 bg-indigo-500/20 border-indigo-500/40', isGrandSlam: false };
            }

            return {
                name,
                curated,
                localMoviesCount: localMovies.length,
                localWatchedCount,
                totalWorksBenchmark,
                percent,
                hasVerifiedBenchmark,
                benchmarkSource,
                repeatCountTotal,
                avgRating,
                uncollectedWorks,
                badge,
                isCurated,
                description: curated ? curated.bio : `私人影视库收录影人`
            };
        });

        // 排序规则：已看部数倒序 > 收集率倒序 > 总刷数倒序
        return list.sort((a, b) => {
            if (b.localWatchedCount !== a.localWatchedCount) {
                return b.localWatchedCount - a.localWatchedCount;
            }
            if (b.percent !== a.percent) {
                return b.percent - a.percent;
            }
            return b.repeatCountTotal - a.repeatCountTotal;
        });
    }, [movies, tmdbWorksMap]);

    // 待联网校验的影人名单
    const unverifiedDirectors = useMemo(() => {
        return directorStatsList.filter(d => !d.hasVerifiedBenchmark && d.localWatchedCount > 0);
    }, [directorStatsList]);

    // 一键批量校验或全量更新所有影人生平
    const handleBatchSyncFilmography = async (forceAll = false) => {
        const targets = forceAll ? directorStatsList : (unverifiedDirectors.length > 0 ? unverifiedDirectors : directorStatsList);
        if (targets.length === 0 || isBatchSyncing) return;

        setIsBatchSyncing(true);
        cancelBatchRef.current = false;
        setBatchProgress({ current: 0, total: targets.length, currentName: targets[0].name });

        let succeeded = 0;
        let processed = 0;
        const reasonCounts = new Map<FilmographyFailureReason, number>();
        const countReason = (reason: FilmographyFailureReason) => {
            reasonCounts.set(reason, (reasonCounts.get(reason) || 0) + 1);
        };

        for (let i = 0; i < targets.length; i++) {
            if (cancelBatchRef.current) break;
            const target = targets[i];
            processed++;
            setBatchProgress({ current: i + 1, total: targets.length, currentName: target.name });

            try {
                const res = await fetchPersonFilmography(target.name.trim(), forceAll);
                if (res) {
                    setTmdbWorksMap(getCachedPersonFilmographyMap());
                    succeeded++;
                } else {
                    // TMDB 未收录该影人，属正常结果，不计入失败
                    countReason('not_found');
                }
            } catch (err) {
                const reason = err instanceof PersonFilmographyError ? err.reason : 'unknown';
                countReason(reason);
                console.warn(`校验 ${target.name} 失败:`, err);
            }

            // 轻微延迟避免频率限制
            await new Promise(r => setTimeout(r, 120));
        }

        setIsBatchSyncing(false);
        setBatchProgress(null);

        const wasCancelled = cancelBatchRef.current;
        if (wasCancelled) {
            showToast(`已取消批量校验，本次已完成 ${processed}/${targets.length} 人（成功 ${succeeded} 人）`, 'info');
            return;
        }

        const failed = processed - succeeded - (reasonCounts.get('not_found') || 0);
        const notFound = reasonCounts.get('not_found') || 0;
        const verb = forceAll ? '全量刷新' : '全网校验';
        const summary = [`成功 ${succeeded} 人`];
        if (failed > 0) summary.push(`失败 ${failed} 人`);
        if (notFound > 0) summary.push(`${notFound} 人 TMDB 未收录`);

        if (failed === 0) {
            showToast(`${verb}完成：${summary.join('，')}`, 'success');
        } else {
            const hint = getFilmographyFailureHint(dominantFailureReason(reasonCounts));
            showToast(`${verb}未完成（共 ${targets.length} 人）：${summary.join('，')}。主要问题：${hint}`, 'warn');
        }
    };

    const handleCancelBatchSync = () => {
        cancelBatchRef.current = true;
    };

    // 2. 筛选过滤（真实大满贯必须满足已验证权威基准 + 100% 收集 + 至少3部）
    const filteredList = useMemo(() => {
        return directorStatsList.filter(item => {
            const matchesSearch = !searchTerm.trim() || item.name.toLowerCase().includes(searchTerm.trim().toLowerCase());
            if (!matchesSearch) return false;

            if (filterCategory === 'curated') return item.isCurated;
            if (filterCategory === 'completed') return item.hasVerifiedBenchmark && item.percent === 100 && item.localWatchedCount >= 3;
            if (filterCategory === 'in_progress') return item.hasVerifiedBenchmark ? (item.percent > 0 && item.percent < 100) : (item.localWatchedCount > 0);
            return true;
        });
    }, [directorStatsList, searchTerm, filterCategory]);

    const handleQuickAdd = (title: string, directorName: string, year?: string, genre?: string) => {
        if (onQuickAddPlanning) {
            onQuickAddPlanning(title, { director: directorName, year, genre });
            setAddedTitles(prev => new Set([...prev, title]));
        }
    };

    if (!isOpen) return null;

    const completedGrandSlamCount = directorStatsList.filter(d => d.hasVerifiedBenchmark && d.percent === 100 && d.localWatchedCount >= 3).length;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-fade-in">
            <div className="relative w-full h-full sm:h-auto sm:max-w-5xl sm:max-h-[90vh] flex flex-col bg-zinc-950 sm:border sm:border-zinc-800 rounded-none sm:rounded-2xl shadow-2xl shadow-black/80 overflow-hidden text-zinc-100">
                
                {/* 顶部标题栏 */}
                <div className="flex items-center justify-between px-3.5 sm:px-6 py-2.5 sm:py-3.5 border-b border-zinc-800/80 bg-zinc-900/60 shrink-0">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-amber-500/20 to-indigo-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                            <Trophy className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 sm:gap-2">
                                <h2 className="text-sm sm:text-base font-bold text-zinc-100 tracking-wide truncate">
                                    🎬 影人宇宙
                                </h2>
                                <span className="hidden sm:inline-flex px-2 py-0.5 text-[11px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/25 rounded-full whitespace-nowrap">
                                    真实全量资产
                                </span>
                            </div>
                            <p className="hidden sm:block text-xs text-zinc-400 mt-0.5 line-clamp-1">
                                权威智库与 TMDB 全网代表作真实基准 · 彻底杜绝伪大满贯 · 激发系统性阅片与全收集
                            </p>
                        </div>
                    </div>

                    {/* 右侧操作区：置顶一键校验/全量刷新 + 关闭按钮 */}
                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-2">
                        {!isBatchSyncing && (
                            unverifiedDirectors.length > 0 ? (
                                <button
                                    onClick={() => handleBatchSyncFilmography(false)}
                                    className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-amber-500/20 to-indigo-500/20 hover:from-amber-500/30 hover:to-indigo-500/30 text-amber-300 border border-amber-500/40 shadow-sm transition-all whitespace-nowrap active:scale-95"
                                    title="一键联网拉取所有未校验影人的 TMDB 生涯全量作品"
                                >
                                    <Globe className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                    <span>校验全网 <span className="text-amber-400/90 font-mono">({unverifiedDirectors.length})</span></span>
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleBatchSyncFilmography(true)}
                                    className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-300 hover:text-amber-300 border border-zinc-700/60 shadow-sm transition-all whitespace-nowrap active:scale-95"
                                    title="强制重新从 TMDB 拉取所有影人的最新上映与立项作品"
                                >
                                    <RefreshCw className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                    <span>全量刷新</span>
                                </button>
                            )
                        )}

                        {isBatchSyncing && batchProgress && (
                            <div className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg text-xs bg-amber-500/10 border border-amber-500/30 text-amber-300 animate-pulse whitespace-nowrap">
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400 shrink-0" />
                                <span className="font-mono text-[11px]">{batchProgress.current}/{batchProgress.total}</span>
                                <button onClick={handleCancelBatchSync} className="ml-1 text-[10px] text-zinc-400 hover:text-zinc-200 underline">取消</button>
                            </div>
                        )}

                        <button
                            onClick={onClose}
                            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors min-h-[34px] min-w-[34px] flex items-center justify-center"
                            title="关闭"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* 搜索与分类 Tab 工具栏 */}
                <div className="px-3.5 sm:px-6 py-2.5 sm:py-3 border-b border-zinc-800/60 bg-zinc-900/30 flex flex-col gap-2 shrink-0">
                    {/* 搜索框 */}
                    <div className="relative w-full">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="搜索导演或影人..."
                            className="w-full pl-9 pr-8 py-2 bg-zinc-900 border border-zinc-700/60 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition-colors"
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200">
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {/* 分类 Tabs：4等分网格满屏贴合，绝无横向拉动条 */}
                    <div className="grid grid-cols-4 gap-1 sm:gap-2 w-full">
                        {[
                            { key: 'all', label: '全部', count: directorStatsList.length },
                            { key: 'curated', label: '智库', icon: '🌟', count: directorStatsList.filter(d => d.isCurated).length },
                            { key: 'in_progress', label: '进行中', icon: '⏳', count: directorStatsList.filter(d => d.hasVerifiedBenchmark ? (d.percent > 0 && d.percent < 100) : (d.localWatchedCount > 0)).length },
                            { key: 'completed', label: '大满贯', icon: '🏆', count: completedGrandSlamCount },
                        ].map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setFilterCategory(tab.key as any)}
                                className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg text-xs font-medium transition-all text-center truncate ${
                                    filterCategory === tab.key
                                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold shadow-sm shadow-amber-500/10'
                                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 border border-zinc-800/60 bg-zinc-900/40'
                                }`}
                            >
                                <span className="truncate">
                                    {tab.label} <span className="opacity-75 font-mono text-[11px]">({tab.count})</span>
                                </span>
                            </button>
                        ))}
                    </div>
                </div>



                {/* 影人排行榜卡片网格 */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-4 custom-scrollbar pb-[calc(env(safe-area-inset-bottom)+3.5rem)] sm:pb-6">
                    {filteredList.length === 0 ? (
                        <div className="py-16 text-center text-zinc-500">
                            <Compass className="w-12 h-12 mx-auto mb-3 opacity-30 text-amber-400" />
                            <p className="text-base font-medium">未找到匹配的影人谱系</p>
                            <p className="text-xs text-zinc-500 mt-1">尝试输入其他导演姓名，或切换分类筛选</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredList.map((item) => {
                                const norm = normalizeTitle(item.name);
                                const isSyncing = syncingPersons.has(norm);

                                return (
                                    <div
                                        key={item.name}
                                        className="group relative flex flex-col justify-between p-3 sm:p-4 bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/80 hover:border-amber-500/30 rounded-xl transition-all duration-300 shadow-sm"
                                    >
                                        {/* 影人头部信息 */}
                                        <div>
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                    <div className="w-9 h-9 shrink-0 rounded-lg bg-zinc-800 flex items-center justify-center text-amber-400 border border-zinc-700/60 font-bold">
                                                        <User className="w-4 h-4" />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                                            <h3
                                                                onClick={() => {
                                                                    onClose();
                                                                    onSelectPerson(item.name);
                                                                }}
                                                                className="font-bold text-sm text-zinc-100 hover:text-amber-400 cursor-pointer transition-colors truncate"
                                                            >
                                                                {item.name}
                                                            </h3>
                                                            {item.isCurated && (
                                                                <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded">
                                                                    智库认证
                                                                </span>
                                                            )}
                                                            {!item.isCurated && item.hasVerifiedBenchmark && (
                                                                <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded">
                                                                    TMDB认证
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-zinc-400 mt-0.5 truncate">
                                                            {item.description}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* 段位成就徽章 - 强制单行绝对不折行 */}
                                                <div className="shrink-0 flex flex-col items-end">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border transition-all whitespace-nowrap shrink-0 ${item.badge.color}`}>
                                                        {item.badge.text}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* 收集进度条与基准说明 */}
                                            <div className="mt-4">
                                                <div className="flex items-center justify-between text-xs mb-1.5">
                                                    <span className="text-zinc-400">
                                                        {item.hasVerifiedBenchmark ? (
                                                            <>
                                                                代表作全收集: <strong className="text-zinc-200 font-semibold">{item.localWatchedCount}</strong> / {item.totalWorksBenchmark} 部
                                                            </>
                                                        ) : (
                                                            <>
                                                                本地已收录: <strong className="text-zinc-200 font-semibold">{item.localWatchedCount}</strong> 部
                                                                <span className="text-zinc-500 ml-1 text-[11px]">(全量待校验)</span>
                                                            </>
                                                        )}
                                                        {item.repeatCountTotal > item.localWatchedCount && (
                                                            <span className="text-amber-400/90 ml-1.5">
                                                                (🔥 {item.repeatCountTotal} 刷)
                                                            </span>
                                                        )}
                                                    </span>

                                                    {item.hasVerifiedBenchmark ? (
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleSyncPersonWorks(item.name, true);
                                                                }}
                                                                disabled={isSyncing}
                                                                className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-amber-400 hover:bg-zinc-800/80 px-1.5 py-0.5 rounded transition-all"
                                                                title={`强制更新「${item.name}」的全网最新生平与作品`}
                                                            >
                                                                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-amber-400' : ''}`} />
                                                                <span>{isSyncing ? '更新中' : '更新'}</span>
                                                            </button>
                                                            <span className="font-bold text-amber-400">
                                                                {item.percent}%
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleSyncPersonWorks(item.name, true)}
                                                            disabled={isSyncing}
                                                            className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 hover:underline transition-colors shrink-0"
                                                            title="联网获取 TMDB 生平全量作品以计算真实收集率"
                                                        >
                                                            {isSyncing ? (
                                                                <>
                                                                    <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
                                                                    <span>校验中...</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Globe className="w-3 h-3" />
                                                                    <span>校验全网生平</span>
                                                                </>
                                                            )}
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-500 ${
                                                            item.hasVerifiedBenchmark
                                                                ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                                                                : 'bg-indigo-600/70'
                                                        }`}
                                                        style={{ width: `${item.hasVerifiedBenchmark ? item.percent : Math.min(100, item.localWatchedCount * 20)}%` }}
                                                    />
                                                </div>
                                            </div>

                                            {/* 未看神作雷达 */}
                                            {item.uncollectedWorks.length > 0 && (
                                                <div className="mt-3.5 pt-3 border-t border-zinc-800/60">
                                                    <div className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1 mb-2">
                                                        <Sparkles className="w-3 h-3 text-amber-400" />
                                                        <span>尚未收录代表作 ({item.uncollectedWorks.length} 部):</span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {item.uncollectedWorks.slice(0, 4).map(work => {
                                                            const isAdded = addedTitles.has(work.title) || work.isPlanning;
                                                            return (
                                                                <div
                                                                    key={work.title}
                                                                    className="flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-800/80 border border-zinc-700/60 text-xs text-zinc-300"
                                                                >
                                                                    <span className="font-medium text-zinc-200">{work.title}</span>
                                                                    {work.year && <span className="text-[10px] text-zinc-400">({work.year})</span>}
                                                                    <button
                                                                        onClick={() => handleQuickAdd(work.title, item.name, work.year, work.genre)}
                                                                        disabled={isAdded}
                                                                        className={`p-0.5 rounded transition-colors ${
                                                                            isAdded
                                                                                ? 'text-emerald-400 bg-emerald-500/10'
                                                                                : 'text-amber-400 hover:text-amber-200 hover:bg-amber-500/20'
                                                                        }`}
                                                                        title={isAdded ? '已在想看中' : '加入想看'}
                                                                    >
                                                                        {isAdded ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                                                                    </button>
                                                                </div>
                                                            );
                                                        })}
                                                        {item.uncollectedWorks.length > 4 && (
                                                            <span className="text-[11px] text-zinc-400 self-center">
                                                                +{item.uncollectedWorks.length - 4} 更多
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* 卡片底部操作 */}
                                        <div className="mt-4 pt-3 border-t border-zinc-800/50 flex items-center justify-between">
                                            <div className="flex items-center gap-3 text-xs text-zinc-400">
                                                {item.avgRating && (
                                                    <span className="flex items-center gap-1">
                                                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                                                        均分 <strong className="text-zinc-200">{item.avgRating}</strong>
                                                    </span>
                                                )}
                                                {item.hasVerifiedBenchmark && (
                                                    <button
                                                        onClick={() => handleSyncPersonWorks(item.name)}
                                                        disabled={isSyncing}
                                                        className="text-[11px] text-zinc-500 hover:text-amber-400 flex items-center gap-1 transition-colors"
                                                        title="重新刷新全网最新生平数据"
                                                    >
                                                        <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-amber-400' : ''}`} />
                                                        <span>刷新</span>
                                                    </button>
                                                )}
                                            </div>

                                            <button
                                                onClick={() => {
                                                    onClose();
                                                    onSelectPerson(item.name);
                                                }}
                                                className="flex items-center gap-1 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors group-hover:translate-x-0.5 duration-200"
                                            >
                                                <span>探索生涯全量档案</span>
                                                <ChevronRight className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* 浮动操作反馈提示 */}
                {toastMessage && (
                    <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-50 animate-fade-in pointer-events-none">
                        <div className={`px-4 py-2 rounded-xl text-xs font-semibold shadow-2xl flex items-center gap-2 backdrop-blur-md border ${
                            toastMessage.type === 'success' 
                                ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/40 shadow-emerald-950/50' 
                                : toastMessage.type === 'warn'
                                ? 'bg-amber-950/90 text-amber-300 border-amber-500/40 shadow-amber-950/50'
                                : 'bg-zinc-900/90 text-zinc-200 border-zinc-700/60 shadow-black/80'
                        }`}>
                            <span>{toastMessage.type === 'success' ? '✅' : toastMessage.type === 'warn' ? '⚠️' : 'ℹ️'}</span>
                            <span>{toastMessage.text}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

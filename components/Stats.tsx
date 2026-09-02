
import React, { useState, useMemo } from 'react';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area, Legend,
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { Movie, MovieStatus } from '../types';
import { Film, Tv, PlayCircle, Calendar, Filter, BarChart3, PieChart as PieChartIcon, Activity, Star, Hexagon, Clock, Zap, Smile, Sparkles, Tag, Clapperboard, Users, User, Trophy } from 'lucide-react';
import {
    calculateMovieDuration,
    calculateTvDuration,
    calculateTotalEpisodes
} from '../utils/statsCalculator';
import { normalizeTitle } from '../utils/titleNormalizer';
import { ActivityHeatmap } from './ActivityHeatmap';
import { ReportShareModal } from './ReportShareModal';

export type TimeFrame = 'all' | 'year' | 'month';

export interface StatsProps {
    movies: Movie[];
    onToast?: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
    onSelectPerson?: (name: string) => void;
    onOpenPersonUniverse?: () => void;
    timeFrame?: TimeFrame;
    onTimeFrameChange?: (tf: TimeFrame) => void;
    selectedYear?: string;
    onSelectedYearChange?: (year: string) => void;
    selectedMonth?: string;
    onSelectedMonthChange?: (month: string) => void;
}

export const Stats: React.FC<StatsProps> = ({
    movies,
    onToast,
    onSelectPerson,
    onOpenPersonUniverse,
    timeFrame: controlledTimeFrame,
    onTimeFrameChange,
    selectedYear: controlledSelectedYear,
    onSelectedYearChange,
    selectedMonth: controlledSelectedMonth,
    onSelectedMonthChange,
}) => {
    const [localTimeFrame, setLocalTimeFrame] = useState<TimeFrame>('all');
    const [localSelectedYear, setLocalSelectedYear] = useState<string>(new Date().getFullYear().toString());
    const [localSelectedMonth, setLocalSelectedMonth] = useState<string>(
        `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
    );

    const isControlledTimeFrame = controlledTimeFrame !== undefined;
    const timeFrame = isControlledTimeFrame ? controlledTimeFrame : localTimeFrame;
    const setTimeFrame = (tf: TimeFrame) => {
        if (!isControlledTimeFrame) setLocalTimeFrame(tf);
        onTimeFrameChange?.(tf);
    };

    const isControlledYear = controlledSelectedYear !== undefined;
    const selectedYear = isControlledYear ? controlledSelectedYear : localSelectedYear;
    const setSelectedYear = (y: string) => {
        if (!isControlledYear) setLocalSelectedYear(y);
        onSelectedYearChange?.(y);
    };

    const isControlledMonth = controlledSelectedMonth !== undefined;
    const selectedMonth = isControlledMonth ? controlledSelectedMonth : localSelectedMonth;
    const setSelectedMonth = (m: string) => {
        if (!isControlledMonth) setLocalSelectedMonth(m);
        onSelectedMonthChange?.(m);
    };

    const [showReportModal, setShowReportModal] = useState(false);

    // 1. Extract available dates for dropdowns (including watchHistory timestamps)
    const { years, months } = useMemo(() => {
        const yearsSet = new Set<string>();
        const monthsSet = new Set<string>();

        movies.forEach(m => {
            if (m.addedAt) {
                const d = new Date(m.addedAt);
                yearsSet.add(d.getFullYear().toString());
                monthsSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
            }
            if (m.watchHistory && Array.isArray(m.watchHistory)) {
                m.watchHistory.forEach(log => {
                    if (log.date) {
                        const d = new Date(log.date);
                        yearsSet.add(d.getFullYear().toString());
                        monthsSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
                    }
                });
            }
        });

        return {
            years: Array.from(yearsSet).sort((a, b) => b.localeCompare(a)),
            months: Array.from(monthsSet).sort((a, b) => b.localeCompare(a))
        };
    }, [movies]);

    // 2. Filter Data based on selection (check both addedAt and watchHistory)
    const filteredMovies = useMemo(() => {
        return movies.filter(movie => {
            if (timeFrame === 'all') return true;

            const hasWatchHistoryInYear = movie.watchHistory && movie.watchHistory.some(log => {
                return new Date(log.date).getFullYear().toString() === selectedYear;
            });
            const hasWatchHistoryInMonth = movie.watchHistory && movie.watchHistory.some(log => {
                const logDate = new Date(log.date);
                const logYM = `${logDate.getFullYear()}-${String(logDate.getMonth() + 1).padStart(2, '0')}`;
                return logYM === selectedMonth;
            });

            const d = new Date(movie.addedAt);
            if (timeFrame === 'year') {
                return d.getFullYear().toString() === selectedYear || !!hasWatchHistoryInYear;
            }
            if (timeFrame === 'month') {
                const movieMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                return movieMonth === selectedMonth || !!hasWatchHistoryInMonth;
            }
            return true;
        });
    }, [movies, timeFrame, selectedYear, selectedMonth]);

    // 3. Calculate Aggregate Stats
    const {
        total,
        movieCount,
        tvCount,
        totalEpisodesWatched,
        movieDuration,
        tvDuration,
        totalDurationFormatted,
        avgRating,
        statusData,
        ratingData,
        trendData,
        genreData,
        tagData,
        rewatchRate,
        rewatchKing,
        speedDemon,
        judgePersona,
        directorRankings,
        castRankings
    } = useMemo(() => {
        // Create an array of unique media entities for aggregate statistics (Genres, Status, etc.)
        // This ensures TV shows with multiple episode records don't skew distribution data
        const uniqueMediaEntities = (() => {
            const mediaMap = new Map<string, Movie>();

            filteredMovies.forEach(m => {
                if (!m.mediaType || m.mediaType === 'movie') {
                    // Movies are treated as individual entries
                    mediaMap.set(`movie-${m.id}`, m);
                } else {
                    // TV Series: Group by title
                    const titleKey = `tv-${normalizeTitle(m.title)}`;
                    const existing = mediaMap.get(titleKey);

                    // Keep the one with highest episode or latest date for most accurate metadata/status
                    if (!existing || (m.currentEpisode || 0) > (existing.currentEpisode || 0) || m.addedAt > existing.addedAt) {
                        mediaMap.set(titleKey, m);
                    }
                }
            });
            return Array.from(mediaMap.values());
        })();

        // Use unique entities for counts and distributions
        const total = uniqueMediaEntities.length;

        // Status & Counts
        const statusCounts = uniqueMediaEntities.reduce((acc, m) => {
            acc[m.status] = (acc[m.status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const statusData = Object.keys(statusCounts).map(status => ({
            name: status,
            value: statusCounts[status]
        }));

        // Ratings
        const ratingCounts = uniqueMediaEntities.reduce((acc, m) => {
            if (m.rating > 0) acc[m.rating] = (acc[m.rating] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const ratingData = [1, 2, 3, 4, 5].map(star => ({
            name: `${star}星`,
            count: ratingCounts[star] || 0
        }));

        // Averages
        const totalRating = uniqueMediaEntities.reduce((sum, m) => sum + m.rating, 0);
        const ratedCount = uniqueMediaEntities.filter(m => m.rating > 0).length;
        const avgRating = ratedCount > 0 ? (totalRating / ratedCount).toFixed(1) : '0';

        // Movie Count (排除"想看"条目)
        const movieCount = filteredMovies.filter(m => (!m.mediaType || m.mediaType === 'movie') && m.status !== MovieStatus.PLANNING).length;

        // TV Logic (排除"想看"条目)
        const tvEntries = filteredMovies.filter(m => m.mediaType === 'tv' && m.status !== MovieStatus.PLANNING);

        // Deduplicate TV shows by title for the count
        const uniqueTvTitles = new Set(tvEntries.map(m => normalizeTitle(m.title)));
        const tvCount = uniqueTvTitles.size;

        // Remaining calculations (Duration, Trends) still use all records for accuracy
        // Movie Duration
        const movieDuration = calculateMovieDuration(filteredMovies);

        // TV Episodes watched count (deduplicated by utility with global context and precise timeFilter)
        const totalEpisodesWatched = calculateTotalEpisodes(filteredMovies, movies, { timeFrame, selectedYear, selectedMonth });

        // TV Duration (calculated by utility with dedup logic, global context and precise timeFilter)
        const tvDuration = calculateTvDuration(filteredMovies, movies, { timeFrame, selectedYear, selectedMonth });

        // Total Duration formatting
        const totalMinutes = movieDuration + tvDuration;
        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        const totalDurationFormatted = { hours, minutes: mins };

        // Trend Data (Timeline) - Must use all records and watchHistory to show activity over time
        let trendMap = new Map<string, number>();
        let trendFormat: { label: string, key: string }[] = [];

        if (timeFrame === 'month') {
            // Daily trend
            const [y, m] = selectedMonth.split('-').map(Number);
            const daysInMonth = new Date(y, m, 0).getDate();
            for (let i = 1; i <= daysInMonth; i++) {
                trendMap.set(i.toString(), 0);
            }
            filteredMovies.filter(mov => mov.status !== MovieStatus.PLANNING).forEach(mov => {
                if (mov.mediaType === 'tv' && mov.watchHistory && mov.watchHistory.length > 0) {
                    mov.watchHistory.forEach(log => {
                        const logDate = new Date(log.date);
                        const logYM = `${logDate.getFullYear()}-${String(logDate.getMonth() + 1).padStart(2, '0')}`;
                        if (logYM === selectedMonth) {
                            const key = logDate.getDate().toString();
                            trendMap.set(key, (trendMap.get(key) || 0) + 1);
                        }
                    });
                } else {
                    const d = new Date(mov.addedAt);
                    const movieYM = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                    if (movieYM === selectedMonth) {
                        const key = d.getDate().toString();
                        trendMap.set(key, (trendMap.get(key) || 0) + 1);
                    }
                }
            });
            trendFormat = Array.from(trendMap.keys()).map(k => ({ label: `${k}日`, key: k }));
        } else if (timeFrame === 'year') {
            // Monthly trend
            for (let i = 1; i <= 12; i++) trendMap.set(i.toString(), 0);
            filteredMovies.filter(mov => mov.status !== MovieStatus.PLANNING).forEach(mov => {
                if (mov.mediaType === 'tv' && mov.watchHistory && mov.watchHistory.length > 0) {
                    mov.watchHistory.forEach(log => {
                        const logDate = new Date(log.date);
                        if (logDate.getFullYear().toString() === selectedYear) {
                            const key = (logDate.getMonth() + 1).toString();
                            trendMap.set(key, (trendMap.get(key) || 0) + 1);
                        }
                    });
                } else {
                    const d = new Date(mov.addedAt);
                    if (d.getFullYear().toString() === selectedYear) {
                        const key = (d.getMonth() + 1).toString();
                        trendMap.set(key, (trendMap.get(key) || 0) + 1);
                    }
                }
            });
            trendFormat = Array.from(trendMap.keys()).map(k => ({ label: `${k}月`, key: k }));
        } else {
            // Yearly trend
            filteredMovies.filter(mov => mov.status !== MovieStatus.PLANNING).forEach(mov => {
                if (mov.mediaType === 'tv' && mov.watchHistory && mov.watchHistory.length > 0) {
                    mov.watchHistory.forEach(log => {
                        const y = new Date(log.date).getFullYear().toString();
                        trendMap.set(y, (trendMap.get(y) || 0) + 1);
                    });
                } else {
                    const y = new Date(mov.addedAt).getFullYear().toString();
                    trendMap.set(y, (trendMap.get(y) || 0) + 1);
                }
            });
            // Sort years
            const sortedYears = Array.from(trendMap.keys()).sort();
            trendFormat = sortedYears.map(y => ({ label: `${y}年`, key: y }));
        }

        const trendData = trendFormat.map(item => ({
            name: item.label,
            count: trendMap.get(item.key) || 0
        }));

        // Genre Data - Use unique entities (排除未知与空类型)
        const genreCounts: Record<string, number> = {};
        uniqueMediaEntities.forEach(m => {
            if (!m.genre || m.genre.trim() === '未知') return;
            // Split by common separators: , / space，
            const genres = m.genre.split(/[,，/、\s]+/).filter(g => g.trim().length > 0 && g.trim() !== '未知');
            genres.forEach(g => {
                genreCounts[g] = (genreCounts[g] || 0) + 1;
            });
        });

        const genreData = Object.entries(genreCounts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 8); // Top 8 genres

        // Tag Data - 仅统计用户与智能打上的自定义标签 (m.tags)，绝不混入或回退到类型 (genre)
        const tagCounts: Record<string, number> = {};
        uniqueMediaEntities.forEach(m => {
            if (m.tags && Array.isArray(m.tags) && m.tags.length > 0) {
                m.tags.forEach(t => {
                    const cleanTag = t.trim();
                    if (cleanTag && cleanTag !== '未知') {
                        tagCounts[cleanTag] = (tagCounts[cleanTag] || 0) + 1;
                    }
                });
            }
        });

        const tagData = Object.entries(tagCounts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 8); // Top 8 tags

        // 4. 重温指标计算
        // 独特已观影作品列表 (排除想看)
        const uniqueWatchedEntities = uniqueMediaEntities.filter(m => m.status !== MovieStatus.PLANNING);
        const uniqueWatchedTotal = uniqueWatchedEntities.length;

        const rewatchMap = new Map<string, number>();
        movies.forEach(m => {
            if (m.status === MovieStatus.PLANNING) return;
            const key = `${normalizeTitle(m.title)}-${m.mediaType || 'movie'}`;
            const iteration = m.watchIteration || 1;
            const existing = rewatchMap.get(key) || 0;
            if (iteration > existing) {
                rewatchMap.set(key, iteration);
            }
        });

        // 重温过的影片数 (在该过滤条件下的去重已看影片中，历史上最大刷数 > 1)
        const rewatchedEntitiesCount = Array.from(rewatchMap.entries())
            .filter(([key, maxIteration]) => {
                return maxIteration > 1 && uniqueWatchedEntities.some(m => {
                    const mKey = `${normalizeTitle(m.title)}-${m.mediaType || 'movie'}`;
                    return mKey === key;
                });
            }).length;
        const rewatchRate = uniqueWatchedTotal > 0 
            ? ((rewatchedEntitiesCount / uniqueWatchedTotal) * 100).toFixed(1) 
            : '0.0';

        // 重温之王 (仅在当前过滤条件下的影片中，选取历史上重温数最多的)
        const rewatchList = Array.from(rewatchMap.entries())
            .filter(([key]) => {
                return uniqueWatchedEntities.some(m => {
                    const mKey = `${normalizeTitle(m.title)}-${m.mediaType || 'movie'}`;
                    return mKey === key;
                });
            })
            .map(([key, maxIteration]) => {
                const parts = key.split('-');
                const mediaType = parts.pop() || 'movie';
                const normTitle = parts.join('-');
                const originalTitle = movies.find(m => normalizeTitle(m.title) === normTitle && (m.mediaType || 'movie') === mediaType)?.title || normTitle;
                return { title: originalTitle, iteration: maxIteration };
            })
            .filter(item => item.iteration > 1)
            .sort((a, b) => b.iteration - a.iteration);

        const rewatchKing = rewatchList[0] || null;

        // 倍速最高记录 (排除想看，全面扫描作品主倍速与单集流水倍速)
        const activeWatchRecords = filteredMovies.filter(m => m.status !== MovieStatus.PLANNING);
        let maxFoundSpeed = 1.0;
        let speedDemonTitle = '';

        activeWatchRecords.forEach(m => {
            const baseSpeed = m.playbackSpeed || 1.0;
            if (baseSpeed > maxFoundSpeed) {
                maxFoundSpeed = baseSpeed;
                speedDemonTitle = m.title;
            }
            if (m.watchHistory && Array.isArray(m.watchHistory)) {
                m.watchHistory.forEach(log => {
                    const logSpeed = log.playbackSpeed || baseSpeed;
                    if (logSpeed > maxFoundSpeed) {
                        maxFoundSpeed = logSpeed;
                        speedDemonTitle = m.title;
                    }
                });
            }
        });

        const speedDemon = maxFoundSpeed > 1.0
            ? { title: speedDemonTitle, speed: maxFoundSpeed }
            : null;

        // 影评人设
        let judgePersona = '暂无评分';
        if (ratedCount > 0) {
            const avg = parseFloat(avgRating);
            if (avg >= 4.2) judgePersona = '慷慨看客 💖';
            else if (avg <= 3.0) judgePersona = '冷酷判官 🧐';
            else judgePersona = '理性影迷 ⚖️';
        }

        // 5. 导演与演员偏好度聚合计算 (Top 5)
        const directorMap = new Map<string, { count: number; ratings: number[]; titles: string[] }>();
        const castMap = new Map<string, { count: number; ratings: number[]; titles: string[] }>();

        uniqueMediaEntities.forEach(m => {
            if (m.director && m.director.trim() && m.director.trim() !== '未知') {
                const dirs = m.director.split(/[,，/、\s]+/).map(d => d.trim()).filter(d => d.length > 0 && d !== '未知');
                dirs.forEach(d => {
                    const cur = directorMap.get(d) || { count: 0, ratings: [], titles: [] };
                    cur.count += 1;
                    if (m.rating > 0) cur.ratings.push(m.rating);
                    if (m.title && !cur.titles.includes(m.title)) cur.titles.push(m.title);
                    directorMap.set(d, cur);
                });
            }

            if (m.cast && m.cast.trim() && m.cast.trim() !== '未知') {
                const actors = m.cast.split(/[,，/、\s]+/).map(a => a.trim()).filter(a => a.length > 0 && a !== '未知');
                actors.forEach(a => {
                    const cur = castMap.get(a) || { count: 0, ratings: [], titles: [] };
                    cur.count += 1;
                    if (m.rating > 0) cur.ratings.push(m.rating);
                    if (m.title && !cur.titles.includes(m.title)) cur.titles.push(m.title);
                    castMap.set(a, cur);
                });
            }
        });

        const directorRankings = Array.from(directorMap.entries())
            .map(([name, data]) => ({
                name,
                count: data.count,
                avgRating: data.ratings.length > 0
                    ? Number((data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length).toFixed(1))
                    : 0,
                topTitle: data.titles[0] || ''
            }))
            .sort((a, b) => b.count - a.count || b.avgRating - a.avgRating)
            .slice(0, 5);

        const castRankings = Array.from(castMap.entries())
            .map(([name, data]) => ({
                name,
                count: data.count,
                avgRating: data.ratings.length > 0
                    ? Number((data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length).toFixed(1))
                    : 0,
                topTitle: data.titles[0] || ''
            }))
            .sort((a, b) => b.count - a.count || b.avgRating - a.avgRating)
            .slice(0, 5);

        return {
            total, movieCount, tvCount, totalEpisodesWatched,
            movieDuration, tvDuration, totalDurationFormatted, avgRating,
            statusData, ratingData, trendData, genreData, tagData,
            rewatchRate, rewatchKing, speedDemon, judgePersona,
            directorRankings, castRankings
        };
    }, [filteredMovies, movies, timeFrame, selectedMonth, selectedYear]);

    const CHART_COLORS = [
        '#6366f1', '#10b981', '#f59e0b', '#ec4899', '#3b82f6', '#8b5cf6',
        '#f43f5e', '#06b6d4', '#84cc16', '#d946ef', '#f97316', '#14b8a6',
    ];

    if (movies.length === 0) return null;

    return (
        <div className="space-y-4 sm:space-y-6 mb-6 sm:mb-8">

            {/* 1. Header & Filter Bar */}
            <div className="bg-slate-800 p-3 sm:p-4 rounded-xl border border-slate-700 shadow-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
                <div className="flex items-center gap-2">
                    <BarChart3 className="text-indigo-400" size={20} />
                    <h2 className="text-base sm:text-lg font-bold text-white">统计面板</h2>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <button
                        type="button"
                        onClick={() => setShowReportModal(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition-all hover:scale-105 shadow-sm"
                        title="一键生成高清观影手账报告长图"
                    >
                        <Sparkles size={14} className="text-indigo-400 animate-pulse" />
                        生成观影长图
                    </button>

                    <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-700 shrink-0">
                        <button
                            onClick={() => setTimeFrame('all')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${timeFrame === 'all' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                        >
                            全部
                        </button>
                        <button
                            onClick={() => setTimeFrame('year')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${timeFrame === 'year' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                        >
                            按年
                        </button>
                        <button
                            onClick={() => setTimeFrame('month')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${timeFrame === 'month' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                        >
                            按月
                        </button>
                    </div>

                    <div className="flex gap-2">
                        {timeFrame === 'year' && (
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(e.target.value)}
                                className="bg-slate-700 text-white text-sm rounded-lg px-3 py-1.5 border border-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                {years.map(y => <option key={y} value={y}>{y}年</option>)}
                            </select>
                        )}
                        {timeFrame === 'month' && (
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="bg-slate-700 text-white text-sm rounded-lg px-3 py-1.5 border border-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                {months.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        )}
                    </div>
                </div>
            </div>

            {/* 2. Key Metrics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                <div className="bg-slate-800 p-3 sm:p-4 rounded-xl border border-slate-700 flex flex-col items-center justify-center relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent" />
                    <div className="text-slate-400 text-xs mb-1 z-10 font-medium">总记录</div>
                    <div className="text-2xl sm:text-3xl font-bold text-white z-10">{total}</div>
                </div>

                <div className="bg-slate-800 p-3 sm:p-4 rounded-xl border border-slate-700 flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent" />
                    <div className="flex gap-4 z-10 w-full justify-center">
                        <div className="text-center">
                            <div className="text-slate-400 text-[10px] mb-1 flex items-center gap-1 justify-center"><Film size={10} /> 电影</div>
                            <div className="text-lg sm:text-xl font-bold text-emerald-400">{movieCount}</div>
                        </div>
                        <div className="w-px bg-slate-700 h-8 self-center"></div>
                        <div className="text-center">
                            <div className="text-slate-400 text-[10px] mb-1 flex items-center gap-1 justify-center"><Tv size={10} /> 剧集</div>
                            <div className="text-lg sm:text-xl font-bold text-blue-400">{tvCount}</div>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-800 p-3 sm:p-4 rounded-xl border border-slate-700 flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent" />
                    <div className="text-slate-400 text-xs mb-1 z-10 font-medium flex items-center gap-1"><PlayCircle size={12} /> 累计追剧</div>
                    <div className="text-2xl sm:text-3xl font-bold text-amber-400 z-10">{totalEpisodesWatched} <span className="text-sm text-amber-400/60">集</span></div>
                </div>

                {/* 电影时长 */}
                <div className="bg-slate-800 p-3 sm:p-4 rounded-xl border border-slate-700 flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent" />
                    <div className="text-slate-400 text-xs mb-1 z-10 font-medium flex items-center gap-1"><Film size={12} /> 电影时长</div>
                    <div className="text-lg sm:text-xl font-bold text-emerald-400 z-10 whitespace-nowrap">
                        {Math.floor(movieDuration / 60) > 0 && <span className="text-xl sm:text-2xl">{Math.floor(movieDuration / 60)}<span className="text-sm text-emerald-400/60">h</span> </span>}
                        {movieDuration % 60}<span className="text-sm text-emerald-400/60">m</span>
                    </div>
                </div>

                {/* 电视剧时长 */}
                <div className="bg-slate-800 p-3 sm:p-4 rounded-xl border border-slate-700 flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent" />
                    <div className="text-slate-400 text-xs mb-1 z-10 font-medium flex items-center gap-1"><Tv size={12} /> 剧集时长</div>
                    <div className="text-lg sm:text-xl font-bold text-blue-400 z-10 whitespace-nowrap">
                        {Math.floor(tvDuration / 60) > 0 && <span className="text-xl sm:text-2xl">{Math.floor(tvDuration / 60)}<span className="text-sm text-blue-400/60">h</span> </span>}
                        {tvDuration % 60}<span className="text-sm text-blue-400/60">m</span>
                    </div>
                </div>

                {/* 总观看时长 */}
                <div className="bg-slate-800 p-3 sm:p-4 rounded-xl border border-slate-700 flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent" />
                    <div className="text-slate-400 text-xs mb-1 z-10 font-medium flex items-center gap-1"><Clock size={12} /> 总观看时长</div>
                    <div className="text-lg sm:text-xl font-bold text-cyan-400 z-10 whitespace-nowrap">
                        {totalDurationFormatted.hours > 0 && <span className="text-xl sm:text-2xl">{totalDurationFormatted.hours}<span className="text-sm text-cyan-400/60">h</span> </span>}
                        {totalDurationFormatted.minutes}<span className="text-sm text-cyan-400/60">m</span>
                    </div>
                </div>

                <div className="bg-slate-800 p-3 sm:p-4 rounded-xl border border-slate-700 flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-transparent" />
                    <div className="text-slate-400 text-xs mb-1 z-10 font-medium">平均评分</div>
                    <div className="text-2xl sm:text-3xl font-bold text-yellow-400 z-10">{avgRating} <span className="text-sm">★</span></div>
                </div>

                {/* 重温比例 */}
                <div className="bg-slate-800 p-3 sm:p-4 rounded-xl border border-slate-700 flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-transparent" />
                    <div className="text-slate-400 text-xs mb-1 z-10 font-medium flex items-center gap-1"><Activity size={12} className="text-pink-400" /> 重温比例</div>
                    <div className="text-2xl sm:text-3xl font-bold text-pink-400 z-10">{rewatchRate} <span className="text-sm text-pink-400/60">%</span></div>
                </div>

                {/* 重温之王 */}
                <div className="bg-slate-800 p-3 sm:p-4 rounded-xl border border-slate-700 flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent" />
                    <div className="text-slate-400 text-xs mb-1 z-10 font-medium flex items-center gap-1">👑 重温之王</div>
                    <div className="text-center z-10 max-w-full px-1">
                        {rewatchKing ? (
                            <>
                                <div className="text-sm font-bold text-orange-400 truncate w-32 sm:w-auto" title={rewatchKing.title}>
                                    {rewatchKing.title}
                                </div>
                                <div className="text-[10px] text-slate-500 font-medium">重温 {rewatchKing.iteration} 遍</div>
                            </>
                        ) : (
                            <div className="text-sm text-slate-500">暂无重温</div>
                        )}
                    </div>
                </div>

                {/* 影评人设 */}
                <div className="bg-slate-800 p-3 sm:p-4 rounded-xl border border-slate-700 flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent" />
                    <div className="text-slate-400 text-xs mb-1 z-10 font-medium flex items-center gap-1"><Smile size={12} className="text-indigo-400" /> 影评人设</div>
                    <div className="text-sm font-bold text-indigo-400 z-10 whitespace-nowrap">{judgePersona}</div>
                </div>

                {/* 倍速狂人 */}
                <div className="bg-slate-800 p-3 sm:p-4 rounded-xl border border-slate-700 flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 to-transparent" />
                    <div className="text-slate-400 text-xs mb-1 z-10 font-medium flex items-center gap-1"><Zap size={12} className="text-teal-400" /> 倍速狂人</div>
                    <div className="text-center z-10 max-w-full px-1">
                        {speedDemon ? (
                            <>
                                <div className="text-sm font-bold text-teal-400 truncate w-32 sm:w-auto" title={speedDemon.title}>
                                    {speedDemon.title}
                                </div>
                                <div className="text-[10px] text-slate-500 font-medium">{speedDemon.speed}x 倍速</div>
                            </>
                        ) : (
                            <div className="text-sm text-slate-500">皆为原速</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Activity Heatmap */}
            <ActivityHeatmap movies={movies} />

            {/* 3. Charts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">

                {/* Chart A: Viewing Trend */}
                <div className="bg-slate-800 p-3 sm:p-4 rounded-xl border border-slate-700 shadow-lg min-h-[250px] md:col-span-2">
                    <div className="flex items-center gap-2 mb-4">
                        <Activity size={16} className="text-indigo-400" />
                        <h3 className="text-sm font-medium text-slate-300">
                            {timeFrame === 'year' ? `${selectedYear}年 观影趋势` : timeFrame === 'month' ? `${selectedMonth} 观影趋势` : '年度观影趋势'}
                        </h3>
                    </div>
                    <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#818cf8" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                                <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }}
                                    itemStyle={{ color: '#818cf8' }}
                                />
                                <Area type="monotone" dataKey="count" stroke="#818cf8" fillOpacity={1} fill="url(#colorCount)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Chart B: Tag Preference */}
                <div className="bg-slate-800 p-3 sm:p-4 rounded-xl border border-slate-700 shadow-lg min-h-[250px] flex flex-col justify-between">
                    <div className="flex items-center gap-2 mb-4">
                        <Tag size={16} className="text-emerald-400" />
                        <h3 className="text-sm font-medium text-slate-300">标签偏好 Top 8</h3>
                    </div>
                    {tagData.length > 0 ? (
                        <div className="h-[200px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart layout="vertical" data={tagData} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" stroke="#94a3b8" tick={{ fontSize: 11 }} width={65} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        cursor={{ fill: '#334155' }}
                                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }}
                                    />
                                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={12}>
                                        {tagData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-[200px] w-full flex flex-col items-center justify-center text-slate-500 text-xs gap-2">
                            <Tag size={24} className="text-slate-600" />
                            <span>暂无自定义标签数据</span>
                            <span className="text-[11px] text-slate-600">在新增或编辑影视时打上标签即可展示</span>
                        </div>
                    )}
                </div>

                {/* Chart C: Genre Distribution */}
                <div className="bg-slate-800 p-3 sm:p-4 rounded-xl border border-slate-700 shadow-lg min-h-[250px] flex flex-col justify-between">
                    <div className="flex items-center gap-2 mb-4">
                        <Hexagon size={16} className="text-purple-400" />
                        <h3 className="text-sm font-medium text-slate-300">类型分布</h3>
                    </div>
                    {genreData.length > 0 ? (
                        <div className="h-[200px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={genreData}>
                                    <PolarGrid stroke="#334155" />
                                    <PolarAngleAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                                    <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                                    <Radar name="数量" dataKey="value" stroke="#a855f7" fill="#a855f7" fillOpacity={0.5} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }}
                                    />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-[200px] w-full flex flex-col items-center justify-center text-slate-500 text-xs gap-2">
                            <Hexagon size={24} className="text-slate-600" />
                            <span>暂无有效类型数据</span>
                        </div>
                    )}
                </div>

                {/* Chart D: Status Distribution */}
                <div className="bg-slate-800 p-3 sm:p-4 rounded-xl border border-slate-700 shadow-lg min-h-[250px]">
                    <div className="flex items-center gap-2 mb-4">
                        <PieChartIcon size={16} className="text-amber-400" />
                        <h3 className="text-sm font-medium text-slate-300">状态分布</h3>
                    </div>
                    <div className="h-[200px] w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={statusData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={70}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {statusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Legend verticalAlign="bottom" height={36} iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-[65%] text-center pointer-events-none">
                            <div className="text-2xl font-bold text-white">{total}</div>
                            <div className="text-[10px] text-slate-400">Total</div>
                        </div>
                    </div>
                </div>

                {/* Chart E: Rating Distribution */}
                <div className="bg-slate-800 p-3 sm:p-4 rounded-xl border border-slate-700 shadow-lg min-h-[250px]">
                    <div className="flex items-center gap-2 mb-4">
                        <Star size={16} className="text-yellow-400" />
                        <h3 className="text-sm font-medium text-slate-300">评分分布</h3>
                    </div>
                    <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={ratingData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                                <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                                <Tooltip
                                    cursor={{ fill: '#334155' }}
                                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }}
                                />
                                <Bar dataKey="count" fill="#eab308" radius={[4, 4, 0, 0]} barSize={30} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>

            {/* 3. 影人阵容排行榜 (Director & Cast Top 5) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 导演偏好 Top 5 */}
                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-lg">
                    <div className="flex items-center justify-between mb-3.5">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-indigo-500/15 text-indigo-400 border border-indigo-500/25">
                                <Clapperboard size={16} />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                                    🎬 最常看导演 Top 5
                                </h3>
                                <p className="text-[11px] text-slate-400">点击导演名快速在主列表反向检索</p>
                            </div>
                        </div>

                        {onOpenPersonUniverse && (
                            <button
                                onClick={onOpenPersonUniverse}
                                className="flex items-center gap-1 text-xs font-semibold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-2.5 py-1 rounded-lg transition-all shadow-sm"
                                title="打开影人脉络宇宙与全收集总排行榜"
                            >
                                <Trophy size={13} />
                                <span>影人全收集榜</span>
                            </button>
                        )}
                    </div>

                    {directorRankings.length > 0 ? (
                        <div className="space-y-2">
                            {directorRankings.map((d, idx) => (
                                <div
                                    key={d.name}
                                    onClick={() => onSelectPerson && onSelectPerson(d.name)}
                                    className="group flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 hover:bg-indigo-950/40 border border-slate-700/60 hover:border-indigo-500/40 cursor-pointer transition-all duration-200"
                                    title={`点击检索「${d.name}」名下的所有影视作品`}
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-black shrink-0 ${
                                            idx === 0 ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40' :
                                            idx === 1 ? 'bg-slate-300/20 text-slate-200 border border-slate-300/40' :
                                            idx === 2 ? 'bg-amber-700/20 text-amber-500 border border-amber-600/40' :
                                            'bg-slate-800 text-slate-400 border border-slate-700'
                                        }`}>
                                            {idx + 1}
                                        </span>
                                        <span className="text-sm font-medium text-slate-200 group-hover:text-indigo-300 transition-colors truncate">
                                            {d.name}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-3 shrink-0 text-xs">
                                        <span className="text-slate-400 font-medium">{d.count} 部作品</span>
                                        {d.avgRating > 0 && (
                                            <span className="inline-flex items-center gap-0.5 text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/25">
                                                ★ {d.avgRating}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-8 text-center text-slate-500 text-xs flex flex-col items-center gap-1.5">
                            <Clapperboard size={20} className="text-slate-600" />
                            <span>暂无导演统计数据</span>
                        </div>
                    )}
                </div>

                {/* 主演偏好 Top 5 */}
                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-lg">
                    <div className="flex items-center justify-between mb-3.5">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-pink-500/15 text-pink-400 border border-pink-500/25">
                                <Users size={16} />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                                    🎭 最喜爱主演 Top 5
                                </h3>
                                <p className="text-[11px] text-slate-400">点击演员名快速在主列表反向检索</p>
                            </div>
                        </div>
                    </div>

                    {castRankings.length > 0 ? (
                        <div className="space-y-2">
                            {castRankings.map((c, idx) => (
                                <div
                                    key={c.name}
                                    onClick={() => onSelectPerson && onSelectPerson(c.name)}
                                    className="group flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 hover:bg-pink-950/40 border border-slate-700/60 hover:border-pink-500/40 cursor-pointer transition-all duration-200"
                                    title={`点击检索「${c.name}」参演的所有影视作品`}
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-black shrink-0 ${
                                            idx === 0 ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40' :
                                            idx === 1 ? 'bg-slate-300/20 text-slate-200 border border-slate-300/40' :
                                            idx === 2 ? 'bg-amber-700/20 text-amber-500 border border-amber-600/40' :
                                            'bg-slate-800 text-slate-400 border border-slate-700'
                                        }`}>
                                            {idx + 1}
                                        </span>
                                        <span className="text-sm font-medium text-slate-200 group-hover:text-pink-300 transition-colors truncate">
                                            {c.name}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-3 shrink-0 text-xs">
                                        <span className="text-slate-400 font-medium">{c.count} 部作品</span>
                                        {c.avgRating > 0 && (
                                            <span className="inline-flex items-center gap-0.5 text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/25">
                                                ★ {c.avgRating}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-8 text-center text-slate-500 text-xs flex flex-col items-center gap-1.5">
                            <Users size={20} className="text-slate-600" />
                            <span>暂无主演阵容数据</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Annual/Monthly Report Share Modal */}
            {showReportModal && (
                <ReportShareModal
                    movies={movies}
                    onClose={() => setShowReportModal(false)}
                    onToast={onToast}
                />
            )}
        </div>
    );
};

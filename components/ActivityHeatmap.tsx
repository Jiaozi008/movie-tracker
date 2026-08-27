import React, { useState, useMemo } from 'react';
import { Movie, MovieStatus } from '../types';
import { Flame, Calendar, Trophy, Sparkles, Film, Tv, ChevronRight } from 'lucide-react';

interface ActivityHeatmapProps {
    movies: Movie[];
}

interface ActivityItem {
    title: string;
    type: 'movie' | 'tv';
    episode?: number;
}

interface DayData {
    date: Date;
    dateStr: string; // YYYY-MM-DD
    count: number;
    items: ActivityItem[];
    isFuture: boolean;
    isCurrentMonth: boolean;
}

const formatDateKey = (d: Date): string => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({ movies }) => {
    const currentYear = new Date().getFullYear().toString();
    const [selectedRange, setSelectedRange] = useState<string>('pastYear');
    const [activeTooltip, setActiveTooltip] = useState<{ day: DayData; x: number; y: number } | null>(null);
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);

    // Auto-scroll to latest week (right edge) on mobile for pastYear
    React.useEffect(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
        }
    }, [selectedRange]);

    // Tap outside to close tooltip on mobile
    React.useEffect(() => {
        const handleGlobalTouch = () => {
            if (activeTooltip) setActiveTooltip(null);
        };
        window.addEventListener('scroll', handleGlobalTouch, { passive: true });
        return () => window.removeEventListener('scroll', handleGlobalTouch);
    }, [activeTooltip]);

    // 1. Calculate available years from data
    const availableYears = useMemo(() => {
        const years = new Set<string>();
        years.add(currentYear);
        movies.forEach(m => {
            if (m.addedAt) {
                years.add(new Date(m.addedAt).getFullYear().toString());
            }
            if (m.watchHistory) {
                m.watchHistory.forEach(h => {
                    years.add(new Date(h.date).getFullYear().toString());
                });
            }
        });
        return Array.from(years).sort((a, b) => b.localeCompare(a));
    }, [movies, currentYear]);

    // 2. Build Daily Activity Map
    const activityMap = useMemo(() => {
        const map = new Map<string, ActivityItem[]>();

        movies.forEach(movie => {
            // Planning status is not counted as watched activity
            if (movie.status === MovieStatus.PLANNING) return;

            if (movie.mediaType === 'tv') {
                if (movie.watchHistory && movie.watchHistory.length > 0) {
                    movie.watchHistory.forEach(log => {
                        const key = formatDateKey(new Date(log.date));
                        const current = map.get(key) || [];
                        current.push({
                            title: movie.title,
                            type: 'tv',
                            episode: log.episode
                        });
                        map.set(key, current);
                    });
                } else if (movie.addedAt) {
                    const key = formatDateKey(new Date(movie.addedAt));
                    const current = map.get(key) || [];
                    current.push({
                        title: movie.title,
                        type: 'tv',
                        episode: movie.currentEpisode || 1
                    });
                    map.set(key, current);
                }
            } else {
                // Movie
                if (movie.addedAt) {
                    const key = formatDateKey(new Date(movie.addedAt));
                    const current = map.get(key) || [];
                    current.push({
                        title: movie.title,
                        type: 'movie'
                    });
                    map.set(key, current);
                }
            }
        });

        return map;
    }, [movies]);

    // 3. Generate Calendar Grid (Weeks & Days)
    const { weeks, monthLabels, totalCount, activeDays, maxStreak, currentStreak } = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let startDate: Date;
        let endDate: Date;

        if (selectedRange === 'pastYear') {
            // Past 52 weeks up to today's week end
            endDate = new Date(today);
            const dayOfWeek = endDate.getDay(); // 0 = Sun
            const daysToSat = (6 - dayOfWeek + 7) % 7;
            endDate.setDate(endDate.getDate() + daysToSat);

            startDate = new Date(endDate);
            startDate.setDate(startDate.getDate() - (52 * 7 - 1));
        } else {
            // Specific Year (e.g. 2026)
            const yearNum = parseInt(selectedRange);
            startDate = new Date(yearNum, 0, 1);
            // Align start to Sunday
            const startDay = startDate.getDay();
            startDate.setDate(startDate.getDate() - startDay);

            endDate = new Date(yearNum, 11, 31);
            const endDay = endDate.getDay();
            endDate.setDate(endDate.getDate() + (6 - endDay));
        }

        const generatedWeeks: DayData[][] = [];
        let cur = new Date(startDate);
        let curWeek: DayData[] = [];
        const monthHeaders: { label: string; weekIndex: number }[] = [];
        let lastMonth = -1;

        let totalActs = 0;
        const activeDatesSet = new Set<string>();

        let weekIdx = 0;
        while (cur <= endDate) {
            const dateStr = formatDateKey(cur);
            const isFuture = cur > today;
            const items = isFuture ? [] : (activityMap.get(dateStr) || []);
            const count = items.length;

            if (count > 0) {
                totalActs += count;
                activeDatesSet.add(dateStr);
            }

            // Record month label at the start of a new month
            if (cur.getMonth() !== lastMonth && cur.getDate() <= 7) {
                monthHeaders.push({
                    label: `${cur.getMonth() + 1}月`,
                    weekIndex: weekIdx
                });
                lastMonth = cur.getMonth();
            }

            curWeek.push({
                date: new Date(cur),
                dateStr,
                count,
                items,
                isFuture,
                isCurrentMonth: true
            });

            if (curWeek.length === 7) {
                generatedWeeks.push(curWeek);
                curWeek = [];
                weekIdx++;
            }

            cur.setDate(cur.getDate() + 1);
        }

        if (curWeek.length > 0) {
            generatedWeeks.push(curWeek);
        }

        // Calculate Streaks
        let longest = 0;
        let currentRun = 0;
        let streakCur = 0;

        // Check from 365 days ago to today
        const checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() - 365);

        while (checkDate <= today) {
            const key = formatDateKey(checkDate);
            if (activityMap.has(key) && (activityMap.get(key)?.length || 0) > 0) {
                currentRun++;
                longest = Math.max(longest, currentRun);
            } else {
                currentRun = 0;
            }
            checkDate.setDate(checkDate.getDate() + 1);
        }

        // Current Streak leading up to today
        const scanDate = new Date(today);
        const todayKey = formatDateKey(scanDate);
        let hasToday = activityMap.has(todayKey) && (activityMap.get(todayKey)?.length || 0) > 0;

        if (!hasToday) {
            scanDate.setDate(scanDate.getDate() - 1);
        }

        while (true) {
            const k = formatDateKey(scanDate);
            if (activityMap.has(k) && (activityMap.get(k)?.length || 0) > 0) {
                streakCur++;
                scanDate.setDate(scanDate.getDate() - 1);
            } else {
                break;
            }
        }

        return {
            weeks: generatedWeeks,
            monthLabels: monthHeaders,
            totalCount: totalActs,
            activeDays: activeDatesSet.size,
            maxStreak: longest,
            currentStreak: streakCur
        };
    }, [activityMap, selectedRange]);

    // Color level helper
    const getCellColor = (count: number, isFuture: boolean) => {
        if (isFuture) return 'bg-slate-900/40 border-slate-800/40 opacity-30 cursor-not-allowed';
        if (count === 0) return 'bg-slate-800/80 border-slate-700/50 hover:border-slate-500';
        if (count === 1) return 'bg-indigo-900/90 text-indigo-200 border-indigo-700/70 hover:border-indigo-400 hover:scale-125 shadow-sm shadow-indigo-900/40';
        if (count <= 3) return 'bg-indigo-600 text-white border-indigo-400/80 hover:scale-125 shadow-sm shadow-indigo-500/50';
        if (count <= 5) return 'bg-fuchsia-500 text-white border-fuchsia-300 hover:scale-125 shadow-md shadow-fuchsia-500/60';
        return 'bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 border-amber-200 hover:scale-125 shadow-lg shadow-orange-500/60 font-bold';
    };

    return (
        <div className="bg-slate-800 p-4 sm:p-5 rounded-xl border border-slate-700 shadow-xl relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Header / Metric Cards */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
                        <Flame size={22} className="text-indigo-400 animate-pulse" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-base sm:text-lg font-bold text-white">观影打卡热力图</h3>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                活跃度
                            </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                            记录每日电影观影与追剧打卡足迹
                        </p>
                    </div>
                </div>

                {/* Range Selector */}
                <div className="flex bg-slate-900/90 p-1 rounded-lg border border-slate-700/80 self-stretch sm:self-auto">
                    <button
                        onClick={() => setSelectedRange('pastYear')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${selectedRange === 'pastYear' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                    >
                        最近一年
                    </button>
                    {availableYears.map(y => (
                        <button
                            key={y}
                            onClick={() => setSelectedRange(y)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${selectedRange === y ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                        >
                            {y}年
                        </button>
                    ))}
                </div>
            </div>

            {/* Metric Badges Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-700/60 flex items-center gap-3">
                    <div className="p-2 rounded bg-indigo-500/10 text-indigo-400">
                        <Sparkles size={16} />
                    </div>
                    <div>
                        <div className="text-[11px] text-slate-400 font-medium">累计打卡</div>
                        <div className="text-lg font-extrabold text-white">
                            {totalCount} <span className="text-xs font-normal text-slate-500">次</span>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-700/60 flex items-center gap-3">
                    <div className="p-2 rounded bg-emerald-500/10 text-emerald-400">
                        <Calendar size={16} />
                    </div>
                    <div>
                        <div className="text-[11px] text-slate-400 font-medium">活跃天数</div>
                        <div className="text-lg font-extrabold text-emerald-400">
                            {activeDays} <span className="text-xs font-normal text-slate-500">天</span>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-700/60 flex items-center gap-3">
                    <div className="p-2 rounded bg-orange-500/10 text-orange-400">
                        <Flame size={16} />
                    </div>
                    <div>
                        <div className="text-[11px] text-slate-400 font-medium">当前连续</div>
                        <div className="text-lg font-extrabold text-orange-400">
                            {currentStreak} <span className="text-xs font-normal text-slate-500">天</span>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-700/60 flex items-center gap-3">
                    <div className="p-2 rounded bg-amber-500/10 text-amber-400">
                        <Trophy size={16} />
                    </div>
                    <div>
                        <div className="text-[11px] text-slate-400 font-medium">最长连续</div>
                        <div className="text-lg font-extrabold text-amber-400">
                            {maxStreak} <span className="text-xs font-normal text-slate-500">天</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Heatmap Grid Container */}
            <div ref={scrollContainerRef} className="overflow-x-auto custom-scrollbar pb-2 touch-pan-x" style={{ WebkitOverflowScrolling: 'touch' }}>
                <div className="min-w-[720px] max-w-full">
                    {/* Month Labels */}
                    <div className="flex text-[11px] text-slate-400 font-medium mb-1.5 pl-6 h-4 relative">
                        {monthLabels.map((m, idx) => (
                            <span
                                key={idx}
                                style={{ position: 'absolute', left: `${m.weekIndex * 13.5 + 24}px` }}
                                className="transform -translate-x-1"
                            >
                                {m.label}
                            </span>
                        ))}
                    </div>

                    {/* Heatmap Matrix */}
                    <div className="flex gap-1">
                        {/* Day of Week Labels */}
                        <div className="flex flex-col justify-between text-[9px] text-slate-500 font-semibold pr-1.5 py-0.5 select-none w-5">
                            <span>日</span>
                            <span>二</span>
                            <span>四</span>
                            <span>六</span>
                        </div>

                        {/* Weeks Columns */}
                        <div className="flex gap-[3px] flex-1">
                            {weeks.map((week, wIdx) => (
                                <div key={wIdx} className="flex flex-col gap-[3px]">
                                    {week.map((day, dIdx) => (
                                        <button
                                            key={dIdx}
                                            type="button"
                                            onClick={(e) => {
                                                if (!day.isFuture && day.count > 0) {
                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                    setActiveTooltip({
                                                        day,
                                                        x: rect.left + rect.width / 2,
                                                        y: rect.top - 8
                                                    });
                                                }
                                            }}
                                            onMouseEnter={(e) => {
                                                if (!day.isFuture) {
                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                    setActiveTooltip({
                                                        day,
                                                        x: rect.left + rect.width / 2,
                                                        y: rect.top - 8
                                                    });
                                                }
                                            }}
                                            onMouseLeave={() => setActiveTooltip(null)}
                                            className={`w-3 h-3 rounded-sm border transition-all duration-200 ${getCellColor(day.count, day.isFuture)}`}
                                            title={`${day.dateStr}: ${day.count} 次打卡`}
                                        />
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Legend & Hint */}
            <div className="flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 mt-4 pt-3 border-t border-slate-700/50 gap-2">
                <span className="text-[11px]">鼠标悬停或点击格子可查看当日打卡影片详情</span>
                <div className="flex items-center gap-1.5">
                    <span className="text-[11px] mr-1">少</span>
                    <div className="w-2.5 h-2.5 rounded-sm bg-slate-800 border border-slate-700/50" />
                    <div className="w-2.5 h-2.5 rounded-sm bg-indigo-900 border border-indigo-700" />
                    <div className="w-2.5 h-2.5 rounded-sm bg-indigo-600 border border-indigo-400" />
                    <div className="w-2.5 h-2.5 rounded-sm bg-fuchsia-500 border border-fuchsia-300" />
                    <div className="w-2.5 h-2.5 rounded-sm bg-gradient-to-br from-amber-400 to-orange-500 border border-amber-200" />
                    <span className="text-[11px] ml-1">多</span>
                </div>
            </div>

            {/* Floating Tooltip Bubble */}
            {activeTooltip && (
                <div
                    className="fixed z-50 transform -translate-x-1/2 -translate-y-full pointer-events-none bg-slate-950/95 border border-slate-700 p-2.5 rounded-lg shadow-2xl backdrop-blur-md max-w-xs animate-in fade-in zoom-in-95 duration-150"
                    style={{ left: `${activeTooltip.x}px`, top: `${activeTooltip.y}px` }}
                >
                    <div className="flex items-center justify-between gap-3 text-xs mb-1.5 pb-1 border-b border-slate-800">
                        <span className="font-bold text-white">{activeTooltip.day.dateStr}</span>
                        <span className="text-indigo-400 font-semibold">{activeTooltip.day.count} 次打卡</span>
                    </div>
                    {activeTooltip.day.items.length === 0 ? (
                        <div className="text-[11px] text-slate-500">当日暂无观影记录</div>
                    ) : (
                        <div className="space-y-1 max-h-36 overflow-y-auto custom-scrollbar">
                            {activeTooltip.day.items.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-1.5 text-[11px] text-slate-300">
                                    {item.type === 'tv' ? (
                                        <Tv size={11} className="text-fuchsia-400 shrink-0" />
                                    ) : (
                                        <Film size={11} className="text-indigo-400 shrink-0" />
                                    )}
                                    <span className="font-medium text-slate-200 truncate">{item.title}</span>
                                    {item.episode !== undefined && (
                                        <span className="text-[10px] text-fuchsia-300 bg-fuchsia-950/80 px-1 py-0.2 rounded border border-fuchsia-800/40 shrink-0">
                                            第{item.episode}集
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

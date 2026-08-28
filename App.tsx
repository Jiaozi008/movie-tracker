import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Movie, MovieStatus } from './types';
import { MovieCard } from './components/MovieCard';
import { PosterWallCard } from './components/PosterWallCard';
import { MovieForm } from './components/MovieForm';
import { Button } from './components/ui/Button';
import { Stats } from './components/Stats';
import { useMovies } from './hooks/useMovies';
import { AiButler } from './components/AiButler';
import { useDebounce } from './hooks/useDebounce';
import { useSync } from './hooks/useSync';
import { useToast } from './hooks/useToast';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { fuzzyMatch } from './utils/searchUtils';
import { parseImportFile, downloadFile, convertToCSV } from './utils/fileUtils';
import { calculateEpisodeUpdate } from './utils/episodeUtils';
import { SyncModal } from './components/SyncModal';
import { TvMergeModal } from './components/TvMergeModal';
import { MobileNavBar, MobileTab } from './components/MobileNavBar';
import { ToastContainer } from './components/ui/Toast';
import { Plus, Search, Save, Film, Tv, Download, FileJson, FileSpreadsheet, ChevronDown, Calendar, CheckSquare, Trash2, X, Upload, ArrowUpDown, Globe, ChevronLeft, ChevronRight, Menu, Cloud, LayoutGrid, Image as ImageIcon, Sparkles, Layers } from 'lucide-react';

export default function App() {
    // Toast system
    const toast = useToast();

    // Data Logic via Custom Hook
    const { movies, isSaving, addMovie, updateMovie, deleteMovie, undoDelete, bulkDeleteMovies, importMovies, replaceMovies, syncWithCloud } = useMovies({
        onSuccess: (msg) => toast.success(msg),
        onError: (msg) => toast.error(msg),
        onInfo: (msg) => toast.info(msg),
    });
    const { config: syncConfig, saveConfig: saveSyncConfig, handleUpload, handleDownload, isSyncing, syncStatus, statusMessage } = useSync(movies, syncWithCloud);

    // Initial automatic cloud sync on app start
    useEffect(() => {
        const envToken = import.meta.env.VITE_GITHUB_GIST_TOKEN || '';
        const savedConfig = localStorage.getItem('cinelog_sync_config_v1');
        let isAuto = false;
        let hasToken = !!envToken;
        
        if (savedConfig) {
            try {
                const parsed = JSON.parse(savedConfig);
                isAuto = !!parsed.autoSync;
                if (parsed.githubToken) hasToken = true;
            } catch {}
        }
        
        if (isAuto && hasToken) {
            const timer = setTimeout(() => {
                handleDownload(true);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, []);

    // Regular hourly check for daily sync
    useEffect(() => {
        if (!syncConfig.autoSync || !syncConfig.githubToken) return;

        const interval = setInterval(() => {
            const lastSync = syncConfig.lastSyncTime || 0;
            const oneDayMs = 24 * 60 * 60 * 1000;
            if (Date.now() - lastSync > oneDayMs) {
                console.log("CineLog Auto Sync: Over 24h since last sync, performing silent sync...");
                handleDownload(true);
            }
        }, 3600000); // 1 hour

        return () => clearInterval(interval);
    }, [syncConfig.autoSync, syncConfig.githubToken, syncConfig.lastSyncTime]);

    // UI States
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
    const [isTvMergeOpen, setIsTvMergeOpen] = useState(false);
    const [isAiButlerOpen, setIsAiButlerOpen] = useState(false);
    const [editingMovie, setEditingMovie] = useState<Movie | null>(null);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [mobileTab, setMobileTab] = useState<MobileTab>('library');

    // Filter & Search States
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300); // 300ms delay

    const [filterStatus, setFilterStatus] = useState<string>('全部');
    const [filterMediaType, setFilterMediaType] = useState<'all' | 'movie' | 'tv'>('all');
    const [filterGenre, setFilterGenre] = useState<string>('all');
    const [dateFilter, setDateFilter] = useState<string>('all');
    const [filterCountry, setFilterCountry] = useState<string>('all');
    const [sortConfig, setSortConfig] = useState<{ field: string, direction: 'asc' | 'desc' }>({ field: 'addedAt', direction: 'desc' });

    const hasActiveFilters = Boolean(
        searchTerm ||
        filterStatus !== '全部' ||
        filterMediaType !== 'all' ||
        filterGenre !== 'all' ||
        dateFilter !== 'all' ||
        filterCountry !== 'all'
    );

    const handleClearAllFilters = () => {
        setSearchTerm('');
        setFilterStatus('全部');
        setFilterMediaType('all');
        setFilterGenre('all');
        setDateFilter('all');
        setFilterCountry('all');
        toast.info('已重置所有筛选条件 🔄');
    };

    // View Mode State: 'grid' (标准卡片) | 'poster' (海报墙)
    const [viewMode, setViewMode] = useState<'grid' | 'poster'>(() => {
        return (localStorage.getItem('cinelog_view_mode') as 'grid' | 'poster') || 'grid';
    });

    const handleViewModeChange = (mode: 'grid' | 'poster' | 'compact') => {
        const target = mode === 'poster' ? 'poster' : 'grid';
        setViewMode(target);
        localStorage.setItem('cinelog_view_mode', target);
        toast.info(target === 'poster' ? '已切换为海报墙模式 🎬' : '已切换为标准卡片模式 🎴');
    };

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(24);

    // Bulk Selection States
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // File Input Ref for Import & Search Input Ref for Shortcut
    const fileInputRef = useRef<HTMLInputElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Quick Episode +1 / -1 handler with automatic completion logic
    const handleQuickEpisodeUpdate = (movie: Movie, delta: 1 | -1) => {
        const result = calculateEpisodeUpdate(movie, delta);
        if (!result) return;

        updateMovie(result.updatedMovie);
        if (result.isCompleted) {
            toast.success(result.message);
        } else {
            toast.info(result.message);
        }
    };

    // Global Keyboard Shortcuts (N, /, 1, 2, Esc, ?)
    useKeyboardShortcuts({
        onSearchFocus: () => {
            searchInputRef.current?.focus();
            searchInputRef.current?.select();
            toast.info('已聚焦搜索框');
        },
        onNewMovie: () => {
            if (!isFormOpen && !isSyncModalOpen) {
                setEditingMovie(null);
                setIsFormOpen(true);
            }
        },
        onEscape: () => {
            if (isFormOpen) {
                setIsFormOpen(false);
                setEditingMovie(null);
            } else if (isSyncModalOpen) {
                setIsSyncModalOpen(false);
            } else if (showExportMenu) {
                setShowExportMenu(false);
            } else if (showMobileMenu) {
                setShowMobileMenu(false);
            } else if (isSelectionMode) {
                setIsSelectionMode(false);
                setSelectedIds(new Set());
            }
        },
        onViewModeChange: handleViewModeChange,
        onShowHelp: () => {
            toast.info('⌨️ 快捷键: N (新增) | / (搜索) | 1 (卡片) | 2 (海报墙) | Esc (关闭)');
        },
        enabled: !isFormOpen && !isSyncModalOpen
    });

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearchTerm, filterStatus, filterMediaType, filterGenre, dateFilter, filterCountry, sortConfig]);

    // Calculate available date options from data (including watchHistory timestamps)
    const dateOptions = useMemo(() => {
        const yearsSet = new Set<number>();
        const monthsSet = new Set<string>();

        movies.forEach(m => {
            if (m.addedAt) {
                const d = new Date(m.addedAt);
                yearsSet.add(d.getFullYear());
                const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                monthsSet.add(monthStr);
            }
            if (m.watchHistory && Array.isArray(m.watchHistory)) {
                m.watchHistory.forEach(log => {
                    if (log.date) {
                        const d = new Date(log.date);
                        yearsSet.add(d.getFullYear());
                        const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                        monthsSet.add(monthStr);
                    }
                });
            }
        });

        const sortedYears = Array.from(yearsSet).sort((a, b) => b - a);
        const sortedMonths = Array.from(monthsSet).sort((a, b) => b.localeCompare(a));

        return { years: sortedYears, months: sortedMonths };
    }, [movies]);

    // Calculate available country options
    const countryOptions = useMemo(() => {
        const countries = new Set<string>();
        movies.forEach(m => {
            if (m.country) {
                const parts = m.country.split(/[,，/、\s]+/).map(c => c.trim());
                parts.forEach(c => {
                    if (c && c.length > 0) countries.add(c);
                });
            }
        });
        return Array.from(countries).sort((a, b) => a.localeCompare(b, 'zh-CN'));
    }, [movies]);

    // Calculate available genre options (影视类型)
    const genreOptions = useMemo(() => {
        const genreSet = new Set<string>();
        movies.forEach(m => {
            if (m.genre) {
                const parts = m.genre.split(/[,，/、\s+]+/).map(g => g.trim());
                parts.forEach(g => {
                    if (g && g.length > 0) genreSet.add(g);
                });
            }
        });
        return Array.from(genreSet).sort((a, b) => a.localeCompare(b, 'zh-CN'));
    }, [movies]);

    const handleAddMovie = (movieData: Omit<Movie, 'id' | 'lastUpdated'>) => {
        try {
            addMovie(movieData);
            setIsFormOpen(false);
            toast.success(`已添加「${movieData.title}」`);
        } catch (err: any) {
            console.error('Error adding movie:', err);
            toast.error(err?.message || '添加记录失败，请重试');
        }
    };

    const handleUpdateMovie = (movieData: any) => {
        try {
            updateMovie(movieData);
            setIsFormOpen(false);
            setEditingMovie(null);
            toast.success(`已保存「${movieData.title}」修改`);
        } catch (err: any) {
            console.error('Error updating movie:', err);
            toast.error(err?.message || '保存修改失败，请重试');
        }
    };

    // Bulk Actions
    const toggleSelectionMode = () => {
        setIsSelectionMode(!isSelectionMode);
        setSelectedIds(new Set()); // Clear selection when toggling
    };

    const toggleSelectMovie = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedIds.size === sortedMovies.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(sortedMovies.map(m => m.id)));
        }
    };

    const handleBulkDelete = () => {
        bulkDeleteMovies(selectedIds);
        setIsSelectionMode(false);
        setSelectedIds(new Set());
    };

    // --- Export Logic ---
    const handleExport = (format: 'json' | 'csv') => {
        let content = '';
        if (format === 'json') {
            content = JSON.stringify(movies, null, 2);
        } else {
            // Logic handled in fileUtils usually, but we need data here.
            // To keep App clean, we move convertToCSV to fileUtils but we need to import it here 
            // OR handle the string generation there.
            // Since convertToCSV is exported from fileUtils, we need to import it.
            // Wait, I didn't import convertToCSV in the imports above. Let me check imports.
            // Ah, I need to import convertToCSV from utils/fileUtils.
            // For now, let's use the downloadFile helper which takes content string.
            // I will rely on the fact I should export convertToCSV from fileUtils.
            // Let me fix the import line if needed.
        }
        // Correct approach using util:
        // We need to import convertToCSV.
    };

    // --- Import Logic ---
    const handleImportClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.value = ''; // Reset
            fileInputRef.current.click();
        }
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const newMovies = await parseImportFile(file);
            importMovies(newMovies);
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || '导入失败');
        }
    };

    const openEdit = (movie: Movie) => {
        setEditingMovie(movie);
        setIsFormOpen(true);
    };

    // Derived state for filtering and sorting
    const filteredMovies = useMemo(() => {
        return movies.filter(movie => {
            // 1. Search Filter (with Fuzzy Match & Debounce across title, director, cast, genre, tags, review, overview)
            const matchesSearch = fuzzyMatch(movie.title, debouncedSearchTerm) ||
                fuzzyMatch(movie.director, debouncedSearchTerm) ||
                fuzzyMatch(movie.cast, debouncedSearchTerm) ||
                fuzzyMatch(movie.genre, debouncedSearchTerm) ||
                fuzzyMatch(movie.review, debouncedSearchTerm) ||
                fuzzyMatch(movie.overview, debouncedSearchTerm) ||
                (movie.tags ? movie.tags.some(t => fuzzyMatch(t, debouncedSearchTerm)) : false);

            // 2. Status Filter
            let matchesStatus = false;
            if (filterStatus === '全部') {
                matchesStatus = true;
            } else if (filterStatus === '多刷') {
                matchesStatus = !!(movie.watchIteration && movie.watchIteration > 1);
            } else {
                matchesStatus = movie.status === filterStatus;
            }

            // 3. Date Filter (Check both addedAt and watchHistory dates)
            let matchesDate = true;
            if (dateFilter !== 'all') {
                const checkTimestamp = (ts: number): boolean => {
                    const d = new Date(ts);
                    const now = new Date();

                    if (dateFilter === '7d') {
                        const cutoff = new Date();
                        cutoff.setDate(now.getDate() - 7);
                        return d >= cutoff;
                    }
                    if (dateFilter === '30d') {
                        const cutoff = new Date();
                        cutoff.setDate(now.getDate() - 30);
                        return d >= cutoff;
                    }
                    if (dateFilter.startsWith('year_')) {
                        const year = parseInt(dateFilter.split('_')[1]);
                        return d.getFullYear() === year;
                    }
                    if (dateFilter.startsWith('month_')) {
                        const targetYM = dateFilter.replace('month_', '');
                        const movieYM = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                        return targetYM === movieYM;
                    }
                    return true;
                };

                const addedAtMatches = checkTimestamp(movie.addedAt);
                const historyMatches = movie.watchHistory && movie.watchHistory.some(log => checkTimestamp(log.date));
                matchesDate = addedAtMatches || !!historyMatches;
            }

            // 4. Media Classification Filter (分类筛选: 电影 vs 电视剧)
            let matchesMediaType = true;
            if (filterMediaType === 'movie') {
                matchesMediaType = movie.mediaType !== 'tv' && (!movie.totalEpisodes || movie.totalEpisodes <= 1);
            } else if (filterMediaType === 'tv') {
                matchesMediaType = movie.mediaType === 'tv' || (!!movie.totalEpisodes && movie.totalEpisodes > 1) || (!!movie.currentEpisode && movie.currentEpisode > 0);
            }

            // 5. Genre Filter (类型筛选: 动作, 剧情, 科幻...)
            const matchesGenre = filterGenre === 'all' || (movie.genre && movie.genre.includes(filterGenre));

            // 6. Country Filter (地区筛选)
            const matchesCountry = filterCountry === 'all' || (movie.country && movie.country.includes(filterCountry));

            return matchesSearch && matchesStatus && matchesDate && matchesMediaType && matchesGenre && matchesCountry;
        });
    }, [movies, debouncedSearchTerm, filterStatus, filterMediaType, filterGenre, dateFilter, filterCountry]);

    const sortedMovies = useMemo(() => {
        const data = [...filteredMovies];
        const { field, direction } = sortConfig;

        data.sort((a, b) => {
            let valA = a[field as keyof Movie];
            let valB = b[field as keyof Movie];

            let diff = 0;
            if (field === 'year') {
                diff = (parseInt(String(a.year)) || 0) - (parseInt(String(b.year)) || 0);
            } else if (field === 'title') {
                diff = String(a.title).localeCompare(String(b.title), 'zh-CN');
            } else {
                if (valA < valB) diff = -1;
                else if (valA > valB) diff = 1;
            }

            if (diff !== 0) return diff;

            // Secondary sort: if primary fields are equal (e.g., same addedAt date), sort by lastUpdated
            const luA = a.lastUpdated || 0;
            const luB = b.lastUpdated || 0;
            return luA - luB;
        });

        return direction === 'asc' ? data : data.reverse();
    }, [filteredMovies, sortConfig]);

    // Pagination Logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentDisplayedMovies = sortedMovies.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(sortedMovies.length / itemsPerPage);

    const handlePageChange = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    // Helper for Export button click
    const executeExport = (format: 'json' | 'csv') => {
        if (format === 'json') {
            downloadFile(JSON.stringify(movies, null, 2), 'json');
        } else {
            // Need to import convertToCSV dynamically or statically
            // Re-implementing simplified call here if static import is used
            const { convertToCSV } = require('./utils/fileUtils'); // Fallback if import issues, but better use top level import
            // Since I am writing the file, I will fix the top imports.
            // See corrected imports below in the final file content.
        }
        setShowExportMenu(false);
    };

    return (
        <div className="min-h-screen supports-[min-height:100dvh]:min-h-[100dvh] bg-slate-900 text-slate-100 pb-28 sm:pb-20 font-sans">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".json,.csv"
                className="hidden"
            />

            {/* Navbar */}
            <nav className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <Film size={20} className="text-white" />
                        </div>
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                            CineLog AI
                        </span>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 mr-2">
                            <Save size={12} className={isSaving ? "animate-pulse text-indigo-400" : ""} />
                            <span>{isSaving ? '保存中...' : '已保存'}</span>
                        </div>

                        <div className="relative hidden sm:flex gap-2">
                            <Button
                                onClick={() => setIsSyncModalOpen(true)}
                                variant="secondary"
                                size="sm"
                                className="shadow-lg shadow-slate-900/20 flex items-center"
                                title="云同步"
                            >
                                <Cloud size={16} className="mr-1" /> 同步
                            </Button>

                            <Button
                                onClick={handleImportClick}
                                variant="secondary"
                                size="sm"
                                className="shadow-lg shadow-slate-900/20 flex items-center"
                                title="导入数据 (JSON/CSV)"
                            >
                                <Upload size={16} className="mr-1" /> 导入
                            </Button>

                            <div className="relative">
                                <Button
                                    onClick={() => setShowExportMenu(!showExportMenu)}
                                    variant="secondary"
                                    size="sm"
                                    className="shadow-lg shadow-slate-900/20 flex items-center"
                                    title="导出数据"
                                >
                                    <Download size={16} className="mr-1" /> 导出 <ChevronDown size={12} className="ml-1 opacity-50" />
                                </Button>

                                {showExportMenu && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)}></div>
                                        <div className="absolute right-0 mt-2 w-40 bg-slate-800 rounded-lg shadow-xl border border-slate-700 overflow-hidden z-50">
                                            <button
                                                onClick={() => { downloadFile(JSON.stringify(movies, null, 2), 'json'); setShowExportMenu(false); }}
                                                className="w-full px-4 py-3 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors flex items-center gap-2"
                                            >
                                                <FileJson size={14} /> 导出 JSON
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const csv = convertToCSV(movies);
                                                    downloadFile(csv, 'csv');
                                                    setShowExportMenu(false);
                                                }}
                                                className="w-full px-4 py-3 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors flex items-center gap-2 border-t border-slate-700"
                                            >
                                                <FileSpreadsheet size={14} /> 导出 CSV
                                            </button>
                                            <button
                                                onClick={() => { setIsTvMergeOpen(true); setShowExportMenu(false); }}
                                                className="w-full px-4 py-3 text-left text-sm text-fuchsia-300 hover:bg-slate-700 hover:text-white transition-colors flex items-center gap-2 border-t border-slate-700 font-medium"
                                            >
                                                <Sparkles size={14} className="text-fuchsia-400" /> 智能合并同剧分段
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        <Button onClick={() => toggleSelectionMode()} variant={isSelectionMode ? "primary" : "secondary"} size="sm" className="hidden sm:flex shadow-lg">
                            <CheckSquare size={16} className="mr-1" /> {isSelectionMode ? '退出管理' : '批量管理'}
                        </Button>

                        <button onClick={() => toggleSelectionMode()} className="sm:hidden text-slate-400 hover:text-white">
                            <CheckSquare size={20} className={isSelectionMode ? 'text-indigo-400' : ''} />
                        </button>

                        <button
                            onClick={() => setShowMobileMenu(!showMobileMenu)}
                            className="sm:hidden text-slate-400 hover:text-white"
                        >
                            <Menu size={24} />
                        </button>

                        {!isSelectionMode && (
                            <Button
                                onClick={() => { setEditingMovie(null); setIsFormOpen(true); }}
                                size="sm"
                                className="shadow-lg shadow-indigo-500/20 hidden sm:flex items-center gap-1.5"
                                title="新增记录 (快捷键 N)"
                            >
                                <Plus size={16} /> <span>新增记录</span>
                                <kbd className="px-1 py-0.2 text-[9px] font-mono text-indigo-200 bg-indigo-700/60 border border-indigo-400/30 rounded">N</kbd>
                            </Button>
                        )}

                        {showMobileMenu && (
                            <>
                                <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setShowMobileMenu(false)}></div>
                                <div className="absolute top-16 right-4 w-56 bg-slate-800 rounded-xl shadow-2xl border border-slate-700 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                                    <div className="p-3 border-b border-slate-700/50 bg-slate-900/50">
                                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">数据管理</div>
                                    </div>

                                    <button
                                        onClick={() => { setIsSyncModalOpen(true); setShowMobileMenu(false); }}
                                        className="w-full px-4 py-3 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors flex items-center gap-3"
                                    >
                                        <Cloud size={18} className="text-blue-400" /> 云端同步
                                    </button>

                                    <button
                                        onClick={() => { handleImportClick(); setShowMobileMenu(false); }}
                                        className="w-full px-4 py-3 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors flex items-center gap-3"
                                    >
                                        <Upload size={18} className="text-indigo-400" /> 导入数据
                                    </button>

                                    <button
                                        onClick={() => { setIsTvMergeOpen(true); setShowMobileMenu(false); }}
                                        className="w-full px-4 py-3 text-left text-sm text-fuchsia-300 hover:bg-slate-700 hover:text-white transition-colors flex items-center gap-3 border-t border-slate-700/50 font-medium"
                                    >
                                        <Sparkles size={18} className="text-fuchsia-400" /> 智能合并同剧分段
                                    </button>

                                    <button
                                        onClick={() => { downloadFile(JSON.stringify(movies, null, 2), 'json'); setShowMobileMenu(false); }}
                                        className="w-full px-4 py-3 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors flex items-center gap-3 border-t border-slate-700/50"
                                    >
                                        <FileJson size={18} className="text-emerald-400" /> 导出 JSON
                                    </button>

                                    <button
                                        onClick={() => {
                                            const csv = convertToCSV(movies);
                                            downloadFile(csv, 'csv');
                                            setShowMobileMenu(false);
                                        }}
                                        className="w-full px-4 py-3 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors flex items-center gap-3 border-t border-slate-700/50"
                                    >
                                        <FileSpreadsheet size={18} className="text-green-400" /> 导出 CSV
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">

                {/* 统计看板：移动端在 'stats' Tab 下展示，桌面端始终保留顶部展示 */}
                <div className={mobileTab === 'stats' ? 'block animate-in fade-in duration-200' : 'hidden sm:block'}>
                    <Stats
                        movies={movies}
                        onToast={(msg, type) => toast[type](msg)}
                        onSelectPerson={(name) => {
                            setFilterStatus('全部');
                            setFilterMediaType('all');
                            setFilterGenre('all');
                            setDateFilter('all');
                            setFilterCountry('all');
                            setSearchTerm(name);
                            setMobileTab('library');
                            searchInputRef.current?.focus();
                            toast.info(`已筛选影人：「${name}」`);
                        }}
                    />
                </div>

                {/* 影库列表与筛选区：移动端在 'library' Tab 下展示，桌面端始终展示 */}
                <div className={mobileTab === 'library' ? 'block animate-in fade-in duration-200' : 'hidden sm:block'}>
                    {/* Filters & Search */}
                <div className="flex flex-col md:flex-row gap-4 mb-6 sticky top-16 z-20 bg-slate-900/95 p-3 -mx-4 sm:-mx-2 sm:rounded-xl border-y sm:border border-slate-800/50 backdrop-blur-sm shadow-xl shadow-black/20">
                    {isSelectionMode ? (
                        <div className="flex-1 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 px-1">
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="select-all"
                                    checked={sortedMovies.length > 0 && selectedIds.size === sortedMovies.length}
                                    onChange={handleSelectAll}
                                    className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-indigo-600 focus:ring-indigo-500"
                                />
                                <label htmlFor="select-all" className="text-sm font-medium cursor-pointer select-none whitespace-nowrap">
                                    全选 ({sortedMovies.length})
                                </label>
                            </div>

                            <div className="h-6 w-px bg-slate-700 mx-1"></div>

                            <div className="text-sm text-slate-400 whitespace-nowrap">
                                选中 <span className="text-white font-bold">{selectedIds.size}</span>
                            </div>

                            <div className="flex-grow"></div>

                            <Button
                                size="sm"
                                variant="danger"
                                disabled={selectedIds.size === 0}
                                onClick={handleBulkDelete}
                                className="font-medium"
                            >
                                <Trash2 size={15} className="mr-1.5" /> 批量删除
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={toggleSelectionMode}
                                className="border-slate-700 text-slate-300"
                            >
                                退出
                            </Button>
                        </div>
                    ) : (
                        <>
                            <div className="flex-1 flex flex-col sm:flex-row gap-2">
                                <div className="relative flex-1">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                                        <Search size={18} />
                                    </div>
                                    <input
                                        ref={searchInputRef}
                                        type="text"
                                        placeholder="搜索片名、导演、演员、类型、标签或手记..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-9 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition-all shadow-inner"
                                    />
                                    {searchTerm ? (
                                        <button
                                            onClick={() => setSearchTerm('')}
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                                        >
                                            <X size={14} />
                                        </button>
                                    ) : (
                                        <kbd className="hidden sm:inline-flex absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 bg-slate-700/60 border border-slate-600/60 rounded">
                                            /
                                        </kbd>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-wrap lg:flex-nowrap gap-2 w-full sm:w-auto">
                                    {/* 1. 排序 */}
                                    <div className="relative min-w-0 sm:min-w-[120px] flex-1">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                                            <ArrowUpDown size={14} />
                                        </div>
                                        <select
                                            value={`${sortConfig.field}-${sortConfig.direction}`}
                                            onChange={(e) => {
                                                const [field, direction] = e.target.value.split('-');
                                                setSortConfig({ field, direction: direction as 'asc' | 'desc' });
                                            }}
                                            className="w-full appearance-none bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-7 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-300 hover:text-white cursor-pointer transition-colors truncate"
                                        >
                                            <option value="addedAt-desc">最近添加</option>
                                            <option value="addedAt-asc">最早添加</option>
                                            <option value="rating-desc">评分最高</option>
                                            <option value="rating-asc">评分最低</option>
                                            <option value="year-desc">年份最新</option>
                                            <option value="year-asc">年份最旧</option>
                                            <option value="title-asc">标题 (A-Z)</option>
                                        </select>
                                        <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                                    </div>

                                    {/* 2. 分类 (电影 / 电视剧) */}
                                    <div className="relative min-w-0 sm:min-w-[105px] flex-1">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                                            <Tv size={14} />
                                        </div>
                                        <select
                                            value={filterMediaType}
                                            onChange={(e) => setFilterMediaType(e.target.value as 'all' | 'movie' | 'tv')}
                                            className="w-full appearance-none bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-7 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-300 hover:text-white cursor-pointer transition-colors truncate"
                                        >
                                            <option value="all">所有分类</option>
                                            <option value="movie">🎬 电影</option>
                                            <option value="tv">📺 电视剧</option>
                                        </select>
                                        <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                                    </div>

                                    {/* 3. 类型 (类型筛选) */}
                                    <div className="relative min-w-0 sm:min-w-[105px] flex-1">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                                            <Layers size={14} />
                                        </div>
                                        <select
                                            value={filterGenre}
                                            onChange={(e) => setFilterGenre(e.target.value)}
                                            className="w-full appearance-none bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-7 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-300 hover:text-white cursor-pointer transition-colors truncate"
                                        >
                                            <option value="all">所有类型</option>
                                            {genreOptions.map(g => (
                                                <option key={g} value={g}>{g}</option>
                                            ))}
                                        </select>
                                        <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                                    </div>

                                    {/* 4. 地区 */}
                                    <div className="relative min-w-0 sm:min-w-[105px] flex-1">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                                            <Globe size={14} />
                                        </div>
                                        <select
                                            value={filterCountry}
                                            onChange={(e) => setFilterCountry(e.target.value)}
                                            className="w-full appearance-none bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-7 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-300 hover:text-white cursor-pointer transition-colors truncate"
                                        >
                                            <option value="all">所有地区</option>
                                            {countryOptions.map(c => (
                                                <option key={c} value={c}>{c}</option>
                                            ))}
                                        </select>
                                        <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                                    </div>

                                    {/* 5. 时间 */}
                                    <div className="relative min-w-0 sm:min-w-[105px] flex-1 col-span-2 sm:col-span-1">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                                            <Calendar size={14} />
                                        </div>
                                        <select
                                            value={dateFilter}
                                            onChange={(e) => setDateFilter(e.target.value)}
                                            className="w-full appearance-none bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-7 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-300 hover:text-white cursor-pointer transition-colors truncate"
                                        >
                                            <optgroup label="快捷筛选">
                                                <option value="all">全部时间</option>
                                                <option value="7d">最近 7 天</option>
                                                <option value="30d">最近 30 天</option>
                                            </optgroup>
                                            {dateOptions.years.length > 0 && (
                                                <optgroup label="按年份">
                                                    {dateOptions.years.map(y => (
                                                        <option key={y} value={`year_${y}`}>{y} 年</option>
                                                    ))}
                                                </optgroup>
                                            )}
                                            {dateOptions.months.length > 0 && (
                                                <optgroup label="按月份">
                                                    {dateOptions.months.map(m => {
                                                        const [y, mon] = m.split('-');
                                                        return <option key={m} value={`month_${m}`}>{y}年 {mon}月</option>;
                                                    })}
                                                </optgroup>
                                            )}
                                        </select>
                                        <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 md:pb-0 no-scrollbar touch-pan-x" style={{ WebkitOverflowScrolling: 'touch' }}>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    {['全部', ...Object.values(MovieStatus), '多刷'].map((status) => (
                                        <button
                                            key={status}
                                            onClick={() => setFilterStatus(status)}
                                            className={`px-3 py-1.5 sm:px-3.5 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all border touch-manipulation active:scale-95 ${filterStatus === status
                                                ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-500/20 font-bold'
                                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white active:bg-slate-700'
                                                }`}
                                        >
                                            {status}
                                        </button>
                                    ))}
                                </div>

                                {/* View Mode Switcher (Grid vs Poster Wall) */}
                                <div className="flex items-center bg-slate-800 p-1 rounded-lg border border-slate-700 shrink-0 ml-auto">
                                    <button
                                        type="button"
                                        onClick={() => handleViewModeChange('grid')}
                                        className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                                        title="标准卡片模式 (快捷键: 1)"
                                    >
                                        <LayoutGrid size={15} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleViewModeChange('poster')}
                                        className={`p-1.5 rounded-md transition-all ${viewMode === 'poster' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                                        title="海报墙模式 (快捷键: 2)"
                                    >
                                        <ImageIcon size={15} />
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Movie Grid / Poster Wall */}
                {sortedMovies.length === 0 ? (
                    <div className="text-center py-20 border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/50">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-800 mb-4">
                            <Film size={32} className="text-slate-600" />
                        </div>
                        <h3 className="text-xl font-medium text-slate-300 mb-2">未找到记录</h3>
                        <p className="text-slate-500 max-w-sm mx-auto mb-6">
                            {hasActiveFilters
                                ? "尝试调整搜索、分类、类型、地区、时间或状态筛选条件。"
                                : "添加你看过的第一部电影或电视剧吧。"}
                        </p>
                        {hasActiveFilters ? (
                            <Button variant="outline" size="sm" onClick={handleClearAllFilters}>
                                清除所有筛选条件
                            </Button>
                        ) : (
                            <Button onClick={() => setIsFormOpen(true)}>添加第一条记录</Button>
                        )}
                    </div>
                ) : (
                    <>
                        {viewMode === 'poster' ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4.5">
                                {currentDisplayedMovies.map(movie => (
                                    <PosterWallCard
                                        key={movie.id}
                                        movie={movie}
                                        allMovies={movies}
                                        onEdit={openEdit}
                                        onDelete={deleteMovie}
                                        onQuickEpisodeUpdate={(id, nextEp) => {
                                            const m = movies.find(x => x.id === id);
                                            if (m) handleQuickEpisodeUpdate(m, 1);
                                        }}
                                        isSelectionMode={isSelectionMode}
                                        isSelected={selectedIds.has(movie.id)}
                                        onToggleSelect={toggleSelectMovie}
                                        onToast={(msg, type) => toast.addToast(msg, type)}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                                {currentDisplayedMovies.map(movie => (
                                    <MovieCard
                                        key={movie.id}
                                        movie={movie}
                                        allMovies={movies}
                                        onEdit={openEdit}
                                        onDelete={deleteMovie}
                                        onQuickEpisodeUpdate={handleQuickEpisodeUpdate}
                                        isSelectionMode={isSelectionMode}
                                        isSelected={selectedIds.has(movie.id)}
                                        onToggleSelect={toggleSelectMovie}
                                        onToast={(msg, type) => toast.addToast(msg, type)}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Pagination Controls */}
                        {sortedMovies.length > 0 && (
                            <div className="flex flex-col sm:flex-row justify-between items-center mt-8 gap-4 bg-slate-800/50 p-4 rounded-xl border border-slate-800">
                                <div className="text-xs sm:text-sm text-slate-400 text-center sm:text-left">
                                    正在显示 <span className="text-white font-medium">{indexOfFirstItem + 1}</span> - <span className="text-white font-medium">{Math.min(indexOfLastItem, sortedMovies.length)}</span> 条，
                                    共 <span className="text-white font-medium">{sortedMovies.length}</span> 条
                                </div>

                                <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                                    <select
                                        value={itemsPerPage}
                                        onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                        className="bg-slate-900 border border-slate-700 text-slate-300 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-1.5 outline-none w-full sm:w-auto"
                                    >
                                        <option value={12}>每页 12 条</option>
                                        <option value={24}>每页 24 条</option>
                                        <option value={48}>每页 48 条</option>
                                        <option value={96}>每页 96 条</option>
                                    </select>

                                    <div className="flex items-center gap-1 justify-center">
                                        <button
                                            onClick={() => handlePageChange(currentPage - 1)}
                                            disabled={currentPage === 1}
                                            className="p-2 rounded-lg bg-slate-900 text-slate-400 border border-slate-700 hover:bg-slate-800 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <ChevronLeft size={16} />
                                        </button>

                                        <span className="px-3 py-1 text-sm text-slate-300 font-medium whitespace-nowrap">
                                            {currentPage} / {totalPages}
                                        </span>

                                        <button
                                            onClick={() => handlePageChange(currentPage + 1)}
                                            disabled={currentPage === totalPages}
                                            className="p-2 rounded-lg bg-slate-900 text-slate-400 border border-slate-700 hover:bg-slate-800 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <ChevronRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
                </div>
            </main>

            {/* Modal */}
            {isFormOpen && (
                <MovieForm
                    initialData={editingMovie}
                    existingMovies={movies}
                    onSubmit={editingMovie ? handleUpdateMovie : handleAddMovie}
                    onCancel={() => { setIsFormOpen(false); setEditingMovie(null); }}
                    onToast={(msg, type) => toast.addToast(msg, type)}
                />
            )}

            {/* Sync Modal */}
            <SyncModal
                isOpen={isSyncModalOpen}
                onClose={() => setIsSyncModalOpen(false)}
                config={syncConfig}
                movies={movies}
                onImportMovies={importMovies}
                onSaveConfig={saveSyncConfig}
                onUpload={handleUpload}
                onDownload={handleDownload}
                onOpenTvMerge={() => setIsTvMergeOpen(true)}
                isSyncing={isSyncing}
                syncStatus={syncStatus}
                statusMessage={statusMessage}
            />

            {/* TV Merge Cleaner Modal */}
            <TvMergeModal
                isOpen={isTvMergeOpen}
                onClose={() => setIsTvMergeOpen(false)}
                movies={movies}
                onApplyMerge={(mergedMovies, removedIds, msg) => {
                    replaceMovies(mergedMovies, removedIds);
                    toast.success(msg);
                }}
                onToast={(msg, type) => toast[type](msg)}
            />

            {/* AI Butler */}
            <AiButler
                movies={movies}
                isOpen={isAiButlerOpen}
                onClose={() => setIsAiButlerOpen(false)}
                onOpen={() => setIsAiButlerOpen(true)}
                onToast={(msg, type) => toast.addToast(msg, type)}
            />

            {/* 移动端专属五段式底部导航栏 */}
            <MobileNavBar
                activeTab={mobileTab}
                onTabChange={(tab) => {
                    setMobileTab(tab);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onOpenAddMovie={() => {
                    setEditingMovie(null);
                    setIsFormOpen(true);
                }}
                onOpenAiButler={() => setIsAiButlerOpen(true)}
                onOpenSettings={() => setIsSyncModalOpen(true)}
            />

            {/* Toast Notifications */}
            <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
        </div>
    );
}
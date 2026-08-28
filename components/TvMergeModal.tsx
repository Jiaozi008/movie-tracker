import React, { useMemo, useState } from 'react';
import { Movie } from '../types';
import { findMergeableTvGroups, mergeAllDuplicateTvShows } from '../utils/mergeUtils';
import { downloadFile } from '../utils/fileUtils';
import { Button } from './ui/Button';
import { Sparkles, X, Tv, Clock, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck, Download } from 'lucide-react';

interface TvMergeModalProps {
    isOpen: boolean;
    onClose: () => void;
    movies: Movie[];
    onApplyMerge: (mergedMovies: Movie[], removedIds: string[], successMsg: string) => void;
    onToast?: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export const TvMergeModal: React.FC<TvMergeModalProps> = ({
    isOpen,
    onClose,
    movies,
    onApplyMerge,
    onToast
}) => {
    const [isMerging, setIsMerging] = useState(false);

    const mergeableGroups = useMemo(() => {
        if (!isOpen) return [];
        return findMergeableTvGroups(movies);
    }, [isOpen, movies]);

    if (!isOpen) return null;

    const totalOldRecords = mergeableGroups.reduce((sum, g) => sum + g.records.length, 0);

    const handleManualBackup = () => {
        try {
            const backupJson = JSON.stringify(movies, null, 2);
            downloadFile(backupJson, 'json');
            onToast?.('已为您下载当前片库备份 JSON 文件 🛡️', 'success');
        } catch {
            onToast?.('备份下载失败', 'error');
        }
    };

    const handleExecuteMerge = () => {
        if (mergeableGroups.length === 0) return;

        setIsMerging(true);
        try {
            // 执行合并清洗
            const result = mergeAllDuplicateTvShows(movies);
            const msg = `🎉 成功合并 ${result.mergedGroupCount} 部电视剧（已精炼为 ${result.mergedGroupCount} 条完整记录，页面已实时更新）`;

            // 直接在页面上完整呈现最新状态
            onApplyMerge(result.mergedMovies, result.removedIds, msg);
            onClose();
        } catch (err: any) {
            console.error('Merge TV shows failed:', err);
            onToast?.(err.message || '合并失败，请检查数据格式', 'error');
        } finally {
            setIsMerging(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-fuchsia-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-fuchsia-500/20">
                            <Sparkles size={20} className="text-white" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                智能合并同剧分段记录
                                {mergeableGroups.length > 0 && (
                                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30">
                                        发现 {mergeableGroups.length} 部可合并
                                    </span>
                                )}
                            </h3>
                            <p className="text-xs text-slate-400 mt-0.5">
                                聚合分段观看集数与独立倍速流水，100% 精确保留各次打卡热力图与手记
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
                    {mergeableGroups.length === 0 ? (
                        <div className="text-center py-12 px-4 border border-dashed border-slate-800 rounded-xl bg-slate-800/30">
                            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 mx-auto flex items-center justify-center mb-3">
                                <CheckCircle2 size={24} />
                            </div>
                            <h4 className="text-sm font-semibold text-slate-200">片库状态极佳</h4>
                            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                                未检测到重复或分段打卡的电视剧记录，每部剧均为独立的单条流水。
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Safety Notice */}
                            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-indigo-200 text-xs">
                                <ShieldCheck size={18} className="text-indigo-400 shrink-0 mt-0.5" />
                                <div className="leading-relaxed">
                                    <span className="font-bold text-white">无损合并与实时呈现：</span>
                                    点击合并后将<b>直接在页面上呈现最新状态</b>；各分段不同的倍速（如 1.0x、1.5x、2.0x）将无损写入单集流水中，总观影时长按分段精准求和，打卡热力图与短评完整保留。
                                </div>
                            </div>

                            {/* Group List Preview */}
                            <div className="space-y-3">
                                {mergeableGroups.map(group => {
                                    const base = group.records[0];
                                    const hours = Math.floor(group.estimatedWatchTime / 60);
                                    const mins = group.estimatedWatchTime % 60;
                                    const timeStr = hours > 0 ? `${hours}小时${mins}分` : `${mins}分钟`;

                                    return (
                                        <div
                                            key={group.key}
                                            className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 hover:border-slate-600 transition-colors"
                                        >
                                            <div className="flex items-start justify-between gap-3 mb-3">
                                                <div className="flex items-center gap-3">
                                                    {base.posterImage ? (
                                                        <img
                                                            src={base.posterImage}
                                                            alt={group.title}
                                                            className="w-10 h-14 object-cover rounded-md shadow shrink-0"
                                                        />
                                                    ) : (
                                                        <div className="w-10 h-14 rounded-md bg-slate-700 flex items-center justify-center shrink-0">
                                                            <Tv size={18} className="text-slate-400" />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                                            《{group.title}》
                                                            <span className="text-[11px] font-normal text-slate-400">
                                                                ({group.records.length} 条分段)
                                                            </span>
                                                        </h4>
                                                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                                                            <span>总集数: {group.maxEpisode}{group.totalEpisodes ? `/${group.totalEpisodes}` : ''} 集</span>
                                                            <span>·</span>
                                                            <span className="flex items-center gap-1 text-emerald-400 font-medium">
                                                                <Clock size={12} /> 累加时长: {timeStr}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="text-right">
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                                                        合并为 1 条 <ArrowRight size={11} />
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Segments Breakdown */}
                                            <div className="mt-2.5 pt-2.5 border-t border-slate-700/40 space-y-1.5">
                                                <div className="text-[11px] font-medium text-slate-400">分段历史流水：</div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-slate-300">
                                                    {group.segmentSummary.map((seg, i) => (
                                                        <div
                                                            key={i}
                                                            className="px-2.5 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between text-[11px]"
                                                        >
                                                            <span>{seg}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between gap-3">
                    <div className="text-xs text-slate-400">
                        {mergeableGroups.length > 0 ? (
                            <span>
                                预计将 <strong className="text-white">{totalOldRecords}</strong> 条分段精简合并为 <strong className="text-white">{mergeableGroups.length}</strong> 条
                            </span>
                        ) : (
                            <span>无需执行合并</span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {mergeableGroups.length > 0 && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleManualBackup}
                                className="border-slate-700 text-slate-300 hover:text-white"
                                title="手动下载当前片库 JSON 备份"
                            >
                                <Download size={13} className="mr-1" /> 下载备份
                            </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={onClose}>
                            关闭
                        </Button>
                        {mergeableGroups.length > 0 && (
                            <Button
                                size="sm"
                                onClick={handleExecuteMerge}
                                disabled={isMerging}
                                className="bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white font-bold shadow-lg shadow-indigo-500/20"
                            >
                                <Sparkles size={14} className="mr-1.5" />
                                {isMerging ? '合并中...' : '一键无损合并（直接应用到页面）'}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

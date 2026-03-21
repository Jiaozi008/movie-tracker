
import React, { useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { Movie } from '../types';
import html2canvas from 'html2canvas';
import { X, Download, Star, Film, Tv, Clock, User, Users, Copy, Check } from 'lucide-react';

interface ShareCardProps {
    movie: Movie;
    onClose: () => void;
    onToast?: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

const THEMES = [
    { name: '深空黑', bg: 'from-slate-950 via-slate-900 to-slate-950', accent: 'text-indigo-400', ring: 'ring-indigo-500/30', dot: 'bg-indigo-500' },
    { name: '暮光橙', bg: 'from-orange-950 via-rose-950 to-slate-950', accent: 'text-amber-400', ring: 'ring-amber-500/30', dot: 'bg-amber-500' },
    { name: '极光绿', bg: 'from-emerald-950 via-teal-950 to-slate-950', accent: 'text-emerald-400', ring: 'ring-emerald-500/30', dot: 'bg-emerald-500' },
    { name: '星海蓝', bg: 'from-blue-950 via-indigo-950 to-slate-950', accent: 'text-cyan-400', ring: 'ring-cyan-500/30', dot: 'bg-cyan-500' },
    { name: '玫瑰红', bg: 'from-rose-950 via-pink-950 to-slate-950', accent: 'text-rose-400', ring: 'ring-rose-500/30', dot: 'bg-rose-500' },
];

export const ShareCard: React.FC<ShareCardProps> = ({ movie, onClose, onToast }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const [themeIndex, setThemeIndex] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const theme = THEMES[themeIndex];
    const isTv = movie.mediaType === 'tv';

    const renderStars = (rating: number) => {
        return Array.from({ length: 5 }, (_, i) => (
            <Star
                key={i}
                size={16}
                fill={i < rating ? 'currentColor' : 'none'}
                className={i < rating ? theme.accent : 'text-slate-600'}
            />
        ));
    };

    const handleSave = async () => {
        if (!cardRef.current || isSaving) return;
        setIsSaving(true);

        try {
            const canvas = await html2canvas(cardRef.current, {
                backgroundColor: null,
                scale: 3, // High DPI for crisp export
                useCORS: true,
                logging: false,
            });

            // Convert to blob and download
            canvas.toBlob((blob) => {
                if (blob) {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${movie.title}_CineLog.png`;
                    a.click();
                    URL.revokeObjectURL(url);
                    setSaved(true);
                    onToast?.('海报已保存到下载文件夹', 'success');
                    setTimeout(() => setSaved(false), 3000);
                }
            }, 'image/png', 1.0);
        } catch (error) {
            console.error('Export Error:', error);
            onToast?.('导出失败，请重试', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCopyToClipboard = async () => {
        if (!cardRef.current) return;
        try {
            const canvas = await html2canvas(cardRef.current, {
                backgroundColor: null,
                scale: 3,
                useCORS: true,
                logging: false,
            });

            canvas.toBlob(async (blob) => {
                if (blob) {
                    try {
                        await navigator.clipboard.write([
                            new ClipboardItem({ 'image/png': blob })
                        ]);
                        onToast?.('已复制到剪贴板', 'success');
                    } catch {
                        onToast?.('复制失败，请使用下载按钮', 'info');
                    }
                }
            }, 'image/png');
        } catch (error) {
            onToast?.('导出失败', 'error');
        }
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/80 backdrop-blur-lg" onClick={onClose}>
            <div className="max-w-md w-full flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>

                {/* The Card Itself (this is what gets exported) */}
                <div
                    ref={cardRef}
                    className={`bg-gradient-to-br ${theme.bg} rounded-2xl overflow-hidden shadow-2xl ${theme.ring} ring-1`}
                    style={{ fontFamily: "'Inter', 'Noto Sans SC', sans-serif" }}
                >
                    {/* Poster Area */}
                    <div className="relative h-72 overflow-hidden">
                        {movie.posterImage ? (
                            <>
                                <img
                                    src={movie.posterImage}
                                    alt={movie.title}
                                    className="w-full h-full object-cover"
                                    crossOrigin="anonymous"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                            </>
                        ) : (
                            <div
                                className="w-full h-full"
                                style={{ background: `linear-gradient(135deg, ${movie.posterColor || '#6366f1'} 0%, #0f172a 100%)` }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                                <div className="absolute inset-0 flex items-center justify-center opacity-20">
                                    {isTv ? <Tv size={80} /> : <Film size={80} />}
                                </div>
                            </div>
                        )}

                        {/* Title Overlay */}
                        <div className="absolute bottom-0 left-0 right-0 p-5">
                            <h2 className="text-2xl font-bold text-white leading-tight drop-shadow-lg">
                                {movie.title}
                            </h2>
                            <div className="flex items-center gap-2 mt-2 text-sm text-slate-300">
                                {movie.year && <span>{movie.year}</span>}
                                {movie.country && <><span className="opacity-50">·</span><span>{movie.country}</span></>}
                                {movie.genre && <><span className="opacity-50">·</span><span>{movie.genre}</span></>}
                            </div>
                        </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-5 space-y-4">
                        {/* Rating Stars */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                                {renderStars(movie.rating)}
                            </div>
                            <span className={`text-2xl font-black ${theme.accent}`}>
                                {movie.rating > 0 ? `${movie.rating}.0` : '—'}
                            </span>
                        </div>

                        {/* Meta Info */}
                        <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                            {movie.director && (
                                <span className="flex items-center gap-1">
                                    <User size={11} className="opacity-60" /> {movie.director}
                                </span>
                            )}
                            {movie.cast && (
                                <span className="flex items-center gap-1">
                                    <Users size={11} className="opacity-60" /> {movie.cast}
                                </span>
                            )}
                            {movie.duration && movie.duration > 0 && (
                                <span className="flex items-center gap-1">
                                    <Clock size={11} className="opacity-60" /> {isTv ? `${movie.duration}分/集` : `${movie.duration}分`}
                                </span>
                            )}
                            {isTv && movie.totalEpisodes && (
                                <span className="flex items-center gap-1">
                                    <Tv size={11} className="opacity-60" /> 共{movie.totalEpisodes}集
                                </span>
                            )}
                        </div>

                        {/* Review Quote */}
                        {movie.review && (
                            <div className="relative">
                                <div className={`absolute -left-1 top-0 bottom-0 w-0.5 ${theme.dot} rounded-full opacity-60`} />
                                <p className="text-sm text-slate-300 italic leading-relaxed pl-3 line-clamp-4">
                                    "{movie.review}"
                                </p>
                            </div>
                        )}

                        {/* Watermark Footer */}
                        <div className="flex items-center justify-between pt-3 border-t border-white/5">
                            <div className="flex items-center gap-2">
                                <div className={`w-5 h-5 rounded-md flex items-center justify-center ${theme.dot}`}>
                                    <Film size={10} className="text-white" />
                                </div>
                                <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">
                                    CineLog AI
                                </span>
                            </div>
                            <span className="text-[10px] text-slate-600">
                                {new Date(movie.addedAt).toLocaleDateString('zh-CN')} 观影
                            </span>
                        </div>
                    </div>
                </div>

                {/* Controls (outside the export area) — Two rows */}
                <div className="space-y-2">
                    {/* Row 1: Theme Selector */}
                    <div className="flex items-center justify-center gap-2 bg-slate-800/80 rounded-xl px-4 py-2.5 border border-slate-700">
                        <span className="text-xs text-slate-500 mr-1">主题</span>
                        {THEMES.map((t, i) => (
                            <button
                                key={t.name}
                                onClick={() => setThemeIndex(i)}
                                className={`w-7 h-7 rounded-full ${t.dot} transition-all ${i === themeIndex ? 'ring-2 ring-white scale-110' : 'opacity-50 hover:opacity-100'
                                    }`}
                                title={t.name}
                            />
                        ))}
                    </div>

                    {/* Row 2: Action Buttons */}
                    <div className="flex gap-2">
                        <button
                            onClick={handleCopyToClipboard}
                            className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-800/80 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition-all text-sm"
                        >
                            <Copy size={16} />
                            <span>复制</span>
                        </button>

                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className={`flex-[2] flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm transition-all ${saved
                                ? 'bg-green-600 text-white'
                                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/30'
                                }`}
                        >
                            {saved ? <Check size={16} /> : isSaving ? <Download size={16} className="animate-bounce" /> : <Download size={16} />}
                            {saved ? '已保存' : isSaving ? '生成中...' : '保存图片'}
                        </button>

                        <button
                            onClick={onClose}
                            className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-800/80 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 transition-all text-sm"
                        >
                            <X size={16} />
                            <span>关闭</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

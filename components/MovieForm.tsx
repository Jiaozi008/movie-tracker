import React, { useEffect, useRef, useState } from 'react';
import { Movie, MovieStatus, MediaType } from '../types';
import { Button } from './ui/Button';
import { StarRating } from './StarRating';
import { useMovieForm, saveFormDraft, loadFormDraft, clearFormDraft, getTodayString, getOffsetDateString, MovieFormState } from '../hooks/useMovieForm';
import { useMovieAi } from '../hooks/useMovieAi';
import { resizeImage } from '../utils/imageUtils';
import { TmdbSearchModal } from './TmdbSearchModal';
import { TmdbDetailResult, downloadPosterAsBase64 } from '../services/tmdbService';
import { translateToChinese } from '../services/geminiService';
import { normalizeTitle } from '../utils/titleNormalizer';
import { getRecommendedIteration as getRecommendedIterationUtil, calculateTvInheritedHabits } from '../utils/statsCalculator';
import { calculateMovieActualWatchTime } from '../utils/episodeUtils';
import { parseClipboardMediaText } from '../utils/clipboardParser';
import { extractSmartTags } from '../utils/tagExtractor';
import {
  Wand2, Sparkles, X, Tv, Film, Upload, Image as ImageIcon, Trash2,
  ArrowLeft, Database, Monitor, Users, Tag, ChevronDown, ChevronUp,
  ClipboardPaste, RotateCcw, Check, Images, FileText, Star
} from 'lucide-react';

interface MovieFormProps {
  initialData?: Movie | null;
  existingMovies: Movie[];
  onSubmit: (movie: Omit<Movie, 'id' | 'lastUpdated'> & { id?: string }) => void;
  onCancel: () => void;
  onToast?: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export const MovieForm: React.FC<MovieFormProps> = ({ initialData, existingMovies, onSubmit, onCancel, onToast }) => {
  const { state, setField, setMultiple, resetForm } = useMovieForm(initialData);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showTmdbSearch, setShowTmdbSearch] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [posterGallery, setPosterGallery] = useState<string[]>([]);
  const [isPosterDownloading, setIsPosterDownloading] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [draftDetected, setDraftDetected] = useState<MovieFormState | null>(null);
  const lastAutoFilledTitle = useRef<string>('');

  // 1. 检查是否存在未提交的草稿（仅在新增模式下）
  useEffect(() => {
    if (!initialData) {
      const savedDraft = loadFormDraft();
      if (savedDraft && (savedDraft.title || savedDraft.review || savedDraft.posterImage)) {
        setDraftDetected(savedDraft);
      }
    }
  }, [initialData]);

  // 2. 自动防抖保存草稿（仅在新增模式下）
  useEffect(() => {
    if (!initialData) {
      const timer = setTimeout(() => {
        saveFormDraft(state);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [state, initialData]);

  // 3. 监听全局 Ctrl+V 粘贴海报图片
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            try {
              const resizedImage = await resizeImage(file);
              setField('posterImage', resizedImage);
              notify('已从剪贴板粘贴海报封面', 'success');
            } catch (err) {
              console.error('Error pasting image:', err);
              notify('海报图片解析失败', 'error');
            }
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [setField]);

  const existingTagPool = React.useMemo(() => {
    const tagSet = new Set<string>();
    existingMovies.forEach(m => {
      if (m.tags && Array.isArray(m.tags)) {
        m.tags.forEach(t => {
          const trimmed = t.trim();
          if (trimmed) tagSet.add(trimmed);
        });
      }
    });
    return Array.from(tagSet).sort((a, b) => a.localeCompare(b, 'zh-CN'));
  }, [existingMovies]);

  // 计算进阶信息已填写项数
  const advancedCount = React.useMemo(() => {
    let count = 0;
    if (state.year) count++;
    if (state.country) count++;
    if (state.director) count++;
    if (state.duration) count++;
    if (state.cast) count++;
    if (state.platform) count++;
    return count;
  }, [state]);

  const handleAddTag = (tagToAdd: string) => {
    const trimmed = tagToAdd.trim().replace(/^#+/, '');
    if (!trimmed) return;
    const genreTokens = new Set((state.genre || '').split(/[,，/、\s]+/).map(g => g.trim().toLowerCase()).filter(Boolean));
    if (genreTokens.has(trimmed.toLowerCase())) {
      notify(`「${trimmed}」已存在于影视类型中，保留类型即可`, 'info');
      setTagInput('');
      return;
    }
    if (!state.tags.includes(trimmed)) {
      setField('tags', [...state.tags, trimmed]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setField('tags', state.tags.filter(t => t !== tagToRemove));
  };

  const notify = (msg: string, type: 'success' | 'error' | 'info' | 'warning' = 'error') => {
    if (onToast) {
      onToast(msg, type);
    } else {
      alert(msg);
    }
  };

  // 剪贴板智能解析文本或链接
  const handleSmartClipboardPaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text || !text.trim()) {
        notify('剪贴板为空', 'warning');
        return;
      }

      const parsed = parseClipboardMediaText(text);
      if (!parsed || !parsed.title) {
        notify('未能识别出有效的片名或链接', 'warning');
        return;
      }

      const updates: Partial<MovieFormState> = {
        title: parsed.title,
      };

      if (parsed.year) updates.year = parsed.year;
      if (parsed.mediaType) updates.mediaType = parsed.mediaType;

      const genreTokens = new Set((state.genre || '').split(/[,，/、\s]+/).map(g => g.trim().toLowerCase()).filter(Boolean));
      const clipTags = extractSmartTags({ title: parsed.title, mediaType: parsed.mediaType })
        .filter(t => !genreTokens.has(t.trim().toLowerCase()));
      if (state.tags.length === 0 && clipTags.length > 0) {
        updates.tags = clipTags;
      }

      setMultiple(updates);
      setShowSuggestions(true);
      notify(`已识别「${parsed.title}」${parsed.year ? ` (${parsed.year})` : ''}`, 'success');
    } catch (err) {
      console.warn('Clipboard read failed:', err);
      notify('无法访问剪贴板，请手动粘贴至标题输入框', 'info');
    }
  };

  const suggestions = React.useMemo(() => {
    if (!state.title.trim()) return [];

    const keywords = state.title.trim().split(/\s+/).map(k => normalizeTitle(k)).filter(k => k.length > 0);
    const searchTerms = keywords.length > 0
      ? keywords
      : state.title.trim().toLowerCase().split(/\s+/).filter(k => k.length > 0);

    if (searchTerms.length === 0) return [];

    const seen = new Set<string>();
    const matches: Movie[] = [];

    const sorted = [...existingMovies].sort((a, b) => b.addedAt - a.addedAt);
    for (const m of sorted) {
      const normTitle = normalizeTitle(m.title);
      const rawLowerTitle = m.title.toLowerCase();

      const isMatch = searchTerms.every(kw => normTitle.includes(kw) || rawLowerTitle.includes(kw));

      if (isMatch) {
        if (!seen.has(normTitle)) {
          seen.add(normTitle);
          matches.push(m);
          if (matches.length >= 8) break;
        }
      }
    }
    return matches;
  }, [existingMovies, state.title, state.mediaType]);

  const getInheritedHabits = (movieTitle: string, userMediaType: MediaType) => {
    const match = existingMovies
      .filter(m => normalizeTitle(m.title) === normalizeTitle(movieTitle) && (m.mediaType || 'movie') === userMediaType)
      .sort((a, b) => b.addedAt - a.addedAt)[0];

    if (!match) return {};
    let playbackSpeed = '1.0';
    let customSpeed = '1.5';
    if (match.playbackSpeed) {
      const speedVal = match.playbackSpeed;
      if ([1.0, 1.5, 1.75, 2.0].includes(speedVal)) {
        playbackSpeed = Number.isInteger(speedVal) ? speedVal.toFixed(1) : speedVal.toString();
      } else {
        playbackSpeed = 'custom';
        customSpeed = speedVal.toFixed(2);
      }
    }
    const habits: any = {
      status: match.status,
      rating: match.rating || 0,
      playbackSpeed,
      customSpeed,
      platform: match.platform || ''
    };
    if (match.mediaType === 'tv') {
      const recommendedIteration = parseInt(getRecommendedIteration(movieTitle, 'tv')) || 1;
      const lastIteration = match.watchIteration || 1;
      const inherited = calculateTvInheritedHabits(
        match.currentEpisode || 0,
        match.totalEpisodes || 0,
        lastIteration,
        recommendedIteration
      );
      habits.currentEpisode = inherited.currentEpisode;
      habits.status = inherited.status;
    }
    return habits;
  };

  const getRecommendedIteration = (movieTitle: string, mediaType: MediaType) => {
    return getRecommendedIterationUtil(movieTitle, mediaType, existingMovies, initialData?.id);
  };

  const handleTmdbSelect = async (detail: TmdbDetailResult, posterBase64: string | null) => {
    const cleanGenre = (g: string) => g ? g.split(/[, ，]\s*/).filter(tag => tag !== '剧情' && tag !== 'Drama').join(', ') : '';
    const cleanGenreStr = cleanGenre(detail.genre);
    const genreTokens = new Set(cleanGenreStr.split(/[,，/、\s]+/).map(g => g.trim().toLowerCase()).filter(Boolean));

    const autoTags = ((detail.tags && detail.tags.length > 0)
      ? detail.tags
      : extractSmartTags({
          title: detail.title,
          genre: cleanGenreStr,
          overview: detail.overview || '',
          country: detail.country || '',
          voteAverage: detail.voteAverage || 0,
          mediaType: detail.mediaType
        })).filter(t => !genreTokens.has(t.trim().toLowerCase()));

    const filteredExistingTags = state.tags.filter(t => !genreTokens.has(t.trim().toLowerCase()));
    const finalTags = (filteredExistingTags.length === 0)
      ? autoTags
      : Array.from(new Set([...filteredExistingTags, ...autoTags])).slice(0, 5);

    const baseData = {
      title: detail.title,
      year: detail.year,
      country: detail.country,
      genre: cleanGenreStr,
      director: detail.director,
      cast: detail.cast || '',
      overview: detail.overview || '',
      tmdbRating: detail.voteAverage > 0 ? Number(detail.voteAverage.toFixed(1)) : undefined,
      tags: finalTags,
      mediaType: detail.mediaType,
      duration: detail.duration ? detail.duration.toString() : '',
      platform: detail.platform || '',
      watchIteration: getRecommendedIteration(detail.title, (detail.mediaType || 'movie') as MediaType),
      ...(detail.totalEpisodes ? { totalEpisodes: detail.totalEpisodes.toString() } : {}),
      ...(posterBase64 ? { posterImage: posterBase64 } : (detail.posterUrl ? { posterImage: detail.posterUrl } : {})),
      ...getInheritedHabits(detail.title, detail.mediaType || 'movie'),
    };

    setMultiple(baseData);

    if (detail.posterOptions && detail.posterOptions.length > 0) {
      setPosterGallery(detail.posterOptions);
    }

    notify(`已从 TMDB 填充「${detail.title}」的数据，正在翻译详情...`, 'info');

    try {
      const [cnDirector, cnGenre, cnCast, cnCountry] = await Promise.all([
        translateToChinese(detail.director, 'name'),
        translateToChinese(detail.genre, 'genre'),
        translateToChinese(detail.cast || '', 'name'),
        translateToChinese(detail.country || '', 'country')
      ]);

      if (cnDirector !== detail.director || cnGenre !== detail.genre || cnCast !== (detail.cast || '') || cnCountry !== (detail.country || '')) {
        setMultiple({
          director: cnDirector,
          genre: cleanGenre(cnGenre),
          cast: cnCast,
          country: cnCountry,
        });
        notify(`翻译并填充完成`, 'success');
      } else {
        notify(`填充完成`, 'success');
      }
    } catch (e) {
      console.error("Auto-translation failed:", e);
      notify(`填充完成（翻译失败）`, 'info');
    }
  };

  // AI integration via custom hook
  const { isAiLoading, isReviewLoading, handleAiFill, handleAiReview } = useMovieAi({
    existingMovies,
    initialData,
    status: state.status,
    mediaType: state.mediaType,
    rating: state.rating,
    title: state.title,
    onMetadataFetched: (data) => {
      const cleanedGenre = data.genre ? data.genre.split(/[,，]\s*/).filter(tag => tag !== '剧情' && tag !== 'Drama').join(', ') : '';
      const genreTokens = new Set(cleanedGenre.split(/[,，/、\s]+/).map(g => g.trim().toLowerCase()).filter(Boolean));

      const autoAiTags = ((data.tags && data.tags.length > 0)
        ? data.tags
        : extractSmartTags({
            title: data.title,
            genre: cleanedGenre,
            overview: data.overview || '',
            country: data.country || '',
            mediaType: data.mediaType
          })).filter(t => !genreTokens.has(t.trim().toLowerCase()));

      const filteredExistingTags = state.tags.filter(t => !genreTokens.has(t.trim().toLowerCase()));
      const finalTags = (filteredExistingTags.length === 0)
        ? autoAiTags
        : Array.from(new Set([...filteredExistingTags, ...autoAiTags])).slice(0, 5);

      setMultiple({
        title: data.title,
        year: data.year,
        country: data.country,
        genre: cleanedGenre,
        director: data.director,
        posterColor: data.posterColor,
        mediaType: data.mediaType,
        overview: data.overview || '',
        tags: finalTags,
        ...(data.duration ? { duration: data.duration.toString() } : {}),
        ...(data.totalEpisodes ? { totalEpisodes: data.totalEpisodes.toString() } : {}),
        watchIteration: getRecommendedIteration(data.title, (data.mediaType || 'movie') as MediaType),
        ...getInheritedHabits(data.title, data.mediaType || 'movie'),
      });
    },
    onReviewGenerated: (review) => setField('review', review),
    onError: (msg) => notify(msg, 'error'),
  });

  const handleSelectSuggestion = (suggestion: Movie) => {
    const habits = getInheritedHabits(suggestion.title, suggestion.mediaType || 'movie');

    const updates: any = {
      title: suggestion.title,
      mediaType: suggestion.mediaType,
      year: suggestion.year,
      country: suggestion.country || '',
      genre: suggestion.genre,
      director: suggestion.director || '',
      cast: suggestion.cast || '',
      overview: suggestion.overview || '',
      tmdbRating: suggestion.tmdbRating,
      posterColor: suggestion.posterColor,
      posterImage: suggestion.posterImage || '',
      duration: suggestion.duration ? suggestion.duration.toString() : '',
      watchIteration: getRecommendedIteration(suggestion.title, (suggestion.mediaType || 'movie') as MediaType),
      ...habits,
    };

    if (suggestion.mediaType === 'tv') {
      updates.totalEpisodes = suggestion.totalEpisodes ? suggestion.totalEpisodes.toString() : '';
    }

    setMultiple(updates);
    setShowSuggestions(false);
    lastAutoFilledTitle.current = normalizeTitle(suggestion.title);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const resizedImage = await resizeImage(file);
        setField('posterImage', resizedImage);
      } catch (error) {
        console.error("Error processing image:", error);
        notify('无法处理图片，请重试', 'error');
      }
    }
  };

  const handleSubmit = (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const trimmedTitle = state.title.trim();
    if (!trimmedTitle) {
      notify('请输入作品标题', 'warning');
      return;
    }

    try {
      const speedVal = state.playbackSpeed === 'custom'
        ? (parseFloat(state.customSpeed) || 1.0)
        : (parseFloat(state.playbackSpeed) || 1.0);
      const actualSpeed = Math.min(3.0, Math.max(0.5, speedVal));

      const durationNum = Math.max(0, parseInt(state.duration) || 0);

      let finalStatus = state.status;
      if (state.mediaType === 'tv') {
        const ep = parseInt(state.currentEpisode) || 0;
        const total = parseInt(state.totalEpisodes) || 0;
        if (total > 0 && ep >= total && finalStatus === MovieStatus.WATCHING) {
          finalStatus = MovieStatus.WATCHED;
        }
      }

      const watchedDateStr = state.watchedDate || getTodayString();
      const parsedDate = new Date(watchedDateStr).getTime();
      const addedAtTimestamp = isNaN(parsedDate) ? Date.now() : parsedDate;

      let updatedWatchHistory = initialData?.watchHistory ? [...initialData.watchHistory] : undefined;
      const parsedCurrentEp = state.mediaType === 'tv' ? (parseInt(state.currentEpisode) || 0) : 0;
      if (state.mediaType === 'tv' && parsedCurrentEp > 0) {
        if (!updatedWatchHistory || updatedWatchHistory.length === 0) {
          updatedWatchHistory = Array.from({ length: parsedCurrentEp }, (_, i) => ({
            episode: i + 1,
            date: addedAtTimestamp,
            playbackSpeed: actualSpeed
          }));
        } else if (updatedWatchHistory.length < parsedCurrentEp) {
          const padCount = parsedCurrentEp - updatedWatchHistory.length;
          for (let i = 0; i < padCount; i++) {
            updatedWatchHistory.push({
              episode: updatedWatchHistory.length + 1,
              date: addedAtTimestamp,
              playbackSpeed: actualSpeed
            });
          }
        } else if (updatedWatchHistory.length > parsedCurrentEp) {
          updatedWatchHistory = updatedWatchHistory.slice(0, parsedCurrentEp);
        }
      } else if (state.mediaType === 'tv' && parsedCurrentEp === 0) {
        updatedWatchHistory = [];
      }

      let actualWatchTime = 0;
      if (state.mediaType === 'tv') {
        actualWatchTime = calculateMovieActualWatchTime({
          duration: durationNum,
          playbackSpeed: actualSpeed,
          currentEpisode: parsedCurrentEp,
          mediaType: 'tv',
          watchHistory: updatedWatchHistory
        }, updatedWatchHistory);
      } else {
        actualWatchTime = Math.round(durationNum / actualSpeed);
      }

      // 维护重温多刷时间流水 rewatchHistory
      const iterationNum = Math.max(1, parseInt(state.watchIteration) || 1);
      let updatedRewatchHistory = initialData?.rewatchHistory ? [...initialData.rewatchHistory] : undefined;
      if (iterationNum > 1) {
        if (!updatedRewatchHistory || updatedRewatchHistory.length === 0) {
          updatedRewatchHistory = [
            { iteration: 1, date: initialData?.addedAt || addedAtTimestamp },
            { iteration: iterationNum, date: addedAtTimestamp, rating: state.rating, note: state.review }
          ];
        } else {
          const existingIdx = updatedRewatchHistory.findIndex(r => r.iteration === iterationNum);
          if (existingIdx >= 0) {
            updatedRewatchHistory[existingIdx] = {
              ...updatedRewatchHistory[existingIdx],
              date: addedAtTimestamp,
              rating: state.rating,
              note: state.review
            };
          } else {
            updatedRewatchHistory.push({
              iteration: iterationNum,
              date: addedAtTimestamp,
              rating: state.rating,
              note: state.review
            });
          }
        }
      }

      // 成功保存后清除草稿
      if (!initialData) {
        clearFormDraft();
      }

      onSubmit({
        id: initialData?.id,
        title: trimmedTitle,
        year: state.year,
        country: state.country,
        genre: state.genre,
        director: state.director,
        rating: state.rating,
        tmdbRating: (state.tmdbRating !== undefined && state.tmdbRating !== null && !isNaN(Number(state.tmdbRating)) && Number(state.tmdbRating) > 0)
          ? Number(state.tmdbRating)
          : undefined,
        overview: state.overview.trim() || undefined,
        status: finalStatus,
        review: state.review,
        posterColor: state.posterColor,
        posterImage: state.posterImage,
        mediaType: state.mediaType,
        currentEpisode: state.mediaType === 'tv' ? Math.min(parseInt(state.currentEpisode) || 0, parseInt(state.totalEpisodes) || Infinity) : undefined,
        totalEpisodes: state.mediaType === 'tv' ? (parseInt(state.totalEpisodes) || 0) : undefined,
        duration: durationNum,
        playbackSpeed: actualSpeed,
        actualWatchTime: actualWatchTime,
        addedAt: addedAtTimestamp,
        platform: state.platform,
        cast: state.cast || undefined,
        watchIteration: iterationNum,
        watchHistory: updatedWatchHistory,
        rewatchHistory: updatedRewatchHistory,
        tags: state.tags.length > 0 ? state.tags : undefined,
      });
    } catch (err: any) {
      console.error('Error submitting movie form:', err);
      notify(err?.message || '保存记录失败，请检查输入', 'error');
    }
  };

  // 辅助计算评分文案与徽章颜色
  const getRatingInfo = (r: number) => {
    if (r >= 4.5) return { label: '神作', score: (r * 2).toFixed(1), color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
    if (r >= 4.0) return { label: '推荐', score: (r * 2).toFixed(1), color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
    if (r >= 3.0) return { label: '良作', score: (r * 2).toFixed(1), color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' };
    if (r > 0) return { label: '一般', score: (r * 2).toFixed(1), color: 'text-slate-400 bg-slate-500/10 border-slate-500/30' };
    return null;
  };

  const ratingInfo = getRatingInfo(state.rating);

  const todayStr = getTodayString();
  const yesterdayStr = getOffsetDateString(-1);
  const beforeYesterdayStr = getOffsetDateString(-2);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center sm:p-4 bg-black/80">
      <form
        onSubmit={handleSubmit}
        noValidate
        className="bg-slate-900 w-full h-full sm:h-auto sm:max-h-[90vh] sm:rounded-2xl sm:max-w-lg shadow-2xl flex flex-col transition-all overflow-hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Header */}
        <div
          className="flex justify-between items-center px-4 py-3 sm:px-6 sm:py-5 border-b border-slate-800 shrink-0 bg-slate-900 z-10"
          style={{ paddingTop: 'max(env(safe-area-inset-top), 0.75rem)' }}
        >
          <div className="flex items-center gap-2">
            <button onClick={onCancel} className="sm:hidden text-slate-400 hover:text-white p-1 -ml-1" type="button">
              <ArrowLeft size={24} />
            </button>
            <h2 className="text-lg sm:text-xl font-semibold text-white">
              {initialData ? '编辑记录' : '添加新记录'}
            </h2>
          </div>
          <button onClick={onCancel} type="button" className="hidden sm:block text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
          <Button type="submit" onClick={handleSubmit} className="sm:hidden shadow-lg shadow-indigo-500/20" size="sm">
            {initialData ? '保存' : '添加'}
          </Button>
        </div>

        {/* Draft Notice Banner */}
        {draftDetected && (
          <div className="bg-indigo-950/80 border-b border-indigo-500/30 px-4 py-2 flex items-center justify-between gap-2 text-xs text-indigo-200">
            <span className="truncate">
              📝 检测到未提交草稿「{draftDetected.title || '草稿记录'}」
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  resetForm(draftDetected);
                  setDraftDetected(null);
                  notify('已恢复未保存草稿', 'success');
                }}
                className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-medium transition-colors"
              >
                恢复
              </button>
              <button
                type="button"
                onClick={() => {
                  clearFormDraft();
                  setDraftDetected(null);
                }}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded transition-colors"
              >
                丢弃
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar no-scrollbar bg-slate-900/50">
          {/* Media Type Toggle */}
          <div className="flex bg-slate-800 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setField('mediaType', 'movie')}
              className={`flex-1 py-2.5 sm:py-2 px-4 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-all ${state.mediaType === 'movie' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Film size={16} /> 电影
            </button>
            <button
              type="button"
              onClick={() => setField('mediaType', 'tv')}
              className={`flex-1 py-2.5 sm:py-2 px-4 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-all ${state.mediaType === 'tv' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Tv size={16} /> 电视剧
            </button>
          </div>

          {/* Title Input with Smart Clipboard, TMDB & AI */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-slate-300">标题</label>
              <button
                type="button"
                onClick={handleSmartClipboardPaste}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors touch-manipulation"
                title="一键读取剪贴板文本或豆瓣链接"
              >
                <ClipboardPaste size={13} /> 剪贴板识别
              </button>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={state.title}
                  onChange={(e) => {
                    setField('title', e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => {
                    if (!initialData && state.title.trim().length > 0) {
                      const normTitle = normalizeTitle(state.title);
                      if (lastAutoFilledTitle.current !== normTitle) {
                        const exactMatch = [...existingMovies]
                          .sort((a, b) => b.addedAt - a.addedAt)
                          .find(m => normalizeTitle(m.title) === normTitle);
                        if (exactMatch) {
                          handleSelectSuggestion(exactMatch);
                        } else {
                          setField('watchIteration', getRecommendedIteration(state.title, state.mediaType as MediaType));
                        }
                      }
                    }
                    setShowSuggestions(false);
                  }}
                  autoComplete="off"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 sm:py-2 text-base sm:text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none relative z-10"
                  placeholder={state.mediaType === 'movie' ? "例如：盗梦空间" : "例如：三体"}
                  required
                />

                {showSuggestions && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-2xl overflow-hidden z-50">
                    {suggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        className="w-full px-4 py-2.5 text-left text-sm text-slate-200 hover:bg-indigo-600 hover:text-white transition-colors border-b border-slate-700/50 last:border-0 flex items-center justify-between"
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSelectSuggestion(suggestion);
                        }}
                      >
                        <span className="truncate">{suggestion.title}</span>
                        <span className="text-xs text-slate-400 opacity-80 shrink-0 ml-2">本地已有</span>
                      </button>
                    ))}
                    {state.title.trim() && (
                      <button
                        type="button"
                        className="w-full px-4 py-2.5 text-left text-sm text-indigo-300 bg-indigo-950/40 hover:bg-indigo-600 hover:text-white transition-colors flex items-center gap-2"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setShowSuggestions(false);
                          setShowTmdbSearch(true);
                        }}
                      >
                        <Database size={14} /> 在 TMDB 中搜索「{state.title}」
                      </button>
                    )}
                  </div>
                )}
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowTmdbSearch(true)}
                disabled={!state.title}
                title="从 TMDB 搜索（精准数据 + 海报）"
                className="px-3"
              >
                <Database size={18} />
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleAiFill}
                disabled={!state.title || isAiLoading}
                title="使用 AI 自动填充"
                className="px-3"
              >
                {isAiLoading ? <Wand2 className="animate-spin" size={18} /> : <Wand2 size={18} />}
              </Button>
            </div>
          </div>

          {/* Poster Image Upload & Multi-poster Gallery */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-slate-300">海报图片</label>
              <span className="text-xs text-slate-500">支持 Ctrl+V 截图直接粘贴</span>
            </div>
            <div className="flex items-center gap-4">
              <div
                className="w-20 h-28 sm:w-16 sm:h-24 bg-slate-800 rounded-lg border border-slate-700 flex items-center justify-center overflow-hidden shrink-0 relative group cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
                style={{ background: state.posterImage ? 'transparent' : state.posterColor }}
                title="点击上传图片，或直接截图按 Ctrl+V 粘贴"
              >
                {state.posterImage ? (
                  <img src={state.posterImage} alt="Cover" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="text-white/50" size={24} />
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Upload size={16} className="text-white" />
                </div>
              </div>

              <div className="flex-1">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  className="hidden"
                />
                <div className="flex gap-2 flex-wrap">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="py-1.5"
                  >
                    上传封面
                  </Button>
                  {state.posterImage && (
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => setField('posterImage', '')}
                      className="py-1.5"
                    >
                      <Trash2 size={16} />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-2">支持 JPG, PNG, WebP。自动压缩优化存储。</p>
              </div>
            </div>

            {/* TMDB Multi-Poster Gallery Selector */}
            {posterGallery.length > 1 && (
              <div className="pt-2 border-t border-slate-700/40">
                <div className="text-xs text-slate-400 mb-2 flex items-center gap-1.5">
                  <Images size={13} className="text-indigo-400" />
                  <span>TMDB 备选海报库 (点击一键换封面)：</span>
                </div>
                <div className="flex gap-2.5 overflow-x-auto pb-1.5 custom-scrollbar">
                  {posterGallery.map((url, idx) => (
                    <button
                      key={idx}
                      type="button"
                      disabled={isPosterDownloading}
                      onClick={async () => {
                        try {
                          setIsPosterDownloading(true);
                          notify('正在下载并设置备选海报...', 'info');
                          const b64 = await downloadPosterAsBase64(url);
                          setField('posterImage', b64);
                          notify('已切换为备选海报', 'success');
                        } catch {
                          setField('posterImage', url);
                        } finally {
                          setIsPosterDownloading(false);
                        }
                      }}
                      className="w-12 h-16 rounded-md overflow-hidden bg-slate-800 border border-slate-700 hover:border-indigo-500 hover:scale-105 transition-all shrink-0 active:scale-95 shadow-sm"
                      title={`备选海报 ${idx + 1}`}
                    >
                      <img src={url} alt={`Poster ${idx + 1}`} className="w-full h-full object-cover" loading="lazy" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* TV Specific Fields: Episodes */}
          {state.mediaType === 'tv' && (
            <div className="grid grid-cols-2 gap-4 bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">已看集数</label>
                <input
                  type="number"
                  min="0"
                  value={state.currentEpisode}
                  onChange={(e) => setField('currentEpisode', e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 sm:py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none text-base sm:text-sm"
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">总集数</label>
                <input
                  type="number"
                  min="0"
                  value={state.totalEpisodes}
                  onChange={(e) => setField('totalEpisodes', e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 sm:py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none text-base sm:text-sm"
                  placeholder="例如: 24"
                />
              </div>
            </div>
          )}

          {/* Watched Date with Quick Selection Capsules */}
          <div className="space-y-2 bg-slate-800/40 p-3.5 rounded-xl border border-slate-700/40">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-slate-300">观影打卡日期</label>
              <div className="flex gap-1.5">
                {[
                  { label: '今天', val: todayStr },
                  { label: '昨天', val: yesterdayStr },
                  { label: '前天', val: beforeYesterdayStr },
                ].map(item => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setField('watchedDate', item.val)}
                    className={`text-xs px-2.5 py-1 rounded-md transition-all touch-manipulation border ${state.watchedDate === item.val
                      ? 'bg-indigo-600 border-indigo-500 text-white font-medium shadow-sm'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                      }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <input
              type="date"
              value={state.watchedDate}
              onChange={(e) => setField('watchedDate', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 sm:py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none placeholder-slate-500 text-base sm:text-sm"
              required
            />
          </div>

          {/* Status, Iteration, Rating & TMDB Score */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Status */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">观看状态</label>
              <select
                value={state.status}
                onChange={(e) => setField('status', e.target.value as MovieStatus)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 sm:py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none appearance-none text-base sm:text-sm"
              >
                {Object.values(MovieStatus).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Watch Iteration */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">观影轮次 (重温)</label>
              <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg h-[44px] sm:h-[38px] overflow-hidden">
                <button
                  type="button"
                  onClick={() => {
                    const cur = parseInt(state.watchIteration) || 1;
                    if (cur > 1) setField('watchIteration', (cur - 1).toString());
                  }}
                  className="px-3 h-full text-slate-400 hover:text-white hover:bg-slate-700 active:bg-slate-600 transition-colors"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  value={state.watchIteration}
                  onChange={(e) => setField('watchIteration', e.target.value)}
                  onBlur={() => {
                    const cur = parseInt(state.watchIteration) || 1;
                    setField('watchIteration', Math.max(1, cur).toString());
                  }}
                  className="w-full bg-transparent border-0 text-center text-white focus:ring-0 outline-none text-base sm:text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    const cur = parseInt(state.watchIteration) || 1;
                    setField('watchIteration', (cur + 1).toString());
                  }}
                  className="px-3 h-full text-slate-400 hover:text-white hover:bg-slate-700 active:bg-slate-600 transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            {/* My Rating */}
            <div className="space-y-2 flex flex-col justify-end py-1 sm:py-0">
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-slate-300">我的评分</label>
                {ratingInfo && (
                  <span className={`text-xs px-2 py-0.5 rounded border font-semibold ${ratingInfo.color}`}>
                    {ratingInfo.score}分 · {ratingInfo.label}
                  </span>
                )}
              </div>
              <div className="flex justify-center sm:justify-start">
                <StarRating rating={state.rating} onRatingChange={(r) => setField('rating', r)} size={28} />
              </div>
            </div>

            {/* TMDB Platform Rating */}
            <div className="space-y-2 flex flex-col justify-end py-1 sm:py-0">
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-slate-300 flex items-center gap-1.5">
                  <Star size={13} className="text-amber-400 fill-amber-400" />
                  TMDB 平台评分
                </label>
                {state.tmdbRating && Number(state.tmdbRating) > 0 ? (
                  <span className="text-xs px-2 py-0.5 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    ★ {Number(state.tmdbRating).toFixed(1)} 分
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-500">TMDB 自动获取</span>
                )}
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={state.tmdbRating !== undefined && state.tmdbRating !== null ? state.tmdbRating : ''}
                  onChange={(e) => {
                    const val = e.target.value !== '' ? parseFloat(e.target.value) : undefined;
                    setField('tmdbRating', val);
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 sm:py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none text-base sm:text-sm"
                  placeholder="从 TMDB 自动获取 (例如: 8.5)"
                />
              </div>
            </div>
          </div>

          {/* Playback Speed Section (Above Custom Tags) */}
          <div className="space-y-2 bg-slate-800/30 p-3.5 rounded-xl border border-slate-700/50">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-slate-300 flex items-center gap-1.5">
                <span className="text-amber-400">⚡</span> 倍速播放折算
              </label>
              {state.playbackSpeed !== '1.0' && (
                <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium">
                  {state.playbackSpeed === 'custom' ? `${state.customSpeed}x` : `${state.playbackSpeed}x`} 折算中
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {[
                { label: '1.0x 原速', val: '1.0' },
                { label: '1.25x', val: '1.25' },
                { label: '1.5x', val: '1.5' },
                { label: '1.75x', val: '1.75' },
                { label: '2.0x', val: '2.0' },
                { label: '自定义', val: 'custom' },
              ].map(opt => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => setField('playbackSpeed', opt.val)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all border touch-manipulation active:scale-95 ${state.playbackSpeed === opt.val
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm font-bold'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {state.playbackSpeed === 'custom' && (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="number"
                  step="0.05"
                  min="0.5"
                  max="3.0"
                  value={state.customSpeed}
                  onChange={(e) => setField('customSpeed', e.target.value)}
                  onBlur={(e) => {
                    const num = parseFloat(e.target.value);
                    if (isNaN(num)) {
                      setField('customSpeed', '1.5');
                    } else {
                      const clamped = Math.min(3.0, Math.max(0.5, num));
                      setField('customSpeed', clamped.toFixed(2));
                    }
                  }}
                  className="w-24 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-center"
                  placeholder="1.50"
                />
                <span className="text-slate-400 text-xs">x (支持 0.5x ~ 3.0x)</span>
              </div>
            )}
            <p className="text-[11px] text-slate-500">
              {state.mediaType === 'tv'
                ? '按 已看集数 × 单集时长 ÷ 倍速 自动折算实际耗时'
                : '按 影视总时长 ÷ 倍速 自动折算实际耗时'}
            </p>
          </div>

          {/* Custom Tags Section */}
          <div className="space-y-3 bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Tag size={16} className="text-indigo-400" /> 自定义标签 (Tags)
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const genreTokens = new Set(
                      (state.genre || '')
                        .split(/[,，/、\s]+/)
                        .map(g => g.trim().toLowerCase())
                        .filter(Boolean)
                    );
                    const smart = extractSmartTags({
                      title: state.title,
                      genre: state.genre,
                      overview: state.overview,
                      country: state.country,
                      voteAverage: state.tmdbRating,
                      mediaType: state.mediaType
                    }).filter(t => !genreTokens.has(t.trim().toLowerCase()));

                    const existingFiltered = state.tags.filter(t => !genreTokens.has(t.trim().toLowerCase()));
                    const merged = Array.from(new Set([...existingFiltered, ...smart])).slice(0, 5);

                    if (smart.length > 0 || merged.length !== state.tags.length) {
                      setField('tags', merged);
                      notify(`已智能生成 ${smart.length} 个特征标签（已自动剔除与类型重复项）`, 'success');
                    } else {
                      notify('未能提取出新标签，或均已包含在类型中', 'warning');
                    }
                  }}
                  className="text-indigo-400 hover:text-indigo-300 text-xs flex items-center gap-1 hover:underline p-0.5 touch-manipulation"
                  title="根据片名、类型与剧情简介智能提取标签（自动过滤类型相同项）"
                >
                  <Sparkles size={12} />
                  智能打标签
                </button>
                <span className="text-xs text-slate-500 hidden sm:inline">按回车添加</span>
              </div>
            </div>

            {state.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {state.tags.map(t => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 shadow-sm"
                  >
                    #{t}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(t)}
                      className="hover:text-white text-indigo-400 transition-colors"
                      title="移除标签"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    handleAddTag(tagInput);
                  }
                }}
                onBlur={() => {
                  if (tagInput.trim()) handleAddTag(tagInput);
                }}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 sm:py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none text-base sm:text-sm"
                placeholder="输入标签名（例如：高分烧脑、治愈、赛博朋克...）"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleAddTag(tagInput)}
                disabled={!tagInput.trim()}
                className="px-3"
              >
                添加
              </Button>
            </div>

            {existingTagPool.length > 0 && (
              <div className="pt-2 border-t border-slate-700/40">
                <span className="text-xs text-slate-500 mr-2">常用标签：</span>
                <div className="inline-flex flex-wrap gap-1.5 mt-1">
                  {existingTagPool.slice(0, 12).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleAddTag(t)}
                      disabled={state.tags.includes(t)}
                      className={`text-xs px-2.5 py-1 sm:py-0.5 rounded transition-all border touch-manipulation active:scale-95 ${state.tags.includes(t)
                        ? 'bg-slate-800 border-slate-700 text-slate-500 opacity-40 cursor-default'
                        : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:border-indigo-500 hover:text-indigo-300 hover:bg-slate-800 active:bg-slate-700'}`}
                    >
                      +{t}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Collapsible Advanced Information Section */}
          <div className="border border-slate-700/60 rounded-xl overflow-hidden bg-slate-800/20">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full px-4 py-3 bg-slate-800/40 hover:bg-slate-800/70 transition-colors flex items-center justify-between text-left touch-manipulation"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-300">
                  {showAdvanced ? '收起更多详细信息' : '展开更多详细信息 (年份 / 地区 / 导演 / 时长 / 主演 / 平台)'}
                </span>
                {advancedCount > 0 && (
                  <span className="text-[11px] px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full font-medium">
                    已填 {advancedCount} 项
                  </span>
                )}
              </div>
              {showAdvanced ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
            </button>

            {showAdvanced && (
              <div className="p-4 space-y-4 border-t border-slate-700/60 bg-slate-900/40">
                {/* Release Year & Country */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">上映年份</label>
                    <input
                      type="number"
                      value={state.year}
                      onChange={(e) => setField('year', e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 sm:py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none text-base sm:text-sm"
                      placeholder="例如: 2024"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">国家 / 地区</label>
                    <input
                      type="text"
                      value={state.country}
                      onChange={(e) => setField('country', e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 sm:py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none text-base sm:text-sm"
                      placeholder="例如: 美国"
                    />
                  </div>
                </div>

                {/* Genre & Director */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">类型 / 分类</label>
                    <input
                      type="text"
                      value={state.genre}
                      onChange={(e) => setField('genre', e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 sm:py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none text-base sm:text-sm"
                      placeholder="科幻, 悬疑"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">导演 / 主创</label>
                    <input
                      type="text"
                      value={state.director}
                      onChange={(e) => setField('director', e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 sm:py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none text-base sm:text-sm"
                      placeholder="Christopher Nolan"
                    />
                  </div>
                </div>

                {/* Duration & Cast */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">
                      {state.mediaType === 'tv' ? '单集时长' : '时长'} (分钟)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={state.duration}
                      onChange={(e) => setField('duration', e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 sm:py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none text-base sm:text-sm"
                      placeholder="120"
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-2">
                    <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                      <Users size={14} className="text-indigo-400" /> 主演
                    </label>
                    <input
                      type="text"
                      value={state.cast}
                      onChange={(e) => setField('cast', e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 sm:py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none text-base sm:text-sm"
                      placeholder="多个演员用逗号分隔"
                    />
                  </div>
                </div>

                {/* Platform */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                    <Monitor size={14} className="text-indigo-400" /> 观看平台
                  </label>
                  <input
                    type="text"
                    value={state.platform}
                    onChange={(e) => setField('platform', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 sm:py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none text-base sm:text-sm"
                    placeholder="例如: Bilibili, Netflix, 院线..."
                  />
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {['Bilibili', 'Netflix', 'Disney+', 'HBO', 'Apple TV+', '腾讯视频', '爱奇艺', '优酷', '本地', '院线'].map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setField('platform', p)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${state.platform === p ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'}`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Overview / Synopsis Section */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-slate-300 flex items-center gap-1.5">
                <FileText size={14} className="text-indigo-400" />
                剧情简介
              </label>
              {state.overview ? (
                <span className="text-xs text-slate-400">
                  TMDB 自动获取 ({state.overview.length} 字)
                </span>
              ) : (
                <span className="text-xs text-slate-500">
                  TMDB 自动填充或手动补充
                </span>
              )}
            </div>
            <textarea
              value={state.overview}
              onChange={(e) => setField('overview', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none text-base sm:text-sm placeholder:text-slate-500"
              placeholder="TMDB 自动填充剧情梗概，也可手动补充..."
            />
          </div>

          {/* Review / Note Section */}
          <div className="space-y-2 pb-20 sm:pb-0">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-slate-300">评价 / 笔记</label>
              <button
                type="button"
                onClick={handleAiReview}
                className="text-indigo-400 text-xs flex items-center gap-1 hover:text-indigo-300 transition-colors px-2 py-1 rounded hover:bg-slate-800 touch-manipulation"
                disabled={isReviewLoading || !state.title}
              >
                {isReviewLoading ? <Sparkles size={14} className="animate-pulse" /> : <Sparkles size={14} />}
                AI 帮我写
              </button>
            </div>
            <textarea
              value={state.review}
              onChange={(e) => setField('review', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none h-28 resize-none text-base sm:text-sm"
              placeholder="你觉得这部作品怎么样？"
            />
          </div>
        </div>

        {/* Footer Actions (Visible on Mobile & Desktop) */}
        <div className="p-4 sm:p-5 border-t border-slate-800 flex justify-end items-center gap-3 bg-slate-900/95 backdrop-blur-md rounded-b-2xl shrink-0">
          <Button variant="ghost" onClick={onCancel} type="button">取消</Button>
          <Button type="submit" onClick={handleSubmit}>
            {initialData ? '保存修改' : '添加记录'}
          </Button>
        </div>
      </form>

      {/* TMDB Search Modal */}
      {showTmdbSearch && (
        <TmdbSearchModal
          initialQuery={state.title}
          onSelect={handleTmdbSelect}
          onClose={() => setShowTmdbSearch(false)}
          onError={(msg) => notify(msg, 'error')}
        />
      )}
    </div>
  );
};

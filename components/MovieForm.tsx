
import React, { useEffect, useRef, useState } from 'react';
import { Movie, MovieStatus, MediaType } from '../types';
import { Button } from './ui/Button';
import { StarRating } from './StarRating';
import { useMovieForm } from '../hooks/useMovieForm';
import { useMovieAi } from '../hooks/useMovieAi';
import { resizeImage } from '../utils/imageUtils';
import { TmdbSearchModal } from './TmdbSearchModal';
import { TmdbDetailResult } from '../services/tmdbService';
import { translateToChinese } from '../services/geminiService';
import { normalizeTitle } from '../utils/titleNormalizer';
import { getRecommendedIteration as getRecommendedIterationUtil } from '../utils/statsCalculator';
import { Wand2, Sparkles, X, Tv, Film, Upload, Image as ImageIcon, Trash2, ArrowLeft, Database, Monitor, Users } from 'lucide-react';

interface MovieFormProps {
  initialData?: Movie | null;
  existingMovies: Movie[];
  onSubmit: (movie: Omit<Movie, 'id' | 'lastUpdated'> & { id?: string }) => void;
  onCancel: () => void;
  onToast?: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export const MovieForm: React.FC<MovieFormProps> = ({ initialData, existingMovies, onSubmit, onCancel, onToast }) => {
  const { state, setField, setMultiple } = useMovieForm(initialData);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showTmdbSearch, setShowTmdbSearch] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const lastAutoFilledTitle = useRef<string>('');

  const suggestions = React.useMemo(() => {
    if (!state.title.trim()) return [];

    // Split the input into space-separated keywords, and normalize each
    const keywords = state.title.trim().split(/\s+/).map(k => normalizeTitle(k)).filter(k => k.length > 0);
    // If after normalization we have no keywords (e.g. they only typed "s01"), fall back to raw lowercased keywords
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

      // Ensure every search term is present in either the normalized or raw title (order independent fuzzy match)
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
    if (match.mediaType === 'tv' && match.currentEpisode) {
      habits.currentEpisode = (match.currentEpisode + 1).toString();
    }
    return habits;
  };

  const getRecommendedIteration = (movieTitle: string, mediaType: MediaType) => {
    return getRecommendedIterationUtil(movieTitle, mediaType, existingMovies, initialData?.id);
  };

  const handleTmdbSelect = async (detail: TmdbDetailResult, posterBase64: string | null) => {
    const cleanGenre = (g: string) => g ? g.split(/[, ，]\s*/).filter(tag => tag !== '剧情' && tag !== 'Drama').join(', ') : '';

    // Start with base data
    const baseData = {
      title: detail.title,
      year: detail.year,
      country: detail.country,
      genre: cleanGenre(detail.genre),
      director: detail.director,
      cast: detail.cast || '',
      mediaType: detail.mediaType,
      duration: detail.duration ? detail.duration.toString() : '',
      platform: detail.platform || '',
      watchIteration: getRecommendedIteration(detail.title, (detail.mediaType || 'movie') as MediaType),
      ...(detail.totalEpisodes ? { totalEpisodes: detail.totalEpisodes.toString() } : {}),
      ...(posterBase64 ? { posterImage: posterBase64 } : (detail.posterUrl ? { posterImage: detail.posterUrl } : {})),
      ...getInheritedHabits(detail.title, detail.mediaType || 'movie'),
    };

    setMultiple(baseData);
    notify(`已从 TMDB 填充「${detail.title}」的数据，正在翻译详情...`, 'info');

    // Background translation for names and genres
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

  const notify = (msg: string, type: 'success' | 'error' | 'info' | 'warning' = 'error') => {
    if (onToast) {
      onToast(msg, type);
    } else {
      alert(msg);
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
      setMultiple({
        title: data.title,
        year: data.year,
        country: data.country,
        genre: cleanedGenre,
        director: data.director,
        posterColor: data.posterColor,
        mediaType: data.mediaType,
        ...(data.duration ? { duration: data.duration.toString() } : {}),
        ...(data.totalEpisodes ? { totalEpisodes: data.totalEpisodes.toString() } : {}),
        watchIteration: getRecommendedIteration(data.title, (data.mediaType || 'movie') as MediaType),
        ...getInheritedHabits(data.title, data.mediaType || 'movie'),
      });
    },
    onReviewGenerated: (review) => setField('review', review),
    onError: (msg) => notify(msg, 'error'),
  });

  // Handle explicit click on autocomplete suggestion
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

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();

    const actualSpeed = state.playbackSpeed === 'custom'
      ? Math.min(3.0, Math.max(0.5, parseFloat(state.customSpeed) || 1.0))
      : parseFloat(state.playbackSpeed) || 1.0;

    const durationNum = parseInt(state.duration) || 0;
    let actualWatchTime = 0;

    if (state.mediaType === 'tv') {
      const episodesWatched = parseInt(state.currentEpisode) || 0;
      actualWatchTime = Math.round((episodesWatched * durationNum) / actualSpeed);
    } else {
      actualWatchTime = Math.round(durationNum / actualSpeed);
    }

    // 电视剧集满自动将"追剧中"升级为"完结"
    let finalStatus = state.status;
    if (state.mediaType === 'tv') {
      const ep = parseInt(state.currentEpisode) || 0;
      const total = parseInt(state.totalEpisodes) || 0;
      if (total > 0 && ep >= total && finalStatus === MovieStatus.WATCHING) {
        finalStatus = MovieStatus.WATCHED;
      }
    }

    const addedAtTimestamp = state.watchedDate ? new Date(state.watchedDate).getTime() : Date.now();

    onSubmit({
      id: initialData?.id,
      title: state.title,
      year: state.year,
      country: state.country,
      genre: state.genre,
      director: state.director,
      rating: state.rating,
      status: finalStatus,
      review: state.review,
      posterColor: state.posterColor,
      posterImage: state.posterImage,
      mediaType: state.mediaType,
      currentEpisode: state.mediaType === 'tv' ? (parseInt(state.currentEpisode) || 0) : undefined,
      totalEpisodes: state.mediaType === 'tv' ? (parseInt(state.totalEpisodes) || 0) : undefined,
      duration: durationNum,
      playbackSpeed: actualSpeed,
      actualWatchTime: actualWatchTime,
      addedAt: addedAtTimestamp,
      platform: state.platform,
      cast: state.cast || undefined,
      watchIteration: parseInt(state.watchIteration) || 1,
    });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center sm:p-4 bg-black/80">
      <form
        onSubmit={handleSubmit}
        className="bg-slate-900 w-full h-full sm:h-auto sm:max-h-[90vh] sm:rounded-2xl sm:max-w-lg shadow-2xl flex flex-col transition-all overflow-hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Header */}
        <div
          className="flex justify-between items-center px-4 py-3 sm:px-6 sm:py-6 border-b border-slate-800 shrink-0 bg-slate-900 z-10"
          style={{ paddingTop: 'max(env(safe-area-inset-top), 0.75rem)' }}
        >
          <div className="flex items-center gap-2">
            <button onClick={onCancel} className="sm:hidden text-slate-400 hover:text-white p-1 -ml-1">
              <ArrowLeft size={24} />
            </button>
            <h2 className="text-lg sm:text-xl font-semibold text-white">
              {initialData ? '编辑记录' : '添加新记录'}
            </h2>
          </div>
          <button onClick={onCancel} className="hidden sm:block text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
          <Button type="submit" className="sm:hidden shadow-lg shadow-indigo-500/20" size="sm">
            保存
          </Button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar no-scrollbar bg-slate-900/50">
          {/* Media Type Toggle */}
          <div className="flex bg-slate-800 p-1 rounded-lg mb-4">
            <button
              type="button"
              onClick={() => setField('mediaType', 'movie')}
              className={`flex-1 py-3 sm: py-2 px-4 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-all ${state.mediaType === 'movie' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Film size={16} /> 电影
            </button>
            <button
              type="button"
              onClick={() => setField('mediaType', 'tv')}
              className={`flex-1 py-3 sm: py-2 px-4 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-all ${state.mediaType === 'tv' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Tv size={16} /> 电视剧
            </button>
          </div>

          {/* Title Input with AI + TMDB Buttons */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">标题</label>
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
                    // Try to auto-fill if the user manually typed a perfect match and clicked away
                    if (!initialData && state.title.trim().length > 0) {
                      const normTitle = normalizeTitle(state.title);
                      if (lastAutoFilledTitle.current !== normTitle) {
                        // Find an exact match in the database, regardless of current media type toggle
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
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 sm:py-2 text-base sm:text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none relative z-10"
                  placeholder={state.mediaType === 'movie' ? "例如：盗梦空间" : "例如：三体"}
                  required
                />

                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-2xl overflow-hidden z-50">
                    {suggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        className="w-full px-4 py-2.5 text-left text-sm text-slate-200 hover:bg-indigo-600 hover:text-white transition-colors border-b border-slate-700/50 last:border-0"
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault(); // 阻止输入框失去焦点
                          handleSelectSuggestion(suggestion);
                        }}
                      >
                        {suggestion.title}
                      </button>
                    ))}
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
                <Database size={20} />
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleAiFill}
                disabled={!state.title || isAiLoading}
                title="使用 AI 自动填充"
                className="px-3"
              >
                {isAiLoading ? <Wand2 className="animate-spin" size={20} /> : <Wand2 size={20} />}
              </Button>
            </div>
          </div>

          {/* Poster Image Upload */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">海报图片</label>
            <div className="flex items-center gap-4">
              <div
                className="w-20 h-28 sm:w-16 sm:h-24 bg-slate-800 rounded-lg border border-slate-700 flex items-center justify-center overflow-hidden shrink-0 relative group cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
                style={{ background: state.posterImage ? 'transparent' : state.posterColor }}
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
                    className="py-2"
                  >
                    上传封面
                  </Button>
                  {state.posterImage && (
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => setField('posterImage', '')}
                      className="py-2"
                    >
                      <Trash2 size={16} />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-2">支持 JPG, PNG. 图片将自动压缩。</p>
              </div>
            </div>
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
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 sm:py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none text-base sm:text-sm"
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
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 sm:py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none text-base sm:text-sm"
                  placeholder="例如: 24"
                />
              </div>
            </div>
          )}

          {/* Date and Release Year */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">观影日期</label>
              <input
                type="date"
                value={state.watchedDate}
                onChange={(e) => setField('watchedDate', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 sm:py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none placeholder-slate-500 text-base sm:text-sm"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">上映年份</label>
              <input
                type="number"
                value={state.year}
                onChange={(e) => setField('year', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 sm:py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none text-base sm:text-sm"
                placeholder="2024"
              />
            </div>
          </div>

          {/* Country and Genre */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">国家 / 地区</label>
              <input
                type="text"
                value={state.country}
                onChange={(e) => setField('country', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 sm:py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none text-base sm:text-sm"
                placeholder="例如: 美国"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">类型</label>
              <input
                type="text"
                value={state.genre}
                onChange={(e) => setField('genre', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 sm:py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none text-base sm:text-sm"
                placeholder="科幻"
              />
            </div>
          </div>

          {/* Director & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-2">
              <label className="text-sm font-medium text-slate-300">导演 / 主创</label>
              <input
                type="text"
                value={state.director}
                onChange={(e) => setField('director', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 sm:py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none text-base sm:text-sm"
                placeholder="Christopher Nolan"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">
                {state.mediaType === 'tv' ? '单集时长' : '时长'} (分钟)
              </label>
              <input
                type="number"
                min="0"
                value={state.duration}
                onChange={(e) => setField('duration', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 sm:py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none text-base sm:text-sm"
                placeholder="120"
              />
            </div>
          </div>

          {/* Cast */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <Users size={14} className="text-indigo-400" /> 主演
            </label>
            <input
              type="text"
              value={state.cast}
              onChange={(e) => setField('cast', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 sm:py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none text-base sm:text-sm"
              placeholder="多个演员用逗号分隔，TMDB 可自动填充"
            />
          </div>

          {/* Playback Speed */}
          <div className="space-y-2 bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
              ⚡ 倍速播放
            </label>
            <div className="flex gap-3 items-center">
              <select
                value={state.playbackSpeed}
                onChange={(e) => setField('playbackSpeed', e.target.value)}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 sm:py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none appearance-none text-base sm:text-sm"
              >
                <option value="1.0">1.0x (原速)</option>
                <option value="1.5">1.5x</option>
                <option value="1.75">1.75x</option>
                <option value="2.0">2.0x</option>
                <option value="custom">自定义...</option>
              </select>

              {state.playbackSpeed === 'custom' && (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
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
                    className="w-20 bg-slate-800 border border-slate-700 rounded-lg px-3 py-3 sm:py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none text-base sm:text-sm text-center"
                    placeholder="1.50"
                  />
                  <span className="text-slate-400 text-sm">x</span>
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500">
              {state.mediaType === 'tv'
                ? '电视剧将按 已看集数 × 单集时长 ÷ 倍速 计算实际观影时长'
                : '电影将按 总时长 ÷ 倍速 计算实际观影时长'
              }
            </p>
          </div>

          {/* Status, Iteration & Rating */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">状态</label>
              <select
                value={state.status}
                onChange={(e) => setField('status', e.target.value as MovieStatus)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 sm:py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none appearance-none text-base sm:text-sm"
              >
                {Object.values(MovieStatus).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">观影轮次 (重温)</label>
              <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg h-[46px] sm:h-[38px] overflow-hidden">
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

            <div className="space-y-2 flex flex-col justify-end py-2 sm:py-0">
              <label className="text-sm font-medium text-slate-300 mb-2 sm:mb-1">评分</label>
              <div className="flex justify-center sm:justify-start">
                <StarRating rating={state.rating} onRatingChange={(r) => setField('rating', r)} size={32} />
              </div>
            </div>
          </div>

          {/* Platform Field */}
          <div className="space-y-3 bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">
            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <Monitor size={16} className="text-indigo-400" /> 观看平台
            </label>
            <input
              type="text"
              value={state.platform}
              onChange={(e) => setField('platform', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 sm:py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none text-base sm:text-sm"
              placeholder="例如: Bilibili, Netflix, 院线..."
            />
            <div className="flex flex-wrap gap-2">
              {['Bilibili', 'Netflix', 'Disney+', 'HBO', 'Apple TV+', 'Prime Video', 'Hulu', '腾讯视频', '爱奇艺', '优酷', '本地', '院线'].map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setField('platform', p)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${state.platform === p ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 pb-20 sm:pb-0">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-slate-300">评价 / 笔记</label>
              <button
                type="button"
                onClick={handleAiReview}
                className="text-indigo-400 text-xs flex items-center gap-1 hover:text-indigo-300 transition-colors px-2 py-1 rounded hover:bg-slate-800"
                disabled={isReviewLoading || !state.title}
              >
                {isReviewLoading ? <Sparkles size={14} className="animate-pulse" /> : <Sparkles size={14} />}
                AI 帮我写
              </button>
            </div>
            <textarea
              value={state.review}
              onChange={(e) => setField('review', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none h-32 resize-none text-base sm:text-sm"
              placeholder="你觉得这部作品怎么样？"
            />
          </div>
        </div>

        <div className="hidden sm:flex p-6 border-t border-slate-800 justify-end gap-3 bg-slate-900/50 rounded-b-2xl shrink-0">
          <Button variant="ghost" onClick={onCancel} type="button">取消</Button>
          <Button type="submit">
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

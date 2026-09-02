import { useState, useCallback } from 'react';
import { Movie, MovieStatus, MediaType } from '../types';
import { fetchMovieMetadata, generateAiReview, generateAiQuote } from '../services/geminiService';

interface UseMovieAiOptions {
    existingMovies: Movie[];
    initialData?: Movie | null;
    status: MovieStatus;
    mediaType: MediaType;
    rating: number;
    title: string;
    year?: string;
    director?: string;
    overview?: string;
    onMetadataFetched: (data: {
        title: string;
        year: string;
        country: string;
        genre: string;
        director: string;
        posterColor: string;
        mediaType: MediaType;
        duration?: number;
        totalEpisodes?: number;
        currentEpisode?: number;
        overview?: string;
        tags?: string[];
        quote?: string;
    }) => void;
    onReviewGenerated: (review: string) => void;
    onQuoteGenerated?: (quote: string) => void;
    onError: (msg: string) => void;
}

export const useMovieAi = ({
    existingMovies,
    initialData,
    status,
    mediaType,
    rating,
    title,
    year,
    director,
    overview,
    onMetadataFetched,
    onReviewGenerated,
    onQuoteGenerated,
    onError,
}: UseMovieAiOptions) => {
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [isReviewLoading, setIsReviewLoading] = useState(false);
    const [isQuoteLoading, setIsQuoteLoading] = useState(false);

    const handleAiFill = useCallback(async () => {
        if (!title) return;
        setIsAiLoading(true);
        try {
            const data = await fetchMovieMetadata(title);
            if (data) {
                // Check for existing record
                const isDuplicate = existingMovies.some(
                    m => m.title === data.title && m.id !== initialData?.id
                );

                if (isDuplicate) {
                    const confirmUpdate = window.confirm(
                        `检测到库中已有 "${data.title}" 的记录。\n\n是否继续使用 AI 数据填充当前表单？`
                    );
                    if (!confirmUpdate) {
                        setIsAiLoading(false);
                        return;
                    }
                }

                onMetadataFetched({
                    title: data.title,
                    year: data.year,
                    country: data.country || '',
                    genre: data.genre,
                    director: data.director,
                    posterColor: data.suggestedColorHex,
                    mediaType: data.mediaType,
                    duration: data.duration,
                    totalEpisodes: data.totalEpisodes,
                    currentEpisode: (data.mediaType === 'tv' && data.totalEpisodes && !initialData && status === MovieStatus.WATCHED)
                        ? data.totalEpisodes
                        : undefined,
                    overview: data.summary,
                    tags: data.tags,
                    quote: data.quote,
                });
            }
        } catch (error: any) {
            onError(error.message || 'AI 请求失败');
        } finally {
            setIsAiLoading(false);
        }
    }, [title, existingMovies, initialData, status, onMetadataFetched, onError]);

    const handleAiReview = useCallback(async () => {
        if (!title) return;
        setIsReviewLoading(true);
        try {
            const generatedReview = await generateAiReview(
                title,
                rating,
                mediaType,
                (accumulatedText) => {
                    onReviewGenerated(accumulatedText);
                }
            );
            onReviewGenerated(generatedReview);
        } catch (error: any) {
            onError(error.message || '生成影评失败');
        } finally {
            setIsReviewLoading(false);
        }
    }, [title, rating, mediaType, onReviewGenerated, onError]);

    const handleAiQuote = useCallback(async () => {
        if (!title) return;
        setIsQuoteLoading(true);
        try {
            const generatedQuote = await generateAiQuote(
                title,
                mediaType,
                year,
                director,
                overview,
                (accumulatedText) => {
                    if (onQuoteGenerated) {
                        onQuoteGenerated(accumulatedText);
                    }
                }
            );
            if (onQuoteGenerated) {
                onQuoteGenerated(generatedQuote);
            }
        } catch (error: any) {
            onError(error.message || '生成经典台词失败');
        } finally {
            setIsQuoteLoading(false);
        }
    }, [title, mediaType, year, director, overview, onQuoteGenerated, onError]);

    return { isAiLoading, isReviewLoading, isQuoteLoading, handleAiFill, handleAiReview, handleAiQuote };
};

import { useReducer, useEffect, useCallback } from 'react';
import { Movie, MovieStatus, MediaType } from '../types';

export interface MovieFormState {
    title: string;
    year: string;
    country: string;
    genre: string;
    director: string;
    rating: number;
    tmdbRating?: number;
    overview: string;
    status: MovieStatus;
    review: string;
    posterColor: string;
    posterImage: string;
    watchedDate: string;
    mediaType: MediaType;
    currentEpisode: string;
    totalEpisodes: string;
    duration: string;
    playbackSpeed: string;
    customSpeed: string;
    platform: string;
    cast: string;
    watchIteration: string;
    tags: string[];
}

export const DRAFT_STORAGE_KEY = 'gyjl_movie_form_draft';

export function saveFormDraft(state: MovieFormState): void {
    try {
        if (!state.title && !state.review && !state.posterImage) {
            sessionStorage.removeItem(DRAFT_STORAGE_KEY);
            return;
        }
        sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
        console.warn('Failed to save movie form draft:', e);
    }
}

export function loadFormDraft(): MovieFormState | null {
    try {
        const raw = sessionStorage.getItem(DRAFT_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && (parsed.title || parsed.review || parsed.posterImage)) {
            return parsed;
        }
    } catch (e) {
        console.warn('Failed to load movie form draft:', e);
    }
    return null;
}

export function clearFormDraft(): void {
    try {
        sessionStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch (e) {
        console.warn('Failed to clear movie form draft:', e);
    }
}

type FormAction =
    | { type: 'SET_FIELD'; field: keyof MovieFormState; value: string | number | string[] }
    | { type: 'SET_MULTIPLE'; payload: Partial<MovieFormState> }
    | { type: 'RESET'; payload: MovieFormState };

export const defaultState: MovieFormState = {
    title: '',
    year: '',
    country: '',
    genre: '',
    director: '',
    rating: 0,
    tmdbRating: undefined,
    overview: '',
    status: MovieStatus.WATCHED,
    review: '',
    posterColor: '#4f46e5',
    posterImage: '',
    watchedDate: '',
    mediaType: 'movie',
    currentEpisode: '',
    totalEpisodes: '',
    duration: '',
    playbackSpeed: '1.0',
    customSpeed: '1.5',
    platform: '',
    cast: '',
    watchIteration: '1',
    tags: [],
};

function formReducer(state: MovieFormState, action: FormAction): MovieFormState {
    switch (action.type) {
        case 'SET_FIELD': {
            const newState = { ...state, [action.field]: action.value };
            // 切换 mediaType 为电视剧时，状态默认切换为「追剧中」
            if (action.field === 'mediaType') {
                if (action.value === 'tv') {
                    if (state.status === MovieStatus.WATCHED || !state.status) {
                        newState.status = MovieStatus.WATCHING;
                    }
                } else if (action.value === 'movie' && state.status === MovieStatus.WATCHING) {
                    newState.status = MovieStatus.WATCHED;
                }
            }
            return newState;
        }
        case 'SET_MULTIPLE': {
            const newState = { ...state, ...action.payload };
            if (action.payload.mediaType === 'tv' && !action.payload.status) {
                if (state.status === MovieStatus.WATCHED || !state.status) {
                    newState.status = MovieStatus.WATCHING;
                }
            }
            return newState;
        }
        case 'RESET':
            return action.payload;
        default:
            return state;
    }
}

export function getTodayString(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getOffsetDateString(daysOffset: number): string {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function buildInitialState(initialData: Movie | null | undefined): MovieFormState {
    if (!initialData) {
        return { ...defaultState, watchedDate: getTodayString() };
    }

    let playbackSpeed = '1.0';
    let customSpeed = '1.5';
    if (initialData.playbackSpeed) {
        const speedVal = initialData.playbackSpeed;
        if ([1.0, 1.25, 1.5, 1.75, 2.0].includes(speedVal)) {
            playbackSpeed = Number.isInteger(speedVal) ? speedVal.toFixed(1) : speedVal.toString();
        } else {
            playbackSpeed = 'custom';
            customSpeed = speedVal.toFixed(2);
        }
    }

    let watchedDate = getTodayString();
    if (initialData.addedAt) {
        const d = new Date(initialData.addedAt);
        watchedDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    return {
        title: initialData.title,
        year: initialData.year || '',
        country: initialData.country || '',
        genre: initialData.genre || '',
        director: initialData.director || '',
        rating: initialData.rating,
        tmdbRating: initialData.tmdbRating,
        overview: initialData.overview || '',
        status: initialData.status,
        review: initialData.review || '',
        posterColor: initialData.posterColor || '#4f46e5',
        posterImage: initialData.posterImage || '',
        mediaType: initialData.mediaType || 'movie',
        currentEpisode: initialData.currentEpisode ? initialData.currentEpisode.toString() : '',
        totalEpisodes: initialData.totalEpisodes ? initialData.totalEpisodes.toString() : '',
        duration: initialData.duration ? initialData.duration.toString() : '',
        playbackSpeed,
        customSpeed,
        watchedDate,
        platform: initialData.platform || '',
        cast: initialData.cast || '',
        watchIteration: initialData.watchIteration ? initialData.watchIteration.toString() : '1',
        tags: initialData.tags || [],
    };
}

export const useMovieForm = (initialData: Movie | null | undefined) => {
    const [state, dispatch] = useReducer(formReducer, initialData, buildInitialState);

    // Re-initialize when initialData changes (e.g., switching from add to edit)
    useEffect(() => {
        dispatch({ type: 'RESET', payload: buildInitialState(initialData) });
    }, [initialData]);

    const setField = useCallback(<K extends keyof MovieFormState>(field: K, value: MovieFormState[K]) => {
        dispatch({ type: 'SET_FIELD', field, value });
    }, []);

    const setMultiple = useCallback((payload: Partial<MovieFormState>) => {
        dispatch({ type: 'SET_MULTIPLE', payload });
    }, []);

    const resetForm = useCallback((payload: MovieFormState) => {
        dispatch({ type: 'RESET', payload });
    }, []);

    return { state, setField, setMultiple, resetForm, dispatch };
};

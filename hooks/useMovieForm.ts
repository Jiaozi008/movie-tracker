import { useReducer, useEffect, useCallback } from 'react';
import { Movie, MovieStatus, MediaType } from '../types';

export interface MovieFormState {
    title: string;
    year: string;
    country: string;
    genre: string;
    director: string;
    rating: number;
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
}

type FormAction =
    | { type: 'SET_FIELD'; field: keyof MovieFormState; value: string | number }
    | { type: 'SET_MULTIPLE'; payload: Partial<MovieFormState> }
    | { type: 'RESET'; payload: MovieFormState };

const defaultState: MovieFormState = {
    title: '',
    year: '',
    country: '',
    genre: '',
    director: '',
    rating: 0,
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
};

function formReducer(state: MovieFormState, action: FormAction): MovieFormState {
    switch (action.type) {
        case 'SET_FIELD':
            return { ...state, [action.field]: action.value };
        case 'SET_MULTIPLE':
            return { ...state, ...action.payload };
        case 'RESET':
            return action.payload;
        default:
            return state;
    }
}

function getTodayString(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function buildInitialState(initialData: Movie | null | undefined): MovieFormState {
    if (!initialData) {
        return { ...defaultState, watchedDate: getTodayString() };
    }

    let playbackSpeed = '1.0';
    let customSpeed = '1.5';
    if (initialData.playbackSpeed) {
        const speedVal = initialData.playbackSpeed;
        if ([1.0, 1.5, 1.75, 2.0].includes(speedVal)) {
            // Ensure 1 becomes '1.0' and 2 becomes '2.0' to match select options
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
    };
}

export const useMovieForm = (initialData: Movie | null | undefined) => {
    const [state, dispatch] = useReducer(formReducer, initialData, buildInitialState);

    // Re-initialize when initialData changes (e.g., switching from add to edit)
    useEffect(() => {
        dispatch({ type: 'RESET', payload: buildInitialState(initialData) });
    }, [initialData]);

    const setField = useCallback(<K extends keyof MovieFormState>(field: K, value: MovieFormState[K]) => {
        dispatch({ type: 'SET_FIELD', field, value: value as string | number });
    }, []);

    const setMultiple = useCallback((payload: Partial<MovieFormState>) => {
        dispatch({ type: 'SET_MULTIPLE', payload });
    }, []);

    return { state, setField, setMultiple, dispatch };
};

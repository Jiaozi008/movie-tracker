
import { useState, useEffect, useCallback } from 'react';
import { Movie } from '../types';
import { migrateAllMovieStatuses } from '../utils/migrationUtils';

const STORAGE_KEY = 'cinelog_movies_v1';

export interface UseMoviesCallbacks {
  onSuccess?: (msg: string) => void;
  onError?: (msg: string) => void;
  onInfo?: (msg: string) => void;
}

export const useMovies = (callbacks?: UseMoviesCallbacks) => {
  const [movies, setMovies] = useState<Movie[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return [];
      const raw: Movie[] = JSON.parse(saved);
      const { migrated, didMigrate } = migrateAllMovieStatuses(raw);
      if (didMigrate) {
        setTimeout(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated)), 0);
      }
      return migrated;
    } catch (e) {
      console.error("Failed to load movies", e);
      return [];
    }
  });

  const [isSaving, setIsSaving] = useState(false);

  // Real-time Save Effect
  useEffect(() => {
    setIsSaving(true);
    const handler = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(movies));
      setIsSaving(false);
    }, 500);

    return () => clearTimeout(handler);
  }, [movies]);

  const addMovie = useCallback((movieData: Omit<Movie, 'id' | 'lastUpdated'>) => {
    const newMovie: Movie = {
      ...movieData,
      id: crypto.randomUUID(),
      addedAt: movieData.addedAt || Date.now(),
      lastUpdated: Date.now(),
    };
    setMovies(prev => [newMovie, ...prev]);
  }, []);

  const updateMovie = useCallback((movieData: Partial<Movie> & { id: string }) => {
    setMovies(prev => prev.map(m => m.id === movieData.id ? {
      ...m,
      ...movieData,
      lastUpdated: Date.now()
    } : m));
  }, []);

  const deleteMovie = useCallback((id: string) => {
    // Store movie for potential undo
    setMovies(prev => {
      const movieToDelete = prev.find(m => String(m.id) === String(id));
      const newMovies = prev.filter(m => String(m.id) !== String(id));

      // Notify caller with undo capability
      if (movieToDelete && callbacks?.onSuccess) {
        callbacks.onSuccess(`已删除「${movieToDelete.title}」`);
      }

      return newMovies;
    });
  }, [callbacks]);

  const undoDelete = useCallback((movie: Movie) => {
    setMovies(prev => {
      // Insert back at original position (or beginning)
      if (prev.some(m => m.id === movie.id)) return prev;
      return [movie, ...prev];
    });
  }, []);

  const bulkDeleteMovies = useCallback((ids: Set<string>) => {
    if (ids.size === 0) return;
    if (window.confirm(`确定要删除选中的 ${ids.size} 条记录吗？此操作无法撤销。`)) {
      setMovies(prev => prev.filter(m => !ids.has(String(m.id))));
      callbacks?.onSuccess?.(`已删除 ${ids.size} 条记录`);
    }
  }, [callbacks]);

  const importMovies = useCallback((newMovies: Movie[]) => {
    const { migrated } = migrateAllMovieStatuses(newMovies);
    const currentIds = new Set(movies.map(m => String(m.id)));
    const uniqueNewMovies = migrated.filter(m => !currentIds.has(String(m.id)));

    if (uniqueNewMovies.length > 0) {
      setMovies(prev => [...uniqueNewMovies, ...prev]);
      callbacks?.onSuccess?.(`成功导入 ${uniqueNewMovies.length} 条新记录。${newMovies.length - uniqueNewMovies.length} 条重复记录已跳过。`);
    } else {
      callbacks?.onInfo?.('没有发现新记录（所有记录已存在）。');
    }
  }, [movies, callbacks]);

  return {
    movies,
    isSaving,
    addMovie,
    updateMovie,
    deleteMovie,
    undoDelete,
    bulkDeleteMovies,
    importMovies
  };
};


import { useState, useEffect, useCallback } from 'react';
import { Movie } from '../types';
import { migrateAllMovieStatuses } from '../utils/migrationUtils';
import { mergeMovies } from '../utils/syncUtils';

const STORAGE_KEY = 'cinelog_movies_v1';
const DELETED_STORAGE_KEY = 'cinelog_deleted_movies_v1';


export interface UseMoviesCallbacks {
  onSuccess?: (msg: string) => void;
  onError?: (msg: string) => void;
  onInfo?: (msg: string) => void;
}

const isValidMovie = (movie: any): movie is Movie => {
  return (
    movie &&
    typeof movie === 'object' &&
    typeof movie.id === 'string' &&
    typeof movie.title === 'string' &&
    (typeof movie.year === 'string' || typeof movie.year === 'number') &&
    typeof movie.genre === 'string' &&
    typeof movie.rating === 'number' &&
    typeof movie.status === 'string' &&
    typeof movie.review === 'string' &&
    typeof movie.posterColor === 'string' &&
    typeof movie.addedAt === 'number' &&
    typeof movie.lastUpdated === 'number' &&
    (movie.mediaType === 'movie' || movie.mediaType === 'tv')
  );
};

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

  const [deletedMovies, setDeletedMovies] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(DELETED_STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
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
    setMovies(prev => {
      const movieToDelete = prev.find(m => String(m.id) === String(id));
      const newMovies = prev.filter(m => String(m.id) !== String(id));

      if (movieToDelete) {
        setDeletedMovies(d => {
          const updated = { ...d, [id]: Date.now() };
          localStorage.setItem(DELETED_STORAGE_KEY, JSON.stringify(updated));
          return updated;
        });

        if (callbacks?.onSuccess) {
          callbacks.onSuccess(`已删除「${movieToDelete.title}」`);
        }
      }

      return newMovies;
    });
  }, [callbacks]);

  const undoDelete = useCallback((movie: Movie) => {
    setMovies(prev => {
      if (prev.some(m => m.id === movie.id)) return prev;
      
      // 撤销删除时，要把 Tombstone 中的记录移出
      setDeletedMovies(d => {
        const updated = { ...d };
        delete updated[movie.id];
        localStorage.setItem(DELETED_STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });

      return [movie, ...prev];
    });
  }, []);

  const bulkDeleteMovies = useCallback((ids: Set<string>) => {
    if (ids.size === 0) return;
    if (window.confirm(`确定要删除选中的 ${ids.size} 条记录吗？此操作无法撤销。`)) {
      setMovies(prev => {
        const remaining = prev.filter(m => !ids.has(String(m.id)));
        
        setDeletedMovies(d => {
          const updated = { ...d };
          const now = Date.now();
          ids.forEach(id => {
            updated[id] = now;
          });
          localStorage.setItem(DELETED_STORAGE_KEY, JSON.stringify(updated));
          return updated;
        });

        callbacks?.onSuccess?.(`已删除 ${ids.size} 条记录`);
        return remaining;
      });
    }
  }, [callbacks]);

  const importMovies = useCallback((newMovies: Movie[]) => {
    if (!Array.isArray(newMovies)) {
      callbacks?.onError?.('导入的数据格式错误：期望是一个记录列表。');
      return;
    }

    const validMovies = newMovies.filter(isValidMovie);
    if (validMovies.length === 0 && newMovies.length > 0) {
      callbacks?.onError?.('未找到任何有效的电影记录，已取消导入。');
      return;
    }

    const { migrated } = migrateAllMovieStatuses(validMovies);
    const { merged, hasLocalChanges } = mergeMovies(movies, migrated, deletedMovies);

    if (hasLocalChanges) {
      setMovies(merged);
      callbacks?.onSuccess?.(`成功导入并合并 ${merged.length} 条记录。`);
    } else {
      callbacks?.onInfo?.('没有发现新记录（所有数据已是最新）。');
    }
  }, [movies, deletedMovies, callbacks]);

  const syncWithCloud = useCallback((cloudMovies: Movie[]) => {
    const { merged, hasLocalChanges, hasRemoteChanges, updatedDeletedRecords } = mergeMovies(
      movies,
      cloudMovies,
      deletedMovies
    );

    if (hasLocalChanges) {
      setMovies(merged);
    }

    setDeletedMovies(updatedDeletedRecords);
    localStorage.setItem(DELETED_STORAGE_KEY, JSON.stringify(updatedDeletedRecords));

    return {
      hasLocalChanges,
      hasRemoteChanges,
      mergedMoviesCount: merged.length
    };
  }, [movies, deletedMovies]);

  return {
    movies,
    isSaving,
    deletedMovies,
    addMovie,
    updateMovie,
    deleteMovie,
    undoDelete,
    bulkDeleteMovies,
    importMovies,
    syncWithCloud
  };
};

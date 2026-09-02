import { useState, useEffect, useCallback } from 'react';
import { Movie } from '../types';
import { migrateAllMovieStatuses, sanitizeMovie } from '../utils/migrationUtils';
import { mergeMovies } from '../utils/syncUtils';
import { savePoster, deletePoster, getAllPosters, cleanupOrphanPosters, saveMoviesToIndexedDB, getMoviesFromIndexedDB } from '../utils/posterStorage';
import { generateUUID } from '../utils/uuidUtils';
import { 
  STORAGE_KEY, 
  DELETED_STORAGE_KEY, 
  cleanupObsoleteStorage, 
  safeSaveMoviesToLocalStorage, 
  safeSetItem 
} from '../utils/storageUtils';

export interface UseMoviesCallbacks {
  onSuccess?: (msg: string) => void;
  onError?: (msg: string) => void;
  onInfo?: (msg: string) => void;
}

export const isValidMovie = (movie: any): movie is Movie => {
  return !!sanitizeMovie(movie);
};

export const useMovies = (callbacks?: UseMoviesCallbacks) => {
  const [movies, setMovies] = useState<Movie[]>(() => {
    try {
      // 启动时先行扫描清理：清除废弃版本缓存并转存 Base64，瞬间释放宝贵存储
      cleanupObsoleteStorage();

      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return [];
      const raw: Movie[] = JSON.parse(saved);
      const { migrated, didMigrate } = migrateAllMovieStatuses(raw);
      if (didMigrate) {
        safeSaveMoviesToLocalStorage(migrated);
        saveMoviesToIndexedDB(migrated).catch(() => {});
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

  // IndexedDB Poster & Movies synchronization on startup
  useEffect(() => {
    // 1. 同步 IndexedDB 本地海报到内存视图
    getAllPosters().then(posterMap => {
      if (posterMap && Object.keys(posterMap).length > 0) {
        setMovies(prev => prev.map(m => {
          if (!m.posterImage && posterMap[m.id]) {
            return { ...m, posterImage: posterMap[m.id] };
          }
          return m;
        }));
      }
      // Backup any base64 poster in memory to IndexedDB
      movies.forEach(m => {
        if (m.posterImage && m.posterImage.startsWith('data:image/')) {
          savePoster(m.id, m.posterImage);
        }
      });
    }).catch(() => {});

    // 2. 双层容灾检查：从 IndexedDB 读取影片全量备份（预防极端情况下 LocalStorage 丢失）
    getMoviesFromIndexedDB().then(idbMovies => {
      if (idbMovies && Array.isArray(idbMovies) && idbMovies.length > 0) {
        setMovies(prev => {
          if (idbMovies.length > prev.length) {
            const { merged, hasLocalChanges } = mergeMovies(prev, idbMovies, deletedMovies);
            if (hasLocalChanges) {
              safeSaveMoviesToLocalStorage(merged);
              return merged;
            }
          }
          return prev;
        });
      }
    }).catch(() => {});
  }, []);

  // Real-time Save Effect (带防抖安全落盘)
  useEffect(() => {
    setIsSaving(true);
    const handler = setTimeout(() => {
      safeSaveMoviesToLocalStorage(movies);
      saveMoviesToIndexedDB(movies).catch(() => {});
      setIsSaving(false);
    }, 500);

    return () => clearTimeout(handler);
  }, [movies]);

  const addMovie = useCallback((movieData: Omit<Movie, 'id' | 'lastUpdated'>) => {
    const newId = generateUUID();
    const newMovie: Movie = {
      ...movieData,
      id: newId,
      addedAt: movieData.addedAt || Date.now(),
      lastUpdated: Date.now(),
    };

    if (newMovie.posterImage && newMovie.posterImage.startsWith('data:image/')) {
      savePoster(newId, newMovie.posterImage);
    }

    setMovies(prev => {
      const next = [newMovie, ...prev];
      safeSaveMoviesToLocalStorage(next);
      saveMoviesToIndexedDB(next).catch(() => {});
      return next;
    });
  }, []);

  const updateMovie = useCallback((movieData: Partial<Movie> & { id: string }) => {
    if (movieData.posterImage && movieData.posterImage.startsWith('data:image/')) {
      savePoster(movieData.id, movieData.posterImage);
    }

    setMovies(prev => {
      const next = prev.map(m => m.id === movieData.id ? {
        ...m,
        ...movieData,
        lastUpdated: Date.now()
      } : m);
      safeSaveMoviesToLocalStorage(next);
      saveMoviesToIndexedDB(next).catch(() => {});
      return next;
    });
  }, []);

  const deleteMovie = useCallback((id: string) => {
    deletePoster(id);
    setMovies(prev => {
      const movieToDelete = prev.find(m => String(m.id) === String(id));
      const newMovies = prev.filter(m => String(m.id) !== String(id));

      if (movieToDelete) {
        setDeletedMovies(d => {
          const updated = { ...d, [id]: Date.now() };
          safeSetItem(DELETED_STORAGE_KEY, JSON.stringify(updated));
          return updated;
        });

        if (callbacks?.onSuccess) {
          callbacks.onSuccess(`已删除「${movieToDelete.title}」`);
        }
      }

      safeSaveMoviesToLocalStorage(newMovies);
      saveMoviesToIndexedDB(newMovies).catch(() => {});
      return newMovies;
    });
  }, [callbacks]);

  const undoDelete = useCallback((movie: Movie) => {
    if (movie.posterImage && movie.posterImage.startsWith('data:image/')) {
      savePoster(movie.id, movie.posterImage);
    }

    setMovies(prev => {
      if (prev.some(m => m.id === movie.id)) return prev;
      
      // 撤销删除时，要把 Tombstone 中的记录移出
      setDeletedMovies(d => {
        const updated = { ...d };
        delete updated[movie.id];
        safeSetItem(DELETED_STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });

      const next = [movie, ...prev];
      safeSaveMoviesToLocalStorage(next);
      saveMoviesToIndexedDB(next).catch(() => {});
      return next;
    });
  }, []);

  const bulkDeleteMovies = useCallback((ids: Set<string>) => {
    if (ids.size === 0) return;
    if (window.confirm(`确定要删除选中的 ${ids.size} 条记录吗？此操作无法撤销。`)) {
      ids.forEach(id => deletePoster(id));

      setMovies(prev => {
        const remaining = prev.filter(m => !ids.has(String(m.id)));
        
        setDeletedMovies(d => {
          const updated = { ...d };
          const now = Date.now();
          ids.forEach(id => {
            updated[id] = now;
          });
          safeSetItem(DELETED_STORAGE_KEY, JSON.stringify(updated));
          return updated;
        });

        safeSaveMoviesToLocalStorage(remaining);
        saveMoviesToIndexedDB(remaining).catch(() => {});
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

    // 关键修复：从本地删除墓碑中移除所有本次导入的 ID（复活被导入的记录，防止被墓碑静默丢弃）
    const updatedDeleted = { ...deletedMovies };
    let hadTombstones = false;
    migrated.forEach(m => {
      if (updatedDeleted[m.id] !== undefined) {
        delete updatedDeleted[m.id];
        hadTombstones = true;
      }
    });

    if (hadTombstones) {
      setDeletedMovies(updatedDeleted);
      safeSetItem(DELETED_STORAGE_KEY, JSON.stringify(updatedDeleted));
    }

    // 导入时以空墓碑或已清理的墓碑合并，确保所有导入数据 100% 入库
    const { merged } = mergeMovies(movies, migrated, updatedDeleted);

    setMovies(merged);
    safeSaveMoviesToLocalStorage(merged);
    saveMoviesToIndexedDB(merged).catch(() => {});
    callbacks?.onSuccess?.(`成功导入并合并 ${migrated.length} 条记录（片库现共 ${merged.length} 条）。`);
  }, [movies, deletedMovies, callbacks]);

  const syncWithCloud = useCallback((cloudMovies: Movie[]) => {
    const { merged, hasLocalChanges, hasRemoteChanges, updatedDeletedRecords } = mergeMovies(
      movies,
      cloudMovies,
      deletedMovies
    );

    // 云端同步到的 Base64 海报异步写入 IndexedDB
    cloudMovies.forEach(m => {
      if (m.posterImage && m.posterImage.startsWith('data:image/')) {
        savePoster(m.id, m.posterImage);
      }
    });

    if (hasLocalChanges) {
      setMovies(merged);
      // 关键修复：立即安全落盘，不等待防抖，彻底解决时序竞争与移动端重复旧数据问题
      safeSaveMoviesToLocalStorage(merged);
      saveMoviesToIndexedDB(merged).catch(() => {});
    }

    setDeletedMovies(updatedDeletedRecords);
    safeSetItem(DELETED_STORAGE_KEY, JSON.stringify(updatedDeletedRecords));

    return {
      hasLocalChanges,
      hasRemoteChanges,
      mergedMoviesCount: merged.length
    };
  }, [movies, deletedMovies]);

  const replaceMovies = useCallback((newMovies: Movie[], removedIds?: string[]) => {
    if (!Array.isArray(newMovies)) return;
    const validMovies = newMovies.filter(isValidMovie);
    const { migrated } = migrateAllMovieStatuses(validMovies);

    if (removedIds && removedIds.length > 0) {
      setDeletedMovies(d => {
        const updated = { ...d };
        const now = Date.now();
        removedIds.forEach(id => {
          updated[id] = now;
        });
        safeSetItem(DELETED_STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
    }

    setMovies(migrated);
    safeSaveMoviesToLocalStorage(migrated);
    saveMoviesToIndexedDB(migrated).catch(() => {});
  }, []);

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
    replaceMovies,
    syncWithCloud
  };
};

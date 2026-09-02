import { Movie, MovieStatus, MediaType } from '../types';
import { generateUUID } from './uuidUtils';

const OLD_STATUS_MAP: Record<string, MovieStatus> = {
  '已看': MovieStatus.WATCHED,
  '完结': MovieStatus.WATCHED,
  '在看': MovieStatus.WATCHING,
  '追剧中': MovieStatus.WATCHING,
  '想看': MovieStatus.PLANNING,
  '弃坑': MovieStatus.DROPPED,
};

const VALID_STATUSES = new Set<string>(Object.values(MovieStatus));

export const isTvShow = (movie: Partial<Movie> | any): boolean => {
  if (!movie) return false;
  return movie.mediaType === 'tv' ||
    (typeof movie.totalEpisodes === 'number' && movie.totalEpisodes > 1) ||
    (typeof movie.currentEpisode === 'number' && movie.currentEpisode > 0) ||
    (typeof movie.totalEpisodes === 'string' && parseInt(movie.totalEpisodes) > 1) ||
    (typeof movie.currentEpisode === 'string' && parseInt(movie.currentEpisode) > 0);
};

export const isMovieShow = (movie: Partial<Movie> | any): boolean => {
  return !isTvShow(movie);
};

/**
 * 健壮清洗单条数据，补齐所有缺失字段，确保导入与持久化永不丢失数据
 */
export const sanitizeMovie = (raw: any): Movie | null => {
  if (!raw || typeof raw !== 'object') return null;
  const title = typeof raw.title === 'string' ? raw.title.trim() : '';
  if (!title) return null;

  const isTv = isTvShow(raw);
  const mediaType: MediaType = isTv ? 'tv' : 'movie';

  let rawStatus = typeof raw.status === 'string' ? raw.status.trim() : '';
  let status: MovieStatus = OLD_STATUS_MAP[rawStatus] || (VALID_STATUSES.has(rawStatus) ? rawStatus as MovieStatus : MovieStatus.WATCHED);

  // 自动修复：已达总集数则判定为完结（除非用户主动标记为弃坑）
  const curEp = typeof raw.currentEpisode === 'number' ? raw.currentEpisode : (parseInt(raw.currentEpisode) || 0);
  const totalEp = typeof raw.totalEpisodes === 'number' ? raw.totalEpisodes : (parseInt(raw.totalEpisodes) || 0);
  if (isTv && totalEp > 0 && curEp >= totalEp && status === MovieStatus.WATCHING) {
    status = MovieStatus.WATCHED;
  }

  const now = Date.now();
  const addedAt = typeof raw.addedAt === 'number' && !isNaN(raw.addedAt)
    ? raw.addedAt
    : (typeof raw.addedAt === 'string' && !isNaN(new Date(raw.addedAt).getTime()) ? new Date(raw.addedAt).getTime() : now);

  const lastUpdated = typeof raw.lastUpdated === 'number' && !isNaN(raw.lastUpdated)
    ? raw.lastUpdated
    : addedAt;

  const rating = typeof raw.rating === 'number' && !isNaN(raw.rating)
    ? Math.min(5, Math.max(0, raw.rating))
    : (typeof raw.rating === 'string' ? (parseFloat(raw.rating) || 0) : 0);

  return {
    ...raw,
    id: typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : generateUUID(),
    title,
    year: raw.year !== undefined && raw.year !== null ? String(raw.year).trim() : '',
    country: typeof raw.country === 'string' ? raw.country.trim() : '',
    genre: typeof raw.genre === 'string' ? raw.genre.trim() : '',
    director: typeof raw.director === 'string' ? raw.director.trim() : '',
    cast: typeof raw.cast === 'string' ? raw.cast.trim() : '',
    rating,
    tmdbRating: typeof raw.tmdbRating === 'number' && !isNaN(raw.tmdbRating) ? raw.tmdbRating : undefined,
    overview: typeof raw.overview === 'string' ? raw.overview.trim() : '',
    status,
    review: typeof raw.review === 'string' ? raw.review : '',
    quote: typeof raw.quote === 'string' ? raw.quote.trim() : undefined,
    posterColor: typeof raw.posterColor === 'string' && raw.posterColor.trim() ? raw.posterColor : '#4f46e5',
    posterImage: typeof raw.posterImage === 'string' ? raw.posterImage : undefined,
    addedAt,
    lastUpdated,
    mediaType,
    currentEpisode: isTv ? curEp : undefined,
    totalEpisodes: isTv && totalEp > 0 ? totalEp : undefined,
    duration: typeof raw.duration === 'number' ? raw.duration : (parseInt(raw.duration) || undefined),
    playbackSpeed: typeof raw.playbackSpeed === 'number' ? raw.playbackSpeed : (parseFloat(raw.playbackSpeed) || undefined),
    actualWatchTime: typeof raw.actualWatchTime === 'number' ? raw.actualWatchTime : undefined,
    platform: typeof raw.platform === 'string' ? raw.platform.trim() : undefined,
    watchIteration: typeof raw.watchIteration === 'number' ? raw.watchIteration : (parseInt(raw.watchIteration) || 1),
    watchHistory: Array.isArray(raw.watchHistory) ? raw.watchHistory : undefined,
    rewatchHistory: Array.isArray(raw.rewatchHistory) ? raw.rewatchHistory : undefined,
    tags: Array.isArray(raw.tags) ? raw.tags : undefined,
  };
};

export const migrateMovieStatus = (movie: Movie): Movie => {
  let status = movie.status;
  const rawStatus = movie.status as string;
  if (!VALID_STATUSES.has(rawStatus) && OLD_STATUS_MAP[rawStatus]) {
    status = OLD_STATUS_MAP[rawStatus];
  }

  // 自动修复：已达总集数则判定为完结（除非用户主动标记为弃坑）
  const isTv = isTvShow(movie);
  if (isTv && movie.totalEpisodes && movie.totalEpisodes > 0 && (movie.currentEpisode || 0) >= movie.totalEpisodes) {
    if (status !== MovieStatus.DROPPED) {
      status = MovieStatus.WATCHED;
    }
  }

  // 自动补齐 mediaType
  const mediaType = movie.mediaType || (isTv ? 'tv' : 'movie');

  if (status === movie.status && mediaType === movie.mediaType) {
    return movie;
  }

  return {
    ...movie,
    status,
    mediaType,
  };
};

export const migrateAllMovieStatuses = (rawMovies: any[]): { migrated: Movie[]; didMigrate: boolean } => {
  if (!Array.isArray(rawMovies)) return { migrated: [], didMigrate: false };
  const sanitizedList: Movie[] = [];
  let didMigrate = false;

  for (const item of rawMovies) {
    const s = sanitizeMovie(item);
    if (s) {
      if (s.mediaType !== item.mediaType || s.status !== item.status || !item.lastUpdated || !item.id) {
        didMigrate = true;
      }
      sanitizedList.push(s);
    } else {
      didMigrate = true;
    }
  }

  return { migrated: sanitizedList, didMigrate };
};

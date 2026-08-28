import { Movie, MovieStatus } from '../types';

const OLD_STATUS_MAP: Record<string, MovieStatus> = {
  '已看': MovieStatus.WATCHED,
  '完结': MovieStatus.WATCHED,
  '在看': MovieStatus.WATCHING,
  '追剧中': MovieStatus.WATCHING,
  '想看': MovieStatus.PLANNING,
  '弃坑': MovieStatus.DROPPED,
};

const VALID_STATUSES = new Set<string>(Object.values(MovieStatus));

export const isTvShow = (movie: Movie): boolean => {
  return movie.mediaType === 'tv' ||
    (typeof movie.totalEpisodes === 'number' && movie.totalEpisodes > 1) ||
    (typeof movie.currentEpisode === 'number' && movie.currentEpisode > 0);
};

const needsMigration = (movie: Movie): boolean => {
  const rawStatus = movie.status as string;
  if (!VALID_STATUSES.has(rawStatus) && !!OLD_STATUS_MAP[rawStatus]) {
    return true;
  }
  // 检查是否为已达总集数但仍处于追剧中的电视剧
  if (isTvShow(movie) && movie.totalEpisodes && movie.totalEpisodes > 0 && (movie.currentEpisode || 0) >= movie.totalEpisodes && movie.status === MovieStatus.WATCHING) {
    return true;
  }
  // 检查 mediaType 是否缺失
  if (!movie.mediaType) {
    return true;
  }
  return false;
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

  return {
    ...movie,
    status,
    mediaType,
  };
};

export const migrateAllMovieStatuses = (movies: Movie[]): { migrated: Movie[]; didMigrate: boolean } => {
  const hasChanges = movies.some(needsMigration);
  if (!hasChanges) return { migrated: movies, didMigrate: false };
  return { migrated: movies.map(migrateMovieStatus), didMigrate: true };
};

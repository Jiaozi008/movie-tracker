import { Movie, MovieStatus } from '../types';

const OLD_STATUS_MAP: Record<string, MovieStatus> = {
  '已看': MovieStatus.WATCHED,
  '在看': MovieStatus.WATCHING,
};

const VALID_STATUSES = new Set<string>(Object.values(MovieStatus));

const needsMigration = (movie: Movie): boolean => {
  const status = movie.status as string;
  return !VALID_STATUSES.has(status) && !!OLD_STATUS_MAP[status];
};

export const migrateMovieStatus = (movie: Movie): Movie => {
  if (!needsMigration(movie)) return movie;
  const newStatus = OLD_STATUS_MAP[movie.status as string];
  return { ...movie, status: newStatus };
};

export const migrateAllMovieStatuses = (movies: Movie[]): { migrated: Movie[]; didMigrate: boolean } => {
  const hasOld = movies.some(needsMigration);
  if (!hasOld) return { migrated: movies, didMigrate: false };
  return { migrated: movies.map(migrateMovieStatus), didMigrate: true };
};

import { describe, it, expect } from 'vitest';
import { migrateMovieStatus, migrateAllMovieStatuses } from '../utils/migrationUtils';
import { MovieStatus } from '../types';
import type { Movie } from '../types';

const baseMovie = (overrides: Partial<Movie>): Movie => ({
  id: 'test-id',
  title: '测试电影',
  year: '2024',
  genre: '剧情',
  rating: 3,
  status: MovieStatus.WATCHED,
  review: '',
  posterColor: '#000000',
  addedAt: Date.now(),
  lastUpdated: Date.now(),
  mediaType: 'movie',
  ...overrides,
});

describe('migrateMovieStatus', () => {
  it('should convert 已看 to WATCHED', () => {
    const movie = baseMovie({ status: '已看' as MovieStatus });
    const result = migrateMovieStatus(movie);
    expect(result.status).toBe(MovieStatus.WATCHED);
  });

  it('should convert 在看 to WATCHING', () => {
    const movie = baseMovie({ status: '在看' as MovieStatus });
    const result = migrateMovieStatus(movie);
    expect(result.status).toBe(MovieStatus.WATCHING);
  });

  it('should keep 完结 unchanged', () => {
    const movie = baseMovie({ status: MovieStatus.WATCHED });
    const result = migrateMovieStatus(movie);
    expect(result.status).toBe(MovieStatus.WATCHED);
  });

  it('should keep 追剧中 unchanged', () => {
    const movie = baseMovie({ status: MovieStatus.WATCHING });
    const result = migrateMovieStatus(movie);
    expect(result.status).toBe(MovieStatus.WATCHING);
  });

  it('should keep 想看 unchanged', () => {
    const movie = baseMovie({ status: MovieStatus.PLANNING });
    const result = migrateMovieStatus(movie);
    expect(result.status).toBe(MovieStatus.PLANNING);
  });

  it('should keep 弃坑 unchanged', () => {
    const movie = baseMovie({ status: MovieStatus.DROPPED });
    const result = migrateMovieStatus(movie);
    expect(result.status).toBe(MovieStatus.DROPPED);
  });

  it('should return valid movie for already-valid status', () => {
    const movie = baseMovie({ status: MovieStatus.WATCHED });
    const result = migrateMovieStatus(movie);
    expect(result).toStrictEqual(movie);
  });
});

describe('migrateAllMovieStatuses', () => {
  it('should set didMigrate=true when old statuses exist', () => {
    const movies = [
      baseMovie({ id: '1', status: '已看' as MovieStatus }),
      baseMovie({ id: '2', status: MovieStatus.WATCHED }),
    ];
    const { migrated, didMigrate } = migrateAllMovieStatuses(movies);
    expect(didMigrate).toBe(true);
    expect(migrated[0].status).toBe(MovieStatus.WATCHED);
    expect(migrated[1].status).toBe(MovieStatus.WATCHED);
  });

  it('should set didMigrate=false when all statuses are valid', () => {
    const movies = [
      baseMovie({ id: '1', status: MovieStatus.WATCHED }),
      baseMovie({ id: '2', status: MovieStatus.WATCHING }),
    ];
    const { didMigrate } = migrateAllMovieStatuses(movies);
    expect(didMigrate).toBe(false);
  });

  it('should handle empty array', () => {
    const { migrated, didMigrate } = migrateAllMovieStatuses([]);
    expect(didMigrate).toBe(false);
    expect(migrated).toEqual([]);
  });
});

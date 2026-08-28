import { describe, it, expect } from 'vitest';
import { findMergeableTvGroups, mergeTvRecords, mergeAllDuplicateTvShows } from '../utils/mergeUtils';
import { calculateEpisodeUpdate, calculateMovieActualWatchTime } from '../utils/episodeUtils';
import { Movie, MovieStatus } from '../types';

describe('TV Dynamic PlaybackSpeed & History Merger (mergeUtils)', () => {
    const baseTv = (overrides: Partial<Movie>): Movie => ({
        id: 'tv-1',
        title: '漫长的季节',
        year: '2023',
        genre: '悬疑, 剧情',
        rating: 4.5,
        status: MovieStatus.WATCHING,
        review: '',
        posterColor: '#1e293b',
        addedAt: 1700000000000,
        lastUpdated: 1700000000000,
        mediaType: 'tv',
        duration: 60,
        currentEpisode: 3,
        totalEpisodes: 12,
        playbackSpeed: 1.0,
        ...overrides,
    });

    it('should find mergeable groups when duplicate TV entries exist', () => {
        const movies: Movie[] = [
            baseTv({ id: '1', currentEpisode: 3, addedAt: 1000 }),
            baseTv({ id: '2', currentEpisode: 8, addedAt: 2000 }),
            baseTv({ id: '3', currentEpisode: 12, addedAt: 3000, status: MovieStatus.WATCHED }),
            {
                id: 'movie-1',
                title: '流浪地球2',
                year: '2023',
                genre: '科幻',
                rating: 5,
                status: MovieStatus.WATCHED,
                review: '',
                posterColor: '#000',
                addedAt: 4000,
                lastUpdated: 4000,
                mediaType: 'movie',
            },
        ];

        const groups = findMergeableTvGroups(movies);
        expect(groups.length).toBe(1);
        expect(groups[0].title).toBe('漫长的季节');
        expect(groups[0].records.length).toBe(3);
        expect(groups[0].maxEpisode).toBe(12);
    });

    it('should precisely merge multi-segment TV records with different playback speeds (1.0x, 1.5x, 2.0x)', () => {
        // Record 1: Ep 1-3 @ 1.0x (3 eps * 60 / 1.0 = 180 min)
        // Record 2: Ep 4-8 @ 1.5x (5 eps * 60 / 1.5 = 200 min)
        // Record 3: Ep 9-12 @ 2.0x (4 eps * 60 / 2.0 = 120 min)
        // Expected total = 180 + 200 + 120 = 500 minutes!
        const records: Movie[] = [
            baseTv({
                id: 'seg-1',
                currentEpisode: 3,
                playbackSpeed: 1.0,
                addedAt: 1700000000000, // May 1
                review: '前三集镜头很有质感',
                tags: ['悬疑', '国产神作'],
            }),
            baseTv({
                id: 'seg-2',
                currentEpisode: 8,
                playbackSpeed: 1.5,
                addedAt: 1700500000000, // May 5
                review: '节奏起飞了',
                tags: ['悬疑', '高分必看'],
            }),
            baseTv({
                id: 'seg-3',
                currentEpisode: 12,
                totalEpisodes: 12,
                playbackSpeed: 2.0,
                status: MovieStatus.WATCHED,
                addedAt: 1701000000000, // May 10
                review: '大结局封神！',
                tags: ['高分必看', '辛爽导演'],
            }),
        ];

        const merged = mergeTvRecords(records);

        expect(merged.currentEpisode).toBe(12);
        expect(merged.status).toBe(MovieStatus.WATCHED);
        expect(merged.actualWatchTime).toBe(500); // 180 + 200 + 120 = 500 min
        expect(merged.playbackSpeed).toBe(2.0); // latest speed

        // Check watchHistory
        expect(merged.watchHistory).toBeDefined();
        expect(merged.watchHistory!.length).toBe(12);

        // Check individual episode speeds
        expect(merged.watchHistory![0].episode).toBe(1);
        expect(merged.watchHistory![0].playbackSpeed).toBe(1.0);
        expect(merged.watchHistory![2].episode).toBe(3);
        expect(merged.watchHistory![2].playbackSpeed).toBe(1.0);

        expect(merged.watchHistory![3].episode).toBe(4);
        expect(merged.watchHistory![3].playbackSpeed).toBe(1.5);
        expect(merged.watchHistory![7].episode).toBe(8);
        expect(merged.watchHistory![7].playbackSpeed).toBe(1.5);

        expect(merged.watchHistory![8].episode).toBe(9);
        expect(merged.watchHistory![8].playbackSpeed).toBe(2.0);
        expect(merged.watchHistory![11].episode).toBe(12);
        expect(merged.watchHistory![11].playbackSpeed).toBe(2.0);

        // Check review concatenation
        expect(merged.review).toContain('前三集镜头很有质感');
        expect(merged.review).toContain('节奏起飞了');
        expect(merged.review).toContain('大结局封神！');

        // Check tags union
        expect(merged.tags).toEqual(expect.arrayContaining(['悬疑', '国产神作', '高分必看', '辛爽导演']));
    });

    it('should correctly calculate incremental actualWatchTime when +1 episode is added with new speed', () => {
        const initialMovie = baseTv({
            currentEpisode: 2,
            duration: 60,
            playbackSpeed: 1.0,
            watchHistory: [
                { episode: 1, date: 1000, playbackSpeed: 1.0 },
                { episode: 2, date: 1000, playbackSpeed: 1.0 },
            ],
            actualWatchTime: 120, // 2 * 60 / 1.0 = 120
        });

        // Now user switches speed to 2.0x and clicks +1 (ep 3)
        const updatedWithSpeed = { ...initialMovie, playbackSpeed: 2.0 };
        const result = calculateEpisodeUpdate(updatedWithSpeed, 1);

        expect(result).not.toBeNull();
        expect(result!.updatedMovie.currentEpisode).toBe(3);
        // Ep 1 (60m @ 1.0x = 60m) + Ep 2 (60m @ 1.0x = 60m) + Ep 3 (60m @ 2.0x = 30m) = 150m!
        expect(result!.updatedMovie.actualWatchTime).toBe(150);
        expect(result!.updatedMovie.watchHistory![2].playbackSpeed).toBe(2.0);
        expect(result!.updatedMovie.watchHistory![0].playbackSpeed).toBe(1.0);
    });

    it('should merge all duplicate TV shows in a mixed movie/tv library without altering single records', () => {
        const library: Movie[] = [
            baseTv({ id: 'fa-1', title: '繁花', currentEpisode: 5, addedAt: 1000 }),
            baseTv({ id: 'fa-2', title: '繁花', currentEpisode: 30, totalEpisodes: 30, addedAt: 2000, status: MovieStatus.WATCHED }),
            {
                id: 'standalone-movie',
                title: '奥本海默',
                year: '2023',
                genre: '传记',
                rating: 5,
                status: MovieStatus.WATCHED,
                review: '神作',
                posterColor: '#000',
                addedAt: 3000,
                lastUpdated: 3000,
                mediaType: 'movie',
            },
        ];

        const { mergedMovies, mergedGroupCount, mergedRecordCount } = mergeAllDuplicateTvShows(library);

        expect(mergedGroupCount).toBe(1);
        expect(mergedRecordCount).toBe(2);
        expect(mergedMovies.length).toBe(2); // 1 merged TV show + 1 standalone movie

        const fanhua = mergedMovies.find(m => m.title === '繁花');
        expect(fanhua).toBeDefined();
        expect(fanhua!.currentEpisode).toBe(30);
        expect(fanhua!.status).toBe(MovieStatus.WATCHED);

        const oppenheimer = mergedMovies.find(m => m.title === '奥本海默');
        expect(oppenheimer).toBeDefined();
    });

    it('should correctly mark watching vs watched status based on total episodes after merge', () => {
        // Unfinished TV: Ep 1-3 (seg 1) + Ep 4-7 (seg 2) of 12 total episodes
        const unfinishedSegments: Movie[] = [
            baseTv({ id: 'u-1', title: '庆余年2', currentEpisode: 3, totalEpisodes: 36, status: MovieStatus.WATCHING }),
            baseTv({ id: 'u-2', title: '庆余年2', currentEpisode: 10, totalEpisodes: 36, status: MovieStatus.WATCHING }),
        ];

        const mergedUnfinished = mergeTvRecords(unfinishedSegments);
        expect(mergedUnfinished.currentEpisode).toBe(10);
        expect(mergedUnfinished.status).toBe(MovieStatus.WATCHING);

        // Finished TV: Ep 1-10 (seg 1) + Ep 11-36 (seg 2) of 36 total episodes
        const finishedSegments: Movie[] = [
            baseTv({ id: 'f-1', title: '庆余年2', currentEpisode: 10, totalEpisodes: 36, status: MovieStatus.WATCHING }),
            baseTv({ id: 'f-2', title: '庆余年2', currentEpisode: 36, totalEpisodes: 36, status: MovieStatus.WATCHED }),
        ];

        const mergedFinished = mergeTvRecords(finishedSegments);
        expect(mergedFinished.currentEpisode).toBe(36);
        expect(mergedFinished.status).toBe(MovieStatus.WATCHED);
    });
});

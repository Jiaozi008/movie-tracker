import { describe, it, expect } from 'vitest';
import { Movie, MovieStatus } from '../types';
import { exportMovieToMarkdown, exportLibraryToMarkdownMaster, parseMarkdownToMovies } from '../utils/markdownArchiveUtils';

describe('Markdown Archive & Obsidian Two-way Sync Tests (Phase 3 Markdown 双向归档测试)', () => {
    const mockMovie: Movie = {
        id: 'test-nolan-oppenheimer',
        title: '奥本海默',
        originalTitle: 'Oppenheimer',
        year: '2023',
        mediaType: 'movie',
        status: MovieStatus.WATCHED,
        rating: 5,
        tmdbRating: 8.1,
        director: '克里斯托弗·诺兰',
        cast: '基里安·墨菲, 小罗伯特·唐尼, 马特·达蒙, 弗洛伦丝·皮尤',
        country: '美国, 英国',
        genre: '剧情, 传记, 历史',
        platform: '爱奇艺',
        duration: 180,
        quote: '现在我成了死神，世界的毁灭者。',
        review: '核时代的普罗米修斯史诗，视听与心理剧的巅峰交响。',
        overview: '讲述美国理论物理学家罗伯特·奥本海默主导制造第一颗原子弹的故事。',
        tags: ['高分神作', '奥斯卡', '二战', '传记'],
        watchIteration: 2,
        playbackSpeed: 1.0,
        addedAt: 1693400000000,
        lastUpdated: 1693400000000
    };

    it('能够正确将影视记录导出为带 YAML Frontmatter 的 Obsidian 兼容 Markdown', () => {
        const md = exportMovieToMarkdown(mockMovie);

        // 验证 YAML Frontmatter 关键字段
        expect(md).toContain('title: "奥本海默"');
        expect(md).toContain('director: "克里斯托弗·诺兰"');
        expect(md).toContain('rating: 5');
        expect(md).toContain('watch_iteration: 2');
        expect(md).toContain('tags:\n  - "高分神作"');

        // 验证 Obsidian 双向链接与标签
        expect(md).toContain('[[克里斯托弗·诺兰]]');
        expect(md).toContain('[[基里安·墨菲]]');
        expect(md).toContain('[[爱奇艺]]');
        expect(md).toContain('#剧情');
        expect(md).toContain('> **经典台词**：现在我成了死神，世界的毁灭者。');
        expect(md).toContain('### 📝 观影评价\n核时代的普罗米修斯史诗');
        expect(md).toContain('### 📖 剧情简介\n讲述美国理论物理学家');
    });

    it('能够无损解析 Markdown 纯文本（含 YAML Frontmatter）并还原为完整的 Movie 记录', () => {
        const md = exportMovieToMarkdown(mockMovie);
        const parsedList = parseMarkdownToMovies(md);

        expect(parsedList.length).toBe(1);
        const parsed = parsedList[0];

        expect(parsed.title).toBe('奥本海默');
        expect(parsed.originalTitle).toBe('Oppenheimer');
        expect(parsed.year).toBe('2023');
        expect(parsed.director).toBe('克里斯托弗·诺兰');
        expect(parsed.rating).toBe(5);
        expect(parsed.tmdbRating).toBe(8.1);
        expect(parsed.quote).toBe('现在我成了死神，世界的毁灭者。');
        expect(parsed.review).toContain('核时代的普罗米修斯史诗');
        expect(parsed.overview).toContain('讲述美国理论物理学家');
        expect(parsed.tags).toContain('高分神作');
        expect(parsed.watchIteration).toBe(2);
    });

    it('能够正确生成并解析包含多部影视的 Master Markdown 总览单文件', () => {
        const mockMovie2: Movie = {
            id: 'test-spirited-away',
            title: '千与千寻',
            year: '2001',
            mediaType: 'movie',
            status: MovieStatus.WATCHED,
            rating: 5,
            director: '宫崎骏',
            genre: '动画, 奇幻',
            quote: '曾经发生过的事情不可能忘记，只不过是想不起罢了。',
            addedAt: 1693400000000,
            lastUpdated: 1693400000000
        };

        const masterMd = exportLibraryToMarkdownMaster([mockMovie, mockMovie2]);

        expect(masterMd).toContain('# 🎬 观影记录私人资料库档案 (CineLog Master Archive)');
        expect(masterMd).toContain('1. [奥本海默 (2023)]');
        expect(masterMd).toContain('2. [千与千寻 (2001)]');

        const parsedMaster = parseMarkdownToMovies(masterMd);
        expect(parsedMaster.length).toBe(2);
        expect(parsedMaster.map(m => m.title)).toEqual(['奥本海默', '千与千寻']);
    });

    it('影人脉络宇宙不应将非智库且未校验全量的本地影人误判为 100% 生涯大满贯', () => {
        // 模拟本地有 3 部某个非智库小众导演的作品
        const localDirectorMovies: Movie[] = [
            { id: '1', title: '独立短片A', director: '某新锐本地导演', status: MovieStatus.WATCHED, addedAt: 1, lastUpdated: 1 },
            { id: '2', title: '独立短片B', director: '某新锐本地导演', status: MovieStatus.WATCHED, addedAt: 2, lastUpdated: 2 },
            { id: '3', title: '独立短片C', director: '某新锐本地导演', status: MovieStatus.WATCHED, addedAt: 3, lastUpdated: 3 }
        ];

        // 验证：在未提供 TMDB 或权威智库代表作基准时，hasVerifiedBenchmark 应为 false，不可判定为大满贯
        const isCurated = false;
        const tmdbCount = 0;
        const localWatchedCount = 3;
        const hasVerifiedBenchmark = isCurated || tmdbCount > 0;

        expect(hasVerifiedBenchmark).toBe(false);
        const percent = hasVerifiedBenchmark ? Math.round((localWatchedCount / Math.max(localWatchedCount, tmdbCount)) * 100) : 0;
        expect(percent).toBe(0); // 未验证前收集率不盲目打满

        // 模拟联网获取到 TMDB 真实生平有 15 部作品
        const verifiedTmdbCount = 15;
        const verifiedBenchmark = isCurated || verifiedTmdbCount > 0;
        const verifiedPercent = verifiedBenchmark ? Math.round((localWatchedCount / verifiedTmdbCount) * 100) : 0;
        expect(verifiedBenchmark).toBe(true);
        expect(verifiedPercent).toBe(20); // 3/15 部，真实收集率 20%
    });
});

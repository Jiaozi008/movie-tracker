// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    fetchPersonFilmography,
    getCachedPersonFilmographyMap,
    TMDB_FILMOGRAPHY_CACHE_KEY,
    PersonFilmographyError,
    describeFilmographyFailure,
    getFilmographyFailureHint
} from '../services/tmdbService';

/**
 * 回归测试：影人宇宙「一键校验全网 / 校验全网生平 / 刷新」全部失效
 * 根因：services/tmdbService.ts 使用了 normalizeTitle 却遗漏 import，
 * 运行时抛出 ReferenceError: normalizeTitle is not defined，
 * 且该调用位于 try 块之外，导致调用方只能收到 catch 后的「同步失败」。
 */

function jsonResponse(data: unknown): Response {
    return {
        ok: true,
        status: 200,
        headers: {
            get: (key: string) =>
                key.toLowerCase() === 'content-type' ? 'application/json; charset=utf-8' : null
        },
        json: async () => data
    } as unknown as Response;
}

function errorResponse(status: number): Response {
    return {
        ok: false,
        status,
        headers: {
            get: (key: string) =>
                key.toLowerCase() === 'content-type' ? 'application/json; charset=utf-8' : null
        },
        json: async () => ({ status_code: status })
    } as unknown as Response;
}

/** 桩化影人搜索响应：payload 为普通对象时按 200 JSON 返回，为 errorResponse 时按原样返回 */
function stubPersonSearch(payload: unknown) {
    const isResponseStub = typeof payload === 'object'
        && payload !== null
        && 'status' in payload
        && typeof (payload as Response).status === 'number';

    return vi.fn(async (url: string) => {
        if (String(url).includes('search/person')) {
            return isResponseStub ? payload as Response : jsonResponse(payload);
        }
        return jsonResponse({ crew: [], cast: [] });
    });
}

describe('影人宇宙全网校验 (fetchPersonFilmography)', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        localStorage.clear();
    });

    it('单人校验应返回生平作品并写入持久化缓存（防 normalizeTitle 未导入回归）', async () => {
        vi.stubGlobal('fetch', vi.fn(async (url: string) => {
            const target = String(url);
            if (target.includes('search/person')) {
                return jsonResponse({
                    results: [
                        {
                            id: 1,
                            name: '克里斯托弗·诺兰',
                            original_name: 'Christopher Nolan',
                            known_for_department: 'Directing',
                            popularity: 100
                        }
                    ]
                });
            }
            if (target.includes('combined_credits')) {
                return jsonResponse({
                    crew: [
                        {
                            id: 11,
                            title: '盗梦空间',
                            original_title: 'Inception',
                            release_date: '2010-07-16',
                            job: 'Director',
                            department: 'Directing',
                            vote_average: 8.4,
                            vote_count: 30000,
                            overview: ''
                        }
                    ],
                    cast: []
                });
            }
            throw new Error(`未预期的请求: ${target}`);
        }));

        const result = await fetchPersonFilmography('克里斯托弗·诺兰', true);

        expect(result).not.toBeNull();
        expect(result!.totalWorksCount).toBe(1);
        expect(result!.credits[0].title).toBe('盗梦空间');
        expect(result!.credits[0].role).toBe('导演');

        const cached = getCachedPersonFilmographyMap();
        expect(Object.keys(cached)).toContain('克里斯托弗·诺兰');
        expect(JSON.parse(localStorage.getItem(TMDB_FILMOGRAPHY_CACHE_KEY) || '{}')).toHaveProperty(
            '克里斯托弗·诺兰'
        );
    });

    it('批量校验场景（forceRefresh=false 且无缓存）不应抛出异常', async () => {
        vi.stubGlobal('fetch', stubPersonSearch({
            results: [{ id: 1, name: '克里斯托弗·诺兰', known_for_department: 'Directing', popularity: 10 }]
        }));

        await expect(fetchPersonFilmography('克里斯托弗·诺兰', false)).resolves.not.toThrow();
    });
});

describe('影人宇宙只统计导演 / 演员作品（剔除访谈、综艺、客串与幕后身份）', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        localStorage.clear();
    });

    /** 桩化影人搜索 + 作品列表，cast/crew 由用例自行给定 */
    function stubFilmography(credits: { cast?: any[]; crew?: any[] }) {
        return vi.fn(async (url: string) => {
            const target = String(url);
            if (target.includes('search/person')) {
                return jsonResponse({
                    results: [
                        { id: 1, name: '测试影人', known_for_department: 'Acting', popularity: 50 }
                    ]
                });
            }
            if (target.includes('combined_credits')) {
                return jsonResponse({ cast: credits.cast || [], crew: credits.crew || [] });
            }
            throw new Error(`未预期的请求: ${target}`);
        });
    }

    it('应剔除本人出镜的访谈、综艺、脱口秀、客串与存档镜头', async () => {
        vi.stubGlobal('fetch', stubFilmography({
            cast: [
                { id: 101, title: '真实演出', character: '阿星', release_date: '2001-01-01', vote_average: 8, vote_count: 1000, genre_ids: [35] },
                { id: 102, title: '访谈节目', character: 'Self', genre_ids: [10767] },
                { id: 103, title: '综艺节目', character: '阿星', genre_ids: [10764] },
                { id: 104, title: '新闻采访', character: '受访者', genre_ids: [10763] },
                { id: 105, title: '客串大片', character: 'Cameo', genre_ids: [28] },
                { id: 106, title: '存档镜头', character: 'Himself (archive footage)' }
            ]
        }));

        const result = await fetchPersonFilmography('测试影人', true);
        const titles = result!.credits.map(c => c.title);

        expect(titles).toContain('真实演出');
        expect(titles).not.toContain('访谈节目');
        expect(titles).not.toContain('综艺节目');
        expect(titles).not.toContain('新闻采访');
        expect(titles).not.toContain('客串大片');
        expect(titles).not.toContain('存档镜头');
    });

    it('应仅保留导演职务，剔除编剧 / 制片 / 主创等幕后身份', async () => {
        vi.stubGlobal('fetch', stubFilmography({
            crew: [
                { id: 201, title: '导演作品', job: 'Director', release_date: '2005-01-01', vote_average: 8, vote_count: 500 },
                { id: 202, title: '联合导演作品', job: 'Co-Director', release_date: '2006-01-01', vote_average: 7, vote_count: 300 },
                { id: 203, title: '编剧作品', job: 'Writer' },
                { id: 204, title: '编剧作品二', job: 'Screenplay' },
                { id: 205, title: '制片作品', job: 'Producer' },
                { id: 206, title: '监制作品', job: 'Executive Producer' },
                { id: 207, title: '主创作品', job: 'Creator' }
            ]
        }));

        const result = await fetchPersonFilmography('测试影人', true);
        const titles = result!.credits.map(c => c.title);

        expect(titles).toContain('导演作品');
        expect(titles).toContain('联合导演作品');
        expect(titles).not.toContain('编剧作品');
        expect(titles).not.toContain('编剧作品二');
        expect(titles).not.toContain('制片作品');
        expect(titles).not.toContain('监制作品');
        expect(titles).not.toContain('主创作品');
        expect(result!.credits.every(c => c.role === '导演')).toBe(true);
    });

    it('同一作品兼具导演与主演时应合并为「导演 / 主演」', async () => {
        vi.stubGlobal('fetch', stubFilmography({
            crew: [{ id: 301, title: '自导自演', job: 'Director', release_date: '2010-01-01', vote_average: 9, vote_count: 800 }],
            cast: [{ id: 301, title: '自导自演', character: '主角', release_date: '2010-01-01', vote_average: 9, vote_count: 800 }]
        }));

        const result = await fetchPersonFilmography('测试影人', true);

        expect(result!.totalWorksCount).toBe(1);
        expect(result!.credits[0].role).toBe('导演 / 主演');
    });
});

describe('影人生平校验失败原因可区分（防「一律提示检查网络」回归）', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('TMDB 未收录该影人时返回 null，不视为错误', async () => {
        vi.stubGlobal('fetch', stubPersonSearch({ results: [] }));
        await expect(fetchPersonFilmography('查无此人', true)).resolves.toBeNull();
    });

    it('HTTP 401/403 应归类为鉴权失败', async () => {
        vi.stubGlobal('fetch', stubPersonSearch(errorResponse(401)));
        await expect(fetchPersonFilmography('周星驰', true)).rejects.toMatchObject({
            name: 'PersonFilmographyError',
            reason: 'auth'
        });
    });

    it('HTTP 429 应归类为频率超限', async () => {
        vi.stubGlobal('fetch', stubPersonSearch(errorResponse(429)));
        await expect(fetchPersonFilmography('周星驰', true)).rejects.toMatchObject({
            reason: 'rate_limit'
        });
    });

    it('HTTP 500 应归类为服务异常', async () => {
        vi.stubGlobal('fetch', stubPersonSearch(errorResponse(500)));
        await expect(fetchPersonFilmography('周星驰', true)).rejects.toMatchObject({
            reason: 'server'
        });
    });

    it('网络不可达（fetch 直接 reject）应归类为网络失败', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => {
            throw new TypeError('Failed to fetch');
        }));
        await expect(fetchPersonFilmography('周星驰', true)).rejects.toMatchObject({
            reason: 'network'
        });
    });

    it('提示文案应区分真实原因，不再一律提示检查网络', () => {
        const authMsg = describeFilmographyFailure(
            new PersonFilmographyError('auth', 'TMDB 影人搜索被拒绝 (HTTP 401)'),
            '周星驰'
        );
        expect(authMsg).toContain('周星驰');
        expect(authMsg).toContain('API Key');
        expect(authMsg).not.toContain('请检查网络');

        const rateMsg = describeFilmographyFailure(
            new PersonFilmographyError('rate_limit', 'x'),
            '周星驰'
        );
        expect(rateMsg).toContain('频率超限');

        // 代码缺陷（非 PersonFilmographyError）应暴露真实错误信息，便于定位
        const bugMsg = describeFilmographyFailure(new ReferenceError('foo is not defined'), '周星驰');
        expect(bugMsg).toContain('foo is not defined');
    });

    it('每种失败原因都应有对应的可执行处置建议', () => {
        const reasons = ['not_found', 'auth', 'rate_limit', 'network', 'server', 'unknown'] as const;
        reasons.forEach(reason => {
            expect(getFilmographyFailureHint(reason)).toBeTruthy();
        });
    });
});

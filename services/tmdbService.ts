import { resizeImage } from '../utils/imageUtils';
import { normalizeTitle } from '../utils/titleNormalizer';
import { extractSmartTags } from '../utils/tagExtractor';
import { localizeChineseMovieTitle, translateForeignTitleOnline } from '../utils/movieTitleZhMap';
import { translatePersonNameOnline, localizePersonNames } from '../utils/personNameZhMap';

/**
 * TMDB API Service
 * Provides search and detail fetching for movies and TV shows
 * using The Movie Database (TMDB) API v3.
 *
 * API Key should be set as VITE_TMDB_API_KEY in .env.local
 * Get a free key at: https://www.themoviedb.org/settings/api
 */

const TMDB_BASE = 'https://api.themoviedb.org/3';
const IMG_BASE = 'https://image.tmdb.org/t/p';

/**
 * 通用 TMDB 请求函数：优先走后端代理（带本地代理翻墙支持），降级走官方直连通道
 */
async function fetchTmdb(path: string, params?: URLSearchParams): Promise<Response> {
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    const query = params ? `?${params.toString()}` : '';

    // 1. 优先尝试本地/云端后端代理通道（Cloudflare Function / Node Proxy）
    try {
        const proxyRes = await fetch(`/api/tmdb/${cleanPath}${query}`);
        const cType = proxyRes.headers.get('content-type') || '';
        // 严格防御：必须确保返回的是 JSON 格式，防止 SPA 静态托管将 404 回退为 index.html (text/html)
        if (proxyRes.ok && (cType.includes('application/json') || cType.includes('text/json'))) {
            return proxyRes;
        }
    } catch {
        // 后端代理不可达时平滑降级
    }

    // 2. 降级走官方直连通道
    return await fetch(`${TMDB_BASE}/${cleanPath}${query}`);
}

const COUNTRY_MAP: Record<string, string> = {
    'US': '美国',
    'CN': '中国',
    'HK': '中国香港',
    'TW': '中国台湾',
    'MO': '中国澳门',
    'JP': '日本',
    'KR': '韩国',
    'GB': '英国',
    'UK': '英国',
    'FR': '法国',
    'DE': '德国',
    'IT': '意大利',
    'ES': '西班牙',
    'CA': '加拿大',
    'AU': '澳大利亚',
    'NZ': '新西兰',
    'IN': '印度',
    'TH': '泰国',
    'RU': '俄罗斯',
    'SE': '瑞典',
    'NO': '挪威',
    'DK': '丹麦',
    'FI': '芬兰',
    'NL': '荷兰',
    'BE': '比利时',
    'PL': '波兰',
    'IE': '爱尔兰',
    'BR': '巴西',
    'MX': '墨西哥',
    'AR': '阿根廷',
    'IR': '伊朗',
    'TR': '土耳其',
    'IL': '以色列',
    'SG': '新加坡',
    'MY': '马来西亚',
    'VN': '越南',
    'ID': '印度尼西亚',
    'PH': '菲律宾',
    'CH': '瑞士',
    'AT': '奥地利',
    'GR': '希腊',
    'PT': '葡萄牙',
    'CZ': '捷克',
    'HU': '匈牙利',
    'ZA': '南非',
    'EG': '埃及',
    'IS': '冰岛',
    'CL': '智利',
    'CO': '哥伦比亚',
    'UA': '乌克兰',
};

let regionNames: Intl.DisplayNames | null = null;

function getRegionDisplayName(code: string): string | null {
    try {
        if (typeof Intl !== 'undefined' && Intl.DisplayNames) {
            if (!regionNames) {
                regionNames = new Intl.DisplayNames(['zh-CN', 'zh-Hans'], { type: 'region' });
            }
            return regionNames.of(code.toUpperCase()) || null;
        }
    } catch {
        // Fallback gracefully
    }
    return null;
}

export function translateCountry(code: string, name?: string): string {
    const upperCode = (code || '').toUpperCase().trim();
    if (COUNTRY_MAP[upperCode]) return COUNTRY_MAP[upperCode];

    // If name is already in Chinese
    if (name && /[\u4e00-\u9fa5]/.test(name)) return name;

    // Try Intl.DisplayNames with ISO country code (e.g. 'AU' -> '澳大利亚')
    if (upperCode.length === 2) {
        const intlName = getRegionDisplayName(upperCode);
        if (intlName) return intlName;
    }

    if (name) {
        const upperName = name.toUpperCase().trim();
        if (COUNTRY_MAP[upperName]) return COUNTRY_MAP[upperName];
        return name;
    }
    return code;
}

export const TMDB_GENRE_MAP: Record<string | number, string> = {
    // Movie IDs & Names
    28: '动作',
    'Action': '动作',
    12: '冒险',
    'Adventure': '冒险',
    16: '动画',
    'Animation': '动画',
    35: '喜剧',
    'Comedy': '喜剧',
    80: '犯罪',
    'Crime': '犯罪',
    99: '纪录',
    'Documentary': '纪录',
    18: '剧情',
    'Drama': '剧情',
    10751: '家庭',
    'Family': '家庭',
    14: '奇幻',
    'Fantasy': '奇幻',
    36: '历史',
    'History': '历史',
    27: '恐怖',
    'Horror': '恐怖',
    10402: '音乐',
    'Music': '音乐',
    9648: '悬疑',
    'Mystery': '悬疑',
    10749: '爱情',
    'Romance': '爱情',
    878: '科幻',
    'Science Fiction': '科幻',
    'Sci-Fi': '科幻',
    10770: '电视电影',
    'TV Movie': '电视电影',
    53: '惊悚',
    'Thriller': '惊悚',
    10752: '战争',
    'War': '战争',
    37: '西部',
    'Western': '西部',

    // TV IDs & Compound Names
    10759: '动作, 冒险',
    'Action & Adventure': '动作, 冒险',
    10762: '儿童',
    'Kids': '儿童',
    10763: '新闻',
    'News': '新闻',
    10764: '真人秀',
    'Reality': '真人秀',
    10765: '科幻, 奇幻',
    'Sci-Fi & Fantasy': '科幻, 奇幻',
    10766: '肥皂剧',
    'Soap': '肥皂剧',
    10767: '脱口秀',
    'Talk': '脱口秀',
    10768: '战争, 政治',
    'War & Politics': '战争, 政治',

    // Multi-language common terms (JP, KR, FR, ES, DE)
    'アニメ': '动画',
    'アクション': '动作',
    'ドラマ': '剧情',
    'コメディ': '喜剧',
    'ホラー': '恐怖',
    'サスペンス': '悬疑',
    'ミステリー': '悬疑',
    'ロマンス': '爱情',
    'SF': '科幻',
    'ファンタジー': '奇幻',
    'ドキュメンタリー': '纪录',
    '액션': '动作',
    '드라마': '剧情',
    '코미디': '喜剧',
    '애니메이션': '动画',
    '스릴러': '惊悚',
    '공포': '恐怖',
    '로맨스': '爱情',
    '미스터리': '悬疑',
    '판타지': '奇幻',
    '다큐멘터리': '纪录',
    'Comédie': '喜剧',
    'Drame': '剧情',
    'Horreur': '恐怖',
    'Policier': '犯罪',
    'Comedia': '喜剧',
    'Terror': '恐怖',
    'Ciencia ficción': '科幻',
};

export function parseTmdbGenres(genresList: any[]): string {
    if (!genresList || !Array.isArray(genresList) || genresList.length === 0) {
        return '';
    }

    const results: string[] = [];
    for (const g of genresList) {
        const id = g?.id;
        const name = (typeof g === 'string' ? g : (g?.name || '')).trim();

        // 1. Direct ID match
        if (id && TMDB_GENRE_MAP[id]) {
            results.push(TMDB_GENRE_MAP[id]);
            continue;
        }

        // 2. Direct Name match
        if (name && TMDB_GENRE_MAP[name]) {
            results.push(TMDB_GENRE_MAP[name]);
            continue;
        }

        // 3. If already Chinese
        if (name && /[\u4e00-\u9fa5]/.test(name)) {
            results.push(name);
            continue;
        }

        // 4. Foreign/English fallback
        if (name) {
            results.push(name);
        }
    }

    // Split compound tags and deduplicate
    const tokens = results
        .join(', ')
        .split(/[,，/、\s]+/)
        .map(t => t.trim())
        .filter(Boolean);

    return Array.from(new Set(tokens)).join(', ');
}

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY || '';

function getApiKey(): string {
    return TMDB_API_KEY;
}

export interface TmdbSearchResult {
    id: number;
    title: string;           // Display title (Chinese or original)
    originalTitle: string;
    year: string;
    posterPath: string | null;
    overview: string;
    mediaType: 'movie' | 'tv';
    voteAverage: number;
}

export interface TmdbSeasonInfo {
    id: number;
    seasonNumber: number;
    name: string;
    episodeCount: number;
    airDate: string;
    year: string;
    posterUrl: string | null;
    overview: string;
    voteAverage: number;
}

export interface TmdbDetailResult {
    id: number;
    title: string;
    originalTitle: string;
    year: string;
    country: string;
    genre: string;
    director: string;
    cast: string;               // Top cast members, comma-separated
    overview: string;
    posterUrl: string | null;
    posterOptions?: string[];   // Multiple poster options
    mediaType: 'movie' | 'tv';
    duration: number;           // minutes (per-episode for TV)
    totalEpisodes: number | null;
    voteAverage: number;
    platform?: string;
    seasons?: TmdbSeasonInfo[];
    selectedSeason?: TmdbSeasonInfo;
    tags?: string[];
}

const PROVIDER_MAP: Record<string, string> = {
    'Netflix': 'Netflix',
    'Disney Plus': 'Disney+',
    'Amazon Prime Video': 'Prime Video',
    'Apple TV Plus': 'Apple TV+',
    'Hulu': 'Hulu',
    'HBO': 'HBO',
    'HBO Max': 'HBO',
    'Max': 'HBO',
    'Bilibili': 'Bilibili',
    'Tencent Video': '腾讯视频',
    'iQIYI': '爱奇艺',
    'Youku': '优酷',
};

/**
 * Get poster image URL from TMDB path
 */
export function getPosterUrl(path: string | null, size: 'w185' | 'w342' | 'w500' = 'w342'): string | null {
    if (!path) return null;
    return `${IMG_BASE}/${size}${path}`;
}

/**
 * Multi-search: searches both movies and TV shows simultaneously
 */
export async function searchTmdb(query: string): Promise<TmdbSearchResult[]> {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error('TMDB API Key 未配置。请在 .env.local 中设置 VITE_TMDB_API_KEY。');

    const params = new URLSearchParams({
        api_key: apiKey,
        query,
        language: 'zh-CN',
        include_adult: 'false',
    });

    const res = await fetchTmdb('search/multi', params);
    if (!res.ok) throw new Error(`TMDB 搜索失败 (${res.status})`);

    const data = await res.json();

    return (data.results || [])
        .filter((r: any) => r.media_type === 'movie' || r.media_type === 'tv')
        .slice(0, 12)
        .map((r: any) => {
            const isMovie = r.media_type === 'movie';
            const releaseDate = isMovie ? r.release_date : r.first_air_date;
            const rawTitle = isMovie ? (r.title || r.original_title) : (r.name || r.original_name);
            const origTitle = isMovie ? r.original_title : r.original_name;
            const localized = localizeChineseMovieTitle(rawTitle, origTitle);
            return {
                id: r.id,
                title: localized,
                originalTitle: origTitle || rawTitle,
                year: releaseDate ? releaseDate.substring(0, 4) : '',
                posterPath: r.poster_path,
                overview: r.overview || '',
                mediaType: isMovie ? 'movie' : 'tv',
                voteAverage: r.vote_average || 0,
            } as TmdbSearchResult;
        });
}

/**
 * Fetch full details for a movie
 */
export async function getMovieDetails(movieId: number): Promise<TmdbDetailResult> {
    const apiKey = getApiKey();
    const params = new URLSearchParams({
        api_key: apiKey,
        language: 'zh-CN',
        append_to_response: 'credits,watch/providers,images,keywords',
        include_image_language: 'zh,en,null'
    });

    const res = await fetchTmdb(`movie/${movieId}`, params);
    if (!res.ok) throw new Error(`TMDB 获取电影详情失败 (${res.status})`);

    const d = await res.json();

    const rawTitle = d.title || d.original_title;
    const localizedTitle = localizeChineseMovieTitle(rawTitle, d.original_title);

    const directorObj = (d.credits?.crew || []).find((c: any) => c.job === 'Director');
    const rawDirector = directorObj?.name || '';
    const localizedDirector = rawDirector ? localizePersonNames(rawDirector) : '';

    const castList = (d.credits?.cast || [])
        .slice(0, 8)
        .map((c: any) => localizePersonNames(c.name))
        .join(', ');

    const genres = (d.genres || []).map((g: any) => g.name).join(', ');
    const countries = (d.production_countries || [])
        .map((c: any) => translateCountry(c.iso_3166_1, c.name))
        .join(', ');

    // Extract platform from watch providers (flatrate streaming)
    const providers = d['watch/providers']?.results || {};
    const regionData = providers.CN || providers.US || Object.values(providers)[0] || {};
    const flatStreamers = (regionData.flatrate || []).map((p: any) => PROVIDER_MAP[p.provider_name] || p.provider_name);
    const platform = flatStreamers[0] || '';

    // Multiple posters (up to 8)
    const posterOptions: string[] = (d.images?.posters || [])
        .slice(0, 8)
        .map((p: any) => getPosterUrl(p.file_path, 'w500'))
        .filter(Boolean) as string[];

    // Extract keyword names
    const keywords: string[] = (d.keywords?.keywords || []).map((k: any) => k.name);

    // Dynamic smart tags
    const autoTags = extractSmartTags({
        title: localizedTitle,
        genre: genres,
        overview: d.overview || '',
        country: countries,
        voteAverage: d.vote_average || 0,
        keywords,
        mediaType: 'movie'
    });

    return {
        id: d.id,
        title: localizedTitle,
        originalTitle: d.original_title,
        year: d.release_date ? d.release_date.substring(0, 4) : '',
        country: countries,
        genre: genres,
        director: localizedDirector,
        cast: castList,
        overview: d.overview || '',
        posterUrl: getPosterUrl(d.poster_path, 'w500'),
        posterOptions,
        mediaType: 'movie',
        duration: d.runtime || 0,
        totalEpisodes: null,
        voteAverage: d.vote_average || 0,
        platform,
        tags: autoTags,
    };
}

/**
 * Fetch full details for a TV show
 */
export async function getTvDetails(tvId: number): Promise<TmdbDetailResult> {
    const apiKey = getApiKey();
    const params = new URLSearchParams({
        api_key: apiKey,
        language: 'zh-CN',
        append_to_response: 'credits,watch/providers,images,keywords',
        include_image_language: 'zh,en,null'
    });

    const res = await fetch(`${TMDB_BASE}/tv/${tvId}?${params}`);
    if (!res.ok) throw new Error(`TMDB 获取剧集详情失败 (${res.status})`);

    const d = await res.json();

    const creator = (d.created_by || [])[0];
    const directorFromCrew = (d.credits?.crew || []).find((c: any) => c.job === 'Director');
    const rawDirector = creator?.name || directorFromCrew?.name || '';
    const rawCastList = (d.credits?.cast || []).slice(0, 5).map((c: any) => c.name).join(', ');
    const countries = (d.origin_country || []).map((code: string) => translateCountry(code)).join(', ');
    const genres = parseTmdbGenres(d.genres?.length ? d.genres : (d.genre_ids?.map((id: number) => ({ id })) || []));
    const keywords = (d.keywords?.results || []).map((k: any) => k.name || '').filter(Boolean);

    // 导演与主演中文汉化
    const [directorZh, castZh] = await Promise.all([
        translatePersonNameOnline(rawDirector),
        translatePersonNameOnline(rawCastList)
    ]);

    // 简介中文汉化（若 TMDB 返回纯外文简介）
    let overviewZh = d.overview || '';
    if (overviewZh && !/[\u4e00-\u9fa5]/.test(overviewZh)) {
        overviewZh = await translateForeignTitleOnline(overviewZh);
    }

    // 优先从 episode_run_time 取，新版 TMDB API 该字段经常为空
    // 回退到 last_episode_to_air.runtime 或 next_episode_to_air.runtime
    const episodeRuntime = (d.episode_run_time || [])[0]
        || d.last_episode_to_air?.runtime
        || d.next_episode_to_air?.runtime
        || 0;

    // Extract platform from watch providers
    const providers = d['watch/providers']?.results || {};
    const regionData = providers.CN || providers.US || Object.values(providers)[0] || {};
    const flatStreamers = (regionData.flatrate || []).map((p: any) => PROVIDER_MAP[p.provider_name] || p.provider_name);
    const platform = flatStreamers[0] || '';

    // 解析分季列表（排除第 0 季特别篇，按季数正序排序）
    const seasons: TmdbSeasonInfo[] = (d.seasons || [])
        .filter((s: any) => s.season_number > 0)
        .map((s: any) => ({
            id: s.id,
            seasonNumber: s.season_number,
            name: s.name || `第 ${s.season_number} 季`,
            episodeCount: s.episode_count || 0,
            airDate: s.air_date || '',
            year: s.air_date ? s.air_date.substring(0, 4) : '',
            posterUrl: getPosterUrl(s.poster_path, 'w500'),
            overview: s.overview || '',
            voteAverage: s.vote_average || 0,
        }))
        .sort((a: TmdbSeasonInfo, b: TmdbSeasonInfo) => a.seasonNumber - b.seasonNumber);

    // Multiple posters
    const posterOptions: string[] = (d.images?.posters || [])
        .slice(0, 8)
        .map((p: any) => getPosterUrl(p.file_path, 'w500'))
        .filter(Boolean) as string[];

    const rawTitle = d.name || d.original_name;
    const localizedTitle = localizeChineseMovieTitle(rawTitle, d.original_name);

    const autoTags = extractSmartTags({
        title: localizedTitle,
        genre: genres,
        overview: overviewZh || '',
        country: countries,
        voteAverage: d.vote_average || 0,
        keywords,
        mediaType: 'tv'
    });

    return {
        id: d.id,
        title: localizedTitle,
        originalTitle: d.original_name,
        year: d.first_air_date ? d.first_air_date.substring(0, 4) : '',
        country: countries,
        genre: genres,
        director: directorZh || rawDirector,
        cast: castZh || rawCastList,
        overview: overviewZh || '',
        posterUrl: getPosterUrl(d.poster_path, 'w500'),
        posterOptions: posterOptions.length > 0 ? posterOptions : undefined,
        mediaType: 'tv',
        duration: episodeRuntime,
        totalEpisodes: d.number_of_episodes || null,
        voteAverage: d.vote_average || 0,
        platform,
        seasons: seasons.length > 0 ? seasons : undefined,
        tags: autoTags,
    };
}

/**
 * Fetch full details by search result (routes to movie or TV endpoint)
 */
export async function getDetails(result: TmdbSearchResult): Promise<TmdbDetailResult> {
    return result.mediaType === 'movie'
        ? getMovieDetails(result.id)
        : getTvDetails(result.id);
}

/**
 * Download poster image and convert to base64 data URL
 * (to store in localStorage like existing poster images)
 */
export async function downloadPosterAsBase64(url: string): Promise<string> {
    const res = await fetch(url);
    if (!res.ok) throw new Error('海报下载失败');

    const blob = await res.blob();
    return resizeImage(blob);
}

export interface TmdbPersonCredit {
    id: number;
    title: string;
    originalTitle: string;
    year: string;
    posterUrl: string | null;
    mediaType: 'movie' | 'tv';
    role: string;          // e.g. '导演' or '主演'
    voteAverage: number;
    voteCount: number;
    overview: string;
}

export interface TmdbPersonFilmographyResult {
    id: number;
    name: string;
    originalName: string;
    profileUrl: string | null;
    knownForDepartment: string;
    totalWorksCount: number;
    credits: TmdbPersonCredit[];
}

export const TMDB_FILMOGRAPHY_CACHE_KEY = 'cinelog_tmdb_filmography_cache_v4';

/**
 * 影人宇宙只统计「该影人作为导演或演员」的作品。
 * 以下规则用于剔除本人出镜的访谈/纪录、综艺、脱口秀、客串、存档镜头等非演出性质条目，
 * 同时剔除编剧、制片、主创等幕后身份（不计入影人生涯基准）。
 */

/** 唯一认可的导演职务（不含编剧 / 制片 / 主创等幕后身份） */
const DIRECTOR_JOBS = new Set(['Director', 'Co-Director']);

/** 非演出性质的节目类型：新闻 / 真人秀 / 脱口秀 */
const NON_ACTING_GENRE_IDS = new Set([10763, 10764, 10767]);

/** 本人出镜而非饰演角色的特征词 */
const NON_ACTING_CHARACTER_PATTERNS: RegExp[] = [
    /^self\b/,
    /\bhimself\b/,
    /\bherself\b/,
    /\bthemsel(?:f|ves)\b/,
    /\barchive footage\b/,
    /\bcameo\b/,
    /\buncredited\b/,
    /\binterviewee\b/,
    /\binterview(?:ed)?\b/,
    /\bguest\b/,
    /\bhost(?:ess)?\b/,
    /\bpresenter\b/,
    /\bjudge\b/,
    /\bcontestant\b/,
    /\bpanelist\b/
];

/** 判断一条 cast 记录是否为「本人出镜 / 综艺访谈 / 客串」，而非真正的演员演出 */
function isNonActingCredit(credit: any): boolean {
    const character = String(credit?.character || '').toLowerCase().replace(/\s+/g, ' ').trim();
    if (character && NON_ACTING_CHARACTER_PATTERNS.some(re => re.test(character))) return true;

    const genreIds: number[] = Array.isArray(credit?.genre_ids) ? credit.genre_ids : [];
    return genreIds.some(id => NON_ACTING_GENRE_IDS.has(id));
}

export function getCachedPersonFilmographyMap(): Record<string, TmdbPersonFilmographyResult> {
    try {
        const saved = localStorage.getItem(TMDB_FILMOGRAPHY_CACHE_KEY);
        return saved ? JSON.parse(saved) : {};
    } catch {
        return {};
    }
}

export function saveCachedPersonFilmography(personName: string, result: TmdbPersonFilmographyResult) {
    try {
        const map = getCachedPersonFilmographyMap();
        const norm = normalizeTitle(personName);
        map[norm] = result;
        
        try {
            localStorage.setItem(TMDB_FILMOGRAPHY_CACHE_KEY, JSON.stringify(map));
        } catch {
            // 配额不足时，保留最近 15 位影人缓存，防范过度占用 LocalStorage 空间
            const keys = Object.keys(map);
            if (keys.length > 15) {
                const pruned: Record<string, TmdbPersonFilmographyResult> = {};
                keys.slice(keys.length - 15).forEach(k => { pruned[k] = map[k]; });
                try {
                    localStorage.setItem(TMDB_FILMOGRAPHY_CACHE_KEY, JSON.stringify(pruned));
                } catch {}
            }
        }

        // 广播 storage 事件通知所有 tab / 同一 tab 其他组件同步刷新
        window.dispatchEvent(new StorageEvent('storage', {
            key: TMDB_FILMOGRAPHY_CACHE_KEY,
            newValue: JSON.stringify(map),
            storageArea: localStorage
        }));
    } catch {}
}

/**
 * 影人生平校验失败原因
 * 用于将「鉴权 / 限流 / 网络 / 服务异常 / 代码缺陷」区分开，
 * 避免调用方把一切失败都笼统归结为「请检查网络」。
 */
export type FilmographyFailureReason =
    | 'not_found'      // TMDB 未收录该影人（正常结果，非错误）
    | 'auth'           // API Key 无效或缺失
    | 'rate_limit'     // 请求频率超限
    | 'network'        // 网络不可达 / 后端代理异常
    | 'server'         // TMDB 或代理返回异常状态码
    | 'unknown';       // 未归类（含代码缺陷）

export class PersonFilmographyError extends Error {
    readonly reason: FilmographyFailureReason;

    constructor(reason: FilmographyFailureReason, message: string) {
        super(message);
        this.name = 'PersonFilmographyError';
        this.reason = reason;
    }
}

const FILMOGRAPHY_FAILURE_HINT: Record<FilmographyFailureReason, string> = {
    not_found: 'TMDB 未收录该影人',
    auth: 'TMDB API Key 无效或未配置',
    rate_limit: 'TMDB 请求频率超限，请稍后重试',
    network: '网络不可达或后端代理未启动',
    server: 'TMDB 服务暂时不可用，请稍后重试',
    unknown: '请查看控制台日志了解详情'
};

/** 按失败原因给出可执行的中文处置建议 */
export function getFilmographyFailureHint(reason: FilmographyFailureReason): string {
    return FILMOGRAPHY_FAILURE_HINT[reason];
}

/** 将影人生平校验异常翻译为面向用户的中文提示 */
export function describeFilmographyFailure(err: unknown, personName: string): string {
    if (err instanceof PersonFilmographyError) {
        return err.reason === 'not_found'
            ? `TMDB 未收录「${personName}」`
            : `校验「${personName}」失败：${getFilmographyFailureHint(err.reason)}`;
    }
    const detail = err instanceof Error ? err.message : String(err);
    return `校验「${personName}」失败：${detail || getFilmographyFailureHint('unknown')}`;
}

function toFilmographyError(res: Response, action: string): PersonFilmographyError {
    if (res.status === 401 || res.status === 403) {
        return new PersonFilmographyError('auth', `${action}被拒绝 (HTTP ${res.status})`);
    }
    if (res.status === 429) {
        return new PersonFilmographyError('rate_limit', `${action}触发频率限制 (HTTP 429)`);
    }
    return new PersonFilmographyError('server', `${action}失败 (HTTP ${res.status})`);
}

/**
 * Fetch person full career filmography from TMDB
 * 返回 null 仅表示「TMDB 未收录该影人」；其余失败均以 PersonFilmographyError 抛出
 */
export async function fetchPersonFilmography(personName: string, forceRefresh = false): Promise<TmdbPersonFilmographyResult | null> {
    const apiKey = getApiKey();
    // 在 Cloudflare 生产环境中，api key 由后端代理注入，客户端 apiKey 可能为空，不能提前中止
    if (!personName || !personName.trim()) return null;

    const norm = normalizeTitle(personName.trim());

    // 如果非强制刷新，且已存在缓存数据，优先返回
    if (!forceRefresh) {
        const cachedMap = getCachedPersonFilmographyMap();
        if (cachedMap[norm] && cachedMap[norm].credits && cachedMap[norm].credits.length > 0) {
            return cachedMap[norm];
        }
    }

    try {
        const searchParams = new URLSearchParams({
            ...(apiKey ? { api_key: apiKey } : {}),
            language: 'zh-CN',
            query: personName.trim()
        });

        const searchRes = await fetchTmdb('search/person', searchParams);
        if (!searchRes.ok) throw toFilmographyError(searchRes, 'TMDB 影人搜索');
        const searchData = await searchRes.json();
        let results = (searchData.results || []);

        // 如果未命中且名字包含点号 · 或空格，尝试清理后再次搜索
        if (results.length === 0 && /[·・\s]/.test(personName)) {
            const cleanQuery = personName.replace(/[·・]/g, ' ').replace(/\s+/g, ' ').trim();
            const fallbackParams = new URLSearchParams({
                ...(apiKey ? { api_key: apiKey } : {}),
                language: 'zh-CN',
                query: cleanQuery
            });
            const fallbackRes = await fetchTmdb('search/person', fallbackParams);
            if (fallbackRes.ok) {
                const fallbackData = await fallbackRes.json();
                results = fallbackData.results || [];
            }
        }

        if (results.length === 0) return null;

        // 精准选人算法：
        // 1. 优先在名字完全匹配 (name === query 或 original_name === query) 的候选中选取 TMDB 人气最高的影人（避免被同名摄影/同音字误选）
        // 2. 其次按名称包含匹配并按人气降序
        // 3. 最终回退按 TMDB 人气最高的结果
        const targetClean = personName.trim().toLowerCase().replace(/[·・\s]/g, '');
        const exactMatches = results.filter((p: any) => {
            const pName = (p.name || '').toLowerCase().replace(/[·・\s]/g, '');
            const pOrig = (p.original_name || '').toLowerCase().replace(/[·・\s]/g, '');
            return pName === targetClean || pOrig === targetClean;
        });

        let person: any = null;
        if (exactMatches.length > 0) {
            person = exactMatches.sort((a: any, b: any) => (b.popularity || 0) - (a.popularity || 0))[0];
        } else {
            const partialMatches = results.filter((p: any) => {
                const pName = (p.name || '').toLowerCase().replace(/[·・\s]/g, '');
                const pOrig = (p.original_name || '').toLowerCase().replace(/[·・\s]/g, '');
                return pName.includes(targetClean) || pOrig.includes(targetClean);
            });
            if (partialMatches.length > 0) {
                person = partialMatches.sort((a: any, b: any) => (b.popularity || 0) - (a.popularity || 0))[0];
            } else {
                person = results.sort((a: any, b: any) => (b.popularity || 0) - (a.popularity || 0))[0];
            }
        }

        if (!person || !person.id) return null;

        // Fetch combined credits (both movies and TV)
        const creditParams = new URLSearchParams({
            ...(apiKey ? { api_key: apiKey } : {}),
            language: 'zh-CN'
        });

        const creditsRes = await fetchTmdb(`person/${person.id}/combined_credits`, creditParams);
        if (!creditsRes.ok) throw toFilmographyError(creditsRes, 'TMDB 影人作品列表获取');

        const creditsData = await creditsRes.json();

        // 仅保留真正的演员演出：剔除本人出镜的访谈、综艺、脱口秀、客串与存档镜头
        const castCredits = (creditsData.cast || [])
            .filter((c: any) => !isNonActingCredit(c))
            .map((c: any) => {
                const rawTitle = c.title || c.name || c.original_title || c.original_name || '';
                const origTitle = c.original_title || c.original_name || '';
                const localized = localizeChineseMovieTitle(rawTitle, origTitle);
                return {
                    id: c.id,
                    title: localized,
                    originalTitle: origTitle || rawTitle,
                    year: (c.release_date || c.first_air_date || '').substring(0, 4),
                    posterUrl: getPosterUrl(c.poster_path, 'w500'),
                    mediaType: (c.media_type === 'tv' ? 'tv' : 'movie') as 'movie' | 'tv',
                    role: c.character ? `主演 (饰 ${c.character})` : '主演',
                    voteAverage: Number((c.vote_average || 0).toFixed(1)),
                    voteCount: c.vote_count || 0,
                    overview: c.overview || '',
                    popularity: c.popularity || 0
                };
            });

        // 仅保留导演作品：剔除编剧、制片、主创等幕后身份
        const crewCredits = (creditsData.crew || [])
            .filter((c: any) => DIRECTOR_JOBS.has(c.job || ''))
            .map((c: any) => {
                const rawTitle = c.title || c.name || c.original_title || c.original_name || '';
                const origTitle = c.original_title || c.original_name || '';
                const localized = localizeChineseMovieTitle(rawTitle, origTitle);
                const role = '导演';
                return {
                    id: c.id,
                    title: localized,
                    originalTitle: origTitle || rawTitle,
                    year: (c.release_date || c.first_air_date || '').substring(0, 4),
                    posterUrl: getPosterUrl(c.poster_path, 'w500'),
                    mediaType: (c.media_type === 'tv' ? 'tv' : 'movie') as 'movie' | 'tv',
                    role,
                    voteAverage: Number((c.vote_average || 0).toFixed(1)),
                    voteCount: c.vote_count || 0,
                    overview: c.overview || '',
                    popularity: c.popularity || 0
                };
            });

        // Combine and deduplicate by title, smartly merging roles for all multi-talented filmmakers
        const combined = [...crewCredits, ...castCredits];
        const uniqueMap = new Map<string, typeof combined[0]>();

        combined.forEach(item => {
            if (!item.title) return;
            const normKey = normalizeTitle(item.title);
            if (!uniqueMap.has(normKey)) {
                uniqueMap.set(normKey, { ...item });
            } else {
                const existing = uniqueMap.get(normKey)!;
                // 同一部作品若该影人兼具导演与主演双重身份，合并展示
                const isDirector = item.role === '导演' || existing.role === '导演';
                const isActor = item.role.includes('主演') || existing.role.includes('主演');
                if (isDirector && isActor) {
                    existing.role = '导演 / 主演';
                } else if (isDirector) {
                    existing.role = '导演';
                }
            }
        });

        // Filter and sort by release year (newest first) and popularity
        const sortedCredits = Array.from(uniqueMap.values())
            .filter(c => c.title)
            .sort((a, b) => {
                const yA = parseInt(a.year || '') || 0;
                const yB = parseInt(b.year || '') || 0;
                if (yB !== yA) return yB - yA;
                return (b.voteCount || 0) - (a.voteCount || 0);
            });

        // 对部分无中文片名进行轻量补全（限制前 15 部并使用 Promise.allSettled 防止超时阻塞）
        const nonZhCredits = sortedCredits.filter(c => !/[\u4e00-\u9fa5]/.test(c.title)).slice(0, 15);
        if (nonZhCredits.length > 0) {
            try {
                await Promise.allSettled(nonZhCredits.map(async (credit) => {
                    const translated = await translateForeignTitleOnline(credit.title);
                    if (translated) credit.title = translated;
                }));
            } catch {
                // Fallback gracefully
            }
        }

        const result: TmdbPersonFilmographyResult = {
            id: person.id,
            name: person.name,
            originalName: person.original_name || '',
            profileUrl: getPosterUrl(person.profile_path, 'w500'),
            knownForDepartment: person.known_for_department || '',
            totalWorksCount: sortedCredits.length,
            credits: sortedCredits
        };

        saveCachedPersonFilmography(personName, result);
        return result;
    } catch (err) {
        if (err instanceof PersonFilmographyError) {
            console.warn('TMDB 影人生平代表作获取失败:', err.message);
            throw err;
        }
        console.warn('TMDB 影人生平代表作获取失败:', err);
        throw new PersonFilmographyError('network', err instanceof Error ? err.message : String(err));
    }
}

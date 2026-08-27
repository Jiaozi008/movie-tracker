import { resizeImage } from '../utils/imageUtils';
import { extractSmartTags } from '../utils/tagExtractor';

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

const COUNTRY_MAP: Record<string, string> = {
    'US': '美国',
    'CN': '中国',
    'HK': '中国香港',
    'TW': '中国台湾',
    'JP': '日本',
    'KR': '韩国',
    'GB': '英国',
    'FR': '法国',
    'DE': '德国',
    'IT': '意大利',
    'ES': '西班牙',
    'CA': '加拿大',
    'IN': '印度',
    'TH': '泰国',
    'RU': '俄罗斯',
};

function translateCountry(code: string, name?: string): string {
    if (COUNTRY_MAP[code.toUpperCase()]) return COUNTRY_MAP[code.toUpperCase()];
    if (name && !/^[a-zA-Z\s]+$/.test(name)) return name; // If name is already non-English (like Chinese from API)
    return name || code;
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

    const res = await fetch(`${TMDB_BASE}/search/multi?${params}`);
    if (!res.ok) throw new Error(`TMDB 搜索失败 (${res.status})`);

    const data = await res.json();

    return (data.results || [])
        .filter((r: any) => r.media_type === 'movie' || r.media_type === 'tv')
        .slice(0, 12)
        .map((r: any) => {
            const isMovie = r.media_type === 'movie';
            const releaseDate = isMovie ? r.release_date : r.first_air_date;
            return {
                id: r.id,
                title: isMovie ? (r.title || r.original_title) : (r.name || r.original_name),
                originalTitle: isMovie ? r.original_title : r.original_name,
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

    const res = await fetch(`${TMDB_BASE}/movie/${movieId}?${params}`);
    if (!res.ok) throw new Error(`TMDB 获取电影详情失败 (${res.status})`);

    const d = await res.json();

    const director = (d.credits?.crew || []).find((c: any) => c.job === 'Director');
    const castList = (d.credits?.cast || []).slice(0, 5).map((c: any) => c.name).join(', ');
    const countries = (d.production_countries || []).map((c: any) => translateCountry(c.iso_3166_1, c.name)).join(', ');
    const genres = (d.genres || []).map((g: any) => g.name).join(', ');
    const keywords = (d.keywords?.keywords || []).map((k: any) => k.name || '').filter(Boolean);

    // Extract platform from watch providers (prioritize CN then US then first available)
    const providers = d['watch/providers']?.results || {};
    const regionData = providers.CN || providers.US || Object.values(providers)[0] || {};
    const flatStreamers = (regionData.flatrate || []).map((p: any) => PROVIDER_MAP[p.provider_name] || p.provider_name);
    const platform = flatStreamers[0] || '';

    // Multiple posters
    const posterOptions: string[] = (d.images?.posters || [])
        .slice(0, 8)
        .map((p: any) => getPosterUrl(p.file_path, 'w500'))
        .filter(Boolean) as string[];

    const autoTags = extractSmartTags({
        title: d.title || d.original_title,
        genre: genres,
        overview: d.overview || '',
        country: countries,
        voteAverage: d.vote_average || 0,
        keywords,
        mediaType: 'movie'
    });

    return {
        id: d.id,
        title: d.title || d.original_title,
        originalTitle: d.original_title,
        year: d.release_date ? d.release_date.substring(0, 4) : '',
        country: countries,
        genre: genres,
        director: director?.name || '',
        cast: castList,
        overview: d.overview || '',
        posterUrl: getPosterUrl(d.poster_path, 'w500'),
        posterOptions: posterOptions.length > 0 ? posterOptions : undefined,
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
    const castList = (d.credits?.cast || []).slice(0, 5).map((c: any) => c.name).join(', ');
    const countries = (d.origin_country || []).map((code: string) => translateCountry(code)).join(', ');
    const genres = (d.genres || []).map((g: any) => g.name).join(', ');
    const keywords = (d.keywords?.results || []).map((k: any) => k.name || '').filter(Boolean);

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

    const autoTags = extractSmartTags({
        title: d.name || d.original_name,
        genre: genres,
        overview: d.overview || '',
        country: countries,
        voteAverage: d.vote_average || 0,
        keywords,
        mediaType: 'tv'
    });

    return {
        id: d.id,
        title: d.name || d.original_name,
        originalTitle: d.original_name,
        year: d.first_air_date ? d.first_air_date.substring(0, 4) : '',
        country: countries,
        genre: genres,
        director: creator?.name || directorFromCrew?.name || '',
        cast: castList,
        overview: d.overview || '',
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
